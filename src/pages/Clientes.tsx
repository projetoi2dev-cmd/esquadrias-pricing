import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Mail, Phone, ShieldCheck, ShieldAlert, Eye, Pencil, Search, CalendarPlus } from 'lucide-react'
import {
  Avatar, Badge, Button, Card, Drawer, Field, IconButton, PageHeader, TableSkeleton,
  brl, cn, inputCls, mono, statusTone, td, th, tr,
} from '../components/ui'
import { EmptyState, QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { usePermissions } from '../lib/permissions'
import { supabase } from '../lib/supabaseClient'
import { formatDate, formatDateTime, todayInput } from '../lib/format'
import { ACTIVITY_STATUS_LABELS, CLIENT_STATUS_LABELS, labelOf } from '../lib/constants'
import type {
  ActivityStatus, ClientActivity, ClientStatus, ClientSummary, TeamMember,
} from '../lib/database.types'

interface ClientFormValues {
  name: string
  contact_name: string
  email: string
  phone: string
  status: ClientStatus
  lgpd_consent: boolean
  notes: string
}

function ClientForm({ workspaceId, client, onClose }: { workspaceId: string; client: ClientSummary | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [values, setValues] = useState<ClientFormValues>({
    name: client?.name ?? '',
    contact_name: client?.contact_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    status: client?.status ?? 'ativo',
    lgpd_consent: client?.lgpd_consent ?? false,
    notes: client?.notes ?? '',
  })

  const mutation = useMutation({
    mutationFn: async (payload: ClientFormValues) => {
      const data = {
        workspace_id: workspaceId,
        name: payload.name.trim(),
        contact_name: payload.contact_name.trim() || null,
        email: payload.email.trim() || null,
        phone: payload.phone.trim() || null,
        status: payload.status,
        lgpd_consent: payload.lgpd_consent,
        lgpd_consent_at: payload.lgpd_consent
          ? (client?.lgpd_consent_at ?? new Date().toISOString())
          : null,
        last_contact_at: client ? client.last_contact_at : todayInput(),
        notes: payload.notes.trim(),
      }

      if (!data.name) throw new Error('Informe o nome do cliente.')

      if (client) {
        const { error } = await supabase.from('clients').update(data).eq('id', client.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('clients').insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-clients', workspaceId] })
      toast.show(client ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(values)
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Nome / Razão social">
        <input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className={inputCls} />
      </Field>
      <Field label="Contato principal">
        <input value={values.contact_name} onChange={(event) => setValues({ ...values, contact_name: event.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="E-mail">
          <input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} className={inputCls} />
        </Field>
        <Field label="Telefone">
          <input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Status">
        <select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as ClientStatus })} className={inputCls}>
          {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
        <input
          type="checkbox"
          checked={values.lgpd_consent}
          onChange={(event) => setValues({ ...values, lgpd_consent: event.target.checked })}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium block">Consentimento LGPD registrado</span>
          <span className="text-xs text-muted-foreground">Marque quando o cliente autorizou o tratamento dos dados.</span>
        </span>
      </label>
      <Field label="Notas">
        <textarea rows={4} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} className={cn(inputCls, 'h-auto py-2.5')} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar cliente'}
        </Button>
      </div>
    </form>
  )
}

function ActivityForm({ workspaceId, clientId, team, onClose }: { workspaceId: string; clientId: string; team: TeamMember[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [activityAt, setActivityAt] = useState(() => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
  })
  const [status, setStatus] = useState<ActivityStatus>('agendado')
  const [responsibleId, setResponsibleId] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Informe o título da atividade.')
      const activityDate = new Date(activityAt)
      if (Number.isNaN(activityDate.getTime())) throw new Error('Informe a data e hora da atividade.')
      const { error } = await supabase.from('client_activities').insert({
        workspace_id: workspaceId,
        client_id: clientId,
        title: title.trim(),
        description: description.trim() || null,
        activity_at: activityDate.toISOString(),
        status,
        responsible_id: responsibleId || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['client-activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['report-activities', workspaceId] })
      toast.show('Atividade registrada.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  return (
    <form
      className="mt-4 space-y-3 rounded-md border border-border p-3"
      onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}
    >
      <Field label="Título">
        <input required value={title} onChange={(event) => setTitle(event.target.value)} className={cn(inputCls, 'h-9')} placeholder="Visita técnica, reunião, pós-venda..." />
      </Field>
      <Field label="Descrição">
        <input value={description} onChange={(event) => setDescription(event.target.value)} className={cn(inputCls, 'h-9')} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data e hora">
          <input required type="datetime-local" value={activityAt} onChange={(event) => setActivityAt(event.target.value)} className={cn(inputCls, 'h-9')} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value as ActivityStatus)} className={cn(inputCls, 'h-9')}>
            {Object.entries(ACTIVITY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Responsável">
        <select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)} className={cn(inputCls, 'h-9')}>
          <option value="">Sem responsável</option>
          {team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Registrar'}
        </Button>
      </div>
    </form>
  )
}

export default function Clientes() {
  const { workspaceId } = useWorkspace()
  const { canWrite } = usePermissions()
  const [selected, setSelected] = useState<ClientSummary | null>(null)
  const [editing, setEditing] = useState<ClientSummary | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [q, setQ] = useState('')

  const clientsQuery = useQuery({
    queryKey: ['clients', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_client_summary')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('name')
        .returns<ClientSummary[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const activitiesQuery = useQuery({
    queryKey: ['client-activities', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_activities')
        .select('*, team_members(name)')
        .eq('workspace_id', workspaceId!)
        .order('activity_at', { ascending: false })
        .returns<ClientActivity[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const teamQuery = useQuery({
    queryKey: ['team-members', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('name')
        .returns<TeamMember[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const clients = clientsQuery.data ?? []
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return clients
    return clients.filter((client) =>
      [client.name, client.contact_name, client.email, client.phone].some((value) => value?.toLowerCase().includes(term)),
    )
  }, [clients, q])

  const total = clients.reduce((sum, client) => sum + Number(client.total_value), 0)
  const selectedActivities = (activitiesQuery.data ?? []).filter((activity) => activity.client_id === selected?.id)

  const openNew = () => { if (!canWrite) return; setEditing(null); setFormOpen(true) }
  const openEdit = (client: ClientSummary) => { if (!canWrite) return; setSelected(null); setActivityOpen(false); setEditing(client); setFormOpen(true) }
  const closeForm = () => { setFormOpen(false); setEditing(null) }

  if (clientsQuery.error) {
    return <QueryError message={(clientsQuery.error as Error).message} onRetry={() => void clientsQuery.refetch()} />
  }

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.length} clientes · ${brl(total)} em projetos`}>
        {canWrite && <Button variant="primary" onClick={openNew}><Plus size={16} /> Novo Cliente</Button>}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Buscar cliente" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por nome, contato, e-mail ou telefone" className={cn(inputCls, 'pl-9')} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr>{['Nome', 'Contato', 'Projetos', 'Valor Total', 'Último Contato', 'Status', 'Ações'].map((header) => <th key={header} className={th}>{header}</th>)}</tr></thead>
            <tbody>
              {clientsQuery.isLoading ? <TableSkeleton cols={7} rows={7} /> : filtered.map((client) => (
                <tr key={client.id} className={cn(tr, 'cursor-pointer')} onClick={() => setSelected(client)}>
                  <td className={td}><span className="flex items-center gap-3"><Avatar name={client.name} /> <span className="font-medium">{client.name}</span></span></td>
                  <td className={td}><p>{client.contact_name || '—'}</p><p className="text-xs text-muted-foreground">{client.email || '—'}</p></td>
                  <td className={`${td} ${mono}`}>{client.project_count}</td>
                  <td className={`${td} ${mono}`}>{brl(Number(client.total_value))}</td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(client.last_contact_at)}</td>
                  <td className={td}><Badge tone={statusTone[labelOf(CLIENT_STATUS_LABELS, client.status)]}>{labelOf(CLIENT_STATUS_LABELS, client.status)}</Badge></td>
                  <td className={td} onClick={(event) => event.stopPropagation()}>
                    <IconButton label="Ver cliente" onClick={() => setSelected(client)}><Eye size={16} /></IconButton>
                    {canWrite && <IconButton label="Editar" onClick={() => openEdit(client)}><Pencil size={16} /></IconButton>}
                  </td>
                </tr>
              ))}
              {!clientsQuery.isLoading && filtered.length === 0 && (
                <tr><td colSpan={7}><EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre um novo cliente." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={!!selected} onClose={() => { setSelected(null); setActivityOpen(false) }} title="Detalhes do Cliente">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <Avatar name={selected.name} size={56} />
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">Cliente desde {new Date(selected.created_at).getFullYear()}</p>
                </div>
              </div>
              {canWrite && <IconButton label="Editar cliente" onClick={() => openEdit(selected)}><Pencil size={16} /></IconButton>}
            </div>

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Mail size={14} className="text-muted-foreground" />{selected.email || 'Não informado'}</p>
              <p className={`flex items-center gap-2 ${mono}`}><Phone size={14} className="text-muted-foreground" />{selected.phone || 'Não informado'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted p-3"><p className="text-xs text-muted-foreground">Total investido</p><p className={`${mono} font-semibold text-lg`}>{brl(Number(selected.total_value))}</p></div>
              <div className="rounded-md bg-muted p-3"><p className="text-xs text-muted-foreground">Projetos</p><p className={`${mono} font-semibold text-lg`}>{selected.project_count}</p></div>
            </div>

            <div className={cn('rounded-md p-3 flex items-start gap-3 text-sm', selected.lgpd_consent ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
              {selected.lgpd_consent ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              <div>
                <p className="font-semibold">LGPD: {selected.lgpd_consent ? 'Consentimento registrado' : 'Consentimento pendente'}</p>
                <p className="text-xs opacity-90">
                  {selected.lgpd_consent
                    ? `Termo aceito em ${formatDate(selected.lgpd_consent_at)}.`
                    : 'Solicite o termo de tratamento de dados ao cliente.'}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico de atividades</h4>
                {canWrite && <Button size="sm" onClick={() => setActivityOpen((open) => !open)}><CalendarPlus size={14} /> Nova</Button>}
              </div>
              {activityOpen && canWrite && (
                <ActivityForm
                  workspaceId={workspaceId!}
                  clientId={selected.id}
                  team={teamQuery.data ?? []}
                  onClose={() => setActivityOpen(false)}
                />
              )}
              {selectedActivities.length === 0 ? (
                <div className="mt-4"><EmptyState title="Sem atividades registradas" description="Registre visitas, reuniões e contatos." /></div>
              ) : (
                <ol className="mt-4 border-l-2 border-border ml-1.5 space-y-4">
                  {selectedActivities.map((activity) => (
                    <li key={activity.id} className="pl-5 relative">
                      <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                      <p className="text-xs text-muted-foreground font-mono">{formatDateTime(activity.activity_at)}</p>
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description || '—'}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {activity.team_members?.name ?? 'Sem responsável'} · {labelOf(ACTIVITY_STATUS_LABELS, activity.status)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notas</h4>
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{selected.notes || 'Nenhuma nota registrada.'}</p>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={formOpen} onClose={closeForm} title={editing ? 'Editar Cliente' : 'Novo Cliente'}>
        <ClientForm key={editing?.id ?? 'new'} workspaceId={workspaceId!} client={editing} onClose={closeForm} />
      </Drawer>
    </>
  )
}
