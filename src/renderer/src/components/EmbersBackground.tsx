import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  life: number
  alpha: number
  hue: number
}

function spawn(w: number, h: number, fromBottom = false): Particle {
  return {
    x: Math.random() * w,
    y: fromBottom ? h + Math.random() * 40 : h + Math.random() * h * 0.35,
    r: Math.random() * 1.7 + 0.4,
    speed: Math.random() * 0.45 + 0.18,
    drift: (Math.random() - 0.5) * 0.25,
    life: 1,
    alpha: Math.random() * 0.7 + 0.3,
    hue: Math.random() * 18
  }
}

export function EmbersBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let w = 0
    let h = 0

    const resize = (): void => {
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: 70 }, () => spawn(w, h))
    let raf = 0

    const render = (): void => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.y -= p.speed
        p.x += p.drift + Math.sin(p.y * 0.012) * 0.18
        p.life -= 0.004
        if (p.life <= 0 || p.y < -10 || p.x < -20 || p.x > w + 20) {
          Object.assign(p, spawn(w, h, true))
        }
        const alpha = Math.max(0, p.life) * p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 85%, 58%, ${alpha})`
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, ${alpha * 0.8})`
        ctx.shadowBlur = 7
        ctx.fill()
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-70"
    />
  )
}
