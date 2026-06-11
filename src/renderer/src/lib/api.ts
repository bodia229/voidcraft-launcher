import type { IpcChannels } from '../../../shared/types.js'

interface ElectronApi {
  invoke: <K extends keyof IpcChannels>(
    channel: K,
    ...args: Parameters<IpcChannels[K]>
  ) => ReturnType<IpcChannels[K]>
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void
  events: { installProgress: string; mcStdout: string; mcStderr: string; mcExit: string }
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    api: ElectronApi
  }
}

export const api = window.api
