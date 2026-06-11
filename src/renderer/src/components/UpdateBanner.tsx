import { useUpdateState } from '@/hooks/useUpdateState'
import { Button } from '@/components/ui/button'
import { Download, Flame } from 'lucide-react'

export function UpdateBanner(): JSX.Element | null {
  const { state, install } = useUpdateState()

  if (state.status === 'downloaded') {
    return (
      <div className="glass arcane-glow mb-2 rounded-lg border-primary/40 bg-primary/10 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
          <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
          Обновление готово
        </div>
        <div className="mb-2 text-[11px] text-muted-foreground">v{state.version}</div>
        <Button size="sm" variant="arcane" className="w-full" onClick={install}>
          <Download className="mr-1 h-3.5 w-3.5" /> Установить
        </Button>
      </div>
    )
  }

  if (state.status === 'downloading') {
    return (
      <div className="glass mb-2 rounded-lg p-3 text-xs">
        <div className="mb-1 text-muted-foreground">Загрузка обновления…</div>
        <div className="font-mono text-primary">{Math.round(state.progress ?? 0)}%</div>
      </div>
    )
  }

  return null
}
