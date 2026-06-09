'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  return v !== null && v !== '' ? Number(v) : null
}

export async function addSale(showId: string, formData: FormData) {
  const supabase = await createClient()
  const sale_date = (formData.get('sale_date') as string) || null
  const qty_sold = num(formData, 'qty_sold') ?? 0
  const unit_price = num(formData, 'unit_price')
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!sale_date) {
    redirect(`/shows/${showId}/ventas?error=${encodeURIComponent('Falta la fecha de la carga')}`)
  }

  // Una fila por día por show: si ya existe ese día, lo actualiza
  const { error } = await supabase
    .from('ticket_sales')
    .upsert({ show_id: showId, sale_date, qty_sold, unit_price, notes }, { onConflict: 'show_id,sale_date' })

  if (error) {
    redirect(`/shows/${showId}/ventas?error=${encodeURIComponent(error.message)}`)
  }

  // Mantener el "precio actual" del show sincronizado con la última carga
  if (unit_price != null) {
    await supabase
      .from('shows')
      .update({ ticket_price: unit_price, updated_at: new Date().toISOString() })
      .eq('id', showId)
  }

  revalidatePath(`/shows/${showId}/ventas`)
  revalidatePath('/sales')
  redirect(`/shows/${showId}/ventas`)
}

export async function deleteSale(showId: string, saleId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('ticket_sales').delete().eq('id', saleId)

  if (error) {
    redirect(`/shows/${showId}/ventas?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/shows/${showId}/ventas`)
  revalidatePath('/sales')
  redirect(`/shows/${showId}/ventas`)
}
