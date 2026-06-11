import { useEffect, useRef } from 'react'

/**
 * Pulls a button toward the cursor when hovered.
 * Returns a ref to attach to the element.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.35): React.RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    let active = false

    const onMove = (e: MouseEvent): void => {
      if (!active) return
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
      })
    }

    const onEnter = (): void => {
      active = true
      el.style.transition = 'transform 200ms cubic-bezier(0.22,1,0.36,1)'
    }
    const onLeave = (): void => {
      active = false
      if (raf) cancelAnimationFrame(raf)
      el.style.transition = 'transform 420ms cubic-bezier(0.22,1,0.36,1)'
      el.style.transform = 'translate3d(0,0,0)'
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    window.addEventListener('mousemove', onMove)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength])

  return ref
}
