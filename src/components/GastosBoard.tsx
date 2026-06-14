'use client'

import { useState, useTransition } from 'react'
import { CHECKLIST_ITEMS } from '@/lib/checklist'
import { fmtMoney } from '@/lib/staff'
import { setChecklist } from '@/app/gastos/actions'

export type GastoCol = {
  id: string
  theater: string
  city: string
  date: string
  checks: Record<string, string> // item_key -> status ('' = sin estado)
}
export type CostRow = { staffId: string; name: string; amounts: Record<string, number> }
export type GastoGroup = { performer: string; photo: string | null; color: string; shows: GastoCol[]; costRows: CostRow[] }

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

function ChecklistSelect({ showId, itemKey, value }: { showId: string; itemKey: string; value: string }) {
  const [val, setVal] = useState(value)
  const [pending, start] = useTransition()
  const cls =
    val === 'listo' ? 'bg-green-900/40 text-green-300 border-green-800'
    : val === 'no_listo' ? 'bg-amber-900/40 text-amber-300 border-amber-800'
    : val === 'no_aplica' ? 'bg-surface-2 text-muted border-line'
    : 'bg-surface text-faint border-line'
  return (
    <select
      value={val}
      disabled={pending}
      onChange={e => { const v = e.target.value; setVal(v); start(() => setChecklist(showId, itemKey, v)) }}
      className={`w-full text-[12px] rounded-md border px-2 py-1.5 text-center cursor-pointer focus:outline-none transition-colors ${cls} ${pending ? 'opacity-60' : ''}`}
    >
      <option value="">—</option>
      <option value="listo">Listo</option>
      <option value="no_listo">No listo</option>
      <option value="no_aplica">No aplica</option>
    </select>
  )
}

export default function GastosBoard({ groups }: { groups: GastoGroup[] }) {
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
                  <th className="sticky left-0 z-10 bg-surface-2 border-b border-r border-line px-3 py-2 text-center text-[11px] uppercase tracking-wide text-faint min-w-[170px]">Checklist</th>
                  {g.shows.map(s => (
                    <th key={s.id} className="border-b border-line px-3 py-2 text-center align-top min-w-[140px]" style={{ borderTop: `2px solid ${g.color}` }}>
                      <div className="text-[13px] font-semibold text-body truncate">{s.city || s.theater}</div>
                      <div className="text-[11px] text-faint truncate">{s.city && s.theater ? `${s.theater} · ` : ''}{s.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITEMS.map(item => (
                  <tr key={item.key}>
                    <td className="sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] text-muted text-center">{item.label}</td>
                    {g.shows.map(s => (
                      <td key={s.id} className="border-b border-line px-2 py-1.5">
                        <ChecklistSelect showId={s.id} itemKey={item.key} value={s.checks[item.key] ?? ''} />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Costos de sueldos (se levantan de Sueldos, no se editan acá) */}
                <tr>
                  <td className="sticky left-0 z-10 bg-surface border-r border-y border-line px-3 py-2 text-[11px] uppercase tracking-wide font-semibold text-faint text-center">Costos — sueldos</td>
                  {g.shows.map(s => <td key={s.id} className="border-y border-line bg-surface" />)}
                </tr>
                {g.costRows.length === 0 ? (
                  <tr>
                    <td className="sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] text-faint text-center">—</td>
                    {g.shows.map(s => <td key={s.id} className="border-b border-line px-3 py-2 text-center text-[12px] text-faint">sin cargos</td>)}
                  </tr>
                ) : (
                  <>
                    {g.costRows.map(cr => (
                      <tr key={cr.staffId}>
                        <td className="sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] text-muted text-center">{cr.name}</td>
                        {g.shows.map(s => {
                          const v = cr.amounts[s.id] ?? 0
                          return <td key={s.id} className="border-b border-line px-3 py-2 text-center text-[13px] tabular-nums text-muted">{v ? fmtMoney(v) : '—'}</td>
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="sticky left-0 z-10 bg-surface-2 border-r border-b border-line px-3 py-2 text-[12px] font-semibold text-body text-center">Total sueldos</td>
                      {g.shows.map(s => {
                        const total = g.costRows.reduce((a, cr) => a + (cr.amounts[s.id] ?? 0), 0)
                        return <td key={s.id} className="border-b border-line px-3 py-2 text-center text-[13px] tabular-nums font-bold text-body">{total ? fmtMoney(total) : '—'}</td>
                      })}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
