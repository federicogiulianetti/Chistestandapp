'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { statusMeta } from '@/lib/shows'

export interface CalShow {
  id: string
  dateKey: string      // "YYYY-MM-DD" en hora AR
  time: string         // "HH:mm"
  performer: string
  performer_type: string | null
  theater: string
  city: string | null
  status: string | null
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const pad = (n: number) => String(n).padStart(2, '0')

export default function CalendarView({
  shows,
  initialYear,
  initialMonth,
  todayKey,
}: {
  shows: CalShow[]
  initialYear: number
  initialMonth: number // 0-11
  todayKey: string
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  // Agrupar shows por día
  const byDay = useMemo(() => {
    const map = new Map<string, CalShow[]>()
    for (const s of shows) {
      const arr = map.get(s.dateKey) ?? []
      arr.push(s)
      map.set(s.dateKey, arr)
    }
    // ordenar por hora dentro de cada día
    for (const arr of map.values()) arr.sort((a, b) => a.time.localeCompare(b.time))
    return map
  }, [shows])

  // Construir las celdas del mes (lunes primero)
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const out: (number | null)[] = []
    for (let i = 0; i < startOffset; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) out.push(d)
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [year, month])

  const monthLabel = useMemo(() => {
    const label = new Date(year, month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [year, month])

  const monthCount = useMemo(
    () => shows.filter(s => s.dateKey.startsWith(`${year}-${pad(month + 1)}`)).length,
    [shows, year, month]
  )

  const goPrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  const goNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }
  const goToday = () => { setYear(initialYear); setMonth(initialMonth) }

  const btn = "px-3 py-1.5 border border-zinc-700 rounded-md hover:bg-zinc-800 transition text-sm"

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className={btn} aria-label="Mes anterior">←</button>
          <button type="button" onClick={goToday} className={btn}>Hoy</button>
          <button type="button" onClick={goNext} className={btn} aria-label="Mes siguiente">→</button>
        </div>
        <h2 className="text-xl font-semibold">{monthLabel}</h2>
        <span className="text-sm text-gray-400">{monthCount} {monthCount === 1 ? 'fecha' : 'fechas'}</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Encabezados de día */}
          <div className="gap-px mb-px" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {WEEKDAYS.map(d => (
              <div key={d} className="bg-zinc-800/50 text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div className="gap-px bg-zinc-800" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="bg-black min-h-[110px]" />
              const key = `${year}-${pad(month + 1)}-${pad(day)}`
              const dayShows = byDay.get(key) ?? []
              const isToday = key === todayKey
              return (
                <div key={i} className="bg-zinc-900 min-h-[110px] p-1.5 align-top">
                  <div className={`text-xs mb-1 ${isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-black font-bold' : 'text-gray-400'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayShows.map(s => {
                      const st = statusMeta(s.status)
                      return (
                        <Link
                          key={s.id}
                          href={`/shows/${s.id}/ver`}
                          title={`${s.time} · ${s.performer} · ${s.theater}${s.city ? ` (${s.city})` : ''}`}
                          className={`block rounded px-1.5 py-1 text-[11px] leading-tight truncate hover:opacity-80 transition ${st.badge}`}
                        >
                          <span className="font-medium">{s.time}</span>{' '}
                          {s.performer_type === 'elenco' ? '🎭' : '🎤'} {s.performer}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
