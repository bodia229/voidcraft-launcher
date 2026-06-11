import { useMouseParallax } from '@/hooks/useMouseParallax'

/**
 * Big, low-opacity cracked-circle backdrop that "breathes" behind the Home
 * content. Reacts to mouse with subtle parallax + rotation.
 */
export function VoidWatermark(): JSX.Element {
  const { x, y } = useMouseParallax()
  const tx = x * 18 // px
  const ty = y * 18
  const rot = x * 4 // deg
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
      style={{
        transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`,
        transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1)'
      }}
    >
      <svg
        viewBox="-200 -200 400 400"
        className="ember-pulse draw-in h-[140%] w-[140%] max-w-none opacity-[0.07]"
        aria-hidden
      >
        <defs>
          <linearGradient id="wm-blood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="60%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* Cracked outer ring */}
        <g fill="none" stroke="url(#wm-blood)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M -159 -55  A 168 168 0 0 1 -55 -159" />
          <path d="M -25 -166  A 168 168 0 0 1  88 -143" />
          <path d="M 120 -117 A 168 168 0 0 1  166  -22" />
          <path d="M 163  22  A 168 168 0 0 1  108  129" />
          <path d="M  70  153 A 168 168 0 0 1 -36  164" />
          <path d="M -75  151 A 168 168 0 0 1 -154  64" />
        </g>

        {/* Center diamond outline */}
        <g transform="rotate(45)">
          <rect x="-58" y="-58" width="116" height="116" rx="6" fill="none" stroke="url(#wm-blood)" strokeWidth="2" />
        </g>

        {/* Vertical crack through center */}
        <g stroke="url(#wm-blood)" strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M 0 -82  L -4 -55  L 6 -28  L -3 0  L 5 28  L -4 55  L 3 82" />
        </g>

        {/* Tiny offshoot cracks */}
        <g stroke="url(#wm-blood)" strokeWidth="1" fill="none" opacity="0.8">
          <path d="M -3 0 L -28 -16" />
          <path d="M 3 30 L 22 42" />
        </g>
      </svg>
    </div>
  )
}
