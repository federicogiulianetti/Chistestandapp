'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, type Profile } from '@/lib/supabase/auth'
import { arDateKey } from '@/lib/shows'

type SB = Awaited<ReturnType<typeof createClient>>

/** Puede gestionar las ventas de un show: admin, o productor asignado a su comediante. */
async function canManageShow(supabase: SB, profile: Profile, userId: string, showId: string): Promise<boolean> {
  if (profile.role === 'admin') return true
  const { data: show } = await supabase.from('shows').select('comedian_id').eq('id', showId).single()
  if (!show?.comedian_id) return false
  const { data } = await supabase
    .from('assignments')
    .select('id')
    .eq('producer_id', userId)
    .eq('comedian_id', show.comedian_id)
    .limit(1)
  return (data?.length ?? 0) > 0
}

function intOf(formData: FormData, key: string): number {
  return Math.max(0, Math.round(Number(formData.get(key)) || 0))
}

export async function saveSnapshot(showId: string, formData: FormData) {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()
  const base = `/shows/${showId}/ventas`

  if (!(await canManageShow(supabase, profile, user.id, showId))) {
    redirect(`${base}?error=${encodeURIComponent('No tenés permiso para actualizar este show')}`)
  }

  const snapshot_date = (formData.get('snapshot_date') as string) || arDateKey(new Date().toISOString())

  const { error } = await supabase.from('sales_snapshots').upsert(
    {
      show_id: showId,
      snapshot_date,
      ticketera: intOf(formData, 'ticketera'),
      teatro: intOf(formData, 'teatro'),
      mitad: intOf(formData, 'mitad'),
      invitaciones: intOf(formData, 'invitaciones'),
      updated_by: user.id,
    },
    { onConflict: 'show_id,snapshot_date' }
  )
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)

  // Objetivo (se guarda en el show)
  const targetRaw = formData.get('sales_target')
  if (targetRaw !== null && targetRaw !== '') {
    await supabase.from('shows').update({ sales_target: Math.round(Number(targetRaw)) }).eq('id', showId)
  }

  revalidatePath(base)
  revalidatePath('/sales')
  redirect(`${base}?success=1`)
}

export async function deleteSnapshot(showId: string, snapshotId: string) {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()
  const base = `/shows/${showId}/ventas`

  if (!(await canManageShow(supabase, profile, user.id, showId))) {
    redirect(`${base}?error=${encodeURIComponent('Sin permiso')}`)
  }

  const { error } = await supabase.from('sales_snapshots').delete().eq('id', snapshotId).eq('show_id', showId)
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`)

  revalidatePath(base)
  revalidatePath('/sales')
  redirect(`${base}?success=1`)
}
