// Conversión ARS -> USD usando la cotización (venta) de la fecha del show.
// Regla (definida con Fede): hasta el 13/04/2025 se usa el dólar BLUE; desde el
// 14/04/2025 (salida del cepo) se usa el OFICIAL. Siempre valor vendedor.

export interface UsdRate {
  rate_date: string            // 'YYYY-MM-DD'
  blue_sell: number | null
  oficial_sell: number | null
}

const CUTOVER = '2025-04-14'   // desde esta fecha: oficial; antes: blue

// 'YYYY-MM-DD' (hora de Argentina) para alinear con las cotizaciones.
// Acepta tanto un `date` ya en 'YYYY-MM-DD' (movement_date) como un timestamptz ISO (show_date).
export function dateKeyOf(value: string | null): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

// Balances en USD real a partir de movimientos de cuenta. Los movimientos en ARS se
// convierten al dólar de su fecha; los movimientos ya en USD (borderós internacionales)
// se suman directos. ganado = créditos, cobrado = débitos.
export function usdBalances(
  movs: { direction: string; amount: number; currency: string; movement_date: string | null }[],
  rateFor: (dateKey: string | null) => number | null,
): { ganado: number; cobrado: number; saldo: number; sinRate: number } {
  let ganado = 0, cobrado = 0, sinRate = 0
  for (const m of movs) {
    let usd: number
    if (m.currency === 'USD') {
      usd = Number(m.amount) || 0              // ya está en dólares (internacional)
    } else if (m.currency === 'ARS') {
      const rate = rateFor(dateKeyOf(m.movement_date))
      if (!rate) { sinRate++; continue }
      usd = (Number(m.amount) || 0) / rate
    } else {
      continue                                  // otras monedas no se suman al USD real
    }
    if (m.direction === 'credit') ganado += usd; else cobrado += usd
  }
  return { ganado, cobrado, saldo: ganado - cobrado, sinRate }
}

// Devuelve una función rateFor(dateKey) -> valor del dólar a usar ese día (o el último previo).
export function buildRateLookup(rates: UsdRate[]) {
  const sorted = [...rates].sort((a, b) => a.rate_date.localeCompare(b.rate_date))
  const dates = sorted.map(r => r.rate_date)
  return function rateFor(dateKey: string | null): number | null {
    if (!dateKey) return null
    // última cotización con rate_date <= dateKey (cubre findes/feriados con el día hábil previo)
    let lo = 0, hi = dates.length - 1, idx = -1
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (dates[mid] <= dateKey) { idx = mid; lo = mid + 1 } else hi = mid - 1 }
    if (idx < 0) return null
    const r = sorted[idx]
    const v = dateKey >= CUTOVER ? r.oficial_sell : r.blue_sell
    return v ?? r.oficial_sell ?? r.blue_sell ?? null
  }
}

export function fmtUsd(n: number): string {
  return `US$ ${Math.round(n).toLocaleString('es-AR')}`
}
