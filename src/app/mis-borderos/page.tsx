import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { fmt } from '@/lib/accounts'

type MyBordero = {
  id: string
  show_id: string
  currency: string
  recaudacion: number
  artista_final: number
  closed_at: string
  show_date: string | null
  theater_name: string | null
}

export default async function MisBorderosPage() {
  await getUserAndProfile()
  const supabase = await createClient()

  // Vista segura: solo los borderós del comediante, sin la parte de la productora
  const { data } = await supabase
    .from('my_borderos')
    .select('id, show_id, currency, recaudacion, artista_final, closed_at, show_date, theater_name')
    .order('show_date', { ascending: false })

  const borderos = (data ?? []) as unknown as MyBordero[]

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Mis borderós</h1>
          <p className="text-muted mt-1">Liquidaciones cerradas de tus fechas.</p>
        </div>

        {borderos.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-12 text-center text-muted">
            Todavía no hay borderós cerrados de tus fechas.
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-line">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Sala</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Recaudación</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Lo tuyo</th>
                </tr>
              </thead>
              <tbody>
                {borderos.map(b => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatShowDate(b.show_date)}</td>
                    <td className="px-4 py-3 text-sm text-muted">{b.theater_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-muted">{fmt(b.recaudacion, b.currency)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-300">{fmt(b.artista_final, b.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
