/** Ítems del checklist operativo de cada fecha (tab Gastos del Excel). */
export const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'pegatina_carteles', label: 'Pegatina rollo de carteles' },
  { key: 'cartel_puerta', label: 'Cartel puerta' },
  { key: 'aereos', label: 'Aéreos' },
  { key: 'hotel', label: 'Hotel' },
  { key: 'filmacion', label: 'Filmación' },
  { key: 'tecnica', label: 'Técnica chequeada' },
  { key: 'rider_enviado', label: 'Rider enviado' },
  { key: 'alquiler_auto', label: 'Alquiler Auto' },
  { key: 'senas_teatro', label: 'Señas Teatro' },
]

export const CHECKLIST_KEYS = new Set(CHECKLIST_ITEMS.map(i => i.key))

export type ChecklistStatus = 'listo' | 'no_listo' | 'no_aplica'
export const CHECKLIST_STATUSES: ChecklistStatus[] = ['listo', 'no_listo', 'no_aplica']

export const statusLabel: Record<ChecklistStatus, string> = {
  listo: 'Listo',
  no_listo: 'No listo',
  no_aplica: 'No aplica',
}
