import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole =
  | 'admin'
  | 'productor_asociado'
  | 'liquidadora'
  | 'viajes'
  | 'editora'
  | 'cm_local'
  | 'cm_internacional'
  | 'filmador'
  | 'editor_extra'
  | 'comediante'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Trae el user de auth + su profile.
 * Si no hay sesión o no hay profile, redirige a /login.
 */
export async function getUserAndProfile() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // Por si acaso el profile no se creó (raro, pero por las dudas)
    redirect('/login?error=' + encodeURIComponent('No se encontró tu profile'))
  }

  // Si el usuario está deshabilitado, lo sacamos
  if (!profile.is_active) {
    redirect('/login?error=' + encodeURIComponent('Tu cuenta está deshabilitada'))
  }

  return { user, profile: profile as Profile }
}

/**
 * Etiqueta legible en castellano de cada rol.
 */
export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  productor_asociado: 'Productor asociado',
  liquidadora: 'Liquidadora',
  viajes: 'Viajes',
  editora: 'Editora',
  cm_local: 'CM Local',
  cm_internacional: 'CM Internacional',
  filmador: 'Filmador',
  editor_extra: 'Editor extra',
  comediante: 'Comediante',
}