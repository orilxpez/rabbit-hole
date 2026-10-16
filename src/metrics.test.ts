import { describe, expect, it } from 'vitest'
import { addVisit, recordSignal, setSuggestionsShown } from './graph/history'
import { computeMetrics } from './metrics'
import { emptyState } from './storage/store'

const MIN = 60_000

describe('computeMetrics', () => {
  it('is empty-safe', () => {
    const m = computeMetrics(emptyState())
    expect(m).toMatchObject({ articles: 0, sessions: 0, articlesPerSession: null, reachedSuggestionsPct: null })
  })

  it('counts sessions, chaining and suggestion choice per source', () => {
    let s = addVisit(emptyState(), { id: 'a', title: 'A', qid: null, chosenFrom: 'seed', now: 0 })
    s = setSuggestionsShown(s, 'a', ['B', 'X'], 'engine')
    s = addVisit(s, { id: 'b', title: 'B', qid: null, chosenFrom: 'suggestion', now: 5 * MIN })
    s = setSuggestionsShown(s, 'b', ['Y'], 'engine')
    // 2 hours later: a new session
    s = addVisit(s, { id: 'c', title: 'C', qid: null, chosenFrom: 'seed', now: 125 * MIN })
    s = setSuggestionsShown(s, 'c', ['Z'], 'curated')
    const base = { maxScrollDepth: 0.5, openedFull: false, sectionsOpened: [] }
    s = recordSignal(s, { ...base, nodeId: 'a', activeMs: 30_000, reachedSuggestions: true })
    s = recordSignal(s, { ...base, nodeId: 'b', activeMs: 10_000, reachedSuggestions: false })

    const m = computeMetrics(s)
    expect(m.sessions).toBe(2)
    expect(m.articlesPerSession).toBe(1.5)
    expect(m.threads).toBe(2)
    expect(m.reachedSuggestionsPct).toBe(50)
    expect(m.avgActiveSeconds).toBe(20)
    expect(m.chosenFrom).toEqual({ seed: 2, link: 0, suggestion: 1 })
    expect(m.suggestionChoice.engine).toEqual({ shown: 2, chosen: 1, rate: 50 })
    expect(m.suggestionChoice.curated).toEqual({ shown: 1, chosen: 0, rate: 0 })
    expect(JSON.stringify(m)).not.toMatch(/"[ABC]"/) // no titles in the export
  })
})
