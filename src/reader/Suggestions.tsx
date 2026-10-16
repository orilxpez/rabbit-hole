import { useEffect, useState } from 'react'
import { getArticleHtml, getSummary } from '../api/wikipedia'
import { suggest, type Card, type SuggestionSource } from '../engine/suggest'
import { setSuggestionsShown } from '../graph/history'
import { useT } from '../i18n'
import { articlePath, linkHandler } from '../router'
import { getState, update } from '../state'
import { excerpt, type Quote } from './cleanHtml'

const PREFETCH_DELAY_MS = 1500

/**
 * Starts as soon as the article opens (not after it renders) and, once the cards
 * are known, preloads their introductions so following one feels instant.
 */
export function useSuggestions(title: string, nodeId: string | null): Card[] | null {
  const [result, setResult] = useState<{ cards: Card[]; source: SuggestionSource } | null>(null)

  useEffect(() => {
    let cancelled = false
    suggest({ title, state: getState() })
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setResult({ cards: [], source: 'engine' }))
    return () => { cancelled = true }
  }, [title])

  useEffect(() => {
    if (!result || !nodeId) return
    update((s) => setSuggestionsShown(s, nodeId, result.cards.map((c) => c.title), result.source))
    // Low priority: wait so the prefetch never competes with what the reader is loading.
    const timer = setTimeout(() => {
      for (const c of result.cards) {
        getSummary(c.title).catch(() => {})
        getArticleHtml(c.title, true).catch(() => {})
      }
    }, PREFETCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [result, nodeId])

  return result?.cards ?? null
}

/** The sentence where the link appears, with the linked words marked: the reason for the suggestion. */
function Excerpt({ quote }: { quote: Quote }) {
  const { before, link, after } = excerpt(quote)
  return <q className="card-quote">{before}<mark>{link}</mark>{after}</q>
}

export function SuggestionList({ cards }: { cards: Card[] | null }) {
  const t = useT()
  if (cards && !cards.length) return null
  return (
    <section className="suggestions" aria-label={t('keepGoing')} aria-busy={!cards}>
      <h2 className="label">{t('keepGoing')}</h2>
      {!cards ? (
        <>
          <p className="sr-only">{t('findingNext')}</p>
          <ul className="cards" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <li key={i} className="card skeleton" />)}
          </ul>
        </>
      ) : (
        <ul className="cards">
          {cards.map((c) => (
            <li key={c.title}>
              <a className="card" href={articlePath(c.title)} onClick={linkHandler(articlePath(c.title), { from: 'suggestion' })}>
                <span className="card-head">
                  <strong>{c.title}</strong>
                  {c.description && <span className="card-desc">{c.description}</span>}
                </span>
                {c.thumbnail && <span className="card-media"><img src={c.thumbnail} alt="" loading="lazy" /></span>}
                {c.sentence && <Excerpt quote={c.sentence} />}
                <span className="pill">{t.relation(c.relation)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
