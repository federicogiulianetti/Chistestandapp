'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, type Profile } from '@/lib/supabase/auth'
import { CHECKLIST_KEYS, CHECKLIST_STATUSES, type ChecklistStatus } from '@/lib/checklist'

type SB = Awaited<ReturnType<typeof createClient>>

async function canManageShow(supabase: SB, profile: Profile, userId: string, showId: string): Promise<boolean> {
  if (profile.role === 'admin') return true
  const { data: show } = await supabase.from('shows').select('comedian_id').eq('id', showId).single()
  if (!show?.comedian_id) return false
  const { data } = await supabase
    .from('assignments').select('id').eq('producer_id', userId).eq('comedian_id', show.comedian_id).limit(1)
  return (data?.length ?? 0) > 0
}

export async function setChecklist(showId: string, itemKey: string, status: string) {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()

  if (!CHECKLIST_KEYS.has(itemKey)) return
  if (!(await canManageShow(supabase, profile, user.id, showId))) return

  if (!CHECKLIST_STATUSES.includes(status as ChecklistStatus)) {
    // Vacío = sin estado: borrar la fila
    await supabase.from('show_checklist').delete().eq('show_id', showId).eq('item_key', itemKey)
  } else {
    await supabase.from('show_checklist').upsert(
      { show_id: showId, item_key: itemKey, status, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'show_id,item_key' }
    )
  }

  revalidatePath('/gastos')
}
