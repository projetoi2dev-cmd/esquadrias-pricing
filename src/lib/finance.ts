import type { Transaction } from './database.types'
import { formatDate, formatMonth, parseDate, toDateInput } from './format'

export type Granularity = 'd' | 'w' | 'm'

export interface CashRow {
  p: string
  in: number
  out: number
}

export interface CashRowWithBalance extends CashRow {
  bal: number
}

export const isSettledTransaction = (transaction: Transaction) =>
  (transaction.type === 'receivable' && transaction.status === 'recebido') ||
  (transaction.type === 'payable' && transaction.status === 'pago')

const dayKey = (date: Date) => toDateInput(date)

const mondayKey = (date: Date) => {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return dayKey(copy)
}

const monthKey = (date: Date) => toDateInput(date).slice(0, 7)

export function buildCashSeries(transactions: Transaction[], granularity: Granularity, points: number): CashRow[] {
  const now = new Date()
  const buckets: { key: string; label: string; in: number; out: number }[] = []

  if (granularity === 'd') {
    for (let i = points - 1; i >= 0; i -= 1) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      buckets.push({ key: dayKey(date), label: formatDate(date).slice(0, 5), in: 0, out: 0 })
    }
  } else if (granularity === 'w') {
    for (let i = points - 1; i >= 0; i -= 1) {
      const date = new Date(now)
      date.setDate(now.getDate() - i * 7)
      buckets.push({ key: mondayKey(date), label: `Sem ${formatDate(date).slice(0, 5)}`, in: 0, out: 0 })
    }
  } else {
    for (let i = points - 1; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({ key: monthKey(date), label: formatMonth(date), in: 0, out: 0 })
    }
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const transaction of transactions) {
    if (!isSettledTransaction(transaction)) continue
    const date = parseDate(transaction.paid_at)
    if (!date) continue
    const key = granularity === 'd' ? dayKey(date) : granularity === 'w' ? mondayKey(date) : monthKey(date)
    const bucket = byKey.get(key)
    if (!bucket) continue
    if (transaction.type === 'receivable') bucket.in += transaction.amount
    else bucket.out -= transaction.amount
  }

  return buckets.map((bucket) => ({ p: bucket.label, in: bucket.in, out: bucket.out }))
}

export function withBalance(rows: CashRow[], start: number): CashRowWithBalance[] {
  let balance = start
  return rows.map((row) => {
    balance += row.in + row.out
    return { ...row, bal: Math.round(balance) }
  })
}
