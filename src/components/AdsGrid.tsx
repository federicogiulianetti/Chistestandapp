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

  const inp = "w-full px-2 py-1.5 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body text-right text-sm"
  const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

  return (
    <form action={action}>
      <div className="bg-surface border border-line rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-2 border-b border-line">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Fecha</th>
              <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap w-40">Meta ($)</th>
              <th className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap w-40">Google ($)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id} className="border-b border-line last:border-0">
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
            <tr className="border-t border-line bg-surface-2">
              <td className="px-4 py-3 text-sm font-semibold">Totales — {money(totals.all)} (+ 30% imp. digitales en cada borderó)</td>
              <td className="px-4 py-3 text-right font-bold text-sm">{money(totals.meta)}</td>
              <td className="px-4 py-3 text-right font-bold text-sm">{money(totals.google)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button type="submit" className="px-6 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">
          Guardar Ads
        </button>
      </div>
    </form>
  )
}
