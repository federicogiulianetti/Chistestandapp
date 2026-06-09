import { fmt } from '@/lib/accounts'

// Una fila de la cuenta de Argentores: lo que el comediante cobra de Argentores por una fecha,
// con su estado de cobro (lo marca el productor acompañante o el admin).
export interface ArgentoresEntry {
  id: string
  show_id: string
  comedian_id: string
  amount: number
  currency: string
  collected: boolean
  collected_at: string | null
  por_fuera: boolean   // true = el teatro lo pagó directo (8%); NO reclamar en la oficina de Argentores
  show_date: string | null
  theater_name: string | null
  city: string | null
}

export interface ArgentoresTotals {
  currency: string
  total: number       // todo lo de Argentores de la fecha
  cobrado: number     // lo ya cobrado
  pendiente: number   // falta cobrar
}

export function argentoresTotals(entries: ArgentoresEntry[]): ArgentoresTotals[] {
  const map = new Map<string, ArgentoresTotals>()
  for (const e of entries) {
    const cur = map.get(e.currency) ?? { currency: e.currency, total: 0, cobrado: 0, pendiente: 0 }
    const amt = Number(e.amount) || 0
    cur.total += amt
    if (e.collected) cur.cobrado += amt
    cur.pendiente = cur.total - cur.cobrado
    map.set(e.currency, cur)
  }
  return Array.from(map.values()).sort((a, b) => a.currency.localeCompare(b.currency))
}

export function argentoresTotalsText(entries: ArgentoresEntry[]): string {
  const t = argentoresTotals(entries)
  if (t.length === 0) return '—'
  return t.map(x => fmt(x.pendiente, x.currency)).join(' · ')
}
