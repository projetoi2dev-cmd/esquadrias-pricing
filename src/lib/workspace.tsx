import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabaseClient'
import { useAuth } from './auth'
import type { Workspace, WorkspaceRole } from './database.types'

interface MembershipRow {
  workspace_id: string
  role: WorkspaceRole
  workspaces: Workspace | null
}

interface WorkspaceContextValue {
  workspace: Workspace | null
  workspaceId: string | null
  role: WorkspaceRole | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['workspace-membership', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces(*)')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle()
        .returns<MembershipRow | null>()

      if (error) throw error
      return data
    },
  })

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace: query.data?.workspaces ?? null,
      workspaceId: query.data?.workspace_id ?? null,
      role: query.data?.role ?? null,
      loading: query.isLoading,
      error: (query.error as Error | null) ?? null,
      refetch: () => void query.refetch(),
    }),
    [query.data, query.error, query.isLoading, query.refetch],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider')
  return value
}
