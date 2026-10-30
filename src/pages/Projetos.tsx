import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Columns3, GripVertical, List, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardHeader, Drawer, Field, IconButton, PageHeader, Segmented, Skeleton,
  brl, cn, inputCls, mono, statusTone, td, th, tr,
} from '../components/ui'
import { EmptyState, QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { usePermissions } from '../lib/permissions'
import { supabase } from '../lib/supabaseClient'
import { formatDate, toDateInput, todayInput } from '../lib/format'
import {
  INSTALLATION_STATUS_LABELS, PROJECT_DOTS, PROJECT_STATUSES, PROJECT_STATUS_LABELS, labelOf,
} from '../lib/constants'
import type {
  Client, InstallationStatus, InstallationWithRelations, ProjectStatus, ProjectWithRelations, TeamMember,
} from '../lib/database.types'

interface ProjectFormValues {
  title: string
  clientId: string
  status: ProjectStatus
  value: string
  progress: string
  dueDate: string
  installerId: string
  materialCost: string
  laborCost: string
  fixedCost: string
  taxCost: string
  plannedProfit: string
}

function ProjectForm({ workspaceId, project, clients, team, onClose }: {
  workspaceId: string
  project: ProjectWithRelations | null
  clients: Client[]
  team: TeamMember[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [values, setValues] = useState<ProjectFormValues>({
    title: project?.title ?? '',
    clientId: project?.client_id ?? clients[0]?.id ?? '',
    status: project?.status ?? 'orcado',
    value: project ? String(project.value) : '',
    progress: project ? String(project.progress) : '0',
    dueDate: toDateInput(project?.due_date) || todayInput(),
    installerId: project?.installer_id ?? '',
    materialCost: project ? String(project.material_cost) : '0',
    laborCost: project ? String(project.labor_cost) : '0',
    fixedCost: project ? String(project.fixed_cost) : '0',
    taxCost: project ? String(project.tax_cost) : '0',
    plannedProfit: project ? String(project.planned_profit) : '0',
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!values.title.trim()) throw new Error('Informe o título do projeto.')
      if (!values.clientId) throw new Error('Selecione um cliente.')
      const payload = {
        workspace_id: workspaceId,
        client_id: values.clientId,
        title: values.title.trim(),
        status: values.status,
        value: Math.max(0, Number(values.value.replace(',', '.')) || 0),
        progress: Math.min(100, Math.max(0, Math.round(Number(values.progress)) || 0)),
        due_date: values.dueDate || null,
        installer_id: values.installerId || null,
        material_cost: Math.max(0, Number(values.materialCost.replace(',', '.')) || 0),
        labor_cost: Math.max(0, Number(values.laborCost.replace(',', '.')) || 0),
        fixed_cost: Math.max(0, Number(values.fixedCost.replace(',', '.')) || 0),
        tax_cost: Math.max(0, Number(values.taxCost.replace(',', '.')) || 0),
        planned_profit: Number(values.plannedProfit.replace(',', '.')) || 0,
      }
      if (project) {
        const { error } = await supabase.from('projects').update(payload).eq('id', project.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('projects').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-projects', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['clients', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-projects', workspaceId] })
      toast.show(project ? 'Projeto atualizado.' : 'Projeto criado.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Título">
        <input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cliente">
          <select value={values.clientId} onChange={(event) => setValues({ ...values, clientId: event.target.value })} className={inputCls}>
            <option value="">Selecione</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </Field>
        <Field label="Etapa">
          <select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as ProjectStatus })} className={inputCls}>
            {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}
          </select>
        </Field>
        <Field label="Valor do contrato">
          <input type="number" min="0" step="0.01" value={values.value} onChange={(event) => setValues({ ...values, value: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
        <Field label="Previsão de entrega">
          <input type="date" value={values.dueDate} onChange={(event) => setValues({ ...values, dueDate: event.target.value })} className={inputCls} />
        </Field>
        <Field label="Instalador">
          <select value={values.installerId} onChange={(event) => setValues({ ...values, installerId: event.target.value })} className={inputCls}>
            <option value="">Sem instalador</option>
            {team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </Field>
        <Field label="Progresso (%)">
          <input type="number" min="0" max="100" value={values.progress} onChange={(event) => setValues({ ...values, progress: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
      </div>
      <div className="rounded-md border border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Custos e lucro</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Material"><input type="number" min="0" step="0.01" value={values.materialCost} onChange={(event) => setValues({ ...values, materialCost: event.target.value })} className={cn(inputCls, mono)} /></Field>
          <Field label="Mão de obra"><input type="number" min="0" step="0.01" value={values.laborCost} onChange={(event) => setValues({ ...values, laborCost: event.target.value })} className={cn(inputCls, mono)} /></Field>
          <Field label="Custo fixo"><input type="number" min="0" step="0.01" value={values.fixedCost} onChange={(event) => setValues({ ...values, fixedCost: event.target.value })} className={cn(inputCls, mono)} /></Field>
          <Field label="Impostos"><input type="number" min="0" step="0.01" value={values.taxCost} onChange={(event) => setValues({ ...values, taxCost: event.target.value })} className={cn(inputCls, mono)} /></Field>
          <Field label="Lucro planejado" className="col-span-2"><input type="number" min="0" step="0.01" value={values.plannedProfit} onChange={(event) => setValues({ ...values, plannedProfit: event.target.value })} className={cn(inputCls, mono)} /></Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar projeto'}
        </Button>
      </div>
    </form>
  )
}

interface InstallationFormValues {
  projectId: string
  scheduledDate: string
  installerId: string
  address: string
  status: InstallationStatus
  value: string
}

function InstallationForm({ workspaceId, installation, projects, team, onClose }: {
  workspaceId: string
  installation: InstallationWithRelations | null
  projects: ProjectWithRelations[]
  team: TeamMember[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [values, setValues] = useState<InstallationFormValues>({
    projectId: installation?.project_id ?? projects[0]?.id ?? '',
    scheduledDate: toDateInput(installation?.scheduled_date) || todayInput(),
    installerId: installation?.installer_id ?? '',
    address: installation?.address ?? '',
    status: installation?.status ?? 'agendado',
    value: installation ? String(installation.value) : String(projects[0]?.value ?? ''),
  })

  const changeProject = (projectId: string) => {
    const project = projects.find((entry) => entry.id === projectId)
    setValues((current) => ({
      ...current,
      projectId,
      value: project ? String(project.value) : current.value,
    }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!values.projectId) throw new Error('Selecione o projeto.')
      const project = projects.find((entry) => entry.id === values.projectId)
      if (!project) throw new Error('Projeto não encontrado.')
      const payload = {
        workspace_id: workspaceId,
        project_id: values.projectId,
        client_id: project.client_id,
        installer_id: values.installerId || null,
        scheduled_date: values.scheduledDate,
        address: values.address.trim() || null,
        status: values.status,
        value: Math.max(0, Number(values.value.replace(',', '.')) || 0),
      }
      if (installation) {
        const { error } = await supabase.from('installations').update(payload).eq('id', installation.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('installations').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['installations', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-installations', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['team-performance', workspaceId] })
      toast.show(installation ? 'Instalação atualizada.' : 'Instalação agendada.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
      <Field label="Projeto">
        <select value={values.projectId} onChange={(event) => changeProject(event.target.value)} className={inputCls}>
          <option value="">Selecione</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.clients?.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <input required type="date" value={values.scheduledDate} onChange={(event) => setValues({ ...values, scheduledDate: event.target.value })} className={inputCls} />
        </Field>
        <Field label="Status">
          <select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as InstallationStatus })} className={inputCls}>
            {Object.entries(INSTALLATION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Instalador">
          <select value={values.installerId} onChange={(event) => setValues({ ...values, installerId: event.target.value })} className={inputCls}>
            <option value="">Sem instalador</option>
            {team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </Field>
        <Field label="Valor">
          <input type="number" min="0" step="0.01" value={values.value} onChange={(event) => setValues({ ...values, value: event.target.value })} className={cn(inputCls, mono)} />
        </Field>
      </div>
      <Field label="Endereço">
        <input value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} className={inputCls} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar instalação'}
        </Button>
      </div>
    </form>
  )
}

export default function Projetos() {
  const { workspaceId } = useWorkspace()
  const { canWrite } = usePermissions()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<ProjectStatus | null>(null)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithRelations | null>(null)
  const [installationFormOpen, setInstallationFormOpen] = useState(false)
  const [editingInstallation, setEditingInstallation] = useState<InstallationWithRelations | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name), team_members(name)')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false })
        .returns<ProjectWithRelations[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const installationsQuery = useQuery({
    queryKey: ['installations', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations')
        .select('*, clients(name), team_members(name), projects(title, client_id)')
        .eq('workspace_id', workspaceId!)
        .order('scheduled_date', { ascending: false })
        .returns<InstallationWithRelations[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const clientsQuery = useQuery({
    queryKey: ['clients', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('workspace_id', workspaceId!).order('name').returns<Client[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const teamQuery = useQuery({
    queryKey: ['team-members', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*').eq('workspace_id', workspaceId!).order('name').returns<TeamMember[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase.from('projects').update({ status }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['projects', workspaceId] })
      const previous = queryClient.getQueryData<ProjectWithRelations[]>(['projects', workspaceId])
      queryClient.setQueryData<ProjectWithRelations[]>(['projects', workspaceId], (current) =>
        current?.map((project) => project.id === id ? { ...project, status } : project),
      )
      return { previous }
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['projects', workspaceId], context?.previous)
      toast.show(error.message, 'error')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-projects', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['clients', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-projects', workspaceId] })
    },
  })

  const deleteInstallationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('installations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['installations', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-installations', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['team-performance', workspaceId] })
      toast.show('Instalação removida.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const projects = projectsQuery.data ?? []
  const installations = installationsQuery.data ?? []
  const clients = clientsQuery.data ?? []
  const team = teamQuery.data ?? []

  const openNewProject = () => { if (!canWrite) return; setEditingProject(null); setProjectFormOpen(true) }
  const openEditProject = (project: ProjectWithRelations) => { if (!canWrite) return; setEditingProject(project); setProjectFormOpen(true) }
  const closeProjectForm = () => { setProjectFormOpen(false); setEditingProject(null) }
  const openNewInstallation = () => { if (!canWrite) return; setEditingInstallation(null); setInstallationFormOpen(true) }
  const openEditInstallation = (installation: InstallationWithRelations) => { if (!canWrite) return; setEditingInstallation(installation); setInstallationFormOpen(true) }
  const closeInstallationForm = () => { setInstallationFormOpen(false); setEditingInstallation(null) }

  const drop = (status: ProjectStatus) => {
    if (!canWrite) { setDrag(null); setOver(null); return }
    if (drag) {
      const project = projects.find((entry) => entry.id === drag)
      if (project && project.status !== status) moveMutation.mutate({ id: drag, status })
    }
    setDrag(null)
    setOver(null)
  }

  if (projectsQuery.error || installationsQuery.error || clientsQuery.error || teamQuery.error) {
    const error = projectsQuery.error || installationsQuery.error || clientsQuery.error || teamQuery.error
    return <QueryError message={(error as Error).message} onRetry={() => {
      void projectsQuery.refetch()
      void installationsQuery.refetch()
      void clientsQuery.refetch()
      void teamQuery.refetch()
    }} />
  }

  return (
    <>
      <PageHeader title="Gestão de Projetos" subtitle="Arraste os cartões para atualizar a etapa e gerencie a agenda de instalações">
        <Segmented value={view} onChange={setView} options={[{ id: 'list', label: <><List size={14} /> Lista</> }, { id: 'kanban', label: <><Columns3 size={14} /> Kanban</> }]} />
        {canWrite && (
          <>
            <Button onClick={openNewInstallation}><Calendar size={16} /> Nova Instalação</Button>
            <Button variant="primary" onClick={openNewProject}><Plus size={16} /> Novo Projeto</Button>
          </>
        )}
      </PageHeader>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
          {PROJECT_STATUSES.map((status) => {
            const list = projects.filter((project) => project.status === status)
            return (
              <div
                key={status}
                onDragOver={(event) => { event.preventDefault(); setOver(status) }}
                onDragLeave={() => setOver(null)}
                onDrop={() => drop(status)}
                className={cn('w-72 shrink-0 rounded-lg bg-muted/60 border p-2.5 transition', over === status ? 'border-primary bg-primary-soft' : 'border-transparent')}
              >
                <div className="flex items-center justify-between px-1.5 py-1.5 mb-2">
                  <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: PROJECT_DOTS[status] }} />{PROJECT_STATUS_LABELS[status]}</span>
                  <span className={`text-xs text-muted-foreground ${mono}`}>{list.length} · {brl(list.reduce((sum, project) => sum + Number(project.value), 0))}</span>
                </div>
                <div className="space-y-2.5 min-h-24">
                  {projectsQuery.isLoading && Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
                  {list.map((project) => (
                    <article
                      key={project.id}
                      draggable={canWrite}
                      onDragStart={() => canWrite && setDrag(project.id)}
                      onDragEnd={() => { setDrag(null); setOver(null) }}
                      onClick={() => openEditProject(project)}
                      className={cn(
                        'bg-card border border-border rounded-lg p-3.5 shadow-card transition',
                        canWrite ? 'cursor-grab active:cursor-grabbing hover:border-primary/60 hover:shadow-md' : 'cursor-default',
                        drag === project.id && 'opacity-40 rotate-1',
                      )}
                    >
                      <div className="flex items-start gap-1">
                        <GripVertical size={14} className="text-muted-foreground mt-0.5 -ml-1 shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{project.clients?.name ?? 'Sem cliente'}</p>
                        </div>
                      </div>
                      <p className={`${mono} text-lg font-semibold mt-2`}>{brl(Number(project.value))}</p>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={project.progress} aria-label="Progresso">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(project.due_date)}</span>
                        <span className="flex items-center gap-1.5">{project.team_members?.name ? <Avatar name={project.team_members.name} size={20} /> : null}{project.team_members?.name ?? '—'}</span>
                      </div>
                    </article>
                  ))}
                  {!projectsQuery.isLoading && list.length === 0 && <div className="border border-dashed border-border rounded-lg py-8 text-center text-xs text-muted-foreground">Solte um projeto aqui</div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead><tr>{['Projeto', 'Cliente', 'Valor', 'Etapa', 'Previsão', 'Progresso', 'Instalador', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
            <tbody>
              {projectsQuery.isLoading ? <tr><td colSpan={8} className="p-6"><Skeleton className="h-24" /></td></tr> : projects.map((project) => (
                <tr key={project.id} className={tr}>
                  <td className={`${td} font-medium`}>{project.title}</td>
                  <td className={td}>{project.clients?.name ?? '—'}</td>
                  <td className={`${td} ${mono}`}>{brl(Number(project.value))}</td>
                  <td className={td}><Badge tone={statusTone[labelOf(PROJECT_STATUS_LABELS, project.status)]}>{labelOf(PROJECT_STATUS_LABELS, project.status)}</Badge></td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(project.due_date)}</td>
                  <td className={td}><div className="h-1.5 w-28 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div></td>
                  <td className={td}>{project.team_members?.name ?? '—'}</td>
                  <td className={td}>{canWrite && <IconButton label="Editar projeto" onClick={() => openEditProject(project)}><Pencil size={16} /></IconButton>}</td>
                </tr>
              ))}
              {!projectsQuery.isLoading && projects.length === 0 && <tr><td colSpan={8}><EmptyState title="Nenhum projeto" description="Crie um projeto ou aprove um orçamento." /></td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Agenda de Instalações" subtitle={`${installations.length} instalações registradas`} action={canWrite ? <Button size="sm" onClick={openNewInstallation}><Plus size={14} /> Agendar</Button> : undefined} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead><tr>{['Data', 'Projeto', 'Cliente', 'Instalador', 'Endereço', 'Valor', 'Status', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
            <tbody>
              {installationsQuery.isLoading ? <tr><td colSpan={8} className="p-6"><Skeleton className="h-24" /></td></tr> : installations.map((installation) => (
                <tr key={installation.id} className={tr}>
                  <td className={`${td} ${mono}`}>{formatDate(installation.scheduled_date)}</td>
                  <td className={`${td} font-medium`}>{installation.projects?.title ?? '—'}</td>
                  <td className={td}>{installation.clients?.name ?? '—'}</td>
                  <td className={td}>{installation.team_members?.name ?? '—'}</td>
                  <td className={`${td} text-muted-foreground max-w-48 truncate`}>{installation.address ?? '—'}</td>
                  <td className={`${td} ${mono}`}>{brl(Number(installation.value))}</td>
                  <td className={td}><Badge tone={statusTone[labelOf(INSTALLATION_STATUS_LABELS, installation.status)]}>{labelOf(INSTALLATION_STATUS_LABELS, installation.status)}</Badge></td>
                  <td className={td}>
                    {canWrite && (
                      <>
                        <IconButton label="Editar instalação" onClick={() => openEditInstallation(installation)}><Pencil size={16} /></IconButton>
                        <IconButton label="Remover instalação" onClick={() => {
                          if (window.confirm('Remover esta instalação?')) deleteInstallationMutation.mutate(installation.id)
                        }}><Trash2 size={16} /></IconButton>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!installationsQuery.isLoading && installations.length === 0 && <tr><td colSpan={8}><EmptyState title="Nenhuma instalação" description="Agende a primeira instalação." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={projectFormOpen} onClose={closeProjectForm} title={editingProject ? 'Editar Projeto' : 'Novo Projeto'}>
        <ProjectForm key={editingProject?.id ?? 'new'} workspaceId={workspaceId!} project={editingProject} clients={clients} team={team} onClose={closeProjectForm} />
      </Drawer>

      <Drawer open={installationFormOpen} onClose={closeInstallationForm} title={editingInstallation ? 'Editar Instalação' : 'Nova Instalação'}>
        <InstallationForm key={editingInstallation?.id ?? 'new'} workspaceId={workspaceId!} installation={editingInstallation} projects={projects} team={team} onClose={closeInstallationForm} />
      </Drawer>
    </>
  )
}
