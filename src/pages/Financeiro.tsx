import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, CheckCircle2, CircleDollarSign, Landmark, Pencil, Plus, Receipt, Trash2, TrendingUp,
} from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge, Button, Card, CardHeader, Drawer, Field, IconButton, PageHeader, Segmented, TableSkeleton,
  brl, chartTip, cn, inputCls, mono, statusTone, td, th, tr,
} from '../components/ui'
import { Kpi } from '../components/Kpi'
import { EmptyState, QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { usePermissions } from '../lib/permissions'
import { supabase } from '../lib/supabaseClient'
import { buildCashSeries, isSettledTransaction, withBalance } from '../lib/finance'
import { formatDate, parseDate, todayInput, toDateInput } from '../lib/format'
import { TRANSACTION_STATUS_LABELS, labelOf } from '../lib/constants'
import type {
  Client, Supplier, TransactionStatus, TransactionType, TransactionWithRelations,
} from '../lib/database.types'

const k = (value: number) => `${(value / 1000).toFixed(0)}k`
const isSettled = (status: TransactionStatus) => status === 'recebido' || status === 'pago'

interface TransactionFormValues {
  type: TransactionType
  description: string
  category: string
  clientId: string
  supplierId: string
  amount: string
  dueDate: string
  status: TransactionStatus
  paidAt: string
}

function TransactionForm({ workspaceId, transaction, clients, suppliers, defaultType, onClose }: {
  workspaceId: string
  transaction: TransactionWithRelations | null
  clients: Client[]
  suppliers: Supplier[]
  defaultType: TransactionType
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [values, setValues] = useState<TransactionFormValues>({
    type: transaction?.type ?? defaultType,
    description: transaction?.description ?? '',
    category: transaction?.category ?? '',
    clientId: transaction?.client_id ?? '',
    supplierId: transaction?.supplier_id ?? '',
    amount: transaction ? String(transaction.amount) : '',
    dueDate: toDateInput(transaction?.due_date) || todayInput(),
    status: transaction?.status ?? 'pendente',
    paidAt: toDateInput(transaction?.paid_at),
  })

  const changeType = (type: TransactionType) => {
    setValues((current) => ({
      ...current,
      type,
      status: type === 'receivable' ? 'pendente' : 'pendente',
      clientId: type === 'receivable' ? current.clientId : '',
      supplierId: type === 'payable' ? current.supplierId : '',
    }))
  }

  const changeStatus = (status: TransactionStatus) => {
    setValues((current) => ({
      ...current,
      status,
      paidAt: isSettled(status) ? (current.paidAt || todayInput()) : '',
    }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!values.description.trim()) throw new Error('Informe a descrição.')
      const amount = Number(values.amount.replace(',', '.'))
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor válido.')

      const payload = {
        workspace_id: workspaceId,
        type: values.type,
        description: values.description.trim(),
        category: values.category.trim() || null,
        client_id: values.type === 'receivable' ? values.clientId || null : null,
        supplier_id: values.type === 'payable' ? values.supplierId || null : null,
        amount,
        due_date: values.dueDate,
        paid_at: isSettled(values.status) ? (values.paidAt || values.dueDate) : null,
        status: values.status,
      }

      if (transaction) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', transaction.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-transactions', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-transactions', workspaceId] })
      toast.show(transaction ? 'Lançamento atualizado.' : 'Lançamento criado.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const statusOptions: TransactionStatus[] = values.type === 'receivable'
    ? ['pendente', 'recebido', 'atrasado']
    : ['pendente', 'pago', 'atrasado']

  return (
    <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mutation.mutate() }}>
      <Field label="Tipo">
        <select value={values.type} onChange={(event) => changeType(event.target.value as TransactionType)} className={inputCls}>
          <option value="receivable">Conta a receber</option>
          <option value="payable">Conta a pagar</option>
        </select>
      </Field>
      <Field label="Descrição">
        <input required value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <input value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} placeholder={values.type === 'receivable' ? 'Recebimentos' : 'Fornecedores'} className={inputCls} />
        </Field>
        <Field label="Valor">
          <input required type="number" min="0.01" step="0.01" value={values.amount} onChange={(event) => setValues({ ...values, amount: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
        {values.type === 'receivable' ? (
          <Field label="Cliente">
            <select value={values.clientId} onChange={(event) => setValues({ ...values, clientId: event.target.value })} className={inputCls}>
              <option value="">Sem cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Fornecedor">
            <select value={values.supplierId} onChange={(event) => setValues({ ...values, supplierId: event.target.value })} className={inputCls}>
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Vencimento">
          <input required type="date" value={values.dueDate} onChange={(event) => setValues({ ...values, dueDate: event.target.value })} className={inputCls} />
        </Field>
        <Field label="Status">
          <select value={values.status} onChange={(event) => changeStatus(event.target.value as TransactionStatus)} className={inputCls}>
            {statusOptions.map((status) => <option key={status} value={status}>{TRANSACTION_STATUS_LABELS[status]}</option>)}
          </select>
        </Field>
        <Field label="Data de baixa">
          <input type="date" disabled={!isSettled(values.status)} value={values.paidAt} onChange={(event) => setValues({ ...values, paidAt: event.target.value })} className={cn(inputCls, !isSettled(values.status) && 'opacity-60')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar lançamento'}
        </Button>
      </div>
    </form>
  )
}

export default function Financeiro() {
  const { workspace, workspaceId } = useWorkspace()
  const { canWrite } = usePermissions()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [gran, setGran] = useState<'d' | 'w' | 'm'>('w')
  const [range, setRange] = useState('90')
  const [receivableFilter, setReceivableFilter] = useState<'open' | 'all'>('open')
  const [payableFilter, setPayableFilter] = useState<'open' | 'all'>('open')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null)
  const [formType, setFormType] = useState<TransactionType>('receivable')

  const transactionsQuery = useQuery({
    queryKey: ['transactions', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, clients(name), suppliers(name)')
        .eq('workspace_id', workspaceId!)
        .order('due_date', { ascending: false })
        .returns<TransactionWithRelations[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const clientsQuery = useQuery({
    queryKey: ['clients', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('workspace_id', workspaceId!).order('name').returns<Client[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').eq('workspace_id', workspaceId!).order('name').returns<Supplier[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const settleMutation = useMutation({
    mutationFn: async (transaction: TransactionWithRelations) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: transaction.type === 'receivable' ? 'recebido' : 'pago', paid_at: todayInput() })
        .eq('id', transaction.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-transactions', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-transactions', workspaceId] })
      toast.show('Baixa registrada.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-transactions', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-transactions', workspaceId] })
      toast.show('Lançamento removido.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const transactions = transactionsQuery.data ?? []
  const clients = clientsQuery.data ?? []
  const suppliers = suppliersQuery.data ?? []
  const today = new Date()
  const todayIso = todayInput()
  const opening = Number(workspace?.opening_balance ?? 0)

  const openReceivables = transactions.filter((transaction) => transaction.type === 'receivable' && transaction.status !== 'recebido')
  const totalReceivable = openReceivables.reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const overdueReceivable = openReceivables
    .filter((transaction) => transaction.status === 'atrasado' || transaction.due_date < todayIso)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  const balance = transactions.reduce((sum, transaction) => {
    if (transaction.type === 'receivable' && transaction.status === 'recebido') return sum + Number(transaction.amount)
    if (transaction.type === 'payable' && transaction.status === 'pago') return sum - Number(transaction.amount)
    return sum
  }, opening)

  const projection = [30, 60, 90].map((days) => {
    const limit = new Date(today)
    limit.setDate(limit.getDate() + days)
    const limitIso = toDateInput(limit)
    return openReceivables
      .filter((transaction) => transaction.due_date >= todayIso && transaction.due_date <= limitIso)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  })

  const monthExpenses = transactions
    .filter((transaction) => {
      const due = parseDate(transaction.due_date)
      return transaction.type === 'payable' && due !== null
        && due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth()
    })
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  const points = gran === 'd' ? Number(range) : gran === 'w' ? Math.ceil(Number(range) / 7) : 6
  const series = buildCashSeries(transactions, gran, points)
  const seriesStart = new Date(today)
  if (gran === 'd') seriesStart.setDate(today.getDate() - (points - 1))
  else if (gran === 'w') {
    seriesStart.setDate(today.getDate() - (points - 1) * 7)
    const day = seriesStart.getDay()
    seriesStart.setDate(seriesStart.getDate() + (day === 0 ? -6 : 1 - day))
  } else seriesStart.setMonth(today.getMonth() - (points - 1), 1)
  const startKey = toDateInput(seriesStart)
  const priorNet = transactions.reduce((sum, transaction) => {
    if (!isSettledTransaction(transaction)) return sum
    const date = parseDate(transaction.paid_at)
    if (!date || toDateInput(date) >= startKey) return sum
    return sum + (transaction.type === 'receivable' ? Number(transaction.amount) : -Number(transaction.amount))
  }, opening)
  const chartData = withBalance(series, priorNet)
  const names: Record<string, string> = { in: 'Entradas', out: 'Saídas', bal: 'Saldo acumulado' }

  const receivableRows = useMemo(() => transactions
    .filter((transaction) => transaction.type === 'receivable')
    .filter((transaction) => receivableFilter === 'all' || transaction.status !== 'recebido')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 30), [transactions, receivableFilter])

  const payableRows = useMemo(() => transactions
    .filter((transaction) => transaction.type === 'payable')
    .filter((transaction) => payableFilter === 'all' || transaction.status !== 'pago')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 30), [transactions, payableFilter])

  const openForm = (type: TransactionType, transaction: TransactionWithRelations | null = null) => {
    if (!canWrite) return
    setFormType(type)
    setEditing(transaction)
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditing(null) }

  if (transactionsQuery.error) {
    return <QueryError message={(transactionsQuery.error as Error).message} onRetry={() => void transactionsQuery.refetch()} />
  }

  const actionButtons = (transaction: TransactionWithRelations) => canWrite && (
    <>
      {!isSettled(transaction.status) && (
        <IconButton label={transaction.type === 'receivable' ? 'Registrar recebimento' : 'Registrar pagamento'} onClick={() => settleMutation.mutate(transaction)}>
          <CheckCircle2 size={16} />
        </IconButton>
      )}
      <IconButton label="Editar lançamento" onClick={() => openForm(transaction.type, transaction)}><Pencil size={16} /></IconButton>
      <IconButton label="Remover lançamento" onClick={() => {
        if (window.confirm('Remover este lançamento?')) deleteMutation.mutate(transaction.id)
      }}><Trash2 size={16} /></IconButton>
    </>
  )

  return (
    <>
      <PageHeader title="Fluxo de Caixa" subtitle="Entradas, saídas e projeção de saldo">
        <div className="relative">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select aria-label="Período" value={range} onChange={(event) => setRange(event.target.value)} className={`${inputCls} pl-9 w-40`}>
            <option value="30">30 dias</option>
            <option value="60">60 dias</option>
            <option value="90">90 dias</option>
          </select>
        </div>
        {canWrite && <Button variant="primary" onClick={() => openForm('receivable')}><Plus size={16} /> Novo Lançamento</Button>}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={TrendingUp} title="Receita Projetada" value={brl(projection[0])} note={`60d: ${brl(projection[1])} · 90d: ${brl(projection[2])}`} />
        <Kpi icon={Receipt} title="Contas a Receber" value={brl(totalReceivable)} note={overdueReceivable > 0 ? `${brl(overdueReceivable)} em atraso` : 'sem atrasos'} up={overdueReceivable === 0} />
        <Kpi icon={Landmark} title="Saldo em Caixa" value={brl(balance)} note="realizado até hoje" up={balance >= 0} />
        <Kpi icon={CircleDollarSign} title="Despesas do Mês" value={brl(monthExpenses)} note="contas a pagar no mês" up={false} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Entradas, Saídas e Saldo Acumulado"
          subtitle="Barras: movimentação no período · Linha: saldo (eixo direito)"
          action={<Segmented value={gran} onChange={setGran} options={[{ id: 'd', label: 'Diário' }, { id: 'w', label: 'Semanal' }, { id: 'm', label: 'Mensal' }]} />}
        />
        <div className="h-80 px-4 pb-4">
          <ResponsiveContainer>
            <ComposedChart data={chartData} stackOffset="sign" margin={{ left: 0, right: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="p" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis yAxisId="l" tickFormatter={k} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis yAxisId="r" orientation="right" tickFormatter={k} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip {...chartTip} formatter={(value, name) => [brl(Number(value)), names[String(name)]]} />
              <Legend formatter={(value) => names[value]} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="l" y={0} stroke="var(--border)" />
              <Bar yAxisId="l" dataKey="in" stackId="a" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="l" dataKey="out" stackId="a" fill="#EF4444" radius={[0, 0, 3, 3]} />
              <Line yAxisId="r" type="monotone" dataKey="bal" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 mt-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="Contas a Receber"
            subtitle={`${openReceivables.length} em aberto`}
            action={
              <div className="flex items-center gap-2">
                <select aria-label="Filtro de recebimentos" value={receivableFilter} onChange={(event) => setReceivableFilter(event.target.value as 'open' | 'all')} className={cn(inputCls, 'h-8 w-28 text-xs')}>
                  <option value="open">Em aberto</option>
                  <option value="all">Todos</option>
                </select>
                {canWrite && <Button size="sm" onClick={() => openForm('receivable')}><Plus size={14} /> Novo</Button>}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead><tr>{['Vencimento', 'Cliente', 'Descrição', 'Valor', 'Status', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
              <tbody>
                {transactionsQuery.isLoading ? <TableSkeleton cols={6} /> : receivableRows.map((transaction) => (
                  <tr key={transaction.id} className={tr}>
                    <td className={`${td} ${mono}`}>{formatDate(transaction.due_date)}</td>
                    <td className={`${td} font-medium`}>{transaction.clients?.name ?? '—'}</td>
                    <td className={`${td} text-muted-foreground max-w-40 truncate`}>{transaction.description}</td>
                    <td className={`${td} ${mono} text-success`}>{brl(Number(transaction.amount))}</td>
                    <td className={td}><Badge tone={statusTone[labelOf(TRANSACTION_STATUS_LABELS, transaction.status)]}>{labelOf(TRANSACTION_STATUS_LABELS, transaction.status)}</Badge></td>
                    <td className={td}>{actionButtons(transaction)}</td>
                  </tr>
                ))}
                {!transactionsQuery.isLoading && receivableRows.length === 0 && <tr><td colSpan={6}><EmptyState title="Nenhuma conta a receber" description="Cadastre um novo lançamento." /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Contas a Pagar"
            subtitle={`${transactions.filter((transaction) => transaction.type === 'payable' && transaction.status !== 'pago').length} em aberto`}
            action={
              <div className="flex items-center gap-2">
                <select aria-label="Filtro de pagamentos" value={payableFilter} onChange={(event) => setPayableFilter(event.target.value as 'open' | 'all')} className={cn(inputCls, 'h-8 w-28 text-xs')}>
                  <option value="open">Em aberto</option>
                  <option value="all">Todos</option>
                </select>
                {canWrite && <Button size="sm" onClick={() => openForm('payable')}><Plus size={14} /> Novo</Button>}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead><tr>{['Vencimento', 'Fornecedor', 'Categoria', 'Valor', 'Status', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
              <tbody>
                {transactionsQuery.isLoading ? <TableSkeleton cols={6} /> : payableRows.map((transaction) => (
                  <tr key={transaction.id} className={tr}>
                    <td className={`${td} ${mono}`}>{formatDate(transaction.due_date)}</td>
                    <td className={`${td} font-medium`}>{transaction.suppliers?.name ?? '—'}</td>
                    <td className={`${td} text-muted-foreground`}>{transaction.category ?? '—'}</td>
                    <td className={`${td} ${mono}`}>{brl(Number(transaction.amount))}</td>
                    <td className={td}><Badge tone={statusTone[labelOf(TRANSACTION_STATUS_LABELS, transaction.status)]}>{labelOf(TRANSACTION_STATUS_LABELS, transaction.status)}</Badge></td>
                    <td className={td}>{actionButtons(transaction)}</td>
                  </tr>
                ))}
                {!transactionsQuery.isLoading && payableRows.length === 0 && <tr><td colSpan={6}><EmptyState title="Nenhuma conta a pagar" description="Cadastre um novo lançamento." /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Drawer open={formOpen} onClose={closeForm} title={editing ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <TransactionForm key={editing?.id ?? `new-${formType}`} workspaceId={workspaceId!} transaction={editing} clients={clients} suppliers={suppliers} defaultType={formType} onClose={closeForm} />
      </Drawer>
    </>
  )
}
