// Lista fija de categorías de gasto (basada en la planilla de Fede).
// Siempre se pueden agregar categorías sueltas por fecha.
// (Los Ads de Meta/Google se cargan en el módulo de Ads, no acá, para no contarlos dos veces.)
export const FIXED_EXPENSE_CATEGORIES: string[] = [
  'Impresiones',
  'Cartelería',
  'Diseño',
  'Hotel',
  'Aéreos / Buque',
  'Micros / Transporte',
  'Alquiler de auto',
  'Nafta',
  'Peajes',
  'Estacionamiento',
  'Comidas',
  'Técnica',
  'Operador',
  'Camarín',
  'Opener',
  'Equipo creativo',
  'ART',
  'Argentores',
  'Impuesto municipal',
  'Comisión ticketera',
  'Otros',
]

export interface ExpenseRow {
  id: string
  show_id: string
  category: string
  amount: number
  notes: string | null
  group_id: string | null
  payee_type: string | null
  payee_id: string | null
}

export function sumExpenses(rows: { amount: number }[]): number {
  return rows.reduce((a, r) => a + (Number(r.amount) || 0), 0)
}

export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}
