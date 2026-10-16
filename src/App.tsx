import curated from './data/curated.json'
import { Reader } from './reader/Reader'
import { articlePath, linkHandler, titleFromPath, usePath } from './router'

export function App() {
  const title = titleFromPath(usePath())
  // key: every article starts with fresh reader state.
  return title ? <Reader key={title} title={title} /> : <Home />
}

// Phase 2 placeholder: onboarding and the daily seed arrive in phase 4.
function Home() {
  return (
    <main className="reader">
      <h1>Rabbit Hole</h1>
      <p className="muted">Elige por dónde empezar.</p>
      <ul className="seed-list">
        {Object.keys(curated).map((t) => (
          <li key={t}>
            <a href={articlePath(t)} onClick={linkHandler(articlePath(t), { from: 'seed' })}>{t}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}
