'use client'

import { useState, useMemo } from 'react'

export interface AdRow {
  id: string
  label: string
  meta: string
  google: string
}

export default function AdsGrid({
  action,
  rows,
}: {
  action: (formData: FormData) => void | Promise<void>
  rows: AdRow[]
}) {
  const [data, setData] = useState<AdRow[]>(rows)

  const update = (id: string, patch: Partial<AdRow>) =>
    setData(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))

  const totals = useMemo(() => {
    let meta = 0, google = 0
    for (const r of data) { meta += Number(r.meta) || 0; google += Number(r.google) || 0 }
    return { meta, google, all: meta + google }
  }, [data])

  const inp = "w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 text-white text-right text-sm"
  const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

  return (
    <form action={action}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/50 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Fecha</th>
              <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap w-40">Meta ($)</th>
              <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap w-40">Google ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id} className="border-b border-zinc-800 last:border-0">
                <td className="px-4 py-2 text-sm">{r.label}</td>
                <td className="px-4 py-2">
                  <input name={`meta_${r.id}`} type="number" step="0.01" min="0" placeholder="0"
                    value={r.meta} onChange={e => update(r.id, { meta: e.target.value })} className={inp} />
                </td>
                <td className="px-4 py-2">
                  <input name={`google_${r.id}`} type="number" step="0.01" min="0" placeholder="0"
                    value={r.google} onChange={e => update(r.id, { google: e.target.value })} className={inp} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700 bg-zinc-800/30">
              <td className="px-4 py-3 text-sm font-semibold">Totales — {money(totals.all)} (+ 30% imp. digitales en cada borderó)</td>
              <td className="px-4 py-3 text-right font-bold text-sm">{money(totals.meta)}</td>
              <td className="px-4 py-3 text-right font-bold text-sm">{money(totals.google)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button type="submit" className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">
          Guardar Ads
        </button>
      </div>
    </form>
  )
}
