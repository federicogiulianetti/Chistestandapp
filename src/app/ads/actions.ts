'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Guarda la grilla de Ads: meta_<showId> y google_<showId>
export async function saveAdSpend(formData: FormData) {
  const supabase = await createClient()

  const submitted = new Map<string, number>() // `${showId}|${platform}` -> monto
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^(meta|google)_(.+)$/)
    if (!m) continue
    const platform = m[1] === 'meta' ? 'Meta' : 'Google'
    const amount = value !== null && value !== '' ? Number(value) : 0
    submitted.set(`${m[2]}|${platform}`, amount)
  }

  const upserts = Array.from(submitted.entries())
    .filter(([, amount]) => amount > 0)
    .map(([k, amount]) => {
      const [show_id, platform] = k.split('|')
      return { show_id, platform, amount, updated_at: new Date().toISOString() }
    })

  if (upserts.length) {
    const { error } = await supabase.from('ad_spend').upsert(upserts, { onConflict: 'show_id,platform' })
    if (error) redirect('/ads?error=' + encodeURIComponent(error.message))
  }

  // Borrar los que se dejaron en 0 pero ya existían
  const { data: existing } = await supabase.from('ad_spend').select('id, show_id, platform')
  const toDelete = (existing ?? [])
    .filter(r => (submitted.get(`${r.show_id}|${r.platform}`) ?? -1) === 0)
    .map(r => r.id)
  if (toDelete.length) await supabase.from('ad_spend').delete().in('id', toDelete)

  revalidatePath('/ads')
  redirect('/ads?success=1')
}
