import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { snapTotal, daysUntilShow, daysSince, pct, type SalesSnapshot } from '@/lib/ventas'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'
import SalesCurve from '@/components/SalesCurve'
import ConfirmSubmit from '@/components/ConfirmSubmit'
import { saveSnapshot, deleteSnapshot } from './actions'

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

export default async function VentasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const { user, profile } = await getUserAndProfile()

  const supabase = await createClient()
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, capacity, sales_target, performer_type, comedian_id, comedian:comedian_id(stage_name, photo_url), ensemble:ensemble_id(name), theater:theater_id(name, city)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (!data) notFound()
  const show = data as unknown as ShowRow

  // ¿Puede actualizar? admin, o productor asignado a su comediante.
  let canManage = profile.role === 'admin'
  if (!canManage && show.comedian_id) {
    const { data: asg } = await supabase
      .from('assignments').select('id').eq('producer_id', user.id).eq('comedian_id', show.comedian_id).limit(1)
    canManage = (asg?.length ?? 0) > 0
  }

  const { data: snapData } = await supabase
    .from('sales_snapshots')
    .select('id, snapshot_date, ticketera, teatro, mitad, invitaciones')
    .eq('show_id', id)
    .order('snapshot_date', { ascending: true })
  const snaps = (snapData ?? []) as SalesSnapshot[]
  const latest = snaps.at(-1)

  const performer = show.performer_type === 'elenco' ? (show.ensemble?.name ?? '—') : (show.comedian?.stage_name ?? '—')
  const color = comedianColor(performer)
  const todayKey = arDateKey(new Date().toISOString())

  const cap = show.capacity ?? 0
  const total = latest ? snapTotal(latest) : 0
  const faltantes = Math.max(0, cap - total)
  const ocup = cap > 0 ? total / cap : 0
  const daysLeft = daysUntilShow(show.show_date, todayKey)
  const sinceUpdate = daysSince(latest?.snapshot_date ?? null, todayKey)

  let prevTotal = 0
  const curve = snaps.map(s => {
    const c = snapTotal(s)
    const point = { date: s.snapshot_date, daily: c - prevTotal, cumulative: c }
    prevTotal = c
    return point
  })

  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Entradas Ticketera', value: String(latest?.ticketera ?? 0) },
    { label: 'Entradas Teatro', value: String(latest?.teatro ?? 0) },
    { label: 'Entradas al 50%', value: String(latest?.mitad ?? 0) },
    { label: 'Invitaciones', value: String(latest?.invitaciones ?? 0) },
    { label: 'Entradas Total', value: String(total), strong: true },
    { label: 'Capacidad', value: cap ? String(cap) : '—' },
    { label: 'Faltantes', value: cap ? String(faltantes) : '—' },
    { label: 'Objetivo', value: show.sales_target != null ? String(show.sales_target) : '—' },
    { label: '% Ocupación', value: cap ? pct(ocup) : '—', strong: true },
    { label: 'Días faltantes', value: daysLeft != null ? String(daysLeft) : '—' },
  ]

  const fieldCls = 'w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body'

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/sales" className="text-muted hover:text-body text-sm">← Volver a Ventas</Link>
          <div className="flex items-center gap-3 mt-3">
            <PerformerAvatar name={performer} photoUrl={show.comedian?.photo_url} size={46} />
            <div>
              <h1 className="text-2xl font-bold leading-tight">{performer}</h1>
              <p className="text-faint text-sm">{show.theater?.name ?? '—'}{show.theater?.city ? ` · ${show.theater.city}` : ''} · {formatShowDate(show.show_date)}</p>
            </div>
          </div>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md">Guardado ✓</div>}

        {/* Estado de actualización */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {latest ? (
            <span className={`px-3 py-1 rounded-full border ${sinceUpdate != null && sinceUpdate > 3 ? 'border-amber-700 text-amber-300 bg-amber-900/20' : 'border-line text-muted bg-surface'}`}>
              Actualizado {sinceUpdate === 0 ? 'hoy' : sinceUpdate === 1 ? 'ayer' : `hace ${sinceUpdate} días`} ({latest.snapshot_date})
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full border border-amber-700 text-amber-300 bg-amber-900/20">Sin ventas cargadas</span>
          )}
          {daysLeft != null && daysLeft >= 0 && <span className="text-faint">Faltan {daysLeft} días para el show</span>}
        </div>

        {/* Números actuales (estilo Excel) */}
        <section className="bg-surface border border-line border-t-2 rounded-b-xl overflow-hidden" style={{ borderTopColor: color }}>
          <table className="w-full">
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className="border-b border-line last:border-0">
                  <td className={`px-4 py-2.5 text-sm ${r.strong ? 'font-semibold text-body' : 'text-muted'}`}>{r.label}</td>
                  <td className={`px-4 py-2.5 text-right ${r.strong ? 'text-lg font-bold text-body' : 'text-body'}`}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Curva */}
        <section className="bg-surface border border-line rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Curva de venta (acumulada)</h2>
          <SalesCurve points={curve} target={cap} />
        </section>

        {/* Cargar / actualizar (snapshot) */}
        {canManage && (
          <section className="bg-surface border border-line rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1">Actualizar ventas</h2>
            <p className="text-faint text-xs mb-4">Cargá el <b className="text-muted">total acumulado</b> de hoy (lo que ves en la ticketera/teatro). Se guarda como una foto del día; cada foto arma la curva.</p>
            <form action={saveSnapshot.bind(null, id)} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm mb-1">Ticketera</label>
                  <input name="ticketera" type="number" min="0" defaultValue={latest?.ticketera ?? 0} className={`${fieldCls} text-right`} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teatro</label>
                  <input name="teatro" type="number" min="0" defaultValue={latest?.teatro ?? 0} className={`${fieldCls} text-right`} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Al 50%</label>
                  <input name="mitad" type="number" min="0" defaultValue={latest?.mitad ?? 0} className={`${fieldCls} text-right`} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Invitaciones</label>
                  <input name="invitaciones" type="number" min="0" defaultValue={latest?.invitaciones ?? 0} className={`${fieldCls} text-right`} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm mb-1">Fecha de la foto</label>
                  <input name="snapshot_date" type="date" defaultValue={todayKey} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Objetivo</label>
                  <input name="sales_target" type="number" min="0" defaultValue={show.sales_target ?? ''} placeholder="—" className={`${fieldCls} text-right`} />
                </div>
                <button type="submit" className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">Guardar</button>
              </div>
            </form>
          </section>
        )}

        {/* Historial de fotos */}
        {snaps.length > 0 && (
          <section className="bg-surface border border-line rounded-xl overflow-hidden">
            <h2 className="text-lg font-semibold p-4 pb-2">Historial de cargas</h2>
            <table className="w-full">
              <thead className="bg-surface-2 border-y border-line">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted">Fecha</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted">Tick.</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted">Teatro</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted">50%</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted">Invit.</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted">Total</th>
                  {canManage && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {[...snaps].reverse().map(s => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 text-sm">{s.snapshot_date}</td>
                    <td className="px-4 py-2 text-sm text-right text-muted">{s.ticketera}</td>
                    <td className="px-4 py-2 text-sm text-right text-muted">{s.teatro}</td>
                    <td className="px-4 py-2 text-sm text-right text-muted">{s.mitad}</td>
                    <td className="px-4 py-2 text-sm text-right text-muted">{s.invitaciones}</td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">{snapTotal(s)}</td>
                    {canManage && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteSnapshot.bind(null, id, s.id)}>
                          <ConfirmSubmit message="¿Borrar esta foto del día?" ariaLabel="Borrar foto" className="text-red-400 hover:text-red-300 text-sm">✕</ConfirmSubmit>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  )
}
