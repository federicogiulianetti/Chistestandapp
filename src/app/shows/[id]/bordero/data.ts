import { createClient } from '@/lib/supabase/server'
import { arDateKey } from '@/lib/shows'
import { summarizeSales, type SaleRow, type SalesSummary } from '@/lib/sales'
import { sumExpenses } from '@/lib/expenses'
import { computeBordero, type BorderoResult, type DeductionInput } from '@/lib/bordero'

export interface ExpensePayee {
  payee_type: string
  payee_id: string
  amount: number
  category: string
}

export interface ExpenseLine {
  category: string
  amount: number
  notes: string | null
}

export interface DeductionLineRaw {
  label: string
  percentage: number | null
  fixed_amount: number | null
  goes_to_artist: boolean
  notes: string | null
}

export interface TicketLine {
  label: string
  qty: number | null
  price: number | null
  subtotal: number | null
}

export interface BorderoContext {
  showDate: string | null
  performer: string
  spectacle: string | null
  performerType: string | null
  comedianId: string | null
  ensembleId: string | null
  ensembleMemberIds: string[]
  argentoresPorFuera: boolean
  theaterName: string | null
  city: string | null
  ticketPrice: number | null
  capacity: number | null
  currency: string
  summary: SalesSummary
  result: BorderoResult
  expensePayees: ExpensePayee[]
  expenseLines: ExpenseLine[]
  deductionsRaw: DeductionLineRaw[]
  ticketLines: TicketLine[]
  closed: { id: string; closed_at: string } | null
  // valores reales guardados al cerrar (fuente de verdad para históricos/cerrados)
  snapshot: { recaudacion: number; total_neto: number; artista_final: number; productora_share: number } | null
}

