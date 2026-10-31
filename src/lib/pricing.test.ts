import { describe, expect, it } from 'vitest'
import { calculatePricing, installmentValue } from './pricing'

const items = [
  { quantity: 2, materialUnitCost: 100, laborUnitCost: 50 },
  { quantity: 1, materialUnitCost: 300, laborUnitCost: 80 },
]

describe('calculatePricing', () => {
  it('reproduz a cascata validada na homologação', () => {
    const result = calculatePricing(items, { fixed: 10, margin: 20, tax: 5, cashDiscount: 5 })

    expect(result.material).toBe(500)
    expect(result.labor).toBe(180)
    expect(result.fixed).toBeCloseTo(68, 10)
    expect(result.margin).toBeCloseTo(149.6, 10)
    expect(result.tax).toBeCloseTo(44.88, 10)
    expect(result.total).toBeCloseTo(942.48, 10)
    expect(result.cash).toBeCloseTo(895.356, 10)
  })

  it('retorna tudo zerado quando não há itens', () => {
    expect(calculatePricing([], { fixed: 10, margin: 20, tax: 5, cashDiscount: 5 })).toEqual({
      material: 0,
      labor: 0,
      fixed: 0,
      margin: 0,
      tax: 0,
      total: 0,
      cash: 0,
    })
  })

  it('aplica as camadas em cascata sobre a base anterior', () => {
    const result = calculatePricing(
      [{ quantity: 1, materialUnitCost: 100, laborUnitCost: 0 }],
      { fixed: 10, margin: 20, tax: 5, cashDiscount: 0 },
    )

    expect(result.fixed).toBeCloseTo(10, 10)
    expect(result.margin).toBeCloseTo(22, 10)
    expect(result.tax).toBeCloseTo(6.6, 10)
    expect(result.total).toBeCloseTo(138.6, 10)
    expect(result.cash).toBeCloseTo(138.6, 10)
  })

  it('não aplica desconto à vista quando o percentual é zero', () => {
    const result = calculatePricing(
      [{ quantity: 3, materialUnitCost: 10, laborUnitCost: 5 }],
      { fixed: 0, margin: 0, tax: 0, cashDiscount: 0 },
    )

    expect(result.total).toBe(45)
    expect(result.cash).toBe(45)
  })
})

describe('installmentValue', () => {
  it('divide igualmente quando a taxa é zero', () => {
    expect(installmentValue(1200, 12, 0)).toBe(100)
  })

  it('retorna o total quando a quantidade é zero ou negativa', () => {
    expect(installmentValue(1200, 0, 2)).toBe(1200)
    expect(installmentValue(1200, -3, 2)).toBe(1200)
  })

  it('calcula a parcela com juros compostos', () => {
    expect(installmentValue(1000, 10, 2)).toBeCloseTo(111.3265, 4)
  })

  it('mantém a soma das parcelas acima do total quando há juros', () => {
    expect(installmentValue(1000, 10, 2) * 10).toBeGreaterThan(1000)
  })
})
