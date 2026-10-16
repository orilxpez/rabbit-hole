import { SCHEMA_VERSION, type AppState } from './storage/store'

// Aggregates for the hidden /debug view and the "Copiar métricas" export.
// No titles leave this function: only counts and rates.

const SESSION_GAP_MS = 30 * 60 * 1000

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null)
const round1 = (n: number) => Math.round(n * 10) / 10

export function computeMetrics(state: AppState) {
  const nodes = Object.values(state.nodes)
  const times = nodes.map((n) => n.visitedAt).sort((a, b) => a - b)
  const sessions = times.filter((t, i) => i === 0 || t - times[i - 1] > SESSION_GAP_MS).length

  const chosenFrom = { seed: 0, link: 0, suggestion: 0 }
  for (const n of nodes) chosenFrom[n.chosenFrom]++

  // How often a block of suggestions led to a click on one of them, per recommender (E1 vs E3).
  const choice = { curated: { shown: 0, chosen: 0, rate: null as number | null }, engine: { shown: 0, chosen: 0, rate: null as number | null } }
  for (const n of nodes) {
    if (!n.suggestionSource || !n.suggestionsShown.length) continue
    const c = choice[n.suggestionSource]
    c.shown++
    if (nodes.some((child) => child.parentId === n.id && child.chosenFrom === 'suggestion')) c.chosen++
  }
  for (const c of Object.values(choice)) c.rate = pct(c.chosen, c.shown)

  const signals = state.signals
  const active = signals.reduce((sum, s) => sum + s.activeMs, 0)

  return {
    schemaVersion: SCHEMA_VERSION,
    articles: nodes.length,
    threads: Object.keys(state.threads).length,
    sessions,
    articlesPerSession: sessions ? round1(nodes.length / sessions) : null,
    reachedSuggestionsPct: pct(signals.filter((s) => s.reachedSuggestions).length, signals.length),
    openedFullPct: pct(signals.filter((s) => s.openedFull).length, signals.length),
    avgActiveSeconds: signals.length ? Math.round(active / signals.length / 1000) : null,
    avgScrollDepthPct: signals.length ? Math.round((signals.reduce((s, x) => s + x.maxScrollDepth, 0) / signals.length) * 100) : null,
    chosenFrom,
    suggestionChoice: choice,
    interests: Object.keys(state.interests).length,
  }
}

export type Metrics = ReturnType<typeof computeMetrics>
