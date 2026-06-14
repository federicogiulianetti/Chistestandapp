'use client'

import { useState } from 'react'

export interface RoleOption { value: string; label: string }
export interface ComedianOption { id: string; label: string }

export default function InviteForm({
  action,
  roles,
  unlinkedComedians,
}: {
  action: (formData: FormData) => void | Promise<void>
  roles: RoleOption[]
  unlinkedComedians: ComedianOption[]
}) {
  const [role, setRole] = useState('comediante')
  const inp = "w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body"

  return (
    <form action={action} className="bg-surface border border-line rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">✉️ Invitar a alguien</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Email <span className="text-red-400">*</span></label>
          <input name="email" type="email" required placeholder="persona@email.com" className={inp} />
        </div>
        <div>
          <label className="block text-sm mb-1">Nombre y apellido</label>
          <input name="full_name" type="text" className={inp} />
        </div>
        <div>
          <label className="block text-sm mb-1">Rol</label>
          <select name="role" value={role} onChange={e => setRole(e.target.value)} className={inp}>
            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Teléfono</label>
          <input name="phone" type="tel" placeholder="+54 9 11 2345-6789" className={inp} />
        </div>
      </div>

      {role === 'comediante' && (
        <div>
          <label className="block text-sm mb-1">Vincular a un comediante existente</label>
          <select name="comedian_id" className={inp}>
            <option value="">— No vincular (cuenta nueva) —</option>
            {unlinkedComedians.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <p className="text-xs text-faint mt-1">Así el comediante ve sus fechas, borderós y cuenta corriente.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="px-5 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">
          Enviar invitación
        </button>
      </div>
    </form>
  )
}
