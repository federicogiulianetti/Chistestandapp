import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { assertModuleAccess, getAssignedComedianIds } from '@/lib/access'
import { comedianColor } from '@/lib/comedianColor'
import PerformerAvatar from '@/components/PerformerAvatar'
import type { PostMetric } from '@/lib/apify'
import { refreshComedianMetrics } from './actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Comedian = { id: string; stage_name: string | null; photo_url: string | null; instagram_handle: string | null; tiktok_handle: string | null }
type Snap = {
  comedian_id: string; platform: string; captured_at: string
  followers: number | null; total_likes: number | null; profile_posts: number | null
  avg_views: number | null; avg_likes: number | null; avg_comments: number | null
  posts: PostMetric[] | null
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  const v = Math.round(n)
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(v)
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default async function RedesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { user, profile } = await assertModuleAccess('redes')
  const sp = await searchParams
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  const { data: comData } = await supabase
    .from('comedians')
    .select('id, stage_name, photo_url, instagram_handle, tiktok_handle')
    .eq('is_active', true)
    .order('stage_name')
  let list = (comData ?? []) as Comedian[]
  if (!isAdmin) {
    const assigned = await getAssignedComedianIds(supabase, user.id)
    list = list.filter(c => assigned.has(c.id))
  }

  // Últimas 2 fotos por comediante+plataforma (para el delta)
  const byKey = new Map<string, Snap[]>()
  if (list.length) {
    const { data: snaps } = await supabase
      .from('social_metrics')
      .select('comedian_id, platform, captured_at, followers, total_likes, profile_posts, avg_views, avg_likes, avg_comments, posts')
      .in('comedian_id', list.map(c => c.id))
      .order('captured_at', { ascending: false })
    for (const s of (snaps ?? []) as Snap[]) {
      const k = `${s.comedian_id}:${s.platform}`
      const arr = byKey.get(k) ?? []
      if (arr.length < 2) arr.push(s)
      byKey.set(k, arr)
    }
  }

  const Platform = ({ comedianId, platform, handle }: { comedianId: string; platform: 'instagram' | 'tiktok'; handle: string | null }) => {
    const arr = byKey.get(`${comedianId}:${platform}`) ?? []
    const latest = arr[0]
    const prev = arr[1]
    const label = platform === 'instagram' ? 'Instagram' : 'TikTok'
    if (!handle) {
      return <div className="bg-surface border border-line rounded-xl p-4 text-faint text-sm">{label}: sin @usuario cargado en la ficha.</div>
    }
    const delta = latest?.followers != null && prev?.followers != null ? latest.followers - prev.followers : null
    const topPosts = (latest?.posts ?? []).slice().sort((a, b) => (b.views ?? b.likes) - (a.views ?? a.likes)).slice(0, 3)
    return (
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">{label} <span className="text-faint">@{handle}</span></span>
          {latest && <span className="text-[11px] text-faint">hace {daysSince(latest.captured_at)}d</span>}
        </div>
        {!latest ? (
          <p className="text-faint text-sm mt-2">Sin datos. Tocá &ldquo;Actualizar&rdquo;.</p>
        ) : (
          <>
            <div className="flex items-end gap-3 mt-2">
              <div>
                <div className="text-2xl font-bold leading-none">{fmtNum(latest.followers)}</div>
                <div className="text-[10px] uppercase tracking-wide text-faint mt-1">seguidores</div>
              </div>
              {delta != null && delta !== 0 && (
                <span className={`text-[12px] ${delta > 0 ? 'text-brand' : 'text-red-400'}`}>{delta > 0 ? '↑' : '↓'} {fmtNum(Math.abs(delta))}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div><div className="text-[13px] font-semibold">{fmtNum(latest.avg_views)}</div><div className="text-[10px] text-faint">views prom.</div></div>
              <div><div className="text-[13px] font-semibold">{fmtNum(latest.avg_likes)}</div><div className="text-[10px] text-faint">likes prom.</div></div>
              <div><div className="text-[13px] font-semibold">{fmtNum(latest.avg_comments)}</div><div className="text-[10px] text-faint">coment. prom.</div></div>
            </div>
            {topPosts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                <div className="text-[10px] uppercase tracking-wide text-faint">Top posts recientes</div>
                {topPosts.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block text-[12px] text-muted hover:text-body truncate">
                    {fmtNum(p.views)} views · {fmtNum(p.likes)} likes — {(p.caption || 'post').slice(0, 50)}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-ink text-body p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted hover:text-body text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold mt-2">Métricas de redes</h1>
          <p className="text-faint mt-1">Seguidores y engagement de Instagram y TikTok por comediante. Tocá &ldquo;Actualizar&rdquo; para traer los datos del momento (tarda unos segundos).</p>
        </div>

        {sp.error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">{sp.error}</div>}
        {sp.success && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-md mb-6">Datos actualizados ✓</div>}

        {list.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-faint">No hay comedianes para mostrar.</div>
        ) : (
          <div className="space-y-8">
            {list.map(c => {
              const color = comedianColor(c.stage_name ?? '')
              return (
                <section key={c.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <PerformerAvatar name={c.stage_name ?? '—'} photoUrl={c.photo_url} size={36} />
                    <h2 className="text-lg font-semibold">{c.stage_name}</h2>
                    <form action={refreshComedianMetrics.bind(null, c.id)} className="ml-auto">
                      <button type="submit" className="text-[12px] px-3 py-1.5 rounded-md border text-brand hover:bg-surface-2 transition-colors" style={{ borderColor: color + '66' }}>
                        Actualizar
                      </button>
                    </form>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Platform comedianId={c.id} platform="instagram" handle={c.instagram_handle} />
                    <Platform comedianId={c.id} platform="tiktok" handle={c.tiktok_handle} />
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
