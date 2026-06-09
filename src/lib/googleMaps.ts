// Loader único (singleton) del script de Google Maps JavaScript API.
// Evita que se incluya el script más de una vez (React doble-monta efectos en dev,
// y puede haber varios componentes que lo necesiten en la misma página).

let mapsPromise: Promise<typeof google> | null = null

const SCRIPT_ID = 'google-maps-js-api'

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps solo se puede cargar en el browser'))
  }

  // Ya está disponible
  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }

  // Ya se está cargando: reutilizamos la misma promesa
  if (mapsPromise) return mapsPromise

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'))
  }

  mapsPromise = new Promise<typeof google>((resolve, reject) => {
    // Si ya existe el tag (por una carga previa), nos colgamos de su load
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => resolve(window.google)
    script.onerror = () => {
      mapsPromise = null // permitir reintento si falló
      reject(new Error('No se pudo cargar Google Maps'))
    }
    document.head.appendChild(script)
  })

  return mapsPromise
}
