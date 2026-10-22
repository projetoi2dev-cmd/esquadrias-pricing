import { useState } from 'react'
import { FileDown, FileSpreadsheet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, PageHeader, Segmented, brl, cn, inputCls, mono, statusTone, td, th, tr } from '../components/ui'
import { topProducts } from '../data'

type Tab = 'd' | 'm' | 'r'

function Stat({ label, value, delta, up = true }: { label: string; value: string; delta?: string; up?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`${mono} text-2xl font-bold mt-2`}>{value}</p>
      {delta && <p className={cn('text-xs font-semibold mt-2 inline-flex items-center gap-0.5', up ? 'text-success' : 'text-danger')}>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{delta}</p>}
    </Card>
  )
}

const projs: Record<string, { mat: number; lab: number; fix: number; tax: number; price: number; plan: number }> = {
  'Res. Vila Verde – Bl. B': { mat: 38200, lab: 14600, fix: 6400, tax: 7800, price: 91800, plan: 24800 },
  'Clínica Vita Saúde': { mat: 27900, lab: 9400, fix: 4100, tax: 5700, price: 67300, plan: 19100 },
  'Padaria Doce Vida': { mat: 10400, lab: 4300, fix: 1900, tax: 2000, price: 23400, plan: 5600 },
}

export default function Relatorios() {
  const [tab, setTab] = useState<Tab>('d')
  const [p, setP] = useState(Object.keys(projs)[0])
  const d = projs[p]
  const cost = d.mat + d.lab + d.fix + d.tax
  const profit = d.price - cost
  const rows = [
    ['Materiais', d.mat, '#2563EB'], ['Mão de obra', d.lab, '#8b5cf6'], ['Custos fixos', d.fix, '#F59E0B'], ['Impostos', d.tax, '#06b6d4'],
  ] as const
  const variance = profit - d.plan

  return (
    <>
      <PageHeader title="Relatórios Gerenciais" subtitle="Indicadores operacionais e financeiros consolidados">
        <Button><FileDown size={16} /> Exportar PDF</Button>
        <Button><FileSpreadsheet size={16} /> Exportar Excel</Button>
      </PageHeader>
      <div className="mb-6">
        <Segmented value={tab} onChange={setTab} options={[{ id: 'd', label: 'Diário' }, { id: 'm', label: 'Mensal' }, { id: 'r', label: 'Rentabilidade por Projeto' }]} />
      </div>

      {tab === 'd' && (
        <div className="space-y-4">
          <Field label="Data" className="w-48"><input type="date" defaultValue="2026-10-01" className={inputCls} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Receita do dia" value={brl(18650)} delta="+22% vs ontem" />
            <Stat label="Novos clientes" value="3" delta="+1 vs ontem" />
            <Stat label="Orçamentos emitidos" value="7" delta="−2 vs ontem" up={false} />
          </div>
          <Card className="overflow-x-auto">
            <CardHeader title="Agenda do dia" />
            <table className="w-full">
              <thead><tr>{['Hora', 'Cliente', 'Atividade', 'Responsável', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {[['08:30', 'Clínica Vita Saúde', 'Instalação – fachada', 'Rafael Dias', 'Confirmado'], ['10:00', 'Ana B. Moreira', 'Visita técnica / medição', 'Lucas Prado', 'Confirmado'], ['14:00', 'Hotel Palmeiras Park', 'Apresentação de proposta', 'Camila Ferraz', 'Pendente'], ['16:30', 'Casa Figueiredo', 'Pós-venda / vistoria', 'Carla Rezende', 'Agendado']].map((r) => (
                  <tr key={r[0]} className={tr}>
                    <td className={`${td} ${mono}`}>{r[0]}</td><td className={`${td} font-medium`}>{r[1]}</td><td className={td}>{r[2]}</td><td className={td}>{r[3]}</td>
                    <td className={td}><Badge tone={statusTone[r[4]]}>{r[4]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'm' && (
        <div className="space-y-4">
          <Field label="Mês" className="w-48"><input type="month" defaultValue="2026-09" className={inputCls} /></Field>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Faturamento" value={brl(331400)} delta="+9,7% vs ago/26" />
            <Stat label="Lucro líquido" value={brl(83200)} delta="+14,2%" />
            <Stat label="Taxa de conversão" value="42%" delta="−3 p.p." up={false} />
            <Stat label="Ticket médio" value={brl(29800)} delta="+5,1%" />
          </div>
          <Card className="overflow-x-auto">
            <CardHeader title="Comparativo com mês anterior e top produtos" />
            <table className="w-full">
              <thead><tr>{['Produto', 'Unidades', 'Mês anterior', 'Variação'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {topProducts.map((t, i) => {
                  const prev = Math.round(t.q * [0.9, 1.08, 0.95, 1.2, 0.88][i])
                  const v = ((t.q - prev) / prev) * 100
                  return (
                    <tr key={t.n} className={tr}>
                      <td className={`${td} font-medium`}>{t.n}</td><td className={`${td} ${mono}`}>{t.q}</td><td className={`${td} ${mono} text-muted-foreground`}>{prev}</td>
                      <td className={`${td} ${mono} font-semibold ${v >= 0 ? 'text-success' : 'text-danger'}`}>{v >= 0 ? '+' : ''}{v.toFixed(1).replace('.', ',')}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'r' && (
        <div className="space-y-4">
          <Field label="Projeto" className="w-72">
            <select value={p} onChange={(e) => setP(e.target.value)} className={inputCls}>{Object.keys(projs).map((k) => <option key={k}>{k}</option>)}</select>
          </Field>
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader title="Composição de custos" subtitle={`Preço de venda ${brl(d.price)}`} />
              <div className="px-6 pb-6 space-y-4">
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {rows.map(([n, v, c]) => <div key={n} title={n} style={{ width: `${(v / d.price) * 100}%`, background: c }} />)}
                  <div style={{ width: `${(profit / d.price) * 100}%` }} className="bg-[#10B981]" title="Lucro" />
                </div>
                <table className="w-full">
                  <tbody>
                    {rows.map(([n, v, c]) => (
                      <tr key={n} className="border-t border-border">
                        <td className="py-2.5 text-sm flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{n}</td>
                        <td className={`${mono} text-sm text-right`}>{brl(v)}</td>
                        <td className={`${mono} text-xs text-muted-foreground text-right w-16`}>{((v / d.price) * 100).toFixed(1).replace('.', ',')}%</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-3 text-sm flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#10B981]" />Lucro final</td>
                      <td className={`${mono} text-sm text-right text-success`}>{brl(profit)}</td>
                      <td className={`${mono} text-xs text-right w-16`}>{((profit / d.price) * 100).toFixed(1).replace('.', ',')}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <CardHeader title="Análise de variação" subtitle="Orçado vs. realizado" />
              <div className="px-6 pb-6 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lucro orçado</span><span className={mono}>{brl(d.plan)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lucro realizado</span><span className={mono}>{brl(profit)}</span></div>
                <div className={cn('rounded-md p-4 flex justify-between items-center', variance >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                  <span className="text-sm font-medium">Variação</span>
                  <span className={`${mono} font-bold text-lg`}>{variance >= 0 ? '+' : '−'}{brl(Math.abs(variance))}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {variance >= 0 ? 'Projeto superou a meta: ganho de eficiência em mão de obra.' : 'Desvio causado principalmente por retrabalho e aumento no custo do vidro.'}
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
