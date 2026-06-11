import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { LauncherSettings } from '../../../shared/types.js'

interface SettingsPageProps {
  settings: LauncherSettings | null
  onChange: (patch: Partial<LauncherSettings>) => void
}

export function SettingsPage({ settings, onChange }: SettingsPageProps): JSX.Element {
  const [jvmArgs, setJvmArgs] = useState(settings?.jvmArgs ?? '')

  if (!settings) return <div className="p-8 text-muted-foreground">Загрузка…</div>

  return (
    <div className="space-y-4 p-8">
      <h2 className="font-display text-3xl arcane-text uppercase tracking-[0.15em]">Настройки</h2>

      <Card>
        <CardHeader>
          <CardTitle>Модпак</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm font-medium">URL manifest</div>
          <Input
            value={settings.manifestUrl ?? ''}
            placeholder="https://github.com/.../releases/latest/download/manifest.json"
            onChange={(e) => onChange({ manifestUrl: e.target.value || null })}
          />
          <div className="text-xs text-muted-foreground">
            Оставь пустым, чтобы использовать URL по умолчанию из конфига лаунчера.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Память</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Row label={`Минимум: ${settings.ramMinGb} GB`}>
            <Slider
              min={1}
              max={16}
              step={1}
              value={[settings.ramMinGb]}
              onValueChange={([v]) => onChange({ ramMinGb: v })}
            />
          </Row>
          <Row label={`Максимум: ${settings.ramMaxGb} GB`}>
            <Slider
              min={settings.ramMinGb}
              max={32}
              step={1}
              value={[settings.ramMaxGb]}
              onValueChange={([v]) => onChange({ ramMaxGb: v })}
            />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Запуск</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Закрывать лаунчер при запуске игры"
            checked={settings.closeOnLaunch}
            onChange={(v) => onChange({ closeOnLaunch: v })}
          />
          <Toggle
            label="Discord Rich Presence"
            checked={settings.discordRpc}
            onChange={(v) => onChange({ discordRpc: v })}
          />
          <div className="space-y-2">
            <div className="text-sm font-medium">Java path</div>
            <Input
              value={settings.javaPath ?? ''}
              placeholder="Авто-определение"
              onChange={(e) => onChange({ javaPath: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Сервер по умолчанию</div>
            <Input
              value={settings.defaultServer ?? ''}
              placeholder="ip:port (опционально)"
              onChange={(e) => onChange({ defaultServer: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">JVM args</div>
            <textarea
              value={jvmArgs}
              onChange={(e) => setJvmArgs(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background/40 p-3 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={() => onChange({ jvmArgs })}>
              Сохранить JVM args
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
