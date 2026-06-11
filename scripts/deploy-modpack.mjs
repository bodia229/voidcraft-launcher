#!/usr/bin/env node
/**
 * One-shot deploy of pack/ to a GitHub Release.
 *
 * Strategy:
 *  - mods/ ships file-by-file (so the launcher can show per-file progress and
 *    skip mods that are already cached locally)
 *  - everything else (config/, scripts/, resourcepacks/, shaderpacks/, kubejs/)
 *    is bundled into <dir>.zip — GitHub limits a release to 1000 assets and
 *    configs alone can be 1000+ small files
 *
 * Usage:
 *   GH_TOKEN=ghp_xxx node scripts/deploy-modpack.mjs \
 *     --repo bodia229/technomagia-modpack1 \
 *     --version 0.1.0 \
 *     --pack ./pack
 */

import { createHash } from 'node:crypto'
import { createReadStream, statSync, readFileSync, createWriteStream } from 'node:fs'
import { readdir, stat, mkdir, unlink } from 'node:fs/promises'
import { join, relative, sep, basename } from 'node:path'
import { parseArgs } from 'node:util'
import { createRequire } from 'node:module'

// archiver 8 exports classes (no factory function). Use ZipArchive directly.
const { ZipArchive } = createRequire(import.meta.url)('archiver')

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    version: { type: 'string', default: '0.1.0' },
    pack: { type: 'string', default: './pack' },
    notes: { type: 'string', default: '' },
    mcVersion: { type: 'string', default: '1.12.2' },
    forgeVersion: { type: 'string', default: '14.23.5.2860' },
    name: { type: 'string', default: 'TechnoMagia' },
    id: { type: 'string', default: 'technomagia' }
  }
})

const token = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim()
if (!token) {
  console.error('error: set GH_TOKEN env var with a token that has "repo" scope.')
  console.error('  create one at: https://github.com/settings/tokens/new?scopes=repo')
  process.exit(1)
}
if (!/^[\x21-\x7e]+$/.test(token)) {
  console.error('error: GH_TOKEN contains non-ASCII characters — looks like a placeholder, not a real token.')
  process.exit(1)
}
if (!/^(ghp|github_pat)_/.test(token)) {
  console.error('error: GH_TOKEN must start with "ghp_" or "github_pat_".')
  process.exit(1)
}
if (!values.repo) {
  console.error('error: --repo <owner/name> is required')
  process.exit(1)
}

const [owner, repo] = values.repo.split('/')
const tag = values.version.startsWith('v') ? values.version : `v${values.version}`
const baseUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}`

// Folders that ship file-by-file; the rest get zipped as a single archive.
const PER_FILE_DIRS = new Set(['mods'])

const headers = {
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  Accept: 'application/vnd.github+json',
  'User-Agent': 'technomagia-launcher-deploy'
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path).on('data', (b) => hash.update(b)).on('end', () => resolve(hash.digest('hex'))).on('error', reject)
  })
}

function flatten(relPath) {
  return relPath.replaceAll('/', '__').replaceAll(sep, '__')
}

async function ghJson(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  return res.json()
}

async function ensureRepoInitialized() {
  const branches = await ghJson(`/repos/${owner}/${repo}/branches`).catch((err) => {
    throw new Error(`Repo not accessible: ${err}`)
  })
  if (branches.length > 0) return
  console.log('   Repo is empty — pushing initial README commit…')
  const readme = Buffer.from(
    `# ${values.name}\n\nMinecraft ${values.mcVersion} modpack distributed via TechnoMagia Launcher.\n\nLatest manifest: \`releases/latest/download/manifest.json\`\n`
  ).toString('base64')
  await ghJson(`/repos/${owner}/${repo}/contents/README.md`, {
    method: 'PUT',
    body: JSON.stringify({ message: 'chore: initialize repo', content: readme })
  })
}

