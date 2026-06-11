import { app } from 'electron'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import fse from 'fs-extra'
import { Open } from 'unzipper'
import { downloadFile } from './downloader.js'
import { setSettings } from './settings.js'
import type { LauncherSettings, ModpackManifest } from '../../shared/types.js'

interface AdoptiumAsset {
  binary: {
    package: { link: string; checksum: string; size: number; name: string }
  }
  version: { major: number; minor: number; security: number; build: number }
}

async function javaWorksAt(path: string): Promise<boolean> {
  if (!path) return false
  if (!(await fse.pathExists(path))) return false
  return await new Promise<boolean>((resolve) => {
    const proc = spawn(path, ['-version'])
    let output = ''
    proc.stderr.on('data', (b) => (output += b.toString()))
    proc.on('error', () => resolve(false))
    proc.on('close', (code) => resolve(code === 0 && /version "?\d+/.test(output)))
  })
}

function javaDir(): string {
  return join(app.getPath('userData'), 'runtime', 'java')
}

async function findExistingJava(major: number): Promise<string | null> {
  const root = join(javaDir(), `jre-${major}`)
  const exe = join(root, 'bin', 'javaw.exe')
  return (await javaWorksAt(exe)) ? exe : null
}

export async function ensureJava(
  spec: ModpackManifest['java'],
  settings: LauncherSettings,
  onMessage: (msg: string) => void
): Promise<string> {
  if (settings.javaPath && (await javaWorksAt(settings.javaPath))) {
    return settings.javaPath
  }

  const existing = await findExistingJava(spec.major)
  if (existing) {
    await setSettings({ javaPath: existing })
    return existing
  }

  onMessage(`Загрузка Java ${spec.major}…`)

  // Pull the latest Adoptium JRE for the requested major when no exact URL is pinned.
  let downloadUrl = spec.downloadUrl
  let expectedSize: number | undefined
  let expectedSha: string | undefined

  if (!downloadUrl || downloadUrl === 'auto') {
    const res = await fetch(
      `https://api.adoptium.net/v3/assets/latest/${spec.major}/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse`
    )
    if (!res.ok) throw new Error(`Adoptium API HTTP ${res.status}`)
    const arr = (await res.json()) as AdoptiumAsset[]
    if (arr.length === 0) throw new Error('No Adoptium asset returned')
    downloadUrl = arr[0].binary.package.link
    expectedSize = arr[0].binary.package.size
    expectedSha = arr[0].binary.package.checksum
  }

  const tmpZip = join(javaDir(), `jre-${spec.major}.zip`)
  await downloadFile({ url: downloadUrl, destPath: tmpZip, expectedSha256: expectedSha, expectedSize })

  onMessage('Розпаковка Java…')
  const targetRoot = join(javaDir(), `jre-${spec.major}`)
  await fse.remove(targetRoot)
  await fse.ensureDir(targetRoot)

  // Adoptium archives unpack into a single jdk-N-jre/ root — flatten it.
  const directory = await Open.file(tmpZip)
  const entries = directory.files
  if (entries.length === 0) throw new Error('Empty Java archive')
  const topPrefix = entries[0].path.split('/')[0] + '/'

  for (const entry of entries) {
    if (entry.type === 'Directory') continue
    const relPath = entry.path.startsWith(topPrefix) ? entry.path.slice(topPrefix.length) : entry.path
    if (!relPath) continue
    const dest = join(targetRoot, relPath)
    await fse.ensureDir(join(dest, '..'))
    await new Promise<void>((resolve, reject) => {
      entry.stream().pipe(fse.createWriteStream(dest)).on('finish', resolve).on('error', reject)
    })
  }

  await fse.remove(tmpZip)

  const javaExe = join(targetRoot, 'bin', 'javaw.exe')
  if (!(await javaWorksAt(javaExe))) throw new Error('Java install verification failed')

  await setSettings({ javaPath: javaExe })
  return javaExe
}
