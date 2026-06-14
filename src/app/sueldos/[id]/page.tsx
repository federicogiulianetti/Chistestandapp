import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { CHARGE_TYPES, chargeTypeLabel, staffBalance, fmtMoney, type StaffMovement } from '@/lib/staff'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'
import ConfirmSubmit from '@/components/ConfirmSubmit'
import { addStaffMovement, deleteStaffMovement } from '../actions'

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') {
    return <main className="min-h-screen bg-ink text-body p-8"><p className="text-red-400">Sueldos es privado (solo admin).</p></main>
  }

  const supabase = await createClient()
  const { data: staff } = await supabase.from('staff').select('id, name, role, alias_cbu').eq('id', id).single()
  if (!staff) notFound()

  const { data: movData } = await supabase
    .from('staff_movements')
    .select('id, movement_date, concept, amount, direction, charge_type, currency, show_id')
    .eq('staff_id', id)
    .order('movement_date', { ascending: true })
    .order('created_at', { ascending: true })
  const movs = (movData ?? []) as (StaffMovement & { show_id: string | null })[]

  const { data: showsData } = await supabase
    .from('shows')
    .select('id, show_date, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(city)')
    .is('deleted_at', null)
    .order('show_date', { ascending: false })
    .limit(300)
  type RawShow = { id: string; show_date: string | null; performer_type: string | null; comedian: { stage_name: string | null } | null; ensemble: { name: string | null } | null; theater: { city: string | null } | null }
  const showOpts = ((showsData ?? []) as unknown as RawShow[]).map(s => {
    const perf = s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')
    return { id: s.id, label: `${formatShowDate(s.show_date)} · ${s.theater?.city ?? ''} · ${perf}` }
  })

  const bals = staffBalance(movs)
  const running = new Map<string, number>()
  const withRunning = movs.map(m => {
    const prev = running.get(m.currency) ?? 0
    const next = prev + (m.direction === 'credit' ? Number(m.amount) : -Number(m.amount))
    running.set(m.currency, next)
    return { m, running: next }
  }).reverse()

  const color = comedianColor(staff.name)
  const todayKey = arDateKey(new Date().toISOString())
  const inp = 'w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body'

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/sueldos" className="text-muted hover:text-body text-sm">← Volver a Sueldos</Link>
          <div className="flex items-center gap-3 mt-3">
            <PerformerAvatar name={staff.name} size={48} />
            <div>
              <h1 className="text-2xl font-bold leading-tight">{staff.name}</h1>
              <p className="text-faint text-sm">{staff.role ?? 'Staff'}{staff.alias_cbu ? ` · ${staff.alias_cbu}` : ''}</p>
            </div>
          </div>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md">Guardado ✓</div>}

        {/* Saldo */}
        <div className="bg-surface border border-line border-t-2 rounded-b-xl p-5" style={{ borderTopColor: color }}>
          <div className="text-[11px] uppercase tracking-wide text-faint">Se le debe</div>
          <div className="text-3xl font-bold mt-1">{bals.length === 0 ? '$0' : bals.map(b => fmtMoney(b.balance, b.currency)).join(' · ')}</div>
        </div>

        {/* Cargar movimiento */}
        <section className="bg-surface border border-line rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Cargar movimiento</h2>
          <form action={addStaffMovement.bind(null, id)} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm mb-1">Tipo</label>
                <select name="direction" defaultValue="credit" className={inp}>
                  <option value="credit">Cargo (se le debe)</option>
                  <option value="debit">Pago (se le paga)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Monto</label>
                <input name="amount" type="number" step="0.01" min="0" required className={`${inp} text-right`} />
              </div>
              <div>
                <label className="block text-sm mb-1">Moneda</label>
                <input name="currency" type="text" defaultValue="ARS" className={inp} />
              </div>
              <div>
                <label className="block text-sm mb-1">Fecha</label>
                <input name="movement_date" type="date" defaultValue={todayKey} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Tipo de cargo</label>
                <select name="charge_type" defaultValue="" className={inp}>
                  <option value="">— (para pagos)</option>
                  {CHARGE_TYPES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Fecha asociada (opcional)</label>
                <select name="show_id" defaultValue="" className={inp}>
                  <option value="">— Sin fecha —</option>
                  {showOpts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <input name="concept" type="text" placeholder="Concepto (ej: sueldo junio, peajes…)" className={inp} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-5 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">Guardar</button>
            </div>
          </form>
        </section>

        {/* Asiento */}
        <section className="bg-surface border border-line rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-line">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-semibold">Fecha</th>
                <th className="text-left px-4 py-2 text-sm font-semibold">Detalle</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Cobra</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Paga</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Saldo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {withRunning.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-3 text-sm text-faint">Sin movimientos.</td></tr>
              ) : withRunning.map(({ m, running }) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-sm whitespace-nowrap">{m.movement_date}</td>
                  <td className="px-4 py-2 text-sm">
                    {m.concept ?? '—'}
                    {m.charge_type && <span className="ml-2 text-[11px] bg-surface-2 text-faint px-1.5 py-0.5 rounded">{chargeTypeLabel(m.charge_type)}</span>}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-green-300">{m.direction === 'credit' ? fmtMoney(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-blue-300">{m.direction === 'debit' ? fmtMoney(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-muted">{fmtMoney(running, m.currency)}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteStaffMovement.bind(null, id, m.id)}>
                      <ConfirmSubmit message="¿Borrar este movimiento?" ariaLabel="Borrar" className="text-red-400 hover:text-red-300 text-sm">✕</ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
