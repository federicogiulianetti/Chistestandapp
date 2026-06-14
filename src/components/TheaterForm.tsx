'use client'

import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import MapPreview from './MapPreview'
import PhotoUpload from './PhotoUpload'
import { loadGoogleMaps } from '@/lib/googleMaps'

interface Restaurant {
  id: number
  value: string
}
interface Parking {
  id: number
  value: string
}
interface PhotoSlot {
  id: number
  url: string
}
interface TheaterData {
  id?: string
  name?: string
  city?: string
  province?: string
  country?: string
  address?: string
  maps_url?: string
  capacity_platea?: number | null
  has_pullman?: boolean
  capacity_pullman?: number | null
  has_boleteria?: boolean
  boleteria_days?: string
  boleteria_hours?: string
  needs_physical_tickets?: boolean
  own_ticketera_allowed?: boolean
  ticketera_name?: string
  ticketera_credit_card_pct?: number | null
  ticketera_debit_card_pct?: number | null
  ticketera_banking_costs?: string
  ticketera_ticketing_cost?: string
  other_retentions?: string
  has_own_sound?: boolean
  has_own_lights?: boolean
  has_projector?: boolean
  has_screen?: boolean
  has_banqueta?: boolean
  has_ac?: boolean
  has_operator?: boolean
  operator_included?: boolean
  operator_cost?: number | null
  technician_names?: string
  technician_contacts?: string
  rider_url?: string
  dressing_rooms_count?: number
  dressing_room_has_bathroom?: boolean
  programmer_name?: string
  programmer_contact?: string
  press_contacts?: string
  allows_door_poster?: boolean
  poster_dimensions?: string
  allows_street_posters?: boolean
  street_poster_contact?: string
  requires_theater_logo?: boolean
  theater_logo_url?: string
  deal_type?: string
  deal_fixed_amount?: number | null
  deal_percentage?: number | null
  deal_includes?: string
  has_coproducer?: boolean
  coproducer_deal?: string
  requires_art_insurance?: boolean
  passes_argentores?: boolean
  municipal_taxes?: string
  bdx_hotel?: boolean
  bdx_transport?: boolean
  bdx_other?: string
  nearest_police_station?: string
  nearest_hospital?: string
  nearest_consulate?: string
  nearby_restaurants?: string
  parking_reserved?: boolean
  facade_photo_urls?: string[]
  hall_photo_urls?: string[]
  dressing_room_photo_urls?: string[]
  parking_at_door?: boolean
  nearby_parkings?: string[]
  notes?: string
  is_active?: boolean
}

interface TheaterFormProps {
  action: (formData: FormData) => void | Promise<void>
  theater?: TheaterData
  error?: string
  mode: 'new' | 'edit'
  deleteAction?: (formData: FormData) => void | Promise<void>
}

