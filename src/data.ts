export const clients = [
  { id: 1, name: 'Construtora Horizonte Ltda', contact: 'Marcos Tavares', email: 'marcos@horizonte.com.br', phone: '(11) 98844-2210', projects: 14, total: 486200, last: '28/09/2026', status: 'Ativo', lgpd: true, since: '2023' },
  { id: 2, name: 'Residencial Vila Verde', contact: 'Patrícia Nogueira', email: 'patricia@vilaverde.com', phone: '(11) 97712-9034', projects: 6, total: 212900, last: '25/09/2026', status: 'Ativo', lgpd: true, since: '2024' },
  { id: 3, name: 'Ana Beatriz Moreira', contact: 'Ana Beatriz Moreira', email: 'ana.moreira@gmail.com', phone: '(19) 99120-3345', projects: 2, total: 38450, last: '22/09/2026', status: 'Ativo', lgpd: true, since: '2025' },
  { id: 4, name: 'Hotel Palmeiras Park', contact: 'Ricardo Lacerda', email: 'compras@palmeirashotel.com', phone: '(11) 3344-7781', projects: 3, total: 324800, last: '12/09/2026', status: 'Prospect', lgpd: false, since: '2026' },
  { id: 5, name: 'Clínica Vita Saúde', contact: 'Dra. Helena Siqueira', email: 'helena@clinicavita.com.br', phone: '(11) 96655-1420', projects: 1, total: 67300, last: '03/09/2026', status: 'Ativo', lgpd: true, since: '2026' },
  { id: 6, name: 'João Carlos Figueiredo', contact: 'João Carlos Figueiredo', email: 'jcfigueiredo@outlook.com', phone: '(13) 98201-7766', projects: 1, total: 12900, last: '14/07/2026', status: 'Inativo', lgpd: false, since: '2025' },
  { id: 7, name: 'Edifício Solar das Acácias', contact: 'Síndico Walter Prado', email: 'sindico@solaracacias.com', phone: '(11) 95533-8802', projects: 4, total: 148600, last: '30/08/2026', status: 'Ativo', lgpd: true, since: '2024' },
]

export const recentQuotes = [
  { client: 'Construtora Horizonte', value: 84200, status: 'Aprovado', date: '29/09' },
  { client: 'Ana Beatriz Moreira', value: 18650, status: 'Enviado', date: '28/09' },
  { client: 'Hotel Palmeiras Park', value: 212400, status: 'Em análise', date: '26/09' },
  { client: 'Clínica Vita Saúde', value: 67300, status: 'Aprovado', date: '24/09' },
  { client: 'Res. Vila Verde', value: 41980, status: 'Recusado', date: '22/09' },
]

export const installs = [
  { date: '02/10', client: 'Clínica Vita', addr: 'R. Augusta, 1200 – SP', who: 'Rafael Dias', status: 'Confirmado' },
  { date: '03/10', client: 'Ana B. Moreira', addr: 'Av. Brasil, 455 – Campinas', who: 'Lucas Prado', status: 'Confirmado' },
  { date: '05/10', client: 'Vila Verde – Bl. B', addr: 'R. das Flores, 88 – Osasco', who: 'Equipe 2', status: 'Reagendar' },
  { date: '07/10', client: 'Ed. Solar Acácias', addr: 'Al. Santos, 902 – SP', who: 'Rafael Dias', status: 'Agendado' },
]

export const margin = [
  { m: 'Mai', v: 21.4 }, { m: 'Jun', v: 22.8 }, { m: 'Jul', v: 20.9 },
  { m: 'Ago', v: 23.6 }, { m: 'Set', v: 25.1 }, { m: 'Out', v: 26.3 },
]

export const topProducts = [
  { n: 'Janela Correr 2 Fls', q: 142 }, { n: 'Porta Pivotante', q: 97 },
  { n: 'Box Vidro Temperado', q: 88 }, { n: 'Porta Balcão 4 Fls', q: 64 }, { n: 'Maxim-ar', q: 51 },
]

