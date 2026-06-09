import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { type ArgentoresEntry, argentoresTotalsText } from '@/lib/argentores'
import ArgentoresLedger from '@/components/ArgentoresLedger'

type RawArg = {
  id: string; show_id: string; comedian_id: string; amount: number; currency: string
  collected: boolean; collected_at: string | null
  show: { show_date: string | null; city: string | null; theater: { name: string | null } | null } | null
}

export default async function ArgentoresPage() {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  // Comedianes que el usuario puede gestionar: admin = todos; productor = sus asignados.
  let comedianIds: string[] = []
  if (isAdmin) {
    const { data } = await supabase.from('comedians').select('id').order('stage_name')
    comedianIds = (data ?? []).map(c => c.id)
  } else {
    const { data } = await supabase.from('assignments').select('comedian_id').eq('producer_id', user.id)
    comedianIds = Array.from(new Set((data ?? []).map(a => a.comedian_id)))
  }

  const { data: comData } = await supabase
    .from('comedians')
    .select('id, stage_name')
    .in('id', comedianIds.length ? comedianIds : ['00000000-0000-0000-0000-000000000000'])
    .order('stage_name')

  const { data: argData } = await supabase
    .from('argentores_entries')
    .select('id, show_id, comedian_id, amount, currency, collected, collected_at, show:show_id(show_date, city, theater:theater_id(name))')
    .in('comedian_id', comedianIds.length ? comedianIds : ['00000000-0000-0000-0000-000000000000'])

  const byComedian = new Map<string, ArgentoresEntry[]>()
  for (const a of ((argData ?? []) as unknown as RawArg[])) {
    const e: ArgentoresEntry = {
      id: a.id, show_id: a.show_id, comedian_id: a.comedian_id, amount: Number(a.amount),
      currency: a.currency, collected: a.collected, collected_at: a.collected_at,
      show_date: a.show?.show_date ?? null, theater_name: a.show?.theater?.name ?? null, city: a.show?.city ?? null,
    }
    const arr = byComedian.get(a.comedian_id) ?? []
    arr.push(e)
    byComedian.set(a.comedian_id, arr)
  }
  for (const arr of byComedian.values()) arr.sort((x, y) => (y.show_date ?? '').localeCompare(x.show_date ?? ''))

  const comedians = (comData ?? []).filter(c => (byComedian.get(c.id)?.length ?? 0) > 0 || isAdmin)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">🎟️ Argentores</h1>
          <p className="text-gray-400 mt-1">Plata que cada comediante cobra de Argentores por trámite. Marcá lo que ya cobró según lo que te informe.</p>
        </div>

        {comedians.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center text-gray-400">
            No tenés comedianes asignados todavía.
          </div>
        ) : (
          comedians.map(c => {
            const entries = byComedian.get(c.id) ?? []
            return (
              <section key={c.id} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">{c.stage_name ?? 'Sin nombre'}</h2>
                  <span className="text-sm text-gray-400">Falta cobrar: <span className="text-amber-300 font-medium">{argentoresTotalsText(entries)}</span></span>
                </div>
                <ArgentoresLedger entries={entries} canToggle revalidate="/argentores" />
              </section>
            )
          })
        )}
      </div>
    </main>
  )
}
