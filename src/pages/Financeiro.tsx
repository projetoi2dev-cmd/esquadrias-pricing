import { useMemo, useState } from 'react'
import { CalendarDays, CircleDollarSign, Landmark, Receipt, TrendingUp } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, CardHeader, PageHeader, Segmented, TableSkeleton, brl, chartTip, inputCls, mono, statusTone, td, th, tr, useLoading } from '../components/ui'
import { Kpi } from './Dashboard'
import { cashDaily, cashMonthly, cashWeekly, payments, receipts, withBalance } from '../data'

const k = (v: number) => `${(v / 1000).toFixed(0)}k`

export default function Financeiro() {
  const [gran, setGran] = useState<'d' | 'w' | 'm'>('w')
  const [range, setRange] = useState('90')
  const loading = useLoading([range])
  const data = useMemo(() => withBalance({ d: cashDaily, w: cashWeekly, m: cashMonthly }[gran], 86000), [gran])
  const names: Record<string, string> = { in: 'Entradas', out: 'Saídas', bal: 'Saldo acumulado' }

  return (
    <>
      <PageHeader title="Fluxo de Caixa" subtitle="Entradas, saídas e projeção de saldo">
        <div className="relative">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select aria-label="Período" value={range} onChange={(e) => setRange(e.target.value)} className={`${inputCls} pl-9 w-56`}>
            <option value="30">01/10 – 30/10/2026</option>
            <option value="60">01/10 – 29/11/2026</option>
            <option value="90">01/10 – 29/12/2026</option>
          </select>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={TrendingUp} title="Receita Projetada 30/60/90d" value={brl(412000)} trend="+9,8%" note="30d · 60d: 781k · 90d: 1,12M" />
        <Kpi icon={Receipt} title="Contas a Receber" value={brl(159800)} trend="−2,4%" up={false} note="R$ 11,7k em atraso" />
        <Kpi icon={Landmark} title="Saldo em Caixa" value={brl(86300)} trend="+5,6%" />
        <Kpi icon={CircleDollarSign} title="Custos Fixos" value={brl(51020)} trend="+1,1%" up={false} note="mensal" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Entradas, Saídas e Saldo Acumulado"
          subtitle="Barras: movimentação no período · Linha: saldo (eixo direito)"
          action={<Segmented value={gran} onChange={setGran} options={[{ id: 'd', label: 'Diário' }, { id: 'w', label: 'Semanal' }, { id: 'm', label: 'Mensal' }]} />}
        />
        <div className="h-80 px-4 pb-4">
          <ResponsiveContainer>
            <ComposedChart data={data} stackOffset="sign" margin={{ left: 0, right: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="p" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis yAxisId="l" tickFormatter={k} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis yAxisId="r" orientation="right" tickFormatter={k} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip {...chartTip} formatter={(v, n) => [brl(Number(v)), names[String(n)]]} />
              <Legend formatter={(v) => names[v]} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="l" y={0} stroke="var(--border)" />
              <Bar yAxisId="l" dataKey="in" stackId="a" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="l" dataKey="out" stackId="a" fill="#EF4444" radius={[0, 0, 3, 3]} />
              <Line yAxisId="r" type="monotone" dataKey="bal" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 mt-4 xl:grid-cols-2">
        <Card className="overflow-x-auto">
          <CardHeader title="Recebimentos" />
          <table className="w-full">
            <thead><tr>{['Data', 'Cliente', 'Valor', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={4} /> : receipts.map((r) => (
                <tr key={r.client + r.date} className={tr}>
                  <td className={`${td} ${mono}`}>{r.date}</td><td className={`${td} font-medium`}>{r.client}</td>
                  <td className={`${td} ${mono} text-success`}>{brl(r.value)}</td>
                  <td className={td}><Badge tone={statusTone[r.status]}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto">
          <CardHeader title="Pagamentos" />
          <table className="w-full">
            <thead><tr>{['Data', 'Fornecedor', 'Categoria', 'Valor', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={5} /> : payments.map((r) => (
                <tr key={r.sup + r.date} className={tr}>
                  <td className={`${td} ${mono}`}>{r.date}</td><td className={`${td} font-medium`}>{r.sup}</td>
                  <td className={`${td} text-muted-foreground`}>{r.cat}</td>
                  <td className={`${td} ${mono}`}>{brl(r.value)}</td>
                  <td className={td}><Badge tone={statusTone[r.status]}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}
