'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Parsea un número del form (devuelve null si está vacío)
function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  return v !== null && v !== '' ? Number(v) : null
}

// Arma el objeto a guardar a partir del form.
// Hereda ciudad/provincia del teatro elegido (las necesitamos para filtrar después).
async function buildShowData(formData: FormData) {
  const supabase = await createClient()

  const theater_id = (formData.get('theater_id') as string) || null
  const performer_type = (formData.get('performer_type') as string) || 'comedian'

  // Heredar ciudad/provincia desde el teatro
  let city: string | null = null
  let province: string | null = null
  if (theater_id) {
    const { data: theater } = await supabase
      .from('theaters')
      .select('city, province')
      .eq('id', theater_id)
      .single()
    city = theater?.city ?? null
    province = theater?.province ?? null
  }

  return {
    performer_type,
    comedian_id: performer_type === 'comedian' ? ((formData.get('comedian_id') as string) || null) : null,
    ensemble_id: performer_type === 'elenco' ? ((formData.get('ensemble_id') as string) || null) : null,
    theater_id,
    show_date: (formData.get('show_date') as string) || null,
    status: (formData.get('status') as string) || 'tentativa',
    capacity: num(formData, 'capacity'),
    ticket_price: num(formData, 'ticket_price'),
    is_pautada: formData.get('is_pautada') === 'on',
    deal_type: (formData.get('deal_type') as string) || null,
    deal_fixed_amount: num(formData, 'deal_fixed_amount'),
    deal_percentage: num(formData, 'deal_percentage'),
    city,
    province,
    notes: (formData.get('notes') as string) || null,
  }
}

// Devuelve true si ya hay otro show en la misma sala, a la misma fecha y hora exacta.
async function hasTheaterClash(theaterId: string | null, showDate: string | null, excludeId?: string) {
  if (!theaterId || !showDate) return false
  const supabase = await createClient()
  let query = supabase
    .from('shows')
    .select('id')
    .eq('theater_id', theaterId)
    .eq('show_date', showDate)
    .is('deleted_at', null)
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query.limit(1)
  return !!data && data.length > 0
}

const CLASH_MSG = 'Ya hay un show programado en esa sala ese día y horario. No se pueden superponer dos shows en la misma sala.'

export async function createShow(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const data = {
    ...(await buildShowData(formData)),
    created_by: user?.id ?? null,
  }

  if (await hasTheaterClash(data.theater_id, data.show_date)) {
    redirect('/shows/new?error=' + encodeURIComponent(CLASH_MSG))
  }

  const { data: show, error } = await supabase
    .from('shows')
    .insert(data)
    .select('id')
    .single()

  if (error) {
    const msg = error.code === '23505' ? CLASH_MSG : error.message
    redirect(`/shows/new?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/shows')
  redirect(`/shows/${show.id}`)
}

export async function updateShow(id: string, formData: FormData) {
  const supabase = await createClient()

  const data = {
    ...(await buildShowData(formData)),
    updated_at: new Date().toISOString(),
  }

  if (await hasTheaterClash(data.theater_id, data.show_date, id)) {
    redirect(`/shows/${id}?error=` + encodeURIComponent(CLASH_MSG))
  }

  const { error } = await supabase
    .from('shows')
    .update(data)
    .eq('id', id)

  if (error) {
    const msg = error.code === '23505' ? CLASH_MSG : error.message
    redirect(`/shows/${id}?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/shows')
  revalidatePath(`/shows/${id}`)
  redirect(`/shows/${id}`)
}

// Soft-delete: marca deleted_at en vez de borrar (papelera).
export async function deleteShow(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shows')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    redirect(`/shows/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/shows')
  redirect('/shows')
}
