import { describe, expect, it } from 'vitest'
import type { ArticleLink } from '../reader/cleanHtml'
import {
  isExcluded, popularityScore, positionScore, preselectLinks, rank, selectDiverse, type Candidate,
} from './rank'
import { relationLabel } from './relations'

const link = (title: string, section: number, sectionTitle: string | null = null): ArticleLink =>
  ({ title, section, sectionTitle, sentence: null })

const cand = (title: string, over: Partial<Candidate> = {}): Candidate => ({
  title,
  qid: 'Q' + title.length,
  description: null,
  thumbnail: null,
  dailyViews: 500,
  types: [],
  tags: [],
  link: null,
  inMoreLike: false,
  linksBack: false,
  ignoredCount: 0,
  ...over,
})

describe('preselectLinks', () => {
  it('keeps intro and See also links, then body links in reading order', () => {
    const links = [link('A', 0), link('E', 0), link('B', 1), link('C', 2), link('D', 3, 'See also')]
    expect(preselectLinks(links, 4).map((l) => l.title)).toEqual(['A', 'E', 'D', 'B'])
  })
})

describe('positionScore', () => {
  it('ranks intro > early body > late body, See also and morelike-only', () => {
    const intro = positionScore(link('a', 0), 5)
    const early = positionScore(link('a', 1), 5)
    const late = positionScore(link('a', 5), 5)
    const seeAlso = positionScore(link('a', 4, 'See also'), 5)
    expect(intro).toBeGreaterThan(early)
    expect(early).toBeGreaterThan(late)
    expect(early).toBeGreaterThan(seeAlso)
    expect(positionScore(null, 5)).toBe(0)
  })
})

describe('popularityScore', () => {
  it('penalizes obscure pages and huge hubs', () => {
    expect(popularityScore(3)).toBe(0)
    expect(popularityScore(1000)).toBe(1)
    expect(popularityScore(200_000)).toBe(0)
    expect(popularityScore(30)).toBeGreaterThan(0)
    expect(popularityScore(30)).toBeLessThan(1)
  })
})

describe('isExcluded', () => {
  const none = new Set<string>()
  it.each([
    ['years', cand('1969')], ['BC years', cand('44 BC')], ['decades', cand('1960s')],
    ['centuries', cand('20th century')], ['dates', cand('July 20')], ['lists', cand('List of mosques')],
    ['country by P31', cand('France', { types: ['Q6256', 'Q3624078'] })],
    ['sovereign state by P31', cand('Japan', { types: ['Q3624078'] })],
    ['list by P31', cand('Lists of mosques', { types: ['Q13406463'] })],
    ['country by description when Wikidata is down', cand('Germany', { description: 'Country in Central Europe' })],
    ['calendar year by description', cand('MCMLXIX', { description: 'Calendar year' })],
  ])('excludes %s', (_, c) => expect(isExcluded(c, none)).toBe(true))

  it('excludes visited articles', () => expect(isExcluded(cand('Dome'), new Set(['Dome']))).toBe(true))
  it('keeps regular articles', () => {
    expect(isExcluded(cand('Pendentive', { types: ['Q1370598'], description: 'Architectural element' }), none)).toBe(false)
    expect(isExcluded(cand('Apollo 11'), none)).toBe(false)
  })
})

describe('rank', () => {
  const ctx = { sectionCount: 5, interests: {} }

  it('rewards reciprocity, morelike and intro position', () => {
    const plain = cand('Plain', { link: link('Plain', 3) })
    const ranked = rank([
      plain,
      { ...plain, title: 'Back', linksBack: true },
      { ...plain, title: 'Similar', inMoreLike: true },
      { ...plain, title: 'Intro', link: link('Intro', 0) },
    ], ctx)
    expect(ranked.at(-1)!.candidate.title).toBe('Plain')
    expect(ranked[0].parts.reciprocity + ranked[0].parts.position + ranked[0].parts.moreLike).toBeGreaterThan(0)
  })

  it('pushes a suggestion that keeps being ignored out of the top positions', () => {
    const strong = cand('Strong', { link: link('Strong', 0), inMoreLike: true })
    const weaker = [1, 2, 3].map((i) => cand('Weaker' + i, { link: link('W', 2) }))
    const top = (ignored: number) =>
      rank([{ ...strong, ignoredCount: ignored }, ...weaker], ctx).findIndex((s) => s.candidate.title === 'Strong')
    expect(top(0)).toBe(0)
    expect(top(4)).toBe(3)
  })

  it('adds affinity for the reader interests', () => {
    const ranked = rank([cand('Art', { tags: ['art'] }), cand('Rock', { tags: ['nature'] })], { ...ctx, interests: { nature: 1 } })
    expect(ranked[0].candidate.title).toBe('Rock')
  })
})

describe('selectDiverse', () => {
  const scored = (c: Candidate, score: number) => ({ candidate: c, score, parts: {} as never })

  it('avoids two suggestions with the same P31 when there is an alternative', () => {
    const picked = selectDiverse([
      scored(cand('Church A', { types: ['Q16970'] }), 5),
      scored(cand('Church B', { types: ['Q16970'] }), 4),
      scored(cand('Mosaic', { types: ['Q133067'] }), 3),
    ], {}, 2)
    expect(picked.map((s) => s.candidate.title)).toEqual(['Church A', 'Mosaic'])
  })

  it('repeats a type when there is no alternative', () => {
    const picked = selectDiverse([
      scored(cand('A', { types: ['Q1'] }), 2),
      scored(cand('B', { types: ['Q1'] }), 1),
    ], {}, 2)
    expect(picked).toHaveLength(2)
  })

  it('includes one suggestion outside the interests when possible', () => {
    const interests = { art: 1 }
    const picked = selectDiverse([
      scored(cand('A', { tags: ['art'], types: ['Q1'] }), 5),
      scored(cand('B', { tags: ['art'], types: ['Q2'] }), 4),
      scored(cand('C', { tags: ['art'], types: ['Q3'] }), 3),
      scored(cand('Out', { tags: ['nature'], types: ['Q4'] }), 1),
    ], interests, 3)
    expect(picked.map((s) => s.candidate.title)).toEqual(['A', 'B', 'Out'])
  })
})

describe('relationLabel', () => {
  it('prefers direct statements, then shared values, then the default', () => {
    expect(relationLabel([{ pid: 'P131', dir: 'shared' }, { pid: 'P84', dir: 'from' }])).toBe('Arquitecto')
    expect(relationLabel([{ pid: 'P170', dir: 'to' }])).toBe('Obra')
    expect(relationLabel([{ pid: 'P135', dir: 'shared' }])).toBe('Mismo movimiento')
    expect(relationLabel([{ pid: 'P140', dir: 'to' }])).toBe('Relacionado')
    expect(relationLabel([])).toBe('Relacionado')
  })
})
