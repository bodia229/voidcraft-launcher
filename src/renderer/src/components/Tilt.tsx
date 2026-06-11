import { useRef, type ReactNode } from 'react'

interface TiltProps {
  children: ReactNode
  max?: number
  className?: string
}

/**
 * 3D-tilt wrapper. Tracks the cursor relative to the element and applies
 * a rotateX/rotateY transform. Resets on leave.
 */
export function Tilt({ children, max = 8, className }: TiltProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const ry = (px - 0.5) * 2 * max
    const rx = -(py - 0.5) * 2 * max
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
  }

  const onLeave = (): void => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`tilt-3d ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
