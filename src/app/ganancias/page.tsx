import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { fmt } from '@/lib/accounts'
import { buildRateLookup, dateKeyOf, fmtUsd, type UsdRate } from '@/lib/usd'
import { comedianColor } from '@/lib/comedianColor'
import { performerPhotoMap } from '@/lib/performerPhotos'
import PerformerAvatar from '@/components/PerformerAvatar'

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
  const [{ data }, { data: rateData }, fotoDe] = await Promise.all([
    supabase
      .from('borderos')
      .select('productora_share, currency, show:show_id(show_date, performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name))'),
    supabase.from('usd_rates').select('rate_date, blue_sell, oficial_sell'),
    performerPhotoMap(supabase),
  ])

  const rows = (data ?? []) as unknown as RawBordero[]
  const rateFor = buildRateLookup((rateData ?? []) as UsdRate[])

  // Agrupar por artista. Convertimos ARS -> USD con el dólar de la semana del show.
  type Agg = { performer: string; ars: number; usd: number; count: number; sinCotizacion: number }
  const agg = new Map<string, Agg>()
  let grandArs = 0, grandUsd = 0, sinCotizacionTotal = 0
  for (const b of rows) {
    const performer = b.show?.performer_type === 'elenco' ? (b.show?.ensemble?.name ?? '—') : (b.show?.comedian?.stage_name ?? '—')
    const cur = agg.get(performer) ?? { performer, ars: 0, usd: 0, count: 0, sinCotizacion: 0 }

    if (b.currency === 'USD') {
      // borderós internacionales: ya están en dólares, suman al USD real (no al nominal en pesos)
      const usd = Number(b.productora_share) || 0
      cur.usd += usd
      cur.count += 1
      agg.set(performer, cur)
      grandUsd += usd
      continue
    }
    if (b.currency !== 'ARS') continue   // otras monedas: no se suman

    const ars = Number(b.productora_share) || 0
    const rate = rateFor(dateKeyOf(b.show?.show_date ?? null))
    const usd = rate ? ars / rate : 0
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
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Mis ganancias</h1>
          <p className="text-faint mt-1">
            Parte de la productora por comediante (de los borderós cerrados). Convertido a dólares con la
            cotización de la semana de cada fecha (blue hasta abr-2025, oficial después) para descontar la inflación. Privado, solo vos.
          </p>
        </div>

        {/* Totales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="bg-surface border border-line border-t-2 rounded-b-xl p-4" style={{ borderTopColor: '#2ee65c' }}>
            <p className="text-[11px] text-faint uppercase tracking-wide">Total productora (USD real)</p>
            <p className="text-3xl font-bold mt-1 text-brand">{fmtUsd(grandUsd)}</p>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4">
            <p className="text-[11px] text-faint uppercase tracking-wide">Suma histórica en pesos (nominal)</p>
            <p className="text-2xl font-bold mt-1 text-muted">{fmt(grandArs, 'ARS')}</p>
            <p className="text-[11px] text-faint mt-1">Sumar pesos de años distintos no refleja el valor real.</p>
          </div>
        </div>

        {sinCotizacionTotal > 0 && (
          <p className="text-xs text-amber-400/80 mb-4">{sinCotizacionTotal} borderó(s) sin cotización para su fecha (no sumaron al USD).</p>
        )}

        {list.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">
            Todavía no hay borderós cerrados.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((r, i) => {
              const color = comedianColor(r.performer)
              return (
                <div key={i} className="bg-surface border border-line border-t-2 rounded-b-xl p-4" style={{ borderTopColor: color }}>
                  <PerformerAvatar name={r.performer} photoUrl={fotoDe.get(r.performer)} size={44} />
                  <div className="text-[14px] font-semibold mt-3 truncate text-body">{r.performer}</div>
                  <div className="text-[11px] text-faint">{r.count} fecha{r.count === 1 ? '' : 's'}</div>
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-xl font-bold text-brand">{fmtUsd(r.usd)}</div>
                    <div className="text-[11px] text-muted mt-0.5">{fmt(r.ars, 'ARS')} <span className="text-faint">nominal</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
