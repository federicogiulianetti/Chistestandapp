'use client'

import { useState } from 'react'
import Link from 'next/link'
import SalesCurve from '@/components/SalesCurve'

type CurvePoint = { date: string; daily: number; cumulative: number }
export type VentaCol = {
  id: string
  theater: string
  city: string
  date: string
  sinceLabel: string
  stale: boolean
  cells: Record<string, string>
  curve: CurvePoint[]
  capacity: number
}
export type VentaGroup = { performer: string; photo: string | null; color: string; shows: VentaCol[] }

const ROWS: { key: string; label: string; strong?: boolean }[] = [
  { key: 'ticketera', label: 'Entradas Ticketera' },
  { key: 'teatro', label: 'Entradas Teatro' },
  { key: 'mitad', label: 'Entradas al 50%' },
  { key: 'invitaciones', label: 'Invitaciones' },
  { key: 'total', label: 'Entradas Total', strong: true },
  { key: 'cap', label: 'Capacidad' },
  { key: 'faltantes', label: 'Faltantes' },
  { key: 'objetivo', label: 'Objetivo' },
  { key: 'ocup', label: '% Ocupación', strong: true },
  { key: 'dias', label: 'Días faltantes' },
]

function Avatar({ name, photo, color }: { name: string; photo: string | null; color: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} className="rounded-full object-cover shrink-0" style={{ width: 36, height: 36, border: `2px solid ${color}` }} />
  }
  return (
    <span className="rounded-full flex items-center justify-center font-semibold shrink-0" style={{ width: 36, height: 36, border: `2px solid ${color}`, backgroundColor: color + '22', color, fontSize: 13 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export default function VentasBoard({ groups }: { groups: VentaGroup[] }) {
  const [open, setOpen] = useState<{ col: VentaCol; performer: string } | null>(null)

  return (
    <div className="space-y-8">
      {groups.map(g => (
        <section key={g.performer}>
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={g.performer} photo={g.photo} color={g.color} />
            <h2 className="text-lg font-semibold">{g.performer}</h2>
            <span className="text-xs text-faint">{g.shows.length} fecha{g.shows.length === 1 ? '' : 's'}</span>
          </div>

          <div className="overflow-x-auto bg-surface border border-line rounded-xl">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-2 border-b border-r border-line px-3 py-2 min-w-[150px]"> </th>
                  {g.shows.map(s => (
                    <th key={s.id} className="border-b border-line p-0 min-w-[130px] align-top" style={{ borderTop: `2px solid ${g.color}` }}>
                      <Link href={`/shows/${s.id}/ventas`} className="block px-3 py-2 text-center hover:bg-surface-2 transition-colors">
                        <div className="text-[13px] font-semibold text-body truncate">{s.theater}</div>
                        <div className="text-[11px] text-faint">{s.city ? `${s.city} · ` : ''}{s.date}</div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] text-muted text-center">Última actualización</td>
                  {g.shows.map(s => (
                    <td key={s.id} className="border-b border-line px-3 py-2 text-center">
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${s.stale ? 'bg-amber-900/30 text-amber-300' : 'bg-surface text-faint'}`}>{s.sinceLabel}</span>
                    </td>
                  ))}
                </tr>
                {ROWS.map(row => (
                  <tr key={row.key}>
                    <td className={`sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] text-center ${row.strong ? 'font-semibold text-body' : 'text-muted'}`}>{row.label}</td>
                    {g.shows.map(s => (
                      <td key={s.id} className={`border-b border-line px-3 py-2 text-center text-[13px] tabular-nums ${row.strong ? 'font-bold text-body' : 'text-muted'}`}>{s.cells[row.key]}</td>
                    ))}
                  </tr>
                ))}
                {/* Botón Ver gráfico abajo de cada columna */}
                <tr>
                  <td className="sticky left-0 z-10 bg-surface-2 border-r border-line px-3 py-2"> </td>
                  {g.shows.map(s => (
                    <td key={s.id} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setOpen({ col: s, performer: g.performer })}
                        className="w-full text-[11px] px-2 py-1.5 rounded-md border border-line text-brand hover:bg-surface-2 transition-colors"
                      >
                        Ver gráfico
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-surface border border-line rounded-xl p-6 w-full max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{open.performer}</h3>
                <p className="text-faint text-sm">{open.col.theater}{open.col.city ? ` · ${open.col.city}` : ''} · {open.col.date}</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar" className="text-muted hover:text-body text-xl leading-none px-2">×</button>
            </div>
            {open.col.curve.length < 2 ? (
              <p className="text-faint text-sm py-8 text-center">Cargá al menos dos fechas de venta para ver la curva de este show.</p>
            ) : (
              <SalesCurve points={open.col.curve} target={open.col.capacity} />
            )}
            <div className="mt-4 text-right">
              <Link href={`/shows/${open.col.id}/ventas`} className="text-brand text-sm hover:underline">Ir a cargar / ver detalle →</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
