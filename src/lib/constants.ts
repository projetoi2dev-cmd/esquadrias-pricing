import type {
  ActivityStatus,
  ClientStatus,
  InstallationStatus,
  MaterialCategory,
  MaterialUnit,
  ProjectStatus,
  QuoteStatus,
  TransactionStatus,
  WorkspaceRole,
} from './database.types'

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ativo: 'Ativo',
  prospect: 'Prospect',
  inativo: 'Inativo',
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  orcado: 'Orçado',
  aprovado: 'Aprovado',
  em_producao: 'Em Produção',
  agendado: 'Agendado',
  em_instalacao: 'Em Instalação',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  'orcado',
  'aprovado',
  'em_producao',
  'agendado',
  'em_instalacao',
  'concluido',
  'cancelado',
]

export const PROJECT_DOTS: Record<ProjectStatus, string> = {
  orcado: '#94a3b8',
  aprovado: '#2563EB',
  em_producao: '#F59E0B',
  agendado: '#8b5cf6',
  em_instalacao: '#06b6d4',
  concluido: '#10B981',
  cancelado: '#EF4444',
}

export const INSTALLATION_STATUS_LABELS: Record<InstallationStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  reagendar: 'Reagendar',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  agendado: 'Agendado',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  pago: 'Pago',
  atrasado: 'Atrasado',
}

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  perfis: 'Perfis',
  vidros: 'Vidros',
  ferragens: 'Ferragens',
  insumos: 'Insumos',
}

export const MATERIAL_CATEGORIES: MaterialCategory[] = ['perfis', 'vidros', 'ferragens', 'insumos']

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  m: 'm',
  m2: 'm²',
  un: 'un',
}

export const INSTALLATION_TYPE_LABELS: Record<string, string> = {
  obra: 'Obra nova',
  troca: 'Troca / Reforma',
  fachada: 'Fachada (balancim)',
  somente_fornecimento: 'Somente fornecimento',
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  orcamentista: 'Orçamentista',
  visualizador: 'Visualizador',
}

export const labelOf = <T extends string>(labels: Record<T, string>, value: T) => labels[value] ?? value
