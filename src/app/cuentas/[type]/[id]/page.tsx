import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { getModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { arDateKey } from '@/lib/shows'
import { balancesByCurrency, fmt, type Movement } from '@/lib/accounts'
import { type ArgentoresEntry } from '@/lib/argentores'
import { buildRateLookup, usdBalances, fmtUsd, type UsdRate } from '@/lib/usd'
import { addMovement } from '@/app/cuentas/actions'
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
  const { user, profile } = await getUserAndProfile()
  const isAdmin = profile.role === 'admin'
  if (type !== 'comedian' && type !== 'profile') notFound()

  const supabase = await createClient()

  // Enforcement: el productor solo ve la cuenta de un comediante asignado
  if (!isAdmin) {
    const allowed = await getModuleAccess(supabase, profile.id)
    const ok = allowed.has('cuentas') && type === 'comedian' && (await getAssignedComedianIds(supabase, user.id)).has(id)
    if (!ok) {
      return (
        <main className="min-h-screen bg-ink text-body p-8">
          <p className="text-red-400">No tenés permisos para ver esta cuenta.</p>
        </main>
      )
    }
  }

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

  // USD real: convierte cada movimiento ARS al dólar de su fecha (blue/oficial según corte)
  const { data: rateData } = await supabase.from('usd_rates').select('rate_date, blue_sell, oficial_sell')
  const usd = usdBalances(movs, buildRateLookup((rateData ?? []) as UsdRate[]))
  const hasArs = bals.some(b => b.currency === 'ARS')

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
  const fieldCls = "w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body"

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/cuentas" className="text-muted hover:text-body text-sm">← Cuentas</Link>
          <h1 className="text-2xl font-bold mt-2">{name}</h1>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        {/* Saldos por moneda */}
        {bals.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-6 text-muted">Sin movimientos todavía.</div>
        ) : (
          bals.map(b => (
            <div key={b.currency} className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-muted">Ganado ({b.currency})</p>
                <p className="text-xl font-bold mt-1">{fmt(b.ganado, b.currency)}</p>
              </div>
              <div className="bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-muted">Cobrado</p>
                <p className="text-xl font-bold mt-1">{fmt(b.cobrado, b.currency)}</p>
              </div>
              <div className={`border rounded-lg p-4 ${b.balance > 0 ? 'bg-green-900/20 border-green-800' : 'bg-surface border-line'}`}>
                <p className="text-xs text-muted">Falta cobrar</p>
                <p className="text-xl font-bold mt-1">{fmt(b.balance, b.currency)}</p>
              </div>
            </div>
          ))
        )}

        {/* USD real (ajustado por inflación con el dólar de cada fecha) */}
        {hasArs && (
          <div>
            <p className="text-xs text-faint mb-2">En dólares reales (cada movimiento al dólar de su fecha — blue hasta abr-2025, oficial después)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-muted">Ganado (USD)</p>
                <p className="text-xl font-bold mt-1">{fmtUsd(usd.ganado)}</p>
              </div>
              <div className="bg-surface border border-line rounded-lg p-4">
                <p className="text-xs text-muted">Cobrado (USD)</p>
                <p className="text-xl font-bold mt-1">{fmtUsd(usd.cobrado)}</p>
              </div>
              <div className={`border rounded-lg p-4 ${usd.saldo > 0 ? 'bg-green-900/20 border-green-800' : 'bg-surface border-line'}`}>
                <p className="text-xs text-muted">Falta cobrar (USD)</p>
                <p className="text-xl font-bold mt-1">{fmtUsd(usd.saldo)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cargar pago / ajuste (solo admin) */}
        {isAdmin && (
        <section className="bg-surface border border-line rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3">Cargar movimiento</h2>
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
            <button type="submit" className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">Guardar</button>
            <div className="col-span-2 sm:col-span-5">
              <input name="concept" type="text" placeholder="Concepto (ej: transferencia 12/06)" className={fieldCls} />
            </div>
          </form>
        </section>
        )}

        {/* Movimientos */}
        <section className="bg-surface border border-line rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-line">
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
                <tr><td colSpan={5} className="px-4 py-3 text-sm text-faint">Sin movimientos.</td></tr>
              ) : withRunning.map(({ m, running }) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-sm whitespace-nowrap">{m.movement_date}</td>
                  <td className="px-4 py-2 text-sm">
                    {m.concept ?? '—'}
                    {m.source === 'bordero' && <span className="ml-2 text-xs bg-surface-2 text-muted px-1.5 py-0.5 rounded">auto</span>}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-green-300">{m.direction === 'credit' ? fmt(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-brand">{m.direction === 'debit' ? fmt(Number(m.amount), m.currency) : ''}</td>
                  <td className="px-4 py-2 text-sm text-right text-muted">{fmt(running, m.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Cuenta aparte de Argentores (solo comediantes) */}
        {type === 'comedian' && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Argentores (cuenta aparte)</h2>
              <p className="text-muted text-sm">Plata que recauda Argentores y el comediante cobra por trámite. Marcá lo que ya cobró.</p>
            </div>
            <ArgentoresLedger entries={argEntries} canToggle revalidate={`/cuentas/${type}/${id}`} />
          </section>
        )}
      </div>
    </main>
  )
}
