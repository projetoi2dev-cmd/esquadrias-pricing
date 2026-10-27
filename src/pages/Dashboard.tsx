import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Eye, FileText, Percent, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardHeader, PageHeader, TableSkeleton, brl, chartTip, mono, statusTone, td, th, tr } from '../components/ui'
import { Kpi } from '../components/Kpi'
import { EmptyState, QueryError } from '../components/States'
import { useWorkspace } from '../lib/workspace'
import { useNavigate } from '../lib/navigation'
import { supabase } from '../lib/supabaseClient'
import { formatDate, formatMonth, parseDate, toDateInput, todayInput } from '../lib/format'
import { INSTALLATION_STATUS_LABELS, QUOTE_STATUS_LABELS, labelOf } from '../lib/constants'
import type {
  InstallationWithRelations, Project, QuoteStatus, QuoteWithClient, Transaction,
} from '../lib/database.types'

interface SoldItem {
  quantity: number
  description: string
  products: { name: string } | null
}

export default function Dashboard() {
  const { workspace, workspaceId } = useWorkspace()
  const navigate = useNavigate()

  const quotesQuery = useQuery({
    queryKey: ['dashboard-quotes', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, clients(name)')
        .eq('workspace_id', workspaceId!)
        .order('issue_date', { ascending: false })
        .returns<QuoteWithClient[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const transactionsQuery = useQuery({
    queryKey: ['dashboard-transactions', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .returns<Transaction[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const projectsQuery = useQuery({
    queryKey: ['dashboard-projects', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .returns<Project[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const installationsQuery = useQuery({
    queryKey: ['dashboard-installations', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations')
        .select('*, clients(name), team_members(name)')
        .eq('workspace_id', workspaceId!)
        .in('status', ['agendado', 'confirmado', 'reagendar'])
        .order('scheduled_date')
        .limit(5)
        .returns<InstallationWithRelations[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const soldItemsQuery = useQuery({
    queryKey: ['dashboard-sold-items', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_items')
        .select('quantity, description, products(name), quotes!inner(status)')
        .eq('workspace_id', workspaceId!)
        .eq('quotes.status', 'aprovado')
        .returns<SoldItem[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const loading = quotesQuery.isLoading || transactionsQuery.isLoading || projectsQuery.isLoading || installationsQuery.isLoading || soldItemsQuery.isLoading
  const error = quotesQuery.error || transactionsQuery.error || projectsQuery.error || installationsQuery.error || soldItemsQuery.error
  if (error) {
    return <QueryError message={(error as Error).message} onRetry={() => { void quotesQuery.refetch(); void transactionsQuery.refetch(); void projectsQuery.refetch(); void installationsQuery.refetch(); void soldItemsQuery.refetch() }} />
  }

  const quotes = quotesQuery.data ?? []
  const transactions = transactionsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const installations = installationsQuery.data ?? []
  const soldItems = soldItemsQuery.data ?? []
  const today = new Date()

  const openQuotes = quotes.filter((quote) => ['rascunho', 'enviado', 'em_analise'].includes(quote.status)).length
  const inNegotiation = quotes.filter((quote) => ['enviado', 'em_analise'].includes(quote.status)).length
  const receivedInMonth = (date: Date) => (transaction: Transaction) => {
    const paidAt = parseDate(transaction.paid_at)
    return transaction.type === 'receivable' && transaction.status === 'recebido' && paidAt !== null
      && paidAt.getFullYear() === date.getFullYear() && paidAt.getMonth() === date.getMonth()
  }
  const currentRevenue = transactions.filter(receivedInMonth(today)).reduce((sum, transaction) => sum + transaction.amount, 0)
  const previousDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const previousRevenue = transactions.filter(receivedInMonth(previousDate)).reduce((sum, transaction) => sum + transaction.amount, 0)
  const revenueTrend = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : undefined

  const activeProjects = projects.filter(
    (project) => !['cancelado', 'concluido'].includes(project.status) && project.value > 0,
  )
  const totalProjectValue = activeProjects.reduce((sum, project) => sum + project.value, 0)
  const totalPlannedProfit = activeProjects.reduce((sum, project) => sum + project.planned_profit, 0)
  const margin = totalProjectValue > 0 ? (totalPlannedProfit / totalProjectValue) * 100 : 0

  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 30)
  const horizonIso = toDateInput(horizon)
  const todayIso = todayInput()
  const forecast = transactions
    .filter((transaction) => ['pendente', 'atrasado'].includes(transaction.status))
    .filter((transaction) => transaction.due_date >= todayIso && transaction.due_date <= horizonIso)
    .reduce((sum, transaction) => sum + (transaction.type === 'receivable' ? transaction.amount : -transaction.amount), 0)

  const marginSeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthQuotes = quotes.filter((quote) => quote.status === 'aprovado' && quote.issue_date.startsWith(key))
    const average = monthQuotes.length > 0
      ? monthQuotes.reduce((sum, quote) => sum + Number(quote.margin_pct), 0) / monthQuotes.length
      : null
    return { m: formatMonth(date), v: average === null ? null : Math.round(average * 10) / 10 }
  })

  const productTotals = new Map<string, number>()
  for (const item of soldItems) {
    const name = item.products?.name ?? item.description
    productTotals.set(name, (productTotals.get(name) ?? 0) + item.quantity)
  }
  const topProducts = [...productTotals.entries()]
    .map(([name, quantity]) => ({ n: name.length > 22 ? `${name.slice(0, 21)}…` : name, q: quantity }))
    .sort((a, b) => b.q - a.q)
    .slice(0, 5)

  const recentQuotes = quotes.slice(0, 5)

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Visão geral de ${formatMonth(today)} de ${today.getFullYear()} · ${workspace?.name}`}>
        <Button onClick={() => navigate('relatorios')}>Ver relatórios <ArrowRight size={15} /></Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={FileText} title="Orçamentos Abertos" value={String(openQuotes)} note={`${inNegotiation} em negociação`} />
        <Kpi
          icon={Wallet}
          title="Faturamento Mensal"
          value={brl(currentRevenue)}
          trend={revenueTrend === undefined ? undefined : `${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1).replace('.', ',')}%`}
          up={(revenueTrend ?? 0) >= 0}
        />
        <Kpi icon={Percent} title="Margem de Lucro" value={`${margin.toFixed(1).replace('.', ',')}%`} note="projetos ativos" />
        <Kpi icon={TrendingUp} title="Fluxo de Caixa Previsto" value={brl(forecast)} note="próximos 30 dias" up={forecast >= 0} />
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Evolução da Margem de Lucro" subtitle="Últimos 6 meses · média dos orçamentos aprovados" />
          <div className="h-64 px-4 pb-4">
            <ResponsiveContainer>
              <LineChart data={marginSeries} margin={{ left: -16, right: 16, top: 8 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} unit="%" />
                <Tooltip {...chartTip} formatter={(value) => [`${value}%`, 'Margem']} />
                <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top 5 Produtos Mais Vendidos" subtitle="Unidades em orçamentos aprovados" />
          <div className="h-64 px-4 pb-4">
            {topProducts.length === 0 ? <EmptyState title="Sem vendas registradas" /> : (
              <ResponsiveContainer>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 24, right: 16 }}>
                  <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                  <YAxis type="category" dataKey="n" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--foreground)' }} />
                  <Tooltip {...chartTip} formatter={(value) => [`${value} un`, 'Vendidos']} />
                  <Bar dataKey="q" radius={[0, 4, 4, 0]} barSize={20}>
                    {topProducts.map((_, index) => <Cell key={index} fill="var(--primary)" fillOpacity={1 - index * 0.14} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 mt-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Orçamentos Recentes" action={<button onClick={() => navigate('orcamentos')} className="text-xs font-medium text-primary hover:underline cursor-pointer">Ver todos</button>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr>{['Cliente', 'Valor', 'Status', 'Data', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
              <tbody>
                {loading ? <TableSkeleton cols={5} /> : recentQuotes.map((quote) => (
                  <tr key={quote.id} className={tr}>
                    <td className={`${td} font-medium`}>{quote.clients?.name ?? '—'}</td>
                    <td className={`${td} ${mono}`}>{brl(Number(quote.total))}</td>
                    <td className={td}><Badge tone={statusTone[labelOf(QUOTE_STATUS_LABELS, quote.status as QuoteStatus)]}>{labelOf(QUOTE_STATUS_LABELS, quote.status as QuoteStatus)}</Badge></td>
                    <td className={`${td} text-muted-foreground`}>{formatDate(quote.issue_date)}</td>
                    <td className={td}>
                      <button aria-label={`Abrir orçamento ${quote.code}`} onClick={() => navigate('orcamentos')} className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && recentQuotes.length === 0 && <tr><td colSpan={5}><EmptyState title="Nenhum orçamento" description="Crie o primeiro orçamento no módulo de orçamentos." /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Instalações Agendadas" action={<button onClick={() => navigate('projetos')} className="text-xs font-medium text-primary hover:underline cursor-pointer">Ver projetos</button>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead><tr>{['Data', 'Cliente', 'Endereço', 'Instalador', 'Status'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
              <tbody>
                {loading ? <TableSkeleton cols={5} /> : installations.map((installation) => (
                  <tr key={installation.id} className={tr}>
                    <td className={`${td} ${mono}`}>{formatDate(installation.scheduled_date)}</td>
                    <td className={`${td} font-medium`}>{installation.clients?.name ?? '—'}</td>
                    <td className={`${td} text-muted-foreground max-w-44 truncate`}>{installation.address ?? '—'}</td>
                    <td className={td}>{installation.team_members?.name ?? '—'}</td>
                    <td className={td}><Badge tone={statusTone[labelOf(INSTALLATION_STATUS_LABELS, installation.status)]}>{labelOf(INSTALLATION_STATUS_LABELS, installation.status)}</Badge></td>
                  </tr>
                ))}
                {!loading && installations.length === 0 && <tr><td colSpan={5}><EmptyState title="Nenhuma instalação agendada" description="As instalações ativas aparecem aqui." /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
