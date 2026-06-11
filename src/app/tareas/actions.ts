'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

export async function createTask(formData: FormData) {
  const { user, profile } = await getUserAndProfile()
  const isAdmin = profile.role === 'admin'

  const supabase = await createClient()
  const title = (formData.get('title') as string)?.trim()
  if (!title) redirect('/tareas?error=' + encodeURIComponent('Falta el título'))

  // El admin puede asignar a cualquiera y vincular una fecha; el resto se auto-asigna.
  const assignee_id = isAdmin ? ((formData.get('assignee_id') as string) || null) : user.id
  const show_id = isAdmin ? ((formData.get('show_id') as string) || null) : null

  const { error } = await supabase.from('tasks').insert({
    title,
    description: (formData.get('description') as string)?.trim() || null,
    assignee_id,
    show_id,
    priority: (formData.get('priority') as string) || 'normal',
    due_date: (formData.get('due_date') as string) || null,
    created_by: user.id,
  })
  if (error) redirect('/tareas?error=' + encodeURIComponent(error.message))

  revalidatePath('/tareas')
  redirect('/tareas')
}

// El asignado (o admin) cambia el estado
export async function setTaskStatus(taskId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) redirect('/tareas?error=' + encodeURIComponent(error.message))
  revalidatePath('/tareas')
  redirect('/tareas')
}

export async function deleteTask(taskId: string) {
  // Admin borra cualquiera; el resto solo las suyas (lo garantiza la RLS de tasks).
  await getUserAndProfile()
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId)
  if (error) redirect('/tareas?error=' + encodeURIComponent(error.message))
  revalidatePath('/tareas')
  redirect('/tareas')
}
