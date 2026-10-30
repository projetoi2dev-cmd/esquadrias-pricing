import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, MapPin, Package, Plus, Save, Search, Send, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, CardHeader, Field, IconButton, PageHeader, Skeleton, brl, cn, inputCls, mono, statusTone,
} from '../components/ui'
import { EmptyState, QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { usePermissions } from '../lib/permissions'
import { supabase } from '../lib/supabaseClient'
import { calculatePricing, installmentValue } from '../lib/pricing'
import { formatDate, parseDate, toDateInput, todayInput } from '../lib/format'
import { INSTALLATION_TYPE_LABELS, QUOTE_STATUS_LABELS, labelOf } from '../lib/constants'
import type { Client, Product, QuoteStatus, QuoteWithClient } from '../lib/database.types'

const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0
const percentage = (value: number) => Math.min(99.99, nonNegative(value))

interface DraftItem {
  key: string
  productId: string | null
  description: string
  width: number
  height: number
  quantity: number
  materialUnitCost: number
  laborUnitCost: number
}

interface Draft {
  id: string | null
  code: string
  clientId: string
  status: QuoteStatus
  issueDate: string
  validUntil: string
  deliveryDays: number
  installationType: string
  address: string
  fixed: number
  margin: number
  tax: number
  retention: number
  cashDiscount: number
  interest: number
  notes: string
  items: DraftItem[]
}

export default function Orcamentos() {
  const { workspace, workspaceId } = useWorkspace()
  const { canWrite } = usePermissions()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const initialized = useRef(false)
  const [q, setQ] = useState('')
  const [picker, setPicker] = useState(false)
  const [parcels, setParcels] = useState(6)
  const [loadingQuote, setLoadingQuote] = useState(false)

  const quotesQuery = useQuery({
    queryKey: ['quotes', workspaceId],
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
    queryKey: ['clients', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('name')
        .returns<Client[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const productsQuery = useQuery({
    queryKey: ['products', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('active', true)
        .order('name')
        .returns<Product[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const quotes = quotesQuery.data ?? []
  const clients = clientsQuery.data ?? []
  const products = productsQuery.data ?? []

  const nextCode = useMemo(() => {
    const max = quotes.reduce((current, quote) => {
      const numeric = Number(quote.code.replace(/\D/g, ''))
      return Number.isFinite(numeric) ? Math.max(current, numeric) : current
    }, 1000)
    return `ORC-${max + 1}`
  }, [quotes])

  const createNewDraft = (): Draft => {
    const today = todayInput()
    const validity = new Date()
    validity.setDate(validity.getDate() + 30)
    return {
      id: null,
      code: nextCode,
      clientId: clients[0]?.id ?? '',
      status: 'rascunho',
      issueDate: today,
      validUntil: toDateInput(validity),
      deliveryDays: 30,
      installationType: 'obra',
      address: '',
      fixed: Number(workspace?.default_fixed_cost ?? 12),
      margin: Number(workspace?.default_margin ?? 25),
      tax: Number(workspace?.default_tax ?? 8.5),
      retention: Number(workspace?.default_retention ?? 5),
      cashDiscount: 5,
      interest: Number(workspace?.default_interest_rate ?? 1.99),
      notes: '',
      items: [],
    }
  }

  const openQuote = async (quote: QuoteWithClient) => {
    setLoadingQuote(true)
    const { data, error } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('created_at')
    if (error) {
      toast.show(error.message, 'error')
      if (!draft) setDraft(createNewDraft())
      setLoadingQuote(false)
      return
    }
    setSelectedId(quote.id)
    setDraft({
      id: quote.id,
      code: quote.code,
      clientId: quote.client_id,
      status: quote.status,
      issueDate: quote.issue_date,
      validUntil: quote.valid_until ?? '',
      deliveryDays: quote.delivery_days,
      installationType: quote.installation_type,
      address: quote.address ?? '',
      fixed: Number(quote.fixed_cost_pct),
      margin: Number(quote.margin_pct),
      tax: Number(quote.tax_pct),
      retention: Number(quote.retention_pct),
      cashDiscount: Number(quote.cash_discount_pct),
      interest: Number(quote.interest_rate_monthly),
      notes: quote.notes,
      items: (data ?? []).map((item) => ({
        key: item.id,
        productId: item.product_id,
        description: item.description,
        width: Number(item.width_m),
        height: Number(item.height_m),
        quantity: item.quantity,
        materialUnitCost: Number(item.material_unit_cost),
        laborUnitCost: Number(item.labor_unit_cost),
      })),
    })
    setLoadingQuote(false)
  }

  useEffect(() => {
    if (initialized.current) return
    if (!draft && quotesQuery.data && clientsQuery.data && productsQuery.data && workspace) {
      initialized.current = true
      if (quotesQuery.data.length > 0) {
        void openQuote(quotesQuery.data[0])
      } else {
        setDraft(createNewDraft())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesQuery.data, clientsQuery.data, productsQuery.data, workspace])

  const startNew = () => {
    setSelectedId(null)
    setDraft(createNewDraft())
    setPicker(false)
    toast.show('Novo orçamento iniciado.')
  }

  const patch = (changes: Partial<Draft>) => setDraft((current) => current ? { ...current, ...changes } : current)

  const updateItem = (key: string, changes: Partial<DraftItem>) => {
    setDraft((current) => current ? {
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, ...changes } : item),
    } : current)
  }

  const addProduct = (product: Product) => {
    setDraft((current) => current ? {
      ...current,
      items: [...current.items, {
        key: crypto.randomUUID(),
        productId: product.id,
        description: product.name,
        width: Number(product.width_m),
        height: Number(product.height_m),
        quantity: 1,
        materialUnitCost: Number(product.material_cost),
        laborUnitCost: Number(product.labor_cost),
      }],
    } : current)
    setPicker(false)
  }

  const addManualItem = () => {
    setDraft((current) => current ? {
      ...current,
      items: [...current.items, {
        key: crypto.randomUUID(),
        productId: null,
        description: 'Item personalizado',
        width: 1,
        height: 1,
        quantity: 1,
        materialUnitCost: 0,
        laborUnitCost: 0,
      }],
    } : current)
    setPicker(false)
  }

  const removeItem = (key: string) => {
    setDraft((current) => current ? { ...current, items: current.items.filter((item) => item.key !== key) } : current)
  }

  const preview = draft ? calculatePricing(
    draft.items.map((item) => ({ quantity: item.quantity, materialUnitCost: item.materialUnitCost, laborUnitCost: item.laborUnitCost })),
    { fixed: draft.fixed, margin: draft.margin, tax: draft.tax, cashDiscount: draft.cashDiscount },
  ) : null

  const saveMutation = useMutation({
    mutationFn: async ({ nextStatus, createProject = false }: { nextStatus?: QuoteStatus; createProject?: boolean }) => {
      if (!draft) throw new Error('Nenhum orçamento em edição.')
      if (!draft.clientId) throw new Error('Selecione um cliente.')
      if (!draft.code.trim()) throw new Error('Informe o código do orçamento.')
      const issueDate = parseDate(draft.issueDate)
      if (!issueDate) throw new Error('Informe a data de emissão.')
      const validUntil = draft.validUntil ? parseDate(draft.validUntil) : null
      if (draft.validUntil && !validUntil) throw new Error('Informe uma validade válida.')
      if (validUntil && validUntil < issueDate) throw new Error('A validade não pode ser anterior à emissão.')
      const deliveryDays = Math.max(1, Math.round(draft.deliveryDays) || 30)
      if (draft.items.length === 0) throw new Error('Adicione pelo menos um produto.')
      if (!preview) throw new Error('Não foi possível calcular o orçamento.')

      const quotePayload = {
        id: draft.id,
        workspace_id: workspaceId!,
        client_id: draft.clientId,
        code: draft.code.trim(),
        status: nextStatus ?? draft.status,
        issue_date: draft.issueDate,
        valid_until: draft.validUntil || null,
        delivery_days: deliveryDays,
        installation_type: draft.installationType,
        address: draft.address.trim() || null,
        fixed_cost_pct: percentage(draft.fixed),
        margin_pct: percentage(draft.margin),
        tax_pct: percentage(draft.tax),
        retention_pct: percentage(draft.retention),
        cash_discount_pct: percentage(draft.cashDiscount),
        interest_rate_monthly: nonNegative(draft.interest),
        notes: draft.notes.trim(),
      }

      const itemsPayload = draft.items.map((item) => ({
        product_id: item.productId,
        description: item.description.trim() || 'Item',
        width_m: nonNegative(item.width),
        height_m: nonNegative(item.height),
        quantity: Math.max(1, Math.round(item.quantity) || 1),
        material_unit_cost: nonNegative(item.materialUnitCost),
        labor_unit_cost: nonNegative(item.laborUnitCost),
      }))

      const { data: savedQuoteId, error: saveError } = await supabase.rpc('save_quote', {
        p_quote: quotePayload,
        p_items: itemsPayload,
      })
      if (saveError) throw saveError
      if (typeof savedQuoteId !== 'string') throw new Error('Não foi possível salvar o orçamento.')
      const quoteId = savedQuoteId

      let projectCreated = false
      let projectError: string | null = null
      if (createProject) {
        const { data: existing, error: existingError } = await supabase
          .from('projects')
          .select('id')
          .eq('quote_id', quoteId)
          .maybeSingle()
        if (existingError) {
          projectError = existingError.message
        } else if (!existing) {
          const dueDate = new Date(issueDate)
          dueDate.setDate(dueDate.getDate() + deliveryDays)
          const client = clients.find((entry) => entry.id === draft.clientId)
          const { error: insertError } = await supabase.from('projects').insert({
            workspace_id: workspaceId!,
            client_id: draft.clientId,
            quote_id: quoteId,
            title: client?.name ?? `Projeto ${draft.code}`,
            status: 'aprovado',
            value: preview.total,
            progress: 0,
            due_date: toDateInput(dueDate),
            installer_id: null,
            material_cost: preview.material,
            labor_cost: preview.labor,
            fixed_cost: preview.fixed,
            tax_cost: preview.tax,
            planned_profit: preview.margin,
          })
          if (insertError) projectError = insertError.message
          else projectCreated = true
        }
      }

      return { quoteId, status: nextStatus ?? draft.status, projectCreated, projectError }
    },
    onSuccess: async ({ quoteId, status, projectCreated, projectError }) => {
      setSelectedId(quoteId)
      setDraft((current) => current ? { ...current, id: quoteId, status } : current)
      await queryClient.invalidateQueries({ queryKey: ['quotes', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-quotes', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-sold-items', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-projects', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-transactions', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['report-quotes', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['report-items', workspaceId] })
      if (status === 'aprovado') {
        await queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
        await queryClient.invalidateQueries({ queryKey: ['client-activities', workspaceId] })
        await queryClient.invalidateQueries({ queryKey: ['clients', workspaceId] })
        await queryClient.invalidateQueries({ queryKey: ['report-projects', workspaceId] })
      }
      if (projectError) {
        toast.show(`Orçamento salvo, mas o projeto não foi criado: ${projectError}`, 'error')
      } else if (status === 'aprovado') {
        toast.show(projectCreated ? 'Orçamento aprovado e projeto criado.' : 'Orçamento aprovado.')
      } else {
        toast.show(status === 'enviado' ? 'Orçamento salvo e marcado como enviado.' : 'Orçamento salvo.')
      }
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const filteredQuotes = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return quotes
    return quotes.filter((quote) => `${quote.code} ${quote.clients?.name ?? ''}`.toLowerCase().includes(term))
  }, [quotes, q])

  if (quotesQuery.error || clientsQuery.error || productsQuery.error) {
    const error = quotesQuery.error || clientsQuery.error || productsQuery.error
    return <QueryError message={(error as Error).message} onRetry={() => { void quotesQuery.refetch(); void clientsQuery.refetch(); void productsQuery.refetch() }} />
  }

  const pct = (label: string, value: number, key: 'fixed' | 'margin' | 'tax', amount: number) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative w-20">
          <input
            aria-label={label}
            type="number"
            step="0.5"
            value={value}
            disabled={!canWrite}
            onChange={(event) => patch({ [key]: Number(event.target.value) } as Partial<Draft>)}
            className={cn(inputCls, 'h-8 pr-6 text-right', mono)}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
        <span className={`${mono} text-sm w-28 text-right`}>{brl(amount, 2)}</span>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader title="Orçamentos" subtitle={draft ? `${draft.code} · ${draft.id ? (canWrite ? 'editando orçamento' : 'visualizando orçamento') : 'novo orçamento'}` : 'Carregando...'}>
        {canWrite && <Button variant="primary" onClick={startNew}><Plus size={16} /> Novo Orçamento</Button>}
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit xl:sticky xl:top-0 overflow-hidden">
          <CardHeader title="Histórico" subtitle={`${quotes.length} orçamentos`} />
          <div className="px-4 pb-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input aria-label="Buscar orçamento" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por código ou cliente" className={cn(inputCls, 'h-9 pl-9 text-xs')} />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto border-t border-border">
            {quotesQuery.isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div>
            ) : filteredQuotes.length === 0 ? (
              <div className="p-4"><EmptyState title="Nenhum orçamento" description="Crie o primeiro orçamento." /></div>
            ) : filteredQuotes.map((quote) => (
              <button
                key={quote.id}
                onClick={() => void openQuote(quote)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted transition cursor-pointer',
                  selectedId === quote.id && 'bg-primary-soft',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`${mono} text-xs font-semibold`}>{quote.code}</span>
                  <Badge tone={statusTone[labelOf(QUOTE_STATUS_LABELS, quote.status)]}>{labelOf(QUOTE_STATUS_LABELS, quote.status)}</Badge>
                </div>
                <p className="text-sm font-medium truncate mt-1">{quote.clients?.name ?? 'Sem cliente'}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatDate(quote.issue_date)}</span>
                  <span className={mono}>{brl(Number(quote.total))}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4 min-w-0">
          {!draft ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">Carregando orçamento...</Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Cliente e Obra" subtitle={draft.id ? 'Alterações são salvas no orçamento existente' : 'Novo orçamento'} />
                <div className="px-6 pb-6 grid gap-4 md:grid-cols-2">
                  <Field label="Cliente">
                    <select value={draft.clientId} disabled={!canWrite} onChange={(event) => patch({ clientId: event.target.value })} className={inputCls}>
                      <option value="">Selecione</option>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Código">
                    <input value={draft.code} disabled={!canWrite} onChange={(event) => patch({ code: event.target.value })} className={cn(inputCls, mono)} />
                  </Field>
                  <Field label="Endereço da obra" className="md:col-span-2">
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={draft.address} disabled={!canWrite} onChange={(event) => patch({ address: event.target.value })} className={cn(inputCls, 'pl-9')} />
                    </div>
                  </Field>
                  <Field label="Tipo de instalação">
                    <select value={draft.installationType} disabled={!canWrite} onChange={(event) => patch({ installationType: event.target.value })} className={inputCls}>
                      {Object.entries(INSTALLATION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={draft.status} disabled={!canWrite} onChange={(event) => patch({ status: event.target.value as QuoteStatus })} className={inputCls}>
                      {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Emissão">
                    <input type="date" value={draft.issueDate} disabled={!canWrite} onChange={(event) => patch({ issueDate: event.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Validade">
                    <input type="date" value={draft.validUntil} disabled={!canWrite} onChange={(event) => patch({ validUntil: event.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Prazo (dias)">
                    <input type="number" min="1" value={draft.deliveryDays} disabled={!canWrite} onChange={(event) => patch({ deliveryDays: Number(event.target.value) })} className={cn(inputCls, mono)} />
                  </Field>
                  <Field label="Retenção de garantia (%)">
                    <input type="number" min="0" max="20" step="0.5" value={draft.retention} disabled={!canWrite} onChange={(event) => patch({ retention: Number(event.target.value) })} className={cn(inputCls, mono)} />
                  </Field>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Produtos"
                  subtitle={`${draft.items.length} itens no orçamento`}
                  action={canWrite ? <Button size="sm" variant="primary" onClick={() => setPicker(!picker)}><Plus size={14} /> Adicionar Produtos</Button> : undefined}
                />
                {picker && canWrite && (
                  <div className="mx-6 mb-4 rounded-md border border-border bg-muted/50 p-1 slide-in">
                    {products.map((product) => (
                      <button key={product.id} onClick={() => addProduct(product)} className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-card text-sm text-left cursor-pointer">
                        <span>{product.name}</span>
                        <span className={`${mono} text-xs text-muted-foreground`}>{product.width_m}×{product.height_m} m · {brl(Number(product.material_cost) + Number(product.labor_cost))}</span>
                      </button>
                    ))}
                    <button onClick={addManualItem} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-card text-sm text-left text-primary cursor-pointer">
                      <Plus size={14} /> Item personalizado
                    </button>
                  </div>
                )}
                <div className="px-6 pb-6 space-y-3">
                  {draft.items.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-md">
                      <Package className="mx-auto mb-2" /> Nenhum produto adicionado
                    </div>
                  )}
                  {draft.items.map((item) => (
                    <div key={item.key} className="rounded-md border border-border p-4 hover:border-primary/50 transition">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          aria-label="Descrição do item"
                          value={item.description}
                          disabled={!canWrite}
                          onChange={(event) => updateItem(item.key, { description: event.target.value })}
                          className={cn(inputCls, 'h-8 border-transparent bg-transparent px-1 font-medium text-sm hover:border-border focus:border-border')}
                        />
                        {canWrite && <IconButton label={`Remover ${item.description}`} onClick={() => removeItem(item.key)}><Trash2 size={16} /></IconButton>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Field label="Largura (m)"><input type="number" step="0.1" value={item.width} disabled={!canWrite} onChange={(event) => updateItem(item.key, { width: Number(event.target.value) })} className={cn(inputCls, 'h-9', mono)} /></Field>
                        <Field label="Altura (m)"><input type="number" step="0.1" value={item.height} disabled={!canWrite} onChange={(event) => updateItem(item.key, { height: Number(event.target.value) })} className={cn(inputCls, 'h-9', mono)} /></Field>
                        <Field label="Qtd."><input type="number" min={1} value={item.quantity} disabled={!canWrite} onChange={(event) => updateItem(item.key, { quantity: Math.max(1, Number(event.target.value)) })} className={cn(inputCls, 'h-9', mono)} /></Field>
                        <Field label="Material (un)"><input type="number" min="0" step="0.01" value={item.materialUnitCost} disabled={!canWrite} onChange={(event) => updateItem(item.key, { materialUnitCost: Number(event.target.value) })} className={cn(inputCls, 'h-9', mono)} /></Field>
                        <Field label="Mão de obra (un)"><input type="number" min="0" step="0.01" value={item.laborUnitCost} disabled={!canWrite} onChange={(event) => updateItem(item.key, { laborUnitCost: Number(event.target.value) })} className={cn(inputCls, 'h-9', mono)} /></Field>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Área {(item.width * item.height * item.quantity).toFixed(2).replace('.', ',')} m² · Linha <span className={mono}>{brl((item.materialUnitCost + item.laborUnitCost) * item.quantity, 2)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {preview && (
                <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
                  <Card>
                    <CardHeader title="Resumo de Preço" />
                    <div className="px-6 pb-5 divide-y divide-border">
                      <div className="flex justify-between py-2 text-sm"><span className="text-muted-foreground">Subtotal Materiais</span><span className={mono}>{brl(preview.material, 2)}</span></div>
                      <div className="flex justify-between py-2 text-sm"><span className="text-muted-foreground">Subtotal Mão de Obra</span><span className={mono}>{brl(preview.labor, 2)}</span></div>
                      {pct('Custos Fixos', draft.fixed, 'fixed', preview.fixed)}
                      {pct('Margem de Lucro', draft.margin, 'margin', preview.margin)}
                      {pct('Impostos', draft.tax, 'tax', preview.tax)}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="Condições de Pagamento" />
                    <div className="px-6 pb-6 space-y-4">
                      <div className="flex justify-between items-center rounded-md bg-success-soft text-success px-4 py-3">
                        <span className="text-sm font-medium">À vista ({draft.cashDiscount}% desc.)</span>
                        <span className={`${mono} font-bold`}>{brl(preview.cash, 2)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Parcelamento">
                        {[2, 3, 6, 12].map((count) => (
                          <button key={count} role="radio" aria-checked={parcels === count} onClick={() => setParcels(count)}
                            className={cn('rounded-md border p-2.5 text-center transition cursor-pointer', parcels === count ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted')}>
                            <span className="block text-sm font-semibold">{count}x</span>
                            <span className={`block ${mono} text-[11px] text-muted-foreground mt-0.5`}>{brl(installmentValue(preview.total, count, draft.interest))}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Juros de {String(draft.interest).replace('.', ',')}% a.m. · Total parcelado <span className={mono}>{brl(installmentValue(preview.total, parcels, draft.interest) * parcels)}</span></p>
                      <div>
                        <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Retenção de garantia</span><span className={`${mono} font-medium`}>{draft.retention}% · {brl(preview.total * draft.retention / 100)}</span></div>
                        <input aria-label="Retenção" type="range" min={0} max={10} step={0.5} value={draft.retention} disabled={!canWrite} onChange={(event) => patch({ retention: Number(event.target.value) })} className="w-full accent-[var(--primary)]" />
                        <div className="flex justify-between text-[11px] text-muted-foreground"><span>0%</span><span>10%</span></div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 flex flex-col justify-between bg-primary text-primary-foreground border-transparent">
                    <div>
                      <p className="text-sm opacity-80">Preço Final</p>
                      <p className="font-mono tabular-nums font-bold text-4xl mt-2 tracking-tight">{brl(preview.total, 2)}</p>
                      <p className="text-xs opacity-80 mt-2">Margem líquida estimada: <span className="font-mono">{brl(preview.margin, 2)}</span></p>
                      <Badge tone="info">{labelOf(QUOTE_STATUS_LABELS, draft.status)}</Badge>
                    </div>
                    {canWrite ? (
                      <div className="mt-6 space-y-2">
                        <Button className="w-full bg-white text-blue-700 hover:bg-blue-50" disabled={saveMutation.isPending || loadingQuote} onClick={() => saveMutation.mutate({ nextStatus: 'enviado' })}>
                          <Send size={16} /> Enviar ao Cliente
                        </Button>
                        <Button className="w-full bg-white/15 text-white hover:bg-white/25" disabled={saveMutation.isPending || loadingQuote} onClick={() => saveMutation.mutate({ nextStatus: 'aprovado', createProject: true })}>
                          <CheckCircle2 size={16} /> Aprovar e criar projeto
                        </Button>
                        <Button className="w-full bg-white/15 text-white hover:bg-white/25" disabled={saveMutation.isPending || loadingQuote} onClick={() => saveMutation.mutate({})}>
                          <Save size={16} /> Salvar
                        </Button>
                        {saveMutation.isPending && <p role="status" className="text-xs text-center opacity-80">Salvando...</p>}
                      </div>
                    ) : (
                      <p className="mt-6 rounded-md bg-white/10 px-3 py-2 text-xs text-white/90">
                        Somente leitura: seu perfil não pode salvar ou aprovar orçamentos.
                      </p>
                    )}
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader title="Observações" />
                <div className="px-6 pb-6">
                  <textarea rows={3} value={draft.notes} disabled={!canWrite} onChange={(event) => patch({ notes: event.target.value })} placeholder="Condições, escopo e observações do orçamento..." className={cn(inputCls, 'h-auto py-2.5')} />
                </div>
              </Card>

              {loadingQuote && <p className="text-xs text-muted-foreground flex items-center gap-2"><ClipboardList size={14} /> Carregando itens do orçamento...</p>}
            </>
          )}
        </div>
      </div>
    </>
  )
}
