import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Folder } from 'lucide-react'
import { api } from '@/lib/api'
import type { LauncherState } from '@/hooks/useLauncherState'

export function Logs({ state }: { state: LauncherState }): JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.mcLogs.length])

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-3xl arcane-text uppercase tracking-[0.15em]">Логи</h2>
        <Button variant="outline" size="sm" onClick={() => api.invoke('app:openFolder', 'logs')}>
          <Folder className="mr-1 h-4 w-4" /> Папка логов
        </Button>
      </div>
      <div className="glass flex-1 overflow-hidden rounded-xl p-2">
        <ScrollArea className="h-full scrollbar-thin">
          <div className="space-y-0.5 p-2 font-mono text-[11px] leading-relaxed">
            {state.mcLogs.length === 0 && (
              <div className="text-muted-foreground">Запустите игру, чтобы увидеть логи Minecraft.</div>
            )}
            {state.mcLogs.map((line, i) => (
              <div
                key={i}
                className={line.startsWith('[err]') ? 'text-destructive' : 'text-muted-foreground'}
              >
                {line}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
