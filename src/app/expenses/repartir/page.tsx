import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { FIXED_EXPENSE_CATEGORIES } from '@/lib/expenses'
import RepartirForm, { ShowOption } from '@/components/RepartirForm'
import { createSharedExpense } from '@/app/expenses/actions'

type RawShow = {
  id: string
  show_date: string | null
  performer_type: string | null
  comedian: { stage_name: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null } | null
}

export default async function RepartirPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; success?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para repartir gastos.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name)')
    .is('deleted_at', null)
    .order('show_date', { ascending: true })

  const shows: ShowOption[] = ((data ?? []) as unknown as RawShow[]).map(s => {
    const performer = s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')
    return { id: s.id, label: `${formatShowDate(s.show_date)} — ${performer} — ${s.theater?.name ?? '—'}` }
  })

  const from = sp.from
  const returnTo = from ?? ''

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href={from ? `/shows/${from}/gastos` : '/dashboard'} className="text-gray-400 hover:text-white text-sm">← Volver</Link>
          <h1 className="text-3xl font-bold mt-2">Repartir un gasto entre fechas</h1>
          <p className="text-gray-400 mt-1">Un mismo gasto (ej: aéreos de una gira) dividido entre varias fechas.</p>
        </div>

        {sp.error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>
        )}
        {sp.success && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md">Gasto repartido guardado ✅</div>
        )}

        {shows.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">No hay fechas cargadas para repartir.</p>
          </div>
        ) : (
          <RepartirForm
            action={createSharedExpense}
            shows={shows}
            categories={FIXED_EXPENSE_CATEGORIES}
            preselectedId={from}
            returnTo={returnTo}
          />
        )}
      </div>
    </main>
  )
}
