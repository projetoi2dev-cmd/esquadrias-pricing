import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Card } from './ui'

export function Kpi({
  icon: Icon,
  title,
  value,
  trend,
  up = true,
  note = 'vs mês anterior',
}: {
  icon: LucideIcon
  title: string
  value: string
  trend?: string
  up?: boolean
  note?: string
}) {
  const TrendIcon = up ? ArrowUpRight : ArrowDownRight
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <span className="h-8 w-8 grid place-items-center rounded-md bg-primary-soft text-primary">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-[28px] leading-none font-bold font-mono tabular-nums tracking-tight">{value}</p>
      <p className="mt-3 text-xs flex items-center gap-1.5">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-success' : 'text-danger'}`}>
            <TrendIcon size={14} />
            {trend}
          </span>
        )}
        {note && <span className="text-muted-foreground">{note}</span>}
      </p>
    </Card>
  )
}
