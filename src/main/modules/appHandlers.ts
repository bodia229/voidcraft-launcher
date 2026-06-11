import { ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { getSettings, modpackDir } from './settings.js'

export function registerAppHandlers(): void {
  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url))

  ipcMain.handle(
    'app:openFolder',
    async (_e, which: 'game' | 'logs' | 'mods' | 'resourcepacks' | 'shaderpacks') => {
      const settings = await getSettings()
      const base = modpackDir(settings)
      const target = which === 'game' ? base : join(base, which)
      await shell.openPath(target)
    }
  )

  ipcMain.handle('logs:tail', async () => {
    // Reserved for future log streaming; renderer falls back to MC stdout events.
    return []
  })
}
