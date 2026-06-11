#!/usr/bin/env node
/**
 * Manifest builder for TechnoMagia modpack.
 *
 * Usage:
 *   node scripts/build-manifest.mjs --pack ./pack --baseUrl https://github.com/USER/REPO/releases/download/v0.1.0 --version 0.1.0 --out ./modpack/manifest.json
 *
 * Walks `pack/` recursively, hashes each file, emits a manifest.json that the
 * launcher can fetch + verify. Then upload pack/* + manifest.json to a GitHub release.
 */

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    pack: { type: 'string', default: './pack' },
    baseUrl: { type: 'string' },
    version: { type: 'string', default: '0.1.0' },
    mcVersion: { type: 'string', default: '1.12.2' },
    forgeVersion: { type: 'string', default: '14.23.5.2860' },
    out: { type: 'string', default: './modpack/manifest.json' },
    name: { type: 'string', default: 'TechnoMagia' },
    id: { type: 'string', default: 'technomagia' },
    description: { type: 'string', default: 'Tech + Magic expert pack on 1.12.2' },
    notes: { type: 'string', default: '' }
  }
})

if (!values.baseUrl) {
  console.error('error: --baseUrl is required (e.g. https://github.com/USER/REPO/releases/download/v0.1.0)')
  process.exit(1)
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile()) {
      yield full
    }
  }
}

function sha256(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path).on('data', (b) => hash.update(b)).on('end', () => resolve(hash.digest('hex'))).on('error', reject)
  })
}

const sideFor = (relPath) => {
  // Server-only and client-only hints based on common modpack layout.
  if (relPath.startsWith(`servers${sep}`)) return 'server'
  if (relPath.startsWith(`shaderpacks${sep}`)) return 'client'
  if (relPath.startsWith(`resourcepacks${sep}`)) return 'client'
  return 'both'
}

const root = values.pack
console.log(`Scanning ${root}…`)

const files = []
let totalBytes = 0

for await (const path of walk(root)) {
  const rel = relative(root, path).replaceAll(sep, '/')
  const s = await stat(path)
  const hash = await sha256(path)
  totalBytes += s.size
  files.push({
    path: rel,
    url: `${values.baseUrl.replace(/\/$/, '')}/${rel.replaceAll('/', '__')}`,
    sha256: hash,
    size: s.size,
    required: true,
    side: sideFor(rel.replaceAll('/', sep))
  })
  process.stdout.write(`  ${rel}\r`)
}

const manifest = {
  id: values.id,
  name: values.name,
  version: values.version,
  mcVersion: values.mcVersion,
  forgeVersion: values.forgeVersion,
  description: values.description,
  releaseNotes: values.notes,
  java: { major: 8, downloadUrl: 'auto' },
  files,
  configs: []
}

await mkdir(dirname(values.out), { recursive: true })
await writeFile(values.out, JSON.stringify(manifest, null, 2))
console.log(`\nWrote ${files.length} entries (${(totalBytes / 1024 / 1024).toFixed(1)} MB) → ${values.out}`)
console.log(`\nNext steps:`)
console.log(`  1. Upload each file in ${root}/ to the GitHub release.`)
console.log(`     Filenames must be flattened with '__' instead of '/' (matches manifest URLs).`)
console.log(`     e.g. mods/jei-1.12.2.jar → mods__jei-1.12.2.jar`)
console.log(`  2. Upload ${values.out} to the same release.`)
console.log(`  3. Point MODPACK.manifestUrl in src/shared/constants.ts at the manifest.`)
