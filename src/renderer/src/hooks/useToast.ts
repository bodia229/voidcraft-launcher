import { useState, useCallback, useEffect } from 'react'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

let listeners: Array<(toasts: ToastItem[]) => void> = []
let memory: ToastItem[] = []

function emit(): void {
  listeners.forEach((l) => l(memory))
}

export function toast(item: Omit<ToastItem, 'id'>): string {
  const id = crypto.randomUUID()
  memory = [...memory, { id, duration: 5000, ...item }]
  emit()
  return id
}

export function dismissToast(id: string): void {
  memory = memory.filter((t) => t.id !== id)
  emit()
}

export function useToast(): { toasts: ToastItem[]; toast: typeof toast; dismiss: typeof dismissToast } {
  const [toasts, setToasts] = useState<ToastItem[]>(memory)

  useEffect(() => {
    const listener = (next: ToastItem[]): void => setToasts(next)
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const dismiss = useCallback((id: string) => dismissToast(id), [])

  return { toasts, toast, dismiss }
}
