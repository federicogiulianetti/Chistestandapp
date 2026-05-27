import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { createComedian } from '@/app/comedians/actions'
import PhotoUpload from '@/components/PhotoUpload'

export default async function NewComedianPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/comedians?error=' + encodeURIComponent('No tenés permisos'))
  }

  const params = await searchParams
  const error = params.error

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/comedians" className="text-gray-400 hover:text-white text-sm">
          ← Volver a comediantes
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">Nuevo comediante</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form action={createComedian} className="space-y-6">
          {/* Sección: Identidad */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Identidad</h2>

            <div>
              <label htmlFor="stage_name" className="block text-sm mb-1">
                Nombre artístico <span className="text-red-400">*</span>
              </label>
              <input
                id="stage_name"
                name="stage_name"
                type="text"
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm mb-1">Nombre real</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date_of_birth" className="block text-sm mb-1">Fecha de nacimiento</label>
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Foto</label>
                <PhotoUpload
                  name="photo_url"
                  bucket="comedian-photos"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm mb-1">Bio</label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>
          </section>

          {/* Sección: Contacto */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Contacto</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm mb-1">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm mb-1">Teléfono</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm mb-1">País</label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  defaultValue="Argentina"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm mb-1">Ciudad</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </section>

          {/* Sección: Redes sociales */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Redes sociales</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="instagram_handle" className="block text-sm mb-1">Instagram (sin @)</label>
                <input
                  id="instagram_handle"
                  name="instagram_handle"
                  type="text"
                  placeholder="usuario"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="twitter_handle" className="block text-sm mb-1">Twitter (sin @)</label>
                <input
                  id="twitter_handle"
                  name="twitter_handle"
                  type="text"
                  placeholder="usuario"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="tiktok_handle" className="block text-sm mb-1">TikTok (sin @)</label>
                <input
                  id="tiktok_handle"
                  name="tiktok_handle"
                  type="text"
                  placeholder="usuario"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="youtube_url" className="block text-sm mb-1">YouTube (URL)</label>
                <input
                  id="youtube_url"
                  name="youtube_url"
                  type="url"
                  placeholder="https://youtube.com/..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="spotify_url" className="block text-sm mb-1">Spotify (URL)</label>
                <input
                  id="spotify_url"
                  name="spotify_url"
                  type="url"
                  placeholder="https://open.spotify.com/..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="website_url" className="block text-sm mb-1">Sitio web</label>
              <input
                id="website_url"
                name="website_url"
                type="url"
                placeholder="https://..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>
          </section>

          {/* Sección: Interno */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-xs text-gray-400">Solo visible para el equipo, no se comparte con el comediante.</p>

            <div>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm">
                Está activo (recibe shows)
              </label>
            </div>
          </section>

          <div className="flex gap-3 justify-end">
            <Link
              href="/comedians"
              className="px-4 py-2 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition"
            >
              Crear comediante
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}