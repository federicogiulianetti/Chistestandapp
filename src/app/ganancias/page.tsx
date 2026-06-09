import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { fmt } from '@/lib/accounts'

type RawBordero = {
  productora_share: number
  currency: string
  show: {
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
  const { data } = await supabase
    .from('borderos')
    .select('productora_share, currency, show:show_id(performer_type, comedian:comedian_id(stage_name), ensemble:ensemble_id(name))')

  const rows = (data ?? []) as unknown as RawBordero[]

  // Agrupar por artista + moneda
  const agg = new Map<string, { performer: string; currency: string; total: number; count: number }>()
  const grand = new Map<string, number>()
  for (const b of rows) {
    const performer = b.show?.performer_type === 'elenco' ? (b.show?.ensemble?.name ?? '—') : (b.show?.comedian?.stage_name ?? '—')
    const key = `${performer}|${b.currency}`
    const cur = agg.get(key) ?? { performer, currency: b.currency, total: 0, count: 0 }
    cur.total += Number(b.productora_share) || 0
    cur.count += 1
    agg.set(key, cur)
    grand.set(b.currency, (grand.get(b.currency) ?? 0) + (Number(b.productora_share) || 0))
  }

  const list = Array.from(agg.values()).sort((a, b) => b.total - a.total)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Mis ganancias 🔒</h1>
          <p className="text-gray-400 mt-1">Parte de la productora por comediante (de los borderós cerrados). Privado, solo vos.</p>
        </div>

        {/* Totales */}
        <div className="flex flex-wrap gap-3 mb-8">
          {Array.from(grand.entries()).map(([currency, total]) => (
            <div key={currency} className="bg-green-900/20 border border-green-800 rounded-lg p-4 min-w-[180px]">
              <p className="text-xs text-gray-400">Total productora ({currency})</p>
              <p className="text-2xl font-bold mt-1">{fmt(total, currency)}</p>
            </div>
          ))}
        </div>

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
                  <th className="text-right px-4 py-3 text-sm font-semibold">Fechas cerradas</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Ganancia productora</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">{r.performer}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-300">{r.count}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(r.total, r.currency)}</td>
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
