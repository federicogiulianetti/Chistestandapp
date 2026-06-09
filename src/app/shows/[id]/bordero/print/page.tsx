import { notFound } from 'next/navigation'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { formatMoney } from '@/lib/sales'
import { loadBordero } from '../data'
import PrintButton from '@/components/PrintButton'

function Row({ label, amount, bold, sign }: { label: string; amount: number; bold?: boolean; sign?: '-' | '+' }) {
  return (
    <div className={`flex justify-between gap-4 py-1 ${bold ? 'font-bold border-t border-gray-400 mt-1 pt-1' : ''}`}>
      <span>{label}</span>
      <span>{sign === '-' ? '− ' : sign === '+' ? '+ ' : ''}{formatMoney(amount)}</span>
    </div>
  )
}

export default async function BorderoPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') notFound()

  const ctx = await loadBordero(id)
  if (!ctx) notFound()
  const b = ctx.result

  return (
    <main className="min-h-screen bg-white text-black p-10 print:p-0">
      <div className="max-w-xl mx-auto text-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Borderó</h1>
            <p className="text-gray-600">{ctx.performer} · {ctx.theaterName ?? '—'}</p>
            <p className="text-gray-600">{formatShowDate(ctx.showDate)} · {ctx.currency}</p>
          </div>
          <PrintButton />
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="font-semibold uppercase text-xs text-gray-500 mb-1">Recaudación</h2>
            <Row label={`Entradas vendidas (${ctx.summary.vendidas})`} amount={b.recaudacion} bold />
            <p className="text-xs text-gray-500 mt-1">Asistencia: {ctx.summary.asistencia} ({ctx.summary.vendidas} vendidas + {ctx.summary.courtesy} cortesías)</p>
          </section>

          {b.deductionLines.length > 0 && (
            <section>
              <h2 className="font-semibold uppercase text-xs text-gray-500 mb-1">Impuestos sobre recaudación</h2>
              {b.deductionLines.map((l, i) => <Row key={i} label={l.label} amount={l.amount} sign="-" />)}
              {b.netoSala !== null && <Row label="Neto con la sala" amount={b.netoSala} bold />}
            </section>
          )}

          <section>
            <h2 className="font-semibold uppercase text-xs text-gray-500 mb-1">Reparto con la sala — {b.dealLabel}</h2>
            <Row label="Parte productora" amount={b.parteProductoraSala} bold />
          </section>

          <section>
            <h2 className="font-semibold uppercase text-xs text-gray-500 mb-1">Gastos de producción</h2>
            <Row label="Gastos cargados" amount={b.expensesTotal} sign="-" />
            <Row label="Ads" amount={b.adSpendTotal} sign="-" />
            {b.adTaxLines.map((l, i) => <Row key={i} label={l.label} amount={l.amount} sign="-" />)}
            <Row label="Total gastos" amount={b.gastosTotal} sign="-" />
          </section>

          <section>
            <Row label="TOTAL NETO" amount={b.totalNeto} bold />
          </section>

          <section>
            <h2 className="font-semibold uppercase text-xs text-gray-500 mb-1">Reparto final</h2>
            <Row label={`Artista (${b.artistPercentage}%)`} amount={b.artistaShare} />
            {b.artistaDeductions > 0 && <Row label="+ Impuestos del artista" amount={b.artistaDeductions} sign="+" />}
            {b.artistaDeductions > 0 && <Row label="Total artista" amount={b.artistaFinal} bold />}
            <Row label={`Productora (${b.productoraPercentage}%)`} amount={b.productoraShare} bold />
          </section>
        </div>
      </div>
    </main>
  )
}
