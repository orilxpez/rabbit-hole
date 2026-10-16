import { Analytics } from '@vercel/analytics/react'
import { useEffect } from 'react'
import { useT } from './i18n'
import { Reader } from './reader/Reader'
import { linkHandler, titleFromPath, usePath } from './router'
import { Debug } from './screens/Debug'
import { Home } from './screens/Home'
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
      {import.meta.env.PROD && <Analytics route={title ? '/a/[title]' : path} path={path} />}
    </>
  )
}

function Screen({ path, title }: { path: string; title: string | null }) {
  const state = useAppState()
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
  const firstVisit = !Object.keys(state.interests).length && !Object.keys(state.nodes).length
  return (
    <>
      <TopBar />
      {firstVisit ? <Onboarding /> : <Home />}
    </>
  )
}

const LANGS: Lang[] = ['en', 'es']

function TopBar({ inReader = false }: { inReader?: boolean }) {
  const t = useT()
  useEffect(() => { document.documentElement.lang = t.lang }, [t.lang])
  return (
    <nav className="topbar">
      <a className="brand" href="/" onClick={linkHandler('/', {})}>{t('brand')}</a>
      <span className="topbar-end">
        {inReader && <a href="/" onClick={linkHandler('/', {})}>{t('newThread')}</a>}
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
