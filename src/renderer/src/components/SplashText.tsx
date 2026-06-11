import { useEffect, useState } from 'react'

const PHRASES = [
  'Бездна ждёт',
  'Reality.exe остановлен',
  'Forging the void',
  'Кровь и сталь',
  'Магия требует жертв',
  '97 модов, 1 апокалипсис',
  'Glitch in the matrix',
  'Эфир пробуждается',
  'Cog meets crystal',
  'Welcome, voidwalker',
  'Forge 1.12.2 forever',
  'Где-то крошится разум',
  'Тауметр перегрелся',
  'Mekanism > жизнь',
  'Botania цветёт',
  'Thaumcraft исследует тебя',
  'AE2 знает всё',
  'Не смотри в Bedrock',
  'Java 8, как и положено',
  'Сейчас точно крашнется'
]

export function SplashText(): JSX.Element {
  const [idx, setIdx] = useState<number>(() => Math.floor(Math.random() * PHRASES.length))
  const [fadeKey, setFadeKey] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1 + Math.floor(Math.random() * (PHRASES.length - 1))) % PHRASES.length)
      setFadeKey((k) => k + 1)
    }, 9000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="pointer-events-none flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
      <span className="h-px w-6 bg-gradient-to-r from-transparent to-primary/60" />
      <span
        key={fadeKey}
        className="animate-in fade-in slide-in-from-left-2 font-display italic text-primary/85"
        style={{ animationDuration: '600ms' }}
      >
        « {PHRASES[idx]} »
      </span>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
    </div>
  )
}
