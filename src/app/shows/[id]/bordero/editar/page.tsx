import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { loadBordero } from '../data'
import { formatShowDate } from '@/lib/shows'
import BorderoEditor, { type EditorData } from '@/components/BorderoEditor'

export default async function BorderoEditarPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') notFound()

  const ctx = await loadBordero(id)
  if (!ctx) notFound()

  // % de reparto productora/sala desde el deal (para precargar el campo)
  const supabase = await createClient()
  const { data: showRow } = await supabase.from('shows').select('deal_percentage, artist_percentage').eq('id', id).single()

  const data: EditorData = {
    showId: id,
    performer: ctx.performer,
    showDate: ctx.showDate,
    recaudacion: ctx.snapshot?.recaudacion ?? ctx.result.recaudacion,
    total_neto: ctx.snapshot?.total_neto ?? ctx.result.totalNeto,
    artista_final: ctx.snapshot?.artista_final ?? ctx.result.artistaFinal,
    productora_share: ctx.snapshot?.productora_share ?? ctx.result.productoraShare,
    capacity: ctx.capacity,
    deal_percentage: showRow?.deal_percentage ?? null,
    artist_percentage: showRow?.artist_percentage ?? null,
    entradas: ctx.ticketLines.map(t => ({ label: t.label, qty: t.qty, price: t.price, subtotal: t.subtotal })),
    impuestos: ctx.deductionsRaw.map(d => ({ label: d.label, percentage: d.percentage, fixed_amount: d.fixed_amount, notes: d.notes })),
    gastos: ctx.expenseLines.map(g => ({ category: g.category, amount: g.amount, notes: g.notes })),
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={`/shows/${id}/bordero`} className="text-gray-400 hover:text-white text-sm">← Volver al borderó</Link>
          <h1 className="text-3xl font-bold mt-2">Editar borderó ✏️</h1>
          <p className="text-gray-400 mt-1">{ctx.performer} · {ctx.theaterName ?? '—'} · {formatShowDate(ctx.showDate)}</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-4">{sp.error}</div>}

        <BorderoEditor data={data} />
      </div>
    </main>
  )
}
