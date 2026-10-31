import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCashSeries, isSettledTransaction, withBalance } from './finance'
import type { Transaction } from './database.types'

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx',
  workspace_id: 'ws',
  type: 'receivable',
  description: 'Teste',
  category: null,
  client_id: null,
  supplier_id: null,
  amount: 100,
  due_date: '2026-10-31',
  paid_at: '2026-10-31',
  status: 'recebido',
  created_at: '2026-10-31T12:00:00',
  updated_at: '2026-10-31T12:00:00',
  ...overrides,
})

describe('isSettledTransaction', () => {
  it('considera recebíveis recebidos e pagáveis pagos como liquidados', () => {
    expect(isSettledTransaction(transaction({ type: 'receivable', status: 'recebido' }))).toBe(true)
    expect(isSettledTransaction(transaction({ type: 'payable', status: 'pago' }))).toBe(true)
  })

  it('ignora transações pendentes, atrasadas ou com status incompatível', () => {
    expect(isSettledTransaction(transaction({ type: 'receivable', status: 'pendente' }))).toBe(false)
    expect(isSettledTransaction(transaction({ type: 'receivable', status: 'atrasado' }))).toBe(false)
    expect(isSettledTransaction(transaction({ type: 'payable', status: 'pendente' }))).toBe(false)
    expect(isSettledTransaction(transaction({ type: 'receivable', status: 'pago' }))).toBe(false)
    expect(isSettledTransaction(transaction({ type: 'payable', status: 'recebido' }))).toBe(false)
  })
})

describe('withBalance', () => {
  it('acumula entradas e saídas a partir do saldo inicial', () => {
    expect(
      withBalance(
        [
          { p: '01/10', in: 100, out: 0 },
          { p: '02/10', in: 0, out: -40 },
          { p: '03/10', in: 50, out: -10 },
        ],
        200,
      ),
    ).toEqual([
      { p: '01/10', in: 100, out: 0, bal: 300 },
      { p: '02/10', in: 0, out: -40, bal: 260 },
      { p: '03/10', in: 50, out: -10, bal: 300 },
    ])
  })

  it('arredonda o saldo acumulado', () => {
    const balances = withBalance(
      [
        { p: '01/10', in: 10.4, out: 0 },
        { p: '02/10', in: 0, out: -0.2 },
      ],
      0,
    ).map((row) => row.bal)

    expect(balances).toEqual([10, 10])
  })
})

describe('buildCashSeries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 31, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('monta buckets diários e ignora transações não liquidadas', () => {
    const rows = buildCashSeries(
      [
        transaction({ type: 'receivable', status: 'recebido', amount: 100, paid_at: '2026-10-31' }),
        transaction({ type: 'payable', status: 'pago', amount: 40, paid_at: '2026-10-30' }),
        transaction({ type: 'receivable', status: 'pendente', amount: 999, paid_at: '2026-10-31' }),
      ],
      'd',
      3,
    )

    expect(rows).toEqual([
      { p: '29/10', in: 0, out: 0 },
      { p: '30/10', in: 0, out: -40 },
      { p: '31/10', in: 100, out: 0 },
    ])
  })

  it('agrupa por semana usando a segunda-feira como chave', () => {
    const rows = buildCashSeries(
      [
        transaction({ type: 'receivable', status: 'recebido', amount: 100, paid_at: '2026-10-28' }),
        transaction({ type: 'payable', status: 'pago', amount: 40, paid_at: '2026-10-20' }),
        transaction({ type: 'receivable', status: 'recebido', amount: 999, paid_at: '2026-10-01' }),
      ],
      'w',
      2,
    )

    expect(rows).toEqual([
      { p: 'Sem 24/10', in: 0, out: -40 },
      { p: 'Sem 31/10', in: 100, out: 0 },
    ])
  })

  it('agrupa por mês e ignora datas fora da janela', () => {
    const rows = buildCashSeries(
      [
        transaction({ type: 'receivable', status: 'recebido', amount: 100, paid_at: '2026-10-15' }),
        transaction({ type: 'payable', status: 'pago', amount: 40, paid_at: '2026-09-15' }),
        transaction({ type: 'receivable', status: 'recebido', amount: 999, paid_at: '2026-08-15' }),
        transaction({ type: 'receivable', status: 'recebido', amount: 999, paid_at: '2026-07-15' }),
      ],
      'm',
      3,
    )

    expect(rows).toEqual([
      { p: 'Ago', in: 999, out: 0 },
      { p: 'Set', in: 0, out: -40 },
      { p: 'Out', in: 100, out: 0 },
    ])
  })

  it('ignora paid_at inválido', () => {
    const rows = buildCashSeries([transaction({ paid_at: 'data-invalida' })], 'd', 1)

    expect(rows).toEqual([{ p: '31/10', in: 0, out: 0 }])
  })
})
