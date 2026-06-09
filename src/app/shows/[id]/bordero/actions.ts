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
      artista_final: r.artistaShare,   // SOLO el % del artista; el argentores va a su cuenta aparte
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

  // Comediante solista → su parte (SOLO el %, sin el argentores)
  if (ctx.performerType === 'comedian' && ctx.comedianId && r.artistaShare !== 0) {
    movements.push({
      party_type: 'comedian', party_id: ctx.comedianId, direction: 'credit',
      amount: r.artistaShare, currency: ctx.currency, concept,
      source: 'bordero', show_id: showId, bordero_id: bordero.id, created_by: user?.id ?? null,
    })
  }

  // Elenco → la parte del artista (sin argentores) se reparte en partes iguales entre sus miembros
  if (ctx.performerType === 'elenco' && ctx.ensembleMemberIds.length > 0 && r.artistaShare !== 0) {
    const share = r.artistaShare / ctx.ensembleMemberIds.length
    for (const memberId of ctx.ensembleMemberIds) {
      movements.push({
        party_type: 'comedian', party_id: memberId, direction: 'credit',
        amount: share, currency: ctx.currency, concept,
        source: 'bordero', show_id: showId, bordero_id: bordero.id, created_by: user?.id ?? null,
      })
    }
  }

  // Argentores → cuenta aparte (no a la cuenta corriente principal). Solo solistas; el dúo
  // se carga a mano porque el trámite lo hace un solo miembro. Conserva el estado "cobrado".
  if (ctx.performerType === 'comedian' && ctx.comedianId && r.artistaDeductions > 0) {
    await supabase.from('argentores_entries').upsert({
      show_id: showId, comedian_id: ctx.comedianId,
      amount: r.artistaDeductions, currency: ctx.currency,
    }, { onConflict: 'show_id,comedian_id' })
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
