'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Marca/desmarca una entrada de Argentores como cobrada. La RLS define quién puede:
// admin o el productor acompañante asignado a ese comediante.
export async function toggleArgentoresCobrado(entryId: string, nextCollected: boolean, revalidate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase
    .from('argentores_entries')
    .update({
      collected: nextCollected,
      collected_at: nextCollected ? new Date().toISOString() : null,
      marked_by: nextCollected ? (user?.id ?? null) : null,
    })
    .eq('id', entryId)

  revalidatePath(revalidate)
}
