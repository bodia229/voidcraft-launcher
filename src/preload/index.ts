import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IpcChannels } from '../shared/types.js'
import { EVENT } from '../shared/types.js'

type Invoker = <K extends keyof IpcChannels>(
  channel: K,
  ...args: Parameters<IpcChannels[K]>
) => ReturnType<IpcChannels[K]>

const invoke: Invoker = (channel, ...args) =>
  ipcRenderer.invoke(channel, ...args) as ReturnType<IpcChannels[typeof channel]>

const api = {
  invoke,
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_: unknown, ...args: unknown[]) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
  events: EVENT,
  getAppVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  // Electron 32+ removed File.path — must round-trip through webUtils.
  getPathForFile: (file: File): string => webUtils.getPathForFile(file)
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-expect-error fallback when contextIsolation disabled
  window.electron = electronAPI
  // @ts-expect-error fallback when contextIsolation disabled
  window.api = api
}

export type LauncherApi = typeof api
