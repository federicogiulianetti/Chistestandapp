import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { daysUntilShow } from '@/lib/ventas'
import { comedianColor } from '@/lib/comedianColor'
import GastosBoard, { type GastoGroup, type GastoCol } from '@/components/GastosBoard'

type ShowRow = {
  id: string
  show_date: string | null
  performer_type: string | null
  comedian_id: string | null
  comedian: { stage_name: string | null; photo_url: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null; city: string | null } | null
}

export default async function GastosPage() {
  const { user, profile } = await assertModuleAccess('gastos')
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  const todayKey = arDateKey(new Date().toISOString())
  const cutoff = new Date(Date.now() - 2 * 86400000).toISOString()

  const { data } = await supabase
    .from('shows')
    .select('id, show_date, performer_type, comedian_id, comedian:comedian_id(stage_name, photo_url), ensemble:ensemble_id(name), theater:theater_id(name, city)')
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

  // Estados del checklist por show
  const checksByShow = new Map<string, Record<string, string>>()
  if (shows.length) {
    const { data: checks } = await supabase
      .from('show_checklist')
      .select('show_id, item_key, status')
      .in('show_id', shows.map(s => s.id))
    for (const c of checks ?? []) {
      const m = checksByShow.get(c.show_id) ?? {}
      m[c.item_key as string] = c.status as string
      checksByShow.set(c.show_id, m)
    }
  }

  const performerOf = (s: ShowRow) => s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')

  const colOf = (s: ShowRow): GastoCol => ({
    id: s.id,
    theater: s.theater?.name ?? '—',
    city: s.theater?.city ?? '',
    date: formatShowDate(s.show_date),
    checks: checksByShow.get(s.id) ?? {},
  })

  const groupMap = new Map<string, GastoGroup>()
  for (const s of shows) {
    const performer = performerOf(s)
    if (!groupMap.has(performer)) {
      groupMap.set(performer, { performer, photo: s.comedian?.photo_url ?? null, color: comedianColor(performer), shows: [] })
    }
    groupMap.get(performer)!.shows.push(colOf(s))
  }
  const groups = [...groupMap.values()].sort((a, b) => a.performer.localeCompare(b.performer))

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-8 max-w-6xl">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Gastos</h1>
          <p className="text-faint mt-1">Checklist operativo de cada fecha. Marcá el estado de cada ítem (los costos se sumarán más adelante desde Pagos y Sueldos).</p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint max-w-3xl">
            No hay fechas próximas{isAdmin ? '' : ' de tus comedianes'}.
          </div>
        ) : (
          <GastosBoard groups={groups} />
        )}
      </div>
    </main>
  )
}
