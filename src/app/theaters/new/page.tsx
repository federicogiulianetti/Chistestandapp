import Link from 'next/link'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { createTheater } from '@/app/theaters/actions'
import TheaterForm from '@/components/TheaterForm'

export default async function NewTheaterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams
  const error = sp.error

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-ink text-body p-8">
        <p className="text-red-400">No tenés permisos para acceder a esta página.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/theaters" className="text-muted hover:text-body text-sm">
          ← Volver a teatros
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-8">Nuevo teatro</h1>
        <TheaterForm action={createTheater} mode="new" error={error} />
      </div>
    </main>
  )
}