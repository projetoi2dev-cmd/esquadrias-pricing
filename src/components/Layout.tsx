import { useState } from 'react'
import {
  LayoutDashboard, FileText, Package, Kanban, Users, TrendingUp,
  BarChart2, UserCircle, Settings, ChevronRight, ChevronLeft,
  Bell, Search, Sun, Moon, LogOut, ChevronDown, Building2, X
} from 'lucide-react'
import type { Page } from '../App'

interface NavItem {
  id: Page
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'orcamentos',   label: 'Orçamentos',       icon: FileText, badge: 7 },
  { id: 'materiais',    label: 'Materiais / BOM',  icon: Package },
  { id: 'projetos',     label: 'Projetos',         icon: Kanban, badge: 3 },
  { id: 'equipe',       label: 'Equipe',           icon: Users },
  { id: 'financeiro',   label: 'Financeiro',       icon: TrendingUp },
  { id: 'relatorios',   label: 'Relatórios',       icon: BarChart2 },
  { id: 'clientes',     label: 'Clientes',         icon: UserCircle },
  { id: 'configuracoes',label: 'Configurações',    icon: Settings },
]

const NOTIFICATIONS = [
  { id: 1, text: 'Orçamento #0892 aprovado por Construtora Horizonte', time: '5 min', unread: true },
  { id: 2, text: 'Instalação amanhã — Av. Paulista, 1200 — Roberto', time: '1h',  unread: true },
  { id: 3, text: 'Estoque crítico: Perfil Alumínio 2" < 50 kg',       time: '3h',  unread: false },
]

interface LayoutProps {
  page: Page
  breadcrumbs: string[]
  dark: boolean
  sidebarOpen: boolean
  onToggleDark: () => void
  onToggleSidebar: () => void
  onNavigate: (page: Page) => void
  children: React.ReactNode
}

export default function Layout({
  page, breadcrumbs, dark, sidebarOpen,
  onToggleDark, onToggleSidebar, onNavigate, children
}: LayoutProps) {
  const [showNotif, setShowNotif] = useState(false)
  const [showUser, setShowUser]   = useState(false)
  const [search, setSearch]       = useState('')
  const unread = NOTIFICATIONS.filter(n => n.unread).length

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-layout shrink-0 ${sidebarOpen ? 'w-60' : 'w-16'}`}
        style={{ background: 'var(--_bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm leading-tight truncate">Esquadrias Pro</div>
              <div className="text-xs" style={{ color: 'rgba(148,163,184,0.8)' }}>v2.4.1</div>
            </div>
          )}
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded-md hover:bg-sidebar-hover transition-colors ml-auto shrink-0"
            style={{ color: '#94A3B8' }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Workspace switcher */}
        {sidebarOpen && (
          <div className="px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-hover transition-colors group">
              <div className="w-5 h-5 rounded bg-info shrink-0 flex items-center justify-center text-white text-xs font-bold">A</div>
              <span className="text-sm text-white/80 truncate flex-1 text-left">Alumix Esquadrias</span>
              <ChevronDown size={12} style={{ color: '#64748B' }} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  active
                    ? 'text-white'
                    : 'hover:text-white'
                }`}
                style={{
                  background: active ? 'rgba(59,130,246,0.18)' : undefined,
                  color: active ? '#60A5FA' : '#94A3B8',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <Icon size={18} className="shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold">{item.badge}</span>
                    )}
                  </>
                )}
                {!sidebarOpen && active && (
                  <span className="absolute left-16 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-hover transition-colors cursor-pointer ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/40 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              MC
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 font-medium truncate">Marcos Costa</div>
                  <div className="text-xs truncate" style={{ color: '#64748B' }}>Administrador</div>
                </div>
                <LogOut size={15} style={{ color: '#64748B' }} />
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header
          className="shrink-0 flex items-center gap-4 px-6 py-0 border-b"
          style={{ background: 'var(--_bg-header)', borderColor: 'var(--_border)', height: '60px' }}
        >
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm shrink-0" aria-label="Breadcrumb">
            <span className="text-dim text-sm">Esquadrias Pro</span>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight size={13} className="text-faint" />
                <span className={i === breadcrumbs.length - 1 ? 'text-ink font-medium' : 'text-dim'}>{crumb}</span>
              </span>
            ))}
          </nav>

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar orçamentos, clientes..."
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border bg-input-bg text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                style={{ borderColor: 'var(--_border)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Dark mode toggle */}
            <button
              onClick={onToggleDark}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-row-hover transition-colors"
              aria-label="Toggle dark mode"
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotif(!showNotif); setShowUser(false) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-row-hover transition-colors relative"
                aria-label={`${unread} notificações`}
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">{unread}</span>
                )}
              </button>
              {showNotif && (
                <div
                  className="absolute right-0 top-10 w-80 rounded-xl shadow-xl z-50 border overflow-hidden"
                  style={{ background: 'var(--_bg-card)', borderColor: 'var(--_border)' }}
                >
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--_border)' }}>
                    <span className="text-sm font-semibold text-ink">Notificações</span>
                    <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Marcar como lidas</span>
                  </div>
                  {NOTIFICATIONS.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b hover:bg-row-hover cursor-pointer transition-colors ${n.unread ? '' : 'opacity-60'}`} style={{ borderColor: 'var(--_border)' }}>
                      <div className="flex items-start gap-2">
                        {n.unread && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                        {!n.unread && <div className="w-2 h-2 mt-1.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink leading-relaxed">{n.text}</p>
                          <p className="text-xs text-faint mt-0.5">{n.time} atrás</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar */}
            <button
              onClick={() => { setShowUser(!showUser); setShowNotif(false) }}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-row-hover transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">MC</div>
              <ChevronDown size={13} className="text-faint" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-page">
          {children}
        </main>
      </div>

      {/* Overlay to close dropdowns */}
      {(showNotif || showUser) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotif(false); setShowUser(false) }} />
      )}
    </div>
  )
}
