import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, LogOut, Save, ShieldCheck, UserRound, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, Field, PageHeader, brl, cn, inputCls, mono } from '../components/ui'
import { QueryError } from '../components/States'
import { useToast } from '../components/Toast'
import { useWorkspace } from '../lib/workspace'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabaseClient'
import { ROLE_LABELS } from '../lib/constants'
import type { Profile, WorkspaceMember, WorkspaceMemberWithProfile, WorkspaceRole } from '../lib/database.types'

export default function Configuracoes() {
  const { workspace, workspaceId, role } = useWorkspace()
  const { user, profile, refreshProfile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [workspaceForm, setWorkspaceForm] = useState({
    name: workspace?.name ?? '',
    cnpj: workspace?.cnpj ?? '',
    phone: workspace?.phone ?? '',
    email: workspace?.email ?? '',
    address: workspace?.address ?? '',
  })
  const [profileName, setProfileName] = useState(profile?.full_name ?? '')

  useEffect(() => {
    setProfileName(profile?.full_name ?? '')
  }, [profile?.full_name])

  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at')
        .returns<WorkspaceMember[]>()
      if (error) throw error

      if (!members || members.length === 0) return []

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', members.map((member) => member.user_id))
        .returns<Pick<Profile, 'id' | 'full_name' | 'email'>[]>()
      if (profilesError) throw profilesError

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
      return members.map<WorkspaceMemberWithProfile>((member) => ({
        ...member,
        profiles: profilesById.get(member.user_id) ?? null,
      }))
    },
  })

  const workspaceMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceForm.name.trim()) throw new Error('Informe o nome do workspace.')
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceForm.name.trim(),
          cnpj: workspaceForm.cnpj.trim() || null,
          phone: workspaceForm.phone.trim() || null,
          email: workspaceForm.email.trim() || null,
          address: workspaceForm.address.trim() || null,
        })
        .eq('id', workspaceId!)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspace-membership'] })
      toast.show('Dados do workspace atualizados.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!profileName.trim()) throw new Error('Informe seu nome.')
      const { error } = await supabase.from('profiles').update({ full_name: profileName.trim() }).eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await refreshProfile()
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
      toast.show('Perfil atualizado.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const roleMutation = useMutation({
    mutationFn: async ({ member, nextRole }: { member: WorkspaceMemberWithProfile; nextRole: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: nextRole })
        .eq('workspace_id', member.workspace_id)
        .eq('user_id', member.user_id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
      toast.show('Permissão atualizada.')
    },
    onError: (error: Error) => toast.show(error.message, 'error'),
  })

  const canWrite = role === 'admin' || role === 'gerente'
  const isAdmin = role === 'admin'
  const members = membersQuery.data ?? []

  return (
    <>
      <PageHeader title="Configurações" subtitle="Workspace, perfil e permissões de acesso">
        <Badge tone="success"><ShieldCheck size={13} /> Sessão segura</Badge>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 size={18} className="text-primary" />
              <h3 className="font-semibold">Dados do workspace</h3>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => { event.preventDefault(); workspaceMutation.mutate() }}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nome">
                  <input disabled={!canWrite} value={workspaceForm.name} onChange={(event) => setWorkspaceForm({ ...workspaceForm, name: event.target.value })} className={inputCls} />
                </Field>
                <Field label="CNPJ">
                  <input disabled={!canWrite} value={workspaceForm.cnpj} onChange={(event) => setWorkspaceForm({ ...workspaceForm, cnpj: event.target.value })} className={cn(inputCls, mono)} />
                </Field>
                <Field label="Telefone">
                  <input disabled={!canWrite} value={workspaceForm.phone} onChange={(event) => setWorkspaceForm({ ...workspaceForm, phone: event.target.value })} className={inputCls} />
                </Field>
                <Field label="E-mail">
                  <input type="email" disabled={!canWrite} value={workspaceForm.email} onChange={(event) => setWorkspaceForm({ ...workspaceForm, email: event.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Endereço">
                <input disabled={!canWrite} value={workspaceForm.address} onChange={(event) => setWorkspaceForm({ ...workspaceForm, address: event.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-3 gap-3 rounded-md bg-muted p-3 text-xs">
                <div><p className="text-muted-foreground">Margem padrão</p><p className={`${mono} font-semibold`}>{workspace?.default_margin}%</p></div>
                <div><p className="text-muted-foreground">Imposto padrão</p><p className={`${mono} font-semibold`}>{workspace?.default_tax}%</p></div>
                <div><p className="text-muted-foreground">Custo fixo</p><p className={`${mono} font-semibold`}>{workspace?.default_fixed_cost}%</p></div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {canWrite ? 'As alterações são registradas no workspace.' : 'Seu perfil é somente leitura para estes dados.'}
                </p>
                <Button type="submit" variant="primary" disabled={!canWrite || workspaceMutation.isPending}>
                  <Save size={15} /> {workspaceMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Users size={18} className="text-primary" />
              <h3 className="font-semibold">Membros do workspace</h3>
            </div>
            {membersQuery.error ? (
              <QueryError message={(membersQuery.error as Error).message} onRetry={() => void membersQuery.refetch()} />
            ) : (
              <div className="divide-y divide-border">
                {members.map((member) => {
                  const name = member.profiles?.full_name || member.profiles?.email || 'Usuário'
                  const isSelf = member.user_id === user?.id
                  return (
                    <div key={member.user_id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar name={name} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{name} {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.profiles?.email}</p>
                      </div>
                      {isAdmin && !isSelf ? (
                        <select
                          aria-label={`Permissão de ${name}`}
                          value={member.role}
                          onChange={(event) => roleMutation.mutate({ member, nextRole: event.target.value as WorkspaceRole })}
                          className={cn(inputCls, 'h-8 w-40 text-xs')}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      ) : (
                        <Badge tone={member.role === 'admin' ? 'info' : 'neutral'}>{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Novos usuários são criados no Supabase Auth pelo administrador e vinculados ao workspace pelo SQL de bootstrap.
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <UserRound size={18} className="text-primary" />
              <h3 className="font-semibold">Meu perfil</h3>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <Avatar name={profileName || 'Usuário'} size={48} tone={4} />
              <div>
                <p className="text-sm font-medium">{profileName || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || user?.email}</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); profileMutation.mutate() }}>
              <Field label="Nome completo">
                <input required value={profileName} onChange={(event) => setProfileName(event.target.value)} className={inputCls} />
              </Field>
              <Field label="E-mail de acesso">
                <input disabled value={profile?.email || user?.email || ''} className={cn(inputCls, 'opacity-70')} />
              </Field>
              <Button type="submit" variant="primary" className="w-full" disabled={profileMutation.isPending}>
                <Save size={15} /> {profileMutation.isPending ? 'Salvando...' : 'Salvar perfil'}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">Sobre o workspace</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Identificador</dt><dd className={mono}>{workspace?.slug}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Seu papel</dt><dd>{role ? ROLE_LABELS[role] : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Saldo inicial</dt><dd className={mono}>{brl(Number(workspace?.opening_balance ?? 0))}</dd></div>
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold">Sessão</h3>
            <p className="text-xs text-muted-foreground mt-1">Encerre o acesso neste dispositivo.</p>
            <Button variant="danger" className="mt-4 w-full" onClick={() => void signOut()}>
              <LogOut size={15} /> Sair da conta
            </Button>
          </Card>
        </div>
      </div>
    </>
  )
}
