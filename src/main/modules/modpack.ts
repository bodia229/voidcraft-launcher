import { ipcMain, BrowserWindow, dialog } from 'electron'
import { join } from 'node:path'
import fse from 'fs-extra'
import pLimit from 'p-limit'
import { Open } from 'unzipper'
import type { ModpackManifest, InstallProgress, InstallPhase } from '../../shared/types.js'
import { EVENT } from '../../shared/types.js'
import { MODPACK } from '../../shared/constants.js'
import { downloadFile, fileMatches } from './downloader.js'
import { ensureJava } from './java.js'
import { installForge } from './forge.js'
import { launchMinecraft } from './launcher.js'
import { getSettings, setSettings, modpackDir } from './settings.js'
import { getCurrentAccount } from './auth.js'

let cachedManifest: ModpackManifest | null = null
type WinGetter = () => BrowserWindow | null

function emit(getWin: WinGetter, progress: InstallProgress): void {
  getWin()?.webContents.send(EVENT.installProgress, progress)
}

function makeReporter(getWin: WinGetter) {
  return (phase: InstallPhase, current: number, total: number, message: string) =>
    emit(getWin, { phase, current, total, message })
}

async function fetchManifest(): Promise<ModpackManifest> {
  const settings = await getSettings()
  const url = settings.manifestUrl || MODPACK.manifestUrl
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(
      `Manifest fetch failed: HTTP ${res.status}.\n` +
        `URL: ${url}\n` +
        `Настрой свой manifest URL в Настройках или используй локальную установку.`
    )
  }
  const manifest = (await res.json()) as ModpackManifest
  cachedManifest = manifest
  return manifest
}

async function readLocalVersionMarker(dir: string): Promise<string | null> {
  const file = join(dir, '.installed-version')
  if (!(await fse.pathExists(file))) return null
  return (await fse.readFile(file, 'utf8')).trim()
}

async function writeLocalVersionMarker(dir: string, version: string): Promise<void> {
  await fse.outputFile(join(dir, '.installed-version'), version)
}

export async function getModpackStatus(): Promise<{ installed: boolean; version: string | null }> {
  const settings = await getSettings()
  const dir = modpackDir(settings)
  const version = await readLocalVersionMarker(dir)
  return { installed: version !== null, version }
}

export async function installModpack(getWin: WinGetter): Promise<void> {
  const report = makeReporter(getWin)
  const settings = await getSettings()
  const dir = modpackDir(settings)
  await fse.ensureDir(dir)

  report('fetching-manifest', 0, 1, 'Загрузка manifest…')
  const manifest = await fetchManifest()

  report('installing-java', 0, 1, `Проверка Java ${manifest.java.major}…`)
  const javaPath = await ensureJava(manifest.java, settings, (msg) => report('installing-java', 0, 1, msg))

  report('installing-forge', 0, 1, `Установка Forge ${manifest.forgeVersion}…`)
  await installForge({
    mcVersion: manifest.mcVersion,
    forgeVersion: manifest.forgeVersion,
    gameDir: dir,
    javaPath,
    onProgress: (msg) => report('installing-forge', 0, 1, msg)
  })

  const clientFiles = manifest.files.filter((f) => f.side !== 'server')
  const archives = manifest.archives ?? []
  const total = clientFiles.length + archives.length
  let done = 0
  report('downloading-mods', done, total, 'Подготовка…')

  const limit = pLimit(6)
  await Promise.all(
    clientFiles.map((file) =>
      limit(async () => {
        const dest = join(dir, file.path)
        await downloadFile({
          url: file.url,
          destPath: dest,
          expectedSha256: file.sha256,
          expectedSize: file.size
        })
        done += 1
        report('downloading-mods', done, total, `${file.path} (${done}/${total})`)
      })
    )
  )

  // Download + extract bundled archives sequentially (extraction is CPU-bound).
  for (const archive of archives) {
    const archivePath = join(dir, '.archives', archive.name)
    await downloadFile({
      url: archive.url,
      destPath: archivePath,
      expectedSha256: archive.sha256,
      expectedSize: archive.size
    })

    const extractDir = join(dir, archive.extractTo)
    await fse.ensureDir(extractDir)
    report('downloading-mods', done, total, `Распаковка ${archive.name}…`)

    const directory = await Open.file(archivePath)
    for (const entry of directory.files) {
      if (entry.type === 'Directory') continue
      const dest = join(extractDir, entry.path)
      await fse.ensureDir(join(dest, '..'))
      await new Promise<void>((resolve, reject) => {
        entry.stream().pipe(fse.createWriteStream(dest)).on('finish', resolve).on('error', reject)
      })
    }

    done += 1
    report('downloading-mods', done, total, `${archive.name} (${done}/${total})`)
  }

  report('verifying', 0, clientFiles.length, 'Проверка целостности…')
  for (let i = 0; i < clientFiles.length; i++) {
    const f = clientFiles[i]
    const ok = await fileMatches(join(dir, f.path), f.sha256, f.size)
    if (!ok && f.required) throw new Error(`Файл повреждён: ${f.path}`)
    report('verifying', i + 1, clientFiles.length, f.path)
  }

  await ensureDefaultOptions(dir)

  await writeLocalVersionMarker(dir, manifest.version)
  report('idle', 1, 1, `Готово. Версия ${manifest.version}`)
}

/**
 * First-run defaults for options.txt: Russian locale, the Voidcraft resource
 * pack pre-enabled (panorama + loading screen), and tuned visuals for the
 * heavy 1.12.2 modpack. Skips if the player already has options.txt — we
 * never overwrite real preferences.
 */
