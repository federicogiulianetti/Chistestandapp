'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { fmt } from '@/lib/accounts'

export type FechaRow = {
  id: string
  show_id: string
  fecha: string | null
  comediante: string
  teatro: string | null
  ciudad: string | null
  espectaculo: string | null
  currency: string
  recaudacion: number
  artista_final: number
}

function fechaCorta(f: string | null): string {
  if (!f) return '—'
  const d = f.slice(0, 10)
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}

export default function BorderosFechas({ rows }: { rows: FechaRow[] }) {
  const [teatro, setTeatro] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [fecha, setFecha] = useState('')

  const teatros = useMemo(() => [...new Set(rows.map(r => r.teatro).filter(Boolean) as string[])].sort(), [rows])
  const ciudades = useMemo(() => [...new Set(rows.map(r => r.ciudad).filter(Boolean) as string[])].sort(), [rows])

  const filtered = useMemo(() => {
    return rows
      .filter(r => {
        if (teatro && r.teatro !== teatro) return false
        if (ciudad && r.ciudad !== ciudad) return false
        if (fecha && !(r.fecha ?? '').includes(fecha)) return false
        return true
      })
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  }, [rows, teatro, ciudad, fecha])

  const sel = 'px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:border-zinc-500'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={teatro} onChange={e => setTeatro(e.target.value)} className={sel}>
          <option value="">Todos los teatros</option>
          {teatros.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={ciudad} onChange={e => setCiudad(e.target.value)} className={sel}>
          <option value="">Todas las ciudades</option>
          {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={fecha} onChange={e => setFecha(e.target.value)} placeholder="Buscar fecha (ej. 2024-05 o 15)" className={`${sel} flex-1 min-w-[200px]`} />
        {(teatro || ciudad || fecha) && (
          <button onClick={() => { setTeatro(''); setCiudad(''); setFecha('') }} className="px-3 py-2 text-sm text-gray-400 hover:text-white">Limpiar</button>
        )}
      </div>

      <p className="text-sm text-gray-500">{filtered.length} de {rows.length}</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/50 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Fecha</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Teatro / Ciudad</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Recaudación</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Artista</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-sm whitespace-nowrap">{fechaCorta(r.fecha)}</td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {r.teatro ?? '—'}
                  {r.ciudad && <span className="block text-xs text-gray-500">{r.ciudad}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-300">{fmt(r.recaudacion, r.currency)}</td>
                <td className="px-4 py-3 text-sm text-right text-green-300 font-medium">{fmt(r.artista_final, r.currency)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/shows/${r.show_id}/bordero`} className="text-indigo-300 hover:text-indigo-200 text-sm mr-3">Ver</Link>
                  <Link href={`/shows/${r.show_id}/bordero/print`} className="text-gray-300 hover:text-white text-sm">PDF ⬇</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
