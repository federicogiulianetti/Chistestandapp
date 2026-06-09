import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, roleLabels, type UserRole } from '@/lib/supabase/auth'
import { addAssignment, removeAssignment } from './actions'

type Assignment = {
  id: string
  role: string | null
  comedian_id: string
  producer: { full_name: string | null; email: string } | null
}

export default async function OrganigramaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams
  const isAdmin = profile.role === 'admin'

  const supabase = await createClient()
  const [{ data: comedians }, { data: profiles }, { data: assignments }] = await Promise.all([
    supabase.from('comedians').select('id, stage_name').order('stage_name'),
    supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
    supabase.from('assignments').select('id, role, comedian_id, producer:producer_id(full_name, email)'),
  ])

  const asgs = (assignments ?? []) as unknown as Assignment[]
  const byComedian = new Map<string, Assignment[]>()
  for (const a of asgs) {
    const arr = byComedian.get(a.comedian_id) ?? []
    arr.push(a)
    byComedian.set(a.comedian_id, arr)
  }

  const inp = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 text-white"
  // Productores candidatos: todo el equipo que no sea comediante
  const producers = (profiles ?? []).filter(p => p.role !== 'comediante')

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Organigrama</h1>
          <p className="text-gray-400 mt-1">Qué productores tiene asignado cada comediante.</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        {isAdmin && (
          <form action={addAssignment} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Comediante</label>
              <select name="comedian_id" required className={inp}>
                <option value="">—</option>
                {(comedians ?? []).map(c => <option key={c.id} value={c.id}>{c.stage_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Productor</label>
              <select name="producer_id" required className={inp}>
                <option value="">—</option>
                {producers.map(p => <option key={p.id} value={p.id}>{(p.full_name || p.email)} ({roleLabels[p.role as UserRole]})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Rol (opcional)</label>
              <input name="role" type="text" placeholder="Ej: productor acompañante" className={inp} />
            </div>
            <button type="submit" className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">Asignar</button>
          </form>
        )}

        <div className="space-y-3">
          {(comedians ?? []).map(c => {
            const list = byComedian.get(c.id) ?? []
            return (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="font-medium mb-2">🎤 {c.stage_name}</p>
                {list.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin productores asignados.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {list.map(a => (
                      <span key={a.id} className="inline-flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1 text-sm">
                        👥 {a.producer?.full_name || a.producer?.email}
                        {a.role && <span className="text-gray-400 text-xs">· {a.role}</span>}
                        {isAdmin && (
                          <form action={removeAssignment.bind(null, a.id)}>
                            <button type="submit" className="text-red-400 hover:text-red-300 text-xs">✕</button>
                          </form>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
