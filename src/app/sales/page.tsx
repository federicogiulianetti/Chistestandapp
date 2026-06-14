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

  const performerOf = (s: ShowRow) => s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')

  // Agrupar por comediante / elenco (los shows vienen ordenados por fecha)
  const groups = new Map<string, { performer: string; photo: string | null; shows: ShowRow[] }>()
  for (const s of shows) {
    const performer = performerOf(s)
    if (!groups.has(performer)) groups.set(performer, { performer, photo: s.comedian?.photo_url ?? null, shows: [] })
    groups.get(performer)!.shows.push(s)
  }
  const grouped = [...groups.values()].sort((a, b) => a.performer.localeCompare(b.performer))

  // Filas del "Excel" (columna A)
  const ROWS = [
    { key: 'ticketera', label: 'Entradas Ticketera' },
    { key: 'teatro', label: 'Entradas Teatro' },
    { key: 'mitad', label: 'Entradas al 50%' },
    { key: 'invitaciones', label: 'Invitaciones' },
    { key: 'total', label: 'Entradas Total', strong: true },
    { key: 'cap', label: 'Capacidad' },
    { key: 'faltantes', label: 'Faltantes' },
    { key: 'objetivo', label: 'Objetivo' },
    { key: 'ocup', label: '% Ocupación', strong: true },
    { key: 'dias', label: 'Días faltantes' },
  ] as const

  const valuesFor = (s: ShowRow) => {
    const latest = latestByShow.get(s.id)
    const cap = s.capacity ?? 0
    const total = latest ? snapTotal(latest) : 0
    const daysLeft = daysUntilShow(s.show_date, todayKey)
    return {
      ticketera: String(latest?.ticketera ?? 0),
      teatro: String(latest?.teatro ?? 0),
      mitad: String(latest?.mitad ?? 0),
      invitaciones: String(latest?.invitaciones ?? 0),
      total: String(total),
      cap: cap ? String(cap) : '—',
      faltantes: cap ? String(Math.max(0, cap - total)) : '—',
      objetivo: s.sales_target != null ? String(s.sales_target) : '—',
      ocup: cap ? pct(total / cap) : '—',
      dias: daysLeft != null ? String(daysLeft) : '—',
    }
  }

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-8 max-w-6xl">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Ventas — próximas fechas</h1>
          <p className="text-faint mt-1">Los shows de cada comediante, lado a lado. Tocá una columna para actualizar sus números y ver la curva.</p>
        </div>

        {grouped.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint max-w-3xl">
            No hay fechas próximas{isAdmin ? '' : ' de tus comedianes'}.
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(g => {
              const color = comedianColor(g.performer)
              return (
                <section key={g.performer}>
                  <div className="flex items-center gap-3 mb-3">
                    <PerformerAvatar name={g.performer} photoUrl={g.photo} size={36} />
                    <h2 className="text-lg font-semibold">{g.performer}</h2>
                    <span className="text-xs text-faint">{g.shows.length} fecha{g.shows.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="overflow-x-auto bg-surface border border-line rounded-xl">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-surface-2 border-b border-r border-line px-3 py-2 text-left text-[11px] uppercase tracking-wide text-faint min-w-[150px]"> </th>
                          {g.shows.map(s => {
                            const since = daysSince(latestByShow.get(s.id)?.snapshot_date ?? null, todayKey)
                            const stale = since == null || since > 3
                            return (
                              <th key={s.id} className="border-b border-line p-0 min-w-[130px] align-top" style={{ borderTop: `2px solid ${color}` }}>
                                <Link href={`/shows/${s.id}/ventas`} className="block px-3 py-2 hover:bg-surface-2 transition-colors">
                                  <div className="text-[13px] font-semibold text-body truncate">{s.theater?.city ?? s.theater?.name ?? '—'}</div>
                                  <div className="text-[11px] text-faint">{formatShowDate(s.show_date)}</div>
                                  <div className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded ${stale ? 'bg-amber-900/30 text-amber-300' : 'bg-surface text-faint'}`}>
                                    {since == null ? 'Sin cargar' : since === 0 ? 'hoy' : since === 1 ? 'ayer' : `hace ${since}d`}
                                  </div>
                                </Link>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {ROWS.map(row => (
                          <tr key={row.key}>
                            <td className={`sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] ${'strong' in row && row.strong ? 'font-semibold text-body' : 'text-muted'}`}>{row.label}</td>
                            {g.shows.map(s => {
                              const v = valuesFor(s)[row.key]
                              return (
                                <td key={s.id} className={`border-b border-line px-3 py-2 text-right text-[13px] tabular-nums ${'strong' in row && row.strong ? 'font-bold text-body' : 'text-muted'}`}>{v}</td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
