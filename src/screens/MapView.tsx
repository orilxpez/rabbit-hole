import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { getSummary } from '../api/wikipedia'
import { layoutThread } from '../graph/layout'
import { pathTo } from '../graph/history'
import { useT } from '../i18n'
import { articlePath, linkHandler, navigate, queryParam } from '../router'
import { useAppState } from '../state'
import type { VisitNode } from '../storage/store'
import { Display, Thumb } from '../ui'

// Grid of the drawing, in CSS pixels. A node is a framed thumbnail plus its caption.
const COL_W = 168
const ROW_H = 208
const NODE_H = 150
const NODE_W = 140
const DRAW_MS = 650 // the whole thread draws in about this long, whatever its size

export function MapView() {
  const t = useT()
  const state = useAppState()
  const [thumbs, setThumbs] = useState<Map<string, string | null>>(new Map())

  const threads = Object.values(state.threads).sort((a, b) => b.createdAt - a.createdAt)
  const id = queryParam('thread') ?? pathTo(state, state.currentNodeId)[0]?.threadId ?? threads[0]?.id
  const thread = id ? state.threads[id] : undefined
  const nodes = Object.values(state.nodes).filter((n) => n.threadId === id)
  const placed = thread ? layoutThread(nodes, thread.rootNodeId) : []

  // Every node was read, so its summary (and lead image) is already in the cache: no network.
  const titlesKey = [...new Set(nodes.map((n) => n.title))].join('|')
  useEffect(() => {
    if (!titlesKey) return
    Promise.all(titlesKey.split('|').map((t) => getSummary(t).then((s) => [t, s.thumbnail?.source ?? null] as const, () => [t, null] as const)))
      .then((pairs) => setThumbs(new Map(pairs)))
  }, [titlesKey])

  if (!thread || !placed.length) {
    return (
      <main className="page">
        <p className="lede">{t('mapEmpty')}</p>
        <a className="button primary" href="/" onClick={linkHandler('/', {})}>{t('startNew')}</a>
      </main>
    )
  }

  const pos = new Map(placed.map((p) => [p.node.id, p]))
  const cols = Math.max(...placed.map((p) => p.col)) + 1
  const rows = Math.max(...placed.map((p) => p.row)) + 1
  const step = Math.min(90, DRAW_MS / placed.length)
  const byTime = [...nodes].sort((a, b) => a.visitedAt - b.visitedAt)
  const last = byTime.at(-1)!
  const open = !thread.endedAt
  const here = open ? state.currentNodeId : null

  const goTo = (n: VisitNode) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    e.currentTarget.querySelector<HTMLElement>('img')?.style.setProperty('view-transition-name', 'hero')
    navigate(articlePath(n.title), { nodeId: n.id }) // revisiting a node reopens the thread from there
  }

  return (
    <main className="page map-page">
      <Display text={nodes.length === 1 ? t('mapTitleOne') : t('mapTitle', { n: nodes.length })} />
      <p className="lede">{t('mapFromTo', { from: byTime[0].title, to: last.title })}</p>

      <div className="map-scroll">
        <div className="map" style={{ width: (cols - 1) * COL_W + NODE_W, height: (rows - 1) * ROW_H + NODE_H }}>
          <svg className="map-edges" width={(cols - 1) * COL_W + NODE_W} height={(rows - 1) * ROW_H + NODE_H} aria-hidden="true">
            {placed.filter((p) => p.node.parentId && pos.has(p.node.parentId)).map((p) => {
              const parent = pos.get(p.node.parentId!)!
              const x1 = parent.col * COL_W + NODE_W / 2
              const y1 = parent.row * ROW_H + NODE_H
              const x2 = p.col * COL_W + NODE_W / 2
              const y2 = p.row * ROW_H
              const mid = (y1 + y2) / 2
              return (
                <path key={p.node.id} d={`M${x1} ${y1} V${mid} H${x2} V${y2}`} pathLength={1}
                  style={{ '--d': `${p.order * step - step / 2}ms` } as CSSProperties} />
              )
            })}
          </svg>
          {placed.map((p) => (
            <a key={p.node.id} className="map-node" href={articlePath(p.node.title)} onClick={goTo(p.node)}
              aria-current={p.node.id === here ? 'location' : undefined}
              style={{ left: p.col * COL_W, top: p.row * ROW_H, '--d': `${p.order * step}ms` } as CSSProperties}>
              <Thumb src={thumbs.get(p.node.title)} className="map-thumb" />
              <span className="map-caption">{p.node.title}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="map-actions">
        {open && (
          <a className="button primary" href={articlePath(last.title)} onClick={goTo(here ? state.nodes[here] : last)}>{t('keepReading')}</a>
        )}
        <a className="button" href="/" onClick={linkHandler('/', {})}>{t('startNew')}</a>
      </div>

      {threads.length > 1 && (
        <section>
          <h2 className="label">{t('yourThreads')}</h2>
          <ul className="seed-list">
            {threads.map((th) => {
              const count = Object.values(state.nodes).filter((n) => n.threadId === th.id).length
              const path = `/map?thread=${th.id}`
              return (
                <li key={th.id}>
                  <a href={path} onClick={linkHandler(path, {})} aria-current={th.id === id ? 'page' : undefined}>
                    <strong>{state.nodes[th.rootNodeId]?.title}</strong>
                    <span>{t('depth', { n: count })}, {th.endedAt ? t('stopped') : t('open')}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
