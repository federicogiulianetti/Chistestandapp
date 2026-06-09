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
      <main className="min-h-screen bg-black text-white p-8">
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
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Equipo y accesos</h1>
          <p className="text-gray-400 mt-1">Invitá a comediantes y al equipo. Cada uno entra con su email y verá lo suyo.</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md">{sp.success}</div>}

        <InviteForm action={inviteUser} roles={roles} unlinkedComedians={unlinkedComedians} />

        <section>
          <h2 className="text-xl font-semibold mb-4">Usuarios ({profiles?.length ?? 0})</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Rol</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map(p => (
                  <tr key={p.id} className="border-b border-zinc-800 last:border-0">
                    <td className="px-4 py-3">{p.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{p.email}</td>
                    <td className="px-4 py-3 text-sm">{roleLabels[p.role as UserRole]}</td>
                    <td className="px-4 py-3">
                      {p.is_active
                        ? <span className="inline-block bg-green-900/40 text-green-300 px-2 py-1 rounded text-xs">Activo</span>
                        : <span className="inline-block bg-zinc-800 text-gray-400 px-2 py-1 rounded text-xs">Inactivo</span>}
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
