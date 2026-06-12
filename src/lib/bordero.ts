import { formatMoney } from '@/lib/sales'

export interface DeductionInput {
  label: string
  percentage: number | null
  fixed_amount: number | null
  goes_to_artist: boolean
}

export interface BorderoInput {
  recaudacion: number
  dealType: string | null            // 'fixed' | 'percentage'
  dealFixedAmount: number | null
  dealPercentage: number | null      // % productora con la sala (el mayor)
  artistPercentage: number | null    // % del artista en el reparto final (el mayor)
  deductions: DeductionInput[]
  expensesTotal: number              // Σ expenses (directos + repartidos)
  adSpendTotal: number               // Σ ad_spend
}

export interface LineAmount { label: string; amount: number }

export interface BorderoResult {
  recaudacion: number
  deductionLines: { label: string; amount: number; goesToArtist: boolean }[]
  impuestosTotal: number
  netoSala: number | null            // null si el arreglo es fijo
  parteProductoraSala: number
  dealLabel: string
  expensesTotal: number
  adSpendTotal: number
  adTaxLines: LineAmount[]
  adTaxesTotal: number
  gastosTotal: number
  totalNeto: number
  artistPercentage: number
  productoraPercentage: number
  artistaShare: number
  productoraShare: number
  artistaDeductions: number          // impuestos que cobra el artista (ej: Argentores)
  artistaFinal: number               // artistaShare + artistaDeductions
}

// Impuestos digitales sobre los Ads (Meta/Google son del exterior) = 30% total
export const AD_TAX_RATES = [
  { label: 'IVA servicios digitales (21%)', rate: 0.21 },
  { label: 'Imp. y sellos (3%)', rate: 0.03 },
  { label: 'Percepción IIBB serv. digitales (6%)', rate: 0.06 },
]

export function computeBordero(input: BorderoInput): BorderoResult {
  // 1. Impuestos sobre la recaudación (antes del reparto con la sala)
  // Si una deducción tiene monto exacto Y porcentaje, el monto manda (el % es informativo,
  // tal cual la planilla original). El % solo calcula cuando no hay monto.
  const deductionLines = input.deductions.map(d => ({
    label: d.label,
    amount: d.fixed_amount != null ? d.fixed_amount : (d.percentage != null ? input.recaudacion * (d.percentage / 100) : 0),
    goesToArtist: d.goes_to_artist,
  }))
  const impuestosTotal = deductionLines.reduce((a, l) => a + l.amount, 0)
  const artistaDeductions = deductionLines.filter(l => l.goesToArtist).reduce((a, l) => a + l.amount, 0)

  // 2. Reparto con la sala → parte de la productora
  let netoSala: number | null
  let parteProductoraSala: number
  let dealLabel: string
  if (input.dealType === 'fixed') {
    netoSala = null
    parteProductoraSala = input.dealFixedAmount ?? 0   // el fijo es PARA la productora
    dealLabel = `Fijo productora ${formatMoney(parteProductoraSala)}`
  } else {
    netoSala = input.recaudacion - impuestosTotal
    const pct = input.dealPercentage ?? 0
    parteProductoraSala = netoSala * (pct / 100)
    dealLabel = `Productora ${pct}% / Teatro ${100 - pct}%`
  }

  // 3. Gastos de la productora (incluye Ads + 30% de impuestos digitales)
  const adTaxLines = AD_TAX_RATES.map(t => ({ label: t.label, amount: input.adSpendTotal * t.rate }))
  const adTaxesTotal = adTaxLines.reduce((a, l) => a + l.amount, 0)
  const gastosTotal = input.expensesTotal + input.adSpendTotal + adTaxesTotal

  // 4. Total neto a repartir con el artista
  const totalNeto = parteProductoraSala - gastosTotal

  // 5. Reparto con el artista (el mayor es para el artista)
  // Regla: si la fecha da pérdida (neto negativo), la productora la absorbe entera →
  // el artista cobra 0% y la pérdida va 100% a la productora.
  const artistPct = input.artistPercentage ?? 0
  const artistaShare = totalNeto < 0 ? 0 : totalNeto * (artistPct / 100)
  const productoraShare = totalNeto - artistaShare
  const artistaFinal = artistaShare + artistaDeductions

  return {
    recaudacion: input.recaudacion,
    deductionLines, impuestosTotal,
    netoSala, parteProductoraSala, dealLabel,
    expensesTotal: input.expensesTotal,
    adSpendTotal: input.adSpendTotal, adTaxLines, adTaxesTotal,
    gastosTotal, totalNeto,
    artistPercentage: artistPct, productoraPercentage: 100 - artistPct,
    artistaShare, productoraShare, artistaDeductions, artistaFinal,
  }
}
