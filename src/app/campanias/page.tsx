import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile } from '@/lib/supabase/auth'
import { formatShowDate } from '@/lib/shows'
import { formatMoney } from '@/lib/sales'
import ConfirmSubmit from '@/components/ConfirmSubmit'
import { createCampaign, deleteCampaign } from './actions'

const STATUS: Record<string, string> = {
  borrador: 'bg-zinc-800 text-gray-400',
  activa: 'bg-green-900/40 text-green-300',
  pausada: 'bg-yellow-900/40 text-yellow-300',
  finalizada: 'bg-blue-900/40 text-blue-300',
}

type Campaign = {
  id: string; name: string; platform: string; budget: number | null; spent: number | null
  status: string; start_date: string | null; end_date: string | null
  show: { show_date: string | null; theater: { name: string | null } | null } | null
}

export default async function CampaniasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { profile } = await getUserAndProfile()
  const sp = await searchParams
  if (profile.role !== 'admin') {
    return <main className="min-h-screen bg-ink text-body p-8"><p className="text-red-400">Sin permisos.</p></main>
  }

  const supabase = await createClient()
  const [{ data: campData }, { data: showsData }] = await Promise.all([
    supabase.from('ad_campaigns').select('id, name, platform, budget, spent, status, start_date, end_date, show:show_id(show_date, theater:theater_id(name))').order('created_at', { ascending: false }),
    supabase.from('shows').select('id, show_date, theater:theater_id(name)').is('deleted_at', null).order('show_date', { ascending: false }),
  ])

  const campaigns = (campData ?? []) as unknown as Campaign[]
  const shows = ((showsData ?? []) as unknown as { id: string; show_date: string | null; theater: { name: string | null } | null }[])
    .map(s => ({ id: s.id, label: `${formatShowDate(s.show_date)} · ${s.theater?.name ?? '—'}` }))

  const inp = "w-full px-3 py-2 bg-surface-2 border border-line rounded-md focus:outline-none focus:border-zinc-500 text-body"

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Campañas / Ads</h1>
          <p className="text-faint mt-1">Las campañas de publicidad por fecha. (El gasto que entra al borderó se carga en el módulo Ads.)</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md">{sp.error}</div>}

        <form action={createCampaign} className="bg-surface border border-line rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-brand" /> Nueva campaña</h2>
          <input name="name" type="text" required placeholder="Nombre de la campaña" className={inp} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select name="platform" defaultValue="Meta" className={inp}>
              <option value="Meta">Meta</option>
              <option value="Google">Google</option>
              <option value="TikTok">TikTok</option>
            </select>
            <select name="status" defaultValue="activa" className={inp}>
              <option value="borrador">Borrador</option>
              <option value="activa">Activa</option>
              <option value="pausada">Pausada</option>
              <option value="finalizada">Finalizada</option>
            </select>
            <select name="show_id" className={inp}>
              <option value="">— Fecha (opcional) —</option>
              {shows.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <input name="budget" type="number" step="0.01" min="0" placeholder="Presupuesto $" className={inp} />
            <input name="spent" type="number" step="0.01" min="0" placeholder="Gastado $" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <input name="start_date" type="date" className={inp} />
              <input name="end_date" type="date" className={inp} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 bg-brand text-[#06210f] font-semibold rounded-md hover:opacity-90 transition">Crear</button>
          </div>
        </form>

        {campaigns.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">No hay campañas cargadas.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaigns.map(c => (
              <div key={c.id} className="bg-surface border border-line rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name} <span className="text-xs text-faint">· {c.platform}</span></p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint mt-1">
                    {c.budget != null && <span>Presupuesto {formatMoney(c.budget)}</span>}
                    {c.spent != null && <span>Gastado {formatMoney(c.spent)}</span>}
                    {c.start_date && <span>{c.start_date} → {c.end_date ?? '...'}</span>}
                    {c.show && <span>{c.show.theater?.name ?? formatShowDate(c.show.show_date)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-1 rounded text-xs ${STATUS[c.status] ?? STATUS.borrador}`}>{c.status}</span>
                  <form action={deleteCampaign.bind(null, c.id)}>
                    <ConfirmSubmit message={`¿Eliminar la campaña "${c.name}"?`} ariaLabel="Eliminar campaña" className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></ConfirmSubmit>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
