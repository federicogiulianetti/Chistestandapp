import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string | null
  label: string
  children: React.ReactNode
}) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="text-gray-400 hover:text-white transition"
    >
      {children}
    </a>
  )
}

export default async function ComediansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const params = await searchParams
  const error = params.error

  const supabase = await createClient()
  const { data: comedians } = await supabase
    .from('comedians')
    .select('id, stage_name, full_name, photo_url, city, is_active, instagram_handle, twitter_handle, tiktok_handle, youtube_url, spotify_url, website_url')
    .order('stage_name', { ascending: true })

  const canManage = profile.role === 'admin'

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold mt-2">Comediantes</h1>
            <p className="text-gray-400 mt-1">
              {comedians?.length ?? 0} {comedians?.length === 1 ? 'comediante' : 'comediantes'}
            </p>
          </div>

          {canManage && (
            <Link
              href="/comedians/new"
              className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition"
            >
              + Nuevo comediante
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {(!comedians || comedians.length === 0) ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-4">Todavía no hay comediantes cargados.</p>
            {canManage && (
              <Link
                href="/comedians/new"
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
                  <th className="text-left px-4 py-3 text-sm font-semibold">Comediante</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Ciudad</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Redes</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Estado</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {comedians.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.photo_url}
                            alt={c.stage_name}
                            className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-gray-500">
                            {c.stage_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{c.stage_name}</div>
                          {c.full_name && (
                            <div className="text-xs text-gray-400">{c.full_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.city || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SocialIcon
                          href={c.instagram_handle ? `https://instagram.com/${c.instagram_handle}` : null}
                          label="Instagram"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                          </svg>
                        </SocialIcon>
                        <SocialIcon
                          href={c.twitter_handle ? `https://twitter.com/${c.twitter_handle}` : null}
                          label="Twitter / X"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </SocialIcon>
                        <SocialIcon
                          href={c.tiktok_handle ? `https://tiktok.com/@${c.tiktok_handle}` : null}
                          label="TikTok"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z" />
                          </svg>
                        </SocialIcon>
                        <SocialIcon
                          href={c.youtube_url}
                          label="YouTube"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                        </SocialIcon>
                        <SocialIcon
                          href={c.spotify_url}
                          label="Spotify"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.42-1.021.599-1.561.3z" />
                          </svg>
                        </SocialIcon>
                        <SocialIcon
                          href={c.website_url}
                          label="Sitio web"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </SocialIcon>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.is_active ? (
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
                        href={`/comedians/${c.id}`}
                        className="text-white hover:underline text-sm"
                      >
                        {canManage ? 'Editar' : 'Ver'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
