import RPC from 'discord-rpc'
import { DISCORD } from '../../shared/constants.js'

let client: RPC.Client | null = null
let connected = false
let currentActivity: RPC.Presence | null = null

interface ActivityPatch {
  details?: string
  state?: string
  startTimestamp?: number
}

export async function initDiscordRpc(): Promise<void> {
  if (DISCORD.clientId === '0000000000000000000') {
    // No real client ID configured yet — skip silently.
    return
  }
  if (client) return
  client = new RPC.Client({ transport: 'ipc' })
  client.on('ready', () => {
    connected = true
    applyActivity()
  })
  try {
    await client.login({ clientId: DISCORD.clientId })
  } catch (err) {
    console.warn('[discord-rpc] login failed:', err)
    client = null
  }
}

function applyActivity(): void {
  if (!client || !connected) return
  const activity: RPC.Presence = {
    details: currentActivity?.details ?? DISCORD.details,
    state: currentActivity?.state,
    startTimestamp: currentActivity?.startTimestamp,
    largeImageKey: DISCORD.largeImageKey,
    largeImageText: DISCORD.largeImageText,
    instance: false
  }
  client.setActivity(activity).catch((err: unknown) => console.warn('[discord-rpc]', err))
}

export function setDiscordActivity(patch: ActivityPatch): void {
  currentActivity = { ...(currentActivity ?? {}), ...patch }
  applyActivity()
}

export function destroyDiscordRpc(): void {
  if (!client) return
  try {
    client.destroy()
  } catch {
    /* noop */
  }
  client = null
  connected = false
}
