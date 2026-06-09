import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { updateHotel, deleteHotel } from '@/app/hotels/actions'
import { getHotelFormComedians } from '@/app/hotels/form-options'
import HotelForm from '@/components/HotelForm'

export default async function HotelDetailPage({
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
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para editar hoteles.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, preferences:hotel_comedian_preferences(comedian_id, notes, is_favorite)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!hotel) notFound()

  const comedians = await getHotelFormComedians()
  const updateAction = updateHotel.bind(null, id)
  const deleteAction = deleteHotel.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/hotels" className="text-gray-400 hover:text-white text-sm">
          ← Volver a hoteles
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">Editar hotel</h1>
        <HotelForm
          action={updateAction}
          deleteAction={deleteAction}
          hotel={hotel}
          comedians={comedians}
          mode="edit"
          error={error}
        />
      </div>
    </main>
  )
}
