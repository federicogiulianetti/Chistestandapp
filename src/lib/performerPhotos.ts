import { createClient } from '@/lib/supabase/server'

type SB = Awaited<ReturnType<typeof createClient>>

/**
 * Mapa nombre → foto (URL) de comediantes y elencos, para mostrar la cara
 * en las tarjetas de cualquier módulo. La clave es el nombre que se usa como
 * "performer" en el resto de las queries (stage_name / ensemble name).
 */
export async function performerPhotoMap(supabase: SB): Promise<Map<string, string>> {
  const [{ data: coms }, { data: ens }] = await Promise.all([
    supabase.from('comedians').select('stage_name, photo_url'),
    supabase.from('ensembles').select('name, photo_url'),
  ])
  const m = new Map<string, string>()
  for (const c of coms ?? []) if (c.stage_name && c.photo_url) m.set(c.stage_name, c.photo_url)
  for (const e of ens ?? []) if (e.name && e.photo_url) m.set(e.name, e.photo_url)
  return m
}
