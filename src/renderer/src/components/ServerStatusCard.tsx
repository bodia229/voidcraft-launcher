import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Server, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServerStatus } from '../../../shared/types.js'

interface ServerStatusCardProps {
  address: string | null
}

const REFRESH_MS = 30_000

export function ServerStatusCard({ address }: ServerStatusCardProps): JSX.Element | null {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      setStatus(await api.invoke('server:ping', address))
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (!address) {
      setStatus(null)
      return
    }
    fetch()
    const id = setInterval(fetch, REFRESH_MS)
    return () => clearInterval(id)
  }, [address, fetch])

  if (!address) return null

  const online = status?.online ?? false
  const Icon = online ? Wifi : WifiOff

  return (
    <div className="glass max-w-md rounded-xl p-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-md',
          online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-destructive/15 text-destructive'
        )}>
          {status?.iconBase64 ? (
            <img src={status.iconBase64} alt="" className="h-full w-full rounded-md" style={{ imageRendering: 'pixelated' }} />
          ) : (
            <Server className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2 w-2">
              {online && (
                <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-emerald-400/70" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  online ? 'bg-emerald-400' : 'bg-destructive'
                )}
              />
            </span>
            <Icon className={cn('h-3 w-3', online ? 'text-emerald-400' : 'text-destructive')} />
            <span className="truncate text-sm font-semibold">{address}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {status === null && 'Проверка…'}
            {status && online && (
              <>
                {status.playersOnline ?? 0}/{status.playersMax ?? 0} онлайн
                {status.latencyMs !== undefined && ` · ${status.latencyMs}ms`}
                {status.version && ` · ${status.version}`}
              </>
            )}
            {status && !online && (status.error ?? 'Офлайн')}
          </div>
          {status?.motd && online && (
            <div className="line-clamp-1 mt-0.5 text-[11px] text-muted-foreground/80" title={status.motd}>
              {status.motd}
            </div>
          )}
        </div>

        <button
          onClick={fetch}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          title="Обновить"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>
    </div>
  )
}
