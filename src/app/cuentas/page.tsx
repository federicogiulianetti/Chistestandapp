import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, roleLabels, type UserRole } from '@/lib/supabase/auth'
import { balancesByCurrency, fmt, type Movement } from '@/lib/accounts'
import { buildRateLookup, usdBalances, fmtUsd, type UsdRate } from '@/lib/usd'

function balanceText(movs: Movement[]): string {
  const bals = balancesByCurrency(movs)
  if (bals.length === 0) return '—'
  return bals.map(b => fmt(b.balance, b.currency)).join(' · ')
}

function Table({ title, rows, basePath, rateFor }: { title: string; rows: { id: string; name: string; sub?: string; movs: Movement[] }[]; basePath: string; rateFor: (d: string | null) => number | null }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-gray-500 text-sm">Sin registros.</p>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold">Persona</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Falta cobrar</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">USD real</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    {r.sub && <div className="text-xs text-gray-400">{r.sub}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{balanceText(r.movs)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">{fmtUsd(usdBalances(r.movs, rateFor).saldo)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`${basePath}/${r.id}`} className="text-blue-400 hover:underline text-sm">Ver cuenta</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default async function CuentasPage() {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-red-400">No tenés permisos para ver las cuentas.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const [{ data: comedians }, { data: profiles }, { data: movements }, { data: rateData }] = await Promise.all([
    supabase.from('comedians').select('id, stage_name').order('stage_name'),
    supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
    supabase.from('account_movements').select('id, party_type, party_id, direction, amount, currency, movement_date, concept, source, show_id'),
    supabase.from('usd_rates').select('rate_date, blue_sell, oficial_sell'),
  ])
  const rateFor = buildRateLookup((rateData ?? []) as UsdRate[])

  const movs = (movements ?? []) as Movement[]
  const byParty = new Map<string, Movement[]>()
  for (const m of movs) {
    const k = `${m.party_type}:${m.party_id}`
    const arr = byParty.get(k) ?? []
    arr.push(m)
    byParty.set(k, arr)
  }

  const comedianRows = (comedians ?? []).map(c => ({
    id: c.id, name: c.stage_name ?? 'Sin nombre', movs: byParty.get(`comedian:${c.id}`) ?? [],
  }))
  const profileRows = (profiles ?? []).map(p => ({
    id: p.id, name: p.full_name || p.email, sub: roleLabels[p.role as UserRole], movs: byParty.get(`profile:${p.id}`) ?? [],
  }))

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2">Cuentas corrientes</h1>
          <p className="text-gray-400 mt-1">Lo que cada persona ganó (borderós) menos lo cobrado = lo que falta pagarle.</p>
        </div>

        <Table title="🎤 Comediantes" rows={comedianRows} basePath="/cuentas/comedian" rateFor={rateFor} />
        <Table title="👥 Equipo" rows={profileRows} basePath="/cuentas/profile" rateFor={rateFor} />
      </div>
    </main>
  )
}
