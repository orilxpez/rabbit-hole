import { Reader } from './reader/Reader'
import { linkHandler, titleFromPath, usePath } from './router'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { useAppState } from './state'

export function App() {
  const title = titleFromPath(usePath())
  const state = useAppState()
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
