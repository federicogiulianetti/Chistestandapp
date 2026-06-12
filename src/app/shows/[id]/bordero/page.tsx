import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { loadBordero } from './data'
import { cerrarBordero, reabrirBordero } from './actions'
import BorderoDoc from '@/components/BorderoDoc'

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

  const closed = ctx.closed

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/shows/${id}/ver`} className="text-gray-400 hover:text-white text-sm">← Volver al show</Link>
          <Link href={`/shows/${id}/bordero/print`} className="px-3 py-1.5 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition text-sm">🖨️ Descargar PDF</Link>
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

        {/* Documento del borderó (mismo estilo que el PDF) */}
        <div className="rounded-lg overflow-hidden shadow-lg">
          <BorderoDoc ctx={ctx} />
        </div>

        <p className="text-xs text-gray-500 text-center">
          {closed
            ? 'Borderó cerrado: los montos quedaron congelados y posteados en las cuentas corrientes.'
            : 'Al cerrar, se congelan los montos y se postea la parte del artista (y del equipo etiquetado) en sus cuentas corrientes.'}
        </p>
      </div>
    </main>
  )
}
