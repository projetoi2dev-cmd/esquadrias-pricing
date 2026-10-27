import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { brl } from '../../components/ui'
import { formatDate, todayInput } from '../format'

interface MaterialAlert {
  name: string
  stock_quantity: number
  stock_capacity: number
}

interface TransactionAlert {
  description: string
  amount: number
  due_date: string
  status: string
  type: 'receivable' | 'payable'
}

interface QuoteAlert {
  code: string
  total: number
  clients: { name: string } | null
}

export function useNotifications(workspaceId: string | null) {
  return useQuery({
    queryKey: ['notifications', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const [materialsResult, transactionsResult, quotesResult] = await Promise.all([
        supabase
          .from('materials')
          .select('name, stock_quantity, stock_capacity')
          .eq('workspace_id', workspaceId!)
          .returns<MaterialAlert[]>(),
        supabase
          .from('transactions')
          .select('description, amount, due_date, status, type')
          .eq('workspace_id', workspaceId!)
          .in('status', ['pendente', 'atrasado'])
          .order('due_date')
          .returns<TransactionAlert[]>(),
        supabase
          .from('quotes')
          .select('code, total, clients(name)')
          .eq('workspace_id', workspaceId!)
          .eq('status', 'aprovado')
          .order('updated_at', { ascending: false })
          .limit(1)
          .returns<QuoteAlert[]>(),
      ])

      if (materialsResult.error) throw materialsResult.error
      if (transactionsResult.error) throw transactionsResult.error
      if (quotesResult.error) throw quotesResult.error

      const notes: { id: string; text: string }[] = []
      const lowStock = (materialsResult.data ?? []).filter(
        (material) => material.stock_capacity > 0 && (material.stock_quantity / material.stock_capacity) * 100 < 20,
      )
      for (const material of lowStock.slice(0, 2)) {
        notes.push({ id: `stock-${material.name}`, text: `Estoque baixo: ${material.name}` })
      }

      const today = todayInput()
      const overdue = (transactionsResult.data ?? []).filter(
        (transaction) => transaction.status === 'atrasado' || (transaction.status === 'pendente' && transaction.due_date < today),
      )
      if (overdue.length > 0) {
        const total = overdue.reduce((sum, transaction) => sum + transaction.amount, 0)
        notes.push({
          id: 'overdue',
          text: `${overdue.length} conta(s) em atraso · ${brl(total)} · desde ${formatDate(overdue[0].due_date)}`,
        })
      }

      const lastApproved = quotesResult.data?.[0]
      if (lastApproved) {
        notes.push({
          id: `quote-${lastApproved.code}`,
          text: `Orçamento ${lastApproved.code} aprovado · ${lastApproved.clients?.name ?? ''} · ${brl(lastApproved.total)}`,
        })
      }

      return notes
    },
  })
}
