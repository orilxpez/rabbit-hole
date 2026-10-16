// The only module that touches localStorage. App state is a single versioned
// document; API cache entries live under their own prefix and are disposable.

export const SCHEMA_VERSION = 3
const STATE_KEY = 'rh:state'
const CACHE_PREFIX = 'rh:cache:'
const MAX_SIGNALS = 500
// Bigger payloads (full article HTML) stay in memory only: localStorage is ~5 MB total.
const MAX_CACHE_ENTRY_CHARS = 100_000

export type ChosenFrom = 'seed' | 'suggestion' | 'link'

/** One visit. Nodes form a tree per thread: ready for the map and for branches. */
export interface VisitNode {
  id: string
  title: string
  qid: string | null
  visitedAt: number
  parentId: string | null
  threadId: string
  chosenFrom: ChosenFrom
  suggestionsShown: string[]
  /** Which recommender produced suggestionsShown (experiment E1 vs E3). */
  suggestionSource: 'curated' | 'engine' | null
  chosen: string | null
}

export interface Thread {
  id: string
  rootNodeId: string
  createdAt: number
  /** Set when the reader stops the thread; reopening a node of it clears it. */
  endedAt: number | null
}

export interface ReadingSignal {
  nodeId: string
  activeMs: number
  maxScrollDepth: number
  reachedSuggestions: boolean
  openedFull: boolean
  sectionsOpened: string[]
}

export type Lang = 'en' | 'es'

export interface AppState {
  version: typeof SCHEMA_VERSION
  /** Interface language. Articles are always English Wikipedia. */
  lang: Lang
  interests: Record<string, number>
  nodes: Record<string, VisitNode>
  threads: Record<string, Thread>
  currentNodeId: string | null
  /** Times a title was shown as a suggestion and not chosen. */
  ignoredCounts: Record<string, number>
  signals: ReadingSignal[]
}

export function emptyState(): AppState {
  return {
    version: SCHEMA_VERSION,
    lang: 'en',
    interests: {},
    nodes: {},
    threads: {},
    currentNodeId: null,
    ignoredCounts: {},
    signals: [],
  }
}

// migrations[n] upgrades a version-n document to version n+1.
const migrations: Record<number, (old: any) => any> = {
  1: (old) => ({ ...old, version: 2, lang: 'en' }), // v2: interface language
  2: (old) => ({ // v3: threads can be stopped
    ...old,
    version: 3,
    threads: Object.fromEntries(Object.entries(old.threads).map(([id, t]: [string, any]) => [id, { ...t, endedAt: null }])),
  }),
}

export function migrate(raw: any): AppState {
  let doc = raw
  while (doc.version < SCHEMA_VERSION) {
    const step = migrations[doc.version]
    if (!step) throw new Error(`No migration from schema v${doc.version}`)
    doc = step(doc)
  }
  if (doc.version !== SCHEMA_VERSION) throw new Error(`Unknown schema v${doc.version}`)
  return doc
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STATE_KEY)
  if (!raw) return emptyState()
  try {
    return migrate(JSON.parse(raw))
  } catch (err) {
    // Never silently drop the user's history: keep the unreadable copy aside.
    console.warn('Unreadable state, starting fresh. Backup kept in rh:state:backup', err)
    safeSet('rh:state:backup', raw)
    return emptyState()
  }
}

export function saveState(state: AppState): boolean {
  const capped = state.signals.length > MAX_SIGNALS
    ? { ...state, signals: state.signals.slice(-MAX_SIGNALS) }
    : state
  return safeSet(STATE_KEY, JSON.stringify(capped))
}

interface CacheEntry {
  v: unknown
  exp: number
}

export function cacheGet(key: string, now = Date.now()): unknown | undefined {
  const raw = localStorage.getItem(CACHE_PREFIX + key)
  if (!raw) return undefined
  try {
    const entry: CacheEntry = JSON.parse(raw)
    if (entry.exp > now) return entry.v
  } catch { /* corrupt entry: fall through and drop it */ }
  localStorage.removeItem(CACHE_PREFIX + key)
  return undefined
}

export function cacheSet(key: string, value: unknown, ttlMs: number, now = Date.now()): void {
  const raw = JSON.stringify({ v: value, exp: now + ttlMs } satisfies CacheEntry)
  if (raw.length <= MAX_CACHE_ENTRY_CHARS) safeSet(CACHE_PREFIX + key, raw)
}

/** Usage summary for the /debug view. */
export function storageUsage(): { stateChars: number; cacheEntries: number; cacheChars: number } {
  let cacheEntries = 0
  let cacheChars = 0
  for (const key of cacheKeys()) {
    cacheEntries++
    cacheChars += localStorage.getItem(key)?.length ?? 0
  }
  return { stateChars: localStorage.getItem(STATE_KEY)?.length ?? 0, cacheEntries, cacheChars }
}

function cacheKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(CACHE_PREFIX)) keys.push(key)
  }
  return keys
}

// On quota errors the cache is the first thing to go: it can always be refetched.
function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    for (const k of cacheKeys()) localStorage.removeItem(k)
    try {
      localStorage.setItem(key, value)
      return true
    } catch (err) {
      console.warn(`localStorage full, could not write ${key}`, err)
      return false
    }
  }
}
