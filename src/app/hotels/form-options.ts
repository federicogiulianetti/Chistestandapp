import { createClient } from '@/lib/supabase/server'
import type { ComedianOption } from '@/components/HotelForm'

// Lista de comediantes para los selects de preferencias.
export async function getHotelFormComedians(): Promise<ComedianOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('comedians')
    .select('id, stage_name')
    .order('stage_name', { ascending: true })

  return (data ?? []).map(c => ({ id: c.id, label: c.stage_name ?? 'Sin nombre' }))
}
