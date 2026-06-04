import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { updateTheater, deleteTheater } from '@/app/theaters/actions'
import PhotoUpload from '@/components/PhotoUpload'

export default async function TheaterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const { id } = await params
  const sp = await searchParams
  const error = sp.error

  const supabase = await createClient()
  const { data: theater } = await supabase
    .from('theaters')
    .select('*')
    .eq('id', id)
    .single()

  if (!theater) notFound()

  const canEdit = profile.role === 'admin'
  const updateAction = updateTheater.bind(null, id)
  const deleteAction = deleteTheater.bind(null, id)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/theaters" className="text-gray-400 hover:text-white text-sm">
          ← Volver a teatros
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-8">
          {canEdit ? 'Editar teatro' : 'Detalle de teatro'}
        </h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Botón eliminar FUERA del form */}
        {canEdit && (
          <form action={deleteAction} className="mb-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 border border-red-700 text-red-400 rounded-md hover:bg-red-900/30 transition text-sm"
              onClick={(e) => { if (!confirm('¿Seguro que querés eliminar este teatro?')) e.preventDefault() }}
            >
              Eliminar teatro
            </button>
          </form>
        )}

        <form action={updateAction} className="space-y-6">
          <fieldset disabled={!canEdit} className="space-y-6 disabled:opacity-90">

            {/* ── DATOS GENERALES ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Datos generales</h2>

              <div>
                <label htmlFor="name" className="block text-sm mb-1">
                  Nombre del teatro <span className="text-red-400">*</span>
                </label>
                <input id="name" name="name" type="text" required defaultValue={theater.name ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm mb-1">Ciudad</label>
                  <input id="city" name="city" type="text" defaultValue={theater.city ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm mb-1">País</label>
                  <input id="country" name="country" type="text" defaultValue={theater.country ?? 'Argentina'}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm mb-1">Dirección</label>
                <input id="address" name="address" type="text" defaultValue={theater.address ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="maps_url" className="block text-sm mb-1">Link a Google Maps</label>
                <input id="maps_url" name="maps_url" type="url" defaultValue={theater.maps_url ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="capacity_platea" className="block text-sm mb-1">Capacidad platea</label>
                  <input id="capacity_platea" name="capacity_platea" type="number" min="0" defaultValue={theater.capacity_platea ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
                <div>
                  <label htmlFor="capacity_pullman" className="block text-sm mb-1">Capacidad pullman</label>
                  <input id="capacity_pullman" name="capacity_pullman" type="number" min="0" defaultValue={theater.capacity_pullman ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="has_pullman" name="has_pullman" defaultChecked={theater.has_pullman ?? false} />
                <label htmlFor="has_pullman" className="text-sm">Tiene pullman</label>
              </div>

              <div>
                <label className="block text-sm mb-1">Fotos de fachada</label>
                <PhotoUpload name="photo_urls" bucket="theater-photos" folder="fachada" defaultValue={theater.photo_urls?.[0]} disabled={!canEdit} />
              </div>

              <div>
                <label className="block text-sm mb-1">Fotos de la sala</label>
                <PhotoUpload name="sala_photo_urls" bucket="theater-photos" folder="sala" defaultValue={theater.sala_photo_urls?.[0]} disabled={!canEdit} />
              </div>
            </section>

            {/* ── BOLETERÍA Y TICKETERA ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Boletería y ticketera</h2>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="has_boleteria" name="has_boleteria" defaultChecked={theater.has_boleteria ?? false} />
                <label htmlFor="has_boleteria" className="text-sm">Tiene boletería</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="boleteria_days" className="block text-sm mb-1">Días de boletería</label>
                  <input id="boleteria_days" name="boleteria_days" type="text" defaultValue={theater.boleteria_days ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
                <div>
                  <label htmlFor="boleteria_hours" className="block text-sm mb-1">Horario de boletería</label>
                  <input id="boleteria_hours" name="boleteria_hours" type="text" defaultValue={theater.boleteria_hours ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="needs_physical_tickets" name="needs_physical_tickets" defaultChecked={theater.needs_physical_tickets ?? false} />
                <label htmlFor="needs_physical_tickets" className="text-sm">Hay que mandar entradas físicas</label>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="own_ticketera_allowed" name="own_ticketera_allowed" defaultChecked={theater.own_ticketera_allowed ?? true} />
                <label htmlFor="own_ticketera_allowed" className="text-sm">Podemos usar ticketera propia</label>
              </div>

              <div>
                <label htmlFor="ticketera_name" className="block text-sm mb-1">Ticketera del teatro</label>
                <input id="ticketera_name" name="ticketera_name" type="text" defaultValue={theater.ticketera_name ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ticketera_credit_card_pct" className="block text-sm mb-1">% tarjeta de crédito</label>
                  <input id="ticketera_credit_card_pct" name="ticketera_credit_card_pct" type="number" step="0.01" min="0" defaultValue={theater.ticketera_credit_card_pct ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
                <div>
                  <label htmlFor="ticketera_debit_card_pct" className="block text-sm mb-1">% tarjeta de débito</label>
                  <input id="ticketera_debit_card_pct" name="ticketera_debit_card_pct" type="number" step="0.01" min="0" defaultValue={theater.ticketera_debit_card_pct ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ticketera_iibb" name="ticketera_iibb" defaultChecked={theater.ticketera_iibb ?? false} />
                  <label htmlFor="ticketera_iibb" className="text-sm">IIBB</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ticketera_aadet" name="ticketera_aadet" defaultChecked={theater.ticketera_aadet ?? false} />
                  <label htmlFor="ticketera_aadet" className="text-sm">AADET</label>
                </div>
              </div>

              <div>
                <label htmlFor="ticketera_banking_costs" className="block text-sm mb-1">Gastos bancarios</label>
                <input id="ticketera_banking_costs" name="ticketera_banking_costs" type="text" defaultValue={theater.ticketera_banking_costs ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="ticketera_ticketing_cost" className="block text-sm mb-1">Costo de ticketing</label>
                <input id="ticketera_ticketing_cost" name="ticketera_ticketing_cost" type="text" defaultValue={theater.ticketera_ticketing_cost ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="other_retentions" className="block text-sm mb-1">Otras retenciones o gastos</label>
                <textarea id="other_retentions" name="other_retentions" rows={2} defaultValue={theater.other_retentions ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>
            </section>

            {/* ── TÉCNICA ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Técnica</h2>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="has_own_sound" name="has_own_sound" defaultChecked={theater.has_own_sound ?? false} />
                  <label htmlFor="has_own_sound" className="text-sm">Tiene sonido propio</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="has_own_lights" name="has_own_lights" defaultChecked={theater.has_own_lights ?? false} />
                  <label htmlFor="has_own_lights" className="text-sm">Tiene luces propias</label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="has_operator" name="has_operator" defaultChecked={theater.has_operator ?? false} />
                <label htmlFor="has_operator" className="text-sm">Tiene operador de sonido/luces</label>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="operator_included" name="operator_included" defaultChecked={theater.operator_included ?? false} />
                <label htmlFor="operator_included" className="text-sm">Operador incluido en el arreglo</label>
              </div>

              <div>
                <label htmlFor="operator_cost" className="block text-sm mb-1">Costo del operador</label>
                <input id="operator_cost" name="operator_cost" type="number" step="0.01" min="0" defaultValue={theater.operator_cost ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="technician_names" className="block text-sm mb-1">Nombre/s del técnico/s de sala</label>
                <input id="technician_names" name="technician_names" type="text" defaultValue={theater.technician_names ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="technician_contacts" className="block text-sm mb-1">Contacto/s del técnico/s</label>
                <input id="technician_contacts" name="technician_contacts" type="text" defaultValue={theater.technician_contacts ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="has_projector" name="has_projector" defaultChecked={theater.has_projector ?? false} />
                  <label htmlFor="has_projector" className="text-sm">Tiene proyector</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="has_screen" name="has_screen" defaultChecked={theater.has_screen ?? false} />
                  <label htmlFor="has_screen" className="text-sm">Tiene pantalla</label>
                </div>
              </div>

              <div>
                <label htmlFor="rider_url" className="block text-sm mb-1">Rider técnico (URL o link)</label>
                <input id="rider_url" name="rider_url" type="text" defaultValue={theater.rider_url ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>
            </section>

            {/* ── CAMARINES ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Camarines</h2>

              <div>
                <label htmlFor="dressing_rooms_count" className="block text-sm mb-1">Cantidad de camarines</label>
                <input id="dressing_rooms_count" name="dressing_rooms_count" type="number" min="0" defaultValue={theater.dressing_rooms_count ?? 0}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="dressing_room_has_bathroom" name="dressing_room_has_bathroom" defaultChecked={theater.dressing_room_has_bathroom ?? false} />
                  <label htmlFor="dressing_room_has_bathroom" className="text-sm">Tienen baño</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="dressing_room_has_banqueta" name="dressing_room_has_banqueta" defaultChecked={theater.dressing_room_has_banqueta ?? false} />
                  <label htmlFor="dressing_room_has_banqueta" className="text-sm">Tienen banqueta</label>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Fotos de camarines</label>
                <PhotoUpload name="dressing_room_photo_urls" bucket="theater-photos" folder="camarines" defaultValue={theater.dressing_room_photo_urls?.[0]} disabled={!canEdit} />
              </div>
            </section>

            {/* ── CONTACTOS ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Contactos</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="programmer_name" className="block text-sm mb-1">Nombre del programador</label>
                  <input id="programmer_name" name="programmer_name" type="text" defaultValue={theater.programmer_name ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
                <div>
                  <label htmlFor="programmer_contact" className="block text-sm mb-1">Contacto del programador</label>
                  <input id="programmer_contact" name="programmer_contact" type="text" defaultValue={theater.programmer_contact ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
              </div>

              <div>
                <label htmlFor="press_contacts" className="block text-sm mb-1">Contactos de prensa y radios</label>
                <textarea id="press_contacts" name="press_contacts" rows={2} defaultValue={theater.press_contacts ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>
            </section>

            {/* ── CARTELERÍA ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Cartelería</h2>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="allows_door_poster" name="allows_door_poster" defaultChecked={theater.allows_door_poster ?? false} />
                <label htmlFor="allows_door_poster" className="text-sm">Se puede poner cartel en puerta o vinilo</label>
              </div>

              <div>
                <label htmlFor="poster_dimensions" className="block text-sm mb-1">Medidas del cartel/vinilo</label>
                <input id="poster_dimensions" name="poster_dimensions" type="text" defaultValue={theater.poster_dimensions ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="allows_street_posters" name="allows_street_posters" defaultChecked={theater.allows_street_posters ?? false} />
                <label htmlFor="allows_street_posters" className="text-sm">Se puede hacer pegatina de carteles en la calle</label>
              </div>

              <div>
                <label htmlFor="street_poster_contact" className="block text-sm mb-1">Contacto para pegatina de carteles</label>
                <input id="street_poster_contact" name="street_poster_contact" type="text" defaultValue={theater.street_poster_contact ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="requires_theater_logo" name="requires_theater_logo" defaultChecked={theater.requires_theater_logo ?? false} />
                <label htmlFor="requires_theater_logo" className="text-sm">Hay que agregar logo del teatro en las piezas</label>
              </div>

              <div>
                <label className="block text-sm mb-1">Logo del teatro</label>
                <PhotoUpload name="theater_logo_url" bucket="theater-photos" folder="logos" defaultValue={theater.theater_logo_url} disabled={!canEdit} />
              </div>
            </section>

            {/* ── ACUERDO ECONÓMICO ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Acuerdo económico</h2>

              <div>
                <label htmlFor="deal_type" className="block text-sm mb-1">Tipo de arreglo</label>
                <select id="deal_type" name="deal_type" defaultValue={theater.deal_type ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70">
                  <option value="">— Seleccioná —</option>
                  <option value="fixed">Fijo</option>
                  <option value="percentage">Porcentaje</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="deal_fixed_amount" className="block text-sm mb-1">Monto fijo ($)</label>
                  <input id="deal_fixed_amount" name="deal_fixed_amount" type="number" step="0.01" min="0" defaultValue={theater.deal_fixed_amount ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
                <div>
                  <label htmlFor="deal_percentage" className="block text-sm mb-1">Porcentaje (%)</label>
                  <input id="deal_percentage" name="deal_percentage" type="number" step="0.01" min="0" max="100" defaultValue={theater.deal_percentage ?? ''}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
                </div>
              </div>

              <div>
                <label htmlFor="deal_includes" className="block text-sm mb-1">¿Qué incluye su parte?</label>
                <textarea id="deal_includes" name="deal_includes" rows={2} defaultValue={theater.deal_includes ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="has_coproducer" name="has_coproducer" defaultChecked={theater.has_coproducer ?? false} />
                <label htmlFor="has_coproducer" className="text-sm">Hay coproductor</label>
              </div>

              <div>
                <label htmlFor="coproducer_deal" className="block text-sm mb-1">Arreglo con el coproductor</label>
                <textarea id="coproducer_deal" name="coproducer_deal" rows={2} defaultValue={theater.coproducer_deal ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="requires_art_insurance" name="requires_art_insurance" defaultChecked={theater.requires_art_insurance ?? false} />
                  <label htmlFor="requires_art_insurance" className="text-sm">Hay que sacar seguro ART</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="passes_argentores" name="passes_argentores" defaultChecked={theater.passes_argentores ?? true} />
                  <label htmlFor="passes_argentores" className="text-sm">Pasan Argentores</label>
                </div>
              </div>

              <div>
                <label htmlFor="municipal_taxes" className="block text-sm mb-1">Impuestos municipales o provinciales</label>
                <input id="municipal_taxes" name="municipal_taxes" type="text" defaultValue={theater.municipal_taxes ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="bdx_hotel" name="bdx_hotel" defaultChecked={theater.bdx_hotel ?? false} />
                  <label htmlFor="bdx_hotel" className="text-sm">BDX hotel</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="bdx_transport" name="bdx_transport" defaultChecked={theater.bdx_transport ?? false} />
                  <label htmlFor="bdx_transport" className="text-sm">BDX pasajes</label>
                </div>
              </div>

              <div>
                <label htmlFor="bdx_other" className="block text-sm mb-1">Otros gastos BDX</label>
                <input id="bdx_other" name="bdx_other" type="text" defaultValue={theater.bdx_other ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>
            </section>

            {/* ── EMERGENCIA Y SERVICIOS ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Emergencia y servicios</h2>

              <div>
                <label htmlFor="nearest_police_station" className="block text-sm mb-1">Comisaría más cercana</label>
                <input id="nearest_police_station" name="nearest_police_station" type="text" defaultValue={theater.nearest_police_station ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="nearest_hospital" className="block text-sm mb-1">Hospital más cercano</label>
                <input id="nearest_hospital" name="nearest_hospital" type="text" defaultValue={theater.nearest_hospital ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="nearest_consulate" className="block text-sm mb-1">Consulado (para giras internacionales)</label>
                <input id="nearest_consulate" name="nearest_consulate" type="text" defaultValue={theater.nearest_consulate ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>

              <div>
                <label htmlFor="nearby_restaurants" className="block text-sm mb-1">Restaurantes cercanos abiertos hasta tarde</label>
                <textarea id="nearby_restaurants" name="nearby_restaurants" rows={3} defaultValue={theater.nearby_restaurants ?? ''}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />
              </div>
            </section>

            {/* ── NOTAS ── */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Notas internas</h2>
              <p className="text-xs text-gray-400">Solo visible para el equipo.</p>
              <textarea id="notes" name="notes" rows={3} defaultValue={theater.notes ?? ''}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70" />

              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" name="is_active" defaultChecked={theater.is_active ?? true} />
                <label htmlFor="is_active" className="text-sm">Teatro activo</label>
              </div>
            </section>

          </fieldset>

          {canEdit && (
            <div className="flex gap-3 justify-end">
              <Link
                href="/theaters"
                className="px-4 py-2 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition"
              >
                Guardar cambios
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  )
}
