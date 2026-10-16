import { getAnchors, getFacts, type Facts } from '../api/wikidata'
import { getArticleHtml, getLinkingBack, getMoreLike, getPageInfo, getSummary } from '../api/wikipedia'
import curatedJson from '../data/curated.json'
import { visitedTitles } from '../graph/history'
import { cleanArticle, type ArticleLink, type Quote } from '../reader/cleanHtml'
import type { AppState } from '../storage/store'
import { INTERESTS, TAGS_BY_ANCHOR } from './interests'
import { isExcluded, preselectLinks, rank, selectDiverse, type Candidate, type Scored } from './rank'
import { DIRECT_PIDS, SHARED_PIDS, relationLabel } from './relations'
import { LIMITS } from './weights'

// Orchestration: fetches the data, then hands it to the pure functions in rank.ts.

const curated: Record<string, string[]> = curatedJson
const ALL_ANCHORS = Object.values(INTERESTS).flatMap((i) => i.anchors)
const ANCHORS_BUDGET_MS = 700
const wait = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

export type SuggestionSource = 'curated' | 'engine'

export interface Card {
  title: string
  description: string | null
  thumbnail: string | null
  relation: string
  /** Sentence of the current article where the link appears. */
  sentence: Quote | null
  /** Score breakdown, for debugging; absent for curated suggestions. */
  scored?: Scored
}

interface Input {
  title: string
  state: AppState
}

// The summary is only needed for the Q-id; the reader requests the same URL, so the
// HTTP layer dedupes it and both start at once instead of one after the other.
const qidOf = (title: string) => getSummary(title).then((s) => s.wikibase_item ?? null, () => null)

export async function suggest({ title, state }: Input): Promise<{ cards: Card[]; source: SuggestionSource }> {
  const visited = visitedTitles(state)
  visited.add(title)

  // Experiment E1: hand-curated suggestions win where they exist.
  if (curated[title]) {
    const [html, qid] = await Promise.all([getArticleHtml(title, true), qidOf(title)])
    const links = new Map(cleanArticle(html).links.map((l) => [l.title, l]))
    const { candidates, facts } = await enrich(curated[title], links, new Set(), state, qid, visited)
    return { cards: candidates.slice(0, LIMITS.suggestions).map((c) => toCard(c, facts)), source: 'curated' }
  }

  const [html, moreLike, qid] = await Promise.all([
    getArticleHtml(title, false),
    getMoreLike(title, LIMITS.moreLike).catch(() => [] as string[]),
    qidOf(title),
  ])
  const article = cleanArticle(html)
  const picked = preselectLinks(article.links, LIMITS.linkCandidates)
  const links = new Map(picked.map((l) => [l.title, l]))
  const titles = [...new Set([...links.keys(), ...moreLike])]
  const { candidates, facts } = await enrich(titles, links, new Set(moreLike), state, qid, visited)

  const ctx = { sectionCount: article.sections.length, interests: state.interests }
  let ranked = rank(candidates, ctx)
  const top = ranked.slice(0, LIMITS.reciprocityTopN).map((s) => s.candidate)
  const back = await getLinkingBack(top.map((c) => c.title), title).catch(() => new Set<string>())
  for (const c of top) c.linksBack = back.has(c.title)
  ranked = rank(candidates, ctx)

  const chosen = selectDiverse(ranked, state.interests, LIMITS.suggestions)
  return { cards: chosen.map((s) => ({ ...toCard(s.candidate, facts), scored: s })), source: 'engine' }
}

/** Page info, Wikidata types, relations and interest tags; drops everything excluded. */
async function enrich(
  titles: string[], links: Map<string, ArticleLink>, moreLike: Set<string>,
  state: AppState, qid: string | null, visited: Set<string>,
): Promise<{ candidates: Candidate[]; facts: Facts }> {
  const info = await getPageInfo(titles.filter((t) => !visited.has(t)))
  const seen = new Set<string>()
  const candidates: Candidate[] = []
  for (const t of titles) {
    const i = info.get(t)
    if (!i || i.disambiguation || seen.has(i.title)) continue
    seen.add(i.title)
    const c: Candidate = {
      title: i.title,
      qid: i.qid,
      description: i.description || null,
      thumbnail: i.thumbnail,
      dailyViews: i.dailyViews,
      types: [],
      tags: [],
      link: links.get(t) ?? null,
      inMoreLike: moreLike.has(t),
      linksBack: false,
      ignoredCount: state.ignoredCounts[i.title] ?? 0,
    }
    if (!isExcluded(c, visited)) candidates.push(c) // cheap filters first: fewer items for Wikidata
  }

  const qids = candidates.flatMap((c) => (c.qid ? [c.qid] : []))
  const hasProfile = Object.values(state.interests).some((v) => v > 0)
  const empty: Facts = { types: new Map(), relations: new Map() }
  // If Wikidata is down, titles and descriptions still filter years, dates, lists and countries.
  const none = new Map<string, string[]>()
  const [facts, anchors] = await Promise.all([
    getFacts(qid, qids, DIRECT_PIDS, SHARED_PIDS).catch(() => empty),
    // Interest tags take ~1.5 s on WDQS: wait a little, then rank without affinity.
    // The query keeps running and lands in the cache for the next visit.
    hasProfile ? Promise.race([getAnchors(qids, ALL_ANCHORS).catch(() => none), wait(ANCHORS_BUDGET_MS, none)]) : none,
  ])
  for (const c of candidates) {
    if (!c.qid) continue
    c.types = facts.types.get(c.qid) ?? []
    c.tags = [...new Set((anchors.get(c.qid) ?? []).flatMap((a) => TAGS_BY_ANCHOR.get(a) ?? []))]
  }
  return { candidates: candidates.filter((c) => !isExcluded(c, visited)), facts }
}

function toCard(c: Candidate, facts: Facts): Card {
  return {
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    relation: relationLabel(c.qid ? facts.relations.get(c.qid) ?? [] : []),
    sentence: c.link?.sentence ?? null,
  }
}
