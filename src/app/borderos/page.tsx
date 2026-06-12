import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import BorderosFechas from '@/components/BorderosFechas'

type RawBordero = {
  id: string
  show_id: string
  currency: string
  recaudacion: number
  artista_final: number
  productora_share: number
  show: {
    show_date: string | null
    city: string | null
    spectacle: string | null
    performer_type: string | null
    theater: { name: string | null; city: string | null } | null
    comedian: { stage_name: string | null } | null
    ensemble: { name: string | null } | null
  } | null
}

export default async function BorderosPage({
  searchParams,
}: {
  searchParams: Promise<{ quien?: string; anio?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <p className="text-gray-400 mt-4">Cada comediante ve sus liquidaciones en <Link href="/mis-borderos" className="text-indigo-300">Mis borderós</Link>.</p>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('borderos')
    .select('id, show_id, currency, recaudacion, artista_final, productora_share, show:show_id(show_date, city, spectacle, performer_type, theater:theater_id(name, city), comedian:comedian_id(stage_name), ensemble:ensemble_id(name))')

  const raw = (data ?? []) as unknown as RawBordero[]
  const rows = raw.map(b => {
    const s = b.show
    const comediante = s?.performer_type === 'elenco' ? (s?.ensemble?.name ?? '—') : (s?.comedian?.stage_name ?? '—')
    return {
      id: b.id,
      show_id: b.show_id,
      fecha: s?.show_date ?? null,
      comediante,
      teatro: s?.theater?.name ?? null,
      ciudad: s?.city ?? s?.theater?.city ?? null,
      espectaculo: s?.spectacle ?? null,
      currency: b.currency,
      recaudacion: Number(b.recaudacion) || 0,
      artista_final: Number(b.artista_final) || 0,
      productora_share: Number(b.productora_share) || 0,
    }
  })

  const quien = sp.quien ? decodeURIComponent(sp.quien) : null
  const anio = sp.anio ?? null

  const card = 'bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 hover:bg-zinc-800/40 transition flex items-center justify-between'

  // --- Paso 3: fechas de un comediante + año ---
  if (quien && anio) {
    const fechas = rows.filter(r => r.comediante === quien && r.fecha?.slice(0, 4) === anio)
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 text-sm text-gray-400">
            <Link href="/borderos" className="hover:text-white">Borderós</Link>
            {' / '}<Link href={`/borderos?quien=${encodeURIComponent(quien)}`} className="hover:text-white">{quien}</Link>
            {' / '}<span className="text-white">{anio}</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">{quien} · {anio} 📄</h1>
          <p className="text-gray-400 mb-6">{fechas.length} borderó{fechas.length === 1 ? '' : 's'}. Filtrá por teatro, ciudad o fecha.</p>
          <BorderosFechas rows={fechas} />
        </div>
      </main>
    )
  }

  // --- Paso 2: años de un comediante ---
  if (quien) {
    const delQuien = rows.filter(r => r.comediante === quien)
    const porAnio = new Map<string, number>()
    for (const r of delQuien) {
      const y = r.fecha?.slice(0, 4) ?? '¿?'
      porAnio.set(y, (porAnio.get(y) ?? 0) + 1)
    }
    const anios = [...porAnio.entries()].sort((a, b) => b[0].localeCompare(a[0]))
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 text-sm text-gray-400">
            <Link href="/borderos" className="hover:text-white">Borderós</Link>{' / '}<span className="text-white">{quien}</span>
          </div>
          <h1 className="text-3xl font-bold mb-6">{quien} — elegí un año</h1>
          <div className="grid sm:grid-cols-2 gap-3">
            {anios.map(([y, n]) => (
              <Link key={y} href={`/borderos?quien=${encodeURIComponent(quien)}&anio=${y}`} className={card}>
                <span className="text-xl font-semibold">{y}</span>
                <span className="text-sm text-gray-400">{n} borderó{n === 1 ? '' : 's'}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // --- Paso 1: elegir comediante ---
  const porQuien = new Map<string, number>()
  for (const r of rows) porQuien.set(r.comediante, (porQuien.get(r.comediante) ?? 0) + 1)
  const comedianes = [...porQuien.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Borderós 📄</h1>
          <p className="text-gray-400 mt-1">Elegí un comediante para ver sus liquidaciones.</p>
        </div>
        {comedianes.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center text-gray-400">Todavía no hay borderós cerrados.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {comedianes.map(([c, n]) => (
              <Link key={c} href={`/borderos?quien=${encodeURIComponent(c)}`} className={card}>
                <span className="text-lg font-semibold">{c}</span>
                <span className="text-sm text-gray-400">{n} borderó{n === 1 ? '' : 's'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
