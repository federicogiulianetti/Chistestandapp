'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

export async function createTask(formData: FormData) {
  const { user, profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/tareas?error=' + encodeURIComponent('Sin permisos'))

  const supabase = await createClient()
  const title = (formData.get('title') as string)?.trim()
  if (!title) redirect('/tareas?error=' + encodeURIComponent('Falta el título'))

  const { error } = await supabase.from('tasks').insert({
    title,
    description: (formData.get('description') as string)?.trim() || null,
    assignee_id: (formData.get('assignee_id') as string) || null,
    show_id: (formData.get('show_id') as string) || null,
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
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/tareas?error=' + encodeURIComponent('Sin permisos'))
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId)
  if (error) redirect('/tareas?error=' + encodeURIComponent(error.message))
  revalidatePath('/tareas')
  redirect('/tareas')
}
