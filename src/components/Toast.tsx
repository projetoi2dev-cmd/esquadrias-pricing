import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { cn } from './ui'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = crypto.randomUUID()
      setItems((current) => [...current, { id, message, tone }])
      window.setTimeout(() => remove(id), 4500)
    },
    [remove],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg slide-in',
              item.tone === 'error' ? 'border-danger/40' : item.tone === 'info' ? 'border-primary/40' : 'border-success/40',
            )}
          >
            {item.tone === 'error' ? (
              <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
            )}
            <p className="flex-1">{item.message}</p>
            <button type="button" aria-label="Fechar aviso" onClick={() => remove(item.id)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return value
}