export const materials = [
  { code: 'PRF-0142', name: 'Perfil Alumínio Linha 25 – Branco', cat: 'Perfis', unit: 'm', cost: 38.9, supplier: 'Alcoa Brasil', stock: 82, upd: '27/09/2026' },
  { code: 'PRF-0177', name: 'Perfil Alumínio Linha Suprema – Preto Fosco', cat: 'Perfis', unit: 'm', cost: 52.4, supplier: 'Hydro Extrusion', stock: 46, upd: '25/09/2026' },
  { code: 'VID-0310', name: 'Vidro Temperado Incolor 8mm', cat: 'Vidros', unit: 'm²', cost: 214.0, supplier: 'Guardian Glass', stock: 64, upd: '29/09/2026' },
  { code: 'VID-0328', name: 'Vidro Laminado 6+6mm Fumê', cat: 'Vidros', unit: 'm²', cost: 389.5, supplier: 'Guardian Glass', stock: 18, upd: '20/09/2026' },
  { code: 'FER-0051', name: 'Roldana Dupla com Rolamento', cat: 'Ferragens', unit: 'un', cost: 7.8, supplier: 'Udinese Ferragens', stock: 91, upd: '18/09/2026' },
  { code: 'FER-0063', name: 'Fecho Concha Cromado', cat: 'Ferragens', unit: 'un', cost: 11.25, supplier: 'Udinese Ferragens', stock: 12, upd: '15/09/2026' },
  { code: 'FER-0098', name: 'Dobradiça Pivotante Inox 120kg', cat: 'Ferragens', unit: 'un', cost: 146.0, supplier: 'Arcom', stock: 35, upd: '11/09/2026' },
  { code: 'INS-0012', name: 'Silicone Neutro Estrutural 280ml', cat: 'Insumos', unit: 'un', cost: 24.9, supplier: 'Sika Brasil', stock: 73, upd: '28/09/2026' },
  { code: 'INS-0027', name: 'Vedação EPDM Preta', cat: 'Insumos', unit: 'm', cost: 2.15, supplier: 'Sika Brasil', stock: 8, upd: '02/09/2026' },
]
export const priceHistory = [
  { m: 'Abr', v: 0.91 }, { m: 'Mai', v: 0.93 }, { m: 'Jun', v: 0.95 }, { m: 'Jul', v: 0.94 }, { m: 'Ago', v: 0.98 }, { m: 'Set', v: 1 },
]

export const columns = ['Orçado', 'Aprovado', 'Em Produção', 'Agendado', 'Em Instalação', 'Concluído', 'Cancelado'] as const
export type Col = (typeof columns)[number]
export const projects: { id: number; client: string; value: number; date: string; progress: number; who: string; col: Col }[] = [
  { id: 1, client: 'Hotel Palmeiras Park', value: 212400, date: '15/11', progress: 5, who: 'Rafael Dias', col: 'Orçado' },
  { id: 2, client: 'Ana B. Moreira', value: 18650, date: '20/10', progress: 10, who: 'Lucas Prado', col: 'Orçado' },
  { id: 3, client: 'Construtora Horizonte', value: 84200, date: '30/10', progress: 20, who: 'Equipe 2', col: 'Aprovado' },
  { id: 4, client: 'Clínica Vita Saúde', value: 67300, date: '18/10', progress: 55, who: 'Rafael Dias', col: 'Em Produção' },
  { id: 5, client: 'Res. Vila Verde – Bl. C', value: 96500, date: '25/10', progress: 70, who: 'Equipe 2', col: 'Em Produção' },
  { id: 6, client: 'Ed. Solar das Acácias', value: 48200, date: '07/10', progress: 85, who: 'Rafael Dias', col: 'Agendado' },
  { id: 7, client: 'Res. Vila Verde – Bl. B', value: 91800, date: '05/10', progress: 92, who: 'Equipe 2', col: 'Em Instalação' },
  { id: 8, client: 'Padaria Doce Vida', value: 23400, date: '01/10', progress: 96, who: 'Lucas Prado', col: 'Em Instalação' },
  { id: 9, client: 'Casa Figueiredo', value: 12900, date: '12/09', progress: 100, who: 'Lucas Prado', col: 'Concluído' },
  { id: 10, client: 'Escritório Lima & Assoc.', value: 35100, date: '—', progress: 0, who: '—', col: 'Cancelado' },
]

