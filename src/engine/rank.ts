import type { ArticleLink } from '../reader/cleanHtml'
import { EXCLUDED_TYPES } from '../api/wikidata'
import { IGNORED_DECAY, POPULARITY, POSITION, WEIGHTS } from './weights'

// Pure ranking functions. Every score is the sum of named parts so any suggestion
// can be explained from Wikipedia/Wikidata data.

export interface Candidate {
  title: string
  qid: string | null
  description: string | null
  thumbnail: string | null
  dailyViews: number
  /** Wikidata P31 values. */
  types: string[]
  /** Interest tags from interests.ts. */
  tags: string[]
  /** Where it is linked from the current article; null if it only came from morelike:. */
  link: ArticleLink | null
  inMoreLike: boolean
  linksBack: boolean
  /** Times shown as a suggestion and not chosen. */
  ignoredCount: number
}

export interface ScoreParts {
  position: number
  reciprocity: number
  moreLike: number
  popularity: number
  affinity: number
  /** Multiplier from being ignored before (1 = never ignored). */
  decay: number
}

export interface Scored {
  candidate: Candidate
  score: number
  parts: ScoreParts
}

export interface RankContext {
  /** Number of sections after the introduction. */
  sectionCount: number
  interests: Record<string, number>
}

const isSeeAlso = (l: ArticleLink) => /^see also$/i.test(l.sectionTitle ?? '')

/** Intro and "See also" links first, then body links in reading order. */
export function preselectLinks(links: ArticleLink[], max: number): ArticleLink[] {
  const priority = links.filter((l) => l.section === 0 || isSeeAlso(l))
  const body = links.filter((l) => l.section !== 0 && !isSeeAlso(l))
  return [...priority, ...body].slice(0, max)
}

export function positionScore(link: ArticleLink | null, sectionCount: number): number {
  if (!link) return 0
  if (link.section === 0) return POSITION.intro
  if (isSeeAlso(link)) return POSITION.seeAlso
  const t = sectionCount > 1 ? (link.section - 1) / (sectionCount - 1) : 0
  return POSITION.bodyFirst + (POSITION.bodyLast - POSITION.bodyFirst) * Math.min(1, t)
}

/** Trapezoid on log10(views): 0 below floor, 1 in the ideal band, 0 above the ceiling. */
export function popularityScore(dailyViews: number): number {
  const l = Math.log10(Math.max(dailyViews, 1))
  const [floor, lo, hi, ceil] = [POPULARITY.floor, POPULARITY.idealMin, POPULARITY.idealMax, POPULARITY.ceiling].map(Math.log10)
  if (l <= floor || l >= ceil) return 0
  if (l < lo) return (l - floor) / (lo - floor)
  if (l > hi) return (ceil - l) / (ceil - hi)
  return 1
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const EXCLUDED_TITLES = [
  /^\d{1,4}s?( (BC|BCE|AD|CE))?$/i, // 1969, 1960s, 44 BC
  /^(AD|BC) \d{1,4}$/i,
  /^\d{1,2}(st|nd|rd|th) (century|millennium)( (BC|BCE|AD|CE))?$/i,
  new RegExp(`^(${MONTHS}) \\d{1,2}$`), // July 20
  new RegExp(`^(${MONTHS}) \\d{4}$`), // July 1969
  /^(lists?|index|outline|timeline) of /i,
]
// Fallback when Wikidata types are unavailable: Wikipedia short descriptions are standardized for these.
const EXCLUDED_DESCRIPTIONS = /^(country|sovereign state|calendar year|year|decade|century|day of the year|topics referred to by the same term)\b/i

export function isExcluded(c: Candidate, visited: Set<string>): boolean {
  return visited.has(c.title)
    || EXCLUDED_TITLES.some((re) => re.test(c.title))
    || EXCLUDED_DESCRIPTIONS.test(c.description ?? '')
    || c.types.some((t) => t in EXCLUDED_TYPES)
}

export function affinityScore(tags: string[], interests: Record<string, number>): number {
  const max = Math.max(0, ...Object.values(interests))
  if (!max) return 0
  return Math.max(0, ...tags.map((t) => interests[t] ?? 0)) / max
}

export function scoreCandidate(c: Candidate, ctx: RankContext): Scored {
  const parts: ScoreParts = {
    position: WEIGHTS.position * positionScore(c.link, ctx.sectionCount),
    reciprocity: c.linksBack ? WEIGHTS.reciprocity : 0,
    moreLike: c.inMoreLike ? WEIGHTS.moreLike : 0,
    popularity: WEIGHTS.popularity * popularityScore(c.dailyViews),
    affinity: WEIGHTS.affinity * affinityScore(c.tags, ctx.interests),
    decay: IGNORED_DECAY ** c.ignoredCount,
  }
  const sum = parts.position + parts.reciprocity + parts.moreLike + parts.popularity + parts.affinity
  return { candidate: c, score: sum * parts.decay, parts }
}

/** Best first. */
export function rank(candidates: Candidate[], ctx: RankContext): Scored[] {
  return candidates.map((c) => scoreCandidate(c, ctx)).sort((a, b) => b.score - a.score)
}

const sharesType = (a: Candidate, b: Candidate) => a.types.some((t) => b.types.includes(t))
const inProfile = (c: Candidate, interests: Record<string, number>) => c.tags.some((t) => (interests[t] ?? 0) > 0)

/**
 * Picks `n` from a ranked list: no two with the same P31 when there is an
 * alternative, and at least one outside the reader's interests when possible.
 */
export function selectDiverse(ranked: Scored[], interests: Record<string, number>, n: number): Scored[] {
  const picked: Scored[] = []
  for (const s of ranked) {
    if (picked.length < n && !picked.some((p) => sharesType(p.candidate, s.candidate))) picked.push(s)
  }
  for (const s of ranked) {
    if (picked.length < n && !picked.includes(s)) picked.push(s)
  }
  picked.sort((a, b) => b.score - a.score)

  const hasProfile = Object.values(interests).some((v) => v > 0)
  if (hasProfile && picked.length && picked.every((p) => inProfile(p.candidate, interests))) {
    const rest = picked.slice(0, -1)
    const outside = ranked.filter((s) => !picked.includes(s) && !inProfile(s.candidate, interests))
    const pick = outside.find((s) => !rest.some((p) => sharesType(p.candidate, s.candidate))) ?? outside[0]
    if (pick) return [...rest, pick]
  }
  return picked
}
