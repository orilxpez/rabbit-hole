import { useEffect, useMemo, useState } from 'react'
import { getPageInfo, type PageInfo } from '../api/wikipedia'
import { visitedTitles } from '../graph/history'
import { articlePath, linkHandler } from '../router'
import { SEEDS, dailySeed, otherSeeds } from '../seeds'
import { useAppState } from '../state'

const OTHER_SEEDS = 3

export function Home() {
  const state = useAppState()
  const [info, setInfo] = useState<Map<string, PageInfo>>(new Map())

  const { daily, others, last } = useMemo(() => {
    const today = new Date()
    const nodes = Object.values(state.nodes)
    return {
      daily: dailySeed(SEEDS, today),
      others: otherSeeds(SEEDS, state.interests, visitedTitles(state), today, OTHER_SEEDS + 1),
      last: nodes.length ? nodes.reduce((a, b) => (b.visitedAt > a.visitedAt ? b : a)) : null,
    }
  }, [state])
  const rest = others.filter((s) => s.title !== daily.title).slice(0, OTHER_SEEDS)

  useEffect(() => {
    getPageInfo([daily.title, ...rest.map((s) => s.title)]).then(setInfo).catch(() => {})
  }, [daily.title, rest.map((s) => s.title).join('|')])

  const d = info.get(daily.title)
  const threads = Object.keys(state.threads).length

  return (
    <main className="reader">
      <h1>Rabbit Hole</h1>

      {last && (
        <a className="read-more primary continue" href={articlePath(last.title)}
          onClick={linkHandler(articlePath(last.title), { nodeId: last.id })}>
          Continuar con {last.title}
        </a>
      )}

      <section className="daily">
        <h2 className="eyebrow">Semilla del día</h2>
        <a className="daily-card" href={articlePath(daily.title)} onClick={linkHandler(articlePath(daily.title), { from: 'seed' })}>
          {d?.thumbnail && <img src={d.thumbnail} alt="" />}
          <strong>{daily.title}</strong>
          {d?.description && <span className="muted">{d.description}</span>}
        </a>
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="eyebrow">O abre un hilo nuevo</h2>
          <ul className="seed-list">
            {rest.map((s) => (
              <li key={s.title}>
                <a href={articlePath(s.title)} onClick={linkHandler(articlePath(s.title), { from: 'seed' })}>{s.title}</a>
                {info.get(s.title)?.description && <span className="muted"> · {info.get(s.title)!.description}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {threads > 0 && <p className="muted">Llevas {threads} {threads === 1 ? 'hilo' : 'hilos'}. Nada se borra al empezar otro.</p>}
    </main>
  )
}
