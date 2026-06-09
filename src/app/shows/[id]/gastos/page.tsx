import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { FIXED_EXPENSE_CATEGORIES, sumExpenses, formatMoney, type ExpenseRow } from '@/lib/expenses'
import { roleLabels, type UserRole } from '@/lib/supabase/auth'
import ExpensesForm, { type PersonOption } from '@/components/ExpensesForm'
import { saveExpenses, deleteSharedGroup } from './actions'

export default async function GastosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const error = sp.error
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para ver los gastos.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: show } = await supabase
    .from('shows')
    .select('id, show_date, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!show) notFound()

  const [{ data: expData }, { data: comediansData }, { data: profilesData }] = await Promise.all([
    supabase.from('expenses').select('id, show_id, category, amount, notes, group_id, payee_type, payee_id').eq('show_id', id).order('created_at', { ascending: true }),
    supabase.from('comedians').select('id, stage_name').order('stage_name'),
    supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
  ])

  const people: PersonOption[] = [
    ...(comediansData ?? []).map(c => ({ value: `comedian:${c.id}`, label: `🎤 ${c.stage_name ?? 'Sin nombre'}` })),
    ...(profilesData ?? []).map(p => ({ value: `profile:${p.id}`, label: `👥 ${p.full_name || p.email} (${roleLabels[p.role as UserRole]})` })),
  ]

  const all = (expData ?? []) as ExpenseRow[]
  const direct = all.filter(e => !e.group_id)
  const shared = all.filter(e => e.group_id)
  const total = sumExpenses(all)

  const sh = show as unknown as {
    show_date: string | null; performer_type: string | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
    theater: { name: string | null } | null
  }
  const performer = sh.performer_type === 'elenco' ? (sh.ensemble?.name ?? '—') : (sh.comedian?.stage_name ?? '—')

  const saveAction = saveExpenses.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href={`/shows/${id}/ver`} className="text-gray-400 hover:text-white text-sm">← Volver al show</Link>
          <div className="flex items-center justify-between mt-2 gap-4">
            <h1 className="text-3xl font-bold">Gastos — {performer}</h1>
            <Link href={`/expenses/repartir?from=${id}`} className="px-4 py-2 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition text-sm flex-shrink-0">
              ↔️ Repartir gasto entre fechas
            </Link>
          </div>
          <p className="text-gray-400 mt-1">{sh.theater?.name ?? '—'} · {formatShowDate(sh.show_date)}</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{error}</div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-gray-400">💰 Total de gastos de la fecha</span>
          <span className="text-2xl font-bold">{formatMoney(total)}</span>
        </div>

        {/* Gastos repartidos (vienen de otras cargas) */}
        {shared.length > 0 && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <h2 className="text-lg font-semibold p-4 pb-2">↔️ Gastos repartidos (parte de esta fecha)</h2>
            <table className="w-full">
              <tbody>
                {shared.map(e => (
                  <tr key={e.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2 text-sm">{e.category}{e.notes ? ` — ${e.notes}` : ''}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatMoney(e.amount)}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteSharedGroup.bind(null, id, e.group_id as string)}>
                        <button type="submit" className="text-red-400 hover:text-red-300 text-xs" title="Borra el gasto repartido completo (todas las fechas)">Quitar reparto</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Grilla de gastos directos */}
        <div>
          <h2 className="text-lg font-semibold mb-3">🧾 Gastos de la fecha</h2>
          <ExpensesForm action={saveAction} fixedCategories={FIXED_EXPENSE_CATEGORIES} directExpenses={direct} people={people} />
        </div>
      </div>
    </main>
  )
}
