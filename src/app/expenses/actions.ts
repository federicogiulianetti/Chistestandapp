'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Crea un gasto repartido: una línea por fecha seleccionada, unidas por group_id.
export async function createSharedExpense(formData: FormData) {
  const supabase = await createClient()

  const category = (formData.get('category') as string)?.trim()
  const notes = (formData.get('notes') as string)?.trim() || null
  const returnTo = (formData.get('return_to') as string)?.trim() || ''

  if (!category) {
    redirect(`/expenses/repartir?error=${encodeURIComponent('Falta la categoría')}`)
  }

  // share_<showId> = monto asignado a esa fecha
  const rows: { show_id: string; category: string; amount: number; notes: string | null; group_id: string }[] = []
  const groupId = randomUUID()
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^share_(.+)$/)
    if (!m) continue
    const amount = value !== null && value !== '' ? Number(value) : 0
    if (!amount) continue
    rows.push({ show_id: m[1], category, amount, notes, group_id: groupId })
  }

  if (rows.length === 0) {
    redirect(`/expenses/repartir?error=${encodeURIComponent('Elegí al menos una fecha con monto')}`)
  }

  const { error } = await supabase.from('expenses').insert(rows)
  if (error) {
    redirect(`/expenses/repartir?error=${encodeURIComponent(error.message)}`)
  }

  if (returnTo) {
    revalidatePath(`/shows/${returnTo}/gastos`)
    redirect(`/shows/${returnTo}/gastos`)
  }
  redirect('/expenses/repartir?success=1')
}
