import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, Flame } from 'lucide-react'
import { api } from '@/lib/api'

export function TitleBar(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    api.invoke('window:isMaximized').then(setMaximized)
    const off = api.on('window:maximizedChange', (v) => setMaximized(Boolean(v)))
    return off
  }, [])

  return (
    <div className="titlebar relative flex h-9 items-center justify-between border-b border-white/[0.04] bg-black/40 backdrop-blur-xl">
      {/* left: app mark */}
      <div className="flex items-center gap-2 px-3">
        <Flame className="h-3.5 w-3.5 text-primary" strokeWidth={1.6} />
        <span className="font-display text-[10px] uppercase tracking-[0.4em] text-foreground/85">
          Voidcraft
        </span>
        <span className="text-[9px] tracking-widest text-muted-foreground/70">
          · 1.12.2 · expert
        </span>
      </div>

      {/* hairline blood accent */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* right: window controls */}
      <div className="flex h-full items-center">
        <TitleBtn onClick={() => api.invoke('window:minimize')} label="Минимизировать">
          <Minus className="h-3.5 w-3.5" />
        </TitleBtn>
        <TitleBtn onClick={() => api.invoke('window:maximize')} label={maximized ? 'Свернуть' : 'Развернуть'}>
          {maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </TitleBtn>
        <TitleBtn onClick={() => api.invoke('window:close')} label="Закрыть" danger>
          <X className="h-3.5 w-3.5" />
        </TitleBtn>
      </div>
    </div>
  )
}

function TitleBtn({
  onClick,
  children,
  label,
  danger
}: {
  onClick: () => void
  children: React.ReactNode
  label: string
  danger?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={label}
      className={
        'flex h-9 w-12 items-center justify-center text-muted-foreground transition-colors ' +
        (danger
          ? 'hover:bg-destructive/80 hover:text-white'
          : 'hover:bg-white/[0.06] hover:text-foreground')
      }
    >
      {children}
    </button>
  )
}
