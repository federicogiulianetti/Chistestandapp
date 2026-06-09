// Metadata de estados de un show (label + estilo del badge)
export const SHOW_STATUSES = {
  tentativa: { label: '🟡 Tentativa', badge: 'bg-yellow-900/40 text-yellow-300' },
  confirmada: { label: '🟢 Confirmada', badge: 'bg-green-900/40 text-green-300' },
  hecha: { label: '🔵 Hecha', badge: 'bg-blue-900/40 text-blue-300' },
  cancelada: { label: '🔴 Cancelada', badge: 'bg-red-900/40 text-red-300' },
} as const

export type ShowStatus = keyof typeof SHOW_STATUSES

export function statusMeta(status?: string | null) {
  return SHOW_STATUSES[(status ?? '') as ShowStatus] ?? { label: status ?? '—', badge: 'bg-zinc-800 text-gray-400' }
}

const TZ = 'America/Argentina/Buenos_Aires'

// Fecha + hora legible (ej: "vie 8 jun 2026, 21:00")
export function formatShowDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  })
}

// Clave de fecha "YYYY-MM-DD" en hora de Argentina (para agrupar por día)
export function arDateKey(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

// Hora "HH:mm" en hora de Argentina
export function arTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

// Texto legible del arreglo económico
export function formatDeal(
  dealType?: string | null,
  fixed?: number | null,
  pct?: number | null,
): string {
  if (dealType === 'fixed') return `Fijo $${fixed?.toLocaleString('es-AR') ?? '?'}`
  if (dealType === 'percentage') return `${pct ?? '?'}%`
  return '—'
}
