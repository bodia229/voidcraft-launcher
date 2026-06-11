import { useEffect, useState, useCallback } from 'react'

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'
  version?: string
  progress?: number
  error?: string
}

interface RawApi {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void
}

const rawApi = (window as unknown as { api: RawApi }).api

export function useUpdateState(): { state: UpdateState; check: () => void; install: () => void } {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    rawApi.invoke('update:state').then((s) => setState(s as UpdateState)).catch(() => {})
    const off = rawApi.on('update:state', (next) => setState(next as UpdateState))
    return () => off()
  }, [])

  const check = useCallback(() => {
    rawApi.invoke('update:check').catch(() => {})
  }, [])

  const install = useCallback(() => {
    rawApi.invoke('update:install').catch(() => {})
  }, [])

  return { state, check, install }
}
