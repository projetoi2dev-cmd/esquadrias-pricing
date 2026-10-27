import { createContext, useContext } from 'react'

export type PageId =
  | 'dashboard'
  | 'orcamentos'
  | 'materiais'
  | 'projetos'
  | 'equipe'
  | 'financeiro'
  | 'relatorios'
  | 'clientes'
  | 'config'

export const NavigationContext = createContext<(page: PageId) => void>(() => {})

export function useNavigate() {
  return useContext(NavigationContext)
}
