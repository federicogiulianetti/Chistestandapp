'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, type Profile } from '@/lib/supabase/auth'
import {
  ACTOR, buildInput, startRun, getRunStatus, getDatasetItems, parseByPlatform, aggregate,
  normalizeHandle, type SocialPlatform,
} from '@/lib/apify'

type SB = Awaited<ReturnType<typeof createClient>>

async function canManage(supabase: SB, profile: Profile, userId: string, comedianId: string): Promise<boolean> {
  if (profile.role === 'admin') return true
  const { data } = await supabase.from('assignments').select('id').eq('producer_id', userId).eq('comedian_id', comedianId).limit(1)
  return (data?.length ?? 0) > 0
}

/** Arranca el scrape (no espera): crea las corridas de Apify y los jobs. Vuelve al toque. */
export async function refreshComedianMetrics(comedianId: string) {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()
  if (!(await canManage(supabase, profile, user.id, comedianId))) redirect('/redes?error=' + encodeURIComponent('Sin permiso'))

  const { data: c } = await supabase.from('comedians').select('instagram_handle, tiktok_handle').eq('id', comedianId).single()
  if (!c) redirect('/redes?error=' + encodeURIComponent('Comediante no encontrado'))

  // jobs ya corriendo (para no duplicar)
  const { data: running } = await supabase.from('social_jobs').select('platform').eq('comedian_id', comedianId).eq('status', 'running')
  const busy = new Set((running ?? []).map(r => r.platform as string))

  const start = async (platform: SocialPlatform, handle: string | null) => {
    const h = normalizeHandle(handle)
    if (!h || busy.has(platform)) return
    try {
      const { runId, datasetId } = await startRun(ACTOR[platform], buildInput(platform, h))
      await supabase.from('social_jobs').insert({ comedian_id: comedianId, platform, run_id: runId, dataset_id: datasetId, status: 'running', created_by: user.id })
    } catch { /* si falla el arranque, no creamos job */ }
  }
  await Promise.all([start('instagram', c.instagram_handle), start('tiktok', c.tiktok_handle)])

  revalidatePath('/redes')
  redirect('/redes?started=1')
}

/** Procesa los jobs que terminaron: trae los resultados y guarda la foto. Devuelve cuántos siguen corriendo. */
export async function checkScrape(): Promise<{ running: number }> {
  const { user, profile } = await getUserAndProfile()
  void profile
  const supabase = await createClient()

  const { data: jobs } = await supabase.from('social_jobs').select('id, comedian_id, platform, run_id, dataset_id').eq('status', 'running')
  let stillRunning = 0

  for (const j of jobs ?? []) {
    let status: string
    try { status = await getRunStatus(j.run_id as string) } catch { stillRunning++; continue }

    if (status === 'SUCCEEDED') {
      try {
        const items = await getDatasetItems(j.dataset_id as string)
        const m = parseByPlatform(j.platform as SocialPlatform, items)
        const agg = aggregate(m.posts)
        await supabase.from('social_metrics').insert({
          comedian_id: j.comedian_id, platform: j.platform,
          followers: m.followers, total_likes: m.totalLikes, profile_posts: m.profilePosts,
          recent_count: agg.recent_count, avg_views: agg.avg_views, avg_likes: agg.avg_likes, avg_comments: agg.avg_comments,
          posts: m.posts, created_by: user.id,
        })
        await supabase.from('social_jobs').update({ status: 'done' }).eq('id', j.id)
      } catch (e) {
        await supabase.from('social_jobs').update({ status: 'error', error: (e as Error).message }).eq('id', j.id)
      }
    } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      await supabase.from('social_jobs').update({ status: 'error', error: status }).eq('id', j.id)
    } else {
      stillRunning++
    }
  }

  revalidatePath('/redes')
  return { running: stillRunning }
}
