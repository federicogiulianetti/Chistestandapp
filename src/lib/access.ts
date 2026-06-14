import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

type SB = Awaited<ReturnType<typeof createClient>>

export type ModuleDef = { key: string; label: string; href: string }
export type ModuleGroup = { label: string; modules: ModuleDef[] }

/**
 * Catálogo de módulos asignables (espejo de los grupos del dashboard).
 * El `key` es el identificador estable que se guarda en module_access.
 */
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: 'Operación',
    modules: [
      { key: 'comedians', label: 'Comediantes y Elencos', href: '/comedians' },
      { key: 'theaters', label: 'Teatros', href: '/theaters' },
      { key: 'shows', label: 'Shows', href: '/shows' },
      { key: 'calendar', label: 'Calendario', href: '/calendar' },
      { key: 'hotels', label: 'Hoteles', href: '/hotels' },
    ],
  },
  {
    label: 'Plata',
    modules: [
      { key: 'sales', label: 'Ventas', href: '/sales' },
      { key: 'borderos', label: 'Bordereaux', href: '/borderos' },
      { key: 'cuentas', label: 'Cuentas corrientes', href: '/cuentas' },
      { key: 'ganancias', label: 'Mis ganancias', href: '/ganancias' },
      { key: 'argentores', label: 'Argentores', href: '/argentores' },
      { key: 'ads', label: 'Ads / Publicidad', href: '/ads' },
    ],
  },
  {
    label: 'Equipo y contenido',
    modules: [
      { key: 'tareas', label: 'Tareas del equipo', href: '/tareas' },
      { key: 'organigrama', label: 'Organigrama', href: '/organigrama' },
      { key: 'equipo', label: 'Equipo y accesos', href: '/equipo' },
      { key: 'campanias', label: 'Campañas / Ads', href: '/campanias' },
      { key: 'planificacion', label: 'Planificar año', href: '/planificacion' },
    ],
  },
  {
    label: 'IA e integraciones',
    modules: [
      { key: 'asistente', label: 'Asistente', href: '/asistente' },
      { key: 'redes', label: 'Métricas de redes', href: '/redes' },
      { key: 'calendar-sync', label: 'Google Calendar', href: '/calendar-sync' },
    ],
  },
]

export const ALL_MODULES: ModuleDef[] = MODULE_GROUPS.flatMap(g => g.modules)
export const MODULE_KEYS = new Set(ALL_MODULES.map(m => m.key))

/** Módulos que un usuario tiene habilitados (claves). */
export async function getModuleAccess(supabase: SB, userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('module_access').select('module_key').eq('user_id', userId)
  return new Set((data ?? []).map(r => r.module_key as string))
}

/** Comedianes asignados a un usuario (ids), vía la tabla assignments. */
export async function getAssignedComedianIds(supabase: SB, userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('assignments').select('comedian_id').eq('producer_id', userId)
  return new Set((data ?? []).map(r => r.comedian_id as string))
}

/**
 * Guarda de ruta para un módulo. Admin pasa siempre. Si el usuario no tiene
 * el módulo habilitado, lo manda al dashboard. Devuelve { user, profile }.
 * Usar al principio de cada page server-side: `const { profile } = await assertModuleAccess('ventas')`.
 */
export async function assertModuleAccess(moduleKey: string) {
  const { user, profile } = await getUserAndProfile()
  if (profile.role === 'admin') return { user, profile }
  const supabase = await createClient()
  const allowed = await getModuleAccess(supabase, profile.id)
  if (!allowed.has(moduleKey)) redirect('/dashboard')
  return { user, profile }
}
