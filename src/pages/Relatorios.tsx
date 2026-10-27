import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, FileDown, FileSpreadsheet } from 'lucide-react'
import {
  Badge, Button, Card, CardHeader, Field, PageHeader, Segmented, brl, cn, inputCls, mono, statusTone, td, th, tr,
} from '../components/ui'
import { EmptyState, QueryError } from '../components/States'
import { useWorkspace } from '../lib/workspace'
import { supabase } from '../lib/supabaseClient'
import { formatDate, formatMonthYear, parseDate, toDateInput, todayInput } from '../lib/format'
import { ACTIVITY_STATUS_LABELS, QUOTE_STATUS_LABELS, labelOf } from '../lib/constants'
import type {
  Client, ClientActivity, ProjectWithRelations, QuoteWithClient, Transaction,
} from '../lib/database.types'

type Tab = 'd' | 'm' | 'r'

interface ReportItem {
  quantity: number
  description: string
  products: { name: string } | null
  quotes: { issue_date: string; status: string } | null
}

function Stat({ label, value, delta, up = true }: { label: string; value: string; delta?: string; up?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`${mono} text-2xl font-bold mt-2`}>{value}</p>
      {delta && (
        <p className={cn('text-xs font-semibold mt-2 inline-flex items-center gap-0.5', up ? 'text-success' : 'text-danger')}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{delta}
        </p>
      )}
    </Card>
  )
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function Relatorios() {
  const { workspaceId } = useWorkspace()
  const [tab, setTab] = useState<Tab>('d')
  const [day, setDay] = useState(todayInput())
  const [month, setMonth] = useState(todayInput().slice(0, 7))
  const [projectId, setProjectId] = useState('')

  const projectsQuery = useQuery({
    queryKey: ['report-projects', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name), team_members(name)')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false })
        .returns<ProjectWithRelations[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const transactionsQuery = useQuery({
    queryKey: ['report-transactions', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').eq('workspace_id', workspaceId!).returns<Transaction[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const quotesQuery = useQuery({
    queryKey: ['report-quotes', workspaceId],
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

  const clientsQuery = useQuery({
    queryKey: ['report-clients', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('workspace_id', workspaceId!).returns<Client[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const activitiesQuery = useQuery({
    queryKey: ['report-activities', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_activities')
        .select('*, clients(name), team_members(name)')
        .eq('workspace_id', workspaceId!)
        .order('activity_at', { ascending: false })
        .returns<ClientActivity[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const itemsQuery = useQuery({
    queryKey: ['report-items', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_items')
        .select('quantity, description, products(name), quotes(issue_date, status)')
        .eq('workspace_id', workspaceId!)
        .returns<ReportItem[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const projects = projectsQuery.data ?? []
  const transactions = transactionsQuery.data ?? []
  const quotes = quotesQuery.data ?? []
  const clients = clientsQuery.data ?? []
  const activities = activitiesQuery.data ?? []
  const items = itemsQuery.data ?? []

  const previousDay = useMemo(() => {
    const date = parseDate(day)
    if (!date) return ''
    date.setDate(date.getDate() - 1)
    return toDateInput(date)
  }, [day])

  const receivedOn = (date: string) => transactions
    .filter((transaction) => transaction.type === 'receivable' && transaction.status === 'recebido' && transaction.paid_at?.slice(0, 10) === date)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  const dailyRevenue = receivedOn(day)
  const previousDailyRevenue = receivedOn(previousDay)
  const dailyDelta = previousDailyRevenue > 0 ? ((dailyRevenue - previousDailyRevenue) / previousDailyRevenue) * 100 : undefined
  const dayActivities = activities
    .filter((activity) => Boolean(day) && toDateInput(new Date(activity.activity_at)) === day)
    .sort((a, b) => a.activity_at.localeCompare(b.activity_at))

  const monthStart = month ? `${month}-01` : ''
  const monthDate = parseDate(monthStart)
  const previousMonthDate = monthDate ? new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1) : null
  const previousMonth = previousMonthDate ? `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}` : ''
  const monthQuotes = month ? quotes.filter((quote) => quote.issue_date.startsWith(month)) : []
  const approvedMonthQuotes = monthQuotes.filter((quote) => quote.status === 'aprovado')
  const monthRevenue = month ? transactions
    .filter((transaction) => transaction.type === 'receivable' && transaction.status === 'recebido' && transaction.paid_at?.startsWith(month))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0) : 0
  const previousMonthRevenue = previousMonth ? transactions
    .filter((transaction) => transaction.type === 'receivable' && transaction.status === 'recebido' && transaction.paid_at?.startsWith(previousMonth))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0) : 0
  const monthExpenses = month ? transactions
    .filter((transaction) => transaction.type === 'payable' && transaction.status === 'pago' && transaction.paid_at?.startsWith(month))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0) : 0
  const conversion = monthQuotes.length > 0 ? (approvedMonthQuotes.length / monthQuotes.length) * 100 : 0
  const ticket = approvedMonthQuotes.length > 0
    ? approvedMonthQuotes.reduce((sum, quote) => sum + Number(quote.total), 0) / approvedMonthQuotes.length
    : 0
  const revenueDelta = previousMonthRevenue > 0 ? ((monthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : undefined

  const topProducts = useMemo(() => {
    const map = (prefix: string) => {
      const totals = new Map<string, number>()
      if (!prefix) return totals
      for (const item of items) {
        if (item.quotes?.status !== 'aprovado' || !item.quotes.issue_date.startsWith(prefix)) continue
        const name = item.products?.name ?? item.description
        totals.set(name, (totals.get(name) ?? 0) + item.quantity)
      }
      return totals
    }
    const current = map(month)
    const previous = map(previousMonth)
    return [...current.entries()]
      .map(([name, quantity]) => {
        const previousQuantity = previous.get(name) ?? 0
        return {
          name,
          quantity,
          previousQuantity,
          variation: previousQuantity > 0 ? ((quantity - previousQuantity) / previousQuantity) * 100 : undefined,
        }
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }, [items, month, previousMonth])

  const selectedProject = projects.find((project) => project.id === projectId) ?? projects[0]
  const projectCosts = selectedProject ? {
    material: Number(selectedProject.material_cost),
    labor: Number(selectedProject.labor_cost),
    fixed: Number(selectedProject.fixed_cost),
    tax: Number(selectedProject.tax_cost),
  } : null
  const projectPrice = selectedProject ? Number(selectedProject.value) : 0
  const projectCost = projectCosts ? projectCosts.material + projectCosts.labor + projectCosts.fixed + projectCosts.tax : 0
  const projectProfit = projectPrice - projectCost
  const variance = selectedProject ? projectProfit - Number(selectedProject.planned_profit) : 0
  const composition = projectCosts ? [
    ['Materiais', projectCosts.material, '#2563EB'],
    ['Mão de obra', projectCosts.labor, '#8b5cf6'],
    ['Custos fixos', projectCosts.fixed, '#F59E0B'],
    ['Impostos', projectCosts.tax, '#06b6d4'],
  ] as const : []

  const exportCsv = () => {
    if (tab === 'd') {
      downloadCsv(`relatorio-diario-${day}.csv`, [
        ['Relatório diário', formatDate(day)],
        ['Receita do dia', dailyRevenue],
        ['Novos clientes', clients.filter((client) => Boolean(day) && toDateInput(new Date(client.created_at)) === day).length],
        ['Orçamentos emitidos', quotes.filter((quote) => quote.issue_date === day).length],
        [],
        ['Hora', 'Cliente', 'Atividade', 'Responsável', 'Status'],
        ...dayActivities.map((activity) => [
          new Date(activity.activity_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          activity.clients?.name ?? '',
          activity.title,
          activity.team_members?.name ?? '',
          labelOf(ACTIVITY_STATUS_LABELS, activity.status),
        ]),
      ])
      return
    }
    if (tab === 'm') {
      downloadCsv(`relatorio-mensal-${month}.csv`, [
        ['Relatório mensal', formatMonthYear(monthStart)],
        ['Faturamento', monthRevenue],
        ['Despesas pagas', monthExpenses],
        ['Resultado', monthRevenue - monthExpenses],
        ['Taxa de conversão (%)', conversion],
        ['Ticket médio', ticket],
        [],
        ['Produto', 'Unidades', 'Mês anterior', 'Variação (%)'],
        ...topProducts.map((product) => [product.name, product.quantity, product.previousQuantity, product.variation ?? 0]),
      ])
      return
    }
    if (!selectedProject) return
    downloadCsv(`rentabilidade-${selectedProject.title.replace(/\s+/g, '-').toLowerCase()}.csv`, [
      ['Projeto', selectedProject.title],
      ['Cliente', selectedProject.clients?.name ?? ''],
      ['Preço de venda', projectPrice],
      ...composition.map(([name, value]) => [name, value]),
      ['Lucro realizado', projectProfit],
      ['Lucro planejado', Number(selectedProject.planned_profit)],
      ['Variação', variance],
    ])
  }

  const loading = projectsQuery.isLoading || transactionsQuery.isLoading || quotesQuery.isLoading || clientsQuery.isLoading || activitiesQuery.isLoading || itemsQuery.isLoading
  const error = projectsQuery.error || transactionsQuery.error || quotesQuery.error || clientsQuery.error || activitiesQuery.error || itemsQuery.error
  if (error) {
    return <QueryError message={(error as Error).message} onRetry={() => {
      void projectsQuery.refetch(); void transactionsQuery.refetch(); void quotesQuery.refetch()
      void clientsQuery.refetch(); void activitiesQuery.refetch(); void itemsQuery.refetch()
    }} />
  }

  return (
    <>
      <PageHeader title="Relatórios Gerenciais" subtitle="Indicadores operacionais e financeiros consolidados">
        <Button className="print:hidden" onClick={() => window.print()}><FileDown size={16} /> Exportar PDF</Button>
        <Button className="print:hidden" onClick={exportCsv}><FileSpreadsheet size={16} /> Exportar CSV</Button>
      </PageHeader>
      <div className="mb-6 print:hidden">
        <Segmented value={tab} onChange={setTab} options={[{ id: 'd', label: 'Diário' }, { id: 'm', label: 'Mensal' }, { id: 'r', label: 'Rentabilidade por Projeto' }]} />
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Carregando relatórios...</Card>
      ) : tab === 'd' && (
        <div className="space-y-4">
          <Field label="Data" className="w-48"><input type="date" value={day} onChange={(event) => setDay(event.target.value)} className={inputCls} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Receita do dia" value={brl(dailyRevenue)} delta={dailyDelta === undefined ? undefined : `${dailyDelta >= 0 ? '+' : ''}${dailyDelta.toFixed(1).replace('.', ',')}% vs dia anterior`} up={(dailyDelta ?? 0) >= 0} />
            <Stat label="Novos clientes" value={String(clients.filter((client) => Boolean(day) && toDateInput(new Date(client.created_at)) === day).length)} />
            <Stat label="Orçamentos emitidos" value={String(quotes.filter((quote) => quote.issue_date === day).length)} />
          </div>
          <Card className="overflow-x-auto">
            <CardHeader title="Agenda do dia" subtitle={formatDate(day)} />
            <table className="w-full min-w-[620px]">
              <thead><tr>{['Hora', 'Cliente', 'Atividade', 'Responsável', 'Status'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
              <tbody>
                {dayActivities.map((activity) => (
                  <tr key={activity.id} className={tr}>
                    <td className={`${td} ${mono}`}>{new Date(activity.activity_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={`${td} font-medium`}>{activity.clients?.name ?? '—'}</td>
                    <td className={td}>{activity.title}</td>
                    <td className={td}>{activity.team_members?.name ?? '—'}</td>
                    <td className={td}><Badge tone={statusTone[labelOf(ACTIVITY_STATUS_LABELS, activity.status)]}>{labelOf(ACTIVITY_STATUS_LABELS, activity.status)}</Badge></td>
                  </tr>
                ))}
                {dayActivities.length === 0 && <tr><td colSpan={5}><EmptyState title="Sem atividades nesta data" description="Escolha outra data ou registre atividades no cliente." /></td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {!loading && tab === 'm' && (
        <div className="space-y-4">
          <Field label="Mês" className="w-48"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={inputCls} /></Field>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Faturamento" value={brl(monthRevenue)} delta={revenueDelta === undefined ? undefined : `${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1).replace('.', ',')}% vs mês anterior`} up={(revenueDelta ?? 0) >= 0} />
            <Stat label="Resultado do mês" value={brl(monthRevenue - monthExpenses)} />
            <Stat label="Taxa de conversão" value={`${conversion.toFixed(0)}%`} />
            <Stat label="Ticket médio" value={brl(ticket)} />
          </div>
          <Card className="overflow-x-auto">
            <CardHeader title="Top produtos do mês" subtitle="Unidades em orçamentos aprovados" />
            <table className="w-full min-w-[560px]">
              <thead><tr>{['Produto', 'Unidades', 'Mês anterior', 'Variação'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.name} className={tr}>
                    <td className={`${td} font-medium`}>{product.name}</td>
                    <td className={`${td} ${mono}`}>{product.quantity}</td>
                    <td className={`${td} ${mono} text-muted-foreground`}>{product.previousQuantity}</td>
                    <td className={`${td} ${mono} font-semibold ${product.variation === undefined || product.variation >= 0 ? 'text-success' : 'text-danger'}`}>
                      {product.variation === undefined ? '—' : `${product.variation >= 0 ? '+' : ''}${product.variation.toFixed(1).replace('.', ',')}%`}
                    </td>
                  </tr>
                ))}
                {topProducts.length === 0 && <tr><td colSpan={4}><EmptyState title="Sem vendas no mês" description="Nenhum item de orçamento aprovado no período." /></td></tr>}
              </tbody>
            </table>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Orçamentos no mês</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {monthQuotes.length === 0 && <span className="text-sm text-muted-foreground">Nenhum orçamento emitido.</span>}
              {monthQuotes.map((quote) => (
                <span key={quote.id} className="rounded-md border border-border px-2.5 py-1.5 text-xs flex items-center gap-2">
                  <span className={mono}>{quote.code}</span>
                  <span className="text-muted-foreground">{quote.clients?.name}</span>
                  <Badge tone={statusTone[labelOf(QUOTE_STATUS_LABELS, quote.status)]}>{labelOf(QUOTE_STATUS_LABELS, quote.status)}</Badge>
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {!loading && tab === 'r' && (
        <div className="space-y-4">
          <Field label="Projeto" className="w-72">
            <select value={selectedProject?.id ?? ''} onChange={(event) => setProjectId(event.target.value)} className={inputCls}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.clients?.name}</option>)}
            </select>
          </Field>
          {!selectedProject ? (
            <EmptyState title="Nenhum projeto cadastrado" description="Crie um projeto para analisar a rentabilidade." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <Card>
                <CardHeader title="Composição de custos" subtitle={`Preço de venda ${brl(projectPrice)}`} />
                <div className="px-6 pb-6 space-y-4">
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {composition.map(([name, value, color]) => <div key={name} title={name} style={{ width: `${projectPrice > 0 ? (value / projectPrice) * 100 : 0}%`, background: color }} />)}
                    <div style={{ width: `${projectPrice > 0 ? (projectProfit / projectPrice) * 100 : 0}%` }} className="bg-[#10B981]" title="Lucro" />
                  </div>
                  <table className="w-full">
                    <tbody>
                      {composition.map(([name, value, color]) => (
                        <tr key={name} className="border-t border-border">
                          <td className="py-2.5 text-sm flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{name}</td>
                          <td className={`${mono} text-sm text-right`}>{brl(value)}</td>
                          <td className={`${mono} text-xs text-muted-foreground text-right w-16`}>{projectPrice > 0 ? ((value / projectPrice) * 100).toFixed(1).replace('.', ',') : '0,0'}%</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border font-semibold">
                        <td className="py-3 text-sm flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />Lucro final</td>
                        <td className={`${mono} text-sm text-right text-success`}>{brl(projectProfit)}</td>
                        <td className={`${mono} text-xs text-right w-16`}>{projectPrice > 0 ? ((projectProfit / projectPrice) * 100).toFixed(1).replace('.', ',') : '0,0'}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card>
                <CardHeader title="Análise de variação" subtitle="Orçado vs. realizado" />
                <div className="px-6 pb-6 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lucro orçado</span><span className={mono}>{brl(Number(selectedProject.planned_profit))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lucro realizado</span><span className={mono}>{brl(projectProfit)}</span></div>
                  <div className={cn('rounded-md p-4 flex justify-between items-center', variance >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                    <span className="text-sm font-medium">Variação</span>
                    <span className={`${mono} font-bold text-lg`}>{variance >= 0 ? '+' : '−'}{brl(Math.abs(variance))}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {variance >= 0 ? 'Projeto dentro ou acima da meta planejada.' : 'Revise custos de material e mão de obra para recuperar a margem.'}
                  </p>
                  <div className="pt-2 text-xs text-muted-foreground space-y-1">
                    <p>Etapa: {selectedProject.status}</p>
                    <p>Entrega: {formatDate(selectedProject.due_date)}</p>
                    <p>Instalador: {selectedProject.team_members?.name ?? '—'}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  )
}
