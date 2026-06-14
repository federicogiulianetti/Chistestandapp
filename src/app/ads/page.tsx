import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { formatShowDate } from '@/lib/shows'
import AdsGrid, { AdRow } from '@/components/AdsGrid'
import { saveAdSpend } from './actions'

type RawShow = {
  id: string
  show_date: string | null
  performer_type: string | null
  comedian_id: string | null
  comedian: { stage_name: string | null } | null
  ensemble: { name: string | null } | null
  theater: { name: string | null } | null
  ad_spend: { platform: string; amount: number }[] | null
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { user, profile } = await assertModuleAccess('ads')
  const sp = await searchParams
  const isAdmin = profile.role === 'admin'

  const supabase = await createClient()
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, performer_type, comedian_id, comedian:comedian_id(stage_name), ensemble:ensemble_id(name), theater:theater_id(name), ad_spend(platform, amount)')
    .is('deleted_at', null)
    .order('show_date', { ascending: false })

  let rawShows = (data ?? []) as unknown as RawShow[]
  if (!isAdmin) {
    const assigned = await getAssignedComedianIds(supabase, user.id)
    rawShows = rawShows.filter(s => s.comedian_id != null && assigned.has(s.comedian_id))
  }

  const rows: AdRow[] = rawShows.map(s => {
    const performer = s.performer_type === 'elenco' ? (s.ensemble?.name ?? '—') : (s.comedian?.stage_name ?? '—')
    const meta = s.ad_spend?.find(a => a.platform === 'Meta')?.amount
    const google = s.ad_spend?.find(a => a.platform === 'Google')?.amount
    return {
      id: s.id,
      label: `${formatShowDate(s.show_date)} — ${performer} — ${s.theater?.name ?? '—'}`,
      meta: meta != null ? String(meta) : '',
      google: google != null ? String(google) : '',
    }
  })

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Ads / Publicidad</h1>
          <p className="text-faint mt-1">Gasto de pauta (Meta / Google) por fecha. El borderó le suma el 30% de impuestos digitales.</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6">Ads guardados</div>}

        {rows.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">
            No hay fechas cargadas.
          </div>
        ) : (
          <AdsGrid action={saveAdSpend} rows={rows} />
        )}
      </div>
    </main>
  )
}
