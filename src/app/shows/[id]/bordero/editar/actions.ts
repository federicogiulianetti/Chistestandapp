'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'

type Entrada = { label: string; qty: number | null; price: number | null; subtotal: number | null }
type Impuesto = { label: string; percentage: number | null; fixed_amount: number | null; notes: string | null }
type Gasto = { category: string; amount: number; notes: string | null }
type Payload = {
  recaudacion: number
  total_neto: number
  artista_final: number
  productora_share: number
  capacity: number | null
  deal_percentage: number | null
  artist_percentage: number | null
  entradas: Entrada[]
  impuestos: Impuesto[]
  gastos: Gasto[]
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function saveBordero(showId: string, formData: FormData) {
  const { profile } = await getUserAndProfile()
  if (profile.role !== 'admin') redirect('/borderos')

  const raw = formData.get('payload') as string
  if (!raw) redirect(`/shows/${showId}/bordero/editar?error=${encodeURIComponent('Sin datos')}`)
  let p: Payload
  try { p = JSON.parse(raw) } catch { redirect(`/shows/${showId}/bordero/editar?error=${encodeURIComponent('Datos inválidos')}`) }

  const supabase = await createClient()

  // 1) Reemplazar las líneas (entradas / impuestos / gastos) preservando el orden
  await supabase.from('show_ticket_lines').delete().eq('show_id', showId)
  await supabase.from('show_deductions').delete().eq('show_id', showId)
  await supabase.from('expenses').delete().eq('show_id', showId)

  const entradas = p.entradas.filter(e => (e.label || '').trim() !== '').map((e, i) => ({
    show_id: showId,
    label: e.label.trim().slice(0, 120),
    qty: e.qty != null ? Math.round(num(e.qty)) : null,
    price: e.price != null ? num(e.price) : null,
    subtotal: e.subtotal != null ? num(e.subtotal) : (e.qty != null && e.price != null ? Math.round(num(e.qty)) * num(e.price) : null),
    sort_order: i,
  }))
  if (entradas.length) await supabase.from('show_ticket_lines').insert(entradas)

  const impuestos = p.impuestos.filter(d => (d.label || '').trim() !== '').map((d, i) => ({
    show_id: showId,
    label: d.label.trim().slice(0, 120),
    percentage: d.percentage != null && d.percentage !== ('' as unknown as number) ? num(d.percentage) : null,
    fixed_amount: d.fixed_amount != null ? num(d.fixed_amount) : null,
    notes: (d.notes || '').trim() || null,
    goes_to_artist: /argentor|agadu/i.test(d.label),
    sort_order: i,
  }))
  if (impuestos.length) await supabase.from('show_deductions').insert(impuestos)

  const gastos = p.gastos.filter(g => (g.category || '').trim() !== '').map((g, i) => ({
    show_id: showId,
    category: g.category.trim().slice(0, 120),
    amount: num(g.amount),
    notes: (g.notes || '').trim() || null,
    sort_order: i,
  }))
  if (gastos.length) await supabase.from('expenses').insert(gastos)

  // 2) Totales del borderó (snapshot — fuente de verdad del display)
  await supabase.from('borderos').update({
    recaudacion: num(p.recaudacion),
    total_neto: num(p.total_neto),
    artista_final: num(p.artista_final),
    productora_share: num(p.productora_share),
  }).eq('show_id', showId)

  // 3) Datos del show que afectan el borderó (aforo / % de reparto)
  await supabase.from('shows').update({
    capacity: p.capacity != null ? Math.round(num(p.capacity)) : null,
    deal_percentage: p.deal_percentage != null ? num(p.deal_percentage) : null,
    artist_percentage: p.artist_percentage != null ? num(p.artist_percentage) : null,
  }).eq('id', showId)

  // 4) Cuenta corriente: ajustar crédito (borderó) y débito (pago histórico) al nuevo artista_final → saldo 0
  const artista = num(p.artista_final)
  await supabase.from('account_movements').update({ amount: artista }).eq('show_id', showId).eq('direction', 'credit').eq('source', 'bordero')
  await supabase.from('account_movements').update({ amount: artista }).eq('show_id', showId).eq('direction', 'debit').eq('source', 'manual')

  revalidatePath(`/shows/${showId}/bordero`)
  revalidatePath('/borderos')
  redirect(`/shows/${showId}/bordero`)
}
