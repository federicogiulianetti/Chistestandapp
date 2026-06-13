import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, roleLabels, type UserRole } from '@/lib/supabase/auth'
import { balancesByCurrency, fmt, type Movement } from '@/lib/accounts'
import { buildRateLookup, usdBalances, fmtUsd, type UsdRate } from '@/lib/usd'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'

function balanceText(movs: Movement[]): string {
  const bals = balancesByCurrency(movs)
  if (bals.length === 0) return '—'
  return bals.map(b => fmt(b.balance, b.currency)).join(' · ')
}

type CardRow = { id: string; name: string; sub?: string; photo?: string | null; movs: Movement[] }

function CardGrid({ title, rows, basePath, rateFor }: { title: string; rows: CardRow[]; basePath: string; rateFor: (d: string | null) => number | null }) {
  return (
    <section className="mb-10">
      <h2 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-faint mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-faint text-sm">Sin registros.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {rows.map(r => {
            const color = comedianColor(r.name)
            return (
              <Link
                key={r.id}
                href={`${basePath}/${r.id}`}
                className="group bg-surface border border-line border-t-2 rounded-b-xl p-4 transition-colors hover:bg-surface-2"
                style={{ borderTopColor: color }}
              >
                <PerformerAvatar name={r.name} photoUrl={r.photo} size={44} />
                <div className="text-[14px] font-semibold mt-3 truncate text-body">{r.name}</div>
                {r.sub && <div className="text-[11px] text-faint truncate">{r.sub}</div>}
                <div className="mt-3 pt-3 border-t border-line">
                  <div className="text-[10px] uppercase tracking-wide text-faint">Falta cobrar</div>
                  <div className="text-[13px] font-semibold text-body">{balanceText(r.movs)}</div>
                  <div className="text-[11px] text-muted mt-1">{fmtUsd(usdBalances(r.movs, rateFor).saldo)} <span className="text-faint">USD real</span></div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default async function CuentasPage() {
  const { profile } = await getUserAndProfile()

  if (profile.role !== 'admin') {
    return (
      <main className="min-h-screen bg-ink text-body p-8">
        <p className="text-red-400">No tenés permisos para ver las cuentas.</p>
      </main>
    )
  }

  const supabase = await createClient()
  const [{ data: comedians }, { data: profiles }, { data: movements }, { data: rateData }] = await Promise.all([
    supabase.from('comedians').select('id, stage_name, photo_url').order('stage_name'),
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

  const comedianRows: CardRow[] = (comedians ?? []).map(c => ({
    id: c.id, name: c.stage_name ?? 'Sin nombre', photo: c.photo_url, movs: byParty.get(`comedian:${c.id}`) ?? [],
  }))
  const profileRows: CardRow[] = (profiles ?? []).map(p => ({
    id: p.id, name: p.full_name || p.email, sub: roleLabels[p.role as UserRole], movs: byParty.get(`profile:${p.id}`) ?? [],
  }))

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Cuentas corrientes</h1>
          <p className="text-faint mt-1">Lo que cada persona ganó (borderós) menos lo cobrado = lo que falta pagarle.</p>
        </div>

        <CardGrid title="Comediantes" rows={comedianRows} basePath="/cuentas/comedian" rateFor={rateFor} />
        <CardGrid title="Equipo" rows={profileRows} basePath="/cuentas/profile" rateFor={rateFor} />
      </div>
    </main>
  )
}
