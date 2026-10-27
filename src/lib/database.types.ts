export type WorkspaceRole = 'admin' | 'gerente' | 'orcamentista' | 'visualizador'
export type ClientStatus = 'ativo' | 'prospect' | 'inativo'
export type QuoteStatus = 'rascunho' | 'enviado' | 'em_analise' | 'aprovado' | 'recusado'
export type ProjectStatus = 'orcado' | 'aprovado' | 'em_producao' | 'agendado' | 'em_instalacao' | 'concluido' | 'cancelado'
export type InstallationStatus = 'agendado' | 'confirmado' | 'reagendar' | 'concluido' | 'cancelado'
export type ActivityStatus = 'agendado' | 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
export type TransactionType = 'receivable' | 'payable'
export type TransactionStatus = 'pendente' | 'recebido' | 'pago' | 'atrasado'
export type MaterialCategory = 'perfis' | 'vidros' | 'ferragens' | 'insumos'
export type MaterialUnit = 'm' | 'm2' | 'un'

export interface Profile {
  id: string
  full_name: string
  email: string
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  default_margin: number
  default_tax: number
  default_fixed_cost: number
  default_retention: number
  default_validity_days: number
  default_interest_rate: number
  opening_balance: number
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
}

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profiles: Pick<Profile, 'full_name' | 'email'> | null
}

export interface Supplier {
  id: string
  workspace_id: string
  name: string
  category: string | null
  contact: string | null
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  status: ClientStatus
  lgpd_consent: boolean
  lgpd_consent_at: string | null
  last_contact_at: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface ClientSummary extends Client {
  project_count: number
  total_value: number
}

export interface TeamMember {
  id: string
  workspace_id: string
  name: string
  phone: string | null
  commission_rate: number
  active: boolean
  skills: string[]
  created_at: string
  updated_at: string
}

export interface TeamPerformance extends TeamMember {
  installations_count: number
  revenue_generated: number
}

export interface ClientActivity {
  id: string
  workspace_id: string
  client_id: string
  activity_at: string
  title: string
  description: string | null
  status: ActivityStatus
  responsible_id: string | null
  created_at: string
  team_members?: Pick<TeamMember, 'name'> | null
  clients?: Pick<Client, 'name'> | null
}

export interface Material {
  id: string
  workspace_id: string
  code: string
  name: string
  category: MaterialCategory
  unit: MaterialUnit
  cost: number
  supplier_id: string | null
  stock_quantity: number
  stock_capacity: number
  created_at: string
  updated_at: string
}

export interface MaterialWithSupplier extends Material {
  suppliers: Pick<Supplier, 'name'> | null
}

export interface MaterialPriceHistory {
  id: string
  workspace_id: string
  material_id: string
  reference_month: string
  cost: number
  created_at: string
}

export interface Product {
  id: string
  workspace_id: string
  name: string
  width_m: number
  height_m: number
  material_cost: number
  labor_cost: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  workspace_id: string
  client_id: string
  code: string
  status: QuoteStatus
  issue_date: string
  valid_until: string | null
  delivery_days: number
  installation_type: string
  address: string | null
  fixed_cost_pct: number
  margin_pct: number
  tax_pct: number
  retention_pct: number
  cash_discount_pct: number
  interest_rate_monthly: number
  material_total: number
  labor_total: number
  fixed_total: number
  margin_total: number
  tax_total: number
  total: number
  cash_total: number
  notes: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteWithClient extends Quote {
  clients: Pick<Client, 'name'> | null
}

export interface QuoteItem {
  id: string
  workspace_id: string
  quote_id: string
  product_id: string | null
  description: string
  width_m: number
  height_m: number
  quantity: number
  material_unit_cost: number
  labor_unit_cost: number
  created_at: string
}

export interface Project {
  id: string
  workspace_id: string
  client_id: string
  quote_id: string | null
  title: string
  status: ProjectStatus
  value: number
  progress: number
  due_date: string | null
  installer_id: string | null
  material_cost: number
  labor_cost: number
  fixed_cost: number
  tax_cost: number
  planned_profit: number
  created_at: string
  updated_at: string
}

export interface ProjectWithRelations extends Project {
  clients: Pick<Client, 'name'> | null
  team_members: Pick<TeamMember, 'name'> | null
}

export interface Installation {
  id: string
  workspace_id: string
  project_id: string
  client_id: string | null
  installer_id: string | null
  scheduled_date: string
  address: string | null
  status: InstallationStatus
  value: number
  created_at: string
  updated_at: string
}

export interface InstallationWithRelations extends Installation {
  clients: Pick<Client, 'name'> | null
  team_members: Pick<TeamMember, 'name'> | null
  projects?: Pick<Project, 'title' | 'client_id'> | null
}

export interface Transaction {
  id: string
  workspace_id: string
  type: TransactionType
  description: string
  category: string | null
  client_id: string | null
  supplier_id: string | null
  amount: number
  due_date: string
  paid_at: string | null
  status: TransactionStatus
  created_at: string
  updated_at: string
}

export interface TransactionWithRelations extends Transaction {
  clients: Pick<Client, 'name'> | null
  suppliers: Pick<Supplier, 'name'> | null
}
