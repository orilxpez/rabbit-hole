import { describe, expect, it } from 'vitest'
import { INTERESTS } from './engine/interests'
import { SEEDS, dailySeed, dayNumber, otherSeeds, pickOnboarding, type Seed } from './seeds'

const seeds: Seed[] = [
  { title: 'A1', tag: 'art' }, { title: 'A2', tag: 'art' },
  { title: 'N1', tag: 'nature' }, { title: 'H1', tag: 'history' },
]

describe('seeds.json', () => {
  it('has about 40 seeds, all tagged with a known interest', () => {
    expect(SEEDS.length).toBeGreaterThanOrEqual(40)
    for (const s of SEEDS) expect(Object.keys(INTERESTS)).toContain(s.tag)
    expect(new Set(SEEDS.map((s) => s.title)).size).toBe(SEEDS.length)
  })
})

describe('dailySeed', () => {
  it('stays the same during a local day and rotates the next', () => {
    const morning = new Date(2026, 9, 16, 0, 5)
    const night = new Date(2026, 9, 16, 23, 55)
    const tomorrow = new Date(2026, 9, 17, 9)
    expect(dailySeed(seeds, morning)).toBe(dailySeed(seeds, night))
    expect(dayNumber(tomorrow)).toBe(dayNumber(morning) + 1)
    expect(dailySeed(seeds, tomorrow)).not.toBe(dailySeed(seeds, morning))
  })
})

describe('pickOnboarding', () => {
  it('takes one seed per interest, skipping seeds without image', () => {
    const picks = pickOnboarding(seeds, (t) => t !== 'A1', 10)
    expect(picks.map((s) => s.title)).toEqual(['H1', 'A2', 'N1'])
  })

  it('rotates which interests come first', () => {
    // INTERESTS order: architecture, history, science, art, nature...; offset 3 starts at art.
    expect(pickOnboarding(seeds, () => true, 2, 3).map((s) => s.title)).toEqual(['A1', 'N1'])
  })
})

describe('otherSeeds', () => {
  it('offers unvisited seeds, interests first', () => {
    const picks = otherSeeds(seeds, { nature: 1 }, new Set(['A1']), new Date(2026, 0, 1), 3)
    expect(picks[0].title).toBe('N1')
    expect(picks.map((s) => s.title)).not.toContain('A1')
    expect(picks).toHaveLength(3)
  })
})
