import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Folder, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import type { LauncherState } from '@/hooks/useLauncherState'

interface LibraryProps {
  state: LauncherState
  onInstall: () => void
}

export function Library({ state, onInstall }: LibraryProps): JSX.Element {
  const { installed, installedVersion, isInstalling } = state

  return (
    <div className="space-y-4 p-8">
      <h2 className="font-display text-3xl arcane-text uppercase tracking-[0.15em]">Библиотека</h2>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Voidcraft</CardTitle>
            <div className="text-xs text-muted-foreground">
              Minecraft 1.12.2 · Forge 14.23.5.2860
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => api.invoke('app:openFolder', 'mods')}>
              <Folder className="mr-1 h-4 w-4" /> Моды
            </Button>
            <Button variant="outline" size="sm" onClick={onInstall} disabled={isInstalling}>
              <RefreshCw className="mr-1 h-4 w-4" /> Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <Stat label="Статус" value={installed ? 'Установлено' : 'Не установлено'} />
            <Stat label="Версия" value={installedVersion ?? '—'} mono />
            <Stat label="Тип" value="Tech + Magic Expert" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={mono ? 'font-mono text-base' : 'text-base font-medium'}>{value}</div>
    </div>
  )
}
