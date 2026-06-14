import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

export default async function EnsemblesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const params = await searchParams
  const error = params.error

  const supabase = await createClient()

  // Traemos los elencos con la cantidad de miembros
  const { data: ensembles } = await supabase
    .from('ensembles')
    .select(`
      id, name, photo_url, city, is_active,
      instagram_handle, facebook_url, twitter_handle, tiktok_handle, youtube_url, spotify_url, website_url,
      ensemble_members(count)
    `)
    .order('name', { ascending: true })

  const canManage = profile.role === 'admin'

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-muted hover:text-body text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-2">Elencos</h1>
            <p className="text-muted mt-1">{ensembles?.length || 0} elencos</p>
          </div>

          {canManage && (
            <Link
              href="/ensembles/new"
              className="px-4 py-2 bg-brand text-[#06210f] font-medium rounded-md hover:opacity-90 transition"
            >
              Nuevo elenco
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        {!ensembles || ensembles.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-12 text-center">
            <p className="text-muted">Todavía no hay elencos cargados.</p>
            {canManage && (
              <Link
                href="/ensembles/new"
                className="inline-block mt-4 px-4 py-2 bg-brand text-[#06210f] font-medium rounded-md hover:opacity-90 transition"
              >
                Crear el primero
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ensembles.map((e) => {
              // @ts-ignore - count viene como array
              const memberCount = e.ensemble_members?.[0]?.count ?? 0
              return (
                <Link
                  key={e.id}
                  href={`/ensembles/${e.id}`}
                  className="bg-surface border border-line rounded-lg p-6 hover:border-zinc-600 hover:bg-surface-2 transition"
                >
                  <div className="flex items-center gap-4 mb-3">
                    {e.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.photo_url}
                        alt={e.name}
                        className="w-16 h-16 rounded-full object-cover bg-surface-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center text-2xl">
                        🎭
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{e.name}</h3>
                      {e.city && <p className="text-sm text-muted">{e.city}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-muted">
                    {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}