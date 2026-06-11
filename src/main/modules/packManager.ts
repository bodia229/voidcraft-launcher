import { ipcMain } from 'electron'
import { join, basename, extname } from 'node:path'
import fse from 'fs-extra'
import { Open } from 'unzipper'
import { getSettings, modpackDir } from './settings.js'

export type PackKind = 'resourcepacks' | 'shaderpacks'

export interface PackInfo {
  kind: PackKind
  fileName: string
  displayName: string
  description: string
  iconBase64: string | null
  sizeBytes: number
  enabled: boolean
}

const OPTIONS_TXT = 'options.txt'

async function packsDir(kind: PackKind): Promise<string> {
  const dir = join(modpackDir(await getSettings()), kind)
  await fse.ensureDir(dir)
  return dir
}

async function readPackMeta(filePath: string): Promise<{ name: string; description: string; iconBase64: string | null }> {
  const fallbackName = basename(filePath, extname(filePath))
  if (extname(filePath).toLowerCase() !== '.zip') {
    return { name: fallbackName, description: '', iconBase64: null }
  }

  let description = ''
  let iconBase64: string | null = null

  try {
    const directory = await Open.file(filePath)
    const meta = directory.files.find((f) => f.path === 'pack.mcmeta')
    const icon = directory.files.find((f) => f.path === 'pack.png')

    if (meta) {
      const buf = await meta.buffer()
      try {
        const parsed = JSON.parse(stripBOM(buf.toString('utf8'))) as {
          pack?: { description?: string | { text?: string } }
        }
        const raw = parsed.pack?.description
        description = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && raw.text) || ''
        description = stripFormattingCodes(description)
      } catch {
        /* malformed pack.mcmeta — skip */
      }
    }

    if (icon) {
      const buf = await icon.buffer()
      iconBase64 = `data:image/png;base64,${buf.toString('base64')}`
    }
  } catch {
    /* corrupt zip — fall through to fallback name */
  }

  return { name: fallbackName, description, iconBase64 }
}

function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

function stripFormattingCodes(s: string): string {
  return s.replace(/§[0-9a-fk-or]/gi, '')
}

async function readEnabledList(kind: PackKind): Promise<Set<string>> {
  const settings = await getSettings()
  const optionsPath = join(modpackDir(settings), OPTIONS_TXT)
  if (!(await fse.pathExists(optionsPath))) return new Set()
  const content = await fse.readFile(optionsPath, 'utf8')
  // Vanilla key for resourcepacks is `resourcePacks:["pack1","pack2"]`. Shaders (Iris/OptiFine)
  // each track their state differently — we treat shaderpacks as "enabled if present".
  if (kind === 'shaderpacks') return new Set()
  const match = content.match(/resourcePacks:\s*\[([^\]]*)\]/)
  if (!match) return new Set()
  const enabled = new Set<string>()
  for (const m of match[1].matchAll(/"([^"]*)"/g)) {
    const name = m[1]
    if (name.startsWith('file/')) enabled.add(name.slice('file/'.length))
    else enabled.add(name)
  }
  return enabled
}

export async function listPacks(kind: PackKind): Promise<PackInfo[]> {
  const dir = await packsDir(kind)
  const entries = await fse.readdir(dir)
  const enabled = await readEnabledList(kind)
  const packs: PackInfo[] = []

  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = await fse.stat(full).catch(() => null)
    if (!stat || !stat.isFile()) continue
    if (!['.zip', '.jar'].includes(extname(entry).toLowerCase())) continue

    const meta = await readPackMeta(full)
    packs.push({
      kind,
      fileName: entry,
      displayName: meta.name,
      description: meta.description,
      iconBase64: meta.iconBase64,
      sizeBytes: stat.size,
      enabled: kind === 'shaderpacks' ? true : enabled.has(entry)
    })
  }

  return packs.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export async function addPack(kind: PackKind, sourcePath: string): Promise<PackInfo | null> {
  const ext = extname(sourcePath).toLowerCase()
  if (!['.zip', '.jar'].includes(ext)) {
    throw new Error(`Лише .zip / .jar файли. Отримано: ${ext || '(без розширення)'}`)
  }
  const fileName = basename(sourcePath)
  const dest = join(await packsDir(kind), fileName)
  await fse.copy(sourcePath, dest, { overwrite: true })
  const all = await listPacks(kind)
  return all.find((p) => p.fileName === fileName) ?? null
}

export async function removePack(kind: PackKind, fileName: string): Promise<void> {
  const target = join(await packsDir(kind), fileName)
  if (await fse.pathExists(target)) await fse.remove(target)
}

export async function setResourcePackEnabled(fileName: string, enabled: boolean): Promise<void> {
  const settings = await getSettings()
  const optionsPath = join(modpackDir(settings), OPTIONS_TXT)
  let content = (await fse.pathExists(optionsPath)) ? await fse.readFile(optionsPath, 'utf8') : ''

  const match = content.match(/(^|\n)resourcePacks:\s*\[([^\]]*)\]/)
  const current: string[] = []
  if (match) {
    for (const m of match[2].matchAll(/"([^"]*)"/g)) current.push(m[1])
  }
  const target = `file/${fileName}`

  const filtered = current.filter((n) => n !== target && n !== fileName)
  const next = enabled ? [...filtered, target] : filtered
  const serialized = `resourcePacks:[${next.map((n) => `"${n}"`).join(',')}]`

  content = match
    ? content.replace(/(^|\n)resourcePacks:\s*\[[^\]]*\]/, `${match[1]}${serialized}`)
    : content + (content.endsWith('\n') ? '' : '\n') + serialized + '\n'

  await fse.outputFile(optionsPath, content)
}

export function registerPackHandlers(): void {
  ipcMain.handle('packs:list', (_e, kind: PackKind) => listPacks(kind))
  ipcMain.handle('packs:add', (_e, kind: PackKind, sourcePath: string) => addPack(kind, sourcePath))
  ipcMain.handle('packs:remove', (_e, kind: PackKind, fileName: string) => removePack(kind, fileName))
  ipcMain.handle('packs:setEnabled', (_e, fileName: string, enabled: boolean) =>
    setResourcePackEnabled(fileName, enabled)
  )
}
