'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatShowDate, statusMeta, SHOW_STATUSES, type ShowStatus } from '@/lib/shows'

export interface ShowRow {
  id: string
  show_date: string | null
  status: string | null
  city: string | null
  performer_type: string | null
  comedian: { stage_name: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null } | null
}

function performerName(show: ShowRow): string {
  if (show.performer_type === 'elenco') return show.ensemble?.name ?? '—'
  return show.comedian?.stage_name ?? '—'
}

// "YYYY-MM-DD" del show, en hora de Argentina, para comparar con los inputs de fecha
function showDateKey(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

const STATUS_KEYS = Object.keys(SHOW_STATUSES) as ShowStatus[]

export default function ShowsTable({ shows, canManage }: { shows: ShowRow[]; canManage: boolean }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')
  const [performerType, setPerformerType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const cities = useMemo(
    () => Array.from(new Set(shows.map(s => s.city).filter((c): c is string => !!c))).sort(),
    [shows]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return shows.filter(s => {
      if (q) {
        const hay = `${performerName(s)} ${s.theater?.name ?? ''} ${s.city ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (status && s.status !== status) return false
      if (city && s.city !== city) return false
      if (performerType && s.performer_type !== performerType) return false
      const key = showDateKey(s.show_date)
      if (from && key && key < from) return false
      if (to && key && key > to) return false
      return true
    })
  }, [shows, search, status, city, performerType, from, to])

  const fieldCls = "bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
  const hasFilters = search || status || city || performerType || from || to

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔎 Buscar por artista, teatro o ciudad..."
          className={`${fieldCls} flex-1 min-w-[220px]`}
        />
        <select value={status} onChange={e => setStatus(e.target.value)} className={fieldCls}>
          <option value="">🚦 Estado (todos)</option>
          {STATUS_KEYS.map(k => <option key={k} value={k}>{SHOW_STATUSES[k].label}</option>)}
        </select>
        <select value={city} onChange={e => setCity(e.target.value)} className={fieldCls}>
          <option value="">🏙️ Ciudad (todas)</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={performerType} onChange={e => setPerformerType(e.target.value)} className={fieldCls}>
          <option value="">🎤 Artista (todos)</option>
          <option value="comedian">Comediantes</option>
          <option value="elenco">Elencos</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          Desde
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          Hasta
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={fieldCls} />
        </label>
        {hasFilters && (
          <button type="button" onClick={() => { setSearch(''); setStatus(''); setCity(''); setPerformerType(''); setFrom(''); setTo('') }}
            className="text-sm text-gray-400 hover:text-white px-2">
            Limpiar filtros
          </button>
        )}
      </div>

      <p className="text-gray-400 text-sm mb-3">
        {filtered.length} {filtered.length === 1 ? 'fecha' : 'fechas'}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-gray-400">No hay fechas que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Artista</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Teatro</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Ciudad</th>
                <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Estado</th>
                <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((show) => {
                const st = statusMeta(show.status)
                return (
                  <tr key={show.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatShowDate(show.show_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{show.performer_type === 'elenco' ? '🎭' : '🎤'}</span>
                        <span className="font-medium">{performerName(show)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{show.theater?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{show.city || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${st.badge}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex gap-3 justify-end">
                        <Link href={`/shows/${show.id}/ver`} className="text-blue-400 hover:underline text-sm">
                          Ver
                        </Link>
                        {canManage && (
                          <Link href={`/shows/${show.id}`} className="text-white hover:underline text-sm">
                            Editar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
