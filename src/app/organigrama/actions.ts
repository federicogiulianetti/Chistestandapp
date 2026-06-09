'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

export async function addAssignment(formData: FormData) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/organigrama?error=' + encodeURIComponent('Sin permisos'))

  const comedian_id = (formData.get('comedian_id') as string) || ''
  const producer_id = (formData.get('producer_id') as string) || ''
  const role = (formData.get('role') as string)?.trim() || null
  if (!comedian_id || !producer_id) redirect('/organigrama?error=' + encodeURIComponent('Elegí comediante y productor'))

  const supabase = await createClient()
  const { error } = await supabase.from('assignments').insert({ comedian_id, producer_id, role })
  if (error) redirect('/organigrama?error=' + encodeURIComponent(error.message))

  revalidatePath('/organigrama')
  redirect('/organigrama')
}

export async function removeAssignment(id: string) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/organigrama?error=' + encodeURIComponent('Sin permisos'))
  const supabase = await createClient()
  const { error } = await supabase.from('assignments').delete().eq('id', id)
  if (error) redirect('/organigrama?error=' + encodeURIComponent(error.message))
  revalidatePath('/organigrama')
  redirect('/organigrama')
}
