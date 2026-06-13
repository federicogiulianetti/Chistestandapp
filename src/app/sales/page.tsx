import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { summarizeSales, salesIndicator, formatPct, type SaleRow } from '@/lib/sales'
import { comedianColor } from '@/lib/comedianColor'
import { performerPhotoMap } from '@/lib/performerPhotos'
import PerformerAvatar from '@/components/PerformerAvatar'

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
  const [{ data }, fotoDe] = await Promise.all([
    supabase
      .from('shows')
      .select('id, show_date, capacity, ticket_price, reserved_seats, courtesy_count, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name, city), ticket_sales(qty_sold, unit_price, sale_date)')
      .is('deleted_at', null)
      .order('show_date', { ascending: true }),
    performerPhotoMap(supabase),
  ])

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
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Ventas — próximas fechas</h1>
          <p className="text-faint mt-1">Cómo viene cada fecha según ocupación y días que faltan.</p>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">
            No hay fechas próximas cargadas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map(r => {
              const color = comedianColor(r.performer)
              return (
                <Link
                  key={r.id}
                  href={`/shows/${r.id}/ventas`}
                  className="group bg-surface border border-line border-t-2 rounded-b-xl p-4 transition-colors hover:bg-surface-2"
                  style={{ borderTopColor: color }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PerformerAvatar name={r.performer} photoUrl={fotoDe.get(r.performer)} size={42} />
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate text-body">{r.performer}</div>
                      <div className="text-[11px] text-faint truncate">{r.theater}{r.city ? ` · ${r.city}` : ''}</div>
                    </div>
                    <span className={`ml-auto shrink-0 px-2 py-1 rounded text-[11px] ${r.indicator.badge}`}>{r.indicator.label}</span>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
                    <div>
                      <div className="text-2xl font-bold leading-none text-body">{formatPct(r.summary.ocupacion)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-faint mt-1">ocupación</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] text-body">{r.summary.vendidas}<span className="text-faint">/{r.summary.capacityToSell}</span></div>
                      <div className="text-[11px] text-faint">{r.summary.daysLeft} día{r.summary.daysLeft === 1 ? '' : 's'} · {formatShowDate(r.show_date)}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
