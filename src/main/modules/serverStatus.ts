import { ipcMain } from 'electron'

export interface ServerStatus {
  online: boolean
  address: string
  motd?: string
  playersOnline?: number
  playersMax?: number
  version?: string
  latencyMs?: number
  iconBase64?: string | null
  error?: string
  fetchedAt: number
}

interface McStatusResponse {
  online: boolean
  host?: string
  port?: number
  version?: { name_clean?: string; name?: string }
  players?: { online?: number; max?: number }
  motd?: { clean?: string; raw?: string }
  icon?: string
  retrieved_at?: number
}

const cache = new Map<string, { at: number; status: ServerStatus }>()
const CACHE_TTL_MS = 30 * 1000

export async function pingServer(address: string): Promise<ServerStatus> {
  const cached = cache.get(address)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.status

  const started = Date.now()
  try {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address)}?query=false`, {
      signal: AbortSignal.timeout(8000)
    })
    const latencyMs = Date.now() - started
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as McStatusResponse

    const status: ServerStatus = {
      online: data.online,
      address,
      motd: data.motd?.clean ?? data.motd?.raw,
      playersOnline: data.players?.online,
      playersMax: data.players?.max,
      version: data.version?.name_clean ?? data.version?.name,
      iconBase64: data.icon ?? null,
      latencyMs,
      fetchedAt: Date.now()
    }
    cache.set(address, { at: Date.now(), status })
    return status
  } catch (err) {
    const status: ServerStatus = {
      online: false,
      address,
      error: (err as Error).message,
      fetchedAt: Date.now()
    }
    cache.set(address, { at: Date.now(), status })
    return status
  }
}

export function registerServerStatusHandlers(): void {
  ipcMain.handle('server:ping', (_e, address: string) => pingServer(address))
}
