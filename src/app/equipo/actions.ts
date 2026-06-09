'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { createServiceClient } from '@/lib/supabase/admin'

export async function inviteUser(formData: FormData) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') {
    redirect('/equipo?error=' + encodeURIComponent('No tenés permisos'))
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const full_name = (formData.get('full_name') as string)?.trim() || ''
  const role = (formData.get('role') as string) || 'comediante'
  const phone = (formData.get('phone') as string)?.trim() || ''
  const comedianId = (formData.get('comedian_id') as string) || ''

  if (!email) {
    redirect('/equipo?error=' + encodeURIComponent('Falta el email'))
  }

  let admin
  try {
    admin = createServiceClient()
  } catch {
    redirect('/equipo?error=' + encodeURIComponent('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el entorno'))
  }

  const origin = (await headers()).get('origin') ?? ''
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role, phone },
    redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
  })

  if (error) {
    redirect('/equipo?error=' + encodeURIComponent(error.message))
  }

  // Vincular con un comediante existente (para que vea lo suyo)
  if (role === 'comediante' && comedianId && data.user) {
    await admin.from('comedians').update({ profile_id: data.user.id }).eq('id', comedianId)
  }

  revalidatePath('/equipo')
  redirect('/equipo?success=' + encodeURIComponent(`Invitación enviada a ${email}`))
}
