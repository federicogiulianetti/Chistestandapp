import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { updateTheater, deleteTheater } from '@/app/theaters/actions'
import TheaterForm from '@/components/TheaterForm'

export default async function TheaterDetailPage({
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

  const supabase = await createClient()
  const { data: theater } = await supabase
    .from('theaters')
    .select('*')
    .eq('id', id)
    .single()

  if (!theater) notFound()

  const canEdit = profile.role === 'admin'
  const updateAction = updateTheater.bind(null, id)
  const deleteAction = deleteTheater.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/theaters" className="text-gray-400 hover:text-white text-sm">
          ← Volver a teatros
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">
          {canEdit ? 'Editar teatro' : theater.name}
        </h1>

        {canEdit ? (
          <TheaterForm
            action={updateAction}
            deleteAction={deleteAction}
            theater={theater}
            mode="edit"
            error={error}
          />
        ) : (
          <TheaterForm
            action={updateAction}
            theater={theater}
            mode="edit"
            error={error}
          />
        )}
      </div>
    </main>
  )
}
