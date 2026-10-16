import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  fileNameFromUrl, getArticleHtml, getImageCredits, getSummary, type ImageCredit, type Summary,
} from '../api/wikipedia'
import { addVisit, setCurrent } from '../graph/history'
import { articlePath, linkHandler, markVisitRecorded, navState } from '../router'
import { getState, update } from '../state'
import { cleanArticle, withCredits, type CleanArticle } from './cleanHtml'
import { SuggestionList, useSuggestions } from './Suggestions'
import { useReadingSignals } from './useReadingSignals'

const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/deed.es'
const HERO_WIDTH = 960 // a standard Wikimedia thumbnail step

/** Records the visit once per history entry; going back to it just makes it current again. */
function recordVisit(summary: Summary): string {
  const { nodeId, from } = navState()
  if (nodeId && getState().nodes[nodeId]) {
    update((s) => setCurrent(s, nodeId))
    return nodeId
  }
  const id = crypto.randomUUID()
  update((s) => addVisit(s, {
    id, title: summary.title, qid: summary.wikibase_item ?? null, chosenFrom: from ?? 'seed', now: Date.now(),
  }))
  markVisitRecorded(id)
  return id
}

function heroImage(s: Summary): string | null {
  if (!s.originalimage) return s.thumbnail?.source ?? null
  if (s.originalimage.width <= HERO_WIDTH || !s.thumbnail) return s.originalimage.source
  return s.thumbnail.source.replace(/\/\d+px-/, `/${HERO_WIDTH}px-`)
}

export function Reader({ title }: { title: string }) {
  const [page, setPage] = useState<{ summary: Summary; lead: CleanArticle; nodeId: string } | null>(null)
  const [full, setFull] = useState<CleanArticle | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<Map<string, ImageCredit>>(new Map())

  const loadCredits = (files: string[]) => {
    if (files.length) getImageCredits(files).then((c) => setCredits((prev) => new Map([...prev, ...c]))).catch(() => {})
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([getSummary(title), getArticleHtml(title, true)])
      .then(([summary, leadHtml]) => {
        if (cancelled) return
        const lead = cleanArticle(leadHtml)
        setPage({ summary, lead, nodeId: recordVisit(summary) })
        document.title = `${summary.title} · Rabbit Hole`
        const hero = summary.originalimage && fileNameFromUrl(summary.originalimage.source)
        loadCredits([...(hero ? [hero] : []), ...lead.files])
      })
      .catch(() => !cancelled && setError('No se ha podido cargar el artículo. Comprueba la conexión y vuelve a intentarlo.'))
    return () => { cancelled = true }
  }, [title])

  const cards = useSuggestions(page?.summary.title ?? title, page?.summary.wikibase_item ?? null, page?.nodeId ?? null)
  const articleRef = useRef<HTMLElement>(null)
  const signals = useReadingSignals(page?.nodeId ?? null, page?.summary.wikibase_item ?? null, articleRef)

  const intro = useMemo(() => withCredits((full ?? page?.lead)?.lead ?? '', credits), [full, page, credits])
  const sections = useMemo(
    () => full?.sections.map((s) => ({ ...s, html: withCredits(s.html, credits) })) ?? [],
    [full, credits],
  )

  async function openFull() {
    signals.openedFull()
    setLoadingFull(true)
    try {
      const article = cleanArticle(await getArticleHtml(title, false))
      setFull(article)
      loadCredits(article.files)
    } catch {
      setError('No se ha podido cargar el artículo completo.')
    } finally {
      setLoadingFull(false)
    }
  }

  // Links inside Wikipedia text open in the app and count as the reader's choice.
  function onTextClick(e: MouseEvent<HTMLElement>) {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-title]')
    if (a) linkHandler(articlePath(a.dataset.title!), { from: 'link' })(e)
  }

  if (error && !page) return <main className="reader"><p className="error">{error}</p></main>
  if (!page) return <main className="reader"><p className="muted">Cargando…</p></main>

  const { summary } = page
  const hero = heroImage(summary)
  const heroCredit = summary.originalimage && credits.get(fileNameFromUrl(summary.originalimage.source) ?? '')

  return (
    <main className="reader">
      <article ref={articleRef}>
        <header>
          <h1>{summary.title}</h1>
          {summary.description && <p className="muted">{summary.description}</p>}
        </header>
        {hero && (
          <figure className="hero">
            <img src={hero} alt="" />
            {heroCredit && (
              <a className="credit" href={heroCredit.descriptionUrl} target="_blank" rel="noopener noreferrer">
                {[heroCredit.artist, heroCredit.license].filter(Boolean).join(' · ')}
              </a>
            )}
          </figure>
        )}
        <div className="prose" onClick={onTextClick} dangerouslySetInnerHTML={{ __html: intro }} />

        <SuggestionList cards={cards} />

        {!full && (
          <button className="read-more" onClick={openFull} disabled={loadingFull}>
            {loadingFull ? 'Cargando…' : 'Leer artículo completo'}
          </button>
        )}
        {error && <p className="error">{error}</p>}
        {full && (
          <>
            <div className="prose" onClick={onTextClick}>
              {sections.map((s) => (
                <details key={s.id || s.title} onToggle={(e) => e.currentTarget.open && signals.openedSection(s.title)}>
                  <summary>{s.title}</summary>
                  <div dangerouslySetInnerHTML={{ __html: s.html }} />
                </details>
              ))}
            </div>
            <SuggestionList cards={cards} />
          </>
        )}

        <footer className="attribution">
          Texto de <a href={summary.content_urls.desktop.page} target="_blank" rel="noopener noreferrer">«{summary.title}» en Wikipedia</a>,
          {' '}disponible bajo la licencia <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>.
          {' '}Las imágenes tienen su propio autor y licencia.
        </footer>
      </article>
    </main>
  )
}
