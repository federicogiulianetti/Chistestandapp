import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { updateComedian, deleteComedian } from '@/app/comedians/actions'
import PhotoUpload from '@/components/PhotoUpload'

export default async function ComedianDetailPage({
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
  const { data: comedian } = await supabase
    .from('comedians')
    .select('*')
    .eq('id', id)
    .single()

  if (!comedian) {
    notFound()
  }

  const canEdit = profile.role === 'admin'
  const updateAction = updateComedian.bind(null, id)
  const deleteAction = deleteComedian.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/comedians" className="text-gray-400 hover:text-white text-sm">
          ← Volver a comediantes
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">
          {canEdit ? 'Editar comediante' : 'Detalle de comediante'}
        </h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form action={updateAction} className="space-y-6">
          <fieldset disabled={!canEdit} className="space-y-6 disabled:opacity-90">
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
                  defaultValue={comedian.stage_name ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm mb-1">Nombre real</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  defaultValue={comedian.full_name ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date_of_birth" className="block text-sm mb-1">Fecha de nacimiento</label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    defaultValue={comedian.date_of_birth ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Foto</label>
                  <PhotoUpload
                    name="photo_url"
                    bucket="comedian-photos"
                    defaultValue={comedian.photo_url}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm mb-1">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={comedian.bio ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">Contacto</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm mb-1">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={comedian.email ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm mb-1">Teléfono</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={comedian.phone ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
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
                    defaultValue={comedian.country ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm mb-1">Ciudad</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    defaultValue={comedian.city ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">Redes sociales</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="instagram_handle" className="block text-sm mb-1">Instagram (sin @)</label>
                  <input
                    id="instagram_handle"
                    name="instagram_handle"
                    type="text"
                    defaultValue={comedian.instagram_handle ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="twitter_handle" className="block text-sm mb-1">Twitter (sin @)</label>
                  <input
                    id="twitter_handle"
                    name="twitter_handle"
                    type="text"
                    defaultValue={comedian.twitter_handle ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="tiktok_handle" className="block text-sm mb-1">TikTok (sin @)</label>
                  <input
                    id="tiktok_handle"
                    name="tiktok_handle"
                    type="text"
                    defaultValue={comedian.tiktok_handle ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="youtube_url" className="block text-sm mb-1">YouTube (URL)</label>
                  <input
                    id="youtube_url"
                    name="youtube_url"
                    type="url"
                    defaultValue={comedian.youtube_url ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="spotify_url" className="block text-sm mb-1">Spotify (URL)</label>
                  <input
                    id="spotify_url"
                    name="spotify_url"
                    type="url"
                    defaultValue={comedian.spotify_url ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="website_url" className="block text-sm mb-1">Sitio web</label>
                <input
                  id="website_url"
                  name="website_url"
                  type="url"
                  defaultValue={comedian.website_url ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
              <p className="text-xs text-gray-400">Solo visible para el equipo.</p>

              <div>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={comedian.notes ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  defaultChecked={comedian.is_active}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm">
                  Está activo (recibe shows)
                </label>
              </div>
            </section>
          </fieldset>

          {canEdit && (
            <div className="flex gap-3 justify-between">
              <button
                type="submit"
                formAction={deleteAction}
                className="px-4 py-2 border border-red-700 text-red-400 rounded-md hover:bg-red-900/30 transition"
              >
                Eliminar
              </button>

              <div className="flex gap-3">
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
                  Guardar cambios
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  )
}