'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Junta las filas dinámicas del form (cat_i / amt_i / note_i / payee_i)
function collectRows(formData: FormData, showId: string) {
  const rows: { show_id: string; category: string; amount: number; notes: string | null; payee_type: string | null; payee_id: string | null }[] = []
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^cat_(\d+)$/)
    if (!m) continue
    const category = value?.toString().trim()
    if (!category) continue
    const i = m[1]
    const amtRaw = formData.get(`amt_${i}`)
    const amount = amtRaw !== null && amtRaw !== '' ? Number(amtRaw) : 0
    if (!amount) continue // las que quedan en 0 no se guardan
    const note = (formData.get(`note_${i}`) as string)?.trim() || null
    const payeeRaw = (formData.get(`payee_${i}`) as string) || ''
    let payee_type: string | null = null
    let payee_id: string | null = null
    if (payeeRaw.includes(':')) {
      const [t, pid] = payeeRaw.split(':')
      payee_type = t
      payee_id = pid
    }
    rows.push({ show_id: showId, category, amount, notes: note, payee_type, payee_id })
  }
  return rows
}

// Reemplaza las líneas DIRECTAS de la fecha (group_id null). No toca las repartidas.
export async function saveExpenses(showId: string, formData: FormData) {
  const supabase = await createClient()

  await supabase.from('expenses').delete().eq('show_id', showId).is('group_id', null)

  const rows = collectRows(formData, showId)
  if (rows.length > 0) {
    const { error } = await supabase.from('expenses').insert(rows)
    if (error) {
      redirect(`/shows/${showId}/gastos?error=${encodeURIComponent(error.message)}`)
    }
  }

  revalidatePath(`/shows/${showId}/gastos`)
  redirect(`/shows/${showId}/gastos`)
}

// Borra un gasto repartido completo (todas las fechas del group_id)
export async function deleteSharedGroup(showId: string, groupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('group_id', groupId)
  if (error) {
    redirect(`/shows/${showId}/gastos?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath(`/shows/${showId}/gastos`)
  redirect(`/shows/${showId}/gastos`)
}
