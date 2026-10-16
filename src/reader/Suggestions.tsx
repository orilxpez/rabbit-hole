import { useEffect, useState } from 'react'
import { getPageInfo } from '../api/wikipedia'
import curatedJson from '../data/curated.json'
import { setSuggestionsShown, visitedTitles } from '../graph/history'
import { articlePath, linkHandler } from '../router'
import { getState, update } from '../state'
import type { CleanArticle } from './cleanHtml'

const curated: Record<string, string[]> = curatedJson
const MAX_CARDS = 4

export interface Card {
  title: string
  description: string | null
  thumbnail: string | null
  relation: string
  sentence: string | null
}

/**
 * Phase 2 source (experiment E1): hand-curated suggestions, falling back to the
 * first links of the introduction. The phase 3 engine replaces the fallback.
 */
export function useSuggestions(title: string, lead: CleanArticle | null, nodeId: string | null): Card[] | null {
  const [cards, setCards] = useState<Card[] | null>(null)

  useEffect(() => {
    if (!lead || !nodeId) return
    let cancelled = false
    const visited = visitedTitles(getState())
    const pool = curated[title] ?? lead.links.filter((l) => l.section === 0).map((l) => l.title)
    const candidates = pool.filter((t) => t !== title && !visited.has(t)).slice(0, MAX_CARDS * 2)
    getPageInfo(candidates)
      .then((info) => {
        if (cancelled) return
        const result: Card[] = []
        for (const t of candidates) {
          const i = info.get(t)
          if (!i || i.disambiguation || visited.has(i.title) || result.length === MAX_CARDS) continue
          result.push({
            title: i.title,
            description: i.description,
            thumbnail: i.thumbnail,
            relation: 'Relacionado',
            sentence: lead.links.find((l) => l.title === t)?.sentence ?? null,
          })
        }
        update((s) => setSuggestionsShown(s, nodeId, result.map((c) => c.title)))
        setCards(result)
      })
      .catch(() => !cancelled && setCards([]))
    return () => { cancelled = true }
  }, [title, lead, nodeId])

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
