'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatShowDate } from '@/lib/shows'
import { loadBordero } from './data'

export async function cerrarBordero(showId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const ctx = await loadBordero(showId)
  if (!ctx) redirect(`/shows/${showId}/bordero?error=${encodeURIComponent('No se encontró la fecha')}`)

  const r = ctx.result

  // 1) Snapshot (uno por fecha; re-cerrar lo actualiza)
  const { data: bordero, error } = await supabase
    .from('borderos')
    .upsert({
      show_id: showId,
      currency: ctx.currency,
      recaudacion: r.recaudacion,
      impuestos_total: r.impuestosTotal,
      parte_productora_sala: r.parteProductoraSala,
      gastos_total: r.gastosTotal,
      total_neto: r.totalNeto,
      artista_final: r.artistaFinal,
      productora_share: r.productoraShare,
      breakdown: r,
      closed_by: user?.id ?? null,
      closed_at: new Date().toISOString(),
    }, { onConflict: 'show_id' })
    .select('id')
    .single()

  if (error || !bordero) {
    redirect(`/shows/${showId}/bordero?error=${encodeURIComponent(error?.message || 'Error al cerrar')}`)
  }

  // 2) Reset de los movimientos automáticos de este borderó (idempotente)
  await supabase.from('account_movements').delete().eq('bordero_id', bordero.id).eq('source', 'bordero')

  // 3) Créditos automáticos
  const concept = `Borderó ${formatShowDate(ctx.showDate)}${ctx.theaterName ? ` · ${ctx.theaterName}` : ''}`
  const movements: Record<string, unknown>[] = []

  // Comediante solista → su parte
  if (ctx.performerType === 'comedian' && ctx.comedianId && r.artistaFinal !== 0) {
    movements.push({
      party_type: 'comedian', party_id: ctx.comedianId, direction: 'credit',
      amount: r.artistaFinal, currency: ctx.currency, concept,
      source: 'bordero', show_id: showId, bordero_id: bordero.id, created_by: user?.id ?? null,
    })
  }

  // Equipo etiquetado en líneas de gasto → su pago
  for (const p of ctx.expensePayees) {
    if (!p.amount) continue
    movements.push({
      party_type: p.payee_type, party_id: p.payee_id, direction: 'credit',
      amount: p.amount, currency: ctx.currency, concept: `${p.category} · ${concept}`,
      source: 'bordero', show_id: showId, bordero_id: bordero.id, created_by: user?.id ?? null,
    })
  }

  if (movements.length) await supabase.from('account_movements').insert(movements)

  revalidatePath(`/shows/${showId}/bordero`)
  revalidatePath('/cuentas')
  redirect(`/shows/${showId}/bordero`)
}

export async function reabrirBordero(showId: string) {
  const supabase = await createClient()
  // Borrar el snapshot elimina en cascada sus movimientos automáticos
  const { error } = await supabase.from('borderos').delete().eq('show_id', showId)
  if (error) {
    redirect(`/shows/${showId}/bordero?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath(`/shows/${showId}/bordero`)
  revalidatePath('/cuentas')
  redirect(`/shows/${showId}/bordero`)
}
