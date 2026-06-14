// Scraping de métricas de redes vía Apify (server-only, modo async).

const TOKEN = process.env.APIFY_API_TOKEN
const API = 'https://api.apify.com/v2'

export const SOCIAL_POST_LIMIT = 50
export const ACTOR = { instagram: 'apify~instagram-scraper', tiktok: 'clockworks~tiktok-scraper' } as const
export type SocialPlatform = 'instagram' | 'tiktok'

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

export function normalizeHandle(h: string | null | undefined): string {
  if (!h) return ''
  return h.trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').replace(/\/.*$/, '').replace(/^@/, '').trim()
}

const num = (v: unknown): number | null => (typeof v === 'number' && !isNaN(v) ? v : null)

export function buildInput(platform: SocialPlatform, handle: string, limit = SOCIAL_POST_LIMIT): unknown {
  const u = normalizeHandle(handle)
  if (platform === 'instagram') {
    return { directUrls: [`https://www.instagram.com/${u}/`], resultsType: 'posts', resultsLimit: limit, addParentData: true }
  }
  return { profiles: [u], resultsPerPage: limit, shouldDownloadVideos: false, shouldDownloadCovers: false }
}

/** Arranca una corrida del actor (no espera). Devuelve runId + datasetId. */
export async function startRun(actor: string, input: unknown): Promise<{ runId: string; datasetId: string }> {
  if (!TOKEN) throw new Error('Falta APIFY_API_TOKEN')
  const res = await fetch(`${API}/acts/${actor}/runs?token=${TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Apify start ${actor}: HTTP ${res.status}`)
  const d = (await res.json()).data
  return { runId: d.id, datasetId: d.defaultDatasetId }
}

/** Estado de una corrida: READY | RUNNING | SUCCEEDED | FAILED | TIMED-OUT | ABORTED */
export async function getRunStatus(runId: string): Promise<string> {
  if (!TOKEN) throw new Error('Falta APIFY_API_TOKEN')
  const res = await fetch(`${API}/actor-runs/${runId}?token=${TOKEN}`)
  if (!res.ok) throw new Error(`Apify run ${runId}: HTTP ${res.status}`)
  return (await res.json()).data.status as string
}

export async function getDatasetItems(datasetId: string): Promise<Record<string, unknown>[]> {
  if (!TOKEN) throw new Error('Falta APIFY_API_TOKEN')
  const res = await fetch(`${API}/datasets/${datasetId}/items?token=${TOKEN}&clean=true`)
  if (!res.ok) throw new Error(`Apify dataset ${datasetId}: HTTP ${res.status}`)
  const d = await res.json()
  return Array.isArray(d) ? d : []
}

export function parseInstagram(items: Record<string, unknown>[]): PlatformMetrics {
  const head = items[0] ?? {}
  const posts: PostMetric[] = items.filter(p => p.shortCode || p.id).map(p => ({
    date: (p.timestamp as string) ?? null,
    views: num(p.videoViewCount) ?? num(p.videoPlayCount),
    likes: num(p.likesCount) ?? 0,
    comments: num(p.commentsCount) ?? 0,
    caption: ((p.caption as string) ?? '').slice(0, 500),
    url: (p.url as string) ?? '',
  }))
  return { followers: num(head.followersCount), totalLikes: null, profilePosts: num(head.postsCount), posts }
}

export function parseTiktok(items: Record<string, unknown>[]): PlatformMetrics {
  const author = (items[0]?.authorMeta ?? {}) as Record<string, unknown>
  const posts: PostMetric[] = items.filter(v => v.id).map(v => ({
    date: (v.createTimeISO as string) ?? null,
    views: num(v.playCount),
    likes: num(v.diggCount) ?? 0,
    comments: num(v.commentCount) ?? 0,
    shares: num(v.shareCount),
    caption: ((v.text as string) ?? '').slice(0, 500),
    url: (v.webVideoUrl as string) ?? '',
  }))
  return { followers: num(author.fans), totalLikes: num(author.heart), profilePosts: num(author.video), posts }
}

export function parseByPlatform(platform: SocialPlatform, items: Record<string, unknown>[]): PlatformMetrics {
  return platform === 'instagram' ? parseInstagram(items) : parseTiktok(items)
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
