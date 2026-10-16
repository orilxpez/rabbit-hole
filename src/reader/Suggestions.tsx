import { useEffect, useId, useState, type CSSProperties, type MouseEvent } from 'react'
import { getArticleHtml, getSummary } from '../api/wikipedia'
import { suggest, type Card, type SuggestionSource } from '../engine/suggest'
import { setSuggestionsShown } from '../graph/history'
import { useT } from '../i18n'
import { articlePath, navigate } from '../router'
import { getState, update } from '../state'
import { Thumb } from '../ui'
import { excerpt, type ArticleLink, type Quote } from './cleanHtml'

const PREFETCH_DELAY_MS = 1500

/**
 * Starts as soon as the article opens. The best candidate is "the next step down";
 * the rest stay folded as other paths. Only what the reader actually sees counts as
 * shown, so folded alternatives are not penalised as ignored.
 */
export function useSuggestions(title: string, nodeId: string | null) {
  const [result, setResult] = useState<{ cards: Card[]; source: SuggestionSource } | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    let cancelled = false
    suggest({ title, state: getState() })
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setResult({ cards: [], source: 'engine' }))
    return () => { cancelled = true }
  }, [title])

  useEffect(() => {
    if (!result || !nodeId) return
    const shown = revealed ? result.cards : result.cards.slice(0, 1)
    update((s) => setSuggestionsShown(s, nodeId, shown.map((c) => c.title), result.source))
  }, [result, nodeId, revealed])

  // Preload the next step (and the alternatives) so following one is instant.
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => {
      for (const c of result.cards) {
        getSummary(c.title).catch(() => {})
        getArticleHtml(c.title, true).catch(() => {})
      }
    }, PREFETCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [result])

  return { cards: result?.cards ?? null, revealed, reveal: () => setRevealed(true) }
}

/** The sentence where the link appears, with the linked words marked: the reason for the suggestion. */
function Excerpt({ quote }: { quote: Quote }) {
  const { before, link, after } = excerpt(quote)
  return <q className="excerpt">{before}<mark>{link}</mark>{after}</q>
}

// Follows a suggestion; its thumbnail becomes the next article's hero image.
function follow(title: string, e: MouseEvent<HTMLAnchorElement>) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  document.querySelectorAll<HTMLElement>('.hero img').forEach((img) => img.style.setProperty('view-transition-name', 'none'))
  e.currentTarget.querySelector<HTMLElement>('.thumb img')?.style.setProperty('view-transition-name', 'hero')
  navigate(articlePath(title), { from: 'suggestion' })
}

interface Props {
  cards: Card[] | null
  revealed: boolean
  onReveal: () => void
  /** When the reader reads Spanish Wikipedia: Spanish titles of the cards and the links of the Spanish text. */
  spanish: { titles: Map<string, string>; links: ArticleLink[] } | null
}

export function NextPath({ cards, revealed, onReveal, spanish }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const listId = useId()
  if (cards && !cards.length) return null
  const [next, ...others] = cards ?? []

  // In Spanish, show the Spanish title and the Spanish sentence where it is linked; the English
  // description and sentence would mix languages, so they are left out. Navigation stays English.
  const shown = (c: Card) => {
    if (!spanish) return { title: c.title, description: c.description, sentence: c.sentence }
    const es = spanish.titles.get(c.title)
    return { title: es ?? c.title, description: null, sentence: (es && spanish.links.find((l) => l.title === es)?.sentence) || null }
  }
  const n = next && shown(next)

  return (
    <section className="next" aria-label={t('downTheHole')} aria-busy={!cards}>
      <h2 className="label">{t('downTheHole')}</h2>
      {!next || !n ? (
        <div className="next-card skeleton" aria-hidden="true"><p className="sr-only">{t('findingNext')}</p></div>
      ) : (
        <a className="next-card" href={articlePath(next.title)} onClick={(e) => follow(next.title, e)}>
          <Thumb src={next.thumbnail} className="next-thumb" />
          <span className="next-body">
            <span className="pill">{t.relation(next.relation)}</span>
            <strong className="next-title">{n.title}</strong>
            {n.description && <span className="next-desc">{n.description}</span>}
            {n.sentence && <Excerpt quote={n.sentence} />}
            <span className="button primary next-go">{t('goDeeper')}</span>
          </span>
        </a>
      )}

      {others.length > 0 && (
        <div className="paths" data-open={open}>
          <button
            type="button"
            className="paths-toggle"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => { setOpen(!open); if (!revealed) onReveal() }}
          >
            {open ? t('hidePaths') : t('otherPaths', { n: others.length })}
          </button>
          <div className="paths-panel" id={listId} inert={!open}>
            <ul className="paths-list">
              {others.map((c, i) => {
                const s = shown(c)
                return (
                <li key={c.title} style={{ '--i': i } as CSSProperties}>
                  <a className="path" href={articlePath(c.title)} onClick={(e) => follow(c.title, e)}>
                    <Thumb src={c.thumbnail} className="path-thumb" />
                    <span className="path-body">
                      <strong>{s.title}</strong>
                      {s.sentence ? <Excerpt quote={s.sentence} /> : s.description && <span className="next-desc">{s.description}</span>}
                    </span>
                    <span className="pill">{t.relation(c.relation)}</span>
                  </a>
                </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
