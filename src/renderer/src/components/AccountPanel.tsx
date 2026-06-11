import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogIn, LogOut, User } from 'lucide-react'
import type { AccountProfile } from '../../../shared/types.js'

interface AccountPanelProps {
  account: AccountProfile | null
  onLogin: (mode: 'microsoft' | 'offline', username?: string) => void
  onLogout: () => void
}

export function AccountPanel({ account, onLogin, onLogout }: AccountPanelProps): JSX.Element {
  const [showOffline, setShowOffline] = useState(false)
  const [username, setUsername] = useState('')

  if (account) {
    return (
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-gradient-to-br from-primary/40 to-accent/40">
          <img
            src={`https://mc-heads.net/avatar/${account.name}/64`}
            alt={account.name}
            className="h-full w-full"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{account.name}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {account.mode === 'microsoft' ? 'Microsoft' : 'Offline'}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Выйти">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="glass space-y-3 rounded-xl p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <User className="h-4 w-4 text-primary" />
        Войдите в аккаунт
      </div>

      {!showOffline ? (
        <div className="space-y-2">
          <Button variant="arcane" className="w-full" onClick={() => onLogin('microsoft')}>
            <LogIn className="mr-1 h-4 w-4" /> Microsoft
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowOffline(true)}>
            Offline (без лицензии)
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="Ник (3-16, A-Z, 0-9, _)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={16}
          />
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              disabled={username.length < 3}
              onClick={() => onLogin('offline', username)}
            >
              Войти
            </Button>
            <Button variant="ghost" onClick={() => setShowOffline(false)}>
              Назад
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
