'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveBordero } from '@/app/shows/[id]/bordero/editar/actions'

type Entrada = { label: string; qty: number | null; price: number | null; subtotal: number | null }
type Impuesto = { label: string; percentage: number | null; fixed_amount: number | null; notes: string | null }
type Gasto = { category: string; amount: number; notes: string | null }

export type EditorData = {
  showId: string
  performer: string
  showDate: string | null
  recaudacion: number
  total_neto: number
  artista_final: number
  productora_share: number
  capacity: number | null
  deal_percentage: number | null
  artist_percentage: number | null
  entradas: Entrada[]
  impuestos: Impuesto[]
  gastos: Gasto[]
}

const inp = 'w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-zinc-500'
const numInp = `${inp} text-right`

function n(v: string): number | null {
  if (v.trim() === '') return null
  const x = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(x) ? x : null
}

export default function BorderoEditor({ data }: { data: EditorData }) {
  const [entradas, setEntradas] = useState<Entrada[]>(data.entradas.length ? data.entradas : [{ label: '', qty: null, price: null, subtotal: null }])
  const [impuestos, setImpuestos] = useState<Impuesto[]>(data.impuestos)
  const [gastos, setGastos] = useState<Gasto[]>(data.gastos)
  const [tot, setTot] = useState({
    recaudacion: data.recaudacion, total_neto: data.total_neto,
    artista_final: data.artista_final, productora_share: data.productora_share,
    capacity: data.capacity, deal_percentage: data.deal_percentage, artist_percentage: data.artist_percentage,
  })

  const payload = JSON.stringify({ ...tot, entradas, impuestos, gastos })

  const Th = ({ children }: { children: React.ReactNode }) => <th className="text-left px-2 py-1 text-xs font-semibold text-gray-400">{children}</th>
  const del = 'text-red-400 hover:text-red-300 text-xs px-1'
  const addBtn = 'text-indigo-300 hover:text-indigo-200 text-sm mt-1'

  return (
    <form action={saveBordero.bind(null, data.showId)} className="space-y-8">
      <input type="hidden" name="payload" value={payload} />

      {/* Entradas */}
      <section>
        <h2 className="font-semibold mb-2">🎟️ Entradas</h2>
        <table className="w-full">
          <thead><tr><Th>Tipo de entrada</Th><Th>Cantidad</Th><Th>Precio</Th><Th>Subtotal</Th><th></th></tr></thead>
          <tbody>
            {entradas.map((e, i) => (
              <tr key={i}>
                <td className="px-1 py-0.5"><input className={inp} value={e.label} onChange={ev => setEntradas(a => a.map((x, j) => j === i ? { ...x, label: ev.target.value } : x))} /></td>
                <td className="px-1 py-0.5 w-24"><input className={numInp} defaultValue={e.qty ?? ''} onChange={ev => setEntradas(a => a.map((x, j) => j === i ? { ...x, qty: n(ev.target.value) } : x))} /></td>
                <td className="px-1 py-0.5 w-32"><input className={numInp} defaultValue={e.price ?? ''} onChange={ev => setEntradas(a => a.map((x, j) => j === i ? { ...x, price: n(ev.target.value) } : x))} /></td>
                <td className="px-1 py-0.5 w-36"><input className={numInp} defaultValue={e.subtotal ?? ''} onChange={ev => setEntradas(a => a.map((x, j) => j === i ? { ...x, subtotal: n(ev.target.value) } : x))} /></td>
                <td className="w-8 text-center"><button type="button" className={del} onClick={() => setEntradas(a => a.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className={addBtn} onClick={() => setEntradas(a => [...a, { label: '', qty: null, price: null, subtotal: null }])}>+ Agregar entrada</button>
      </section>

      {/* Impuestos */}
      <section>
        <h2 className="font-semibold mb-2">🧾 Impuestos / Deducciones</h2>
        <table className="w-full">
          <thead><tr><Th>Concepto</Th><Th>%</Th><Th>Monto $</Th><Th>Comentario</Th><th></th></tr></thead>
          <tbody>
            {impuestos.map((d, i) => (
              <tr key={i}>
                <td className="px-1 py-0.5"><input className={inp} value={d.label} onChange={ev => setImpuestos(a => a.map((x, j) => j === i ? { ...x, label: ev.target.value } : x))} /></td>
                <td className="px-1 py-0.5 w-20"><input className={numInp} defaultValue={d.percentage ?? ''} onChange={ev => setImpuestos(a => a.map((x, j) => j === i ? { ...x, percentage: n(ev.target.value) } : x))} /></td>
                <td className="px-1 py-0.5 w-36"><input className={numInp} defaultValue={d.fixed_amount ?? ''} onChange={ev => setImpuestos(a => a.map((x, j) => j === i ? { ...x, fixed_amount: n(ev.target.value) } : x))} /></td>
                <td className="px-1 py-0.5"><input className={inp} value={d.notes ?? ''} onChange={ev => setImpuestos(a => a.map((x, j) => j === i ? { ...x, notes: ev.target.value } : x))} /></td>
                <td className="w-8 text-center"><button type="button" className={del} onClick={() => setImpuestos(a => a.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1">Dejá el % vacío y poné solo el monto si es un valor fijo. (Argentores se marca solo.)</p>
        <button type="button" className={addBtn} onClick={() => setImpuestos(a => [...a, { label: '', percentage: null, fixed_amount: null, notes: null }])}>+ Agregar impuesto</button>
      </section>

      {/* Gastos */}
      <section>
        <h2 className="font-semibold mb-2">💸 Gastos</h2>
        <table className="w-full">
          <thead><tr><Th>Gasto</Th><Th>Monto</Th><Th>Detalle</Th><th></th></tr></thead>
          <tbody>
            {gastos.map((g, i) => (
              <tr key={i}>
                <td className="px-1 py-0.5"><input className={inp} value={g.category} onChange={ev => setGastos(a => a.map((x, j) => j === i ? { ...x, category: ev.target.value } : x))} /></td>
                <td className="px-1 py-0.5 w-36"><input className={numInp} defaultValue={g.amount ?? ''} onChange={ev => setGastos(a => a.map((x, j) => j === i ? { ...x, amount: n(ev.target.value) ?? 0 } : x))} /></td>
                <td className="px-1 py-0.5"><input className={inp} value={g.notes ?? ''} onChange={ev => setGastos(a => a.map((x, j) => j === i ? { ...x, notes: ev.target.value } : x))} /></td>
                <td className="w-8 text-center"><button type="button" className={del} onClick={() => setGastos(a => a.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className={addBtn} onClick={() => setGastos(a => [...a, { category: '', amount: 0, notes: null }])}>+ Agregar gasto</button>
      </section>

      {/* Totales + reparto */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h2 className="font-semibold mb-3">🧮 Totales y reparto</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            ['recaudacion', 'Recaudación (bruto)'],
            ['total_neto', 'Total neto a repartir'],
            ['artista_final', 'Artista (monto final)'],
            ['productora_share', 'Productora (monto)'],
            ['deal_percentage', 'Productora con sala (%)'],
            ['artist_percentage', 'Artista en reparto (%)'],
            ['capacity', 'Capacidad de sala'],
          ] as const).map(([k, label]) => (
            <label key={k} className="text-sm">
              <span className="block text-xs text-gray-400 mb-0.5">{label}</span>
              <input className={numInp} defaultValue={(tot[k] as number | null) ?? ''} onChange={ev => setTot(t => ({ ...t, [k]: n(ev.target.value) }))} />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="px-5 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">Guardar cambios</button>
        <Link href={`/shows/${data.showId}/bordero`} className="text-gray-400 hover:text-white text-sm">Cancelar</Link>
      </div>
    </form>
  )
}
