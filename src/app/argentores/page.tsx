import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { assertModuleAccess } from '@/lib/access'
import { type ArgentoresEntry, argentoresTotalsText } from '@/lib/argentores'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'
import ArgentoresLedger from '@/components/ArgentoresLedger'

type RawArg = {
  id: string; show_id: string; comedian_id: string; amount: number; currency: string
  collected: boolean; collected_at: string | null; por_fuera: boolean
  show: { show_date: string | null; city: string | null; theater: { name: string | null } | null } | null
}

export default async function ArgentoresPage({
  searchParams,
}: {
  searchParams: Promise<{ com?: string }>
}) {
  const { user, profile } = await assertModuleAccess('argentores')
  const sp = await searchParams
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
    .select('id, stage_name, photo_url')
    .in('id', comedianIds.length ? comedianIds : ['00000000-0000-0000-0000-000000000000'])
    .order('stage_name')

  const { data: argData } = await supabase
    .from('argentores_entries')
    .select('id, show_id, comedian_id, amount, currency, collected, collected_at, por_fuera, show:show_id(show_date, city, theater:theater_id(name))')
    .in('comedian_id', comedianIds.length ? comedianIds : ['00000000-0000-0000-0000-000000000000'])

  const byComedian = new Map<string, ArgentoresEntry[]>()
  for (const a of ((argData ?? []) as unknown as RawArg[])) {
    const e: ArgentoresEntry = {
      id: a.id, show_id: a.show_id, comedian_id: a.comedian_id, amount: Number(a.amount),
      currency: a.currency, collected: a.collected, collected_at: a.collected_at, por_fuera: a.por_fuera,
      show_date: a.show?.show_date ?? null, theater_name: a.show?.theater?.name ?? null, city: a.show?.city ?? null,
    }
    const arr = byComedian.get(a.comedian_id) ?? []
    arr.push(e)
    byComedian.set(a.comedian_id, arr)
  }
  for (const arr of byComedian.values()) arr.sort((x, y) => (y.show_date ?? '').localeCompare(x.show_date ?? ''))

  const comedians = (comData ?? []).filter(c => (byComedian.get(c.id)?.length ?? 0) > 0 || isAdmin)

  // --- Detalle de un comediante (ledger) ---
  if (sp.com) {
    const c = comedians.find(x => x.id === sp.com)
    if (c) {
      const nombre = c.stage_name ?? 'Sin nombre'
      const color = comedianColor(nombre)
      const entries = byComedian.get(c.id) ?? []
      return (
        <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="text-sm text-faint">
              <Link href="/argentores" className="hover:text-body">Argentores</Link>{' / '}<span className="text-body">{nombre}</span>
            </div>
            <div className="flex items-center gap-3">
              <PerformerAvatar name={nombre} photoUrl={c.photo_url} size={48} />
              <div>
                <h1 className="text-2xl font-bold leading-tight">{nombre}</h1>
                <span className="text-sm" style={{ color }}>Falta cobrar: <span className="font-semibold">{argentoresTotalsText(entries)}</span></span>
              </div>
            </div>
            <ArgentoresLedger entries={entries} canToggle revalidate={`/argentores?com=${c.id}`} />
          </div>
        </main>
      )
    }
  }

  // --- Listado de comediantes (tarjetas) ---
  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Argentores</h1>
          <p className="text-faint mt-1">Plata que cada comediante cobra de Argentores por trámite. Entrá a cada uno y marcá lo que ya cobró.</p>
        </div>

        {comedians.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">
            No tenés comedianes asignados todavía.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {comedians.map(c => {
              const nombre = c.stage_name ?? 'Sin nombre'
              const color = comedianColor(nombre)
              const entries = byComedian.get(c.id) ?? []
              return (
                <Link
                  key={c.id}
                  href={`/argentores?com=${c.id}`}
                  className="group bg-surface border border-line border-t-2 rounded-b-xl p-4 transition-colors hover:bg-surface-2"
                  style={{ borderTopColor: color }}
                >
                  <PerformerAvatar name={nombre} photoUrl={c.photo_url} size={44} />
                  <div className="text-[14px] font-semibold mt-3 truncate text-body">{nombre}</div>
                  <div className="mt-2 pt-2 border-t border-line">
                    <div className="text-[10px] uppercase tracking-wide text-faint">Falta cobrar</div>
                    <div className="text-[13px] font-semibold" style={{ color }}>{argentoresTotalsText(entries)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
