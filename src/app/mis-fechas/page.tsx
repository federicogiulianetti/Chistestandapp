import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate, statusMeta } from '@/lib/shows'

type RawShow = {
  id: string
  show_date: string | null
  status: string | null
  city: string | null
  theater: { name: string | null } | null
}

export default async function MisFechasPage() {
  await getUserAndProfile()
  const supabase = await createClient()

  // RLS filtra automáticamente: el comediante solo ve sus fechas
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, status, city, theater:theater_id(name)')
    .is('deleted_at', null)
    .order('show_date', { ascending: false })

  const shows = (data ?? []) as unknown as RawShow[]

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Mis fechas</h1>
        </div>

        {shows.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-12 text-center">
            <p className="text-muted">Todavía no tenés fechas cargadas.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-line">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Fecha</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Teatro</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Ciudad</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {shows.map(s => {
                  const st = statusMeta(s.status)
                  return (
                    <tr key={s.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatShowDate(s.show_date)}</td>
                      <td className="px-4 py-3 text-muted text-sm whitespace-nowrap">{s.theater?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted text-sm whitespace-nowrap">{s.city || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${st.badge}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link href={`/shows/${s.id}/ver`} className="text-brand hover:underline text-sm">Ver</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
