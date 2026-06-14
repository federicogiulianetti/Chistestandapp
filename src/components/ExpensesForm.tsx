'use client'

import { useState, useMemo } from 'react'

interface DirectExpense {
  category: string
  amount: number
  notes: string | null
  payee_type: string | null
  payee_id: string | null
}

export interface PersonOption {
  value: string   // "comedian:<id>" | "profile:<id>"
  label: string
}

interface CustomRow {
  id: number
  category: string
  amount: string
  notes: string
  payee: string
}

export default function ExpensesForm({
  action,
  fixedCategories,
  directExpenses,
  people,
}: {
  action: (formData: FormData) => void | Promise<void>
  fixedCategories: string[]
  directExpenses: DirectExpense[]
  people: PersonOption[]
}) {
  const fixedMap = useMemo(() => {
    const m = new Map<string, DirectExpense>()
    for (const e of directExpenses) m.set(e.category, e)
    return m
  }, [directExpenses])

  const payeeValue = (e?: DirectExpense | null) =>
    e?.payee_type && e?.payee_id ? `${e.payee_type}:${e.payee_id}` : ''

  const initialCustom: CustomRow[] = directExpenses
    .filter(e => !fixedCategories.includes(e.category))
    .map((e, i) => ({ id: i + 1, category: e.category, amount: String(e.amount), notes: e.notes ?? '', payee: payeeValue(e) }))

  const [fixedAmounts, setFixedAmounts] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const c of fixedCategories) o[c] = fixedMap.get(c) ? String(fixedMap.get(c)!.amount) : ''
    return o
  })
  const [custom, setCustom] = useState<CustomRow[]>(initialCustom)

  const total = useMemo(() => {
    let t = 0
    for (const c of fixedCategories) t += Number(fixedAmounts[c]) || 0
    for (const r of custom) t += Number(r.amount) || 0
    return t
  }, [fixedAmounts, custom, fixedCategories])

  const addCustom = () => setCustom(prev => [...prev, { id: Date.now(), category: '', amount: '', notes: '', payee: '' }])
  const removeCustom = (id: number) => setCustom(prev => prev.filter(r => r.id !== id))
  const updateCustom = (id: number, patch: Partial<CustomRow>) =>
    setCustom(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))

  const inp = "w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body"
  const PayeeSelect = ({ name, defaultValue, value, onChange }: { name: string; defaultValue?: string; value?: string; onChange?: (v: string) => void }) => (
    <select name={name} defaultValue={value === undefined ? defaultValue : undefined} value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined} className={`${inp} text-sm`}>
      <option value="">— sin pagar a —</option>
      {people.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
    </select>
  )

  let idx = 0

  return (
    <form action={action} className="space-y-6">
      <section className="bg-surface border border-line rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-2 border-b border-line">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-semibold">Categoría</th>
              <th className="text-right px-4 py-2 text-sm font-semibold w-36">Monto ($)</th>
              <th className="text-left px-4 py-2 text-sm font-semibold">Nota</th>
              <th className="text-left px-4 py-2 text-sm font-semibold w-52">Pagar a (cuenta corriente)</th>
            </tr>
          </thead>
          <tbody>
            {fixedCategories.map(cat => {
              const i = idx++
              return (
                <tr key={cat} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-sm">
                    {cat}
                    <input type="hidden" name={`cat_${i}`} value={cat} />
                  </td>
                  <td className="px-4 py-2">
                    <input name={`amt_${i}`} type="number" step="0.01" min="0" placeholder="0"
                      value={fixedAmounts[cat] ?? ''}
                      onChange={e => setFixedAmounts(prev => ({ ...prev, [cat]: e.target.value }))}
                      className={`${inp} text-right`} />
                  </td>
                  <td className="px-4 py-2">
                    <input name={`note_${i}`} type="text" defaultValue={fixedMap.get(cat)?.notes ?? ''} className={inp} />
                  </td>
                  <td className="px-4 py-2">
                    <PayeeSelect name={`payee_${i}`} defaultValue={payeeValue(fixedMap.get(cat))} />
                  </td>
                </tr>
              )
            })}

            {custom.map(r => {
              const i = idx++
              return (
                <tr key={r.id} className="border-b border-line last:border-0 bg-surface/40">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <input name={`cat_${i}`} type="text" placeholder="Categoría suelta"
                        value={r.category} onChange={e => updateCustom(r.id, { category: e.target.value })} className={inp} />
                      <button type="button" onClick={() => removeCustom(r.id)} className="text-red-400 hover:text-red-300 text-sm px-1 flex-shrink-0">✕</button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input name={`amt_${i}`} type="number" step="0.01" min="0" placeholder="0"
                      value={r.amount} onChange={e => updateCustom(r.id, { amount: e.target.value })} className={`${inp} text-right`} />
                  </td>
                  <td className="px-4 py-2">
                    <input name={`note_${i}`} type="text" value={r.notes} onChange={e => updateCustom(r.id, { notes: e.target.value })} className={inp} />
                  </td>
                  <td className="px-4 py-2">
                    <PayeeSelect name={`payee_${i}`} value={r.payee} onChange={v => updateCustom(r.id, { payee: v })} />
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-surface-2">
              <td className="px-4 py-3 text-sm font-semibold">Total de gastos directos</td>
              <td className="px-4 py-3 text-right font-bold">${Math.round(total).toLocaleString('es-AR')}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="flex items-center justify-between">
        <button type="button" onClick={addCustom} className="text-sm text-muted hover:text-body transition">
          + Agregar categoría suelta
        </button>
        <button type="submit" className="px-6 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">
          Guardar gastos
        </button>
      </div>
      <p className="text-xs text-faint">La columna «Pagar a» enlaza ese gasto con la cuenta corriente de la persona: al cerrar el borderó se le acredita como ganado.</p>
    </form>
  )
}
