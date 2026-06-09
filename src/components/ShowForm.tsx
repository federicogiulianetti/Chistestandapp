'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export interface ShowData {
  id?: string
  performer_type?: string
  comedian_id?: string | null
  ensemble_id?: string | null
  theater_id?: string | null
  show_date?: string | null
  status?: string
  capacity?: number | null
  ticket_price?: number | null
  is_pautada?: boolean
  deal_type?: string | null
  deal_fixed_amount?: number | null
  deal_percentage?: number | null
  notes?: string | null
}

export interface PerformerOption {
  id: string
  label: string
}

export interface TheaterOption {
  id: string
  name: string
  city: string | null
  province: string | null
  capacity_platea: number | null
  deal_type: string | null
  deal_fixed_amount: number | null
  deal_percentage: number | null
}

export interface ExistingShow {
  id: string
  city: string | null
  show_date: string | null
  performerKey: string  // "c:<id>" o "e:<id>"
  performer: string
}

interface ShowFormProps {
  action: (formData: FormData) => void | Promise<void>
  deleteAction?: (formData: FormData) => void | Promise<void>
  show?: ShowData
  comedians: PerformerOption[]
  ensembles: PerformerOption[]
  theaters: TheaterOption[]
  existingShows: ExistingShow[]
  mode: 'new' | 'edit'
  error?: string
}

