import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, roleLabels, type UserRole } from '@/lib/supabase/auth'
import InviteForm, { type RoleOption, type ComedianOption } from '@/components/InviteForm'
import { inviteUser } from './actions'

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-ink text-body p-8">
        <p className="text-red-400">No tenés permisos para gestionar el equipo.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const [{ data: profiles }, { data: comedians }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, is_active').order('full_name'),
    supabase.from('comedians').select('id, stage_name, profile_id').order('stage_name'),
  ])

  const roles: RoleOption[] = (Object.keys(roleLabels) as UserRole[]).map(r => ({ value: r, label: roleLabels[r] }))
  const unlinkedComedians: ComedianOption[] = (comedians ?? [])
    .filter(c => !c.profile_id)
    .map(c => ({ id: c.id, label: c.stage_name ?? 'Sin nombre' }))

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Equipo y accesos</h1>
          <p className="text-faint mt-1">Invitá a comediantes y al equipo. Entrá a “Accesos” de cada uno para definir qué puede ver.</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md">{sp.success}</div>}

        <InviteForm action={inviteUser} roles={roles} unlinkedComedians={unlinkedComedians} />

        <section>
          <h2 className="text-xl font-semibold mb-4">Usuarios ({profiles?.length ?? 0})</h2>
          <div className="bg-surface border border-line rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b border-line">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Rol</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map(p => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{p.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted text-sm">{p.email}</td>
                    <td className="px-4 py-3 text-sm">{roleLabels[p.role as UserRole]}</td>
                    <td className="px-4 py-3">
                      {p.is_active
                        ? <span className="inline-block bg-green-900/40 text-green-300 px-2 py-1 rounded text-xs">Activo</span>
                        : <span className="inline-block bg-surface-2 text-faint px-2 py-1 rounded text-xs">Inactivo</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.role === 'admin'
                        ? <span className="text-faint text-xs">Ve todo</span>
                        : <Link href={`/equipo/${p.id}/accesos`} className="text-brand hover:underline text-sm">Accesos →</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
