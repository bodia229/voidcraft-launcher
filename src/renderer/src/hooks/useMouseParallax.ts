import { useEffect, useState } from 'react'

interface ParallaxOffset {
  x: number
  y: number
}

/**
 * Tracks pointer position normalized to [-1, 1] across the viewport.
 * Multiply by your desired pixel/degree range at the call-site.
 */
export function useMouseParallax(): ParallaxOffset {
  const [pos, setPos] = useState<ParallaxOffset>({ x: 0, y: 0 })

  useEffect(() => {
    let raf = 0
    let pendingX = 0
    let pendingY = 0

    const onMove = (e: MouseEvent): void => {
      pendingX = (e.clientX / window.innerWidth) * 2 - 1
      pendingY = (e.clientY / window.innerHeight) * 2 - 1
      if (raf) return
      raf = requestAnimationFrame(() => {
        setPos({ x: pendingX, y: pendingY })
        raf = 0
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return pos
}
