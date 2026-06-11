import { app, BrowserWindow, shell, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAuthHandlers } from './modules/auth.js'
import { registerSettingsHandlers, getSettings } from './modules/settings.js'
import { registerModpackHandlers } from './modules/modpack.js'
import { registerNewsHandlers } from './modules/news.js'
import { registerAppHandlers } from './modules/appHandlers.js'
import { initDiscordRpc, destroyDiscordRpc } from './modules/discordRpc.js'
import { initAutoUpdater, registerUpdateIpc } from './modules/autoUpdate.js'
import { registerPackHandlers } from './modules/packManager.js'
import { registerServerStatusHandlers } from './modules/serverStatus.js'
import { IPC } from '../shared/types.js'
import { APP_NAME } from '../shared/constants.js'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const iconPath = is.dev
    ? join(__dirname, '../../resources/icon.png')
    : join(process.resourcesPath, 'icon.png')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#050505',
    title: APP_NAME,
    icon: nativeImage.createFromPath(iconPath),
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Window controls (custom titlebar) — IPC from renderer.
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximizedChange', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximizedChange', false))

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Fallback: surface the window even if ready-to-show never fires (renderer error / slow CSP / etc).
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[main] ready-to-show timed out; forcing window.show()')
      mainWindow.show()
    }
  }, 5000)

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[main] renderer gone:', details.reason)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.technomagia.launcher')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const settings = await getSettings()

  registerAuthHandlers()
  registerSettingsHandlers()
  registerModpackHandlers(() => mainWindow)
  registerNewsHandlers()
  registerAppHandlers()
  registerPackHandlers()
  registerServerStatusHandlers()

  if (settings.discordRpc) {
    initDiscordRpc().catch((err) => console.warn('Discord RPC init failed:', err))
  }

  ipcMain.handle('app:version', () => app.getVersion())

  createWindow()

  if (is.dev) {
    registerUpdateIpc()
  } else {
    initAutoUpdater(() => mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  destroyDiscordRpc()
  if (process.platform !== 'darwin') app.quit()
})

// Surface uncaught errors so they don't silently kill the launcher.
process.on('uncaughtException', (err) => {
  console.error('[main] uncaught:', err)
})

// Reference IPC channels at startup so the constant is tree-shake-safe.
void IPC['app:openExternal']
