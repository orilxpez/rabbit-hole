import { Analytics } from '@vercel/analytics/react'
import { useEffect, useLayoutEffect } from 'react'
import { endThread, pathTo } from './graph/history'
import { useT } from './i18n'
import { TrailRabbit } from './rabbit'
import { Reader } from './reader/Reader'
import { linkHandler, navigate, screenReady, titleFromPath, usePath } from './router'
import { Debug } from './screens/Debug'
import { Home } from './screens/Home'
import { MapView } from './screens/MapView'
import { Onboarding } from './screens/Onboarding'
import { update, useAppState } from './state'
import type { Lang } from './storage/store'

export function App() {
  const path = usePath()
  const title = titleFromPath(path)
  // One page view per article: "pages per visit" approximates articles chained (H1).
  // route groups every article under /a/[title]; path keeps the article itself.
  return (
    <>
      <Screen path={path} title={title} />
      {import.meta.env.PROD && <Analytics route={title ? '/a/[title]' : path.split('?')[0]} path={path} />}
    </>
  )
}

function Screen({ path, title }: { path: string; title: string | null }) {
  const state = useAppState()
  // Only the reader waits for its hero image; every other screen is ready on first paint.
  useLayoutEffect(() => {
    if (title) return
    document.title = 'rabbit hole' // the reader sets the article title itself
    screenReady()
  }, [path, title])

  if (path === '/debug') return <Debug />
  if (title) {
    return (
      <>
        <TopBar inReader />
        {/* key: every article starts with fresh reader state. */}
        <Reader key={title} title={title} />
      </>
    )
  }
  if (path.startsWith('/map')) return <><TopBar /><MapView /></>
  const firstVisit = !Object.keys(state.interests).length && !Object.keys(state.nodes).length
  return (
    <>
      <TopBar />
      {firstVisit ? <Onboarding /> : <Home />}
    </>
  )
}

const LANGS: Lang[] = ['en', 'es']
const MAX_DOTS = 8 // keeps the trail inside a phone-width top bar

function TopBar({ inReader = false }: { inReader?: boolean }) {
  const t = useT()
  const state = useAppState()
  useEffect(() => { document.documentElement.lang = t.lang }, [t.lang])

  const path = pathTo(state, state.currentNodeId)
  const shown = path.slice(-MAX_DOTS)
  const threadId = path[0]?.threadId
  const mapPath = threadId ? `/map?thread=${threadId}` : '/map'

  function stop() {
    if (!threadId) return
    update((s) => endThread(s, threadId, Date.now()))
    navigate(`/map?thread=${threadId}`)
  }

  return (
    <nav className="topbar">
      <a className="brand" href="/" onClick={linkHandler('/', {})}>{t('brand')}</a>
      {/* The trail: the hole, one dot per article of the thread, and the rabbit sitting on
          the one being read. With no open thread, the rabbit waits by the hole. */}
      <a className="trail" href={mapPath} onClick={linkHandler(mapPath, {})}
        aria-label={path.length ? t('depth', { n: path.length }) : t('map')}>
        <b className="hole" />
        {shown.map((n) => <i key={n.id} className={n.id === state.currentNodeId ? 'here' : ''} />)}
        <TrailRabbit at={shown.length ? shown.findIndex((n) => n.id === state.currentNodeId) : 0} />
      </a>
      <span className="topbar-end">
        <a href={mapPath} onClick={linkHandler(mapPath, {})}>{t('map')}</a>
        {inReader && threadId && <button type="button" className="stop" onClick={stop}>{t('stop')}</button>}
        <span className="lang" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={t.lang === l} onClick={() => update((s) => ({ ...s, lang: l }))}>
              {l}
            </button>
          ))}
        </span>
      </span>
    </nav>
  )
}