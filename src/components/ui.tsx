import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'

export const cn = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')
export const brl = (v: number, d = 0) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: d, maximumFractionDigits: d })
export const num = (v: number) => v.toLocaleString('pt-BR')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}
export function Button({ variant = 'secondary', size = 'md', className, ...p }: BtnProps) {
  const v = {
    primary: 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-sm',
    secondary: 'bg-card border border-border hover:bg-muted text-foreground shadow-sm',
    ghost: 'hover:bg-muted text-foreground',
    danger: 'bg-danger text-white hover:brightness-110',
  }[variant]
  return (
    <button
      {...p}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition cursor-pointer whitespace-nowrap disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        v,
        className,
      )}
    />
  )
}

export function IconButton({ label, children, className, ...p }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <span className="relative group inline-flex">
      <button
        {...p}
        aria-label={label}
        className={cn('h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer', className)}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground text-background text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition"
      >
        {label}
      </span>
    </span>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('bg-card border border-border rounded-lg shadow-card', className)}>{children}</section>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const tones = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-primary-soft text-primary',
  neutral: 'bg-muted text-muted-foreground',
}
export type Tone = keyof typeof tones
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

export const statusTone: Record<string, Tone> = {
  Aprovado: 'success', Pago: 'success', Confirmado: 'success', Concluído: 'success', Ativo: 'success', Recebido: 'success', 'Em dia': 'success',
  Pendente: 'warning', 'Em análise': 'warning', Agendado: 'info', 'Em produção': 'info', Enviado: 'info', Rascunho: 'neutral',
  Atrasado: 'danger', Recusado: 'danger', Inativo: 'neutral', Vencido: 'danger', Reagendar: 'warning', Prospect: 'info',
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} />
}

export function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-border" aria-hidden>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className={c === 0 ? 'w-32' : 'w-16'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export const th = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 whitespace-nowrap'
export const td = 'px-4 py-3 text-sm'
export const tr = 'border-t border-border hover:bg-muted/60 transition-colors'
export const mono = 'font-mono tabular-nums'
export const inputCls =
  'h-10 w-full rounded-md border border-border bg-card px-3 text-sm placeholder:text-muted-foreground hover:border-muted-foreground/50 transition'

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  )
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode }[] }) {
  return (
    <div role="tablist" className="inline-flex rounded-md border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-8 px-3 rounded text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer',
            value === o.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside role="dialog" aria-label={title} className="slide-in absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card flex items-center justify-between px-6 h-16 border-b border-border">
          <h2 className="font-semibold">{title}</h2>
          <IconButton label="Fechar painel" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="p-6">{children}</div>
      </aside>
    </div>
  )
}

export const Avatar = ({ name, size = 32, tone = 0 }: { name: string; size?: number; tone?: number }) => {
  const hues = ['#2563eb', '#7c3aed', '#0891b2', '#c2410c', '#059669', '#be185d']
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: hues[(tone || name.length) % hues.length] }}
      aria-hidden
    >
      {ini}
    </span>
  )
}

export const chartTip = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--foreground)' },
  cursor: { fill: 'var(--muted)', opacity: 0.6 },
}
