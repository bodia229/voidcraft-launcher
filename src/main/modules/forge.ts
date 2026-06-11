import { join } from 'node:path'
import { spawn } from 'node:child_process'
import fse from 'fs-extra'
import { downloadFile } from './downloader.js'

interface ForgeInstallOpts {
  mcVersion: string
  forgeVersion: string
  gameDir: string
  javaPath: string
  onProgress: (msg: string) => void
}

const FORGE_MAVEN = 'https://maven.minecraftforge.net/net/minecraftforge/forge'

export function forgeVersionId(mcVersion: string, forgeVersion: string): string {
  return `${mcVersion}-forge-${forgeVersion}`
}

export function forgeInstallerPath(gameDir: string, mcVersion: string, forgeVersion: string): string {
  return join(gameDir, 'forge', `forge-${mcVersion}-${forgeVersion}-installer.jar`)
}

function spawnJava(javaPath: string, args: string[], cwd: string, onLine: (line: string) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(javaPath, args, { cwd, windowsHide: true })
    let buffer = ''
    const flush = (chunk: Buffer): void => {
      buffer += chunk.toString()
      let idx
      while ((idx = buffer.indexOf('\n')) !== -1) {
        onLine(buffer.slice(0, idx).trimEnd())
        buffer = buffer.slice(idx + 1)
      }
    }
    child.stdout.on('data', flush)
    child.stderr.on('data', flush)
    child.on('error', reject)
    child.on('close', (code) => {
      if (buffer) onLine(buffer.trimEnd())
      resolve(code ?? -1)
    })
  })
}

/**
 * Installs Forge headless by running the official installer jar with --installClient.
 * Works for both legacy (1.12.2) and modern Forge installers.
 *
 * Why we run installer.jar instead of letting minecraft-launcher-core handle it:
 *  - 1.12.2 installer fetches Mojang libraries by maven URL and patches client.jar,
 *    behavior MLC's `forge:` option doesn't fully replicate on first install.
 *  - The installer writes the proper version manifest into versions/<id>/<id>.json,
 *    which MLC then picks up via `versionType` automatically.
 */
export async function installForge(opts: ForgeInstallOpts): Promise<void> {
  const { mcVersion, forgeVersion, gameDir, javaPath, onProgress } = opts
  const versionId = forgeVersionId(mcVersion, forgeVersion)
  const versionJson = join(gameDir, 'versions', versionId, `${versionId}.json`)

  if (await fse.pathExists(versionJson)) {
    onProgress(`Forge ${forgeVersion} вже встановлено`)
    return
  }

  await fse.ensureDir(join(gameDir, 'forge'))
  const installerJar = forgeInstallerPath(gameDir, mcVersion, forgeVersion)

  if (!(await fse.pathExists(installerJar))) {
    const url = `${FORGE_MAVEN}/${mcVersion}-${forgeVersion}/forge-${mcVersion}-${forgeVersion}-installer.jar`
    onProgress('Загрузка Forge installer…')
    await downloadFile({ url, destPath: installerJar })
  }

  // Forge installer requires a launcher_profiles.json to exist in gameDir to consider it
  // a "valid Minecraft directory" — we satisfy that with a minimal stub.
  const profilesFile = join(gameDir, 'launcher_profiles.json')
  if (!(await fse.pathExists(profilesFile))) {
    await fse.outputFile(profilesFile, JSON.stringify({ profiles: {}, settings: {}, version: 3 }))
  }

  onProgress('Запуск Forge installer (headless)…')
  const code = await spawnJava(
    javaPath,
    ['-jar', installerJar, '--installClient', gameDir],
    gameDir,
    (line) => onProgress(`[forge] ${line}`)
  )

  if (code !== 0) {
    throw new Error(`Forge installer exited with code ${code}`)
  }

  if (!(await fse.pathExists(versionJson))) {
    throw new Error(`Forge installer ran but ${versionId}.json was not produced.`)
  }

  onProgress(`Forge ${forgeVersion} встановлено`)
}
