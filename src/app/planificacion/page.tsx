import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate, statusMeta } from '@/lib/shows'

const GAP_DAYS = 30 // separación ideal entre comediantes en la misma ciudad

type RawShow = {
  id: string
  show_date: string | null
  city: string | null
  status: string | null
  performer_type: string | null
  comedian: { stage_name: string | null } | null
  ensemble: { name: string | null } | null
}

export default async function PlanificacionPage() {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') {
    return <main className="min-h-screen bg-black text-white p-8"><p className="text-red-400">Sin permisos.</p></main>
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, city, status, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name)')
    .is('deleted_at', null)
    .order('show_date', { ascending: true })

  const shows = ((data ?? []) as unknown as RawShow[])
    .filter(s => s.city && s.show_date)
    .map(s => ({
      id: s.id,
      city: s.city as string,
      date: s.show_date as string,
      ms: new Date(s.show_date as string).getTime(),
      status: s.status,
      performer: s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—'),
    }))

  // Conflictos: misma ciudad, distinto artista, dentro de GAP_DAYS
  const conflicts: { city: string; a: typeof shows[number]; b: typeof shows[number]; days: number }[] = []
  const byCity = new Map<string, typeof shows>()
  for (const s of shows) {
    const arr = byCity.get(s.city) ?? []
    arr.push(s)
    byCity.set(s.city, arr)
  }
  for (const [city, arr] of byCity) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i].performer === arr[j].performer) continue
        const days = Math.round(Math.abs(arr[i].ms - arr[j].ms) / 86400000)
        if (days <= GAP_DAYS) conflicts.push({ city, a: arr[i], b: arr[j], days })
      }
    }
  }
  conflicts.sort((x, y) => x.days - y.days)

  const cities = Array.from(byCity.keys()).sort()

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Planificación</h1>
          <p className="text-gray-400 mt-1">Detecta comediantes que se pisan en la misma ciudad (menos de {GAP_DAYS} días).</p>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-3">⚠️ Conflictos ({conflicts.length})</h2>
          {conflicts.length === 0 ? (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-6 text-green-300 text-sm">
              No hay comediantes pisándose dentro de {GAP_DAYS} días. 🎉
            </div>
          ) : (
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm">
                  <p className="font-medium">🏙️ {c.city} — a {c.days} días</p>
                  <p className="text-gray-300 mt-1">
                    {c.a.performer} ({formatShowDate(c.a.date)}) ↔ {c.b.performer} ({formatShowDate(c.b.date)})
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">📍 Agenda por ciudad</h2>
          <div className="space-y-4">
            {cities.map(city => (
              <div key={city} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="font-medium mb-2">{city}</p>
                <div className="space-y-1">
                  {(byCity.get(city) ?? []).map(s => {
                    const st = statusMeta(s.status)
                    return (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span>{formatShowDate(s.date)} — {s.performer}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${st.badge}`}>{st.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
