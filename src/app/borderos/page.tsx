import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import BorderosTable from '@/components/BorderosTable'

type RawBordero = {
  id: string
  show_id: string
  currency: string
  recaudacion: number
  total_neto: number
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

export default async function BorderosPage() {
  const { profile } = await getUserAndProfile()

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
    .select('id, show_id, currency, recaudacion, total_neto, artista_final, productora_share, show:show_id(show_date, city, spectacle, performer_type, theater:theater_id(name, city), comedian:comedian_id(stage_name), ensemble:ensemble_id(name))')

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

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Borderós 📄</h1>
          <p className="text-gray-400 mt-1">Todas las liquidaciones cerradas. Tocá una fecha para verla o descargarla.</p>
        </div>

        {rows.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center text-gray-400">
            Todavía no hay borderós cerrados.
          </div>
        ) : (
          <BorderosTable rows={rows} />
        )}
      </div>
    </main>
  )
}
