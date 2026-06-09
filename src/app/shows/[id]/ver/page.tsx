import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate, formatDeal, statusMeta } from '@/lib/shows'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-1">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-zinc-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

export default async function ShowViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await getUserAndProfile()
  const canManage = profile.role === 'admin'

  const supabase = await createClient()
  const { data: show } = await supabase
    .from('shows')
    .select('*, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(id, name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!show) notFound()

  const st = statusMeta(show.status)
  const performer = show.performer_type === 'elenco'
    ? show.ensemble?.name ?? '—'
    : show.comedian?.stage_name ?? '—'
  const deal = formatDeal(show.deal_type, show.deal_fixed_amount, show.deal_percentage)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/shows" className="text-gray-400 hover:text-white text-sm">← Fechas</Link>
          <div className="flex items-center justify-between mt-2 gap-4">
            <h1 className="text-3xl font-bold">
              {show.performer_type === 'elenco' ? '🎭' : '🎤'} {performer}
            </h1>
            {canManage && (
              <Link href={`/shows/${show.id}`} className="px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition text-sm flex-shrink-0">
                Editar
              </Link>
            )}
          </div>
          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${st.badge}`}>{st.label}</span>
        </div>

        <Section title="📅 Datos de la fecha">
          <Row label="📅 Fecha y hora" value={formatShowDate(show.show_date)} />
          <Row label="🎤 Artista" value={performer} />
          <Row
            label="🏛️ Teatro"
            value={show.theater?.name
              ? <Link href={`/theaters/${show.theater.id}/ver`} className="text-blue-400 hover:text-blue-300">{show.theater.name}</Link>
              : '—'}
          />
          <Row label="🏙️ Ciudad" value={show.city} />
          <Row label="🗺️ Provincia" value={show.province} />
          <Row label="📣 Pautada" value={show.is_pautada ? '✅ Sí' : '❌ No'} />
        </Section>

        <Section title="🎟️ Entradas y arreglo">
          <Row label="👥 Capacidad" value={show.capacity} />
          <Row label="💵 Precio de entrada" value={show.ticket_price != null ? `$${show.ticket_price.toLocaleString('es-AR')}` : null} />
          <Row label="🤝 Arreglo" value={deal} />
        </Section>

        {show.notes && (
          <Section title="📝 Notas internas">
            <p className="text-sm whitespace-pre-line">{show.notes}</p>
          </Section>
        )}
      </div>
    </main>
  )
}
