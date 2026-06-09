import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { formatMoney } from '@/lib/sales'
import { loadBordero } from './data'
import { cerrarBordero, reabrirBordero } from './actions'

function Line({ label, amount, bold, sign, indent }: { label: string; amount: number; bold?: boolean; sign?: '-' | '+'; indent?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${bold ? 'font-bold border-t border-zinc-700 mt-1 pt-2' : 'border-b border-zinc-800/60'} ${indent ? 'pl-4 text-gray-400' : ''}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm text-right whitespace-nowrap">{sign === '-' ? '− ' : sign === '+' ? '+ ' : ''}{formatMoney(amount)}</span>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h2>
      {children}
    </section>
  )
}

export default async function BorderoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para ver el borderó.</p>
      </main>
    )
  }

  const ctx = await loadBordero(id)
  if (!ctx) notFound()

  const { result: b, summary } = ctx
  const negTotal = b.totalNeto < 0
  const closed = ctx.closed

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <Link href={`/shows/${id}/ver`} className="text-gray-400 hover:text-white text-sm">← Volver al show</Link>
          <h1 className="text-3xl font-bold mt-2">Borderó — {ctx.performer}</h1>
          <p className="text-gray-400 mt-1">{ctx.theaterName ?? '—'} · {formatShowDate(ctx.showDate)} · {ctx.currency}</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        {/* Estado: cerrado / preview */}
        <div className={`rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${closed ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-zinc-900 border border-zinc-800'}`}>
          <span className="text-sm font-medium">
            {closed ? `🔒 Cerrado el ${formatShowDate(closed.closed_at)}` : '📝 Preview (todavía no impacta en las cuentas)'}
          </span>
          {closed ? (
            <form action={reabrirBordero.bind(null, id)}>
              <button type="submit" className="px-3 py-1.5 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition text-sm">Reabrir</button>
            </form>
          ) : (
            <form action={cerrarBordero.bind(null, id)}>
              <button type="submit" className="px-4 py-1.5 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition text-sm">Cerrar borderó</button>
            </form>
          )}
        </div>

        <Block title="🎟️ Recaudación">
          <Line label={`Entradas vendidas (${summary.vendidas})`} amount={b.recaudacion} bold />
          <p className="text-xs text-gray-500 mt-1">Asistencia total: {summary.asistencia} ({summary.vendidas} vendidas + {summary.courtesy} cortesías)</p>
        </Block>

        <Block title="🧾 Impuestos sobre la recaudación">
          {b.deductionLines.length === 0 ? (
            <p className="text-sm text-gray-500">Sin impuestos cargados.</p>
          ) : (
            <>
              {b.deductionLines.map((l, i) => (
                <Line key={i} label={`${l.label}${l.goesToArtist ? ' (lo cobra el artista)' : ''}`} amount={l.amount} sign="-" indent />
              ))}
              <Line label="Total impuestos" amount={b.impuestosTotal} sign="-" />
            </>
          )}
          {b.netoSala !== null && <Line label="Neto a repartir con la sala" amount={b.netoSala} bold />}
        </Block>

        <Block title="🏛️ Reparto con la sala">
          <p className="text-xs text-gray-400 mb-1">{b.dealLabel}</p>
          <Line label="Parte de la productora" amount={b.parteProductoraSala} bold />
        </Block>

        <Block title="💸 Gastos de la productora">
          <Line label="Gastos cargados (directos + repartidos)" amount={b.expensesTotal} sign="-" indent />
          <Line label="Ads (Meta / Google)" amount={b.adSpendTotal} sign="-" indent />
          {b.adTaxLines.map((l, i) => (
            <Line key={i} label={l.label} amount={l.amount} sign="-" indent />
          ))}
          <Line label="Total gastos" amount={b.gastosTotal} sign="-" />
        </Block>

        <Block title="🧮 Total neto a repartir">
          <div className={`flex justify-between gap-4 py-2 text-lg font-bold ${negTotal ? 'text-red-400' : 'text-green-300'}`}>
            <span>Total neto</span>
            <span>{formatMoney(b.totalNeto)}</span>
          </div>
        </Block>

        <Block title="🤝 Reparto final">
          <Line label={`🎤 Artista (${b.artistPercentage}%)`} amount={b.artistaShare} />
          {b.artistaDeductions > 0 && (
            <>
              <Line label="+ Impuestos que cobra el artista" amount={b.artistaDeductions} sign="+" indent />
              <Line label="🎤 Total artista" amount={b.artistaFinal} bold />
            </>
          )}
          <Line label={`🏢 Productora (${b.productoraPercentage}%)`} amount={b.productoraShare} bold />
        </Block>

        <p className="text-xs text-gray-500 text-center">
          {closed
            ? 'Borderó cerrado: los montos quedaron congelados y posteados en las cuentas corrientes.'
            : 'Al cerrar, se congelan los montos y se postea la parte del artista (y del equipo etiquetado) en sus cuentas corrientes.'}
        </p>
      </div>
    </main>
  )
}
