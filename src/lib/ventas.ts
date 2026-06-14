import { arDateKey } from '@/lib/shows'

/** Una foto diaria de venta: totales ACUMULADOS a esa fecha, por categoría. */
export type SalesSnapshot = {
  id: string
  snapshot_date: string
  ticketera: number
  teatro: number
  mitad: number
  invitaciones: number
}

type Cats = { ticketera: number; teatro: number; mitad: number; invitaciones: number }

/** Entradas totales (ocupan butaca): las 4 categorías. */
export const snapTotal = (s: Cats): number =>
  (s.ticketera || 0) + (s.teatro || 0) + (s.mitad || 0) + (s.invitaciones || 0)

/** Vendidas pagas (para liquidación): no incluye invitaciones. */
export const snapVendidas = (s: Omit<Cats, 'invitaciones'>): number =>
  (s.ticketera || 0) + (s.teatro || 0) + (s.mitad || 0)

/** Días enteros desde hoy hasta el show (negativo si ya pasó). */
export function daysUntilShow(showDate: string | null, todayKey: string): number | null {
  if (!showDate) return null
  const [ay, am, ad] = todayKey.split('-').map(Number)
  const [by, bm, bd] = arDateKey(showDate).split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

/** Días desde una fecha (snapshot) hasta hoy: "actualizado hace X días". */
export function daysSince(dateKey: string | null, todayKey: string): number | null {
  if (!dateKey) return null
  const [ay, am, ad] = dateKey.split('-').map(Number)
  const [by, bm, bd] = todayKey.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}
