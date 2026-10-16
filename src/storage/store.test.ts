import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '../test/memoryStorage'
import {
  SCHEMA_VERSION, cacheGet, cacheSet, emptyState, loadState, migrate, saveState, type ReadingSignal,
} from './store'

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('state', () => {
  it('round-trips through localStorage', () => {
    const s = emptyState()
    s.interests.history = 1
    saveState(s)
    expect(loadState()).toEqual(s)
  })

  it('returns an empty state on first visit', () => {
    expect(loadState()).toEqual(emptyState())
  })

  it('keeps a backup when the stored document is unreadable', () => {
    localStorage.setItem('rh:state', '{not json')
    expect(loadState()).toEqual(emptyState())
    expect(localStorage.getItem('rh:state:backup')).toBe('{not json')
  })

  it('migrates v1 documents, keeping the history', () => {
    const v1 = { ...emptyState(), version: 1, interests: { art: 1 } } as any
    delete v1.lang
    v1.threads = { t: { id: 't', rootNodeId: 'n', createdAt: 1 } }
    expect(migrate(v1)).toMatchObject({
      version: 3, lang: 'en', interests: { art: 1 }, threads: { t: { id: 't', endedAt: null } },
    })
  })

  it('rejects documents from a newer schema instead of guessing', () => {
    expect(() => migrate({ version: SCHEMA_VERSION + 1 })).toThrow()
  })

  it('caps the reading-signal log', () => {
    const s = emptyState()
    const signal: ReadingSignal = {
      nodeId: 'n', activeMs: 1, maxScrollDepth: 0, reachedSuggestions: false, openedFull: false, sectionsOpened: [],
    }
    s.signals = Array.from({ length: 600 }, (_, i) => ({ ...signal, nodeId: String(i) }))
    saveState(s)
    const loaded = loadState()
    expect(loaded.signals).toHaveLength(500)
    expect(loaded.signals.at(-1)!.nodeId).toBe('599')
  })
})

describe('cache', () => {
  it('expires entries after their TTL', () => {
    cacheSet('k', { a: 1 }, 1000, 0)
    expect(cacheGet('k', 999)).toEqual({ a: 1 })
    expect(cacheGet('k', 1000)).toBeUndefined()
    expect(localStorage.getItem('rh:cache:k')).toBeNull()
  })

  it('does not persist oversized entries', () => {
    cacheSet('big', 'x'.repeat(200_000), 1000)
    expect(cacheGet('big')).toBeUndefined()
  })

  it('evicts the cache when the quota is hit, never the state', () => {
    vi.stubGlobal('localStorage', memoryStorage(2100))
    cacheSet('a', 'x'.repeat(2000), 60_000) // ~2050 chars: no room left for the state
    expect(cacheGet('a')).toBeDefined()
    const s = emptyState()
    s.interests.art = 1
    expect(saveState(s)).toBe(true)
    expect(cacheGet('a')).toBeUndefined()
    expect(loadState().interests.art).toBe(1)
  })
})
