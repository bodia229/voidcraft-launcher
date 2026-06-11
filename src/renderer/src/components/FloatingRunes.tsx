/**
 * Subtle rotating arcane glyphs in the corners of the Home view.
 * Pure CSS rotation, no JS work per frame.
 */
const RUNES = ['✦', '✧', '◈', '◇', '⛧', '✶', '✷']

interface Pos {
  className: string
  rune: string
  size: string
  duration: string
  delay: string
}

const SLOTS: Pos[] = [
  { className: 'top-12 right-12',    rune: RUNES[0], size: 'text-5xl', duration: '40s', delay: '0s'  },
  { className: 'top-1/2 right-8',    rune: RUNES[3], size: 'text-3xl', duration: '55s', delay: '5s'  },
  { className: 'bottom-32 right-24', rune: RUNES[5], size: 'text-4xl', duration: '48s', delay: '12s' },
  { className: 'top-32 right-1/3',   rune: RUNES[2], size: 'text-2xl', duration: '60s', delay: '8s'  }
]

export function FloatingRunes(): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {SLOTS.map((s, i) => (
        <span
          key={i}
          className={`absolute ${s.className} ${s.size} font-display text-primary/[0.07] select-none`}
          style={{
            animation: `spin-slow ${s.duration} linear infinite`,
            animationDelay: s.delay
          }}
        >
          {s.rune}
        </span>
      ))}
    </div>
  )
}
