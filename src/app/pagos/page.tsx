import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { arDateKey, formatShowDate } from '@/lib/shows'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { daysUntilShow } from '@/lib/ventas'
import { fmtMoney } from '@/lib/staff'
import PagoForm from '@/components/PagoForm'
import ConfirmSubmit from '@/components/ConfirmSubmit'
import { finishPayment, deletePayment } from './actions'

type Payment = {
  id: string; comedian_id: string | null; concept: string | null; amount: number; status: string
  invoice_url: string | null; receipt_url: string | null
  comedian: { stage_name: string | null } | null
}

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { user, profile } = await assertModuleAccess('pagos')
  const sp = await searchParams
  const supabase = await createClient()
  const isPayer = profile.role === 'admin' || profile.role === 'liquidadora'

  const todayKey = arDateKey(new Date().toISOString())
  const cutoff = new Date(Date.now() - 2 * 86400000).toISOString()

  // Comedianes que el usuario puede cargar (todos si paga; asignados si es productor)
  const { data: comData } = await supabase.from('comedians').select('id, stage_name').eq('is_active', true).order('stage_name')
  let comedians = (comData ?? []).map(c => ({ id: c.id as string, name: (c.stage_name as string) ?? 'Sin nombre' }))
  let allowedComedians: Set<string> | null = null
  if (!isPayer) {
    allowedComedians = await getAssignedComedianIds(supabase, user.id)
    comedians = comedians.filter(c => allowedComedians!.has(c.id))
  }

  // Fechas próximas por comediante (para el form)
  const { data: showRows } = await supabase
    .from('shows')
    .select('id, show_date, comedian_id, theater:theater_id(city, name)')
    .is('deleted_at', null)
    .gte('show_date', cutoff)
    .order('show_date', { ascending: true })
  const showsByComedian: Record<string, { id: string; label: string }[]> = {}
  for (const s of (showRows ?? []) as unknown as { id: string; show_date: string | null; comedian_id: string | null; theater: { city: string | null; name: string | null } | null }[]) {
    const d = daysUntilShow(s.show_date, todayKey)
    if (d == null || d < 0 || !s.comedian_id) continue
    if (allowedComedians && !allowedComedians.has(s.comedian_id)) continue
    ;(showsByComedian[s.comedian_id] ??= []).push({ id: s.id, label: `${formatShowDate(s.show_date)} · ${s.theater?.city ?? s.theater?.name ?? '—'}` })
  }

  // Pagos
  const { data: payData } = await supabase
    .from('expense_payments')
    .select('id, comedian_id, concept, amount, status, invoice_url, receipt_url, created_at, comedian:comedian_id(stage_name)')
    .order('created_at', { ascending: false })
  let payments = (payData ?? []) as unknown as Payment[]
  if (!isPayer) payments = payments.filter(p => p.comedian_id && allowedComedians!.has(p.comedian_id))

  // Fechas de cada pago
  const payIds = payments.map(p => p.id)
  const linkByPay = new Map<string, string[]>()
  if (payIds.length) {
    const { data: links } = await supabase.from('expense_payment_shows').select('payment_id, show_id').in('payment_id', payIds)
    const showIds = [...new Set((links ?? []).map(l => l.show_id as string))]
    const { data: si } = await supabase.from('shows').select('id, show_date, theater:theater_id(city)').in('id', showIds.length ? showIds : ['00000000-0000-0000-0000-000000000000'])
    const showLabel = new Map((si ?? []).map(s => [s.id as string, `${formatShowDate(s.show_date as string)} · ${(s as unknown as { theater: { city: string | null } | null }).theater?.city ?? ''}`]))
    for (const l of links ?? []) {
      const arr = linkByPay.get(l.payment_id as string) ?? []
      arr.push(showLabel.get(l.show_id as string) ?? '—')
      linkByPay.set(l.payment_id as string, arr)
    }
  }

  // URLs firmadas de los archivos
  const paths = payments.flatMap(p => [p.invoice_url, p.receipt_url].filter(Boolean) as string[])
  const signed = new Map<string, string>()
  if (paths.length) {
    const { data: urls } = await supabase.storage.from('pagos').createSignedUrls(paths, 3600)
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  const pendientes = payments.filter(p => p.status === 'pendiente')
  const terminados = payments.filter(p => p.status === 'terminado')

  const PayCard = ({ p }: { p: Payment }) => {
    const fechas = linkByPay.get(p.id) ?? []
    const share = fechas.length ? p.amount / fechas.length : p.amount
    return (
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium truncate">{p.concept ?? 'Gasto'} <span className="text-faint text-xs">· {p.comedian?.stage_name ?? '—'}</span></p>
            <p className="text-[12px] text-faint mt-0.5">{fechas.length} fecha{fechas.length === 1 ? '' : 's'}: {fechas.join(' · ')}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">{fmtMoney(p.amount)}</div>
            {fechas.length > 1 && <div className="text-[11px] text-faint">{fmtMoney(share)} c/u</div>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
          {p.invoice_url && signed.get(p.invoice_url) && <a href={signed.get(p.invoice_url)} className="text-brand hover:underline">Ver factura</a>}
          {p.receipt_url && signed.get(p.receipt_url) && <a href={signed.get(p.receipt_url)} className="text-brand hover:underline">Ver comprobante</a>}
          {isPayer && (
            <form action={deletePayment.bind(null, p.id)} className="ml-auto">
              <ConfirmSubmit message="¿Borrar este gasto?" className="text-red-400 hover:text-red-300 text-xs">Borrar</ConfirmSubmit>
            </form>
          )}
        </div>
        {isPayer && p.status === 'pendiente' && (
          <form action={finishPayment.bind(null, p.id)} className="mt-3 pt-3 border-t border-line flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-faint mb-1">Comprobante de transferencia</label>
              <input name="comprobante" type="file" accept="image/*,application/pdf" required className="text-sm text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-surface-2 file:text-body file:cursor-pointer" />
            </div>
            <button type="submit" className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition text-sm">Pagar y marcar hecho</button>
          </form>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Pagos</h1>
          <p className="text-faint mt-1">Cargá los gastos a pagar con su factura. Cuando administración paga y adjunta el comprobante, el gasto se vuelca en Gastos.</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md">{sp.success}</div>}

        {comedians.length > 0 && <PagoForm comedians={comedians} showsByComedian={showsByComedian} />}

        <section>
          <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-faint mb-3">Pendientes de pago ({pendientes.length})</h2>
          {pendientes.length === 0 ? (
            <p className="text-faint text-sm">No hay gastos pendientes.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{pendientes.map(p => <PayCard key={p.id} p={p} />)}</div>
          )}
        </section>

        <section>
          <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-faint mb-3">Terminados ({terminados.length})</h2>
          {terminados.length === 0 ? (
            <p className="text-faint text-sm">Todavía no hay pagos terminados.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{terminados.map(p => <PayCard key={p.id} p={p} />)}</div>
          )}
        </section>
      </div>
    </main>
  )
}
