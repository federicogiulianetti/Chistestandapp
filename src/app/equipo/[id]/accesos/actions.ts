'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { MODULE_KEYS } from '@/lib/access'

export async function saveAccess(userId: string, formData: FormData) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/equipo?error=' + encodeURIComponent('Sin permisos'))

  const supabase = await createClient()
  const base = `/equipo/${userId}/accesos`

  // --- Módulos: reemplazo total por lo tildado ---
  const modules = formData.getAll('module').map(String).filter(k => MODULE_KEYS.has(k))
  await supabase.from('module_access').delete().eq('user_id', userId)
  if (modules.length) {
    const { error } = await supabase.from('module_access').insert(
      modules.map(module_key => ({ user_id: userId, module_key }))
    )
    if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)
  }

  // --- Comedianes: diff sobre assignments (preserva filas existentes y su role) ---
  const checked = new Set(formData.getAll('comedian').map(String).filter(Boolean))
  const { data: existing } = await supabase
    .from('assignments')
    .select('id, comedian_id')
    .eq('producer_id', userId)
  const existingIds = new Set((existing ?? []).map(a => a.comedian_id as string))

  const toAdd = [...checked].filter(cid => !existingIds.has(cid))
  const toRemove = (existing ?? []).filter(a => !checked.has(a.comedian_id as string)).map(a => a.id)

  if (toAdd.length) {
    const { error } = await supabase.from('assignments').insert(
      toAdd.map(comedian_id => ({ producer_id: userId, comedian_id }))
    )
    if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)
  }
  if (toRemove.length) {
    await supabase.from('assignments').delete().in('id', toRemove)
  }

  revalidatePath(base)
  redirect(`${base}?success=1`)
}
