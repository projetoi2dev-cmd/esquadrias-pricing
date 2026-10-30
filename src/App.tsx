import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import {
  LayoutDashboard, Calculator, Boxes, KanbanSquare, HardHat, Wallet, BarChart3, Users, Settings,
  Bell, Moon, Sun, ChevronsLeft, ChevronsRight, ChevronRight, Menu, AppWindow, X, LogOut, Loader2, RefreshCw,
} from 'lucide-react'
import { Avatar, Button, Card, IconButton, cn } from './components/ui'
import { ReadOnlyBanner } from './components/States'
import { useAuth } from './lib/auth'
import { useWorkspace } from './lib/workspace'
import { useNotifications } from './lib/queries/notifications'
import { ROLE_LABELS } from './lib/constants'
import { NavigationContext, type PageId } from './lib/navigation'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Orcamentos = lazy(() => import('./pages/Orcamentos'))
const Materiais = lazy(() => import('./pages/Materiais'))
const Projetos = lazy(() => import('./pages/Projetos'))
const Equipe = lazy(() => import('./pages/Equipe'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))

const nav: { id: PageId; label: string; icon: typeof Settings; page: ComponentType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: Dashboard },
  { id: 'orcamentos', label: 'Orçamentos', icon: Calculator, page: Orcamentos },
  { id: 'materiais', label: 'Materiais / BOM', icon: Boxes, page: Materiais },
  { id: 'projetos', label: 'Projetos', icon: KanbanSquare, page: Projetos },
  { id: 'equipe', label: 'Equipe', icon: HardHat, page: Equipe },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet, page: Financeiro },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, page: Relatorios },
  { id: 'clientes', label: 'Clientes', icon: Users, page: Clientes },
  { id: 'config', label: 'Configurações', icon: Settings, page: Configuracoes },
]

export default function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const { workspace, workspaceId, role, loading: workspaceLoading, error: workspaceError, refetch } = useWorkspace()
  const { data: notes = [] } = useNotifications(workspaceId)

  const [page, setPage] = useState<PageId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('esquadra-theme') === 'dark')
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('esquadra-theme', dark ? 'dark' : 'light')
  }, [dark])

  if (authLoading) {
    return (
      <div className="min-h-full grid place-items-center bg-background text-foreground">
        <div className="text-center">
          <span className="mx-auto mb-4 grid place-items-center h-12 w-12 rounded-lg bg-primary text-primary-foreground">
            <AppWindow size={24} />
          </span>
          <Loader2 className="mx-auto animate-spin text-muted-foreground" size={20} />
          <p className="mt-3 text-sm text-muted-foreground">Carregando sessão...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  if (workspaceLoading) {
    return (
      <div className="min-h-full grid place-items-center bg-background text-foreground">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-primary" size={24} />
          <p className="mt-3 text-sm text-muted-foreground">Carregando workspace...</p>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-full grid place-items-center bg-background text-foreground p-6">
        <Card className="w-full max-w-lg p-8 text-center">
          <span className="mx-auto mb-4 grid place-items-center h-12 w-12 rounded-lg bg-warning-soft text-warning">
            <AppWindow size={24} />
          </span>
          <h1 className="text-xl font-bold">Usuário sem workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {workspaceError?.message ?? 'Seu usuário autenticou, mas ainda não foi vinculado ao workspace da Vidraçaria Modelo.'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Execute o arquivo <code className="font-mono">supabase/bootstrap-admin.sql</code> no SQL Editor do Supabase.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={refetch}><RefreshCw size={15} /> Tentar novamente</Button>
            <Button variant="ghost" onClick={() => void signOut()}><LogOut size={15} /> Sair</Button>
          </div>
        </Card>
      </div>
    )
  }

  const current = nav.find((item) => item.id === page)!
  const Page = current.page
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuário'
  const displayEmail = profile?.email || user.email || ''
  const roleLabel = role ? ROLE_LABELS[role] : 'Membro'
  const isViewer = role === 'visualizador'

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
        {nav.map((item) => {
          const active = item.id === page
          return (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setMobile(false) }}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 h-10 rounded-md text-sm font-medium transition cursor-pointer',
                collapsed ? 'justify-center' : 'px-3',
                active ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className={cn('flex items-center gap-2.5 rounded-md border border-border p-2', collapsed && 'justify-center')}>
          <Avatar name={workspace.name} size={28} tone={2} />
          {!collapsed && (
            <span className="flex-1 text-left min-w-0">
              <span className="block text-sm font-medium truncate">{workspace.name}</span>
              <span className="block text-[11px] text-muted-foreground">{roleLabel}</span>
            </span>
          )}
        </div>
        <div className={cn('flex items-center gap-2.5 p-1', collapsed && 'justify-center')}>
          <Avatar name={displayName} size={32} tone={4} />
          {!collapsed && (
            <>
              <div className="min-w-0 leading-tight flex-1">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
              </div>
              <IconButton label="Sair" onClick={() => void signOut()}>
                <LogOut size={16} />
              </IconButton>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => void signOut()}
            aria-label="Sair"
            className="w-full h-8 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <NavigationContext.Provider value={setPage}>
    <div className="app-shell h-full flex bg-background text-foreground">
      <aside className={cn('app-sidebar hidden lg:block shrink-0 bg-card border-r border-border transition-[width] duration-200 print:hidden', collapsed ? 'w-[72px]' : 'w-64')}>
        {sidebar}
      </aside>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex print:hidden">
          <div className="w-64 bg-card border-r border-border">{sidebar}</div>
          <div className="flex-1 bg-slate-900/40" onClick={() => setMobile(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="app-header h-16 shrink-0 bg-card border-b border-border flex items-center gap-3 px-4 lg:px-8 print:hidden">
          <IconButton label="Menu" className="lg:hidden" onClick={() => setMobile(true)}><Menu size={18} /></IconButton>
          <IconButton label={collapsed ? 'Expandir menu' : 'Recolher menu'} className="hidden lg:inline-flex" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </IconButton>
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>{workspace.name}</span>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{current.label}</span>
          </nav>
          <div className="flex-1" />
          <IconButton label={dark ? 'Modo claro' : 'Modo escuro'} onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <div className="relative">
            <IconButton label="Notificações" onClick={() => setNotificationsOpen(!notificationsOpen)}>
              <Bell size={18} />
              {notes.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger ring-2 ring-card" />}
            </IconButton>
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-40 slide-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Notificações</p>
                  <button aria-label="Fechar" onClick={() => setNotificationsOpen(false)} className="text-muted-foreground cursor-pointer"><X size={14} /></button>
                </div>
                {notes.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">Tudo em dia por aqui.</p>
                ) : (
                  notes.map((note) => (
                    <p key={note.id} className="px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-muted">{note.text}</p>
                  ))
                )}
              </div>
            )}
          </div>
          <Avatar name={displayName} size={32} tone={4} />
        </header>

        <main className="app-main flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-4 lg:p-8" key={`${page}-${workspace.id}`}>
            {isViewer && <ReadOnlyBanner roleLabel={roleLabel} />}
            <Suspense fallback={<div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={18} /> Carregando módulo...</div>}>
              <Page />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
    </NavigationContext.Provider>
  )
}
