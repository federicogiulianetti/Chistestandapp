import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { createEnsemble } from '../actions'
import PhotoUpload from '@/components/PhotoUpload'

export default async function NewEnsemblePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/ensembles?error=' + encodeURIComponent('No tenés permisos para crear elencos'))
  }

  const params = await searchParams
  const error = params.error

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/ensembles" className="text-muted hover:text-body text-sm">
          ← Elencos
        </Link>

        <h1 className="text-2xl font-bold mt-2 mb-8">Nuevo elenco</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        <form action={createEnsemble} className="space-y-6">
          {/* Sección: Identidad */}
          <section className="bg-surface border border-line rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Identidad</h2>

            <div>
              <label className="block text-sm mb-2">Foto / logo del elenco</label>
              <PhotoUpload bucket="ensemble-photos" name="photo_url" />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm mb-1">
                Nombre del elenco <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ej: Tres tristes tigres"
                className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm mb-1">Bio / descripción</label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                placeholder="Descripción del elenco, historia, propuesta artística..."
                className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm mb-1">Ciudad</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="CABA, Buenos Aires..."
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm mb-1">País</label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  placeholder="Argentina"
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </section>

          {/* Sección: Redes sociales */}
          <section className="bg-surface border border-line rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Redes sociales</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="instagram_handle" className="block text-sm mb-1">Instagram</label>
                <input
                  id="instagram_handle"
                  name="instagram_handle"
                  type="text"
                  placeholder="elenco_oficial (sin @)"
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="tiktok_handle" className="block text-sm mb-1">TikTok</label>
                <input
                  id="tiktok_handle"
                  name="tiktok_handle"
                  type="text"
                  placeholder="elenco_oficial (sin @)"
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="youtube_url" className="block text-sm mb-1">YouTube (URL)</label>
                <input
                  id="youtube_url"
                  name="youtube_url"
                  type="url"
                  placeholder="https://youtube.com/@..."
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="website_url" className="block text-sm mb-1">Sitio web</label>
                <input
                  id="website_url"
                  name="website_url"
                  type="url"
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </section>

          {/* Sección: Notas */}
          <section className="bg-surface border border-line rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Notas internas</h2>
            <p className="text-sm text-muted">Solo visible para el equipo, no se comparte con el elenco.</p>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500"
            />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="w-4 h-4 accent-white"
              />
              <span className="text-sm">Está activo (recibe shows)</span>
            </label>
          </section>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/ensembles"
              className="px-4 py-2 bg-surface-2 border border-line text-body rounded-md hover:bg-surface-2 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-brand text-[#06210f] font-medium rounded-md hover:opacity-90 transition"
            >
              Crear elenco
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}