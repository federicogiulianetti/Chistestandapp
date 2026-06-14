import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { updateShow, deleteShow } from '@/app/shows/actions'
import { getShowFormOptions } from '@/app/shows/form-options'
import ShowForm from '@/components/ShowForm'

export default async function ShowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const { id } = await params
  const sp = await searchParams
  const error = sp.error

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-ink text-body p-8">
        <p className="text-red-400">No tenés permisos para editar fechas.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: show } = await supabase
    .from('shows')
    .select('*, deductions:show_deductions(label, percentage, fixed_amount, goes_to_artist)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!show) notFound()

  const { comedians, ensembles, theaters, existingShows } = await getShowFormOptions()
  const updateAction = updateShow.bind(null, id)
  const deleteAction = deleteShow.bind(null, id)

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/shows" className="text-muted hover:text-body text-sm">
          ← Volver a fechas
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-8">Editar fecha</h1>
        <ShowForm
          action={updateAction}
          deleteAction={deleteAction}
          show={show}
          comedians={comedians}
          ensembles={ensembles}
          theaters={theaters}
          existingShows={existingShows}
          mode="edit"
          error={error}
        />
      </div>
    </main>
  )
}