async function ensureRelease() {
  console.log(`-> Looking for release ${tag}…`)
  try {
    const r = await ghJson(`/repos/${owner}/${repo}/releases/tags/${tag}`)
    console.log(`   Reusing release id=${r.id}`)
    return r
  } catch (err) {
    if (!String(err).includes('404')) throw err
    await ensureRepoInitialized()
    console.log(`   Creating release…`)
    return ghJson(`/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tag,
        name: `${values.name} ${values.version}`,
        body: values.notes || `Release ${values.version}`,
        draft: false,
        prerelease: false
      })
    })
  }
}

async function deleteIfExists(release, assetName) {
  const existing = release.assets.find((a) => a.name === assetName)
  if (!existing) return
  await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existing.id}`, {
    method: 'DELETE',
    headers
  })
}

function sanitizeForGithub(name) {
  // Mirror GitHub's asset-rename rules so we can predict the final name and
  // reuse already-uploaded assets without a delete+reupload round-trip.
  return name.replace(/[\[\]]/g, '').replace(/ /g, '.')
}

async function uploadAsset(release, filePath, assetName, { force = false } = {}) {
  const fileSize = statSync(filePath).size
  const expectedName = sanitizeForGithub(assetName)
  // Skip-if-uploaded by size match is a heuristic that bites archives badly:
  // a tiny tweak inside the zip can leave size unchanged while the SHA shifts,
  // and then the manifest's SHA disagrees with the server file. Allow callers
  // (archives, manifest itself) to force a fresh upload to avoid this.
  if (!force) {
    const existing = release.assets.find(
      (a) => (a.name === assetName || a.name === expectedName) && a.size === fileSize
    )
    if (existing) return existing
  }

  await deleteIfExists(release, assetName)
  await deleteIfExists(release, expectedName)
  const buf = readFileSync(filePath)
  const url = `${release.upload_url.replace(/\{[^}]+\}/, '')}?name=${encodeURIComponent(assetName)}`

  // Retry with exponential backoff — flaky network is the #1 cause of mid-deploy aborts.
  let lastErr
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(buf.byteLength) },
        body: buf
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      // GitHub returns the actual asset (with its possibly-renamed `name` and `browser_download_url`)
      // so the manifest can reference what GitHub actually serves, not what we asked it to be named.
      return await res.json()
    } catch (err) {
      lastErr = err
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
        process.stdout.write(`   retry ${attempt} for ${assetName}…\n`)
      }
    }
  }
  throw new Error(`Upload failed after retries for ${assetName}: ${lastErr}`)
}

/**
 * Tiny in-script concurrency helper — N workers eat from a shared queue.
 * Cheaper than pulling in p-limit, and the deploy script tries to stay
 * dependency-light.
 */
async function runPool(items, limit, worker) {
  const queue = items.slice()
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift()
      if (next === undefined) return
      await worker(next)
    }
  })
  await Promise.all(workers)
}

