import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { daysUntilShow } from '@/lib/ventas'
import { comedianColor } from '@/lib/comedianColor'
import GastosBoard, { type GastoGroup, type GastoCol, type CostRow } from '@/components/GastosBoard'

type ShowRow = {
  id: string
  show_date: string | null
  performer_type: string | null
  comedian_id: string | null
  comedian: { stage_name: string | null; photo_url: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null; city: string | null } | null
}

type Charge = { staff_id: string; amount: number; charge_type: string | null; show_id: string | null; movement_date: string }

// 'YYYY-MM' en hora Argentina, sirva el valor un date (YYYY-MM-DD) o un timestamptz.
function ymOf(dateStr: string | null): string | null {
  if (!dateStr) return null
  if (dateStr.length === 10) return dateStr.slice(0, 7)
  return arDateKey(dateStr).slice(0, 7)
}

export default async function GastosPage() {
  const { user, profile } = await assertModuleAccess('gastos')
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  const todayKey = arDateKey(new Date().toISOString())
  const cutoff = new Date(Date.now() - 2 * 86400000).toISOString()

  const [{ data }, { data: staffData }, { data: chargeData }, { data: allDates }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, show_date, performer_type, comedian_id, comedian:comedian_id(stage_name, photo_url), ensemble:ensemble_id(name), theater:theater_id(name, city)')
      .is('deleted_at', null)
      .gte('show_date', cutoff)
      .order('show_date', { ascending: true }),
    supabase.from('staff').select('id, name'),
    supabase.from('staff_movements').select('staff_id, amount, charge_type, show_id, movement_date').eq('direction', 'credit').in('charge_type', ['por_fecha', 'mensual_repartido']),
    supabase.from('shows').select('show_date').is('deleted_at', null),
  ])

  let shows = ((data ?? []) as unknown as ShowRow[]).filter(s => {
    const d = daysUntilShow(s.show_date, todayKey)
    return d != null && d >= 0
  })
  if (!isAdmin) {
    const assigned = await getAssignedComedianIds(supabase, user.id)
    shows = shows.filter(s => s.comedian_id && assigned.has(s.comedian_id))
  }

  // Checklist por show
  const checksByShow = new Map<string, Record<string, string>>()
  if (shows.length) {
    const { data: checks } = await supabase.from('show_checklist').select('show_id, item_key, status').in('show_id', shows.map(s => s.id))
    for (const c of checks ?? []) {
      const m = checksByShow.get(c.show_id) ?? {}
      m[c.item_key as string] = c.status as string
      checksByShow.set(c.show_id, m)
    }
  }

  // Costos de sueldos por fecha
  const staffName = new Map<string, string>((staffData ?? []).map(s => [s.id as string, s.name as string]))
  const charges = (chargeData ?? []) as Charge[]
  const monthCount = new Map<string, number>()
  for (const r of (allDates ?? []) as { show_date: string | null }[]) {
    const ym = ymOf(r.show_date)
    if (ym) monthCount.set(ym, (monthCount.get(ym) ?? 0) + 1)
  }
  // costMap: showId -> (staffId -> monto)
  const costMap = new Map<string, Map<string, number>>()
  for (const s of shows) {
    const ym = ymOf(s.show_date)
    const m = new Map<string, number>()
    for (const ch of charges) {
      let add = 0
      if (ch.charge_type === 'por_fecha' && ch.show_id === s.id) add = Number(ch.amount)
      else if (ch.charge_type === 'mensual_repartido' && ym && ymOf(ch.movement_date) === ym) add = Number(ch.amount) / (monthCount.get(ym) ?? 1)
      if (add) m.set(ch.staff_id, (m.get(ch.staff_id) ?? 0) + add)
    }
    costMap.set(s.id, m)
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
      groupMap.set(performer, { performer, photo: s.comedian?.photo_url ?? null, color: comedianColor(performer), shows: [], costRows: [] })
    }
    groupMap.get(performer)!.shows.push(colOf(s))
  }

  // Filas de costo por grupo: las personas de staff que aportan algún costo a sus shows
  for (const g of groupMap.values()) {
    const staffIds = new Set<string>()
    for (const s of g.shows) for (const sid of (costMap.get(s.id)?.keys() ?? [])) staffIds.add(sid)
    g.costRows = [...staffIds]
      .map<CostRow>(sid => ({
        staffId: sid,
        name: staffName.get(sid) ?? 'Staff',
        amounts: Object.fromEntries(g.shows.map(s => [s.id, costMap.get(s.id)?.get(sid) ?? 0])),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const groups = [...groupMap.values()].sort((a, b) => a.performer.localeCompare(b.performer))

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-8 max-w-6xl">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Gastos</h1>
          <p className="text-faint mt-1">Checklist operativo (editable) y costos de sueldos por fecha (se levantan de Sueldos). Los gastos puntuales con factura se sumarán desde Pagos.</p>
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
