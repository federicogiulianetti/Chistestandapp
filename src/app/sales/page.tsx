import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { snapTotal, daysUntilShow, daysSince, pct } from '@/lib/ventas'
import { comedianColor } from '@/lib/comedianColor'
import VentasBoard, { type VentaGroup, type VentaCol } from '@/components/VentasBoard'

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

  // Historial completo de fotos por show (para la curva)
  const snapsByShow = new Map<string, Snap[]>()
  if (shows.length) {
    const { data: snaps } = await supabase
      .from('sales_snapshots')
      .select('show_id, snapshot_date, ticketera, teatro, mitad, invitaciones')
      .in('show_id', shows.map(s => s.id))
      .order('snapshot_date', { ascending: true })
    for (const s of (snaps ?? []) as Snap[]) {
      const arr = snapsByShow.get(s.show_id) ?? []
      arr.push(s)
      snapsByShow.set(s.show_id, arr)
    }
  }

  const performerOf = (s: ShowRow) => s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')

  const colOf = (s: ShowRow): VentaCol => {
    const hist = snapsByShow.get(s.id) ?? []
    const latest = hist.at(-1)
    const cap = s.capacity ?? 0
    const total = latest ? snapTotal(latest) : 0
    const daysLeft = daysUntilShow(s.show_date, todayKey)
    const since = daysSince(latest?.snapshot_date ?? null, todayKey)

    let prev = 0
    const curve = hist.map(h => {
      const c = snapTotal(h)
      const point = { date: h.snapshot_date, daily: c - prev, cumulative: c }
      prev = c
      return point
    })

    return {
      id: s.id,
      city: s.theater?.city ?? s.theater?.name ?? '—',
      date: formatShowDate(s.show_date),
      sinceLabel: since == null ? 'Sin cargar' : since === 0 ? 'hoy' : since === 1 ? 'ayer' : `hace ${since}d`,
      stale: since == null || since > 3,
      capacity: cap,
      curve,
      cells: {
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
      },
    }
  }

  // Agrupar por comediante / elenco
  const groupMap = new Map<string, VentaGroup>()
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
          <h1 className="text-2xl font-bold mt-2">Ventas — próximas fechas</h1>
          <p className="text-faint mt-1">Los shows de cada comediante, lado a lado. Tocá una columna para actualizar, o &ldquo;Ver gráfico&rdquo; para la curva.</p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint max-w-3xl">
            No hay fechas próximas{isAdmin ? '' : ' de tus comedianes'}.
          </div>
        ) : (
          <VentasBoard groups={groups} />
        )}
      </div>
    </main>
  )
}