export const team = [
  { name: 'Rafael Dias', phone: '(11) 98123-4455', tags: ['Pivotantes', 'Fachada', 'Vidro Temperado'], rate: 8, active: true, done: 18, rev: 214600 },
  { name: 'Lucas Prado', phone: '(19) 99712-0068', tags: ['Janelas', 'Box', 'Residencial'], rate: 7, active: true, done: 22, rev: 156900 },
  { name: 'Equipe 2 – Oliveira & Filhos', phone: '(11) 97741-3390', tags: ['Fachada', 'Pele de vidro', 'Obras'], rate: 9, active: true, done: 11, rev: 298300 },
  { name: 'Thiago Mendes', phone: '(11) 96610-8821', tags: ['Esquadrias PVC', 'Manutenção'], rate: 6.5, active: true, done: 15, rev: 88400 },
  { name: 'Severino Alves', phone: '(13) 98870-2143', tags: ['Portas', 'Ferragens'], rate: 6, active: false, done: 0, rev: 0 },
  { name: 'Carla Rezende', phone: '(11) 95502-7716', tags: ['Box', 'Espelhos', 'Residencial'], rate: 7.5, active: true, done: 19, rev: 102700 },
]

export const products = [
  { name: 'Janela de Correr 2 Folhas – Linha 25', w: 1.5, h: 1.2, mat: 486, lab: 140 },
  { name: 'Porta Pivotante Vidro Temperado 8mm', w: 1.0, h: 2.4, mat: 2180, lab: 420 },
  { name: 'Box Frontal Vidro Temperado', w: 1.2, h: 1.9, mat: 940, lab: 220 },
  { name: 'Porta Balcão 4 Folhas – Suprema', w: 3.0, h: 2.2, mat: 3260, lab: 640 },
  { name: 'Janela Maxim-ar', w: 0.8, h: 0.6, mat: 212, lab: 80 },
]

const rnd = (s: number) => Math.round(s)
export const cashDaily = Array.from({ length: 14 }, (_, i) => {
  const inn = [9, 14, 6, 22, 18, 3, 0, 11, 26, 15, 8, 19, 24, 12][i] * 1000
  const out = [7, 5, 9, 12, 6, 2, 0, 8, 10, 14, 5, 9, 11, 6][i] * 1000
  return { p: `${i + 1}/10`, in: inn, out: -out }
})
export const cashWeekly = Array.from({ length: 12 }, (_, i) => {
  const inn = [62, 71, 58, 84, 90, 66, 77, 95, 88, 72, 101, 93][i] * 1000
  const out = [48, 52, 49, 61, 58, 50, 55, 63, 60, 54, 66, 62][i] * 1000
  return { p: `S${i + 40 > 52 ? i - 12 : i + 40}`, in: inn, out: -out }
})
export const cashMonthly = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((p, i) => ({
  p, in: [248, 271, 239, 302, 331, 358, 340, 395][i] * 1000, out: -[196, 204, 198, 231, 240, 251, 247, 268][i] * 1000,
}))
export const withBalance = (rows: { p: string; in: number; out: number }[], start: number) => {
  let b = start
  return rows.map((r) => ({ ...r, bal: (b = rnd(b + r.in + r.out)) }))
}

export const receipts = [
  { date: '02/10', client: 'Clínica Vita Saúde', value: 33650, status: 'Pendente' },
  { date: '05/10', client: 'Construtora Horizonte', value: 42100, status: 'Pendente' },
  { date: '28/09', client: 'Ed. Solar das Acácias', value: 24100, status: 'Recebido' },
  { date: '24/09', client: 'Padaria Doce Vida', value: 11700, status: 'Atrasado' },
  { date: '10/10', client: 'Res. Vila Verde', value: 48250, status: 'Pendente' },
]
export const payments = [
  { date: '03/10', sup: 'Guardian Glass', cat: 'Vidros', value: 38900, status: 'Pendente' },
  { date: '05/10', sup: 'Hydro Extrusion', cat: 'Perfis', value: 27450, status: 'Pendente' },
  { date: '30/09', sup: 'Energisa', cat: 'Custo fixo', value: 4820, status: 'Pago' },
  { date: '01/10', sup: 'Folha – Produção', cat: 'Salários', value: 46200, status: 'Pago' },
  { date: '28/09', sup: 'Udinese Ferragens', cat: 'Ferragens', value: 6380, status: 'Atrasado' },
]

export const timeline = [
  { d: '28/09/2026', t: 'Orçamento #1047 aprovado', s: 'R$ 84.200 · Fachada bloco A' },
  { d: '12/08/2026', t: 'Instalação concluída', s: 'Bloco 3 · 42 janelas de correr' },
  { d: '03/07/2026', t: 'Reunião de alinhamento', s: 'Visita técnica em obra' },
  { d: '19/05/2026', t: 'Contrato assinado', s: 'Projeto Residencial Jardins' },
]
