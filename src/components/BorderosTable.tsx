'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { fmt } from '@/lib/accounts'

export type BorderoRow = {
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
  productora_share: number
}

const MAX = 300

function fechaCorta(f: string | null): string {
  if (!f) return '—'
  const d = f.slice(0, 10) // YYYY-MM-DD
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}

export default function BorderosTable({ rows }: { rows: BorderoRow[] }) {
  const [q, setQ] = useState('')
  const [year, setYear] = useState('')
  const [quien, setQuien] = useState('')

  const years = useMemo(
    () => [...new Set(rows.map(r => r.fecha?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(),
    [rows],
  )
  const comedianes = useMemo(
    () => [...new Set(rows.map(r => r.comediante).filter(x => x && x !== '—'))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return rows
      .filter(r => {
        if (year && r.fecha?.slice(0, 4) !== year) return false
        if (quien && r.comediante !== quien) return false
        if (qq) {
          const hay = `${r.comediante} ${r.teatro ?? ''} ${r.ciudad ?? ''} ${r.espectaculo ?? ''}`.toLowerCase()
          if (!hay.includes(qq)) return false
        }
        return true
      })
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  }, [rows, q, year, quien])

  const shown = filtered.slice(0, MAX)
  const sel = 'px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:border-zinc-500'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por comediante, teatro, ciudad o espectáculo…"
          className={`${sel} flex-1 min-w-[240px]`}
        />
        <select value={quien} onChange={e => setQuien(e.target.value)} className={sel}>
          <option value="">Todos los comedianes</option>
          {comedianes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} className={sel}>
          <option value="">Todos los años</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} borderó{filtered.length === 1 ? '' : 's'}
        {filtered.length > MAX && ` · mostrando los ${MAX} más recientes (afiná con los filtros)`}
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/50 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Fecha</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Comediante</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Teatro / Ciudad</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Recaudación</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Artista</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Productora</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-sm whitespace-nowrap">{fechaCorta(r.fecha)}</td>
                <td className="px-4 py-3 text-sm">
                  {r.comediante}
                  {r.espectaculo && <span className="block text-xs text-gray-500">{r.espectaculo}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {r.teatro ?? '—'}
                  {r.ciudad && <span className="block text-xs text-gray-500">{r.ciudad}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-300">{fmt(r.recaudacion, r.currency)}</td>
                <td className="px-4 py-3 text-sm text-right text-green-300 font-medium">{fmt(r.artista_final, r.currency)}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-400">{fmt(r.productora_share, r.currency)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/shows/${r.show_id}/bordero`} className="text-indigo-300 hover:text-indigo-200 text-sm whitespace-nowrap">Ver →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
