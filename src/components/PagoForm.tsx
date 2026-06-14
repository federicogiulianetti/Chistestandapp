'use client'

import { useState } from 'react'
import { createPayment } from '@/app/pagos/actions'

type ShowOpt = { id: string; label: string }

export default function PagoForm({
  comedians,
  showsByComedian,
}: {
  comedians: { id: string; name: string }[]
  showsByComedian: Record<string, ShowOpt[]>
}) {
  const [comedian, setComedian] = useState('')
  const shows = comedian ? (showsByComedian[comedian] ?? []) : []
  const inp = 'w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body'

  return (
    <form action={createPayment} className="bg-surface border border-line rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-semibold">Cargar gasto a pagar</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Comediante</label>
          <select name="comedian_id" value={comedian} onChange={e => setComedian(e.target.value)} className={inp} required>
            <option value="">— Elegí —</option>
            {comedians.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Monto total</label>
          <input name="amount" type="number" step="0.01" min="0" required className={`${inp} text-right`} />
        </div>
        <div>
          <label className="block text-sm mb-1">Concepto</label>
          <input name="concept" type="text" placeholder="ej: carteles de puerta" className={inp} />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Fecha(s) donde se vuelca <span className="text-faint">(si elegís varias, el monto se reparte en partes iguales)</span></label>
        {!comedian ? (
          <p className="text-faint text-sm">Elegí un comediante para ver sus fechas.</p>
        ) : shows.length === 0 ? (
          <p className="text-faint text-sm">Ese comediante no tiene fechas próximas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
            {shows.map(s => (
              <label key={s.id} className="flex items-center gap-2.5 bg-surface-2 border border-line rounded-lg px-3 py-2 cursor-pointer hover:border-zinc-600">
                <input type="checkbox" name="show" value={s.id} className="w-[18px] h-[18px]" style={{ accentColor: '#2ee65c' }} />
                <span className="text-[13px] truncate">{s.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="block text-sm mb-1">Factura</label>
          <input name="factura" type="file" accept="image/*,application/pdf" className="text-sm text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-surface-2 file:text-body file:cursor-pointer" />
        </div>
        <button type="submit" className="px-5 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">Cargar gasto</button>
      </div>
    </form>
  )
}
