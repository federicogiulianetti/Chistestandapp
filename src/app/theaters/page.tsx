import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { assertModuleAccess } from '@/lib/access'
import TheatersTable from '@/components/TheatersTable'

export default async function TheatersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await assertModuleAccess('theaters')
  const params = await searchParams
  const error = params.error

  const supabase = await createClient()
  const { data: theaters } = await supabase
    .from('theaters')
    .select('id, name, city, province, country, capacity_platea, is_active, deal_type, deal_fixed_amount, deal_percentage')
    .order('name', { ascending: true })

  const canManage = profile.role === 'admin'

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Teatros</h1>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {canManage && (
          <div className="flex justify-end mb-6">
            <Link
              href="/theaters/new"
              className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
            >
              + Nuevo teatro
            </Link>
          </div>
        )}

        {(!theaters || theaters.length === 0) ? (
          <div className="bg-surface border border-line rounded-lg p-12 text-center">
            <p className="text-muted mb-4">Todavía no hay teatros cargados.</p>
            {canManage && (
              <Link
                href="/theaters/new"
                className="inline-block px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition"
              >
                Cargar el primero
              </Link>
            )}
          </div>
        ) : (
          <TheatersTable theaters={theaters} canManage={canManage} />
        )}
      </div>
    </main>
  )
}