'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  return v !== null && v !== '' ? Number(v) : null
}

export async function createCampaign(formData: FormData) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/campanias?error=' + encodeURIComponent('Sin permisos'))

  const name = (formData.get('name') as string)?.trim()
  if (!name) redirect('/campanias?error=' + encodeURIComponent('Falta el nombre'))

  const supabase = await createClient()
  const { error } = await supabase.from('ad_campaigns').insert({
    name,
    show_id: (formData.get('show_id') as string) || null,
    platform: (formData.get('platform') as string) || 'Meta',
    budget: num(formData, 'budget'),
    spent: num(formData, 'spent'),
    status: (formData.get('status') as string) || 'activa',
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  })
  if (error) redirect('/campanias?error=' + encodeURIComponent(error.message))

  revalidatePath('/campanias')
  redirect('/campanias')
}

export async function deleteCampaign(id: string) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/campanias?error=' + encodeURIComponent('Sin permisos'))
  const supabase = await createClient()
  const { error } = await supabase.from('ad_campaigns').delete().eq('id', id)
  if (error) redirect('/campanias?error=' + encodeURIComponent(error.message))
  revalidatePath('/campanias')
  redirect('/campanias')
}
