import seedsJson from './data/seeds.json'
import { INTERESTS } from './engine/interests'

export interface Seed {
  title: string
  tag: string
}

export const SEEDS: Seed[] = seedsJson

const DAY_MS = 24 * 60 * 60 * 1000

/** Days since 1970-01-01 in the reader's local calendar, so the seed changes at local midnight. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

export function dailySeed(seeds: Seed[], date: Date): Seed {
  return seeds[dayNumber(date) % seeds.length]
}

/** One seed per interest (the first with an image), up to n; `offset` rotates which interests come first. */
export function pickOnboarding(seeds: Seed[], hasImage: (title: string) => boolean, n: number, offset = 0): Seed[] {
  const tags = Object.keys(INTERESTS)
  const start = offset % tags.length
  const picks: Seed[] = []
  for (const tag of [...tags.slice(start), ...tags.slice(0, start)]) {
    const seed = seeds.find((s) => s.tag === tag && hasImage(s.title))
    if (seed) picks.push(seed)
  }
  return picks.slice(0, n)
}

/** Unvisited seeds for a new thread, matching the reader's interests first, rotating daily. */
export function otherSeeds(seeds: Seed[], interests: Record<string, number>, visited: Set<string>, date: Date, n: number): Seed[] {
  const offset = dayNumber(date) % seeds.length
  const rotated = [...seeds.slice(offset), ...seeds.slice(0, offset)].filter((s) => !visited.has(s.title))
  const liked = (s: Seed) => (interests[s.tag] ?? 0) > 0
  return [...rotated.filter(liked), ...rotated.filter((s) => !liked(s))].slice(0, n)
}
