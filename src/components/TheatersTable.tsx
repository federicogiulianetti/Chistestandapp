'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import CountryFlag from '@/components/CountryFlag'

interface TheaterRow {
  id: string
  name: string | null
  city: string | null
  province: string | null
  country: string | null
  capacity_platea: number | null
  is_active: boolean | null
  deal_type: string | null
  deal_fixed_amount: number | null
  deal_percentage: number | null
}

export default function TheatersTable({
  theaters,
  canManage,
}: {
  theaters: TheaterRow[]
  canManage: boolean
}) {
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [minCapacity, setMinCapacity] = useState('')

  // Opciones para los desplegables
  const provinces = useMemo(
    () => Array.from(new Set(theaters.map(t => t.province).filter((p): p is string => !!p))).sort(),
    [theaters]
  )
  const cities = useMemo(
    () => Array.from(new Set(theaters.map(t => t.city).filter((c): c is string => !!c))).sort(),
    [theaters]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = minCapacity ? Number(minCapacity) : null
    return theaters.filter(t => {
      if (q) {
        const hay = `${t.name ?? ''} ${t.city ?? ''} ${t.province ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (province && t.province !== province) return false
      if (city && t.city !== city) return false
      if (min != null && (t.capacity_platea ?? 0) < min) return false
      return true
    })
  }, [theaters, search, province, city, minCapacity])

  const arregloOf = (t: TheaterRow) =>
    t.deal_type === 'fixed'
      ? `Fijo $${t.deal_fixed_amount?.toLocaleString('es-AR') ?? '?'}`
      : t.deal_type === 'percentage'
      ? `${t.deal_percentage ?? '?'}%`
      : '—'

  const fieldCls = "bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
  const hasFilters = search || province || city || minCapacity

  return (
    <div>
      {/* Filtros */}
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
        <input
          type="number"
          min="0"
          value={minCapacity}
          onChange={e => setMinCapacity(e.target.value)}
          placeholder="👥 Capacidad mín."
          className={`${fieldCls} w-40`}
        />
        {hasFilters && (
          <button type="button" onClick={() => { setSearch(''); setProvince(''); setCity(''); setMinCapacity('') }}
            className="text-sm text-gray-400 hover:text-white px-2">
            Limpiar filtros
          </button>
        )}
      </div>

      <p className="text-gray-400 text-sm mb-3">
        {filtered.length} {filtered.length === 1 ? 'teatro' : 'teatros'}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-gray-400">No hay teatros que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Teatro</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">País</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Provincia</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Ciudad</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Capacidad</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Arreglo</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Estado</th>
                <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{t.name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap"><CountryFlag country={t.country} /></td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{t.province || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{t.city || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{t.capacity_platea ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{arregloOf(t)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {t.is_active ? (
                      <span className="inline-block bg-green-900/40 text-green-300 px-2 py-1 rounded text-xs">Activo</span>
                    ) : (
                      <span className="inline-block bg-zinc-800 text-gray-400 px-2 py-1 rounded text-xs">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex gap-3 justify-end">
                      <Link href={`/theaters/${t.id}/ver`} className="text-blue-400 hover:underline text-sm">Ver</Link>
                      {canManage && (
                        <Link href={`/theaters/${t.id}`} className="text-white hover:underline text-sm">Editar</Link>
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