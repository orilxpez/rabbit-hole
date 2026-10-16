import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  fileNameFromUrl, getArticleHtml, getImageCredits, getSummary, type ImageCredit, type Summary,
} from '../api/wikipedia'
import { addVisit, setCurrent } from '../graph/history'
import { articlePath, linkHandler, markVisitRecorded, navState } from '../router'
import { useT } from '../i18n'
import { getState, update } from '../state'
import { cleanArticle, withCredits, type CleanArticle } from './cleanHtml'
import { SuggestionList, useSuggestions } from './Suggestions'
import { useReadingSignals } from './useReadingSignals'

const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/'
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
  const [error, setError] = useState<'loadError' | 'loadFullError' | null>(null)
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
        document.title = `${summary.title}, rabbit hole`
        const hero = summary.originalimage && fileNameFromUrl(summary.originalimage.source)
        loadCredits([...(hero ? [hero] : []), ...lead.files])
      })
      .catch(() => !cancelled && setError('loadError'))
    return () => { cancelled = true }
  }, [title])

  const t = useT()
  const cards = useSuggestions(title, page?.nodeId ?? null)
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
      setError('loadFullError')
    } finally {
      setLoadingFull(false)
    }
  }

  // Links inside Wikipedia text open in the app and count as the reader's choice.
  function onTextClick(e: MouseEvent<HTMLElement>) {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-title]')
    if (a) linkHandler(articlePath(a.dataset.title!), { from: 'link' })(e)
  }

  const summary = page?.summary
  const hero = summary && heroImage(summary)
  const heroCredit = summary?.originalimage && credits.get(fileNameFromUrl(summary.originalimage.source) ?? '')

  return (
    <main className="page reader">
      {/* The title is known from the URL, so the page has its headline before any request returns. */}
      <article ref={articleRef} lang="en">
        <header className="article-head">
          <h1 className="display">{summary?.title ?? title}</h1>
          <p className="article-desc">{summary?.description ?? ' '}</p>
        </header>

        {error && !page && <p className="error">{t(error)}</p>}
        {!page && !error && <p className="sr-only">{t('loading')}</p>}

        {hero && (
          <figure className="frame hero">
            <img src={hero} alt="" />
            {heroCredit && (
              <figcaption>
                <a className="credit" href={heroCredit.descriptionUrl} target="_blank" rel="noopener noreferrer">
                  {[heroCredit.artist, heroCredit.license].filter(Boolean).join(', ')}
                </a>
              </figcaption>
            )}
          </figure>
        )}
        {page && <div className="prose" onClick={onTextClick} dangerouslySetInnerHTML={{ __html: intro }} />}

        <SuggestionList cards={cards} />

        {page && !full && (
          <button className="button" onClick={openFull} disabled={loadingFull}>
            {loadingFull ? t('loading') : t('readFull')}
          </button>
        )}
        {error && page && <p className="error">{t(error)}</p>}
        {full && (
          <>
            <div className="prose sections" onClick={onTextClick}>
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

        {summary && (
          <footer className="attribution">
            {t('attrText')} <a href={summary.content_urls.desktop.page} target="_blank" rel="noopener noreferrer">{summary.title} {t('attrOnWikipedia')}</a>
            {t('attrLicense')} <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>.
            {' '}{t('attrImages')}
          </footer>
        )}
      </article>
    </main>
  )
}
