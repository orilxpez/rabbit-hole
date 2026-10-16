import { useEffect, useMemo, useState } from 'react'
import { getPageInfo, type PageInfo } from '../api/wikipedia'
import { pathTo, visitedTitles } from '../graph/history'
import { useT } from '../i18n'
import { articlePath, linkHandler } from '../router'
import { SEEDS, dailySeed, otherSeeds } from '../seeds'
import { useAppState } from '../state'
import { Display, Hare, Thumb } from '../ui'

const OTHER_SEEDS = 3

export function Home() {
  const t = useT()
  const state = useAppState()
  const [info, setInfo] = useState<Map<string, PageInfo>>(new Map())

  const { daily, rest } = useMemo(() => {
    const today = new Date()
    const daily = dailySeed(SEEDS, today)
    return {
      daily,
      rest: otherSeeds(SEEDS, state.interests, visitedTitles(state), today, OTHER_SEEDS + 1)
        .filter((s) => s.title !== daily.title).slice(0, OTHER_SEEDS),
    }
  }, [state])
  // Continue only an open thread; a stopped one lives on in the map.
  const current = state.currentNodeId ? state.nodes[state.currentNodeId] : null
  const depth = pathTo(state, state.currentNodeId).length
  const hasThreads = Object.keys(state.threads).length > 0

  const titlesKey = [daily.title, ...rest.map((s) => s.title)].join('|')
  useEffect(() => {
    getPageInfo(titlesKey.split('|')).then(setInfo).catch(() => {})
  }, [titlesKey])

  const d = info.get(daily.title)

  return (
    <main className="page home">
      <div className="masthead">
        <Display text="rabbit hole" className="wordmark" fit={6} />
        <figure className="hare-block">
          <Hare />
          <figcaption className="credit">{t('hareCredit')}</figcaption>
        </figure>
      </div>

      {current && (
        <a className="button primary" href={articlePath(current.title)} onClick={linkHandler(articlePath(current.title), { nodeId: current.id })}>
          {t('continueWith', { title: current.title })} <span className="button-meta">{t('depth', { n: depth })}</span>
        </a>
      )}

      <section className="daily">
        <h2 className="label">{t('todaysSeed')}</h2>
        <a className="daily-card" href={articlePath(daily.title)} onClick={linkHandler(articlePath(daily.title), { from: 'seed' })}>
          <Thumb src={d?.thumbnail} className="daily-thumb" />
          <strong className="daily-title">{daily.title}</strong>
          {d?.description && <span className="article-desc">{d.description}</span>}
        </a>
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="label">{t('orNewThread')}</h2>
          <ul className="seed-list">
            {rest.map((s) => (
              <li key={s.title}>
                <a href={articlePath(s.title)} onClick={linkHandler(articlePath(s.title), { from: 'seed' })}>
                  <strong>{s.title}</strong>
                  {info.get(s.title)?.description && <span>{info.get(s.title)!.description}</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasThreads && <a className="button" href="/map" onClick={linkHandler('/map', {})}>{t('seeMap')}</a>}
    </main>
  )
}
