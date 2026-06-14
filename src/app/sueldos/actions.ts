'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { arDateKey } from '@/lib/shows'
import { CHARGE_TYPE_KEYS } from '@/lib/staff'

async function requireAdmin() {
  const { user, profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/dashboard')
  return user
}

export async function createStaff(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const name = (formData.get('name') as string)?.trim()
  if (!name) redirect('/sueldos?error=' + encodeURIComponent('Poné un nombre'))
  const role = (formData.get('role') as string)?.trim() || null
  const alias_cbu = (formData.get('alias_cbu') as string)?.trim() || null

  const { data, error } = await supabase.from('staff').insert({ name, role, alias_cbu }).select('id').single()
  if (error) redirect('/sueldos?error=' + encodeURIComponent(error.message))
  redirect(`/sueldos/${data!.id}`)
}

export async function addStaffMovement(staffId: string, formData: FormData) {
  const user = await requireAdmin()
  const supabase = await createClient()
  const base = `/sueldos/${staffId}`

  const direction = (formData.get('direction') as string) === 'debit' ? 'debit' : 'credit'
  const amount = Math.abs(Number(formData.get('amount')) || 0)
  if (!amount) redirect(`${base}?error=${encodeURIComponent('Poné un monto')}`)
  const movement_date = (formData.get('movement_date') as string) || arDateKey(new Date().toISOString())
  const concept = (formData.get('concept') as string)?.trim() || null
  const currency = (formData.get('currency') as string)?.trim() || 'ARS'
  const ctRaw = (formData.get('charge_type') as string) || ''
  const charge_type = direction === 'credit' && CHARGE_TYPE_KEYS.has(ctRaw) ? ctRaw : null
  const showRaw = (formData.get('show_id') as string) || ''
  const show_id = showRaw || null

  const { error } = await supabase.from('staff_movements').insert({
    staff_id: staffId, movement_date, concept, amount, direction, charge_type, show_id, currency, created_by: user.id,
  })
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(base)
  revalidatePath('/sueldos')
  redirect(`${base}?success=1`)
}

export async function deleteStaffMovement(staffId: string, movId: string) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('staff_movements').delete().eq('id', movId).eq('staff_id', staffId)
  revalidatePath(`/sueldos/${staffId}`)
  revalidatePath('/sueldos')
  redirect(`/sueldos/${staffId}?success=1`)
}
