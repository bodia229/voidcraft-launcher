import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from '@/components/ui/toast'
import { useToast } from '@/hooks/useToast'

export function Toaster(): JSX.Element {
  const { toasts, dismiss } = useToast()
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, duration }) => (
        <Toast
          key={id}
          variant={variant}
          duration={duration}
          onOpenChange={(open) => {
            if (!open) dismiss(id)
          }}
        >
          <div className="flex-1 space-y-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
