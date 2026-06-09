'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import MapPreview from './MapPreview'
import { loadGoogleMaps } from '@/lib/googleMaps'

export interface HotelPreference {
  comedian_id: string
  notes?: string | null
  is_favorite?: boolean
}

export interface HotelData {
  id?: string
  name?: string
  address?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  maps_url?: string | null
  phone?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  email?: string | null
  website_url?: string | null
  price_notes?: string | null
  breakfast_included?: boolean
  checkin_time?: string | null
  checkout_time?: string | null
  has_canje?: boolean
  canje_details?: string | null
  notes?: string | null
  is_active?: boolean
  preferences?: HotelPreference[]
}

export interface ComedianOption {
  id: string
  label: string
}

interface PrefRow {
  id: number
  comedian_id: string
  notes: string
  is_favorite: boolean
}

interface HotelFormProps {
  action: (formData: FormData) => void | Promise<void>
  deleteAction?: (formData: FormData) => void | Promise<void>
  hotel?: HotelData
  comedians: ComedianOption[]
  mode: 'new' | 'edit'
  error?: string
}

export default function HotelForm({ action, deleteAction, hotel, comedians, mode, error }: HotelFormProps) {
  const h = hotel ?? {}

  const [mapQuery, setMapQuery] = useState(h.address ?? '')
  const [hasCanje, setHasCanje] = useState(h.has_canje ?? false)

  const initPrefs = (): PrefRow[] =>
    (h.preferences ?? []).map((p, i) => ({
      id: i + 1,
      comedian_id: p.comedian_id,
      notes: p.notes ?? '',
      is_favorite: p.is_favorite ?? false,
    }))
  const [prefs, setPrefs] = useState<PrefRow[]>(initPrefs)

  // Autocompletado Google Maps (solo en alta)
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

  const addPref = () => setPrefs(prev => [...prev, { id: Date.now(), comedian_id: '', notes: '', is_favorite: false }])
  const removePref = (id: number) => setPrefs(prev => prev.filter(p => p.id !== id))
  const updatePref = (id: number, patch: Partial<PrefRow>) =>
    setPrefs(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))

  // Estilos (mismos que TheaterForm)
  const inp = (disabled: boolean) =>
    `w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 transition ${
      disabled ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-zinc-800 text-white'
    }`
  const sec = 'bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4'
  const lbl = 'block text-sm mb-1'
  const chk = 'mt-0.5'
  const phoneHint = 'Con código de país (ej: +54 9 11 2345-6789)'

  return (
    <>
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {mode === 'edit' && deleteAction && (
        <form action={deleteAction} className="mb-4 flex justify-end">
          <button
            type="submit"
            onClick={(e) => {
              if (!window.confirm('¿Seguro que querés eliminar este hotel? Se va a la papelera.')) e.preventDefault()
            }}
            className="px-4 py-2 border border-red-700 text-red-400 rounded-md hover:bg-red-900/30 transition text-sm"
          >
            Eliminar hotel
          </button>
        </form>
      )}

      <form action={action} className="space-y-6">

        {/* ── DATOS GENERALES ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">🏨 Datos generales</h2>

          <div>
            <label htmlFor="name" className={lbl}>
              🏨 Nombre del hotel <span className="text-red-400">*</span>
            </label>
            <input
              ref={mode === 'new' ? nameInputRef : undefined}
              id="name" name="name" type="text" required
              defaultValue={h.name ?? ''}
              placeholder={mode === 'new' ? 'Buscá el nombre del hotel...' : ''}
              className={inp(false)}
            />
            {mode === 'new' && (
              <p className="text-xs text-gray-500 mt-1">Escribí el nombre y seleccioná de las sugerencias para completar dirección, ciudad y provincia automáticamente.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className={lbl}>🏙️ Ciudad</label>
              <input ref={mode === 'new' ? cityRef : undefined} id="city" name="city" type="text" defaultValue={h.city ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="province" className={lbl}>🗺️ Provincia</label>
              <input ref={mode === 'new' ? provinceRef : undefined} id="province" name="province" type="text" defaultValue={h.province ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="country" className={lbl}>🌎 País</label>
              <input ref={mode === 'new' ? countryRef : undefined} id="country" name="country" type="text" defaultValue={h.country ?? 'Argentina'} className={inp(false)} />
            </div>
          </div>

          <div>
            <label htmlFor="address" className={lbl}>📍 Dirección</label>
            <input ref={mode === 'new' ? addressRef : undefined} id="address" name="address" type="text" defaultValue={h.address ?? ''} onBlur={e => setMapQuery(e.target.value)} className={inp(false)} />
          </div>

          <div>
            <label htmlFor="maps_url" className={lbl}>🔗 Link a Google Maps</label>
            <input ref={mode === 'new' ? mapsUrlRef : undefined} id="maps_url" name="maps_url" type="url" defaultValue={h.maps_url ?? ''} className={inp(false)} />
          </div>

          <div>
            <label className={lbl}>🗺️ Ubicación en el mapa</label>
            <MapPreview query={mapQuery} />
            {!mapQuery && <p className="text-xs text-gray-500 mt-1">El mapa aparece cuando cargás la dirección.</p>}
          </div>
        </section>

        {/* ── CONTACTO ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">📞 Contacto</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact_name" className={lbl}>🧑‍💼 Nombre de contacto</label>
              <input id="contact_name" name="contact_name" type="text" defaultValue={h.contact_name ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="contact_phone" className={lbl}>📱 Teléfono de contacto</label>
              <input id="contact_phone" name="contact_phone" type="tel" placeholder="+54 9 11 2345-6789" defaultValue={h.contact_phone ?? ''} className={inp(false)} />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">{phoneHint}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className={lbl}>☎️ Teléfono del hotel</label>
              <input id="phone" name="phone" type="tel" defaultValue={h.phone ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="email" className={lbl}>✉️ Email</label>
              <input id="email" name="email" type="email" defaultValue={h.email ?? ''} className={inp(false)} />
            </div>
          </div>

          <div>
            <label htmlFor="website_url" className={lbl}>🌐 Sitio web</label>
            <input id="website_url" name="website_url" type="url" defaultValue={h.website_url ?? ''} className={inp(false)} />
          </div>
        </section>

        {/* ── TARIFAS Y CANJE ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">💰 Tarifas y canje</h2>

          <div>
            <label htmlFor="price_notes" className={lbl}>💵 Notas de tarifas</label>
            <textarea id="price_notes" name="price_notes" rows={2} placeholder="Ej: $X la noche, descuento por 2+ noches..." defaultValue={h.price_notes ?? ''} className={inp(false)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkin_time" className={lbl}>🕒 Check-in</label>
              <input id="checkin_time" name="checkin_time" type="text" placeholder="Ej: 14:00" defaultValue={h.checkin_time ?? ''} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="checkout_time" className={lbl}>🕙 Check-out</label>
              <input id="checkout_time" name="checkout_time" type="text" placeholder="Ej: 10:00" defaultValue={h.checkout_time ?? ''} className={inp(false)} />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="breakfast_included" name="breakfast_included" className={chk} defaultChecked={h.breakfast_included ?? false} />
            <label htmlFor="breakfast_included" className="text-sm">🍳 Desayuno incluido</label>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="has_canje" name="has_canje" className={chk}
              checked={hasCanje} onChange={e => setHasCanje(e.target.checked)} />
            <label htmlFor="has_canje" className="text-sm">🤝 Hay canje</label>
          </div>

          <div>
            <label htmlFor="canje_details" className={lbl}>📄 Detalle del canje</label>
            <textarea id="canje_details" name="canje_details" rows={2} placeholder="Qué se da a cambio del alojamiento (menciones, entradas, etc.)"
              defaultValue={h.canje_details ?? ''} disabled={!hasCanje} className={inp(!hasCanje)} />
          </div>
        </section>

        {/* ── PREFERENCIAS DE COMEDIANTES ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">🌟 Preferencias de comediantes</h2>
          <p className="text-xs text-gray-400">Qué comediantes prefieren este hotel y sus pedidos particulares.</p>

          <div className="space-y-4">
            {prefs.map((p, index) => (
              <div key={p.id} className="border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex gap-2 items-center">
                  <select
                    name={`pref_comedian_${index}`}
                    value={p.comedian_id}
                    onChange={e => updatePref(p.id, { comedian_id: e.target.value })}
                    className={inp(false)}
                  >
                    <option value="">— Seleccioná comediante —</option>
                    {comedians.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <button type="button" onClick={() => removePref(p.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2 flex-shrink-0">✕</button>
                </div>
                <input
                  name={`pref_notes_${index}`}
                  type="text"
                  placeholder="Preferencias (ej: piso alto, lejos del ascensor, cama king)"
                  value={p.notes}
                  onChange={e => updatePref(p.id, { notes: e.target.value })}
                  className={inp(false)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`pref_favorite_${index}`} className={chk}
                    checked={p.is_favorite} onChange={e => updatePref(p.id, { is_favorite: e.target.checked })} />
                  ⭐ Es su hotel preferido en esta ciudad
                </label>
              </div>
            ))}
          </div>

          <button type="button" onClick={addPref} className="text-sm text-gray-400 hover:text-white transition">
            + Agregar preferencia de comediante
          </button>
        </section>

        {/* ── NOTAS ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">📝 Notas internas</h2>
          <p className="text-xs text-gray-400">Solo visible para el equipo.</p>
          <textarea id="notes" name="notes" rows={3} defaultValue={h.notes ?? ''} className={inp(false)} />
          <div className="flex items-start gap-2">
            <input type="checkbox" id="is_active" name="is_active" className={chk} defaultChecked={h.is_active ?? true} />
            <label htmlFor="is_active" className="text-sm">✅ Hotel activo</label>
          </div>
        </section>

        {/* ── BOTONES ── */}
        <div className="flex gap-3 justify-end">
          <Link href="/hotels" className="px-4 py-2 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition">
            Cancelar
          </Link>
          <button type="submit" className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">
            {mode === 'new' ? 'Guardar hotel' : 'Guardar cambios'}
          </button>
        </div>

      </form>
    </>
  )
}
