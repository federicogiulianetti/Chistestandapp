import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { fmt } from '@/lib/accounts'
import { buildRateLookup, dateKeyOf, fmtUsd, type UsdRate } from '@/lib/usd'

type RawBordero = {
  productora_share: number
  currency: string
  show: {
    show_date: string | null
    performer_type: string | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
  } | null
}

export default async function GananciasPage() {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">Este módulo es exclusivo del dueño.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const [{ data }, { data: rateData }] = await Promise.all([
    supabase
      .from('borderos')
      .select('productora_share, currency, show:show_id(show_date, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name))'),
    supabase.from('usd_rates').select('rate_date, blue_sell, oficial_sell'),
  ])

  const rows = (data ?? []) as unknown as RawBordero[]
  const rateFor = buildRateLookup((rateData ?? []) as UsdRate[])

  // Agrupar por artista. Convertimos ARS -> USD con el dólar de la semana del show.
  type Agg = { performer: string; ars: number; usd: number; count: number; sinCotizacion: number }
  const agg = new Map<string, Agg>()
  let grandArs = 0, grandUsd = 0, sinCotizacionTotal = 0
  for (const b of rows) {
    if (b.currency !== 'ARS') continue   // los borderós en moneda extranjera ya están en su moneda
    const performer = b.show?.performer_type === 'elenco' ? (b.show?.ensemble?.name ?? '—') : (b.show?.comedian?.stage_name ?? '—')
    const ars = Number(b.productora_share) || 0
    const rate = rateFor(dateKeyOf(b.show?.show_date ?? null))
    const usd = rate ? ars / rate : 0

    const cur = agg.get(performer) ?? { performer, ars: 0, usd: 0, count: 0, sinCotizacion: 0 }
    cur.ars += ars
    cur.usd += usd
    cur.count += 1
    if (!rate) cur.sinCotizacion += 1
    agg.set(performer, cur)

    grandArs += ars
    grandUsd += usd
    if (!rate) sinCotizacionTotal += 1
  }

  const list = Array.from(agg.values()).sort((a, b) => b.usd - a.usd)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Mis ganancias 🔒</h1>
          <p className="text-gray-400 mt-1">
            Parte de la productora por comediante (de los borderós cerrados). Convertido a dólares con la
            cotización de la semana de cada fecha (blue hasta abr-2025, oficial después) para descontar la inflación. Privado, solo vos.
          </p>
        </div>

        {/* Totales */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 min-w-[200px]">
            <p className="text-xs text-gray-400">Total productora (USD real)</p>
            <p className="text-3xl font-bold mt-1 text-green-300">{fmtUsd(grandUsd)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-w-[200px]">
            <p className="text-xs text-gray-400">Suma histórica en pesos (nominal)</p>
            <p className="text-2xl font-bold mt-1 text-gray-300">{fmt(grandArs, 'ARS')}</p>
            <p className="text-[11px] text-gray-500 mt-1">Sumar pesos de años distintos no refleja el valor real.</p>
          </div>
        </div>

        {sinCotizacionTotal > 0 && (
          <p className="text-xs text-amber-400/80 mb-4">⚠️ {sinCotizacionTotal} borderó(s) sin cotización para su fecha (no sumaron al USD).</p>
        )}

        {list.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">Todavía no hay borderós cerrados.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Comediante</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Fechas</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Ganancia (USD real)</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">En pesos (nominal)</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">{r.performer}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-300">{r.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-300">{fmtUsd(r.usd)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">{fmt(r.ars, 'ARS')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
