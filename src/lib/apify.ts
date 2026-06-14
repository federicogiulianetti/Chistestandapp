// Scraping de métricas de redes vía Apify (server-only).

const TOKEN = process.env.APIFY_API_TOKEN

export type PostMetric = {
  date: string | null
  views: number | null
  likes: number
  comments: number
  shares?: number | null
  caption: string
  url: string
}

export type PlatformMetrics = {
  followers: number | null
  totalLikes: number | null
  profilePosts: number | null
  posts: PostMetric[]
}

/** Limpia un handle: saca @, URL y espacios → solo el usuario. */
export function normalizeHandle(h: string | null | undefined): string {
  if (!h) return ''
  return h.trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').replace(/\/.*$/, '').replace(/^@/, '').trim()
}

async function runActor(actorId: string, input: unknown, retries = 1): Promise<unknown[]> {
  if (!TOKEN) throw new Error('Falta APIFY_API_TOKEN')
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${TOKEN}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
      )
      if (!res.ok) throw new Error(`Apify ${actorId}: HTTP ${res.status}`)
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      if (arr.length > 0 || attempt === retries) return arr
      // vino vacío: reintento una vez (los scrapers a veces fallan transitorio)
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr) throw lastErr
  return []
}

const num = (v: unknown): number | null => (typeof v === 'number' && !isNaN(v) ? v : null)

export async function scrapeInstagram(handle: string, limit = 30): Promise<PlatformMetrics> {
  const u = normalizeHandle(handle)
  const items = await runActor('apify~instagram-scraper', {
    directUrls: [`https://www.instagram.com/${u}/`],
    resultsType: 'posts',
    resultsLimit: limit,
    addParentData: true,
  }) as Record<string, unknown>[]
  const head = items[0] ?? {}
  const posts: PostMetric[] = items
    .filter(p => p.shortCode || p.id)
    .map(p => ({
      date: (p.timestamp as string) ?? null,
      views: num(p.videoViewCount) ?? num(p.videoPlayCount),
      likes: num(p.likesCount) ?? 0,
      comments: num(p.commentsCount) ?? 0,
      caption: ((p.caption as string) ?? '').slice(0, 500),
      url: (p.url as string) ?? '',
    }))
  return {
    followers: num(head.followersCount),
    totalLikes: null,
    profilePosts: num(head.postsCount),
    posts,
  }
}

export async function scrapeTiktok(handle: string, limit = 30): Promise<PlatformMetrics> {
  const u = normalizeHandle(handle)
  const items = await runActor('clockworks~tiktok-scraper', {
    profiles: [u],
    resultsPerPage: limit,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  }) as Record<string, unknown>[]
  const author = (items[0]?.authorMeta ?? {}) as Record<string, unknown>
  const posts: PostMetric[] = items
    .filter(v => v.id)
    .map(v => ({
      date: (v.createTimeISO as string) ?? null,
      views: num(v.playCount),
      likes: num(v.diggCount) ?? 0,
      comments: num(v.commentCount) ?? 0,
      shares: num(v.shareCount),
      caption: ((v.text as string) ?? '').slice(0, 500),
      url: (v.webVideoUrl as string) ?? '',
    }))
  return {
    followers: num(author.fans),
    totalLikes: num(author.heart),
    profilePosts: num(author.video),
    posts,
  }
}

/** Promedios de los posts recientes (views solo de los que tienen). */
export function aggregate(posts: PostMetric[]) {
  const withViews = posts.filter(p => p.views != null)
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  return {
    recent_count: posts.length,
    avg_views: avg(withViews.map(p => p.views as number)),
    avg_likes: avg(posts.map(p => p.likes)),
    avg_comments: avg(posts.map(p => p.comments)),
  }
}
