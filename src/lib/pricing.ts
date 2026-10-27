export interface PricingItem {
  quantity: number
  materialUnitCost: number
  laborUnitCost: number
}

export interface PricingPercentages {
  fixed: number
  margin: number
  tax: number
  cashDiscount: number
}

export interface PricingResult {
  material: number
  labor: number
  fixed: number
  margin: number
  tax: number
  total: number
  cash: number
}

export function calculatePricing(items: PricingItem[], pct: PricingPercentages): PricingResult {
  const material = items.reduce((sum, item) => sum + item.materialUnitCost * item.quantity, 0)
  const labor = items.reduce((sum, item) => sum + item.laborUnitCost * item.quantity, 0)
  const fixed = (material + labor) * (pct.fixed / 100)
  const margin = (material + labor + fixed) * (pct.margin / 100)
  const tax = (material + labor + fixed + margin) * (pct.tax / 100)
  const total = material + labor + fixed + margin + tax
  const cash = total * (1 - pct.cashDiscount / 100)

  return { material, labor, fixed, margin, tax, total, cash }
}

export function installmentValue(total: number, count: number, monthlyRate: number) {
  const rate = monthlyRate / 100
  if (count <= 0) return total
  if (rate === 0) return total / count
  return (total * rate) / (1 - Math.pow(1 + rate, -count))
}
