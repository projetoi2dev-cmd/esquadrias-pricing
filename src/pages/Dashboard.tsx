import { ArrowUpRight, ArrowDownRight, FileText, Wallet, Percent, TrendingUp, MoreHorizontal, Eye, type LucideIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { Badge, Card, CardHeader, IconButton, PageHeader, TableSkeleton, brl, chartTip, mono, statusTone, td, th, tr, useLoading } from '../components/ui'
import { installs, margin, recentQuotes, topProducts } from '../data'

export function Kpi({ icon: Icon, title, value, trend, up = true, note = 'vs mês anterior' }: { icon: LucideIcon; title: string; value: string; trend: string; up?: boolean; note?: string }) {
  const T = up ? ArrowUpRight : ArrowDownRight
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <span className="h-8 w-8 grid place-items-center rounded-md bg-primary-soft text-primary"><Icon size={16} /></span>
      </div>
      <p className="mt-3 text-[28px] leading-none font-bold font-mono tabular-nums tracking-tight">{value}</p>
      <p className="mt-3 text-xs flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-success' : 'text-danger'}`}><T size={14} />{trend}</span>
        <span className="text-muted-foreground">{note}</span>
      </p>
    </Card>
  )
}

export default function Dashboard() {
  const loading = useLoading()
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral de outubro de 2026 · Vidraçaria Modelo" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={FileText} title="Orçamentos Abertos" value="37" trend="+12%" />
        <Kpi icon={Wallet} title="Faturamento Mensal" value={brl(358420)} trend="+8,4%" />
        <Kpi icon={Percent} title="Margem de Lucro" value="26,3%" trend="+1,2 p.p." />
        <Kpi icon={TrendingUp} title="Fluxo de Caixa Previsto" value={brl(127900)} trend="−3,1%" up={false} />
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Evolução da Margem de Lucro" subtitle="Últimos 6 meses · % sobre faturamento" />
          <div className="h-64 px-4 pb-4">
            <ResponsiveContainer>
              <LineChart data={margin} margin={{ left: -16, right: 16, top: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis domain={[18, 28]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} unit="%" />
                <Tooltip {...chartTip} formatter={(v) => [`${v}%`, 'Margem']} />
                <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top 5 Produtos Mais Vendidos" subtitle="Unidades vendidas em 2026" />
          <div className="h-64 px-4 pb-4">
            <ResponsiveContainer>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis type="category" dataKey="n" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--foreground)' }} />
                <Tooltip {...chartTip} formatter={(v) => [`${v} un`, 'Vendidos']} />
                <Bar dataKey="q" radius={[0, 4, 4, 0]} barSize={20}>
                  {topProducts.map((_, i) => <Cell key={i} fill="var(--primary)" fillOpacity={1 - i * 0.14} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 mt-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Orçamentos Recentes" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['Cliente', 'Valor', 'Status', 'Data', 'Ações'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <TableSkeleton cols={5} /> : recentQuotes.map((q) => (
                  <tr key={q.client} className={tr}>
                    <td className={`${td} font-medium`}>{q.client}</td>
                    <td className={`${td} ${mono}`}>{brl(q.value)}</td>
                    <td className={td}><Badge tone={statusTone[q.status]}>{q.status}</Badge></td>
                    <td className={`${td} text-muted-foreground`}>{q.date}</td>
                    <td className={td}><span className="flex"><IconButton label="Visualizar"><Eye size={16} /></IconButton><IconButton label="Mais ações"><MoreHorizontal size={16} /></IconButton></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Instalações Agendadas" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['Data', 'Cliente', 'Endereço', 'Instalador', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <TableSkeleton cols={5} /> : installs.map((i) => (
                  <tr key={i.client} className={tr}>
                    <td className={`${td} ${mono}`}>{i.date}</td>
                    <td className={`${td} font-medium`}>{i.client}</td>
                    <td className={`${td} text-muted-foreground`}>{i.addr}</td>
                    <td className={td}>{i.who}</td>
                    <td className={td}><Badge tone={statusTone[i.status]}>{i.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
