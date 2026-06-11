import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error' | 'unavailable'
  version?: string
  progress?: number
  error?: string
}

let state: UpdateState = { status: 'idle' }
let mainWindow: BrowserWindow | null = null
let ipcRegistered = false

function broadcast(): void {
  mainWindow?.webContents.send('update:state', state)
}

/**
 * electron-updater needs app-update.yml in resources/ to know which channel/feed
 * to query. If the file is missing (portable build without publish config, or
 * unsigned/unpublished build), every checkForUpdates() throws synchronously,
 * surfacing as a fatal startup error. Detect and skip cleanly.
 */
function autoUpdaterAvailable(): boolean {
  if (process.env.ELECTRON_UPDATER_FORCE_DEV === '1') return true
  if (app.isPackaged === false) return false
  const configPath = join(process.resourcesPath, 'app-update.yml')
  return existsSync(configPath)
}

export function registerUpdateIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true

  ipcMain.handle('update:check', async () => {
    if (!autoUpdaterAvailable()) {
      state = { status: 'unavailable' }
      return state
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      state = { status: 'error', error: (err as Error).message }
      broadcast()
    }
    return state
  })

  ipcMain.handle('update:install', () => {
    if (state.status === 'downloaded') autoUpdater.quitAndInstall()
  })

  ipcMain.handle('update:state', () => state)
}

export function initAutoUpdater(getWin: () => BrowserWindow | null): void {
  mainWindow = getWin()
  registerUpdateIpc()

  if (!autoUpdaterAvailable()) {
    state = { status: 'unavailable' }
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    state = { status: 'checking' }
    broadcast()
  })
  autoUpdater.on('update-available', (info) => {
    state = { status: 'available', version: info.version }
    broadcast()
  })
  autoUpdater.on('update-not-available', () => {
    state = { status: 'not-available' }
    broadcast()
  })
  autoUpdater.on('download-progress', (p) => {
    state = { status: 'downloading', progress: p.percent }
    broadcast()
  })
  autoUpdater.on('update-downloaded', (info) => {
    state = { status: 'downloaded', version: info.version }
    broadcast()
  })
  autoUpdater.on('error', (err) => {
    state = { status: 'error', error: err.message }
    broadcast()
  })

  // Run after a short delay so the window paints before we hit the network.
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdates().catch((err) => {
        state = { status: 'error', error: err.message }
        broadcast()
      })
    } catch (err) {
      state = { status: 'error', error: (err as Error).message }
      broadcast()
    }
  }, 3000)
}