async function pruneStaleAssets(release, keepNames) {
  const keep = new Set(keepNames)
  const stale = release.assets.filter((a) => !keep.has(a.name))
  if (stale.length === 0) return 0
  console.log(`-> Pruning ${stale.length} stale asset(s) from previous release…`)
  for (const a of stale) {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${a.id}`, {
      method: 'DELETE',
      headers
    })
  }
  return stale.length
}

async function zipDir(srcDir, outZip) {
  await mkdir(join(outZip, '..'), { recursive: true }).catch(() => {})
  await unlink(outZip).catch(() => {})
  await new Promise((resolve, reject) => {
    const output = createWriteStream(outZip)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(srcDir, false) // root-relative inside the zip
    archive.finalize()
  })
}

async function main() {
  if (!statSync(values.pack, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Pack folder not found: ${values.pack}`)
  }

  // Decide which top-level folders to zip vs ship per-file.
  const topLevel = await readdir(values.pack, { withFileTypes: true })
  const perFileDirs = []
  const zipDirs = []
  for (const entry of topLevel) {
    if (!entry.isDirectory()) continue
    const full = join(values.pack, entry.name)
    const isEmpty = (await readdir(full)).length === 0
    if (isEmpty) continue
    if (PER_FILE_DIRS.has(entry.name)) perFileDirs.push({ name: entry.name, path: full })
    else zipDirs.push({ name: entry.name, path: full })
  }

  console.log(`-> Per-file dirs:  ${perFileDirs.map((d) => d.name).join(', ') || '(none)'}`)
  console.log(`-> Bundled (zip):  ${zipDirs.map((d) => d.name).join(', ') || '(none)'}`)

  const files = []
  const archives = []
  let totalBytes = 0

  // Step 1a — hash per-file entries.
  for (const dir of perFileDirs) {
    for await (const path of walk(dir.path)) {
      const rel = relative(values.pack, path).replaceAll(sep, '/')
      const s = await stat(path)
      if (s.size === 0) continue
      const hash = await sha256File(path)
      totalBytes += s.size
      files.push({
        path: rel,
        url: `${baseUrl}/${flatten(rel)}`,
        sha256: hash,
        size: s.size,
        required: true,
        side: 'both',
        _localPath: path
      })
    }
  }

  // Step 1b — zip the rest into <name>.zip and hash the archive.
  const buildDir = join(values.pack, '..', '.build')
  await mkdir(buildDir, { recursive: true })
  for (const dir of zipDirs) {
    const zipPath = join(buildDir, `${dir.name}.zip`)
    process.stdout.write(`   zipping ${dir.name}/ …\r`)
    await zipDir(dir.path, zipPath)
    const s = await stat(zipPath)
    const hash = await sha256File(zipPath)
    totalBytes += s.size
    archives.push({
      name: `${dir.name}.zip`,
      extractTo: dir.name,
      url: `${baseUrl}/${dir.name}.zip`,
      sha256: hash,
      size: s.size,
      _localPath: zipPath
    })
    console.log(`   zipped ${dir.name}/ → ${dir.name}.zip (${(s.size / 1024 / 1024).toFixed(1)} MB)        `)
  }

  console.log(`-> ${files.length} per-file + ${archives.length} archive(s), ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`)

  if (files.length + archives.length === 0) {
    throw new Error(`No content to upload. Put .jar mods in ${values.pack}/mods/ first.`)
  }
  if (files.length + archives.length + 1 > 1000) {
    throw new Error(`Still > 1000 assets after bundling. Reduce mod count or split into multiple releases.`)
  }

  // Step 2 — ensure release.
  let release = await ensureRelease()

  // Step 2b — prune anything left over from a previous (different-format) deploy.
  const expectedNames = [
    'manifest.json',
    ...files.map((f) => flatten(f.path)),
    ...archives.map((a) => a.name)
  ]
  await pruneStaleAssets(release, expectedNames)
  release = await ghJson(`/repos/${owner}/${repo}/releases/tags/${tag}`)

  // Step 3 — upload per-file entries, capturing the URL GitHub actually serves them on.
  // Concurrent: GitHub's per-token rate limit on asset upload is generous (~5k/hr)
  // and the per-file payloads are tiny (mods are ~2 MB on average), so 6 parallel
  // requests cut wall-clock by ~5× without ever brushing the limit.
  const PARALLEL = 6
  let uploadedFiles = 0
  await runPool(files, PARALLEL, async (f) => {
    const assetName = flatten(f.path)
    const asset = await uploadAsset(release, f._localPath, assetName)
    f.url = asset.browser_download_url
    uploadedFiles += 1
    process.stdout.write(`-> [mods ${uploadedFiles}/${files.length}] ${assetName}\r`)
  })
  if (files.length > 0) console.log(`\n   Uploaded ${files.length} per-file asset(s).`)

  // Step 4 — upload bundled archives (also in parallel — usually only 2-5 of them).
  // Force re-upload: archives are likely to change between deploys with the
  // same byte count after small swaps, and a stale server copy paired with a
  // fresh manifest SHA blows up the launcher install with a hash mismatch.
  let uploadedArchives = 0
  await runPool(archives, PARALLEL, async (a) => {
    const asset = await uploadAsset(release, a._localPath, a.name, { force: true })
    a.url = asset.browser_download_url
    uploadedArchives += 1
    process.stdout.write(`-> [archive ${uploadedArchives}/${archives.length}] ${a.name}\r`)
  })
  if (archives.length > 0) console.log(`\n   Uploaded ${archives.length} archive(s).`)

  // Refresh release before uploading manifest.
  release = await ghJson(`/repos/${owner}/${repo}/releases/tags/${tag}`)

  // Step 5 — manifest.
  const manifest = {
    id: values.id,
    name: values.name,
    version: values.version,
    mcVersion: values.mcVersion,
    forgeVersion: values.forgeVersion,
    description: values.notes || `${values.name} ${values.version}`,
    releaseNotes: values.notes || '',
    java: { major: 8, downloadUrl: 'auto' },
    files: files.map(({ _localPath: _, ...rest }) => rest),
    archives: archives.map(({ _localPath: _, ...rest }) => rest)
  }
  const manifestPath = './modpack/manifest.json'
  const fse = await import('fs-extra')
  await fse.default.outputFile(manifestPath, JSON.stringify(manifest, null, 2))
  // Force — manifest.json size is often identical between deploys (URLs same
  // length) but contents always change.
  await uploadAsset(release, manifestPath, 'manifest.json', { force: true })

  console.log('\nDone.')
  console.log(`  manifest: ${baseUrl}/manifest.json`)
  console.log(`  release:  https://github.com/${owner}/${repo}/releases/tag/${tag}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
