import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Layers, Pencil, Plus, Search, Trash2, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge, Button, Card, Drawer, Field, IconButton, PageHeader, TableSkeleton, brl, chartTip, cn,
  inputCls, mono, td, th, tr,
} from '../components/ui'
import { EmptyState, QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { usePermissions } from '../lib/permissions'
import { supabase } from '../lib/supabaseClient'
import { formatDate, formatMonth } from '../lib/format'
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, MATERIAL_UNIT_LABELS } from '../lib/constants'
import type {
  Material, MaterialCategory, MaterialPriceHistory, MaterialUnit, MaterialWithSupplier, Supplier,
} from '../lib/database.types'

interface MaterialFormValues {
  code: string
  name: string
  category: MaterialCategory
  unit: MaterialUnit
  cost: string
  supplier_id: string
  stock_quantity: string
  stock_capacity: string
}

function MaterialForm({ workspaceId, material, suppliers, onClose }: {
  workspaceId: string
  material: MaterialWithSupplier | null
  suppliers: Supplier[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [values, setValues] = useState<MaterialFormValues>({
    code: material?.code ?? '',
    name: material?.name ?? '',
    category: material?.category ?? 'perfis',
    unit: material?.unit ?? 'm',
    cost: material ? String(material.cost) : '',
    supplier_id: material?.supplier_id ?? '',
    stock_quantity: material ? String(material.stock_quantity) : '0',
    stock_capacity: material ? String(material.stock_capacity) : '100',
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const cost = Number(values.cost.replace(',', '.'))
      if (!values.code.trim() || !values.name.trim()) throw new Error('Informe código e nome do material.')
      if (!Number.isFinite(cost) || cost < 0) throw new Error('Informe um custo válido.')

      const payload = {
        workspace_id: workspaceId,
        code: values.code.trim(),
        name: values.name.trim(),
        category: values.category,
        unit: values.unit,
        cost,
        supplier_id: values.supplier_id || null,
        stock_quantity: Math.max(0, Number(values.stock_quantity.replace(',', '.')) || 0),
        stock_capacity: Math.max(0.01, Number(values.stock_capacity.replace(',', '.')) || 100),
      }

      if (material) {
        const { error } = await supabase.from('materials').update(payload).eq('id', material.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('materials').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials', workspaceId] })
      if (material) void queryClient.invalidateQueries({ queryKey: ['material-history', material.id] })
      toast.show(material ? 'Material atualizado.' : 'Material cadastrado.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código">
          <input required value={values.code} onChange={(event) => setValues({ ...values, code: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
        <Field label="Unidade">
          <select value={values.unit} onChange={(event) => setValues({ ...values, unit: event.target.value as MaterialUnit })} className={inputCls}>
            {Object.entries(MATERIAL_UNIT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nome">
        <input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <select value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value as MaterialCategory })} className={inputCls}>
            {MATERIAL_CATEGORIES.map((value) => <option key={value} value={value}>{MATERIAL_CATEGORY_LABELS[value]}</option>)}
          </select>
        </Field>
        <Field label="Custo unitário">
          <input required type="number" min="0" step="0.01" value={values.cost} onChange={(event) => setValues({ ...values, cost: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
      </div>
      <Field label="Fornecedor">
        <select value={values.supplier_id} onChange={(event) => setValues({ ...values, supplier_id: event.target.value })} className={inputCls}>
          <option value="">Sem fornecedor</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estoque atual">
          <input type="number" min="0" step="0.01" value={values.stock_quantity} onChange={(event) => setValues({ ...values, stock_quantity: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
        <Field label="Capacidade">
          <input type="number" min="0.01" step="0.01" value={values.stock_capacity} onChange={(event) => setValues({ ...values, stock_capacity: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar material'}
        </Button>
      </div>
    </form>
  )
}

export default function Materiais() {
  const { workspaceId } = useWorkspace()
  const { canWrite } = usePermissions()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<MaterialCategory | 'todas'>('todas')
  const [supplierId, setSupplierId] = useState('todos')
  const [selected, setSelected] = useState<MaterialWithSupplier | null>(null)
  const [editing, setEditing] = useState<MaterialWithSupplier | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const materialsQuery = useQuery({
    queryKey: ['materials', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*, suppliers(name)')
        .eq('workspace_id', workspaceId!)
        .order('code')
        .returns<MaterialWithSupplier[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('name')
        .returns<Supplier[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const historyQuery = useQuery({
    queryKey: ['material-history', selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_price_history')
        .select('*')
        .eq('material_id', selected!.id)
        .order('reference_month')
        .returns<MaterialPriceHistory[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const materials = materialsQuery.data ?? []
  const suppliers = suppliersQuery.data ?? []
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return materials.filter((material) =>
      (cat === 'todas' || material.category === cat)
      && (supplierId === 'todos' || material.supplier_id === supplierId)
      && `${material.name} ${material.code}`.toLowerCase().includes(term),
    )
  }, [materials, q, cat, supplierId])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materials', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
      setSelected(null)
      toast.show('Material removido.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const openNew = () => { if (!canWrite) return; setEditing(null); setFormOpen(true) }
  const openEdit = (material: MaterialWithSupplier) => { if (!canWrite) return; setSelected(null); setEditing(material); setFormOpen(true) }
  const closeForm = () => { setFormOpen(false); setEditing(null) }

  if (materialsQuery.error) {
    return <QueryError message={(materialsQuery.error as Error).message} onRetry={() => void materialsQuery.refetch()} />
  }

  const formSuppliers = suppliers

  return (
    <>
      <PageHeader title="Banco de Materiais" subtitle={`${materials.length} itens cadastrados · histórico de custos e estoque`}>
        {canWrite && <Button variant="primary" onClick={openNew}><Plus size={16} /> Novo Material</Button>}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Buscar material" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por código ou nome" className={cn(inputCls, 'pl-9')} />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setCat('todas')} aria-pressed={cat === 'todas'}
              className={cn('h-10 px-3.5 rounded-md text-sm font-medium border transition cursor-pointer', cat === 'todas' ? 'bg-primary-soft border-primary text-primary' : 'border-border hover:bg-muted text-muted-foreground')}>
              Todas
            </button>
            {MATERIAL_CATEGORIES.map((value) => (
              <button key={value} onClick={() => setCat(value)} aria-pressed={cat === value}
                className={cn('h-10 px-3.5 rounded-md text-sm font-medium border transition cursor-pointer', cat === value ? 'bg-primary-soft border-primary text-primary' : 'border-border hover:bg-muted text-muted-foreground')}>
                {MATERIAL_CATEGORY_LABELS[value]}
              </button>
            ))}
          </div>
          <select aria-label="Fornecedor" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={cn(inputCls, 'w-52')}>
            <option value="todos">Todos os fornecedores</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr>{['Código', 'Nome', 'Categoria', 'Un.', 'Custo Unit.', 'Fornecedor', 'Estoque', 'Atualização', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {materialsQuery.isLoading ? <TableSkeleton cols={9} rows={7} /> : rows.map((material) => {
                const stock = material.stock_capacity > 0 ? Math.min(100, (material.stock_quantity / material.stock_capacity) * 100) : 0
                return (
                  <tr key={material.id} onClick={() => setSelected(material)} className={cn(tr, 'cursor-pointer')}>
                    <td className={`${td} ${mono} text-muted-foreground`}>{material.code}</td>
                    <td className={`${td} font-medium`}>{material.name}</td>
                    <td className={td}><Badge tone="neutral">{MATERIAL_CATEGORY_LABELS[material.category]}</Badge></td>
                    <td className={`${td} ${mono}`}>{MATERIAL_UNIT_LABELS[material.unit]}</td>
                    <td className={`${td} ${mono}`}>{brl(material.cost, 2)}</td>
                    <td className={`${td} text-muted-foreground`}>{material.suppliers?.name ?? '—'}</td>
                    <td className={td}>
                      <div className="flex items-center gap-2 w-32" title={`${stock.toFixed(0)}%`}>
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(stock)} aria-label="Nível de estoque">
                          <div className={cn('h-full rounded-full', stock < 20 ? 'bg-danger' : stock < 40 ? 'bg-[#F59E0B]' : 'bg-[#10B981]')} style={{ width: `${stock}%` }} />
                        </div>
                        <span className={`${mono} text-xs text-muted-foreground w-8`}>{stock.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{formatDate(material.updated_at)}</td>
                    <td className={td} onClick={(event) => event.stopPropagation()}>
                      {canWrite
                        ? <IconButton label="Editar material" onClick={() => openEdit(material)}><Pencil size={16} /></IconButton>
                        : <IconButton label="Ver material" onClick={() => setSelected(material)}><Eye size={16} /></IconButton>}
                    </td>
                  </tr>
                )
              })}
              {!materialsQuery.isLoading && rows.length === 0 && <tr><td colSpan={9}><EmptyState title="Nenhum material encontrado" description="Ajuste os filtros ou cadastre um novo material." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.code ?? ''}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{selected.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selected.suppliers?.name ?? 'Sem fornecedor'} · <span className={mono}>{brl(selected.cost, 2)}</span> / {MATERIAL_UNIT_LABELS[selected.unit]}</p>
              </div>
              {canWrite && (
                <div className="flex items-center gap-1">
                  <IconButton label="Editar material" onClick={() => openEdit(selected)}><Pencil size={16} /></IconButton>
                  <IconButton label="Remover material" onClick={() => {
                    if (window.confirm(`Remover ${selected.name}?`)) deleteMutation.mutate(selected.id)
                  }}><Trash2 size={16} /></IconButton>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Layers size={14} /> Hierarquia</h4>
              <ul className="text-sm space-y-1.5 border-l-2 border-border pl-4">
                <li className="text-muted-foreground">Materiais</li>
                <li className="pl-4 text-muted-foreground">└ {MATERIAL_CATEGORY_LABELS[selected.category]}</li>
                <li className="pl-8 font-medium text-primary">└ {selected.name}</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Estoque</p>
                <p className={`${mono} font-semibold`}>{selected.stock_quantity} / {selected.stock_capacity}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Custo atual</p>
                <p className={`${mono} font-semibold`}>{brl(selected.cost, 2)}</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><TrendingUp size={14} /> Histórico de preço</h4>
              {historyQuery.isLoading ? (
                <div className="h-48 skeleton rounded-md" />
              ) : (historyQuery.data ?? []).length === 0 ? (
                <EmptyState title="Sem histórico de preço" description="O histórico é criado automaticamente quando o custo muda." />
              ) : (
                <div className="h-48">
                  <ResponsiveContainer>
                    <AreaChart data={(historyQuery.data ?? []).map((row) => ({ m: formatMonth(row.reference_month), v: Number(row.cost) }))} margin={{ left: -8, right: 8 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                      <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={52} />
                      <Tooltip {...chartTip} formatter={(value) => [brl(Number(value), 2), 'Custo']} />
                      <Area type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.12} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={formOpen} onClose={closeForm} title={editing ? 'Editar Material' : 'Novo Material'}>
        <MaterialForm key={editing?.id ?? 'new'} workspaceId={workspaceId!} material={editing} suppliers={formSuppliers} onClose={closeForm} />
      </Drawer>
    </>
  )
}
