import { Client } from 'minecraft-launcher-core'
import type { AccountProfile, LauncherSettings, ModpackManifest } from '../../shared/types.js'
import { forgeVersionId } from './forge.js'
import { ensureJava } from './java.js'
import { setDiscordActivity } from './discordRpc.js'

interface LaunchOpts {
  account: AccountProfile
  settings: LauncherSettings
  manifest: ModpackManifest
  gameDir: string
  onStdout: (line: string) => void
  onStderr: (line: string) => void
  onExit: (code: number | null) => void
}

export async function launchMinecraft(opts: LaunchOpts): Promise<Client> {
  const { account, settings, manifest, gameDir, onStdout, onStderr, onExit } = opts
  const launcher = new Client()

  const javaPath = await ensureJava(manifest.java, settings, () => {})
  const versionId = forgeVersionId(manifest.mcVersion, manifest.forgeVersion)

  const options = {
    authorization: {
      access_token: account.accessToken,
      client_token: account.accessToken,
      uuid: account.uuid,
      name: account.name,
      user_properties: '{}',
      meta: { type: account.mode === 'microsoft' ? 'msa' : 'mojang', xuid: '', demo: false }
    },
    root: gameDir,
    // Point straight at the installed Forge version JSON — installer.jar already laid it down.
    version: { number: manifest.mcVersion, type: 'release' as const, custom: versionId },
    memory: { min: `${settings.ramMinGb}G`, max: `${settings.ramMaxGb}G` },
    javaPath,
    customArgs: settings.jvmArgs.split(/\s+/).filter(Boolean),
    overrides: {
      detached: false,
      gameDirectory: gameDir
    },
    // 1.12.2 doesn't support quickPlay — pass legacy --server/--port instead.
    server:
      settings.defaultServer && settings.defaultServer.includes(':')
        ? {
            host: settings.defaultServer.split(':')[0],
            port: settings.defaultServer.split(':')[1]
          }
        : undefined
  }

  launcher.on('data', (line: string) => onStdout(line.trimEnd()))
  launcher.on('debug', (line: string) => onStdout(`[debug] ${line}`))
  launcher.on('error', (err: Error) => onStderr(err.message))
  launcher.on('close', (code: number) => {
    setDiscordActivity({ details: 'В лаунчере' })
    onExit(code)
  })

  await launcher.launch(options as never)
  setDiscordActivity({
    details: `Играет в ${manifest.name}`,
    state: account.name,
    startTimestamp: Date.now()
  })
  return launcher
}
