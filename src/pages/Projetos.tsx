import { useState } from 'react'
import { GripVertical, Calendar, List, Columns3, Plus } from 'lucide-react'
import { Avatar, Badge, Button, Card, PageHeader, Segmented, brl, cn, mono, td, th, tr } from '../components/ui'
import { columns, projects as seed, type Col } from '../data'

const dot: Record<Col, string> = {
  Orçado: '#94a3b8', Aprovado: '#2563EB', 'Em Produção': '#F59E0B', Agendado: '#8b5cf6', 'Em Instalação': '#06b6d4', Concluído: '#10B981', Cancelado: '#EF4444',
}

export default function Projetos() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [items, setItems] = useState(seed)
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<Col | null>(null)

  const drop = (c: Col) => {
    if (drag !== null) setItems(items.map((p) => (p.id === drag ? { ...p, col: c } : p)))
    setDrag(null)
    setOver(null)
  }

  return (
    <>
      <PageHeader title="Gestão de Projetos" subtitle="Arraste os cartões entre as colunas para atualizar o andamento">
        <Segmented value={view} onChange={setView} options={[{ id: 'list', label: <><List size={14} /> Lista</> }, { id: 'kanban', label: <><Columns3 size={14} /> Kanban</> }]} />
        <Button variant="primary"><Plus size={16} /> Novo Projeto</Button>
      </PageHeader>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
          {columns.map((c) => {
            const list = items.filter((p) => p.col === c)
            return (
              <div
                key={c}
                onDragOver={(e) => { e.preventDefault(); setOver(c) }}
                onDragLeave={() => setOver(null)}
                onDrop={() => drop(c)}
                className={cn('w-72 shrink-0 rounded-lg bg-muted/60 border p-2.5 transition', over === c ? 'border-primary bg-primary-soft' : 'border-transparent')}
              >
                <div className="flex items-center justify-between px-1.5 py-1.5 mb-2">
                  <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: dot[c] }} />{c}</span>
                  <span className="text-xs text-muted-foreground font-mono">{list.length} · {brl(list.reduce((s, p) => s + p.value, 0))}</span>
                </div>
                <div className="space-y-2.5 min-h-24">
                  {list.map((p) => (
                    <article
                      key={p.id}
                      draggable
                      onDragStart={() => setDrag(p.id)}
                      onDragEnd={() => { setDrag(null); setOver(null) }}
                      className={cn('bg-card border border-border rounded-lg p-3.5 shadow-card cursor-grab active:cursor-grabbing hover:border-primary/60 hover:shadow-md transition', drag === p.id && 'opacity-40 rotate-1')}
                    >
                      <div className="flex items-start gap-1">
                        <GripVertical size={14} className="text-muted-foreground mt-0.5 -ml-1 shrink-0" aria-hidden />
                        <p className="text-sm font-semibold leading-snug">{p.client}</p>
                      </div>
                      <p className={`${mono} text-lg font-semibold mt-2`}>{brl(p.value)}</p>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={p.progress} aria-label="Progresso">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {p.date}</span>
                        <span className="flex items-center gap-1.5">{p.who !== '—' && <Avatar name={p.who} size={20} />}{p.who}</span>
                      </div>
                    </article>
                  ))}
                  {list.length === 0 && <div className="border border-dashed border-border rounded-lg py-8 text-center text-xs text-muted-foreground">Solte um projeto aqui</div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr>{['Cliente', 'Valor', 'Etapa', 'Previsão', 'Progresso', 'Instalador'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className={tr}>
                  <td className={`${td} font-medium`}>{p.client}</td>
                  <td className={`${td} ${mono}`}>{brl(p.value)}</td>
                  <td className={td}><Badge tone={p.col === 'Concluído' ? 'success' : p.col === 'Cancelado' ? 'danger' : 'info'}>{p.col}</Badge></td>
                  <td className={`${td} text-muted-foreground`}>{p.date}</td>
                  <td className={td}><div className="h-1.5 w-28 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} /></div></td>
                  <td className={td}>{p.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}
