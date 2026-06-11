import { cn } from '@/lib/utils'
import { Home, Library, Newspaper, Settings, ScrollText, Flame, Package } from 'lucide-react'
import { UpdateBanner } from '@/components/UpdateBanner'

export type PageId = 'home' | 'library' | 'packs' | 'news' | 'logs' | 'settings'

interface SidebarProps {
  page: PageId
  onPageChange: (page: PageId) => void
}

const items: { id: PageId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'library', label: 'Библиотека', icon: Library },
  { id: 'packs', label: 'Пакеты', icon: Package },
  { id: 'news', label: 'Новости', icon: Newspaper },
  { id: 'logs', label: 'Логи', icon: ScrollText },
  { id: 'settings', label: 'Настройки', icon: Settings }
]

export function Sidebar({ page, onPageChange }: SidebarProps): JSX.Element {
  return (
    <aside className="glass-strong flex h-full w-60 flex-col border-r border-white/10 px-3 py-4">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="relative">
          <Flame className="h-7 w-7 text-primary" strokeWidth={1.5} />
          <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/40" />
        </div>
        <div>
          <div className="font-display text-lg leading-tight tracking-[0.2em] arcane-text glitch uppercase">Voidcraft</div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">launcher</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id === page
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'nav-active-glow bg-gradient-to-r from-primary/15 to-transparent text-foreground'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary via-accent to-primary shadow-[0_0_14px_hsl(0_90%_55%/0.7)]" />
              )}
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <UpdateBanner />
      <div className="border-t border-white/10 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="px-2">v0.1.0 · Forge 1.12.2</div>
      </div>
    </aside>
  )
}
