import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey } from '@/lib/shows'
import { balancesByCurrency, fmt, type Movement } from '@/lib/accounts'
import { type ArgentoresEntry } from '@/lib/argentores'
import { addMovement, deleteMovement } from '@/app/cuentas/actions'
import ArgentoresLedger from '@/components/ArgentoresLedger'

export default async function CuentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { type, id } = await params
  const sp = await searchParams
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para ver esta cuenta.</p>
      </main>
    )
  }
  if (type !== 'comedian' && type !== 'profile') notFound()

  const supabase = await createClient()

  let name = '—'
  if (type === 'comedian') {
    const { data } = await supabase.from('comedians').select('stage_name').eq('id', id).single()
    if (!data) notFound()
    name = data.stage_name ?? 'Sin nombre'
  } else {
    const { data } = await supabase.from('profiles').select('full_name, email').eq('id', id).single()
    if (!data) notFound()
    name = data.full_name || data.email
  }

  const { data: movData } = await supabase
    .from('account_movements')
    .select('id, party_type, party_id, direction, amount, currency, movement_date, concept, source, show_id')
    .eq('party_type', type)
    .eq('party_id', id)
    .order('movement_date', { ascending: true })
    .order('created_at', { ascending: true })

  const movs = (movData ?? []) as Movement[]
  const bals = balancesByCurrency(movs)

  // Saldo corriente por moneda (cronológico) y después invertimos para mostrar lo último primero
  const running = new Map<string, number>()
  const withRunning = movs.map(m => {
    const prev = running.get(m.currency) ?? 0
    const next = prev + (m.direction === 'credit' ? Number(m.amount) : -Number(m.amount))
    running.set(m.currency, next)
    return { m, running: next }
  }).reverse()

  // Cuenta de Argentores (solo comediantes): plata que cobran de Argentores aparte
  let argEntries: ArgentoresEntry[] = []
  if (type === 'comedian') {
    const { data: argData } = await supabase
      .from('argentores_entries')
      .select('id, show_id, comedian_id, amount, currency, collected, collected_at, por_fuera, show:show_id(show_date, city, theater:theater_id(name))')
      .eq('comedian_id', id)
    type RawArg = {
      id: string; show_id: string; comedian_id: string; amount: number; currency: string
      collected: boolean; collected_at: string | null; por_fuera: boolean
      show: { show_date: string | null; city: string | null; theater: { name: string | null } | null } | null
    }
    argEntries = ((argData ?? []) as unknown as RawArg[]).map(a => ({
      id: a.id, show_id: a.show_id, comedian_id: a.comedian_id, amount: Number(a.amount),
      currency: a.currency, collected: a.collected, collected_at: a.collected_at, por_fuera: a.por_fuera,
      show_date: a.show?.show_date ?? null, theater_name: a.show?.theater?.name ?? null, city: a.show?.city ?? null,
    })).sort((x, y) => (y.show_date ?? '').localeCompare(x.show_date ?? ''))
  }

  const todayKey = arDateKey(new Date().toISOString())
  const addAction = addMovement.bind(null, type, id)
  const fieldCls = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 text-white"

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/cuentas" className="text-gray-400 hover:text-white text-sm">← Cuentas</Link>
          <h1 className="text-3xl font-bold mt-2">{name}</h1>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        {/* Saldos por moneda */}
        {bals.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-gray-400">Sin movimientos todavía.</div>
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

        {/* Cargar pago / ajuste */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3">➕ Cargar movimiento</h2>
          <form action={addAction} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm mb-1">Tipo</label>
              <select name="direction" defaultValue="debit" className={fieldCls}>
                <option value="debit">Pago (cobrado)</option>
                <option value="credit">Ajuste a favor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Monto</label>
              <input name="amount" type="number" step="0.01" min="0" required className={`${fieldCls} text-right`} />
            </div>
            <div>
              <label className="block text-sm mb-1">Moneda</label>
              <input name="currency" type="text" defaultValue="ARS" className={fieldCls} />
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha</label>
              <input name="movement_date" type="date" defaultValue={todayKey} className={fieldCls} />
            </div>
            <button type="submit" className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">Guardar</button>
            <div className="col-span-2 sm:col-span-5">
              <input name="concept" type="text" placeholder="Concepto (ej: transferencia 12/06)" className={fieldCls} />
            </div>
          </form>
        </section>

        {/* Movimientos */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-semibold">Fecha</th>
                <th className="text-left px-4 py-2 text-sm font-semibold">Concepto</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Ganó</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Cobró</th>
                <th className="text-right px-4 py-2 text-sm font-semibold">Saldo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {withRunning.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-3 text-sm text-gray-500">Sin movimientos.</td></tr>
              ) : withRunning.map(({ m, running }) => (
                <tr key={m.id} className="border-b border-zinc-800 last:border-0">
                  <td className="px-4 py-2 text-sm whitespace-nowrap">{m.movement_date}</td>
                  <td className="px-4 py-2 text-sm">
                    {m.concept ?? '—'}
                    {m.source === 'bordero' && <span className="ml-2 text-xs bg-zinc-800 text-gray-400 px-1.5 py-0.5 rounded">auto</span>}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-green-300">{m.direction === 'credit' ? fmt(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-blue-300">{m.direction === 'debit' ? fmt(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-300">{fmt(running, m.currency)}</td>
                  <td className="px-4 py-2 text-right">
                    {m.source === 'manual' && (
                      <form action={deleteMovement.bind(null, type, id, m.id)}>
                        <button type="submit" className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Cuenta aparte de Argentores (solo comediantes) */}
        {type === 'comedian' && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">🎟️ Argentores (cuenta aparte)</h2>
              <p className="text-gray-400 text-sm">Plata que recauda Argentores y el comediante cobra por trámite. Marcá lo que ya cobró.</p>
            </div>
            <ArgentoresLedger entries={argEntries} canToggle revalidate={`/cuentas/${type}/${id}`} />
          </section>
        )}
      </div>
    </main>
  )
}
