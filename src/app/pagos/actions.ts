'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, type Profile } from '@/lib/supabase/auth'

type SB = Awaited<ReturnType<typeof createClient>>

const canPay = (p: Profile) => p.role === 'admin' || p.role === 'liquidadora'

async function canLoad(supabase: SB, p: Profile, userId: string, comedianId: string): Promise<boolean> {
  if (canPay(p)) return true
  const { data } = await supabase.from('assignments').select('id').eq('producer_id', userId).eq('comedian_id', comedianId).limit(1)
  return (data?.length ?? 0) > 0
}

async function uploadFile(supabase: SB, paymentId: string, file: File | null, kind: 'factura' | 'comprobante'): Promise<string | null> {
  if (!file || file.size === 0) return null
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${paymentId}/${kind}.${ext}`
  const { error } = await supabase.storage.from('pagos').upload(path, file, { upsert: true, contentType: file.type || undefined })
  return error ? null : path
}

export async function createPayment(formData: FormData) {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()

  const comedian_id = (formData.get('comedian_id') as string) || ''
  const shows = formData.getAll('show').map(String).filter(Boolean)
  const amount = Math.abs(Number(formData.get('amount')) || 0)
  const concept = (formData.get('concept') as string)?.trim() || null

  if (!comedian_id) redirect('/pagos?error=' + encodeURIComponent('Elegí un comediante'))
  if (shows.length === 0) redirect('/pagos?error=' + encodeURIComponent('Elegí al menos una fecha'))
  if (!amount) redirect('/pagos?error=' + encodeURIComponent('Poné un monto'))
  if (!(await canLoad(supabase, profile, user.id, comedian_id))) redirect('/pagos?error=' + encodeURIComponent('No tenés permiso para cargar este comediante'))

  const { data: pay, error } = await supabase
    .from('expense_payments')
    .insert({ comedian_id, concept, amount, status: 'pendiente', created_by: user.id })
    .select('id')
    .single()
  if (error || !pay) redirect('/pagos?error=' + encodeURIComponent(error?.message ?? 'No se pudo crear'))

  await supabase.from('expense_payment_shows').insert(shows.map(show_id => ({ payment_id: pay.id, show_id })))

  const path = await uploadFile(supabase, pay.id, formData.get('factura') as File | null, 'factura')
  if (path) await supabase.from('expense_payments').update({ invoice_url: path }).eq('id', pay.id)

  revalidatePath('/pagos')
  redirect('/pagos?success=' + encodeURIComponent('Gasto cargado'))
}

export async function finishPayment(paymentId: string, formData: FormData) {
  const { user, profile } = await getUserAndProfile()
  if (!canPay(profile)) redirect('/pagos?error=' + encodeURIComponent('Solo administración puede pagar'))
  const supabase = await createClient()

  const path = await uploadFile(supabase, paymentId, formData.get('comprobante') as File | null, 'comprobante')
  if (!path) redirect('/pagos?error=' + encodeURIComponent('Adjuntá el comprobante de transferencia'))

  const { error } = await supabase
    .from('expense_payments')
    .update({ receipt_url: path, status: 'terminado', paid_by: user.id, paid_at: new Date().toISOString() })
    .eq('id', paymentId)
  if (error) redirect('/pagos?error=' + encodeURIComponent(error.message))

  revalidatePath('/pagos')
  revalidatePath('/gastos')
  redirect('/pagos?success=' + encodeURIComponent('Pago terminado'))
}

export async function deletePayment(paymentId: string) {
  const { profile } = await getUserAndProfile()
  if (!canPay(profile)) redirect('/pagos?error=' + encodeURIComponent('Sin permiso'))
  const supabase = await createClient()
  await supabase.from('expense_payments').delete().eq('id', paymentId)
  revalidatePath('/pagos')
  revalidatePath('/gastos')
  redirect('/pagos?success=' + encodeURIComponent('Eliminado'))
}
