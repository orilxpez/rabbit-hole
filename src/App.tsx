import { Analytics } from '@vercel/analytics/react'
import { Reader } from './reader/Reader'
import { linkHandler, titleFromPath, usePath } from './router'
import { Debug } from './screens/Debug'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { useAppState } from './state'

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
        <nav className="topbar">
          <a href="/" onClick={linkHandler('/', {})}>Rabbit Hole</a>
          <a href="/" onClick={linkHandler('/', {})}>Nuevo hilo</a>
        </nav>
        {/* key: every article starts with fresh reader state. */}
        <Reader key={title} title={title} />
      </>
    )
  }
  const firstVisit = !Object.keys(state.interests).length && !Object.keys(state.nodes).length
  return firstVisit ? <Onboarding /> : <Home />
}
