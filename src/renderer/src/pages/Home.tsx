import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AccountPanel } from '@/components/AccountPanel'
import { ServerStatusCard } from '@/components/ServerStatusCard'
import { SplashText } from '@/components/SplashText'
import { ModpackStats } from '@/components/ModpackStats'
import { VoidWatermark } from '@/components/VoidWatermark'
import { FloatingRunes } from '@/components/FloatingRunes'
import { Tilt } from '@/components/Tilt'
import { useMagnetic } from '@/hooks/useMagnetic'
import { Flame, Play, Download, AlertCircle, Folder } from 'lucide-react'
import { api } from '@/lib/api'
import type { LauncherState } from '@/hooks/useLauncherState'

interface HomeProps {
  state: LauncherState
  onLogin: (mode: 'microsoft' | 'offline', username?: string) => void
  onLogout: () => void
  onInstall: () => void
  onLaunch: () => void
}

export function Home({ state, onLogin, onLogout, onInstall, onLaunch }: HomeProps): JSX.Element {
  const { account, installed, installedVersion, progress, isInstalling, isRunning, error } = state
  const percent = progress && progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : 0
  const canPlay = !!account && installed && !isInstalling && !isRunning
  const canInstall = !!account && !isInstalling && !isRunning
  const playMagnet = useMagnetic<HTMLDivElement>(0.18)
  const installMagnet = useMagnetic<HTMLDivElement>(0.18)

  return (
    <div className="relative flex h-full flex-col">
      <VoidWatermark />
      <FloatingRunes />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-accent/10 blur-[140px]" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <Flame className="h-3 w-3 text-primary" strokeWidth={1.5} />
            Modpack · 1.12.2 · Expert
          </div>
          <h1 className="font-display text-7xl font-bold leading-none arcane-text glitch uppercase tracking-[0.05em]">Voidcraft</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Хардкорная tech+magic сборка на Forge 1.12.2. Mekanism, Thermal, Botania, Thaumcraft,
            BloodMagic, AE2 и десятки интеграций через BetterQuesting.
          </p>
          {installedVersion && (
            <div className="text-xs text-muted-foreground">
              Установлена версия: <span className="font-mono text-primary">{installedVersion}</span>
            </div>
          )}
          <div className="pt-2">
            <SplashText />
          </div>
          <div className="pt-1">
            <ModpackStats />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Tilt className="w-full max-w-md" max={6}>
              <AccountPanel account={account} onLogin={onLogin} onLogout={onLogout} />
            </Tilt>
            <Tilt max={6}>
              <ServerStatusCard address={state.settings?.defaultServer ?? null} />
            </Tilt>
          </div>

          {error && (
            <div className="glass flex items-start gap-2 rounded-lg border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(isInstalling || (progress && progress.phase !== 'idle')) && (
            <div className="glass space-y-2 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium uppercase tracking-wider text-muted-foreground">
                  {progress?.phase ?? 'preparing'}
                </span>
                <span className="font-mono">{percent.toFixed(0)}%</span>
              </div>
              <Progress value={percent} />
              <div className="truncate font-mono text-xs text-muted-foreground">{progress?.message}</div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!installed ? (
              <div ref={installMagnet}>
                <Button
                  variant="arcane"
                  size="xl"
                  className="arcane-glow min-w-[240px]"
                  disabled={!canInstall}
                  onClick={onInstall}
                >
                  <Download className="mr-1 h-5 w-5" />
                  {isInstalling ? 'Установка…' : 'Установить модпак'}
                </Button>
              </div>
            ) : (
              <div ref={playMagnet}>
                <Button
                  variant="arcane"
                  size="xl"
                  className="arcane-glow min-w-[240px]"
                  disabled={!canPlay}
                  onClick={onLaunch}
                >
                  <Play className="mr-1 h-5 w-5" />
                  {isRunning ? 'Игра запущена' : 'ИГРАТЬ'}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={() => api.invoke('app:openFolder', 'game')}
              title="Открыть папку модпака"
            >
              <Folder className="h-4 w-4" />
            </Button>
            {installed && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onInstall}
                disabled={isInstalling || isRunning}
                title="Проверить обновления"
              >
                Проверить обновления
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
