import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import fse from 'fs-extra'
import { dirname } from 'node:path'

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

export async function fileMatches(path: string, expectedSha256: string, expectedSize?: number): Promise<boolean> {
  if (!(await fse.pathExists(path))) return false
  if (expectedSize !== undefined) {
    const stat = await fse.stat(path)
    if (stat.size !== expectedSize) return false
  }
  if (!expectedSha256) return true
  const actual = await sha256File(path)
  return actual.toLowerCase() === expectedSha256.toLowerCase()
}

export interface DownloadOptions {
  url: string
  destPath: string
  expectedSha256?: string
  expectedSize?: number
  onProgress?: (bytes: number, total: number) => void
}

// GitHub Releases rewrites asset filenames: ` ` → `.`, `[` and `]` are stripped.
// A manifest generated before this script started using browser_download_url
// can contain the pre-rename name. Mirror the rewrite here so stale manifests
// still resolve.
function normalizeGithubAssetUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com' || !u.pathname.includes('/releases/download/')) return url
    const segments = u.pathname.split('/')
    const last = segments.length - 1
    segments[last] = segments[last].replace(/[\[\]]/g, '').replace(/ /g, '.')
    u.pathname = segments.join('/')
    return u.toString()
  } catch {
    return url
  }
}

async function downloadOnce(opts: DownloadOptions): Promise<void> {
  const { destPath, expectedSha256, expectedSize, onProgress } = opts
  const url = normalizeGithubAssetUrl(opts.url)
  await fse.ensureDir(dirname(destPath))

  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`)

  const total = expectedSize ?? Number(res.headers.get('content-length') ?? 0)
  const tmp = `${destPath}.part`
  const out = createWriteStream(tmp)

  let received = 0
  const reader = res.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        received += value.byteLength
        out.write(Buffer.from(value))
        onProgress?.(received, total)
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())))
  }

  if (expectedSha256) {
    const actual = await sha256File(tmp)
    if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
      await fse.remove(tmp)
      throw new Error(`SHA256 mismatch for ${url}\nexpected: ${expectedSha256}\n  actual: ${actual}`)
    }
  }

  await fse.move(tmp, destPath, { overwrite: true })
}

export async function downloadFile(opts: DownloadOptions): Promise<void> {
  if (opts.expectedSha256 && (await fileMatches(opts.destPath, opts.expectedSha256, opts.expectedSize))) {
    return
  }
  let lastErr: Error | null = null
  // Retry transient network failures (most often a dropped TCP connection in the
  // middle of a streaming download — silent and easy to misdiagnose).
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await downloadOnce(opts)
      return
    } catch (err) {
      lastErr = err as Error
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
      }
    }
  }
  throw lastErr ?? new Error('Unknown download error')
}
