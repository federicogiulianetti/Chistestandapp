'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export interface ShowOption {
  id: string
  label: string
}

export default function RepartirForm({
  action,
  shows,
  categories,
  preselectedId,
  returnTo,
}: {
  action: (formData: FormData) => void | Promise<void>
  shows: ShowOption[]
  categories: string[]
  preselectedId?: string
  returnTo: string
}) {
  const [selected, setSelected] = useState<string[]>(preselectedId ? [preselectedId] : [])
  const [total, setTotal] = useState('')
  const [equalSplit, setEqualSplit] = useState(true)
  const [custom, setCustom] = useState<Record<string, string>>({})

  const totalNum = Number(total) || 0
  const equalShare = useMemo(() => {
    if (!equalSplit || selected.length === 0 || totalNum === 0) return 0
    return Math.round((totalNum / selected.length) * 100) / 100
  }, [equalSplit, selected.length, totalNum])

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const shareValue = (id: string) => (equalSplit ? String(equalShare) : (custom[id] ?? ''))

  const assignedTotal = selected.reduce((a, id) => a + (Number(shareValue(id)) || 0), 0)

  const inp = "w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body"

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="return_to" value={returnTo} />

      <section className="bg-surface border border-line rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">🏷️ Categoría <span className="text-red-400">*</span></label>
            <input name="category" list="cats" required placeholder="Ej: Aéreos / Buque" className={inp} />
            <datalist id="cats">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm mb-1">💵 Monto total ($)</label>
            <input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} className={`${inp} text-right`} />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">📝 Nota</label>
          <input name="notes" type="text" className={inp} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={equalSplit} onChange={e => setEqualSplit(e.target.checked)} />
          ➗ Repartir en partes iguales
        </label>
      </section>

      <section className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-lg font-semibold">📅 Fechas ({selected.length})</h2>
          <span className="text-sm text-muted">Asignado: ${Math.round(assignedTotal).toLocaleString('es-AR')} / ${Math.round(totalNum).toLocaleString('es-AR')}</span>
        </div>
        <table className="w-full">
          <tbody>
            {shows.map(s => {
              const on = selected.includes(s.id)
              return (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 w-8">
                    <input type="checkbox" checked={on} onChange={() => toggle(s.id)} />
                  </td>
                  <td className="px-4 py-2 text-sm">{s.label}</td>
                  <td className="px-4 py-2 w-44">
                    {on && (
                      <input
                        name={`share_${s.id}`}
                        type="number" step="0.01" min="0"
                        value={shareValue(s.id)}
                        readOnly={equalSplit}
                        onChange={e => setCustom(prev => ({ ...prev, [s.id]: e.target.value }))}
                        className={`${inp} text-right ${equalSplit ? 'opacity-70' : ''}`}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <div className="flex gap-3 justify-end">
        <Link href={returnTo ? `/shows/${returnTo}/gastos` : '/shows'} className="px-4 py-2 border border-line text-body rounded-md hover:bg-surface-2 transition">
          Cancelar
        </Link>
        <button type="submit" disabled={selected.length === 0} className="px-6 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition disabled:opacity-50">
          Repartir gasto
        </button>
      </div>
    </form>
  )
}
