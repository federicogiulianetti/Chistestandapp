export interface Movement {
  id: string
  party_type: string
  party_id: string
  direction: string        // 'credit' (ganó) | 'debit' (se le pagó)
  amount: number
  currency: string
  movement_date: string
  concept: string | null
  source: string           // 'bordero' | 'manual'
  show_id: string | null
}

export interface CurrencyBalance {
  currency: string
  ganado: number
  cobrado: number
  balance: number          // ganado − cobrado = falta cobrar
}

export function balancesByCurrency(movs: Movement[]): CurrencyBalance[] {
  const map = new Map<string, CurrencyBalance>()
  for (const m of movs) {
    const cur = map.get(m.currency) ?? { currency: m.currency, ganado: 0, cobrado: 0, balance: 0 }
    if (m.direction === 'credit') cur.ganado += Number(m.amount) || 0
    else cur.cobrado += Number(m.amount) || 0
    cur.balance = cur.ganado - cur.cobrado
    map.set(m.currency, cur)
  }
  return Array.from(map.values()).sort((a, b) => a.currency.localeCompare(b.currency))
}

export function fmt(n: number, currency = 'ARS'): string {
  const sign = currency === 'ARS' ? '$' : `${currency} `
  return `${sign}${Math.round(n).toLocaleString('es-AR')}`
}
