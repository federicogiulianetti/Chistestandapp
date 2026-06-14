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

function BoolRow({ label, value }: { label: string; value?: boolean | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-line last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-right text-sm">{value ? '✅ Sí' : '❌ No'}</span>
    </div>
  )
}

function DirectionsLinks({ value }: { value?: string | null }) {
  const v = (value ?? '').trim()
  if (!v) return null
  const dest = encodeURIComponent(v)
  return (
    <div className="flex gap-3 text-xs mt-1">
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Google Maps</a>
      <a href={`https://waze.com/ul?q=${dest}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Waze</a>
    </div>
  )
}

function PhotoGrid({ title, urls }: { title: string; urls?: string[] | null }) {
  return (
    <div>
      <p className="text-muted text-sm mb-2">{title}</p>
      {!urls || urls.length === 0 ? (
        <p className="text-sm text-faint">Sin fotos.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {urls.map((u, i) => (
            <img key={i} src={u} alt="" className="w-40 h-40 object-cover rounded-lg border border-line" />
          ))}
        </div>
      )}
    </div>
  )
}

export default async function TheaterViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await getUserAndProfile()
  const canManage = profile.role === 'admin'

  const supabase = await createClient()
  const { data: t } = await supabase
    .from('theaters')
    .select('*')
    .eq('id', id)
    .single()

  if (!t) notFound()

  const arreglo = t.deal_type === 'fixed'
    ? `Fijo $${t.deal_fixed_amount?.toLocaleString('es-AR') ?? '?'}`
    : t.deal_type === 'percentage'
    ? `${t.deal_percentage ?? '?'}%`
    : '—'

  let restaurants: string[] = []
  try {
    const parsed = t.nearby_restaurants ? JSON.parse(t.nearby_restaurants) : []
    if (Array.isArray(parsed)) restaurants = parsed
  } catch {}
  const parkings: string[] = Array.isArray(t.nearby_parkings) ? t.nearby_parkings : []

  return (
    <main className="min-h-screen bg-ink text-body p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/theaters" className="text-muted hover:text-body text-sm">← Teatros</Link>
          <div className="flex items-center justify-between mt-2 gap-4">
            <h1 className="text-2xl font-bold">{t.name}</h1>
            {canManage && (
              <Link href={`/theaters/${t.id}`} className="px-4 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition text-sm flex-shrink-0">
                Editar
              </Link>
            )}
          </div>
          {!t.is_active && (
            <span className="inline-block mt-2 bg-surface-2 text-muted px-2 py-1 rounded text-xs">Inactivo</span>
          )}
        </div>

        <Section title="Datos generales">
          <Row label="Ciudad" value={t.city} />
          <Row label="Provincia" value={t.province} />
          <Row label="País" value={<CountryFlag country={t.country} />} />
          <Row label="Dirección" value={t.address} />
          <Row label="Capacidad sala" value={t.capacity_platea} />
          <Row label="Arreglo" value={arreglo} />
          {t.maps_url && (
            <Row label="Google Maps" value={<a href={t.maps_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Abrir</a>} />
          )}
          {t.address && (
            <div className="pt-3">
              <MapPreview query={t.address} />
            </div>
          )}
        </Section>

        <Section title="Estacionamiento">
          <BoolRow label="Estacionar en la puerta" value={t.parking_at_door} />
          {t.parking_at_door && <BoolRow label="Lugar reservado" value={t.parking_reserved} />}
          {!t.parking_at_door && parkings.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-muted text-sm">Estacionamientos cercanos</p>
              {parkings.map((addr, i) => (
                <div key={i}>
                  <p className="text-sm">{addr}</p>
                  <DirectionsLinks value={addr} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Boletería y ticketera">
          <BoolRow label="Tiene boletería" value={t.has_boleteria} />
          <Row label="Días" value={t.boleteria_days} />
          <Row label="Horario" value={t.boleteria_hours} />
          <BoolRow label="Entradas físicas" value={t.needs_physical_tickets} />
          <BoolRow label="Ticketera propia" value={t.own_ticketera_allowed} />
          <Row label="Ticketera del teatro" value={t.ticketera_name} />
          <Row label="% IIBB" value={t.ticketera_iibb} />
          <Row label="% AADET" value={t.ticketera_aadet} />
          <Row label="% crédito" value={t.ticketera_credit_card_pct} />
          <Row label="% débito" value={t.ticketera_debit_card_pct} />
          <Row label="Gastos bancarios" value={t.ticketera_banking_costs} />
          <Row label="Costo de ticketing" value={t.ticketera_ticketing_cost} />
          <Row label="Otras retenciones" value={t.other_retentions} />
        </Section>

        <Section title="Técnica">
          <BoolRow label="Sonido propio" value={t.has_own_sound} />
          <BoolRow label="Luces propias" value={t.has_own_lights} />
          <BoolRow label="Proyector" value={t.has_projector} />
          <BoolRow label="Pantalla" value={t.has_screen} />
          <BoolRow label="Banqueta en escenario" value={t.has_banqueta} />
          <BoolRow label="Aire acondicionado" value={t.has_ac} />
          <BoolRow label="Operador" value={t.has_operator} />
          {t.has_operator && <BoolRow label="Operador incluido" value={t.operator_included} />}
          {t.has_operator && <Row label="Costo operador" value={t.operator_cost} />}
          <Row label="Técnico/s" value={t.technician_names} />
          <Row label="Contacto técnico/s" value={t.technician_contacts} />
          <Row label="Rider" value={t.rider_url ? <a href={t.rider_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Abrir</a> : null} />
        </Section>

        <Section title="Camarines">
          <Row label="Cantidad" value={t.dressing_rooms_count} />
          <BoolRow label="Tienen baño" value={t.dressing_room_has_bathroom} />
        </Section>

        <Section title="Contactos">
          <Row label="Programador" value={t.programmer_name} />
          <Row label="Contacto programador" value={t.programmer_contact} />
          <Row label="Prensa y radios" value={t.press_contacts} />
        </Section>

        <Section title="Cartelería">
          <BoolRow label="Cartel en puerta/vinilo" value={t.allows_door_poster} />
          <Row label="Medidas" value={t.poster_dimensions} />
          <BoolRow label="Pegatina en la calle" value={t.allows_street_posters} />
          <Row label="Contacto pegatina" value={t.street_poster_contact} />
          <BoolRow label="Logo del teatro en piezas" value={t.requires_theater_logo} />
          {t.theater_logo_url && (
            <Row label="Logo" value={<a href={t.theater_logo_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand">Ver logo</a>} />
          )}
        </Section>

        <Section title="Acuerdo económico">
          <Row label="Tipo de arreglo" value={arreglo} />
          <Row label="Qué incluye" value={t.deal_includes} />
          <BoolRow label="Coproductor" value={t.has_coproducer} />
          {t.has_coproducer && <Row label="Arreglo coproductor" value={t.coproducer_deal} />}
          <BoolRow label="Seguro ART" value={t.requires_art_insurance} />
          <BoolRow label="Pasan Argentores" value={t.passes_argentores} />
          <Row label="Impuestos" value={t.municipal_taxes} />
          <BoolRow label="BDX hotel" value={t.bdx_hotel} />
          <BoolRow label="BDX pasajes" value={t.bdx_transport} />
          <Row label="Otros BDX" value={t.bdx_other} />
        </Section>

        <Section title="Emergencia y servicios">
          {t.nearest_police_station && (
            <div className="py-1.5">
              <p className="text-muted text-sm">Comisaría</p>
              <p className="text-sm">{t.nearest_police_station}</p>
              <DirectionsLinks value={t.nearest_police_station} />
            </div>
          )}
          {t.nearest_hospital && (
            <div className="py-1.5">
              <p className="text-muted text-sm">Hospital</p>
              <p className="text-sm">{t.nearest_hospital}</p>
              <DirectionsLinks value={t.nearest_hospital} />
            </div>
          )}
          {t.nearest_consulate && (
            <div className="py-1.5">
              <p className="text-muted text-sm">Consulado</p>
              <p className="text-sm">{t.nearest_consulate}</p>
              <DirectionsLinks value={t.nearest_consulate} />
            </div>
          )}
          {restaurants.length > 0 && (
            <div className="py-1.5 space-y-2">
              <p className="text-muted text-sm">Restaurantes cercanos</p>
              {restaurants.map((addr, i) => (
                <div key={i}>
                  <p className="text-sm">{addr}</p>
                  <DirectionsLinks value={addr} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Fotos del teatro">
          <PhotoGrid title="Fachada" urls={t.facade_photo_urls} />
          <div className="pt-3"><PhotoGrid title="Sala" urls={t.hall_photo_urls} /></div>
          <div className="pt-3"><PhotoGrid title="Camarines" urls={t.dressing_room_photo_urls} /></div>
        </Section>

        {t.notes && (
          <Section title="Notas internas">
            <p className="text-sm whitespace-pre-line">{t.notes}</p>
          </Section>
        )}
      </div>
    </main>
  )
}