async function ensureDefaultOptions(gameDir: string): Promise<void> {
  const optsPath = join(gameDir, 'options.txt')
  if (await fse.pathExists(optsPath)) return
  const lines = [
    'version:1343',
    'resourcePacks:["vanilla","file/voidcraft.zip"]',
    'incompatibleResourcePacks:[]',
    'lang:ru_ru',
    'forceUnicodeFont:false',
    'fancyGraphics:false',
    'ao:1',
    'renderDistance:8',
    'mipmapLevels:2',
    'enableVsync:true',
    'maxFps:120',
    'difficulty:2',
    'fboEnable:true',
    'particles:1',
    'soundCategory_master:0.7',
    'soundCategory_music:0.4'
  ]
  await fse.outputFile(optsPath, lines.join('\n') + '\n')
}

/**
 * Local install: skip the remote manifest entirely. We still need a manifest object
 * for the launcher (Forge version, Java spec) so we synthesize a minimal one from
 * the static constants, install Forge headlessly, and copy mods/config from a
 * user-chosen folder into the gameDir.
 */
export async function installLocalModpack(getWin: WinGetter): Promise<void> {
  const report = makeReporter(getWin)
  const settings = await getSettings()
  const localPath = settings.localPackPath
  if (!localPath || !(await fse.pathExists(localPath))) {
    throw new Error('Локальная папка модпака не выбрана. Настройки → Локальный модпак.')
  }

  const dir = modpackDir(settings)
  await fse.ensureDir(dir)

  const synthesized: ModpackManifest = {
    id: MODPACK.id,
    name: MODPACK.name,
    version: 'local',
    mcVersion: MODPACK.mcVersion,
    forgeVersion: MODPACK.forgeVersion,
    description: 'Локальная сборка',
    java: { major: 8, downloadUrl: 'auto' },
    files: []
  }
  cachedManifest = synthesized

  report('installing-java', 0, 1, 'Проверка Java 8…')
  const javaPath = await ensureJava(synthesized.java, settings, (msg) =>
    report('installing-java', 0, 1, msg)
  )

  report('installing-forge', 0, 1, `Установка Forge ${synthesized.forgeVersion}…`)
  await installForge({
    mcVersion: synthesized.mcVersion,
    forgeVersion: synthesized.forgeVersion,
    gameDir: dir,
    javaPath,
    onProgress: (msg) => report('installing-forge', 0, 1, msg)
  })

  // Copy the contents of common subfolders. We don't blow away existing content
  // so the user can layer additions on top of an existing install.
  const subfolders = ['mods', 'config', 'scripts', 'resourcepacks', 'shaderpacks', 'kubejs']
  let totalCopied = 0

  for (const sub of subfolders) {
    const src = join(localPath, sub)
    if (!(await fse.pathExists(src))) continue
    const dst = join(dir, sub)
    await fse.ensureDir(dst)
    const entries = await fse.readdir(src)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const srcEntry = join(src, entry)
      const dstEntry = join(dst, entry)
      await fse.copy(srcEntry, dstEntry, { overwrite: true })
      totalCopied += 1
      report('downloading-mods', totalCopied, totalCopied + 1, `${sub}/${entry}`)
    }
  }

  if (totalCopied === 0) {
    throw new Error(
      `В ${localPath} не найдено ни одного из: ${subfolders.join(', ')}. ` +
        `Создай папку mods/ и положи туда .jar файлы.`
    )
  }

  await writeLocalVersionMarker(dir, `local-${Date.now()}`)
  report('idle', 1, 1, `Готово. Скопировано ${totalCopied} файлов/папок`)
}

async function pickLocalPack(getWin: WinGetter): Promise<string | null> {
  const win = getWin()
  const result = await dialog.showOpenDialog(win ?? undefined!, {
    title: 'Выберите папку с модпаком',
    properties: ['openDirectory'],
    buttonLabel: 'Выбрать'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const path = result.filePaths[0]
  await setSettings({ localPackPath: path })
  return path
}

export async function launchModpack(getWin: WinGetter): Promise<void> {
  const report = makeReporter(getWin)
  const settings = await getSettings()
  const account = await getCurrentAccount()
  if (!account) throw new Error('Сначала войдите в аккаунт.')

  const manifest = cachedManifest ?? (await fetchManifest())
  const dir = modpackDir(settings)
  report('launching', 0, 1, 'Запуск Minecraft…')

  await launchMinecraft({
    account,
    settings,
    manifest,
    gameDir: dir,
    onStdout: (line) => getWin()?.webContents.send(EVENT.mcStdout, line),
    onStderr: (line) => getWin()?.webContents.send(EVENT.mcStderr, line),
    onExit: (code) => {
      getWin()?.webContents.send(EVENT.mcExit, code)
      emit(getWin, { phase: 'idle', current: 1, total: 1, message: `Игра завершена (код ${code ?? 0})` })
    }
  })

  report('running', 1, 1, 'Minecraft запущен')
}

export function registerModpackHandlers(getWin: WinGetter): void {
  ipcMain.handle('modpack:status', () => getModpackStatus())
  ipcMain.handle('modpack:install', () => installModpack(getWin))
  ipcMain.handle('modpack:installLocal', () => installLocalModpack(getWin))
  ipcMain.handle('modpack:pickLocalPack', () => pickLocalPack(getWin))
  ipcMain.handle('modpack:launch', () => launchModpack(getWin))
}
