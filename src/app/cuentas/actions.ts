'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addMovement(partyType: string, partyId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const direction = (formData.get('direction') as string) === 'credit' ? 'credit' : 'debit'
  const amountRaw = formData.get('amount')
  const amount = amountRaw !== null && amountRaw !== '' ? Number(amountRaw) : 0
  const currency = (formData.get('currency') as string)?.trim() || 'ARS'
  const movement_date = (formData.get('movement_date') as string) || null
  const concept = (formData.get('concept') as string)?.trim() || null

  const base = `/cuentas/${partyType}/${partyId}`
  if (!amount) redirect(`${base}?error=${encodeURIComponent('Poné un monto')}`)

  const { error } = await supabase.from('account_movements').insert({
    party_type: partyType,
    party_id: partyId,
    direction,
    amount,
    currency,
    movement_date: movement_date ?? undefined,
    concept,
    source: 'manual',
    created_by: user?.id ?? null,
  })

  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(base)
  revalidatePath('/cuentas')
  redirect(base)
}

// Solo se pueden borrar movimientos manuales (los automáticos los maneja el cierre del borderó)
export async function deleteMovement(partyType: string, partyId: string, movementId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_movements')
    .delete()
    .eq('id', movementId)
    .eq('source', 'manual')

  const base = `/cuentas/${partyType}/${partyId}`
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(base)
  revalidatePath('/cuentas')
  redirect(base)
}