export default function TheaterForm({ action, theater, error, mode, deleteAction }: TheaterFormProps) {
  const t = theater ?? {}

  // Estado de todos los campos interactivos
  const [hasBoleteria, setHasBoleteria] = useState(t.has_boleteria ?? false)
  const [ownTicketera, setOwnTicketera] = useState(t.own_ticketera_allowed ?? false)
  const [hasOperator, setHasOperator] = useState(t.has_operator ?? false)
  const [allowsDoorPoster, setAllowsDoorPoster] = useState(t.allows_door_poster ?? false)
  const [allowsStreetPosters, setAllowsStreetPosters] = useState(t.allows_street_posters ?? false)
  const [requiresTheaterLogo, setRequiresTheaterLogo] = useState(t.requires_theater_logo ?? false)
  const [dealType, setDealType] = useState(t.deal_type ?? '')
  const [hasCoproducer, setHasCoproducer] = useState(t.has_coproducer ?? false)
  // Dirección que alimenta el mini-mapa
  const [mapQuery, setMapQuery] = useState(t.address ?? '')

  // Emergencia (direcciones para los links de Maps/Waze)
  const [policeAddr, setPoliceAddr] = useState(t.nearest_police_station ?? '')
  const [hospitalAddr, setHospitalAddr] = useState(t.nearest_hospital ?? '')
  const [consulateAddr, setConsulateAddr] = useState(t.nearest_consulate ?? '')

  // Restaurantes dinámicos
  const parseRestaurants = (): Restaurant[] => {
    if (!t.nearby_restaurants) return [{ id: 1, value: '' }]
    try {
      const parsed = JSON.parse(t.nearby_restaurants)
      if (Array.isArray(parsed)) return parsed.map((v, i) => ({ id: i + 1, value: v }))
    } catch {}
    return [{ id: 1, value: t.nearby_restaurants }]
  }
  const [restaurants, setRestaurants] = useState<Restaurant[]>(parseRestaurants)

  // Estacionamiento
  const [parkingAtDoor, setParkingAtDoor] = useState(t.parking_at_door ?? false)
  const parseParkings = (): Parking[] => {
    if (Array.isArray(t.nearby_parkings) && t.nearby_parkings.length > 0) {
      return t.nearby_parkings.map((v, i) => ({ id: i + 1, value: v }))
    }
    return [{ id: 1, value: '' }]
  }
  const [parkings, setParkings] = useState<Parking[]>(parseParkings)
  const [parkingReserved, setParkingReserved] = useState(t.parking_reserved ?? false)

  // Fotos
  const initPhotos = (urls?: string[]): PhotoSlot[] =>
    urls && urls.length > 0 ? urls.map((u, i) => ({ id: i + 1, url: u })) : []
  const [facadePhotos, setFacadePhotos] = useState<PhotoSlot[]>(initPhotos(t.facade_photo_urls))
  const [hallPhotos, setHallPhotos] = useState<PhotoSlot[]>(initPhotos(t.hall_photo_urls))
  const [dressingPhotos, setDressingPhotos] = useState<PhotoSlot[]>(initPhotos(t.dressing_room_photo_urls))

  // Autocompletado Google Maps
  const nameInputRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const provinceRef = useRef<HTMLInputElement>(null)
  const countryRef = useRef<HTMLInputElement>(null)
  const mapsUrlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode !== 'new' || !nameInputRef.current) return
    let cancelled = false

    const initAutocomplete = () => {
      if (cancelled || !window.google || !nameInputRef.current) return
      const autocomplete = new window.google.maps.places.Autocomplete(nameInputRef.current, {
        types: ['establishment'],
        fields: ['name', 'formatted_address', 'address_components', 'url'],
      })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place) return
        let city = ''
        let province = ''
        let country = ''
        place.address_components?.forEach((c: google.maps.GeocoderAddressComponent) => {
          if (c.types.includes('locality')) city = c.long_name
          if (c.types.includes('administrative_area_level_2') && !city) city = c.long_name
          if (c.types.includes('administrative_area_level_1')) province = c.long_name
          if (c.types.includes('country')) country = c.long_name
        })
        // El input queda solo con el nombre del lugar, no con la dirección completa
        if (nameInputRef.current && place.name) nameInputRef.current.value = place.name
        if (addressRef.current) addressRef.current.value = place.formatted_address ?? ''
        setMapQuery(place.formatted_address ?? '')
        if (cityRef.current) cityRef.current.value = city
        if (provinceRef.current) provinceRef.current.value = province
        if (countryRef.current) countryRef.current.value = country
        if (mapsUrlRef.current) mapsUrlRef.current.value = place.url ?? ''
      })
    }

    loadGoogleMaps().then(initAutocomplete).catch(() => {})
    return () => { cancelled = true }
  }, [mode])

  const addRestaurant = () => setRestaurants(prev => [...prev, { id: Date.now(), value: '' }])
  const removeRestaurant = (id: number) => setRestaurants(prev => prev.filter(r => r.id !== id))
  const updateRestaurant = (id: number, value: string) =>
    setRestaurants(prev => prev.map(r => (r.id === id ? { ...r, value } : r)))
  const addParking = () => setParkings(prev => [...prev, { id: Date.now(), value: '' }])
  const removeParking = (id: number) => setParkings(prev => prev.filter(p => p.id !== id))
  const updateParking = (id: number, value: string) =>
    setParkings(prev => prev.map(p => (p.id === id ? { ...p, value } : p)))

  // Estilos
  const inp = (disabled: boolean) =>
    `w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 transition ${
      disabled
        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
        : 'bg-surface-2 text-body'
    }`
  const sec = "bg-surface border border-line rounded-lg p-6 space-y-4"
  const lbl = "block text-sm mb-1"
  const chk = "mt-0.5"
  const phoneHint = "Con código de país (ej: +54 9 11 2345-6789)"

  // Links "Cómo llegar" a partir de una dirección
  const directionsLinks = (value: string) => {
    const v = value.trim()
    if (!v) return null
    const dest = encodeURIComponent(v)
    return (
      <div className="flex gap-3 text-xs ml-1 mt-1">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`}
          target="_blank" rel="noopener noreferrer"
          className="text-brand hover:text-brand">Cómo llegar (Google Maps)</a>
        <a href={`https://waze.com/ul?q=${dest}&navigate=yes`}
          target="_blank" rel="noopener noreferrer"
          className="text-brand hover:text-brand">Cómo llegar (Waze)</a>
      </div>
    )
  }

  const renderPhotoGroup = (
    label: string,
    prefix: string,
    slots: PhotoSlot[],
    setSlots: Dispatch<SetStateAction<PhotoSlot[]>>,
  ) => (
    <div>
      <label className={lbl}>{label}</label>
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-2">
          {slots.map((slot, index) => (
            <div key={slot.id}>
              <PhotoUpload
                name={`${prefix}${index}`}
                defaultValue={slot.url}
                bucket="theater-photos"
                folder="theaters"
              />
              <button type="button"
                onClick={() => setSlots(prev => prev.filter(s => s.id !== slot.id))}
                className="text-red-400 hover:text-red-300 text-xs mt-1">
                Quitar foto
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button"
        onClick={() => setSlots(prev => [...prev, { id: Date.now(), url: '' }])}
        className="text-sm text-muted hover:text-body transition">
        + Agregar foto
      </button>
    </div>
  )

  return (
    <>
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Botón eliminar FUERA del form principal */}
      {mode === 'edit' && deleteAction && (
        <form action={deleteAction} className="mb-4 flex justify-end">
          <button
            type="submit"
            onClick={(e) => {
              if (!window.confirm('¿Seguro que querés eliminar este teatro? Esta acción no se puede deshacer.')) e.preventDefault()
            }}
            className="px-4 py-2 border border-red-700 text-red-400 rounded-md hover:bg-red-900/30 transition text-sm"
          >
            Eliminar teatro
          </button>
        </form>
      )}

      <form action={action} className="space-y-6">

        {/* ── DATOS GENERALES ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Datos generales</h2>

          <div>
            <label htmlFor="name" className={lbl}>
              Nombre del teatro <span className="text-red-400">*</span>
            </label>
            <input
              ref={mode === 'new' ? nameInputRef : undefined}
              id="name" name="name" type="text" required
              defaultValue={t.name ?? ''}
              placeholder={mode === 'new' ? 'Buscá el nombre del teatro...' : ''}
              className={inp(false)}
            />
            {mode === 'new' && (
              <p className="text-xs text-faint mt-1">Escribí el nombre y seleccioná de las sugerencias para completar dirección, ciudad y provincia automáticamente.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className={lbl}>Ciudad</label>
              <input ref={mode === 'new' ? cityRef : undefined} id="city" name="city" type="text" defaultValue={t.city ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="province" className={lbl}>Provincia</label>
              <input ref={mode === 'new' ? provinceRef : undefined} id="province" name="province" type="text" defaultValue={t.province ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="country" className={lbl}>País</label>
              <input ref={mode === 'new' ? countryRef : undefined} id="country" name="country" type="text" defaultValue={t.country ?? 'Argentina'} className={inp(false)} />
            </div>
          </div>

          <div>
            <label htmlFor="address" className={lbl}>Dirección</label>
            <input ref={mode === 'new' ? addressRef : undefined} id="address" name="address" type="text" defaultValue={t.address ?? ''} onBlur={e => setMapQuery(e.target.value)} className={inp(false)} />
          </div>

          <div>
            <label htmlFor="maps_url" className={lbl}>Link a Google Maps</label>
            <input ref={mode === 'new' ? mapsUrlRef : undefined} id="maps_url" name="maps_url" type="url" defaultValue={t.maps_url ?? ''} className={inp(false)} />
          </div>

          <div>
            <label className={lbl}>Ubicación en el mapa</label>
            <MapPreview query={mapQuery} />
            {!mapQuery && (
              <p className="text-xs text-faint mt-1">El mapa aparece cuando cargás la dirección.</p>
            )}
          </div>

          <div>
            <label htmlFor="capacity_platea" className={lbl}>Capacidad sala</label>
            <input id="capacity_platea" name="capacity_platea" type="number" min="0" defaultValue={t.capacity_platea ?? ''} className={inp(false)} />
          </div>
        </section>

        {/* ── ESTACIONAMIENTO ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Estacionamiento</h2>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="parking_at_door" name="parking_at_door" className={chk}
              checked={parkingAtDoor} onChange={e => setParkingAtDoor(e.target.checked)} />
            <label htmlFor="parking_at_door" className="text-sm">Hay lugar para estacionar en la puerta</label>
          </div>

          {parkingAtDoor && (
            <div className="flex items-start gap-2 ml-6">
              <input type="checkbox" id="parking_reserved" name="parking_reserved" className={chk}
                checked={parkingReserved} onChange={e => setParkingReserved(e.target.checked)} />
              <label htmlFor="parking_reserved" className="text-sm">Es lugar reservado (exclusivo para nosotros)</label>
            </div>
          )}

          {!parkingAtDoor && (
            <div>
              <label className={lbl}>Estacionamientos cercanos</label>
              <div className="space-y-3">
                {parkings.map((p, index) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <input
                        name={`parkinglot_${index}`}
                        type="text"
                        placeholder="Dirección del estacionamiento (ej: Av. Corrientes 857)"
                        value={p.value}
                        onChange={e => updateParking(p.id, e.target.value)}
                        className={inp(false)}
                      />
                      {parkings.length > 1 && (
                        <button type="button" onClick={() => removeParking(p.id)}
                          className="text-red-400 hover:text-red-300 text-sm px-2 flex-shrink-0">
                          ✕
                        </button>
                      )}
                    </div>
                    {directionsLinks(p.value)}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addParking}
                className="mt-2 text-sm text-muted hover:text-body transition">
                + Agregar estacionamiento
              </button>
            </div>
          )}
        </section>

        {/* ── BOLETERÍA Y TICKETERA ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Boletería y ticketera</h2>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_boleteria" name="has_boleteria" className={chk}
              checked={hasBoleteria} onChange={e => setHasBoleteria(e.target.checked)} />
            <label htmlFor="has_boleteria" className="text-sm">Tiene boletería</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="boleteria_days" className={lbl}>Días de boletería</label>
              <input id="boleteria_days" name="boleteria_days" type="text" placeholder="Ej: Lun a Vie"
                defaultValue={t.boleteria_days ?? ''} disabled={!hasBoleteria} className={inp(!hasBoleteria)} />
            </div>
            <div>
              <label htmlFor="boleteria_hours" className={lbl}>Horario de boletería</label>
              <input id="boleteria_hours" name="boleteria_hours" type="text" placeholder="Ej: 10 a 18hs"
                defaultValue={t.boleteria_hours ?? ''} disabled={!hasBoleteria} className={inp(!hasBoleteria)} />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="needs_physical_tickets" name="needs_physical_tickets" className={chk}
              defaultChecked={t.needs_physical_tickets ?? false} />
            <label htmlFor="needs_physical_tickets" className="text-sm">Hay que mandar entradas físicas</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="own_ticketera_allowed" name="own_ticketera_allowed" className={chk}
              checked={ownTicketera} onChange={e => setOwnTicketera(e.target.checked)} />
            <label htmlFor="own_ticketera_allowed" className="text-sm">Podemos usar ticketera propia</label>
          </div>

          <div>
            <label htmlFor="ticketera_name" className={lbl}>Nombre de la ticketera del teatro</label>
            <input id="ticketera_name" name="ticketera_name" type="text"
              defaultValue={t.ticketera_name ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ticketera_iibb" className={lbl}>% IIBB</label>
              <input id="ticketera_iibb" name="ticketera_iibb" type="number" step="0.01" min="0"
                defaultValue={t.ticketera_credit_card_pct ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
            </div>
            <div>
              <label htmlFor="ticketera_aadet" className={lbl}>% AADET</label>
              <input id="ticketera_aadet" name="ticketera_aadet" type="number" step="0.01" min="0"
                defaultValue={t.ticketera_debit_card_pct ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ticketera_credit_card_pct" className={lbl}>% tarjeta de crédito</label>
              <input id="ticketera_credit_card_pct" name="ticketera_credit_card_pct" type="number" step="0.01" min="0"
                defaultValue={t.ticketera_credit_card_pct ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
            </div>
            <div>
              <label htmlFor="ticketera_debit_card_pct" className={lbl}>% tarjeta de débito</label>
              <input id="ticketera_debit_card_pct" name="ticketera_debit_card_pct" type="number" step="0.01" min="0"
                defaultValue={t.ticketera_debit_card_pct ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
            </div>
          </div>

          <div>
            <label htmlFor="ticketera_banking_costs" className={lbl}>Gastos bancarios</label>
            <input id="ticketera_banking_costs" name="ticketera_banking_costs" type="text"
              defaultValue={t.ticketera_banking_costs ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
          </div>

          <div>
            <label htmlFor="ticketera_ticketing_cost" className={lbl}>Costo de ticketing</label>
            <input id="ticketera_ticketing_cost" name="ticketera_ticketing_cost" type="text"
              defaultValue={t.ticketera_ticketing_cost ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
          </div>

          <div>
            <label htmlFor="other_retentions" className={lbl}>Otras retenciones o gastos</label>
            <textarea id="other_retentions" name="other_retentions" rows={2}
              defaultValue={t.other_retentions ?? ''} disabled={ownTicketera} className={inp(ownTicketera)} />
          </div>
        </section>

        {/* ── TÉCNICA ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Técnica</h2>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_own_sound" name="has_own_sound" className={chk} defaultChecked={t.has_own_sound ?? false} />
            <label htmlFor="has_own_sound" className="text-sm">Tiene sonido propio</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_own_lights" name="has_own_lights" className={chk} defaultChecked={t.has_own_lights ?? false} />
            <label htmlFor="has_own_lights" className="text-sm">Tiene luces propias</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_projector" name="has_projector" className={chk} defaultChecked={t.has_projector ?? false} />
            <label htmlFor="has_projector" className="text-sm">Tiene proyector</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_screen" name="has_screen" className={chk} defaultChecked={t.has_screen ?? false} />
            <label htmlFor="has_screen" className="text-sm">Tiene pantalla</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_banqueta" name="has_banqueta" className={chk} defaultChecked={t.has_banqueta ?? false} />
            <label htmlFor="has_banqueta" className="text-sm">Tiene banqueta en escenario</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_ac" name="has_ac" className={chk} defaultChecked={t.has_ac ?? false} />
            <label htmlFor="has_ac" className="text-sm">Tiene aire acondicionado</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_operator" name="has_operator" className={chk}
              checked={hasOperator} onChange={e => setHasOperator(e.target.checked)} />
            <label htmlFor="has_operator" className="text-sm">Tiene operador de sonido/luces</label>
          </div>

          {hasOperator && (
            <>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="operator_included" name="operator_included" className={chk} defaultChecked={t.operator_included ?? false} />
                <label htmlFor="operator_included" className="text-sm">Operador incluido en el arreglo</label>
              </div>
              <div>
                <label htmlFor="operator_cost" className={lbl}>Costo del operador (si no está incluido)</label>
                <input id="operator_cost" name="operator_cost" type="number" step="0.01" min="0"
                  defaultValue={t.operator_cost ?? ''} className={inp(false)} />
              </div>
            </>
          )}

          <div>
            <label htmlFor="technician_names" className={lbl}>Nombre/s del técnico/s de sala</label>
            <input id="technician_names" name="technician_names" type="text" defaultValue={t.technician_names ?? ''} className={inp(false)} />
          </div>

          <div>
            <label htmlFor="technician_contacts" className={lbl}>Contacto/s del técnico/s</label>
            <input id="technician_contacts" name="technician_contacts" type="tel" placeholder="+54 9 11 2345-6789"
              defaultValue={t.technician_contacts ?? ''} className={inp(false)} />
            <p className="text-xs text-faint mt-1">{phoneHint}</p>
          </div>

          <div>
            <label htmlFor="rider_url" className={lbl}>Rider técnico (URL o link)</label>
            <input id="rider_url" name="rider_url" type="text" defaultValue={t.rider_url ?? ''} className={inp(false)} />
          </div>
        </section>

        {/* ── CAMARINES ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Camarines</h2>

          <div>
            <label htmlFor="dressing_rooms_count" className={lbl}>Cantidad de camarines</label>
            <input id="dressing_rooms_count" name="dressing_rooms_count" type="number" min="0"
              defaultValue={t.dressing_rooms_count ?? 0} className={inp(false)} />
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="dressing_room_has_bathroom" name="dressing_room_has_bathroom" className={chk}
              defaultChecked={t.dressing_room_has_bathroom ?? false} />
            <label htmlFor="dressing_room_has_bathroom" className="text-sm">Tienen baño</label>
          </div>
        </section>

        {/* ── CONTACTOS ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Contactos</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="programmer_name" className={lbl}>Nombre del programador</label>
              <input id="programmer_name" name="programmer_name" type="text" defaultValue={t.programmer_name ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="programmer_contact" className={lbl}>Contacto del programador</label>
              <input id="programmer_contact" name="programmer_contact" type="tel" placeholder="+54 9 11 2345-6789"
                defaultValue={t.programmer_contact ?? ''} className={inp(false)} />
            </div>
          </div>
          <p className="text-xs text-faint -mt-2">{phoneHint}</p>

          <div>
            <label htmlFor="press_contacts" className={lbl}>Contactos de prensa y radios</label>
            <textarea id="press_contacts" name="press_contacts" rows={2} defaultValue={t.press_contacts ?? ''}
              placeholder="Nombre y teléfono con código de país. Uno por línea." className={inp(false)} />
            <p className="text-xs text-faint mt-1">Si son varios, poné uno por línea, con el teléfono con código de país.</p>
          </div>
        </section>

        {/* ── CARTELERÍA ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Cartelería</h2>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="allows_door_poster" name="allows_door_poster" className={chk}
              checked={allowsDoorPoster} onChange={e => setAllowsDoorPoster(e.target.checked)} />
            <label htmlFor="allows_door_poster" className="text-sm">Se puede poner cartel en puerta o vinilo</label>
          </div>

          <div>
            <label htmlFor="poster_dimensions" className={lbl}>Medidas del cartel/vinilo</label>
            <input id="poster_dimensions" name="poster_dimensions" type="text"
              defaultValue={t.poster_dimensions ?? ''} disabled={!allowsDoorPoster} className={inp(!allowsDoorPoster)} />
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="allows_street_posters" name="allows_street_posters" className={chk}
              checked={allowsStreetPosters} onChange={e => setAllowsStreetPosters(e.target.checked)} />
            <label htmlFor="allows_street_posters" className="text-sm">Se puede hacer pegatina de carteles en la calle</label>
          </div>

          <div>
            <label htmlFor="street_poster_contact" className={lbl}>Contacto para pegatina de carteles</label>
            <input id="street_poster_contact" name="street_poster_contact" type="tel" placeholder="+54 9 11 2345-6789"
              defaultValue={t.street_poster_contact ?? ''} disabled={!allowsStreetPosters} className={inp(!allowsStreetPosters)} />
            {allowsStreetPosters && <p className="text-xs text-faint mt-1">{phoneHint}</p>}
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="requires_theater_logo" name="requires_theater_logo" className={chk}
              checked={requiresTheaterLogo} onChange={e => setRequiresTheaterLogo(e.target.checked)} />
            <label htmlFor="requires_theater_logo" className="text-sm">Hay que agregar logo del teatro en las piezas</label>
          </div>

          {requiresTheaterLogo && (
            <div>
              <label htmlFor="theater_logo_url" className={lbl}>Link al logo del teatro</label>
              <input id="theater_logo_url" name="theater_logo_url" type="url"
                defaultValue={t.theater_logo_url ?? ''} className={inp(false)} />
              <p className="text-xs text-faint mt-1">Preferentemente en formato PNG con fondo transparente.</p>
            </div>
          )}
        </section>

        {/* ── ACUERDO ECONÓMICO ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Acuerdo económico</h2>

          <div>
            <label htmlFor="deal_type" className={lbl}>Tipo de arreglo</label>
            <select id="deal_type" name="deal_type" value={dealType}
              onChange={e => setDealType(e.target.value)}
              className={inp(false)}>
              <option value="">— Seleccioná —</option>
              <option value="fixed">Fijo</option>
              <option value="percentage">Porcentaje</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="deal_fixed_amount" className={lbl}>Monto fijo ($)</label>
              <input id="deal_fixed_amount" name="deal_fixed_amount" type="number" step="0.01" min="0"
                defaultValue={t.deal_fixed_amount ?? ''} disabled={dealType !== 'fixed'} className={inp(dealType !== 'fixed')} />
            </div>
            <div>
              <label htmlFor="deal_percentage" className={lbl}>Porcentaje (%)</label>
              <input id="deal_percentage" name="deal_percentage" type="number" step="0.01" min="0" max="100"
                defaultValue={t.deal_percentage ?? ''} disabled={dealType !== 'percentage'} className={inp(dealType !== 'percentage')} />
            </div>
          </div>

          <div>
            <label htmlFor="deal_includes" className={lbl}>¿Qué incluye su parte?</label>
            <textarea id="deal_includes" name="deal_includes" rows={2} defaultValue={t.deal_includes ?? ''} className={inp(false)} />
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_coproducer" name="has_coproducer" className={chk}
              checked={hasCoproducer} onChange={e => setHasCoproducer(e.target.checked)} />
            <label htmlFor="has_coproducer" className="text-sm">Hay coproductor</label>
          </div>

          {hasCoproducer && (
            <div>
              <label htmlFor="coproducer_deal" className={lbl}>Arreglo con el coproductor</label>
              <textarea id="coproducer_deal" name="coproducer_deal" rows={2} defaultValue={t.coproducer_deal ?? ''} className={inp(false)} />
            </div>
          )}

          <div className="flex items-start gap-2">
            <input type="checkbox" id="requires_art_insurance" name="requires_art_insurance" className={chk}
              defaultChecked={t.requires_art_insurance ?? false} />
            <label htmlFor="requires_art_insurance" className="text-sm">Hay que sacar seguro ART</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="passes_argentores" name="passes_argentores" className={chk}
              defaultChecked={t.passes_argentores ?? true} />
            <label htmlFor="passes_argentores" className="text-sm">Pasan Argentores</label>
          </div>

          <div>
            <label htmlFor="municipal_taxes" className={lbl}>Impuestos municipales o provinciales</label>
            <input id="municipal_taxes" name="municipal_taxes" type="text" defaultValue={t.municipal_taxes ?? ''} className={inp(false)} />
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="bdx_hotel" name="bdx_hotel" className={chk} defaultChecked={t.bdx_hotel ?? false} />
            <label htmlFor="bdx_hotel" className="text-sm">BDX hotel</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="bdx_transport" name="bdx_transport" className={chk} defaultChecked={t.bdx_transport ?? false} />
            <label htmlFor="bdx_transport" className="text-sm">BDX pasajes aéreos</label>
          </div>

          <div>
            <label htmlFor="bdx_other" className={lbl}>Otros gastos BDX</label>
            <input id="bdx_other" name="bdx_other" type="text" defaultValue={t.bdx_other ?? ''} className={inp(false)} />
          </div>
        </section>

        {/* ── EMERGENCIA Y SERVICIOS ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Emergencia y servicios</h2>

          <div>
            <label htmlFor="nearest_police_station" className={lbl}>Comisaría más cercana</label>
            <input id="nearest_police_station" name="nearest_police_station" type="text"
              value={policeAddr} onChange={e => setPoliceAddr(e.target.value)}
              placeholder="Dirección (ej: Calle 4 e/ 51 y 53, La Plata)" className={inp(false)} />
            {directionsLinks(policeAddr)}
          </div>

          <div>
            <label htmlFor="nearest_hospital" className={lbl}>Hospital más cercano</label>
            <input id="nearest_hospital" name="nearest_hospital" type="text"
              value={hospitalAddr} onChange={e => setHospitalAddr(e.target.value)}
              placeholder="Dirección del hospital" className={inp(false)} />
            {directionsLinks(hospitalAddr)}
          </div>

          <div>
            <label htmlFor="nearest_consulate" className={lbl}>Consulado más cercano</label>
            <input id="nearest_consulate" name="nearest_consulate" type="text"
              value={consulateAddr} onChange={e => setConsulateAddr(e.target.value)}
              placeholder="Dirección del consulado" className={inp(false)} />
            {directionsLinks(consulateAddr)}
          </div>

          <div>
            <label className={lbl}>Restaurantes cercanos abiertos hasta tarde</label>
            <div className="space-y-3">
              {restaurants.map((r, index) => (
                <div key={r.id} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <input
                      name={`restaurant_${index}`}
                      type="text"
                      placeholder="Dirección del restaurante"
                      value={r.value}
                      onChange={e => updateRestaurant(r.id, e.target.value)}
                      className={inp(false)}
                    />
                    {restaurants.length > 1 && (
                      <button type="button" onClick={() => removeRestaurant(r.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 flex-shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                  {directionsLinks(r.value)}
                </div>
              ))}
            </div>
            <button type="button" onClick={addRestaurant}
              className="mt-2 text-sm text-muted hover:text-body transition">
              + Agregar restaurante
            </button>
          </div>
        </section>

        {/* ── FOTOS ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Fotos del teatro</h2>
          <p className="text-xs text-muted">Opcionales. Podés subir varias por categoría.</p>
          {renderPhotoGroup('Fachada', 'facade_photo_', facadePhotos, setFacadePhotos)}
          {renderPhotoGroup('Sala', 'hall_photo_', hallPhotos, setHallPhotos)}
          {renderPhotoGroup('Camarines', 'dressing_photo_', dressingPhotos, setDressingPhotos)}
        </section>

        {/* ── NOTAS ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">Notas internas</h2>
          <p className="text-xs text-muted">Solo visible para el equipo.</p>
          <textarea id="notes" name="notes" rows={3} defaultValue={t.notes ?? ''} className={inp(false)} />
          <div className="flex items-start gap-2">
            <input type="checkbox" id="is_active" name="is_active" className={chk} defaultChecked={t.is_active ?? true} />
            <label htmlFor="is_active" className="text-sm">Teatro activo</label>
          </div>
        </section>

        {/* ── BOTONES ── */}
        <div className="flex gap-3 justify-end">
          <Link href="/theaters"
            className="px-4 py-2 border border-line text-body rounded-md hover:bg-surface-2 transition">
            Cancelar
          </Link>
          <button type="submit"
            className="px-6 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">
            {mode === 'new' ? 'Guardar teatro' : 'Guardar cambios'}
          </button>
        </div>

      </form>
    </>
  )
}