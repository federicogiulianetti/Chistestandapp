import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import ShowsTable, { ShowRow } from '@/components/ShowsTable'

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { user, profile } = await assertModuleAccess('shows')
  const params = await searchParams
  const error = params.error
  const isAdmin = profile.role === 'admin'

  const supabase = await createClient()
  const { data: showsData } = await supabase
    .from('shows')
    .select('id, show_date, status, city, performer_type, comedian_id, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name)')
    .is('deleted_at', null)
    .order('show_date', { ascending: true })

  let shows = (showsData ?? []) as ({ comedian_id: string | null } & Record<string, unknown>)[]
  if (!isAdmin) {
    const assigned = await getAssignedComedianIds(supabase, user.id)
    shows = shows.filter(s => s.comedian_id != null && assigned.has(s.comedian_id))
  }

  const canManage = isAdmin

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Shows / Fechas</h1>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {canManage && (
          <div className="flex justify-end mb-6">
            <Link
              href="/shows/new"
              className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
            >
              + Nueva fecha
            </Link>
          </div>
        )}

        {(!shows || shows.length === 0) ? (
          <div className="bg-surface border border-line rounded-lg p-12 text-center">
            <p className="text-muted mb-4">Todavía no hay fechas cargadas.</p>
            {canManage && (
              <Link
                href="/shows/new"
                className="inline-block px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
              >
                Cargar la primera
              </Link>
            )}
          </div>
        ) : (
          <ShowsTable shows={shows as unknown as ShowRow[]} canManage={canManage} />
        )}
      </div>
    </main>
  )
}
