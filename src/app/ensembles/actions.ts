'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

// Helper para convertir string vacío a null
function extractEnsembleData(formData: FormData) {
  const nullable = (value: FormDataEntryValue | null): string | null => {
    const str = value?.toString().trim()
    return str ? str : null
  }

  return {
        name: formData.get('name')?.toString().trim() || '',
        bio: nullable(formData.get('bio')),
        photo_url: nullable(formData.get('photo_url')),
        instagram_handle: nullable(formData.get('instagram_handle')),
        tiktok_handle: nullable(formData.get('tiktok_handle')),
        youtube_url: nullable(formData.get('youtube_url')),
        website_url: nullable(formData.get('website_url')),
        city: nullable(formData.get('city')),
        country: nullable(formData.get('country')),
        notes: nullable(formData.get('notes')),
        is_active: formData.get('is_active') === 'on',
      }
  }


// ============================================
// Crear elenco
// ============================================
export async function createEnsemble(formData: FormData) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/ensembles?error=' + encodeURIComponent('No tenés permisos para crear elencos'))
  }

  const data = extractEnsembleData(formData)

  if (!data.name) {
    redirect('/ensembles/new?error=' + encodeURIComponent('El nombre del elenco es obligatorio'))
  }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('ensembles')
    .insert(data)
    .select('id')
    .single()

  if (error || !inserted) {
    redirect('/ensembles/new?error=' + encodeURIComponent(error?.message || 'Error al crear el elenco'))
  }

  revalidatePath('/ensembles')
  revalidatePath('/comedians')
  redirect(`/ensembles/${inserted.id}`)
}

// ============================================
// Actualizar elenco
// ============================================
export async function updateEnsemble(id: string, formData: FormData) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/ensembles?error=' + encodeURIComponent('No tenés permisos para editar elencos'))
  }

  const data = {
    ...extractEnsembleData(formData),
    updated_at: new Date().toISOString(),
  }

  if (!data.name) {
    redirect(`/ensembles/${id}?error=` + encodeURIComponent('El nombre del elenco es obligatorio'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('ensembles')
    .update(data)
    .eq('id', id)

  if (error) {
    redirect(`/ensembles/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/ensembles')
  revalidatePath('/comedians')
  revalidatePath(`/ensembles/${id}`)
  redirect(`/ensembles/${id}?success=1`)
}

// ============================================
// Borrar elenco
// ============================================
export async function deleteEnsemble(id: string) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect('/ensembles?error=' + encodeURIComponent('No tenés permisos para borrar elencos'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('ensembles')
    .delete()
    .eq('id', id)

  if (error) {
    redirect(`/ensembles/${id}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/ensembles')
  revalidatePath('/comedians')
  redirect('/ensembles')
}

// ============================================
// Agregar miembro al elenco
// ============================================
export async function addMember(ensembleId: string, formData: FormData) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect(`/ensembles/${ensembleId}?error=` + encodeURIComponent('No tenés permisos'))
  }

  const comedianId = formData.get('comedian_id')?.toString()
  const role = formData.get('role')?.toString().trim() || null

  if (!comedianId) {
    redirect(`/ensembles/${ensembleId}?error=` + encodeURIComponent('Tenés que seleccionar un comediante'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('ensemble_members')
    .insert({
      ensemble_id: ensembleId,
      comedian_id: comedianId,
      role,
    })

  if (error) {
    redirect(`/ensembles/${ensembleId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/ensembles/${ensembleId}`)
  revalidatePath('/ensembles')
  revalidatePath('/comedians')
  redirect(`/ensembles/${ensembleId}?success=1`)
}

// ============================================
// Quitar miembro del elenco
// ============================================
export async function removeMember(ensembleId: string, memberId: string) {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    redirect(`/ensembles/${ensembleId}?error=` + encodeURIComponent('No tenés permisos'))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('ensemble_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    redirect(`/ensembles/${ensembleId}?error=` + encodeURIComponent(error.message))
  }

  revalidatePath(`/ensembles/${ensembleId}`)
  revalidatePath('/ensembles')
  revalidatePath('/comedians')
  redirect(`/ensembles/${ensembleId}?success=1`)
}