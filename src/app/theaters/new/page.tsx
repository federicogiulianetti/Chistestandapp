import Link from 'next/link'
import { getUserAndProfile } from '@/lib/supabase/auth'
import NewTheaterForm from '@/components/NewTheaterForm'

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
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para acceder a esta página.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/theaters" className="text-gray-400 hover:text-white text-sm">
          ← Volver a teatros
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">Nuevo teatro</h1>
        <NewTheaterForm error={error} />
      </div>
    </main>
  )
}
