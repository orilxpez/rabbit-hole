import { useEffect, useRef, type RefObject } from 'react'
import { getAnchors } from '../api/wikidata'
import { INTERESTS, TAGS_BY_ANCHOR } from '../engine/interests'
import { READING } from '../engine/weights'
import { nudgeInterests, recordSignal } from '../graph/history'
import { getState, update } from '../state'
import type { ReadingSignal } from '../storage/store'

const FLUSH_EVERY_MS = 10_000
const ALL_ANCHORS = Object.values(INTERESTS).flatMap((i) => i.anchors)

/**
 * Measures how the article is read: active time (paused while the tab is hidden),
 * deepest scroll point, whether the suggestions came into view, full article and
 * sections opened. Persisted every few seconds and when the page is hidden or left.
 */
export function useReadingSignals(nodeId: string | null, qid: string | null, articleRef: RefObject<HTMLElement | null>) {
  const signal = useRef<ReadingSignal | null>(null)

  useEffect(() => {
    if (!nodeId) return
    // A revisit keeps accumulating on the same signal.
    const s: ReadingSignal = getState().signals.find((x) => x.nodeId === nodeId)
      ?? { nodeId, activeMs: 0, maxScrollDepth: 0, reachedSuggestions: false, openedFull: false, sectionsOpened: [] }
    signal.current = s
    let nudged = s.activeMs >= READING.nudgeAfterMs
    let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null

    const measure = () => {
      const el = articleRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const depth = rect.height ? (innerHeight - rect.top) / rect.height : 0
        s.maxScrollDepth = Math.max(s.maxScrollDepth, Math.min(1, Math.max(0, depth)))
      }
      const sug = document.querySelector('.suggestions')
      if (sug && sug.getBoundingClientRect().top < innerHeight) s.reachedSuggestions = true
    }

    const flush = () => {
      const now = Date.now()
      if (visibleSince !== null) {
        s.activeMs += now - visibleSince
        visibleSince = now
      }
      measure()
      update((st) => recordSignal(st, { ...s, sectionsOpened: [...s.sectionsOpened] }))
      if (!nudged && qid && s.activeMs >= READING.nudgeAfterMs) {
        nudged = true
        getAnchors([qid], ALL_ANCHORS)
          .then((anchors) => {
            const tags = [...new Set((anchors.get(qid) ?? []).flatMap((a) => TAGS_BY_ANCHOR.get(a) ?? []))]
            if (tags.length) update((st) => ({ ...st, interests: nudgeInterests(st.interests, tags) }))
          })
          .catch(() => {})
      }
    }

    let frame = 0
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush() // counts time up to now, then pauses
      visibleSince = document.visibilityState === 'visible' ? Date.now() : null
    }

    addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    addEventListener('pagehide', flush)
    const timer = setInterval(flush, FLUSH_EVERY_MS)
    return () => {
      flush()
      clearInterval(timer)
      cancelAnimationFrame(frame)
      removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      removeEventListener('pagehide', flush)
    }
  }, [nodeId, qid, articleRef])

  return {
    openedFull: () => { if (signal.current) signal.current.openedFull = true },
    openedSection: (title: string) => {
      const s = signal.current
      if (s && !s.sectionsOpened.includes(title)) s.sectionsOpened.push(title)
    },
  }
}
