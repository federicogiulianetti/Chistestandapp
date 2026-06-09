import Link from 'next/link'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { createHotel } from '@/app/hotels/actions'
import { getHotelFormComedians } from '@/app/hotels/form-options'
import HotelForm from '@/components/HotelForm'

export default async function NewHotelPage({
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

  const comedians = await getHotelFormComedians()

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/hotels" className="text-gray-400 hover:text-white text-sm">
          ← Volver a hoteles
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">Nuevo hotel</h1>
        <HotelForm action={createHotel} comedians={comedians} mode="new" error={error} />
      </div>
    </main>
  )
}
