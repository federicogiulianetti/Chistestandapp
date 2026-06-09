import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { balancesByCurrency, fmt, type Movement } from '@/lib/accounts'
import { type ArgentoresEntry } from '@/lib/argentores'
import ArgentoresLedger from '@/components/ArgentoresLedger'

export default async function MiCuentaPage() {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()

  // ¿Es comediante vinculado? Si no, es un perfil del equipo.
  const { data: com } = await supabase.from('comedians').select('id, stage_name').eq('profile_id', user.id).maybeSingle()
  const partyType = com ? 'comedian' : 'profile'
  const partyId = com ? com.id : user.id
  const name = com?.stage_name || profile.full_name || profile.email

  const { data: movData } = await supabase
    .from('account_movements')
    .select('id, party_type, party_id, direction, amount, currency, movement_date, concept, source, show_id')
    .eq('party_type', partyType)
    .eq('party_id', partyId)
    .order('movement_date', { ascending: true })
    .order('created_at', { ascending: true })

  const movs = (movData ?? []) as Movement[]
  const bals = balancesByCurrency(movs)

  const running = new Map<string, number>()
  const withRunning = movs.map(m => {
    const prev = running.get(m.currency) ?? 0
    const next = prev + (m.direction === 'credit' ? Number(m.amount) : -Number(m.amount))
    running.set(m.currency, next)
    return { m, running: next }
  }).reverse()

  // Cuenta de Argentores (read-only para el comediante)
  let argEntries: ArgentoresEntry[] = []
  if (com) {
    const { data: argData } = await supabase
      .from('argentores_entries')
      .select('id, show_id, comedian_id, amount, currency, collected, collected_at, show:show_id(show_date, city, theater:theater_id(name))')
      .eq('comedian_id', com.id)
    type RawArg = {
      id: string; show_id: string; comedian_id: string; amount: number; currency: string
      collected: boolean; collected_at: string | null
      show: { show_date: string | null; city: string | null; theater: { name: string | null } | null } | null
    }
    argEntries = ((argData ?? []) as unknown as RawArg[]).map(a => ({
      id: a.id, show_id: a.show_id, comedian_id: a.comedian_id, amount: Number(a.amount),
      currency: a.currency, collected: a.collected, collected_at: a.collected_at,
      show_date: a.show?.show_date ?? null, theater_name: a.show?.theater?.name ?? null, city: a.show?.city ?? null,
    })).sort((x, y) => (y.show_date ?? '').localeCompare(x.show_date ?? ''))
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Mi cuenta corriente</h1>
          <p className="text-gray-400 mt-1">{name}</p>
        </div>

        {bals.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-gray-400">
            Todavía no hay movimientos. Aparecerán cuando se cierren tus borderós y se carguen tus pagos.
          </div>
        ) : (
          bals.map(b => (
            <div key={b.currency} className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-xs text-gray-400">Ganado ({b.currency})</p>
                <p className="text-xl font-bold mt-1">{fmt(b.ganado, b.currency)}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-xs text-gray-400">Cobrado</p>
                <p className="text-xl font-bold mt-1">{fmt(b.cobrado, b.currency)}</p>
              </div>
              <div className={`border rounded-lg p-4 ${b.balance > 0 ? 'bg-green-900/20 border-green-800' : 'bg-zinc-900 border-zinc-800'}`}>
                <p className="text-xs text-gray-400">Falta cobrar</p>
                <p className="text-xl font-bold mt-1">{fmt(b.balance, b.currency)}</p>
              </div>
            </div>
          ))
        )}

        <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-semibold">Fecha</th>
                <th className="text-left px-4 py-2 text-sm font-semibold">Concepto</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Ganó</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Cobró</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {withRunning.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-3 text-sm text-gray-500">Sin movimientos.</td></tr>
              ) : withRunning.map(({ m, running }) => (
                <tr key={m.id} className="border-b border-zinc-800 last:border-0">
                  <td className="px-4 py-2 text-sm whitespace-nowrap">{m.movement_date}</td>
                  <td className="px-4 py-2 text-sm">{m.concept ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-300">{m.direction === 'credit' ? fmt(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-blue-300">{m.direction === 'debit' ? fmt(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-300">{fmt(running, m.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Cuenta de Argentores (lo cobra el comediante por trámite; lo marca el productor) */}
        {com && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">🎟️ Argentores</h2>
              <p className="text-gray-400 text-sm">Plata que cobrás de Argentores por trámite, aparte del borderó. El estado de cobro lo marca tu productor.</p>
            </div>
            <ArgentoresLedger entries={argEntries} canToggle={false} revalidate="/mi-cuenta" />
          </section>
        )}
      </div>
    </main>
  )
}
