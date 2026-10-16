import { useEffect, useMemo, useState } from 'react'
import { getPageInfo, type PageInfo } from '../api/wikipedia'
import { visitedTitles } from '../graph/history'
import { useT } from '../i18n'
import { articlePath, linkHandler } from '../router'
import { SEEDS, dailySeed, otherSeeds } from '../seeds'
import { useAppState } from '../state'

const OTHER_SEEDS = 3

export function Home() {
  const t = useT()
  const state = useAppState()
  const [info, setInfo] = useState<Map<string, PageInfo>>(new Map())

  const { daily, rest, last } = useMemo(() => {
    const today = new Date()
    const nodes = Object.values(state.nodes)
    const daily = dailySeed(SEEDS, today)
    return {
      daily,
      rest: otherSeeds(SEEDS, state.interests, visitedTitles(state), today, OTHER_SEEDS + 1)
        .filter((s) => s.title !== daily.title).slice(0, OTHER_SEEDS),
      last: nodes.length ? nodes.reduce((a, b) => (b.visitedAt > a.visitedAt ? b : a)) : null,
    }
  }, [state])

  const titlesKey = [daily.title, ...rest.map((s) => s.title)].join('|')
  useEffect(() => {
    getPageInfo(titlesKey.split('|')).then(setInfo).catch(() => {})
  }, [titlesKey])

  const d = info.get(daily.title)
  const threads = Object.keys(state.threads).length

  return (
    <main className="page">
      <h1 className="display wordmark">rabbit hole</h1>

      {last && (
        <a className="button primary" href={articlePath(last.title)} onClick={linkHandler(articlePath(last.title), { nodeId: last.id })}>
          {t('continueWith', { title: last.title })}
        </a>
      )}

      <section className="daily">
        <h2 className="label">{t('todaysSeed')}</h2>
        <a className="daily-card" href={articlePath(daily.title)} onClick={linkHandler(articlePath(daily.title), { from: 'seed' })}>
          <span className="frame">{d?.thumbnail && <img src={d.thumbnail} alt="" />}</span>
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

      {threads > 0 && <p className="footnote">{threads === 1 ? t('threadsOne') : t('threadsMany', { n: threads })}</p>}
    </main>
  )
}
