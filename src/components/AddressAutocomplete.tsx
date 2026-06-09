'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/googleMaps'

interface AddressAutocompleteProps {
  onSelect: (data: {
    address: string
    city: string
    country: string
    mapsUrl: string
  }) => void
  defaultValue?: string
  disabled?: boolean
}

export default function AddressAutocomplete({
  onSelect,
  defaultValue = '',
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (!inputRef.current || disabled) return
    let cancelled = false

    loadGoogleMaps().then(() => { if (!cancelled) initAutocomplete() }).catch(() => {})
    return () => { cancelled = true }

    function initAutocomplete() {
      if (cancelled || !inputRef.current || !window.google) return

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['formatted_address', 'address_components', 'url', 'name'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place) return

        let city = ''
        let country = ''

        place.address_components?.forEach((component: google.maps.GeocoderAddressComponent) => {
          if (component.types.includes('locality')) {
            city = component.long_name
          }
          if (component.types.includes('administrative_area_level_1') && !city) {
            city = component.long_name
          }
          if (component.types.includes('country')) {
            country = component.long_name
          }
        })

        const address = place.formatted_address ?? inputRef.current?.value ?? ''
        setValue(address)

        const mapsUrl = place.url ?? `https://maps.google.com/?q=${encodeURIComponent(address)}`

        onSelect({ address, city, country, mapsUrl })
      })
    }
  }, [disabled, onSelect])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      disabled={disabled}
      placeholder="Buscá el nombre o dirección del teatro..."
      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 disabled:opacity-70"
    />
  )
}
