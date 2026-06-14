'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAndProfile, type Profile } from '@/lib/supabase/auth'
import { scrapeInstagram, scrapeTiktok, aggregate, normalizeHandle, type PlatformMetrics } from '@/lib/apify'

type SB = Awaited<ReturnType<typeof createClient>>

async function canManage(supabase: SB, profile: Profile, userId: string, comedianId: string): Promise<boolean> {
  if (profile.role === 'admin') return true
  const { data } = await supabase.from('assignments').select('id').eq('producer_id', userId).eq('comedian_id', comedianId).limit(1)
  return (data?.length ?? 0) > 0
}

export async function refreshComedianMetrics(comedianId: string) {
  const { user, profile } = await getUserAndProfile()
  const supabase = await createClient()
  if (!(await canManage(supabase, profile, user.id, comedianId))) redirect('/redes?error=' + encodeURIComponent('Sin permiso'))

  const { data: c } = await supabase.from('comedians').select('instagram_handle, tiktok_handle').eq('id', comedianId).single()
  if (!c) redirect('/redes?error=' + encodeURIComponent('Comediante no encontrado'))

  const errors: string[] = []
  const save = async (platform: 'instagram' | 'tiktok', handle: string | null, scraper: (h: string) => Promise<PlatformMetrics>) => {
    const h = normalizeHandle(handle)
    if (!h) return
    try {
      const m = await scraper(h)
      const agg = aggregate(m.posts)
      await supabase.from('social_metrics').insert({
        comedian_id: comedianId,
        platform,
        followers: m.followers,
        total_likes: m.totalLikes,
        profile_posts: m.profilePosts,
        recent_count: agg.recent_count,
        avg_views: agg.avg_views,
        avg_likes: agg.avg_likes,
        avg_comments: agg.avg_comments,
        posts: m.posts,
        created_by: user.id,
      })
    } catch (e) {
      errors.push(`${platform}: ${(e as Error).message}`)
    }
  }

  await Promise.all([
    save('instagram', c.instagram_handle, h => scrapeInstagram(h)),
    save('tiktok', c.tiktok_handle, h => scrapeTiktok(h)),
  ])

  revalidatePath('/redes')
  if (errors.length) redirect('/redes?error=' + encodeURIComponent(errors.join(' · ')))
  redirect('/redes?success=1')
}
