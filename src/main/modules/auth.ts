import { ipcMain } from 'electron'
import Store from 'electron-store'
import { v3 as uuidv3 } from 'uuid'
import { Auth } from 'msmc'
import type { AccountProfile, AuthMode } from '../../shared/types.js'

type Schema = { account: AccountProfile | null }
const store = new Store<Schema>({ name: 'account', defaults: { account: null } })

// Stable namespace for offline UUIDs (matches Mojang's "OfflinePlayer:<name>" v3 scheme).
const OFFLINE_NS = '0eb5ec39-2ae3-4dd0-b8f5-c1d3e6f7a8b9'

function offlineUuid(name: string): string {
  return uuidv3(`OfflinePlayer:${name}`, OFFLINE_NS)
}

async function microsoftLogin(): Promise<AccountProfile> {
  const authManager = new Auth('select_account')
  const xboxManager = await authManager.launch('electron')
  const mc = await xboxManager.getMinecraft()

  const profile = mc.profile
  if (!profile) throw new Error('Microsoft account has no Minecraft profile (game not owned).')

  const expiresAt = Date.now() + (mc.exp ?? 86400) * 1000
  return {
    id: profile.id,
    name: profile.name,
    uuid: profile.id,
    accessToken: mc.mcToken,
    refreshToken: xboxManager.msToken.refresh_token,
    mode: 'microsoft',
    expiresAt
  }
}

function offlineLogin(username: string): AccountProfile {
  const name = username.trim()
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
    throw new Error('Нік має бути 3-16 символів (A-Z, a-z, 0-9, _).')
  }
  const uuid = offlineUuid(name).replace(/-/g, '')
  return {
    id: uuid,
    name,
    uuid,
    accessToken: '0',
    mode: 'offline'
  }
}

export async function getCurrentAccount(): Promise<AccountProfile | null> {
  return store.get('account')
}

export async function login(mode: AuthMode, username?: string): Promise<AccountProfile> {
  const account = mode === 'microsoft' ? await microsoftLogin() : offlineLogin(username ?? '')
  store.set('account', account)
  return account
}

export async function logout(): Promise<void> {
  store.set('account', null)
}

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:login', (_e, mode: AuthMode, username?: string) => login(mode, username))
  ipcMain.handle('auth:logout', () => logout())
  ipcMain.handle('auth:current', () => getCurrentAccount())
}
