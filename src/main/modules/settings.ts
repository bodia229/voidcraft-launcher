import { app, ipcMain } from 'electron'
import Store from 'electron-store'
import { join } from 'node:path'
import type { LauncherSettings } from '../../shared/types.js'
import { DEFAULT_SETTINGS, MODPACK } from '../../shared/constants.js'

type Schema = { settings: LauncherSettings }

const store = new Store<Schema>({
  name: 'settings',
  defaults: {
    settings: {
      ...DEFAULT_SETTINGS,
      gameDir: join(app.getPath('appData'), '.technomagia')
    }
  }
})

export async function getSettings(): Promise<LauncherSettings> {
  const s = store.get('settings')
  // Heal missing fields after defaults change between versions.
  return { ...DEFAULT_SETTINGS, ...s, gameDir: s.gameDir || join(app.getPath('appData'), '.technomagia') }
}

export async function setSettings(patch: Partial<LauncherSettings>): Promise<LauncherSettings> {
  const merged = { ...(await getSettings()), ...patch }
  if (merged.ramMaxGb < merged.ramMinGb) merged.ramMaxGb = merged.ramMinGb
  store.set('settings', merged)
  return merged
}

export function modpackDir(settings: LauncherSettings): string {
  return join(settings.gameDir, MODPACK.id)
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<LauncherSettings>) => setSettings(patch))
}
