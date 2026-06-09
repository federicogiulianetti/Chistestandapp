import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { summarizeSales, salesIndicator, formatPct, type SaleRow } from '@/lib/sales'

type RawShow = {
  id: string
  show_date: string | null
  capacity: number | null
  ticket_price: number | null
  reserved_seats: number
  courtesy_count: number
  performer_type: string | null
  comedian: { stage_name: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null; city: string | null } | null
  ticket_sales: SaleRow[] | null
}

export default async function SalesPage() {
  const { profile } = await getUserAndProfile()
  void profile

  const supabase = await createClient()
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, capacity, ticket_price, reserved_seats, courtesy_count, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name, city), ticket_sales(qty_sold, unit_price, sale_date)')
    .is('deleted_at', null)
    .order('show_date', { ascending: true })

  const todayKey = arDateKey(new Date().toISOString())

  const rows = ((data ?? []) as unknown as RawShow[]).map(s => {
    const summary = summarizeSales(s.ticket_sales ?? [], {
      capacity: s.capacity,
      reserved_seats: s.reserved_seats,
      courtesy_count: s.courtesy_count,
      ticket_price: s.ticket_price,
      show_date: s.show_date,
    }, todayKey)
    return {
      id: s.id,
      performer: s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—'),
      performer_type: s.performer_type,
      theater: s.theater?.name ?? '—',
      city: s.theater?.city ?? null,
      show_date: s.show_date,
      summary,
      indicator: salesIndicator(summary.ocupacion, summary.daysLeft),
    }
  })

  // Próximas: las que todavía no pasaron, ordenadas por fecha
  const upcoming = rows.filter(r => r.summary.daysLeft !== null && r.summary.daysLeft >= 0)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Ventas — próximas fechas</h1>
          <p className="text-gray-400 mt-1">Cómo viene cada fecha según ocupación y días que faltan.</p>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">No hay fechas próximas cargadas.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Fecha</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Artista</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Teatro</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">Vendidas</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">Ocupación</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">Días</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(r => (
                  <tr key={r.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatShowDate(r.show_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="mr-1">{r.performer_type === 'elenco' ? '🎭' : '🎤'}</span>
                      <span className="font-medium">{r.performer}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                      {r.theater}{r.city ? ` · ${r.city}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {r.summary.vendidas}<span className="text-gray-500">/{r.summary.capacityToSell}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{formatPct(r.summary.ocupacion)}</td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{r.summary.daysLeft}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${r.indicator.badge}`}>
                        {r.indicator.emoji} {r.indicator.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/shows/${r.id}/ventas`} className="text-blue-400 hover:underline text-sm">Cargar / ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
