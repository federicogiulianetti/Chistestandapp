import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { snapTotal, daysUntilShow, daysSince, pct } from '@/lib/ventas'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'

type ShowRow = {
  id: string
  show_date: string | null
  capacity: number | null
  sales_target: number | null
  performer_type: string | null
  comedian_id: string | null
  comedian: { stage_name: string | null; photo_url: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null; city: string | null } | null
}

type Snap = { show_id: string; snapshot_date: string; ticketera: number; teatro: number; mitad: number; invitaciones: number }

export default async function SalesPage() {
  const { user, profile } = await assertModuleAccess('sales')
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  const todayKey = arDateKey(new Date().toISOString())
  const cutoff = new Date(Date.now() - 2 * 86400000).toISOString()

  const { data } = await supabase
    .from('shows')
    .select('id, show_date, capacity, sales_target, performer_type, comedian_id, comedian:comedian_id(stage_name, photo_url), ensemble:ensemble_id(name), theater:theater_id(name, city)')
    .is('deleted_at', null)
    .gte('show_date', cutoff)
    .order('show_date', { ascending: true })

  let shows = ((data ?? []) as unknown as ShowRow[]).filter(s => {
    const d = daysUntilShow(s.show_date, todayKey)
    return d != null && d >= 0
  })

  // Enforcement: el no-admin ve solo los shows de sus comedianes asignados.
  if (!isAdmin) {
    const assigned = await getAssignedComedianIds(supabase, user.id)
    shows = shows.filter(s => s.comedian_id && assigned.has(s.comedian_id))
  }

  // Última foto por show
  const latestByShow = new Map<string, Snap>()
  if (shows.length) {
    const { data: snaps } = await supabase
      .from('sales_snapshots')
      .select('show_id, snapshot_date, ticketera, teatro, mitad, invitaciones')
      .in('show_id', shows.map(s => s.id))
      .order('snapshot_date', { ascending: false })
    for (const s of (snaps ?? []) as Snap[]) if (!latestByShow.has(s.show_id)) latestByShow.set(s.show_id, s)
  }

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Ventas — próximas fechas</h1>
          <p className="text-faint mt-1">Cómo viene cada show. Entrá a uno para actualizar los números del día y ver la curva.</p>
        </div>

        {shows.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">No hay fechas próximas{isAdmin ? '' : ' de tus comedianes'}.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shows.map(s => {
              const performer = s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')
              const color = comedianColor(performer)
              const latest = latestByShow.get(s.id)
              const cap = s.capacity ?? 0
              const total = latest ? snapTotal(latest) : 0
              const ocup = cap > 0 ? total / cap : 0
              const daysLeft = daysUntilShow(s.show_date, todayKey)
              const since = daysSince(latest?.snapshot_date ?? null, todayKey)
              const stale = since == null || since > 3

              return (
                <Link key={s.id} href={`/shows/${s.id}/ventas`} className="group bg-surface border border-line border-t-2 rounded-b-xl p-4 transition-colors hover:bg-surface-2" style={{ borderTopColor: color }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PerformerAvatar name={performer} photoUrl={s.comedian?.photo_url} size={38} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate text-body">{performer}</div>
                      <div className="text-[11px] text-faint truncate">{s.theater?.city ?? s.theater?.name ?? '—'} · {formatShowDate(s.show_date)}</div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-4 pt-3 border-t border-line">
                    <div>
                      <div className="text-2xl font-bold leading-none text-body">{cap ? pct(ocup) : '—'}</div>
                      <div className="text-[10px] uppercase tracking-wide text-faint mt-1">ocupación</div>
                    </div>
                    <div className="text-right text-[12px]">
                      <div className="text-body">{total}<span className="text-faint">/{cap || '—'}</span> entradas</div>
                      <div className="text-faint">{daysLeft} días · objetivo {s.sales_target ?? '—'}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${stale ? 'bg-amber-900/30 text-amber-300' : 'bg-surface-2 text-faint'}`}>
                      {since == null ? 'Sin cargar' : since === 0 ? 'Actualizado hoy' : since === 1 ? 'Actualizado ayer' : `Hace ${since} días`}
                    </span>
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
