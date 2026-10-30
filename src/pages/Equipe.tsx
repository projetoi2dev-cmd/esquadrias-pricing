import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, HardHat, Pencil, Phone, Plus } from 'lucide-react'
import { Avatar, Badge, Button, Card, Drawer, Field, IconButton, PageHeader, brl, cn, inputCls, mono } from '../components/ui'
import { EmptyState, QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { usePermissions } from '../lib/permissions'
import { supabase } from '../lib/supabaseClient'
import type { TeamPerformance } from '../lib/database.types'

interface TeamFormValues {
  name: string
  phone: string
  commission_rate: string
  active: boolean
  skills: string
}

function TeamForm({ workspaceId, member, onClose }: { workspaceId: string; member: TeamPerformance | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [values, setValues] = useState<TeamFormValues>({
    name: member?.name ?? '',
    phone: member?.phone ?? '',
    commission_rate: member ? String(member.commission_rate) : '10',
    active: member?.active ?? true,
    skills: member?.skills.join(', ') ?? '',
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!values.name.trim()) throw new Error('Informe o nome do instalador.')
      const payload = {
        workspace_id: workspaceId,
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        commission_rate: Math.min(100, Math.max(0, Number(values.commission_rate.replace(',', '.')) || 0)),
        active: values.active,
        skills: values.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      }
      if (member) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', member.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('team_members').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-performance', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['team-members', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-installations', workspaceId] })
      toast.show(member ? 'Instalador atualizado.' : 'Instalador cadastrado.')
      onClose()
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  return (
    <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mutation.mutate() }}>
      <Field label="Nome">
        <input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className={inputCls} />
      </Field>
      <Field label="Telefone">
        <input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} className={inputCls} />
      </Field>
      <Field label="Comissão (%)">
        <input type="number" min="0" step="0.1" value={values.commission_rate} onChange={(event) => setValues({ ...values, commission_rate: event.target.value })} className={cn(inputCls, mono)} />
      </Field>
      <Field label="Especialidades (separadas por vírgula)">
        <input value={values.skills} onChange={(event) => setValues({ ...values, skills: event.target.value })} placeholder="Box, Fachada, Portas" className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} />
        Instalador ativo
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar instalador'}
        </Button>
      </div>
    </form>
  )
}

export default function Equipe() {
  const { workspaceId } = useWorkspace()
  const { canWrite } = usePermissions()
  const [editing, setEditing] = useState<TeamPerformance | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const teamQuery = useQuery({
    queryKey: ['team-performance', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_performance')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('name')
        .returns<TeamPerformance[]>()
      if (error) throw error
      return data ?? []
    },
  })

  const team = teamQuery.data ?? []
  const openNew = () => { if (!canWrite) return; setEditing(null); setFormOpen(true) }
  const openEdit = (member: TeamPerformance) => { if (!canWrite) return; setEditing(member); setFormOpen(true) }
  const closeForm = () => { setFormOpen(false); setEditing(null) }

  if (teamQuery.error) {
    return <QueryError message={(teamQuery.error as Error).message} onRetry={() => void teamQuery.refetch()} />
  }

  return (
    <>
      <PageHeader title="Equipe de Instalação" subtitle={`${team.filter((member) => member.active).length} instaladores ativos`}>
        {canWrite && <Button variant="primary" onClick={openNew}><Plus size={16} /> Novo Instalador</Button>}
      </PageHeader>

      {team.length === 0 && !teamQuery.isLoading ? (
        <EmptyState title="Nenhum instalador cadastrado" description="Cadastre a equipe para acompanhar instalações e comissões." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((member, index) => (
            <Card key={member.id} className="overflow-hidden hover:shadow-md hover:border-primary/40 transition">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar name={member.name} size={56} tone={index} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{member.name}</h3>
                      <span className="flex items-center gap-1">
                        <Badge tone={member.active ? 'success' : 'neutral'}>{member.active ? 'Ativo' : 'Inativo'}</Badge>
                        {canWrite && <IconButton label="Editar instalador" onClick={() => openEdit(member)}><Pencil size={15} /></IconButton>}
                      </span>
                    </div>
                    <p className={`${mono} text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5`}><Phone size={12} /> {member.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {member.skills.length === 0 && <span className="text-xs text-muted-foreground">Sem especialidades cadastradas</span>}
                  {member.skills.map((skill) => <span key={skill} className="text-xs rounded-md bg-muted px-2 py-1 text-muted-foreground font-medium">{skill}</span>)}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Comissão <span className={`${mono} font-semibold text-foreground ml-1`}>{String(member.commission_rate).replace('.', ',')}%</span></p>
              </div>
              <div className="grid grid-cols-2 border-t border-border bg-muted/40 divide-x divide-border">
                <div className="px-5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><HardHat size={12} /> Instalações</p>
                  <p className={`${mono} text-lg font-semibold mt-0.5`}>{member.installations_count}</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Banknote size={12} /> Receita gerada</p>
                  <p className={`${mono} text-lg font-semibold mt-0.5`}>{brl(Number(member.revenue_generated))}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={formOpen} onClose={closeForm} title={editing ? 'Editar Instalador' : 'Novo Instalador'}>
        <TeamForm key={editing?.id ?? 'new'} workspaceId={workspaceId!} member={editing} onClose={closeForm} />
      </Drawer>
    </>
  )
}
