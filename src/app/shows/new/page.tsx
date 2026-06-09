import Link from 'next/link'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { createShow } from '@/app/shows/actions'
import { getShowFormOptions } from '@/app/shows/form-options'
import ShowForm from '@/components/ShowForm'

export default async function NewShowPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams
  const error = sp.error

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para acceder a esta página.</p>
      </main>
    )
  }

  const { comedians, ensembles, theaters, existingShows } = await getShowFormOptions()

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/shows" className="text-gray-400 hover:text-white text-sm">
          ← Volver a fechas
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">Nueva fecha</h1>
        <ShowForm
          action={createShow}
          comedians={comedians}
          ensembles={ensembles}
          theaters={theaters}
          existingShows={existingShows}
          mode="new"
          error={error}
        />
      </div>
    </main>
  )
}
