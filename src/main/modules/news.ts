import { ipcMain } from 'electron'
import type { NewsItem } from '../../shared/types.js'
import { NEWS_FEED_URL } from '../../shared/constants.js'

interface GhRelease {
  id: number
  name: string
  body: string
  html_url: string
  published_at: string
  draft: boolean
  prerelease: boolean
}

let cache: { at: number; items: NewsItem[] } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export async function fetchNews(): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.items

  try {
    const res = await fetch(NEWS_FEED_URL, {
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) return cache?.items ?? []
    const releases = (await res.json()) as GhRelease[]
    const items = releases
      .filter((r) => !r.draft)
      .slice(0, 20)
      .map<NewsItem>((r) => ({
        id: String(r.id),
        title: r.name || `Release ${r.id}`,
        body: r.body || '',
        url: r.html_url,
        publishedAt: r.published_at
      }))
    cache = { at: Date.now(), items }
    return items
  } catch (err) {
    console.warn('[news] fetch failed:', err)
    return cache?.items ?? []
  }
}

export function registerNewsHandlers(): void {
  ipcMain.handle('news:fetch', () => fetchNews())
}
