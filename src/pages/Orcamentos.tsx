import { useState } from 'react'
import { Plus, Trash2, Send, Save, MapPin, Package } from 'lucide-react'
import { Button, Card, CardHeader, Field, IconButton, PageHeader, brl, cn, inputCls, mono } from '../components/ui'
import { clients, products } from '../data'

type Item = { id: number; name: string; w: number; h: number; qty: number; mat: number; lab: number }
let uid = 10

export default function Orcamentos() {
  const [client, setClient] = useState(clients[0].id)
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: products[0].name, w: 1.5, h: 1.2, qty: 24, mat: 486, lab: 140 },
    { id: 2, name: products[1].name, w: 1.0, h: 2.4, qty: 4, mat: 2180, lab: 420 },
  ])
  const [picker, setPicker] = useState(false)
  const [fixed, setFixed] = useState(12)
  const [tax, setTax] = useState(8.5)
  const [margin, setMargin] = useState(25)
  const [retention, setRetention] = useState(5)
  const [parcels, setParcels] = useState(6)
  const [saved, setSaved] = useState('')

  const mat = items.reduce((s, i) => s + i.mat * i.qty, 0)
  const lab = items.reduce((s, i) => s + i.lab * i.qty, 0)
  const fixedV = (mat + lab) * fixed / 100
  const marginV = (mat + lab + fixedV) * margin / 100
  const taxV = (mat + lab + fixedV + marginV) * tax / 100
  const total = mat + lab + fixedV + marginV + taxV
  const cash = total * 0.95
  const rate = 0.0199
  const pmt = (n: number) => (total * rate) / (1 - Math.pow(1 + rate, -n))

  const upd = (id: number, patch: Partial<Item>) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const add = (p: (typeof products)[number]) => {
    setItems([...items, { id: ++uid, name: p.name, w: p.w, h: p.h, qty: 1, mat: p.mat, lab: p.lab }])
    setPicker(false)
  }

  const pct = (label: string, v: number, set: (n: number) => void, val: number) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative w-20">
          <input aria-label={label} type="number" step="0.5" value={v} onChange={(e) => set(+e.target.value)} className={cn(inputCls, 'h-8 pr-6 text-right', mono)} />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
        <span className={`${mono} text-sm w-28 text-right`}>{brl(val, 2)}</span>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader title="Orçamentos" subtitle="Calculadora de precificação · Orçamento #1048 (rascunho)">
        <Button variant="primary" onClick={() => setItems([])}><Plus size={16} /> Novo Orçamento</Button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="Cliente e Obra" />
          <div className="px-6 pb-6 space-y-4">
            <Field label="Cliente">
              <select value={client} onChange={(e) => setClient(+e.target.value)} className={inputCls}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Endereço da obra">
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input defaultValue="Av. Paulista, 1374 – Bela Vista, São Paulo/SP" className={cn(inputCls, 'pl-9')} />
              </div>
            </Field>
            <Field label="Tipo de instalação">
              <select className={inputCls} defaultValue="obra">
                <option value="obra">Obra nova</option>
                <option value="troca">Troca / Reforma</option>
                <option value="fachada">Fachada (balancim)</option>
                <option value="retirar">Somente fornecimento</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Validade"><input type="date" defaultValue="2026-10-15" className={inputCls} /></Field>
              <Field label="Prazo (dias)"><input type="number" defaultValue={30} className={cn(inputCls, mono)} /></Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Produtos"
            subtitle={`${items.length} itens no orçamento`}
            action={<Button size="sm" variant="primary" onClick={() => setPicker(!picker)}><Plus size={14} /> Adicionar Produtos</Button>}
          />
          {picker && (
            <div className="mx-6 mb-4 rounded-md border border-border bg-muted/50 p-1 slide-in">
              {products.map((p) => (
                <button key={p.name} onClick={() => add(p)} className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-card text-sm text-left cursor-pointer">
                  <span>{p.name}</span>
                  <span className={`${mono} text-xs text-muted-foreground`}>{p.w}×{p.h} m · {brl(p.mat + p.lab)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="px-6 pb-6 space-y-3">
            {items.length === 0 && (
              <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-md">
                <Package className="mx-auto mb-2" /> Nenhum produto adicionado
              </div>
            )}
            {items.map((i) => (
              <div key={i.id} className="rounded-md border border-border p-4 hover:border-primary/50 transition">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{i.name}</p>
                  <IconButton label={`Remover ${i.name}`} onClick={() => setItems(items.filter((x) => x.id !== i.id))}><Trash2 size={16} /></IconButton>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Field label="Largura (m)"><input type="number" step="0.1" value={i.w} onChange={(e) => upd(i.id, { w: +e.target.value })} className={cn(inputCls, 'h-9', mono)} /></Field>
                  <Field label="Altura (m)"><input type="number" step="0.1" value={i.h} onChange={(e) => upd(i.id, { h: +e.target.value })} className={cn(inputCls, 'h-9', mono)} /></Field>
                  <Field label="Qtd."><input type="number" min={1} value={i.qty} onChange={(e) => upd(i.id, { qty: Math.max(1, +e.target.value) })} className={cn(inputCls, 'h-9', mono)} /></Field>
                  <Field label="Material (un)"><input type="number" value={i.mat} onChange={(e) => upd(i.id, { mat: +e.target.value })} className={cn(inputCls, 'h-9', mono)} /></Field>
                  <Field label="Mão de obra (un)"><input type="number" value={i.lab} onChange={(e) => upd(i.id, { lab: +e.target.value })} className={cn(inputCls, 'h-9', mono)} /></Field>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Área {(i.w * i.h * i.qty).toFixed(2).replace('.', ',')} m² · Linha <span className={mono}>{brl((i.mat + i.lab) * i.qty, 2)}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 mt-4 xl:grid-cols-[1fr_1fr_360px]">
        <Card>
          <CardHeader title="Resumo de Preço" />
          <div className="px-6 pb-5 divide-y divide-border">
            <div className="flex justify-between py-2 text-sm"><span className="text-muted-foreground">Subtotal Materiais</span><span className={mono}>{brl(mat, 2)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-muted-foreground">Subtotal Mão de Obra</span><span className={mono}>{brl(lab, 2)}</span></div>
            {pct('Custos Fixos', fixed, setFixed, fixedV)}
            {pct('Margem de Lucro', margin, setMargin, marginV)}
            {pct('Impostos', tax, setTax, taxV)}
          </div>
        </Card>

        <Card>
          <CardHeader title="Condições de Pagamento" />
          <div className="px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center rounded-md bg-success-soft text-success px-4 py-3">
              <span className="text-sm font-medium">À vista (5% desc.)</span>
              <span className={`${mono} font-bold`}>{brl(cash, 2)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Parcelamento">
              {[2, 3, 6, 12].map((n) => (
                <button key={n} role="radio" aria-checked={parcels === n} onClick={() => setParcels(n)}
                  className={cn('rounded-md border p-2.5 text-center transition cursor-pointer', parcels === n ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted')}>
                  <span className="block text-sm font-semibold">{n}x</span>
                  <span className={`block ${mono} text-[11px] text-muted-foreground mt-0.5`}>{brl(pmt(n))}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Juros de 1,99% a.m. · Total parcelado <span className={mono}>{brl(pmt(parcels) * parcels)}</span></p>
            <div>
              <div className="flex justify-between text-sm mb-2"><label htmlFor="ret" className="text-muted-foreground">Retenção de garantia</label><span className={`${mono} font-medium`}>{retention}% · {brl(total * retention / 100)}</span></div>
              <input id="ret" type="range" min={5} max={10} step={0.5} value={retention} onChange={(e) => setRetention(+e.target.value)} className="w-full accent-[var(--primary)]" />
              <div className="flex justify-between text-[11px] text-muted-foreground"><span>5%</span><span>10%</span></div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between bg-primary text-primary-foreground border-transparent">
          <div>
            <p className="text-sm opacity-80">Preço Final</p>
            <p className="font-mono tabular-nums font-bold text-4xl mt-2 tracking-tight">{brl(total, 2)}</p>
            <p className="text-xs opacity-80 mt-2">Margem líquida estimada: <span className="font-mono">{brl(marginV, 2)}</span></p>
          </div>
          <div className="mt-6 space-y-2">
            <Button className="w-full bg-white text-blue-700 hover:bg-blue-50" onClick={() => setSaved('Enviado ao cliente')}><Send size={16} /> Enviar ao Cliente</Button>
            <Button className="w-full bg-white/15 text-white hover:bg-white/25" onClick={() => setSaved('Rascunho salvo')}><Save size={16} /> Salvar Rascunho</Button>
            <p role="status" className="text-xs text-center h-4">{saved && `✓ ${saved}`}</p>
          </div>
        </Card>
      </div>
    </>
  )
}
