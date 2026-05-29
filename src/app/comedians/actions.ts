'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

// Función helper para extraer datos del form
function extractComedianData(formData: FormData) {
  // Helper para convertir string vacío a null
  const nullable = (value: FormDataEntryValue | null): string | null => {
    const str = value?.toString().trim()
    return str ? str : null
  }

  return {
    stage_name: formData.get('stage_name')?.toString().trim() || '',
    full_name: nullable(formData.get('full_name')),
    email: nullable(formData.get('email')),
    phone: nullable(formData.get('phone')),
    bio: nullable(formData.get('bio')),
    instagram_handle: nullable(formData.get('instagram_handle')),
    twitter_handle: nullable(formData.get('twitter_handle')),
    tiktok_handle: nullable(formData.get('tiktok_handle')),
    youtube_url: nullable(formData.get('youtube_url')),
    spotify_url: nullable(formData.get('spotify_url')),
    website_url: nullable(formData.get('website_url')),
    date_of_birth: nullable(formData.get('date_of_birth')),
    country: nullable(formData.get('country')),
    city: nullable(formData.get('city')),
    photo_url: nullable(formData.get('photo_url')),
    facebook_url: nullable(formData.get('facebook_url')),
    dni: nullable(formData.get('dni')),
    frequent_flyer: nullable(formData.get('frequent_flyer')),
    seat_preference: nullable(formData.get('seat_preference')),
    home_address: nullable(formData.get('home_address')),
    dressing_room_preferences: nullable(formData.get('dressing_room_preferences')),
    notes: nullable(formData.get('notes')),
    performs_solo: formData.get('performs_solo') === 'on',
    is_active: formData.get('is_active') === 'on',
  }
}

// ============================================
// Crear comediante
// ============================================
export async function createComedian(formData: FormData) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/comedians?error=' + encodeURIComponent('No tenés permisos para crear comediantes'))
  }

  const data = extractComedianData(formData)

  if (!data.stage_name) {
    redirect('/comedians/new?error=' + encodeURIComponent('El nombre artístico es obligatorio'))
  }
  if (!data.dni) {
    redirect('/comedians/new?error=' + encodeURIComponent('El DNI es obligatorio'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('comedians').insert(data)

  if (error) {
    redirect('/comedians/new?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/comedians')
  redirect('/comedians')
}

// ============================================
// Actualizar comediante
// ============================================
export async function updateComedian(id: string, formData: FormData) {
  const { profile } = await getUserAndProfile()

  // Admins pueden editar cualquiera. Comediantes solo pueden editarse a sí mismos.
  // (la RLS de Supabase también lo valida, pero chequeamos acá para mejor UX)
  if (profile.role !== 'admin') {
    redirect('/comedians?error=' + encodeURIComponent('No tenés permisos para editar'))
  }

  const data = {
    ...extractComedianData(formData),
    updated_at: new Date().toISOString(),
  }

  if (!data.stage_name) {
    redirect(`/comedians/${id}?error=` + encodeURIComponent('El nombre artístico es obligatorio'))
  }
  if (!data.dni) {
    redirect(`/comedians/${id}?error=` + encodeURIComponent('El DNI es obligatorio'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('comedians').update(data).eq('id', id)

  if (error) {
    redirect(`/comedians/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/comedians')
  revalidatePath(`/comedians/${id}`)
  redirect('/comedians')
}

// ============================================
// Borrar comediante
// ============================================
export async function deleteComedian(id: string) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/comedians?error=' + encodeURIComponent('No tenés permisos para borrar'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('comedians').delete().eq('id', id)

  if (error) {
    redirect('/comedians?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/comedians')
  redirect('/comedians')
}