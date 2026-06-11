import { useState, useEffect, useCallback, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Folder, Trash2, Upload, Package, Sparkles } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import type { PackInfo, PackKind } from '../../../shared/types.js'

interface PathBridge {
  getPathForFile: (file: File) => string
}
const pathBridge = (window as unknown as { api: PathBridge }).api

const TABS: { id: PackKind; label: string; icon: typeof Package }[] = [
  { id: 'resourcepacks', label: 'Resource Packs', icon: Package },
  { id: 'shaderpacks', label: 'Shader Packs', icon: Sparkles }
]

export function Packs(): JSX.Element {
  const [kind, setKind] = useState<PackKind>('resourcepacks')
  const [packs, setPacks] = useState<PackInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const refresh = useCallback(async (k: PackKind) => {
    setLoading(true)
    try {
      setPacks(await api.invoke('packs:list', k))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(kind)
  }, [kind, refresh])

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      let added = 0
      let skipped = 0
      for (const file of files) {
        try {
          const path = pathBridge.getPathForFile(file)
          if (!path) {
            skipped += 1
            continue
          }
          await api.invoke('packs:add', kind, path)
          added += 1
        } catch (err) {
          skipped += 1
          toast({ title: file.name, description: (err as Error).message, variant: 'destructive' })
        }
      }
      if (added > 0) {
        toast({
          title: `Добавлено ${added} ${added === 1 ? 'пак' : 'паков'}`,
          variant: 'success',
          description: skipped > 0 ? `Пропущено ${skipped}` : undefined
        })
        await refresh(kind)
      }
    },
    [kind, refresh]
  )

  const remove = useCallback(
    async (pack: PackInfo) => {
      await api.invoke('packs:remove', pack.kind, pack.fileName)
      toast({ title: `Удалено: ${pack.displayName}`, variant: 'default' })
      await refresh(kind)
    },
    [kind, refresh]
  )

  const toggle = useCallback(
    async (pack: PackInfo, enabled: boolean) => {
      if (pack.kind !== 'resourcepacks') return
      await api.invoke('packs:setEnabled', pack.fileName, enabled)
      await refresh(kind)
    },
    [kind, refresh]
  )

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-3xl arcane-text uppercase tracking-[0.15em]">Пакеты</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => api.invoke('app:openFolder', kind)}
          title="Открыть папку"
        >
          <Folder className="mr-1 h-4 w-4" /> Открыть папку
        </Button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-secondary/40 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === kind
          return (
            <button
              key={tab.id}
              onClick={() => setKind(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-primary/30 to-accent/20 text-foreground shadow-inner'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all',
          dragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border bg-secondary/20 hover:bg-secondary/30'
        )}
      >
        <Upload className={cn('h-8 w-8', dragging ? 'text-primary' : 'text-muted-foreground')} />
        <div className="text-sm">
          Перетащи <span className="font-semibold text-primary">.zip / .jar</span> файлы сюда
        </div>
        <div className="text-xs text-muted-foreground">
          или нажми «Открыть папку» и положи вручную
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        {loading && <div className="text-muted-foreground">Загрузка…</div>}
        {!loading && packs.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Здесь пока пусто. Перетащи первый пак, чтобы добавить.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 pr-3">
          {packs.map((pack) => (
            <PackCard key={pack.fileName} pack={pack} onRemove={remove} onToggle={toggle} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface PackCardProps {
  pack: PackInfo
  onRemove: (pack: PackInfo) => void
  onToggle: (pack: PackInfo, enabled: boolean) => void
}

function PackCard({ pack, onRemove, onToggle }: PackCardProps): JSX.Element {
  return (
    <div className="glass flex gap-3 rounded-xl p-3 transition-all hover:bg-white/[0.06]">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary/60">
        {pack.iconBase64 ? (
          <img src={pack.iconBase64} alt="" className="h-full w-full object-cover" style={{ imageRendering: 'pixelated' }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-7 w-7 text-muted-foreground/60" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" title={pack.displayName}>
              {pack.displayName}
            </div>
            <div className="truncate text-[11px] text-muted-foreground" title={pack.fileName}>
              {pack.fileName} · {formatBytes(pack.sizeBytes)}
            </div>
          </div>
          {pack.kind === 'resourcepacks' && (
            <Switch
              checked={pack.enabled}
              onCheckedChange={(v) => onToggle(pack, v)}
              title={pack.enabled ? 'Выключить' : 'Включить'}
            />
          )}
        </div>
        {pack.description && (
          <div className="line-clamp-2 mt-1 text-[11px] text-muted-foreground" title={pack.description}>
            {pack.description}
          </div>
        )}
        <div className="mt-auto flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={() => onRemove(pack)} title="Удалить">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
