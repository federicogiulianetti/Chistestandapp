import { createClient } from '@/lib/supabase/server'
import type { PerformerOption, TheaterOption, ExistingShow } from '@/components/ShowForm'

type RawExisting = {
  id: string
  city: string | null
  show_date: string | null
  performer_type: string | null
  comedian_id: string | null
  ensemble_id: string | null
  comedian: { stage_name: string | null } | null
  ensemble: { name: string | null } | null
}

// Carga las listas para los selects del formulario de shows + las fechas ya existentes
// (para el aviso de comediante cercano en la misma ciudad).
export async function getShowFormOptions(): Promise<{
  comedians: PerformerOption[]
  ensembles: PerformerOption[]
  theaters: TheaterOption[]
  existingShows: ExistingShow[]
}> {
  const supabase = await createClient()

  const [{ data: comedians }, { data: ensembles }, { data: theaters }, { data: existing }] = await Promise.all([
    supabase
      .from('comedians')
      .select('id, stage_name')
      .eq('performs_solo', true)
      .order('stage_name', { ascending: true }),
    supabase
      .from('ensembles')
      .select('id, name')
      .order('name', { ascending: true }),
    supabase
      .from('theaters')
      .select('id, name, city, province, capacity_platea, deal_type, deal_fixed_amount, deal_percentage')
      .order('name', { ascending: true }),
    supabase
      .from('shows')
      .select('id, city, show_date, performer_type, comedian_id, ensemble_id, comedian:comedian_id(stage_name), ensemble:ensemble_id(name)')
      .is('deleted_at', null),
  ])

  const existingShows: ExistingShow[] = ((existing ?? []) as unknown as RawExisting[]).map(s => ({
    id: s.id,
    city: s.city,
    show_date: s.show_date,
    performerKey: s.performer_type === 'elenco' ? `e:${s.ensemble_id}` : `c:${s.comedian_id}`,
    performer: s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—'),
  }))

  return {
    comedians: (comedians ?? []).map(c => ({ id: c.id, label: c.stage_name ?? 'Sin nombre' })),
    ensembles: (ensembles ?? []).map(e => ({ id: e.id, label: e.name ?? 'Sin nombre' })),
    theaters: (theaters ?? []) as TheaterOption[],
    existingShows,
  }
}
