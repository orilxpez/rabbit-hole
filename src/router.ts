import { useSyncExternalStore } from 'react'
import type { ChosenFrom } from './storage/store'

// History-API routing: one real URL per article (/a/Title), so the back button,
// sharing and page-view analytics work without a router library.

export interface NavState {
  from?: ChosenFrom
  /** Set once the visit is recorded, so back/forward/reload never record it twice. */
  nodeId?: string
}

export const articlePath = (title: string) => '/a/' + encodeURIComponent(title.replaceAll(' ', '_'))

export function titleFromPath(path: string): string | null {
  const m = path.match(/^\/a\/(.+)$/)
  return m ? decodeURIComponent(m[1]).replaceAll('_', ' ') : null
}

// Navigations run inside a View Transition (native, no library). The new screen calls
// screenReady() once it has painted what matters (the reader: its hero image), so the
// shared image can morph; the timeout keeps a slow network from freezing the page.
const READY_TIMEOUT_MS = 450
let resolveReady: (() => void) | null = null

export function screenReady(): void {
  resolveReady?.()
  resolveReady = null
}

export function navigate(path: string, state: NavState = {}): void {
  const go = () => {
    history.pushState(state, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo(0, 0)
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduce) return go()
  document.startViewTransition(() => new Promise<void>((resolve) => {
    resolveReady = resolve
    setTimeout(screenReady, READY_TIMEOUT_MS)
    go()
  }))
}

/** Query string value of the current URL, e.g. ?thread=... on the map. */
export function queryParam(name: string): string | null {
  return new URLSearchParams(location.search).get(name)
}

/** onClick for in-app links: plain clicks navigate in place, modified clicks open a tab as usual. */
export function linkHandler(path: string, state: NavState) {
  return (e: { preventDefault(): void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number }) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(path, state)
  }
}

export function navState(): NavState {
  return (history.state as NavState | null) ?? {}
}

export function markVisitRecorded(nodeId: string): void {
  history.replaceState({ ...navState(), nodeId }, '')
}

const subscribe = (l: () => void) => {
  window.addEventListener('popstate', l)
  return () => window.removeEventListener('popstate', l)
}

/** Path plus query, so /map?thread=a and /map?thread=b are different screens. */
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => location.pathname + location.search)
}