export async function loadBordero(showId: string): Promise<BorderoContext | null> {
  const supabase = await createClient()

  const { data: show } = await supabase
    .from('shows')
    .select('id, show_date, spectacle, city, currency, deal_type, deal_fixed_amount, deal_percentage, artist_percentage, capacity, courtesy_count, reserved_seats, ticket_price, performer_type, comedian_id, ensemble_id, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name, city, capacity_platea, capacity_pullman), deductions:show_deductions(label, percentage, fixed_amount, goes_to_artist, notes, sort_order)')
    .eq('id', showId)
    .is('deleted_at', null)
    .single()

  if (!show) return null

  const [{ data: salesData }, { data: expData }, { data: adData }, { data: tlData }, { data: borderoRow }] = await Promise.all([
    supabase.from('ticket_sales').select('id, sale_date, qty_sold, unit_price, notes').eq('show_id', showId),
    supabase.from('expenses').select('amount, category, payee_type, payee_id, notes, sort_order').eq('show_id', showId).order('sort_order', { ascending: true, nullsFirst: false }),
    supabase.from('ad_spend').select('amount').eq('show_id', showId),
    supabase.from('show_ticket_lines').select('label, qty, price, subtotal, sort_order').eq('show_id', showId).order('sort_order', { ascending: true, nullsFirst: false }),
    supabase.from('borderos').select('id, closed_at, recaudacion, total_neto, artista_final, productora_share').eq('show_id', showId).maybeSingle(),
  ])

  const sh = show as unknown as {
    show_date: string | null; spectacle: string | null; city: string | null; currency: string
    deal_type: string | null; deal_fixed_amount: number | null; deal_percentage: number | null; artist_percentage: number | null
    capacity: number | null; courtesy_count: number; reserved_seats: number; ticket_price: number | null
    performer_type: string | null; comedian_id: string | null; ensemble_id: string | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
    theater: { name: string | null; city: string | null; capacity_platea: number | null; capacity_pullman: number | null } | null
    deductions: (DeductionInput & { notes?: string | null })[]
  }

  // Para elencos: los miembros entre los que se reparte la parte del artista
  let ensembleMemberIds: string[] = []
  if (sh.performer_type === 'elenco' && sh.ensemble_id) {
    const { data: members } = await supabase
      .from('ensemble_members')
      .select('comedian_id')
      .eq('ensemble_id', sh.ensemble_id)
    ensembleMemberIds = (members ?? []).map(m => m.comedian_id as string).filter(Boolean)
  }

  // ¿el argentores se paga "por fuera" (directo al artista, 8%)? Se detecta por la etiqueta de la deducción.
  sh.deductions = (sh.deductions ?? []).slice().sort((a, b) => ((a as { sort_order?: number | null }).sort_order ?? 0) - ((b as { sort_order?: number | null }).sort_order ?? 0))
  const argentoresPorFuera = (sh.deductions ?? []).some(d => d.goes_to_artist && /fuera/i.test(d.label || ''))

  const performer = sh.performer_type === 'elenco' ? (sh.ensemble?.name ?? '—') : (sh.comedian?.stage_name ?? '—')
  const todayKey = arDateKey(new Date().toISOString())
  const summary = summarizeSales((salesData ?? []) as SaleRow[], {
    capacity: sh.capacity, reserved_seats: sh.reserved_seats, courtesy_count: sh.courtesy_count,
    ticket_price: sh.ticket_price, show_date: sh.show_date,
  }, todayKey)

  const expensesTotal = sumExpenses(expData ?? [])
  const adSpendTotal = sumExpenses(adData ?? [])

  const result = computeBordero({
    recaudacion: summary.recaudacion,
    dealType: sh.deal_type,
    dealFixedAmount: sh.deal_fixed_amount,
    dealPercentage: sh.deal_percentage,
    artistPercentage: sh.artist_percentage,
    deductions: sh.deductions ?? [],
    expensesTotal,
    adSpendTotal,
  })

  const expensePayees: ExpensePayee[] = (expData ?? [])
    .filter(e => !!(e as { payee_type?: string }).payee_type && !!(e as { payee_id?: string }).payee_id)
    .map(e => ({ payee_type: e.payee_type as string, payee_id: e.payee_id as string, amount: Number(e.amount) || 0, category: e.category as string }))

  const expenseLines: ExpenseLine[] = (expData ?? []).map(e => ({
    category: (e as { category?: string }).category || 'Gasto',
    amount: Number((e as { amount?: number }).amount) || 0,
    notes: (e as { notes?: string | null }).notes ?? null,
  }))

  return {
    showDate: sh.show_date,
    performer,
    spectacle: sh.spectacle,
    performerType: sh.performer_type,
    comedianId: sh.comedian_id,
    ensembleId: sh.ensemble_id,
    ensembleMemberIds,
    argentoresPorFuera,
    theaterName: sh.theater?.name ?? null,
    city: sh.city ?? sh.theater?.city ?? null,
    ticketPrice: sh.ticket_price,
    capacity: sh.capacity ?? (((sh.theater?.capacity_platea ?? 0) + (sh.theater?.capacity_pullman ?? 0)) || null),
    currency: sh.currency,
    summary,
    result,
    expensePayees,
    expenseLines,
    ticketLines: ((tlData ?? []) as { label: string; qty: number | null; price: number | null; subtotal: number | null }[]).map(t => ({ label: t.label, qty: t.qty, price: t.price, subtotal: t.subtotal })),
    deductionsRaw: (sh.deductions ?? []).map(d => ({ label: d.label, percentage: d.percentage, fixed_amount: d.fixed_amount, goes_to_artist: d.goes_to_artist, notes: d.notes ?? null })),
    closed: borderoRow ? { id: borderoRow.id, closed_at: borderoRow.closed_at } : null,
    snapshot: borderoRow ? {
      recaudacion: Number(borderoRow.recaudacion) || 0,
      total_neto: Number(borderoRow.total_neto) || 0,
      artista_final: Number(borderoRow.artista_final) || 0,
      productora_share: Number(borderoRow.productora_share) || 0,
    } : null,
  }
}
