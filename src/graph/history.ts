import type { AppState, ChosenFrom, VisitNode } from '../storage/store'

interface Visit {
  id: string
  title: string
  qid: string | null
  chosenFrom: ChosenFrom
  now: number
}

/**
 * Records a visit. A seed starts a new thread; a link or suggestion continues the
 * current one as a child of the current node. Suggestions shown on the parent and
 * not chosen get their ignored counter bumped.
 */
export function addVisit(state: AppState, v: Visit): AppState {
  const parent = v.chosenFrom === 'seed' || !state.currentNodeId ? null : state.nodes[state.currentNodeId]
  const threadId = parent?.threadId ?? v.id
  const node: VisitNode = {
    id: v.id,
    title: v.title,
    qid: v.qid,
    visitedAt: v.now,
    parentId: parent?.id ?? null,
    threadId,
    chosenFrom: parent ? v.chosenFrom : 'seed',
    suggestionsShown: [],
    suggestionSource: null,
    chosen: null,
  }
  const nodes = { ...state.nodes, [node.id]: node }
  let ignoredCounts = state.ignoredCounts
  if (parent) {
    nodes[parent.id] = { ...parent, chosen: v.title }
    ignoredCounts = { ...ignoredCounts }
    for (const t of parent.suggestionsShown) if (t !== v.title) ignoredCounts[t] = (ignoredCounts[t] ?? 0) + 1
  }
  const threads = parent ? state.threads : { ...state.threads, [threadId]: { id: threadId, rootNodeId: node.id, createdAt: v.now } }
  return { ...state, nodes, threads, ignoredCounts, currentNodeId: node.id }
}

/** Going back to an earlier node makes it current, so the next choice branches from it. */
export function setCurrent(state: AppState, nodeId: string): AppState {
  return state.nodes[nodeId] && state.currentNodeId !== nodeId ? { ...state, currentNodeId: nodeId } : state
}

export function setSuggestionsShown(
  state: AppState, nodeId: string, titles: string[], source: VisitNode['suggestionSource'],
): AppState {
  const node = state.nodes[nodeId]
  if (!node) return state
  return { ...state, nodes: { ...state.nodes, [nodeId]: { ...node, suggestionsShown: titles, suggestionSource: source } } }
}

export function visitedTitles(state: AppState): Set<string> {
  return new Set(Object.values(state.nodes).map((n) => n.title))
}
