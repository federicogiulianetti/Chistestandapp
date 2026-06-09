// Conversión ARS -> USD usando la cotización (venta) de la fecha del show.
// Regla (definida con Fede): hasta el 13/04/2025 se usa el dólar BLUE; desde el
// 14/04/2025 (salida del cepo) se usa el OFICIAL. Siempre valor vendedor.

export interface UsdRate {
  rate_date: string            // 'YYYY-MM-DD'
  blue_sell: number | null
  oficial_sell: number | null
}

const CUTOVER = '2025-04-14'   // desde esta fecha: oficial; antes: blue

// 'YYYY-MM-DD' del show en hora de Argentina (para alinear con las cotizaciones)
export function dateKeyOf(showDate: string | null): string | null {
  if (!showDate) return null
  const d = new Date(showDate)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
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
