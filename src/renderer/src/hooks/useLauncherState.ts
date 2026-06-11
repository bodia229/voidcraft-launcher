import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AccountProfile, InstallProgress, LauncherSettings } from '../../../shared/types.js'

export interface LauncherState {
  account: AccountProfile | null
  settings: LauncherSettings | null
  installed: boolean
  installedVersion: string | null
  progress: InstallProgress | null
  isInstalling: boolean
  isRunning: boolean
  mcLogs: string[]
  error: string | null
}

const initialState: LauncherState = {
  account: null,
  settings: null,
  installed: false,
  installedVersion: null,
  progress: null,
  isInstalling: false,
  isRunning: false,
  mcLogs: [],
  error: null
}

export function useLauncherState(): {
  state: LauncherState
  refreshAccount: () => Promise<void>
  refreshStatus: () => Promise<void>
  login: (mode: 'microsoft' | 'offline', username?: string) => Promise<void>
  logout: () => Promise<void>
  install: () => Promise<void>
  installLocal: () => Promise<void>
  pickLocalPack: () => Promise<string | null>
  launch: () => Promise<void>
  updateSettings: (patch: Partial<LauncherSettings>) => Promise<void>
} {
  const [state, setState] = useState<LauncherState>(initialState)

  const refreshAccount = useCallback(async () => {
    const account = await api.invoke('auth:current')
    setState((s) => ({ ...s, account }))
  }, [])

  const refreshStatus = useCallback(async () => {
    const status = await api.invoke('modpack:status')
    setState((s) => ({ ...s, installed: status.installed, installedVersion: status.version }))
  }, [])

  const refreshSettings = useCallback(async () => {
    const settings = await api.invoke('settings:get')
    setState((s) => ({ ...s, settings }))
  }, [])

  useEffect(() => {
    refreshAccount()
    refreshStatus()
    refreshSettings()

    const offProgress = api.on(api.events.installProgress, (progress) => {
      const p = progress as InstallProgress
      setState((s) => ({
        ...s,
        progress: p,
        isInstalling: p.phase !== 'idle' && p.phase !== 'running' && p.phase !== 'error',
        error: p.phase === 'error' ? p.message : null
      }))
    })
    const offStdout = api.on(api.events.mcStdout, (line) => {
      setState((s) => ({ ...s, mcLogs: [...s.mcLogs.slice(-499), String(line)] }))
    })
    const offStderr = api.on(api.events.mcStderr, (line) => {
      setState((s) => ({ ...s, mcLogs: [...s.mcLogs.slice(-499), `[err] ${String(line)}`] }))
    })
    const offExit = api.on(api.events.mcExit, () => {
      setState((s) => ({ ...s, isRunning: false }))
    })

    return () => {
      offProgress()
      offStdout()
      offStderr()
      offExit()
    }
  }, [refreshAccount, refreshStatus, refreshSettings])

  const login = useCallback(
    async (mode: 'microsoft' | 'offline', username?: string) => {
      try {
        await api.invoke('auth:login', mode, username)
        await refreshAccount()
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message }))
      }
    },
    [refreshAccount]
  )

  const logout = useCallback(async () => {
    await api.invoke('auth:logout')
    await refreshAccount()
  }, [refreshAccount])

  const install = useCallback(async () => {
    setState((s) => ({ ...s, isInstalling: true, error: null }))
    try {
      await api.invoke('modpack:install')
      await refreshStatus()
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }))
    } finally {
      setState((s) => ({ ...s, isInstalling: false }))
    }
  }, [refreshStatus])

  const installLocal = useCallback(async () => {
    setState((s) => ({ ...s, isInstalling: true, error: null }))
    try {
      await api.invoke('modpack:installLocal')
      await refreshStatus()
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }))
    } finally {
      setState((s) => ({ ...s, isInstalling: false }))
    }
  }, [refreshStatus])

  const pickLocalPack = useCallback(async () => {
    const path = await api.invoke('modpack:pickLocalPack')
    await refreshSettings()
    return path
  }, [refreshSettings])

  const launch = useCallback(async () => {
    try {
      await api.invoke('modpack:launch')
      setState((s) => ({ ...s, isRunning: true, error: null }))
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }))
    }
  }, [])

  const updateSettings = useCallback(async (patch: Partial<LauncherSettings>) => {
    const next = await api.invoke('settings:set', patch)
    setState((s) => ({ ...s, settings: next }))
  }, [])

  return {
    state,
    refreshAccount,
    refreshStatus,
    login,
    logout,
    install,
    installLocal,
    pickLocalPack,
    launch,
    updateSettings
  }
}
