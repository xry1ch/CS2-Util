import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

interface DialogContentProps {
  children: ReactNode
  onClose: () => void
  className?: string
}

export function DialogContent({ children, onClose, className = '' }: DialogContentProps) {
  return (
    <div
      className={`relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg border border-border bg-background p-6 shadow-lg ${className}`}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-background/80 p-2 text-foreground transition hover:bg-background"
      >
        <X className="h-5 w-5" />
      </button>
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  children: ReactNode
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4 pr-10">{children}</div>
}

interface DialogTitleProps {
  children: ReactNode
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className="text-2xl font-semibold">{children}</h2>
}

interface DialogDescriptionProps {
  children: ReactNode
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>
}
