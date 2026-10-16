import { DAY, cachedFetch, withParams } from './http'

const REST = 'https://en.wikipedia.org/api/rest_v1'
const ACTION = 'https://en.wikipedia.org/w/api.php'
const BATCH = 50 // Action API limit for titles per request

export interface Image {
  source: string
  width: number
  height: number
}

export interface Summary {
  title: string
  displaytitle: string
  description?: string
  extract: string
  extract_html: string
  thumbnail?: Image
  originalimage?: Image
  wikibase_item?: string
  type: string // 'standard' | 'disambiguation' | ...
  content_urls: { desktop: { page: string } }
}

export interface PageInfo {
  title: string
  qid: string | null
  disambiguation: boolean
  description: string | null
  thumbnail: string | null
  /** Average daily views over the last 30 days. */
  dailyViews: number
}

const pathTitle = (title: string) => encodeURIComponent(title.replaceAll(' ', '_'))

export function getSummary(title: string): Promise<Summary> {
  return cachedFetch(`${REST}/page/summary/${pathTitle(title)}`, { ttlMs: DAY })
}

/**
 * Rendered article HTML. `leadOnly` fetches just the introduction (~50 KB, with its links:
 * the REST summary has none). The full article (~1 MB) only fits in the memory cache.
 */
export async function getArticleHtml(title: string, leadOnly: boolean): Promise<string> {
  const res = await action<{ parse?: { text: string } }>({
    action: 'parse',
    page: title,
    prop: 'text',
    ...(leadOnly ? { section: 0 } : {}),
    redirects: 1,
    disableeditsection: 1,
    disablelimitreport: 1,
  })
  return res.parse?.text ?? ''
}

export interface ImageCredit {
  artist: string
  license: string
  descriptionUrl: string
}

const stripTags = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

/** Author and license of Commons/local files, keyed by file name without the "File:" prefix. */
export async function getImageCredits(fileNames: string[]): Promise<Map<string, ImageCredit>> {
  const out = new Map<string, ImageCredit>()
  for (const batch of chunk([...new Set(fileNames)], BATCH)) {
    const res = await action<{ query?: { pages?: {
      title: string
      imageinfo?: { descriptionurl: string; extmetadata?: Record<string, { value: string }> }[]
    }[] } }>({
      prop: 'imageinfo',
      iiprop: 'extmetadata|url',
      iiextmetadatafilter: 'Artist|LicenseShortName',
      titles: batch.map((f) => 'File:' + f).join('|'),
    }, 30 * DAY)
    for (const p of res.query?.pages ?? []) {
      const info = p.imageinfo?.[0]
      if (!info) continue
      out.set(p.title.replace(/^File:/, ''), {
        artist: stripTags(info.extmetadata?.Artist?.value ?? ''),
        license: info.extmetadata?.LicenseShortName?.value ?? '',
        descriptionUrl: info.descriptionurl,
      })
    }
  }
  return out
}

/** File name from an upload.wikimedia.org URL, thumbnail or original. */
export function fileNameFromUrl(url: string): string | null {
  const parts = new URL(url, 'https://upload.wikimedia.org').pathname.split('/')
  const i = parts.indexOf('thumb')
  const name = i >= 0 ? parts[i + 3] : parts.at(-1)
  return name ? decodeURIComponent(name).replaceAll('_', ' ') : null
}

function action<T>(params: Record<string, string | number>, ttlMs = DAY): Promise<T> {
  return cachedFetch(withParams(ACTION, { action: 'query', format: 'json', formatversion: 2, origin: '*', ...params }), { ttlMs })
}

interface QueryPage {
  title: string
  missing?: boolean
  pageprops?: { wikibase_item?: string; disambiguation?: string }
  description?: string
  thumbnail?: { source: string }
  pageviews?: Record<string, number | null>
  links?: { title: string }[]
}

interface QueryResponse {
  query?: {
    normalized?: { from: string; to: string }[]
    redirects?: { from: string; to: string }[]
    pages?: QueryPage[]
    search?: { title: string }[]
  }
}

/** Maps each requested title to the final page title after normalization and redirects. */
export function resolveTitles(requested: string[], res: QueryResponse): Map<string, string> {
  const step = new Map<string, string>()
  for (const { from, to } of [...(res.query?.normalized ?? []), ...(res.query?.redirects ?? [])]) step.set(from, to)
  const out = new Map<string, string>()
  for (const title of requested) {
    let t = title
    for (let hops = 0; step.has(t) && hops < 3; hops++) t = step.get(t)!
    out.set(title, t)
  }
  return out
}

export function averageViews(pageviews: Record<string, number | null> | undefined): number {
  const days = Object.values(pageviews ?? {}).filter((v): v is number => v !== null)
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Q-id, disambiguation flag, description, thumbnail and popularity for many titles, keyed by requested title. */
export async function getPageInfo(titles: string[]): Promise<Map<string, PageInfo>> {
  const out = new Map<string, PageInfo>()
  for (const batch of chunk(titles, BATCH)) {
    const res = await action<QueryResponse>({
      prop: 'pageprops|description|pageimages|pageviews',
      ppprop: 'wikibase_item|disambiguation',
      piprop: 'thumbnail',
      pithumbsize: 320,
      pilimit: BATCH,
      pvipdays: 30,
      redirects: 1,
      titles: batch.join('|'),
    })
    const pages = new Map((res.query?.pages ?? []).filter((p) => !p.missing).map((p) => [p.title, p]))
    for (const [requested, final] of resolveTitles(batch, res)) {
      const p = pages.get(final)
      if (!p) continue
      out.set(requested, {
        title: p.title,
        qid: p.pageprops?.wikibase_item ?? null,
        disambiguation: p.pageprops?.disambiguation !== undefined,
        description: p.description ?? null,
        thumbnail: p.thumbnail?.source ?? null,
        dailyViews: averageViews(p.pageviews),
      })
    }
  }
  return out
}

/** Titles from `candidates` whose article links to `target` (reciprocity signal). */
export async function getLinkingBack(candidates: string[], target: string): Promise<Set<string>> {
  const out = new Set<string>()
  for (const batch of chunk(candidates, BATCH)) {
    const res = await action<QueryResponse>({
      prop: 'links',
      pltitles: target,
      plnamespace: 0,
      pllimit: 'max',
      redirects: 1,
      titles: batch.join('|'),
    })
    for (const p of res.query?.pages ?? []) if (p.links?.length) out.add(p.title)
  }
  return out
}

/** CirrusSearch "more like this" neighbours of an article. */
export async function getMoreLike(title: string, limit = 20): Promise<string[]> {
  const res = await action<QueryResponse>({
    list: 'search',
    srsearch: `morelike:${title}`,
    srnamespace: 0,
    srlimit: limit,
    srprop: '',
  }, 7 * DAY)
  return (res.query?.search ?? []).map((s) => s.title)
}