// timestamptz (UTC) -> valor para <input type="datetime-local"> en hora local
function toDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ShowForm({
  action,
  deleteAction,
  show,
  comedians,
  ensembles,
  theaters,
  existingShows,
  mode,
  error,
}: ShowFormProps) {
  const s = show ?? {}

  const [performerType, setPerformerType] = useState(s.performer_type ?? 'comedian')
  const [theaterId, setTheaterId] = useState(s.theater_id ?? '')
  const [showDate, setShowDate] = useState(toDatetimeLocal(s.show_date))
  const [capacity, setCapacity] = useState(s.capacity != null ? String(s.capacity) : '')
  const [dealType, setDealType] = useState(s.deal_type ?? '')
  const [dealFixed, setDealFixed] = useState(s.deal_fixed_amount != null ? String(s.deal_fixed_amount) : '')
  const [dealPct, setDealPct] = useState(s.deal_percentage != null ? String(s.deal_percentage) : '')

  // Al elegir un teatro, heredamos capacidad y arreglo como default (editables)
  const onTheaterChange = (id: string) => {
    setTheaterId(id)
    const th = theaters.find(t => t.id === id)
    if (!th) return
    setCapacity(th.capacity_platea != null ? String(th.capacity_platea) : '')
    setDealType(th.deal_type ?? '')
    setDealFixed(th.deal_fixed_amount != null ? String(th.deal_fixed_amount) : '')
    setDealPct(th.deal_percentage != null ? String(th.deal_percentage) : '')
  }

  // Cazabobos: avisar si hay otro comediante en la misma ciudad dentro de ±20 días
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    const theater = theaters.find(t => t.id === theaterId)
    const city = theater?.city ?? null
    if (!city || !showDate) return

    const comedianId = (form.elements.namedItem('comedian_id') as HTMLSelectElement | null)?.value
    const ensembleId = (form.elements.namedItem('ensemble_id') as HTMLSelectElement | null)?.value
    const currentKey = performerType === 'elenco' ? `e:${ensembleId ?? ''}` : `c:${comedianId ?? ''}`

    const target = new Date(showDate).getTime()
    const DAY = 86400000

    const conflicts = existingShows.filter(es => {
      if (mode === 'edit' && es.id === s.id) return false
      if (!es.city || es.city !== city) return false
      if (es.performerKey === currentKey) return false
      if (!es.show_date) return false
      const diffDays = Math.abs(target - new Date(es.show_date).getTime()) / DAY
      return diffDays <= 20
    })

    if (conflicts.length > 0) {
      const list = conflicts
        .slice(0, 5)
        .map(c => `• ${c.performer} — ${new Date(c.show_date as string).toLocaleDateString('es-AR')}`)
        .join('\n')
      const msg = `⚠️ Ojo: ya hay ${conflicts.length === 1 ? 'un comediante programado' : 'comediantes programados'} en ${city} dentro de los 20 días:\n\n${list}\n\n¿Querés guardar esta fecha igual?`
      if (!window.confirm(msg)) {
        e.preventDefault()
      }
    }
  }

  // Estilos (mismos que TheaterForm)
  const inp = (disabled: boolean) =>
    `w-full px-3 py-2 border border-zinc-700 rounded-md focus:outline-none focus:border-zinc-500 transition ${
      disabled ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-zinc-800 text-white'
    }`
  const sec = 'bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4'
  const lbl = 'block text-sm mb-1'
  const chk = 'mt-0.5'

  return (
    <>
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Botón eliminar FUERA del form principal */}
      {mode === 'edit' && deleteAction && (
        <form action={deleteAction} className="mb-4 flex justify-end">
          <button
            type="submit"
            onClick={(e) => {
              if (!window.confirm('¿Seguro que querés eliminar esta fecha? Se va a la papelera.')) e.preventDefault()
            }}
            className="px-4 py-2 border border-red-700 text-red-400 rounded-md hover:bg-red-900/30 transition text-sm"
          >
            Eliminar fecha
          </button>
        </form>
      )}

      <form action={action} onSubmit={handleSubmit} className="space-y-6">

        {/* ── ARTISTA Y FECHA ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">🎭 Artista y fecha</h2>

          <div>
            <label htmlFor="performer_type" className={lbl}>🎤 Tipo de artista</label>
            <select
              id="performer_type"
              name="performer_type"
              value={performerType}
              onChange={e => setPerformerType(e.target.value)}
              className={inp(false)}
            >
              <option value="comedian">Comediante solista</option>
              <option value="elenco">Elenco</option>
            </select>
          </div>

          {performerType === 'comedian' ? (
            <div>
              <label htmlFor="comedian_id" className={lbl}>
                🎤 Comediante <span className="text-red-400">*</span>
              </label>
              <select
                id="comedian_id"
                name="comedian_id"
                required
                defaultValue={s.comedian_id ?? ''}
                className={inp(false)}
              >
                <option value="">— Seleccioná —</option>
                {comedians.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="ensemble_id" className={lbl}>
                🎭 Elenco <span className="text-red-400">*</span>
              </label>
              <select
                id="ensemble_id"
                name="ensemble_id"
                required
                defaultValue={s.ensemble_id ?? ''}
                className={inp(false)}
              >
                <option value="">— Seleccioná —</option>
                {ensembles.map(e => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="show_date_input" className={lbl}>
              📅 Fecha y hora <span className="text-red-400">*</span>
            </label>
            <input
              id="show_date_input"
              type="datetime-local"
              required
              value={showDate}
              onChange={e => setShowDate(e.target.value)}
              className={inp(false)}
            />
            {/* El valor real se manda en UTC para evitar líos de zona horaria */}
            <input
              type="hidden"
              name="show_date"
              value={showDate ? new Date(showDate).toISOString() : ''}
            />
          </div>

          <div>
            <label htmlFor="status" className={lbl}>🚦 Estado</label>
            <select id="status" name="status" defaultValue={s.status ?? 'tentativa'} className={inp(false)}>
              <option value="tentativa">🟡 Tentativa</option>
              <option value="confirmada">🟢 Confirmada</option>
              <option value="hecha">🔵 Hecha</option>
              <option value="cancelada">🔴 Cancelada</option>
            </select>
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" id="is_pautada" name="is_pautada" className={chk} defaultChecked={s.is_pautada ?? false} />
            <label htmlFor="is_pautada" className="text-sm">📣 Está pautada (con publicidad)</label>
          </div>
        </section>

        {/* ── TEATRO ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">🏛️ Teatro</h2>

          <div>
            <label htmlFor="theater_id" className={lbl}>
              🎭 Sala <span className="text-red-400">*</span>
            </label>
            <select
              id="theater_id"
              name="theater_id"
              required
              value={theaterId}
              onChange={e => onTheaterChange(e.target.value)}
              className={inp(false)}
            >
              <option value="">— Seleccioná —</option>
              {theaters.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.city ? ` — ${t.city}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Al elegir la sala se completan capacidad y arreglo (podés editarlos). La ciudad y provincia se guardan automáticamente.
            </p>
          </div>
        </section>

        {/* ── ENTRADAS Y ARREGLO ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">🎟️ Entradas y arreglo</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="capacity" className={lbl}>👥 Capacidad</label>
              <input id="capacity" name="capacity" type="number" min="0"
                value={capacity} onChange={e => setCapacity(e.target.value)} className={inp(false)} />
            </div>
            <div>
              <label htmlFor="ticket_price" className={lbl}>💵 Precio de entrada ($)</label>
              <input id="ticket_price" name="ticket_price" type="number" step="0.01" min="0"
                defaultValue={s.ticket_price ?? ''} className={inp(false)} />
            </div>
          </div>

          <div>
            <label htmlFor="deal_type" className={lbl}>🤝 Tipo de arreglo</label>
            <select id="deal_type" name="deal_type" value={dealType}
              onChange={e => setDealType(e.target.value)} className={inp(false)}>
              <option value="">— Seleccioná —</option>
              <option value="fixed">Fijo</option>
              <option value="percentage">Porcentaje</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="deal_fixed_amount" className={lbl}>💵 Monto fijo ($)</label>
              <input id="deal_fixed_amount" name="deal_fixed_amount" type="number" step="0.01" min="0"
                value={dealFixed} onChange={e => setDealFixed(e.target.value)}
                disabled={dealType !== 'fixed'} className={inp(dealType !== 'fixed')} />
            </div>
            <div>
              <label htmlFor="deal_percentage" className={lbl}>📈 Porcentaje (%)</label>
              <input id="deal_percentage" name="deal_percentage" type="number" step="0.01" min="0" max="100"
                value={dealPct} onChange={e => setDealPct(e.target.value)}
                disabled={dealType !== 'percentage'} className={inp(dealType !== 'percentage')} />
            </div>
          </div>
        </section>

        {/* ── NOTAS ── */}
        <section className={sec}>
          <h2 className="text-lg font-semibold">📝 Notas internas</h2>
          <p className="text-xs text-gray-400">Solo visible para el equipo.</p>
          <textarea id="notes" name="notes" rows={3} defaultValue={s.notes ?? ''} className={inp(false)} />
        </section>

        {/* ── BOTONES ── */}
        <div className="flex gap-3 justify-end">
          <Link href="/shows"
            className="px-4 py-2 border border-zinc-700 text-white rounded-md hover:bg-zinc-800 transition">
            Cancelar
          </Link>
          <button type="submit"
            className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition">
            {mode === 'new' ? 'Guardar fecha' : 'Guardar cambios'}
          </button>
        </div>

      </form>
    </>
  )
}
