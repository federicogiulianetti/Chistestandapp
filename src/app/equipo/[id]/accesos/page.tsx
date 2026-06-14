import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, roleLabels, type UserRole } from '@/lib/supabase/auth'
import { MODULE_GROUPS, getModuleAccess, getAssignedComedianIds } from '@/lib/access'
import PerformerAvatar from '@/components/PerformerAvatar'
import { saveAccess } from './actions'

export default async function AccesosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-ink text-body p-8">
        <p className="text-red-400">No tenés permisos para gestionar accesos.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: target } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', id)
    .single()
  if (!target) notFound()

  const name = target.full_name || target.email
  const isTargetAdmin = target.role === 'admin'

  const [moduleSet, comedianSet, { data: comedians }] = await Promise.all([
    getModuleAccess(supabase, id),
    getAssignedComedianIds(supabase, id),
    supabase.from('comedians').select('id, stage_name, photo_url').order('stage_name'),
  ])

  const checkbox = 'w-[18px] h-[18px] shrink-0 rounded'

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/equipo" className="text-muted hover:text-body text-sm">← Volver a Equipo y accesos</Link>
        <div className="text-sm text-faint mt-3 mb-4">
          <span className="text-body">{name}</span>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <PerformerAvatar name={name} size={48} />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Accesos de {name}</h1>
            <p className="text-faint text-sm">{roleLabels[target.role as UserRole]} · qué puede ver con su usuario</p>
          </div>
        </div>

        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6">Accesos guardados ✓</div>}
        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">{sp.error}</div>}

        {isTargetAdmin ? (
          <div className="bg-surface border border-line rounded-xl p-8 text-center text-faint">
            Es <span className="text-body font-semibold">Admin</span>: ve y administra todo. No hace falta configurar accesos.
          </div>
        ) : (
          <form action={saveAccess.bind(null, id)} className="space-y-8">
            {/* Módulos */}
            <section>
              <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-faint mb-3">Módulos que puede abrir</h2>
              <div className="space-y-5">
                {MODULE_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="text-[11px] text-muted mb-2">{group.label}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {group.modules.map(m => (
                        <label key={m.key} className="flex items-center gap-2.5 bg-surface border border-line rounded-lg px-3 py-2.5 cursor-pointer hover:bg-surface-2 transition-colors">
                          <input type="checkbox" name="module" value={m.key} defaultChecked={moduleSet.has(m.key)} className={checkbox} style={{ accentColor: '#2ee65c' }} />
                          <span className="text-[13px] truncate">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Comedianes */}
            <section>
              <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-faint mb-1">Comedianes que puede ver</h2>
              <p className="text-faint text-xs mb-3">Tildá un comediante y verá todas sus tarjetas (fechas, borderós, ventas…), incluidas las nuevas que se carguen más adelante.</p>
              {(comedians ?? []).length === 0 ? (
                <p className="text-faint text-sm">No hay comedianes cargados.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(comedians ?? []).map(c => {
                    const cname = c.stage_name ?? 'Sin nombre'
                    return (
                      <label key={c.id} className="flex items-center gap-2.5 bg-surface border border-line rounded-lg px-3 py-2.5 cursor-pointer hover:bg-surface-2 transition-colors">
                        <input type="checkbox" name="comedian" value={c.id} defaultChecked={comedianSet.has(c.id)} className={checkbox} style={{ accentColor: '#2ee65c' }} />
                        <PerformerAvatar name={cname} photoUrl={c.photo_url} size={28} />
                        <span className="text-[13px] truncate">{cname}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="flex justify-between items-center gap-3 sticky bottom-4">
              <Link href="/equipo" className="px-4 py-2.5 bg-surface border border-line text-muted hover:text-body rounded-lg text-sm transition-colors">
                ← Volver a Equipo
              </Link>
              <button type="submit" className="px-6 py-2.5 bg-brand text-[#06210f] font-semibold rounded-lg hover:opacity-90 transition shadow-lg">
                Guardar accesos
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
