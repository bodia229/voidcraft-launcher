import { useState, useEffect } from 'react'
import { Sidebar, type PageId } from '@/components/Sidebar'
import { Home } from '@/pages/Home'
import { Library } from '@/pages/Library'
import { Packs } from '@/pages/Packs'
import { News } from '@/pages/News'
import { Logs } from '@/pages/Logs'
import { SettingsPage } from '@/pages/SettingsPage'
import { Toaster } from '@/components/Toaster'
import { EmbersBackground } from '@/components/EmbersBackground'
import { TitleBar } from '@/components/TitleBar'
import { useLauncherState } from '@/hooks/useLauncherState'
import { toast } from '@/hooks/useToast'

export default function App(): JSX.Element {
  const [page, setPage] = useState<PageId>('home')
  const { state, login, logout, install, launch, updateSettings } = useLauncherState()

  useEffect(() => {
    if (state.error) {
      toast({ title: 'Ошибка', description: state.error, variant: 'destructive' })
    }
  }, [state.error])

  return (
    <div className="relative flex h-screen w-screen flex-col">
      <EmbersBackground />
      <div className="film-grain" />
      <div className="vignette" />
      <Toaster />
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar page={page} onPageChange={setPage} />

        <main key={page} className="page-in relative flex-1 overflow-hidden">
          {page === 'home' && (
            <Home
              state={state}
              onLogin={login}
              onLogout={logout}
              onInstall={install}
              onLaunch={launch}
            />
          )}
          {page === 'library' && <Library state={state} onInstall={install} />}
          {page === 'packs' && <Packs />}
          {page === 'news' && <News />}
          {page === 'logs' && <Logs state={state} />}
          {page === 'settings' && (
            <SettingsPage settings={state.settings} onChange={updateSettings} />
          )}
        </main>
      </div>
    </div>
  )
}
