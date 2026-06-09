'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import CountryFlag from '@/components/CountryFlag'

export interface HotelRow {
  id: string
  name: string | null
  city: string | null
  province: string | null
  country: string | null
  has_canje: boolean | null
  is_active: boolean | null
  pref_count: number
}

export default function HotelsTable({ hotels, canManage }: { hotels: HotelRow[]; canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [onlyCanje, setOnlyCanje] = useState(false)

  const provinces = useMemo(
    () => Array.from(new Set(hotels.map(h => h.province).filter((p): p is string => !!p))).sort(),
    [hotels]
  )
  const cities = useMemo(
    () => Array.from(new Set(hotels.map(h => h.city).filter((c): c is string => !!c))).sort(),
    [hotels]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return hotels.filter(h => {
      if (q) {
        const hay = `${h.name ?? ''} ${h.city ?? ''} ${h.province ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (province && h.province !== province) return false
      if (city && h.city !== city) return false
      if (onlyCanje && !h.has_canje) return false
      return true
    })
  }, [hotels, search, province, city, onlyCanje])

  const fieldCls = "bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
  const hasFilters = search || province || city || onlyCanje

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔎 Buscar por nombre, ciudad o provincia..."
          className={`${fieldCls} flex-1 min-w-[220px]`}
        />
        <select value={province} onChange={e => setProvince(e.target.value)} className={fieldCls}>
          <option value="">🗺️ Provincia (todas)</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={city} onChange={e => setCity(e.target.value)} className={fieldCls}>
          <option value="">🏙️ Ciudad (todas)</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-300 px-2">
          <input type="checkbox" checked={onlyCanje} onChange={e => setOnlyCanje(e.target.checked)} />
          🤝 Solo con canje
        </label>
        {hasFilters && (
          <button type="button" onClick={() => { setSearch(''); setProvince(''); setCity(''); setOnlyCanje(false) }}
            className="text-sm text-gray-400 hover:text-white px-2">
            Limpiar filtros
          </button>
        )}
      </div>

      <p className="text-gray-400 text-sm mb-3">
        {filtered.length} {filtered.length === 1 ? 'hotel' : 'hoteles'}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-gray-400">No hay hoteles que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Hotel</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">País</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Provincia</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Ciudad</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Canje</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Preferencias</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Estado</th>
                <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{h.name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap"><CountryFlag country={h.country} /></td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{h.province || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{h.city || '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{h.has_canje ? '🤝 Sí' : '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{h.pref_count > 0 ? `🌟 ${h.pref_count}` : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {h.is_active ? (
                      <span className="inline-block bg-green-900/40 text-green-300 px-2 py-1 rounded text-xs">Activo</span>
                    ) : (
                      <span className="inline-block bg-zinc-800 text-gray-400 px-2 py-1 rounded text-xs">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex gap-3 justify-end">
                      <Link href={`/hotels/${h.id}/ver`} className="text-blue-400 hover:underline text-sm">Ver</Link>
                      {canManage && (
                        <Link href={`/hotels/${h.id}`} className="text-white hover:underline text-sm">Editar</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
