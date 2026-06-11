import { useEffect, useState } from 'react'
import { Boxes, Scroll, Layers, HardDrive } from 'lucide-react'

interface Stat {
  label: string
  value: number
  suffix?: string
  Icon: typeof Boxes
}

function useCountUp(target: number, durationMs = 900): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return n
}

export function ModpackStats(): JSX.Element {
  const stats: Stat[] = [
    { label: 'Моды', value: 100, Icon: Boxes },
    { label: 'Квесты', value: 519, Icon: Scroll },
    { label: 'Главы', value: 7, Icon: Layers },
    { label: 'Размер', value: 3, suffix: ' GB', Icon: HardDrive }
  ]

  return (
    <div className="glass flex max-w-2xl items-stretch divide-x divide-white/[0.06] rounded-xl p-1">
      {stats.map((s, i) => (
        <StatCell key={s.label} stat={s} delay={i * 120} />
      ))}
    </div>
  )
}

function StatCell({ stat, delay }: { stat: Stat; delay: number }): JSX.Element {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setArmed(true), delay)
    return () => clearTimeout(id)
  }, [delay])
  const n = useCountUp(armed ? stat.value : 0, 800)
  const Icon = stat.Icon
  return (
    <div className="flex flex-1 items-center gap-3 px-5 py-3">
      <Icon className="h-4 w-4 text-primary/70" strokeWidth={1.6} />
      <div className="flex flex-col">
        <div className="font-display text-xl leading-none tracking-wider text-foreground/95">
          {n}
          {stat.suffix && <span className="text-primary/80">{stat.suffix}</span>}
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {stat.label}
        </div>
      </div>
    </div>
  )
}
