import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

export default async function TheatersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const params = await searchParams
  const error = params.error

  const supabase = await createClient()
  const { data: theaters } = await supabase
    .from('theaters')
    .select('id, name, city, country, capacity_platea, capacity_pullman, has_pullman, is_active, deal_type, deal_fixed_amount, deal_percentage')
    .order('name', { ascending: true })

  const canManage = profile.role === 'admin'

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">Teatros</h1>
          <p className="text-gray-400 mt-1">
            {theaters?.length ?? 0} {theaters?.length === 1 ? 'teatro' : 'teatros'}
          </p>
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
              className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition"
            >
              + Nuevo teatro
            </Link>
          </div>
        )}

        {(!theaters || theaters.length === 0) ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-4">Todavía no hay teatros cargados.</p>
            {canManage && (
              <Link
                href="/theaters/new"
                className="inline-block px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition"
              >
                Cargar el primero
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Teatro</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Ciudad</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Capacidad</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Arreglo</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Estado</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {theaters.map((t) => {
                  const capacidad = t.has_pullman
                    ? `${t.capacity_platea ?? '?'} platea + ${t.capacity_pullman ?? '?'} pullman`
                    : `${t.capacity_platea ?? '?'} platea`

                  const arreglo = t.deal_type === 'fixed'
                    ? `Fijo $${t.deal_fixed_amount?.toLocaleString('es-AR') ?? '?'}`
                    : t.deal_type === 'percentage'
                    ? `${t.deal_percentage ?? '?'}%`
                    : '—'

                  return (
                    <tr key={t.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.name}</div>
                        {t.country !== 'Argentina' && (
                          <div className="text-xs text-gray-400">{t.country}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{t.city || '—'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{capacidad}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{arreglo}</td>
                      <td className="px-4 py-3">
                        {t.is_active ? (
                          <span className="inline-block bg-green-900/40 text-green-300 px-2 py-1 rounded text-xs">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-block bg-zinc-800 text-gray-400 px-2 py-1 rounded text-xs">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/theaters/${t.id}`}
                          className="text-white hover:underline text-sm"
                        >
                          {canManage ? 'Editar' : 'Ver'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}