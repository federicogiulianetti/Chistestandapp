/** Tipos de cargo en la cuenta de cada persona del staff. */
export const CHARGE_TYPES: { key: string; label: string; feedsGastos: boolean }[] = [
  { key: 'mensual_fijo', label: 'Mensual fijo', feedsGastos: false },
  { key: 'mensual_repartido', label: 'Mensual (repartido en fechas)', feedsGastos: true },
  { key: 'por_fecha', label: 'Por fecha', feedsGastos: true },
  { key: 'reembolso', label: 'Reembolso (gasto adelantado)', feedsGastos: false },
]

export const CHARGE_TYPE_KEYS = new Set(CHARGE_TYPES.map(c => c.key))
export const chargeTypeLabel = (k: string | null): string =>
  k ? (CHARGE_TYPES.find(c => c.key === k)?.label ?? k) : ''

export type StaffMovement = {
  id: string
  movement_date: string
  concept: string | null
  amount: number
  direction: 'credit' | 'debit'
  charge_type: string | null
  currency: string
}

/** Saldo (lo que se le debe) por moneda. credit = se le debe, debit = pago. */
export function staffBalance(movs: StaffMovement[]): { currency: string; balance: number }[] {
  const m = new Map<string, number>()
  for (const mv of movs) {
    const delta = (mv.direction === 'credit' ? 1 : -1) * Number(mv.amount)
    m.set(mv.currency, (m.get(mv.currency) ?? 0) + delta)
  }
  return [...m.entries()].map(([currency, balance]) => ({ currency, balance }))
}

export function fmtMoney(n: number, currency = 'ARS'): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.round(n)).toLocaleString('es-AR')
  return currency === 'USD' ? `${sign}USD ${abs}` : `${sign}$${abs}`
}
