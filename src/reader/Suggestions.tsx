import { useEffect, useState } from 'react'
import { suggest, type Card } from '../engine/suggest'
import { setSuggestionsShown } from '../graph/history'
import { articlePath, linkHandler } from '../router'
import { getState, update } from '../state'

export function useSuggestions(title: string, qid: string | null, nodeId: string | null): Card[] | null {
  const [cards, setCards] = useState<Card[] | null>(null)

  useEffect(() => {
    if (!nodeId) return
    let cancelled = false
    suggest({ title, qid, state: getState() })
      .then(({ cards, source }) => {
        if (cancelled) return
        update((s) => setSuggestionsShown(s, nodeId, cards.map((c) => c.title), source))
        setCards(cards)
      })
      .catch(() => !cancelled && setCards([]))
    return () => { cancelled = true }
  }, [title, qid, nodeId])

  return cards
}

export function SuggestionList({ cards }: { cards: Card[] | null }) {
  if (!cards) return <p className="muted">Buscando por dónde seguir…</p>
  if (!cards.length) return null
  return (
    <section className="suggestions" aria-label="Sugerencias">
      <h2>Sigue por aquí</h2>
      <ul>
        {cards.map((c) => (
          <li key={c.title}>
            <a className="card" href={articlePath(c.title)} onClick={linkHandler(articlePath(c.title), { from: 'suggestion' })}>
              {c.thumbnail && <img src={c.thumbnail} alt="" loading="lazy" />}
              <span className="card-body">
                <span className="tag">{c.relation}</span>
                <strong>{c.title}</strong>
                {c.description && <span className="muted">{c.description}</span>}
                {c.sentence && <q>{c.sentence}</q>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
