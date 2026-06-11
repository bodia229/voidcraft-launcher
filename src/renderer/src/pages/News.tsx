import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { NewsItem } from '../../../shared/types.js'

export function News(): JSX.Element {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .invoke('news:fetch')
      .then((items) => setItems(items))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full flex-col p-8">
      <h2 className="mb-4 font-display text-3xl arcane-text uppercase tracking-[0.15em]">Новости</h2>

      <ScrollArea className="flex-1 pr-4 scrollbar-thin">
        {loading && <div className="text-muted-foreground">Загрузка…</div>}
        {!loading && items.length === 0 && (
          <div className="text-muted-foreground">Пока что новостей нет.</div>
        )}
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="transition-all hover:bg-white/[0.06]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <button
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => api.invoke('app:openExternal', item.url)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
