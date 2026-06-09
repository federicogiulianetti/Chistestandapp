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

export interface BorderoContext {
  showDate: string | null
  performer: string
  performerType: string | null
  comedianId: string | null
  theaterName: string | null
  currency: string
  summary: SalesSummary
  result: BorderoResult
  expensePayees: ExpensePayee[]
  closed: { id: string; closed_at: string } | null
}

export async function loadBordero(showId: string): Promise<BorderoContext | null> {
  const supabase = await createClient()

  const { data: show } = await supabase
    .from('shows')
    .select('id, show_date, currency, deal_type, deal_fixed_amount, deal_percentage, artist_percentage, capacity, courtesy_count, reserved_seats, ticket_price, performer_type, comedian_id, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name), deductions:show_deductions(label, percentage, fixed_amount, goes_to_artist)')
    .eq('id', showId)
    .is('deleted_at', null)
    .single()

  if (!show) return null

  const [{ data: salesData }, { data: expData }, { data: adData }, { data: borderoRow }] = await Promise.all([
    supabase.from('ticket_sales').select('id, sale_date, qty_sold, unit_price, notes').eq('show_id', showId),
    supabase.from('expenses').select('amount, category, payee_type, payee_id').eq('show_id', showId),
    supabase.from('ad_spend').select('amount').eq('show_id', showId),
    supabase.from('borderos').select('id, closed_at').eq('show_id', showId).maybeSingle(),
  ])

  const sh = show as unknown as {
    show_date: string | null; currency: string
    deal_type: string | null; deal_fixed_amount: number | null; deal_percentage: number | null; artist_percentage: number | null
    capacity: number | null; courtesy_count: number; reserved_seats: number; ticket_price: number | null
    performer_type: string | null; comedian_id: string | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
    theater: { name: string | null } | null
    deductions: DeductionInput[]
  }

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
    .filter((e): e is { amount: number; category: string; payee_type: string; payee_id: string } =>
      !!(e as { payee_type?: string }).payee_type && !!(e as { payee_id?: string }).payee_id)
    .map(e => ({ payee_type: e.payee_type, payee_id: e.payee_id, amount: Number(e.amount) || 0, category: e.category }))

  return {
    showDate: sh.show_date,
    performer,
    performerType: sh.performer_type,
    comedianId: sh.comedian_id,
    theaterName: sh.theater?.name ?? null,
    currency: sh.currency,
    summary,
    result,
    expensePayees,
    closed: borderoRow ? { id: borderoRow.id, closed_at: borderoRow.closed_at } : null,
  }
}
