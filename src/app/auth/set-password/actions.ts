'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setPassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?error=' + encodeURIComponent('Tu sesión expiró, pedí una invitación nueva'))
  }

  const password = (formData.get('password') as string) || ''
  const confirm = (formData.get('confirm') as string) || ''

  if (password.length < 6) {
    redirect('/auth/set-password?error=' + encodeURIComponent('La contraseña debe tener al menos 6 caracteres'))
  }
  if (password !== confirm) {
    redirect('/auth/set-password?error=' + encodeURIComponent('Las contraseñas no coinciden'))
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect('/auth/set-password?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
