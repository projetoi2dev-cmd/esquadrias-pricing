import { useState } from 'react'
import { Plus, Mail, Phone, ShieldCheck, ShieldAlert, Eye, Pencil } from 'lucide-react'
import { Avatar, Badge, Button, Card, Drawer, IconButton, PageHeader, TableSkeleton, brl, cn, mono, statusTone, td, th, tr, useLoading } from '../components/ui'
import { clients, timeline } from '../data'

export default function Clientes() {
  const [sel, setSel] = useState<(typeof clients)[number] | null>(null)
  const loading = useLoading()
  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.length} clientes · ${brl(clients.reduce((s, c) => s + c.total, 0))} em projetos`}>
        <Button variant="primary"><Plus size={16} /> Novo Cliente</Button>
      </PageHeader>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead><tr>{['Nome', 'Contato', 'Projetos', 'Valor Total', 'Último Contato', 'Status', 'Ações'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <TableSkeleton cols={7} rows={7} /> : clients.map((c) => (
              <tr key={c.id} className={cn(tr, 'cursor-pointer')} onClick={() => setSel(c)}>
                <td className={td}><span className="flex items-center gap-3"><Avatar name={c.name} /> <span className="font-medium">{c.name}</span></span></td>
                <td className={td}><p>{c.contact}</p><p className="text-xs text-muted-foreground">{c.email}</p></td>
                <td className={`${td} ${mono}`}>{c.projects}</td>
                <td className={`${td} ${mono}`}>{brl(c.total)}</td>
                <td className={`${td} text-muted-foreground`}>{c.last}</td>
                <td className={td}><Badge tone={statusTone[c.status]}>{c.status}</Badge></td>
                <td className={td} onClick={(e) => e.stopPropagation()}>
                  <IconButton label="Ver cliente" onClick={() => setSel(c)}><Eye size={16} /></IconButton>
                  <IconButton label="Editar"><Pencil size={16} /></IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title="Detalhes do Cliente">
        {sel && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={sel.name} size={56} />
              <div>
                <h3 className="font-bold text-lg leading-tight">{sel.name}</h3>
                <p className="text-sm text-muted-foreground">Cliente desde {sel.since}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Mail size={14} className="text-muted-foreground" />{sel.email}</p>
              <p className={`flex items-center gap-2 ${mono}`}><Phone size={14} className="text-muted-foreground" />{sel.phone}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted p-3"><p className="text-xs text-muted-foreground">Total investido</p><p className={`${mono} font-semibold text-lg`}>{brl(sel.total)}</p></div>
              <div className="rounded-md bg-muted p-3"><p className="text-xs text-muted-foreground">Projetos</p><p className={`${mono} font-semibold text-lg`}>{sel.projects}</p></div>
            </div>
            <div className={cn('rounded-md p-3 flex items-start gap-3 text-sm', sel.lgpd ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
              {sel.lgpd ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              <div>
                <p className="font-semibold">LGPD: {sel.lgpd ? 'Consentimento registrado' : 'Consentimento pendente'}</p>
                <p className="text-xs opacity-90">{sel.lgpd ? 'Termo aceito digitalmente em 12/03/2026.' : 'Enviar termo de tratamento de dados.'}</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Histórico de projetos</h4>
              <ol className="border-l-2 border-border ml-1.5 space-y-4">
                {timeline.map((t) => (
                  <li key={t.t} className="pl-5 relative">
                    <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                    <p className="text-xs text-muted-foreground font-mono">{t.d}</p>
                    <p className="text-sm font-medium">{t.t}</p>
                    <p className="text-xs text-muted-foreground">{t.s}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notas</h4>
              <textarea defaultValue="Prefere contato por WhatsApp no período da manhã. Costuma fechar pedidos com entrada de 40%." rows={3} className="w-full rounded-md border border-border bg-card p-3 text-sm" />
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
