import { useMemo, useState } from 'react'
import { Plus, Search, ChevronRight, Layers, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, Drawer, IconButton, PageHeader, TableSkeleton, brl, chartTip, cn, inputCls, mono, td, th, tr, useLoading } from '../components/ui'
import { materials, priceHistory } from '../data'

const cats = ['Todas', 'Perfis', 'Vidros', 'Ferragens', 'Insumos']

export default function Materiais() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todas')
  const [sup, setSup] = useState('Todos')
  const [sel, setSel] = useState<(typeof materials)[number] | null>(null)
  const loading = useLoading([])
  const suppliers = ['Todos', ...new Set(materials.map((m) => m.supplier))]
  const rows = useMemo(
    () => materials.filter((m) => (cat === 'Todas' || m.cat === cat) && (sup === 'Todos' || m.supplier === sup) && (m.name + m.code).toLowerCase().includes(q.toLowerCase())),
    [q, cat, sup],
  )

  return (
    <>
      <PageHeader title="Banco de Materiais" subtitle={`${materials.length} itens cadastrados · atualização de custos em tempo real`}>
        <Button variant="primary"><Plus size={16} /> Novo Material</Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Buscar material" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código ou nome" className={cn(inputCls, 'pl-9')} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
                className={cn('h-10 px-3.5 rounded-md text-sm font-medium border transition cursor-pointer', cat === c ? 'bg-primary-soft border-primary text-primary' : 'border-border hover:bg-muted text-muted-foreground')}>{c}</button>
            ))}
          </div>
          <select aria-label="Fornecedor" value={sup} onChange={(e) => setSup(e.target.value)} className={cn(inputCls, 'w-52')}>
            {suppliers.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr>{['Código', 'Nome', 'Categoria', 'Un.', 'Custo Unit.', 'Fornecedor', 'Estoque', 'Atualização', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <TableSkeleton cols={9} rows={7} /> : rows.map((m) => (
                <tr key={m.code} onClick={() => setSel(m)} className={cn(tr, 'cursor-pointer')}>
                  <td className={`${td} ${mono} text-muted-foreground`}>{m.code}</td>
                  <td className={`${td} font-medium`}>{m.name}</td>
                  <td className={td}><Badge tone="neutral">{m.cat}</Badge></td>
                  <td className={`${td} ${mono}`}>{m.unit}</td>
                  <td className={`${td} ${mono}`}>{brl(m.cost, 2)}</td>
                  <td className={`${td} text-muted-foreground`}>{m.supplier}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2 w-32" title={`${m.stock}%`}>
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={m.stock} aria-label="Nível de estoque">
                        <div className={cn('h-full rounded-full', m.stock < 20 ? 'bg-danger' : m.stock < 40 ? 'bg-[#F59E0B]' : 'bg-[#10B981]')} style={{ width: `${m.stock}%` }} />
                      </div>
                      <span className={`${mono} text-xs text-muted-foreground w-8`}>{m.stock}%</span>
                    </div>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{m.upd}</td>
                  <td className={td}><IconButton label="Ver detalhes"><ChevronRight size={16} /></IconButton></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground text-sm">Nenhum material encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.code ?? ''}>
        {sel && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold">{sel.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{sel.supplier} · <span className={mono}>{brl(sel.cost, 2)}</span> / {sel.unit}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Layers size={14} /> Hierarquia</h4>
              <ul className="text-sm space-y-1.5 border-l-2 border-border pl-4">
                <li className="text-muted-foreground">Materiais</li>
                <li className="pl-4 text-muted-foreground">└ {sel.cat}</li>
                <li className="pl-8 font-medium text-primary">└ {sel.name}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Produtos relacionados</h4>
              <div className="flex flex-wrap gap-2">
                {['Janela de Correr 2 Fls', 'Porta Balcão 4 Fls', 'Maxim-ar'].map((p) => <Badge key={p} tone="info">{p}</Badge>)}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><TrendingUp size={14} /> Histórico de preço (6 meses)</h4>
              <div className="h-48">
                <ResponsiveContainer>
                  <AreaChart data={priceHistory.map((p) => ({ m: p.m, v: +(p.v * sel.cost).toFixed(2) }))} margin={{ left: -8, right: 8 }}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={48} />
                    <Tooltip {...chartTip} formatter={(v) => [brl(Number(v), 2), 'Custo']} />
                    <Area type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
