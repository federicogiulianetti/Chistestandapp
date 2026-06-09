import { arDateKey } from '@/lib/shows'

export interface SaleRow {
  id: string
  sale_date: string
  qty_sold: number
  unit_price: number | null
  notes: string | null
}

export interface SalesSetup {
  capacity: number | null
  reserved_seats: number
  courtesy_count: number
  ticket_price: number | null
  show_date: string | null
}

export interface SalesSummary {
  vendidas: number
  recaudacion: number
  capacity: number
  reserved: number
  courtesy: number
  capacityToSell: number   // capacidad − reservadas − cortesías
  remaining: number        // quedan a la venta = capacityToSell − vendidas
  asistencia: number       // vendidas + cortesías (gente en sala)
  ocupacion: number        // asistencia / capacidad (0..1)
  pctVendido: number       // vendidas / capacityToSell (0..1)
  daysLeft: number | null
}

// Días enteros entre dos claves "YYYY-MM-DD" (b − a)
function daysBetween(aKey: string, bKey: string): number {
  const [ay, am, ad] = aKey.split('-').map(Number)
  const [by, bm, bd] = bKey.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86400000)
}

export function summarizeSales(rows: SaleRow[], setup: SalesSetup, todayKey: string): SalesSummary {
  const vendidas = rows.reduce((a, r) => a + (r.qty_sold || 0), 0)
  const recaudacion = rows.reduce((a, r) => a + (r.qty_sold || 0) * (r.unit_price ?? setup.ticket_price ?? 0), 0)
  const capacity = setup.capacity ?? 0
  const reserved = setup.reserved_seats ?? 0
  const courtesy = setup.courtesy_count ?? 0
  const capacityToSell = Math.max(0, capacity - reserved - courtesy)
  const remaining = Math.max(0, capacityToSell - vendidas)
  const asistencia = vendidas + courtesy
  const ocupacion = capacity > 0 ? asistencia / capacity : 0
  const pctVendido = capacityToSell > 0 ? vendidas / capacityToSell : 0
  const daysLeft = setup.show_date ? daysBetween(todayKey, arDateKey(setup.show_date)) : null
  return { vendidas, recaudacion, capacity, reserved, courtesy, capacityToSell, remaining, asistencia, ocupacion, pctVendido, daysLeft }
}

// Indicador "viene bien / mal" — regla simple según ocupación y días que faltan.
// Se vuelve más inteligente cuando tengamos histórico (Wrapped).
export function salesIndicator(ocupacion: number, daysLeft: number | null): { emoji: string; label: string; badge: string } {
  if (daysLeft === null) return { emoji: '—', label: 'Sin fecha', badge: 'bg-zinc-800 text-gray-400' }
  if (daysLeft < 0) return { emoji: '✔️', label: 'Fecha pasada', badge: 'bg-zinc-800 text-gray-300' }

  let level: 'green' | 'yellow' | 'red'
  if (daysLeft <= 7) level = ocupacion >= 0.8 ? 'green' : ocupacion >= 0.6 ? 'yellow' : 'red'
  else if (daysLeft <= 21) level = ocupacion >= 0.6 ? 'green' : ocupacion >= 0.4 ? 'yellow' : 'red'
  else level = ocupacion >= 0.4 ? 'green' : ocupacion >= 0.2 ? 'yellow' : 'red'

  const map = {
    green: { emoji: '🟢', label: 'Viene bien', badge: 'bg-green-900/40 text-green-300' },
    yellow: { emoji: '🟡', label: 'Ojo', badge: 'bg-yellow-900/40 text-yellow-300' },
    red: { emoji: '🔴', label: 'Viene flojo', badge: 'bg-red-900/40 text-red-300' },
  }
  return map[level]
}

export interface CurvePoint { date: string; daily: number; cumulative: number }

export function cumulativeCurve(rows: SaleRow[]): CurvePoint[] {
  const sorted = [...rows].sort((a, b) => a.sale_date.localeCompare(b.sale_date))
  let cum = 0
  return sorted.map(r => {
    cum += r.qty_sold || 0
    return { date: r.sale_date, daily: r.qty_sold || 0, cumulative: cum }
  })
}

export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}
