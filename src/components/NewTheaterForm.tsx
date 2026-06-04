'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createTheater } from '@/app/theaters/actions'

interface Restaurant {
  id: number
  mapsUrl: string
  name: string
}

export default function NewTheaterForm({ error }: { error?: string }) {
  // Datos generales
  const [hasPullman, setHasPullman] = useState(false)

  // Boletería
  const [hasBoleteria, setHasBoleteria] = useState(false)

  // Ticketera
  const [ownTicketera, setOwnTicketera] = useState(false)

  // Técnica
  const [hasOperator, setHasOperator] = useState(false)

  // Cartelería
  const [allowsDoorPoster, setAllowsDoorPoster] = useState(false)
  const [allowsStreetPosters, setAllowsStreetPosters] = useState(false)
  const [requiresTheaterLogo, setRequiresTheaterLogo] = useState(false)

  // Acuerdo económico
  const [dealType, setDealType] = useState('')
  const [hasCoproducer, setHasCoproducer] = useState(false)

  // Restaurantes dinámicos
  const [restaurants, setRestaurants] = useState<Restaurant[]>([{ id: 1, mapsUrl: '', name: '' }])

  // Autocompletado Google Maps para el nombre del teatro
  const nameInputRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const countryRef = useRef<HTMLInputElement>(null)
  const mapsUrlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || !nameInputRef.current) return

    const initAutocomplete = () => {
      if (!window.google || !nameInputRef.current) return
      const autocomplete = new window.google.maps.places.Autocomplete(nameInputRef.current, {
        types: ['establishment'],
        fields: ['name', 'formatted_address', 'address_components', 'url'],
      })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place) return
        let city = ''
        let country = ''
        place.address_components?.forEach((c: google.maps.GeocoderAddressComponent) => {
          if (c.types.includes('locality')) city = c.long_name
          if (c.types.includes('administrative_area_level_1') && !city) city = c.long_name
          if (c.types.includes('country')) country = c.long_name
        })
        if (addressRef.current) addressRef.current.value = place.formatted_address ?? ''
        if (cityRef.current) cityRef.current.value = city
        if (countryRef.current) countryRef.current.value = country
        if (mapsUrlRef.current) mapsUrlRef.current.value = place.url ?? ''
      })
    }

    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.onload = initAutocomplete
      document.head.appendChild(script)
    } else {
      initAutocomplete()
    }
  }, [])

  const addRestaurant = () => {
    setRestaurants(prev => [...prev, { id: Date.now(), mapsUrl: '', name: '' }])
  }

  const removeRestaurant = (id: number) => {
    setRestaurants(prev => prev.filter(r => r.id !== id))
  }

  const input = "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
  const checkbox = "mt-0.5"
  const label = "block text-sm mb-1"
  const section = "bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4"

  return (
    <form action={createTheater} className="space-y-6">

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* ── DATOS GENERALES ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Datos generales</h2>

        <div>
          <label htmlFor="name" className={label}>
            Nombre del teatro <span className="text-red-400">*</span>
          </label>
          <input ref={nameInputRef} id="name" name="name" type="text" required
            placeholder="Buscá el nombre del teatro..."
            className={input} />
          <p className="text-xs text-gray-500 mt-1">Escribí el nombre y seleccioná de las sugerencias para completar dirección y ciudad automáticamente.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className={label}>Ciudad</label>
            <input ref={cityRef} id="city" name="city" type="text" className={input} />
          </div>
          <div>
            <label htmlFor="country" className={label}>País</label>
            <input ref={countryRef} id="country" name="country" type="text" defaultValue="Argentina" className={input} />
          </div>
        </div>

        <div>
          <label htmlFor="address" className={label}>Dirección</label>
          <input ref={addressRef} id="address" name="address" type="text" className={input} />
        </div>

        <div>
          <label htmlFor="maps_url" className={label}>Link a Google Maps</label>
          <input ref={mapsUrlRef} id="maps_url" name="maps_url" type="url" className={input} />
        </div>

        <div>
          <label htmlFor="capacity_platea" className={label}>Capacidad platea</label>
          <input id="capacity_platea" name="capacity_platea" type="number" min="0" className={input} />
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_pullman" name="has_pullman" className={checkbox}
            checked={hasPullman} onChange={e => setHasPullman(e.target.checked)} />
          <label htmlFor="has_pullman" className="text-sm">Tiene pullman</label>
        </div>

        {hasPullman && (
          <div>
            <label htmlFor="capacity_pullman" className={label}>Capacidad pullman</label>
            <input id="capacity_pullman" name="capacity_pullman" type="number" min="0" className={input} />
          </div>
        )}
      </section>

      {/* ── BOLETERÍA Y TICKETERA ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Boletería y ticketera</h2>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_boleteria" name="has_boleteria" className={checkbox}
            checked={hasBoleteria} onChange={e => setHasBoleteria(e.target.checked)} />
          <label htmlFor="has_boleteria" className="text-sm">Tiene boletería</label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="boleteria_days" className={label}>Días de boletería</label>
            <input id="boleteria_days" name="boleteria_days" type="text"
              placeholder="Ej: Lun a Vie" disabled={!hasBoleteria} className={input} />
          </div>
          <div>
            <label htmlFor="boleteria_hours" className={label}>Horario de boletería</label>
            <input id="boleteria_hours" name="boleteria_hours" type="text"
              placeholder="Ej: 10 a 18hs" disabled={!hasBoleteria} className={input} />
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="needs_physical_tickets" name="needs_physical_tickets" className={checkbox} />
          <label htmlFor="needs_physical_tickets" className="text-sm">Hay que mandar entradas físicas</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="own_ticketera_allowed" name="own_ticketera_allowed" className={checkbox}
            checked={ownTicketera} onChange={e => setOwnTicketera(e.target.checked)} />
          <label htmlFor="own_ticketera_allowed" className="text-sm">Podemos usar ticketera propia</label>
        </div>

        <div>
          <label htmlFor="ticketera_name" className={label}>Nombre de la ticketera del teatro</label>
          <input id="ticketera_name" name="ticketera_name" type="text"
            disabled={ownTicketera} className={input} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ticketera_credit_card_pct" className={label}>% IIBB</label>
            <input id="ticketera_credit_card_pct" name="ticketera_credit_card_pct"
              type="number" step="0.01" min="0" disabled={ownTicketera} className={input} />
          </div>
          <div>
            <label htmlFor="ticketera_debit_card_pct" className={label}>% AADET</label>
            <input id="ticketera_debit_card_pct" name="ticketera_debit_card_pct"
              type="number" step="0.01" min="0" disabled={ownTicketera} className={input} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ticketera_credit_card_pct_real" className={label}>% tarjeta de crédito</label>
            <input id="ticketera_credit_card_pct_real" name="ticketera_credit_card_pct_real"
              type="number" step="0.01" min="0" disabled={ownTicketera} className={input} />
          </div>
          <div>
            <label htmlFor="ticketera_debit_card_pct_real" className={label}>% tarjeta de débito</label>
            <input id="ticketera_debit_card_pct_real" name="ticketera_debit_card_pct_real"
              type="number" step="0.01" min="0" disabled={ownTicketera} className={input} />
          </div>
        </div>

        <div>
          <label htmlFor="ticketera_banking_costs" className={label}>Gastos bancarios</label>
          <input id="ticketera_banking_costs" name="ticketera_banking_costs" type="text"
            disabled={ownTicketera} className={input} />
        </div>

        <div>
          <label htmlFor="ticketera_ticketing_cost" className={label}>Costo de ticketing</label>
          <input id="ticketera_ticketing_cost" name="ticketera_ticketing_cost" type="text"
            disabled={ownTicketera} className={input} />
        </div>

        <div>
          <label htmlFor="other_retentions" className={label}>Otras retenciones o gastos</label>
          <textarea id="other_retentions" name="other_retentions" rows={2}
            disabled={ownTicketera}
            className={input} />
        </div>
      </section>

      {/* ── TÉCNICA ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Técnica</h2>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_own_sound" name="has_own_sound" className={checkbox} />
          <label htmlFor="has_own_sound" className="text-sm">Tiene sonido propio</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_own_lights" name="has_own_lights" className={checkbox} />
          <label htmlFor="has_own_lights" className="text-sm">Tiene luces propias</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_projector" name="has_projector" className={checkbox} />
          <label htmlFor="has_projector" className="text-sm">Tiene proyector</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_screen" name="has_screen" className={checkbox} />
          <label htmlFor="has_screen" className="text-sm">Tiene pantalla</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_banqueta" name="has_banqueta" className={checkbox} />
          <label htmlFor="has_banqueta" className="text-sm">Tiene banqueta en escenario</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_ac" name="has_ac" className={checkbox} />
          <label htmlFor="has_ac" className="text-sm">Tiene aire acondicionado</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_operator" name="has_operator" className={checkbox}
            checked={hasOperator} onChange={e => setHasOperator(e.target.checked)} />
          <label htmlFor="has_operator" className="text-sm">Tiene operador de sonido/luces</label>
        </div>

        {hasOperator && (
          <>
            <div className="flex items-start gap-2">
              <input type="checkbox" id="operator_included" name="operator_included" className={checkbox} />
              <label htmlFor="operator_included" className="text-sm">Operador incluido en el arreglo</label>
            </div>
            <div>
              <label htmlFor="operator_cost" className={label}>Costo del operador (si no está incluido)</label>
              <input id="operator_cost" name="operator_cost" type="number" step="0.01" min="0" className={input} />
            </div>
          </>
        )}

        <div>
          <label htmlFor="technician_names" className={label}>Nombre/s del técnico/s de sala</label>
          <input id="technician_names" name="technician_names" type="text" className={input} />
        </div>

        <div>
          <label htmlFor="technician_contacts" className={label}>Contacto/s del técnico/s</label>
          <input id="technician_contacts" name="technician_contacts" type="text" className={input} />
        </div>

        <div>
          <label htmlFor="rider_url" className={label}>Rider técnico (URL o link)</label>
          <input id="rider_url" name="rider_url" type="text" className={input} />
        </div>
      </section>

      {/* ── CAMARINES ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Camarines</h2>

        <div>
          <label htmlFor="dressing_rooms_count" className={label}>Cantidad de camarines</label>
          <input id="dressing_rooms_count" name="dressing_rooms_count" type="number" min="0" defaultValue={0} className={input} />
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="dressing_room_has_bathroom" name="dressing_room_has_bathroom" className={checkbox} />
          <label htmlFor="dressing_room_has_bathroom" className="text-sm">Tienen baño</label>
        </div>
      </section>

      {/* ── CONTACTOS ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Contactos</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="programmer_name" className={label}>Nombre del programador</label>
            <input id="programmer_name" name="programmer_name" type="text" className={input} />
          </div>
          <div>
            <label htmlFor="programmer_contact" className={label}>Contacto del programador</label>
            <input id="programmer_contact" name="programmer_contact" type="text" className={input} />
          </div>
        </div>

        <div>
          <label htmlFor="press_contacts" className={label}>Contactos de prensa y radios</label>
          <textarea id="press_contacts" name="press_contacts" rows={2} className={input} />
        </div>
      </section>

      {/* ── CARTELERÍA ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Cartelería</h2>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="allows_door_poster" name="allows_door_poster" className={checkbox}
            checked={allowsDoorPoster} onChange={e => setAllowsDoorPoster(e.target.checked)} />
          <label htmlFor="allows_door_poster" className="text-sm">Se puede poner cartel en puerta o vinilo</label>
        </div>

        <div>
          <label htmlFor="poster_dimensions" className={label}>Medidas del cartel/vinilo</label>
          <input id="poster_dimensions" name="poster_dimensions" type="text"
            disabled={!allowsDoorPoster} className={input} />
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="allows_street_posters" name="allows_street_posters" className={checkbox}
            checked={allowsStreetPosters} onChange={e => setAllowsStreetPosters(e.target.checked)} />
          <label htmlFor="allows_street_posters" className="text-sm">Se puede hacer pegatina de carteles en la calle</label>
        </div>

        <div>
          <label htmlFor="street_poster_contact" className={label}>Contacto para pegatina de carteles</label>
          <input id="street_poster_contact" name="street_poster_contact" type="text"
            disabled={!allowsStreetPosters} className={input} />
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="requires_theater_logo" name="requires_theater_logo" className={checkbox}
            checked={requiresTheaterLogo} onChange={e => setRequiresTheaterLogo(e.target.checked)} />
          <label htmlFor="requires_theater_logo" className="text-sm">Hay que agregar logo del teatro en las piezas</label>
        </div>

        {requiresTheaterLogo && (
          <div>
            <label htmlFor="theater_logo_url" className={label}>Link al logo del teatro</label>
            <input id="theater_logo_url" name="theater_logo_url" type="url" className={input} />
            <p className="text-xs text-gray-500 mt-1">Preferentemente en formato PNG con fondo transparente.</p>
          </div>
        )}
      </section>

      {/* ── ACUERDO ECONÓMICO ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Acuerdo económico</h2>

        <div>
          <label htmlFor="deal_type" className={label}>Tipo de arreglo</label>
          <select id="deal_type" name="deal_type" value={dealType}
            onChange={e => setDealType(e.target.value)}
            className={input}>
            <option value="">— Seleccioná —</option>
            <option value="fixed">Fijo</option>
            <option value="percentage">Porcentaje</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="deal_fixed_amount" className={label}>Monto fijo ($)</label>
            <input id="deal_fixed_amount" name="deal_fixed_amount" type="number" step="0.01" min="0"
              disabled={dealType !== 'fixed'} className={input} />
          </div>
          <div>
            <label htmlFor="deal_percentage" className={label}>Porcentaje (%)</label>
            <input id="deal_percentage" name="deal_percentage" type="number" step="0.01" min="0" max="100"
              disabled={dealType !== 'percentage'} className={input} />
          </div>
        </div>

        <div>
          <label htmlFor="deal_includes" className={label}>¿Qué incluye su parte?</label>
          <textarea id="deal_includes" name="deal_includes" rows={2} className={input} />
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="has_coproducer" name="has_coproducer" className={checkbox}
            checked={hasCoproducer} onChange={e => setHasCoproducer(e.target.checked)} />
          <label htmlFor="has_coproducer" className="text-sm">Hay coproductor</label>
        </div>

        {hasCoproducer && (
          <div>
            <label htmlFor="coproducer_deal" className={label}>Arreglo con el coproductor</label>
            <textarea id="coproducer_deal" name="coproducer_deal" rows={2} className={input} />
          </div>
        )}

        <div className="flex items-start gap-2">
          <input type="checkbox" id="requires_art_insurance" name="requires_art_insurance" className={checkbox} />
          <label htmlFor="requires_art_insurance" className="text-sm">Hay que sacar seguro ART</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="passes_argentores" name="passes_argentores" className={checkbox} defaultChecked />
          <label htmlFor="passes_argentores" className="text-sm">Pasan Argentores</label>
        </div>

        <div>
          <label htmlFor="municipal_taxes" className={label}>Impuestos municipales o provinciales</label>
          <input id="municipal_taxes" name="municipal_taxes" type="text" className={input} />
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="bdx_hotel" name="bdx_hotel" className={checkbox} />
          <label htmlFor="bdx_hotel" className="text-sm">BDX hotel</label>
        </div>

        <div className="flex items-start gap-2">
          <input type="checkbox" id="bdx_transport" name="bdx_transport" className={checkbox} />
          <label htmlFor="bdx_transport" className="text-sm">BDX pasajes aéreos</label>
        </div>

        <div>
          <label htmlFor="bdx_other" className={label}>Otros gastos BDX</label>
          <input id="bdx_other" name="bdx_other" type="text" className={input} />
        </div>
      </section>

      {/* ── EMERGENCIA Y SERVICIOS ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Emergencia y servicios</h2>

        <div>
          <label htmlFor="nearest_police_station" className={label}>Comisaría más cercana (link Google Maps)</label>
          <input id="nearest_police_station" name="nearest_police_station" type="url"
            placeholder="https://maps.google.com/..." className={input} />
        </div>

        <div>
          <label htmlFor="nearest_hospital" className={label}>Hospital más cercano (link Google Maps)</label>
          <input id="nearest_hospital" name="nearest_hospital" type="url"
            placeholder="https://maps.google.com/..." className={input} />
        </div>

        <div>
          <label htmlFor="nearest_consulate" className={label}>Consulado más cercano (link Google Maps)</label>
          <input id="nearest_consulate" name="nearest_consulate" type="url"
            placeholder="https://maps.google.com/..." className={input} />
        </div>

        {/* Restaurantes dinámicos */}
        <div>
          <label className={label}>Restaurantes cercanos abiertos hasta tarde</label>
          <div className="space-y-3">
            {restaurants.map((r, index) => (
              <div key={r.id} className="flex gap-2 items-center">
                <input
                  name={`restaurant_${index}`}
                  type="url"
                  placeholder="Link de Google Maps del restaurante"
                  defaultValue={r.mapsUrl}
                  className={input}
                />
                {restaurants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRestaurant(r.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRestaurant}
            className="mt-2 text-sm text-gray-400 hover:text-white transition"
          >
            + Agregar restaurante
          </button>
        </div>
      </section>

      {/* ── NOTAS ── */}
      <section className={section}>
        <h2 className="text-lg font-semibold">Notas internas</h2>
        <p className="text-xs text-gray-400">Solo visible para el equipo.</p>
        <textarea id="notes" name="notes" rows={3} className={input} />
        <div className="flex items-start gap-2">
          <input type="checkbox" id="is_active" name="is_active" className={checkbox} defaultChecked />
          <label htmlFor="is_active" className="text-sm">Teatro activo</label>
        </div>
      </section>

      {/* ── BOTONES ── */}
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
          Guardar teatro
        </button>
      </div>

    </form>
  )
}
