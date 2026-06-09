import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

type RawShow = {
  show_date: string | null
  city: string | null
  courtesy_count: number
  status: string | null
  theater: { name: string | null } | null
  ticket_sales: { qty_sold: number }[] | null
}

function agg(rows: { key: string; publico: number }[]) {
  const m = new Map<string, { count: number; publico: number }>()
  for (const r of rows) {
    const cur = m.get(r.key) ?? { count: 0, publico: 0 }
    cur.count += 1
    cur.publico += r.publico
    m.set(r.key, cur)
  }
  return Array.from(m.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.publico - a.publico)
}

export default async function MiWrappedPage() {
  await getUserAndProfile()
  const supabase = await createClient()

  // RLS: el comediante solo ve sus fechas y sus ventas
  const { data } = await supabase
    .from('shows')
    .select('show_date, city, courtesy_count, status, theater:theater_id(name), ticket_sales(qty_sold)')
    .is('deleted_at', null)

  const shows = (data ?? []) as unknown as RawShow[]

  const perShow = shows.map(s => {
    const vendidas = (s.ticket_sales ?? []).reduce((a, t) => a + (Number(t.qty_sold) || 0), 0)
    const publico = vendidas + (s.courtesy_count || 0)
    const year = s.show_date ? new Date(s.show_date).getFullYear().toString() : '—'
    return { city: s.city ?? '—', theater: s.theater?.name ?? '—', year, publico }
  })

  const totalShows = shows.length
  const totalPublico = perShow.reduce((a, s) => a + s.publico, 0)
  const byCity = agg(perShow.map(s => ({ key: s.city, publico: s.publico })))
  const byYear = agg(perShow.map(s => ({ key: s.year, publico: s.publico }))).sort((a, b) => b.key.localeCompare(a.key))
  const byTheater = agg(perShow.map(s => ({ key: s.theater, publico: s.publico })))

  const Card = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )

  const RankTable = ({ title, rows, unit }: { title: string; rows: { key: string; count: number; publico: number }[]; unit: string }) => (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/50 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-semibold">{unit}</th>
              <th className="text-right px-4 py-2 text-sm font-semibold">Fechas</th>
              <th className="text-right px-4 py-2 text-sm font-semibold">Público</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-b border-zinc-800 last:border-0">
                <td className="px-4 py-2 text-sm">{r.key}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-300">{r.count}</td>
                <td className="px-4 py-2 text-sm text-right font-medium">{r.publico.toLocaleString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">✨ Mi Wrapped</h1>
          <p className="text-gray-400 mt-1">Tu historial de fechas en números.</p>
        </div>

        {totalShows === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center text-gray-400">Todavía no hay fechas para mostrar.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card label="Fechas totales" value={totalShows} />
              <Card label="Público total" value={totalPublico.toLocaleString('es-AR')} />
            </div>
            <RankTable title="🏙️ Por ciudad" rows={byCity} unit="Ciudad" />
            <RankTable title="📅 Por año" rows={byYear} unit="Año" />
            <RankTable title="🎭 Por sala" rows={byTheater} unit="Sala" />
          </>
        )}
      </div>
    </main>
  )
}
