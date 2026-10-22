import { Phone, Plus, HardHat, Banknote } from 'lucide-react'
import { Avatar, Badge, Button, Card, PageHeader, brl, mono } from '../components/ui'
import { team } from '../data'

export default function Equipe() {
  return (
    <>
      <PageHeader title="Equipe de Instalação" subtitle={`${team.filter((t) => t.active).length} instaladores ativos`}>
        <Button variant="primary"><Plus size={16} /> Novo Instalador</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((t, i) => (
          <Card key={t.name} className="overflow-hidden hover:shadow-md hover:border-primary/40 transition">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={t.name} size={56} tone={i} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{t.name}</h3>
                    <Badge tone={t.active ? 'success' : 'neutral'}>{t.active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                  <p className={`${mono} text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5`}><Phone size={12} /> {t.phone}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {t.tags.map((s) => <span key={s} className="text-xs rounded-md bg-muted px-2 py-1 text-muted-foreground font-medium">{s}</span>)}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Comissão <span className={`${mono} font-semibold text-foreground ml-1`}>{String(t.rate).replace('.', ',')}%</span></p>
            </div>
            <div className="grid grid-cols-2 border-t border-border bg-muted/40 divide-x divide-border">
              <div className="px-5 py-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><HardHat size={12} /> Instalações / mês</p>
                <p className={`${mono} text-lg font-semibold mt-0.5`}>{t.done}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Banknote size={12} /> Receita gerada</p>
                <p className={`${mono} text-lg font-semibold mt-0.5`}>{brl(t.rev)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
