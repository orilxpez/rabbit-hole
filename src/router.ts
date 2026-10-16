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

export function navigate(path: string, state: NavState = {}): void {
  history.pushState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
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

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => location.pathname)
}
