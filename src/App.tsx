import { useEffect, useState, type ComponentType } from 'react'
import {
  LayoutDashboard, Calculator, Boxes, KanbanSquare, HardHat, Wallet, BarChart3, Users, Settings,
  Search, Bell, Moon, Sun, ChevronsLeft, ChevronsRight, ChevronsUpDown, ChevronRight, Menu, Check, AppWindow, X,
} from 'lucide-react'
import { Avatar, IconButton, cn } from './components/ui'
import Dashboard from './pages/Dashboard'
import Orcamentos from './pages/Orcamentos'
import Materiais from './pages/Materiais'
import Projetos from './pages/Projetos'
import Equipe from './pages/Equipe'
import Financeiro from './pages/Financeiro'
import Relatorios from './pages/Relatorios'
import Clientes from './pages/Clientes'

const nav: { id: string; label: string; icon: typeof Settings; page: ComponentType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: Dashboard },
  { id: 'orcamentos', label: 'Orçamentos', icon: Calculator, page: Orcamentos },
  { id: 'materiais', label: 'Materiais / BOM', icon: Boxes, page: Materiais },
  { id: 'projetos', label: 'Projetos', icon: KanbanSquare, page: Projetos },
  { id: 'equipe', label: 'Equipe', icon: HardHat, page: Equipe },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet, page: Financeiro },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, page: Relatorios },
  { id: 'clientes', label: 'Clientes', icon: Users, page: Clientes },
  { id: 'config', label: 'Configurações', icon: Settings, page: () => <Placeholder /> },
]

function Placeholder() {
  return (
    <div className="grid place-items-center h-96 text-center text-muted-foreground">
      <div>
        <Settings className="mx-auto mb-3" />
        <p className="font-semibold text-foreground">Configurações</p>
        <p className="text-sm">Preferências do workspace, usuários e integrações.</p>
      </div>
    </div>
  )
}

const workspaces = [
  { name: 'Vidraçaria Modelo', role: 'Admin' },
  { name: 'Esquadrias Paulista', role: 'Gerente' },
  { name: 'AluSul Industrial', role: 'Orçamentista' },
]

const notes = [
  'Orçamento #1047 aprovado por Construtora Horizonte',
  'Estoque baixo: Vedação EPDM Preta (8%)',
  'Pagamento Udinese Ferragens está atrasado',
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [dark, setDark] = useState(false)
  const [ws, setWs] = useState(0)
  const [wsOpen, setWsOpen] = useState(false)
  const [nOpen, setNOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const current = nav.find((n) => n.id === page)!
  const Page = current.page

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className={cn('h-16 flex items-center gap-2.5 border-b border-border shrink-0', collapsed ? 'justify-center' : 'px-5')}>
        <span className="grid place-items-center h-8 w-8 rounded-md bg-primary text-primary-foreground shrink-0">
          <AppWindow size={18} />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-bold text-[15px]">Esquadra</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Precificação & Gestão</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Principal">
        {nav.map((n) => {
          const active = n.id === page
          return (
            <button
              key={n.id}
              onClick={() => { setPage(n.id); setMobile(false) }}
              title={collapsed ? n.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 h-10 rounded-md text-sm font-medium transition cursor-pointer',
                collapsed ? 'justify-center' : 'px-3',
                active ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <n.icon size={18} className="shrink-0" />
              {!collapsed && n.label}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-2 relative">
        {wsOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-card border border-border rounded-lg shadow-lg p-1 z-40 min-w-48">
            <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Workspaces</p>
            {workspaces.map((w, i) => (
              <button key={w.name} onClick={() => { setWs(i); setWsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-left cursor-pointer">
                <Avatar name={w.name} size={24} tone={i + 1} />
                <span className="flex-1 truncate">{w.name}</span>
                {i === ws && <Check size={14} className="text-primary" />}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setWsOpen(!wsOpen)}
          aria-expanded={wsOpen}
          aria-label="Trocar workspace"
          className={cn('w-full flex items-center gap-2.5 rounded-md border border-border p-2 hover:bg-muted transition cursor-pointer', collapsed && 'justify-center')}
        >
          <Avatar name={workspaces[ws].name} size={28} tone={ws + 1} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left min-w-0">
                <span className="block text-sm font-medium truncate">{workspaces[ws].name}</span>
                <span className="block text-[11px] text-muted-foreground">{workspaces[ws].role}</span>
              </span>
              <ChevronsUpDown size={14} className="text-muted-foreground" />
            </>
          )}
        </button>
        <div className={cn('flex items-center gap-2.5 p-1', collapsed && 'justify-center')}>
          <Avatar name="Camila Ferraz" size={32} tone={4} />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-medium truncate">Camila Ferraz</p>
              <p className="text-[11px] text-muted-foreground truncate">camila@vidracariamodelo.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex bg-background text-foreground">
      <aside className={cn('hidden lg:block shrink-0 bg-card border-r border-border transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-64')}>
        {sidebar}
      </aside>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card border-r border-border">{sidebar}</div>
          <div className="flex-1 bg-slate-900/40" onClick={() => setMobile(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 bg-card border-b border-border flex items-center gap-3 px-4 lg:px-8">
          <IconButton label="Menu" className="lg:hidden" onClick={() => setMobile(true)}><Menu size={18} /></IconButton>
          <IconButton label={collapsed ? 'Expandir menu' : 'Recolher menu'} className="hidden lg:inline-flex" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </IconButton>
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>{workspaces[ws].name}</span>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{current.label}</span>
          </nav>
          <div className="flex-1" />
          <div className="relative w-full max-w-sm hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Busca global"
              placeholder="Buscar orçamentos, clientes, materiais…"
              className="h-10 w-full rounded-md border border-border bg-muted/60 pl-9 pr-12 text-sm hover:border-muted-foreground/50 focus:bg-card transition"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <IconButton label={dark ? 'Modo claro' : 'Modo escuro'} onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <div className="relative">
            <IconButton label="Notificações" onClick={() => setNOpen(!nOpen)}>
              <Bell size={18} />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger ring-2 ring-card" />
            </IconButton>
            {nOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-40 slide-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Notificações</p>
                  <button aria-label="Fechar" onClick={() => setNOpen(false)} className="text-muted-foreground cursor-pointer"><X size={14} /></button>
                </div>
                {notes.map((n) => (
                  <p key={n} className="px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-muted">{n}</p>
                ))}
              </div>
            )}
          </div>
          <Avatar name="Camila Ferraz" size={32} tone={4} />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-4 lg:p-8" key={page + ws}>
            <Page />
          </div>
        </main>
      </div>
    </div>
  )
}
