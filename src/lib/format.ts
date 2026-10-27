const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

export function parseDate(value: string | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | Date | null | undefined) {
  const date = parseDate(value)
  return date ? dateFormatter.format(date) : '—'
}

export function formatShortDate(value: string | Date | null | undefined) {
  const date = parseDate(value)
  return date ? shortDateFormatter.format(date) : '—'
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${dateFormatter.format(date)} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatMonth(value: string | Date | null | undefined) {
  const date = parseDate(value)
  if (!date) return '—'
  return monthFormatter.format(date).replace('.', '').replace(/^./, (c) => c.toUpperCase())
}

export function formatMonthYear(value: string | Date | null | undefined) {
  const date = parseDate(value)
  if (!date) return '—'
  return monthYearFormatter.format(date).replace(/^./, (c) => c.toUpperCase())
}

export function formatWeekday(value: string | Date | null | undefined) {
  const date = parseDate(value)
  return date ? weekdayFormatter.format(date).replace('.', '') : '—'
}

export function toDateInput(value: string | Date | null | undefined) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : localDateKey(date)
}

export function todayInput() {
  return localDateKey(new Date())
}

export function monthInput(value = new Date()) {
  return localDateKey(value).slice(0, 7)
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
