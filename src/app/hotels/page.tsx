import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import HotelsTable, { HotelRow } from '@/components/HotelsTable'

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const params = await searchParams
  const error = params.error

  const supabase = await createClient()
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, city, province, country, has_canje, is_active, hotel_comedian_preferences(count)')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  const rows: HotelRow[] = (hotels ?? []).map(h => ({
    id: h.id,
    name: h.name,
    city: h.city,
    province: h.province,
    country: h.country,
    has_canje: h.has_canje,
    is_active: h.is_active,
    pref_count: (h.hotel_comedian_preferences as { count: number }[])?.[0]?.count ?? 0,
  }))

  const canManage = profile.role === 'admin'

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Hoteles</h1>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {canManage && (
          <div className="flex justify-end mb-6">
            <Link
              href="/hotels/new"
              className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
            >
              + Nuevo hotel
            </Link>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-12 text-center">
            <p className="text-muted mb-4">Todavía no hay hoteles cargados.</p>
            {canManage && (
              <Link
                href="/hotels/new"
                className="inline-block px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
              >
                Cargar el primero
              </Link>
            )}
          </div>
        ) : (
          <HotelsTable hotels={rows} canManage={canManage} />
        )}
      </div>
    </main>
  )
}
