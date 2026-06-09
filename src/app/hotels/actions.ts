'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function nullable(value: FormDataEntryValue | null): string | null {
  const str = value?.toString().trim()
  return str ? str : null
}

function buildHotelData(formData: FormData) {
  return {
    name: formData.get('name')?.toString().trim() || '',
    address: nullable(formData.get('address')),
    city: nullable(formData.get('city')),
    province: nullable(formData.get('province')),
    country: nullable(formData.get('country')) ?? 'Argentina',
    maps_url: nullable(formData.get('maps_url')),
    phone: nullable(formData.get('phone')),
    contact_name: nullable(formData.get('contact_name')),
    contact_phone: nullable(formData.get('contact_phone')),
    email: nullable(formData.get('email')),
    website_url: nullable(formData.get('website_url')),
    price_notes: nullable(formData.get('price_notes')),
    breakfast_included: formData.get('breakfast_included') === 'on',
    checkin_time: nullable(formData.get('checkin_time')),
    checkout_time: nullable(formData.get('checkout_time')),
    has_canje: formData.get('has_canje') === 'on',
    canje_details: nullable(formData.get('canje_details')),
    notes: nullable(formData.get('notes')),
    is_active: formData.get('is_active') === 'on',
  }
}

// Junta las preferencias dinámicas del form (pref_comedian_0, pref_notes_0, pref_favorite_0, ...)
function collectPreferences(formData: FormData) {
  const prefs: { comedian_id: string; notes: string | null; is_favorite: boolean }[] = []
  const seen = new Set<string>()
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^pref_comedian_(\d+)$/)
    if (!m) continue
    const comedianId = value?.toString().trim()
    if (!comedianId || seen.has(comedianId)) continue
    seen.add(comedianId)
    const i = m[1]
    prefs.push({
      comedian_id: comedianId,
      notes: nullable(formData.get(`pref_notes_${i}`)),
      is_favorite: formData.get(`pref_favorite_${i}`) === 'on',
    })
  }
  return prefs
}

// Reemplaza todas las preferencias del hotel por el set nuevo
async function replacePreferences(hotelId: string, formData: FormData) {
  const supabase = await createClient()
  await supabase.from('hotel_comedian_preferences').delete().eq('hotel_id', hotelId)

  const prefs = collectPreferences(formData)
  if (prefs.length > 0) {
    await supabase
      .from('hotel_comedian_preferences')
      .insert(prefs.map(p => ({ ...p, hotel_id: hotelId })))
  }
}

export async function createHotel(formData: FormData) {
  const supabase = await createClient()
  const data = buildHotelData(formData)

  if (!data.name) {
    redirect('/hotels/new?error=' + encodeURIComponent('El nombre del hotel es obligatorio'))
  }

  const { data: hotel, error } = await supabase
    .from('hotels')
    .insert(data)
    .select('id')
    .single()

  if (error || !hotel) {
    redirect('/hotels/new?error=' + encodeURIComponent(error?.message || 'Error al crear el hotel'))
  }

  await replacePreferences(hotel.id, formData)

  revalidatePath('/hotels')
  redirect(`/hotels/${hotel.id}`)
}

export async function updateHotel(id: string, formData: FormData) {
  const supabase = await createClient()
  const data = { ...buildHotelData(formData), updated_at: new Date().toISOString() }

  if (!data.name) {
    redirect(`/hotels/${id}?error=` + encodeURIComponent('El nombre del hotel es obligatorio'))
  }

  const { error } = await supabase.from('hotels').update(data).eq('id', id)

  if (error) {
    redirect(`/hotels/${id}?error=` + encodeURIComponent(error.message))
  }

  await replacePreferences(id, formData)

  revalidatePath('/hotels')
  revalidatePath(`/hotels/${id}`)
  redirect(`/hotels/${id}`)
}

// Soft-delete: marca deleted_at (papelera).
export async function deleteHotel(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('hotels')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    redirect(`/hotels/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/hotels')
  redirect('/hotels')
}
