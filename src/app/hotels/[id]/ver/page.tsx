import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import MapPreview from '@/components/MapPreview'
import CountryFlag from '@/components/CountryFlag'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-lg p-6 space-y-1">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-line last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

interface PrefView {
  notes: string | null
  is_favorite: boolean
  comedian: { stage_name: string | null } | null
}

export default async function HotelViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await getUserAndProfile()
  const canManage = profile.role === 'admin'

  const supabase = await createClient()
  const { data: h } = await supabase
    .from('hotels')
    .select('*, preferences:hotel_comedian_preferences(notes, is_favorite, comedian:comedian_id(stage_name))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!h) notFound()

  const prefs = (h.preferences ?? []) as PrefView[]

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/hotels" className="text-muted hover:text-body text-sm">← Hoteles</Link>
          <div className="flex items-center justify-between mt-2 gap-4">
            <h1 className="text-2xl font-bold">{h.name}</h1>
            {canManage && (
              <Link href={`/hotels/${h.id}`} className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition text-sm flex-shrink-0">
                Editar
              </Link>
            )}
          </div>
          {!h.is_active && (
            <span className="inline-block mt-2 bg-surface-2 text-muted px-2 py-1 rounded text-xs">Inactivo</span>
          )}
        </div>

        <Section title="Datos generales">
          <Row label="Ciudad" value={h.city} />
          <Row label="Provincia" value={h.province} />
          <Row label="País" value={<CountryFlag country={h.country} />} />
          <Row label="Dirección" value={h.address} />
          {h.maps_url && (
            <Row label="Google Maps" value={<a href={h.maps_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Abrir</a>} />
          )}
          {h.address && (
            <div className="pt-3">
              <MapPreview query={h.address} />
            </div>
          )}
        </Section>

        <Section title="Contacto">
          <Row label="Contacto" value={h.contact_name} />
          <Row label="Teléfono de contacto" value={h.contact_phone} />
          <Row label="Teléfono del hotel" value={h.phone} />
          <Row label="Email" value={h.email} />
          <Row label="Sitio web" value={h.website_url ? <a href={h.website_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Abrir</a> : null} />
        </Section>

        <Section title="Tarifas y canje">
          <Row label="Tarifas" value={h.price_notes} />
          <Row label="Check-in" value={h.checkin_time} />
          <Row label="Check-out" value={h.checkout_time} />
          <Row label="Desayuno incluido" value={h.breakfast_included ? '✅ Sí' : '❌ No'} />
          <Row label="Canje" value={h.has_canje ? '✅ Sí' : '❌ No'} />
          {h.has_canje && <Row label="Detalle del canje" value={h.canje_details} />}
        </Section>

        <Section title="Preferencias de comediantes">
          {prefs.length === 0 ? (
            <p className="text-sm text-faint">Sin preferencias cargadas.</p>
          ) : (
            <div className="space-y-2">
              {prefs.map((p, i) => (
                <div key={i} className="py-1.5 border-b border-line last:border-0">
                  <p className="text-sm font-medium">
                    {p.is_favorite ? '⭐ ' : ''}{p.comedian?.stage_name ?? '—'}
                  </p>
                  {p.notes && <p className="text-sm text-muted">{p.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {h.notes && (
          <Section title="Notas internas">
            <p className="text-sm whitespace-pre-line">{h.notes}</p>
          </Section>
        )}
      </div>
    </main>
  )
}
