import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatMonth,
  formatMonthYear,
  formatShortDate,
  formatWeekday,
  monthInput,
  parseDate,
  toDateInput,
  todayInput,
} from './format'

describe('parseDate', () => {
  it('interpreta datas ISO sem fuso ao meio-dia local', () => {
    const date = parseDate('2026-10-31')

    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getMonth()).toBe(9)
    expect(date!.getDate()).toBe(31)
    expect(date!.getHours()).toBe(12)
  })

  it('aceita Date válido e rejeita valores inválidos', () => {
    const valid = new Date(2026, 9, 31, 12)

    expect(parseDate(valid)).toBe(valid)
    expect(parseDate('2026-13-99')).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate(new Date('invalid'))).toBeNull()
  })
})

describe('formatadores', () => {
  it('formata datas em pt-BR', () => {
    expect(formatDate('2026-10-31')).toBe('31/10/2026')
    expect(formatShortDate('2026-10-31')).toBe('31/10')
    expect(formatMonth('2026-01-15')).toBe('Jan')
    expect(formatMonthYear('2026-10-31')).toBe('Outubro de 2026')
    expect(formatWeekday('2026-10-31')).toBe('sáb')
  })

  it('formata data e hora local', () => {
    expect(formatDateTime('2026-10-31T14:30:00')).toBe('31/10/2026 14:30')
  })

  it('usa travessão para valores ausentes ou inválidos', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatShortDate('inválida')).toBe('—')
    expect(formatMonth('')).toBe('—')
    expect(formatMonthYear(null)).toBe('—')
    expect(formatWeekday(undefined)).toBe('—')
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('inválida')).toBe('—')
  })
})

describe('toDateInput', () => {
  it('preserva datas já no formato de input', () => {
    expect(toDateInput('2026-10-31')).toBe('2026-10-31')
  })

  it('converte Date local para YYYY-MM-DD', () => {
    expect(toDateInput(new Date(2026, 0, 5, 23))).toBe('2026-01-05')
  })

  it('retorna vazio para valores ausentes ou inválidos', () => {
    expect(toDateInput(null)).toBe('')
    expect(toDateInput('')).toBe('')
    expect(toDateInput('inválida')).toBe('')
  })
})

describe('todayInput e monthInput', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('usa a data local atual', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 31, 12))

    expect(todayInput()).toBe('2026-10-31')
    expect(monthInput()).toBe('2026-10')
    expect(monthInput(new Date(2026, 0, 15))).toBe('2026-01')
  })
})
