import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { updateEnsemble, deleteEnsemble, addMember, removeMember } from '../actions'
import PhotoUpload from '@/components/PhotoUpload'
import ConfirmSubmit from '@/components/ConfirmSubmit'

export default async function EnsembleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; success?: string; ver?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const { id } = await params
  const sp = await searchParams
  const error = sp.error
  const success = sp.success

  const supabase = await createClient()

  const { data: ensemble } = await supabase
    .from('ensembles')
    .select('*')
    .eq('id', id)
    .single()

  if (!ensemble) {
    notFound()
  }

  const { data: members } = await supabase
    .from('ensemble_members')
    .select(`
      id, role, joined_at,
      comedians (id, stage_name, full_name, photo_url, city)
    `)
    .eq('ensemble_id', id)
    .order('joined_at', { ascending: true })

  const memberIds = (members ?? []).map((m: any) => m.comedians?.id).filter(Boolean)
  const { data: availableComedians } = await supabase
    .from('comedians')
    .select('id, stage_name')
    .eq('is_active', true)
    .order('stage_name', { ascending: true })

  const filteredAvailable = (availableComedians ?? []).filter(
    (c) => !memberIds.includes(c.id)
  )

  const canManage = profile.role === 'admin' && sp.ver !== '1'
  const updateAction = updateEnsemble.bind(null, id)
  const deleteAction = deleteEnsemble.bind(null, id)
  const addMemberAction = addMember.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/ensembles" className="text-gray-400 hover:text-white text-sm">
          ← Elencos
        </Link>

        <h1 className="text-3xl font-bold mt-2 mb-2">{ensemble.name}</h1>
        <p className="text-gray-400 mb-8">
          {members?.length ?? 0} {(members?.length ?? 0) === 1 ? 'miembro' : 'miembros'}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-green-900/30 border border-green-700 text-green-300 rounded-md text-sm">
            Cambios guardados.
          </div>
        )}

        {/* Sección: Miembros */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">👥 Miembros</h2>

          {!members || members.length === 0 ? (
            <p className="text-gray-400 text-sm mb-4">Todavía no hay miembros en este elenco.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {members.map((m: any) => {
                const c = m.comedians
                if (!c) return null
                return (
                  <div
                    key={m.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 relative"
                  >
                    {canManage && (
                      <form action={removeMember.bind(null, id, m.id)} className="absolute top-2 right-2">
                        <button
                          type="submit"
                          className="bg-red-600/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                          title="Quitar del elenco"
                        >
                          ✕
                        </button>
                      </form>
                    )}
                    <div className="flex flex-col items-center text-center">
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photo_url}
                          alt={c.stage_name}
                          className="w-16 h-16 rounded-full object-cover bg-zinc-700"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-xl">
                          {c.stage_name?.[0] ?? '?'}
                        </div>
                      )}
                      <p className="font-medium text-sm mt-2">{c.stage_name}</p>
                      {c.city && <p className="text-xs text-gray-400">{c.city}</p>}
                      {m.role && <p className="text-xs text-gray-500 mt-1">{m.role}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {canManage && filteredAvailable.length > 0 && (
            <form action={addMemberAction} className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-zinc-800">
              <select
                name="comedian_id"
                required
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              >
                <option value="">🎤 Elegí un comediante...</option>
                {filteredAvailable.map((c) => (
                  <option key={c.id} value={c.id}>{c.stage_name}</option>
                ))}
              </select>
              <input
                name="role"
                type="text"
                placeholder="Rol (opcional)"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black font-medium rounded-md hover:bg-gray-200 transition"
              >
                + Agregar
              </button>
            </form>
          )}

          {canManage && filteredAvailable.length === 0 && (members?.length ?? 0) > 0 && (
            <p className="text-sm text-gray-500 pt-4 border-t border-zinc-800">
              Todos los comediantes activos ya están en este elenco.
            </p>
          )}
        </section>

        {/* Form de edición */}
        <form action={updateAction} className="space-y-6">
          <fieldset disabled={!canManage} className="space-y-6">
            {/* Identidad */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">🎭 Identidad</h2>

              <div>
                <label className="block text-sm mb-2">📸 Foto / logo del elenco</label>
                <PhotoUpload
                  bucket="ensemble-photos"
                  name="photo_url"
                  defaultValue={ensemble.photo_url}
                  disabled={!canManage}
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm mb-1">
                  🎭 Nombre del elenco <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  defaultValue={ensemble.name ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm mb-1">📝 Bio / descripción</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  defaultValue={ensemble.bio ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm mb-1">🏙️ Ciudad</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    defaultValue={ensemble.city ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm mb-1">🌎 País</label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    defaultValue={ensemble.country ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
              </div>
            </section>

            {/* Redes */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">📱 Redes sociales</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="instagram_handle" className="block text-sm mb-1">📷 Instagram</label>
                  <input
                    id="instagram_handle"
                    name="instagram_handle"
                    type="text"
                    defaultValue={ensemble.instagram_handle ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="tiktok_handle" className="block text-sm mb-1">🎵 TikTok</label>
                  <input
                    id="tiktok_handle"
                    name="tiktok_handle"
                    type="text"
                    defaultValue={ensemble.tiktok_handle ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="youtube_url" className="block text-sm mb-1">▶️ YouTube (URL)</label>
                  <input
                    id="youtube_url"
                    name="youtube_url"
                    type="url"
                    defaultValue={ensemble.youtube_url ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label htmlFor="website_url" className="block text-sm mb-1">🌐 Sitio web</label>
                  <input
                    id="website_url"
                    name="website_url"
                    type="url"
                    defaultValue={ensemble.website_url ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
                  />
                </div>
              </div>
            </section>

            {/* Notas */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-2">📝 Notas internas</h2>

              <textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={ensemble.notes ?? ''}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={ensemble.is_active}
                  className="w-4 h-4 accent-white"
                />
                <span className="text-sm">✅ Está activo (recibe shows)</span>
              </label>
            </section>
          </fieldset>

          {canManage && (
            <div className="flex items-center justify-end gap-3">
              <Link
                href="/ensembles"
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md hover:bg-zinc-700 transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black font-medium rounded-md hover:bg-gray-200 transition"
              >
                Guardar cambios
              </button>
            </div>
          )}
        </form>

        {/* Borrar elenco (afuera del form principal) */}
        {canManage && (
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <form action={deleteAction}>
              <ConfirmSubmit
                message="¿Seguro que querés borrar este elenco? Esta acción no se puede deshacer."
                className="px-4 py-2 bg-red-900/30 border border-red-700 text-red-300 rounded-md hover:bg-red-900/50 transition text-sm"
              >
                Borrar elenco
              </ConfirmSubmit>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}