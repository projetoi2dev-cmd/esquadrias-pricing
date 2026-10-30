import { useWorkspace } from './workspace'
import type { WorkspaceRole } from './database.types'

const WRITE_ROLES: WorkspaceRole[] = ['admin', 'gerente', 'orcamentista']
const MANAGE_ROLES: WorkspaceRole[] = ['admin', 'gerente']

export function usePermissions() {
  const { role } = useWorkspace()

  return {
    role,
    canWrite: role !== null && WRITE_ROLES.includes(role),
    canManage: role !== null && MANAGE_ROLES.includes(role),
    isAdmin: role === 'admin',
    isViewer: role === 'visualizador',
  }
}
