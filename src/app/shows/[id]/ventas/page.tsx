import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { summarizeSales, salesIndicator, cumulativeCurve, formatMoney, formatPct, type SaleRow } from '@/lib/sales'
import SalesCurve from '@/components/SalesCurve'
import ConfirmSubmit from '@/components/ConfirmSubmit'
import { addSale, deleteSale } from './actions'

function Card({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

export default async function VentasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const error = sp.error
  const { profile } = await getUserAndProfile()
  const canManage = profile.role === 'admin'

  const supabase = await createClient()
  const { data: show } = await supabase
    .from('shows')
    .select('id, show_date, capacity, ticket_price, reserved_seats, courtesy_count, on_sale_date, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!show) notFound()

  const { data: salesData } = await supabase
    .from('ticket_sales')
    .select('id, sale_date, qty_sold, unit_price, notes')
    .eq('show_id', id)
    .order('sale_date', { ascending: true })

  const rows = (salesData ?? []) as SaleRow[]
  const todayKey = arDateKey(new Date().toISOString())

  const sh = show as unknown as {
    show_date: string | null; capacity: number | null; ticket_price: number | null
    reserved_seats: number; courtesy_count: number; performer_type: string | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
    theater: { name: string | null } | null
  }

  const performer = sh.performer_type === 'elenco' ? (sh.ensemble?.name ?? '—') : (sh.comedian?.stage_name ?? '—')
  const summary = summarizeSales(rows, {
    capacity: sh.capacity,
    reserved_seats: sh.reserved_seats,
    courtesy_count: sh.courtesy_count,
    ticket_price: sh.ticket_price,
    show_date: sh.show_date,
  }, todayKey)
  const indicator = salesIndicator(summary.ocupacion, summary.daysLeft)
  const curve = cumulativeCurve(rows)
  const cumByDate = new Map(curve.map(p => [p.date, p.cumulative]))

  const addAction = addSale.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href={`/shows/${id}/ver`} className="text-gray-400 hover:text-white text-sm">← Volver al show</Link>
          <h1 className="text-3xl font-bold mt-2">Ventas — {performer}</h1>
          <p className="text-gray-400 mt-1">
            {sh.theater?.name ?? '—'} · {formatShowDate(sh.show_date)}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{error}</div>
        )}

        {/* Indicador */}
        <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${indicator.badge}`}>
          <span className="font-semibold">{indicator.emoji} {indicator.label}</span>
          <span className="text-sm">
            {summary.daysLeft !== null && summary.daysLeft >= 0 ? `Faltan ${summary.daysLeft} días` : ''}
          </span>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card label="🎟️ Vendidas" value={summary.vendidas} hint={`de ${summary.capacityToSell} a la venta`} />
          <Card label="📊 Ocupación" value={formatPct(summary.ocupacion)} hint={`asistencia ${summary.asistencia} / cap. ${summary.capacity}`} />
          <Card label="🪑 Quedan a la venta" value={summary.remaining} />
          <Card label="💰 Recaudación" value={formatMoney(summary.recaudacion)} />
          <Card label="🎭 Cortesías" value={summary.courtesy} hint="cuentan como público, no pagan" />
          <Card label="🚫 Reservadas" value={summary.reserved} hint="fuera de la venta" />
        </div>

        {/* Curva */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">📈 Curva de venta (acumulada)</h2>
          <SalesCurve points={curve} target={summary.capacityToSell} />
        </section>

        {/* Carga diaria */}
        {canManage && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">➕ Cargar ventas del día</h2>
            <form action={addAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm mb-1">📅 Día</label>
                <input name="sale_date" type="date" required defaultValue={todayKey}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-sm mb-1">🎟️ Vendidas ese día</label>
                <input name="qty_sold" type="number" min="0" required defaultValue={0}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-sm mb-1">💵 Precio de ese día</label>
                <input name="unit_price" type="number" step="0.01" min="0" defaultValue={sh.ticket_price ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500" />
              </div>
              <button type="submit" className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">
                Guardar
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">Si ya cargaste ese día, se actualiza. El precio que pongas queda como precio actual del show.</p>
          </section>
        )}

        {/* Detalle */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <h2 className="text-lg font-semibold p-4 pb-0">🧾 Detalle por día</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 p-4">Todavía no cargaste ventas.</p>
          ) : (
            <table className="w-full mt-2">
              <thead className="bg-zinc-800/50 border-y border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-semibold">Día</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold">Vendidas</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold">Precio</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold">Subtotal</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold">Acum.</th>
                  {canManage && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const price = r.unit_price ?? sh.ticket_price ?? 0
                  return (
                    <tr key={r.id} className="border-b border-zinc-800 last:border-0">
                      <td className="px-4 py-2 text-sm">{r.sale_date}</td>
                      <td className="px-4 py-2 text-sm text-right">{r.qty_sold}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatMoney(price)}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatMoney(r.qty_sold * price)}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-400">{cumByDate.get(r.sale_date)}</td>
                      {canManage && (
                        <td className="px-4 py-2 text-right">
                          <form action={deleteSale.bind(null, id, r.id)}>
                            <ConfirmSubmit message="¿Borrar esta carga de ventas?" ariaLabel="Borrar venta" className="text-red-400 hover:text-red-300 text-sm">✕</ConfirmSubmit>
                          </form>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}
