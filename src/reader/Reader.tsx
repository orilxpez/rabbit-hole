import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  articleUrl, fileNameFromUrl, getArticleHtml, getEnglishTitle, getImageCredits, getSpanishTitles, getSummary,
  type ImageCredit, type Summary, type Wiki,
} from '../api/wikipedia'
import { addVisit, setCurrent } from '../graph/history'
import { articlePath, linkHandler, markVisitRecorded, navState, navigate, screenReady } from '../router'
import { useT } from '../i18n'
import { getState, update } from '../state'
import { cleanArticle, withCredits, type CleanArticle } from './cleanHtml'
import { NextPath, useSuggestions } from './Suggestions'
import { Display } from '../ui'
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

/** The text of one language version: its summary (title, description), intro and, once opened, the full article. */
interface Text {
  summary: Summary
  lead: CleanArticle
  full?: CleanArticle
}

async function loadText(title: string, wiki: Wiki): Promise<Text> {
  const [summary, html] = await Promise.all([getSummary(title, wiki), getArticleHtml(title, true, wiki)])
  return { summary, lead: cleanArticle(html) }
}

export function Reader({ title }: { title: string }) {
  const t = useT()
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [texts, setTexts] = useState<Partial<Record<Wiki, Text>>>({})
  // Spanish title of this article: undefined while unknown, null if there is no Spanish article.
  const [esTitle, setEsTitle] = useState<string | null | undefined>(undefined)
  const [prefer, setPrefer] = useState<Wiki | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)
  const [error, setError] = useState<'loadError' | 'loadFullError' | null>(null)
  const [credits, setCredits] = useState<Map<string, ImageCredit>>(new Map())

  const loadCredits = (files: string[]) => {
    if (files.length) getImageCredits(files).then((c) => setCredits((prev) => new Map([...prev, ...c]))).catch(() => {})
  }

  // English is always loaded: it drives the visit, the engine and the hero image.
  useEffect(() => {
    let cancelled = false
    loadText(title, 'en')
      .then((en) => {
        if (cancelled) return
        setTexts((x) => ({ ...x, en }))
        setNodeId(recordVisit(en.summary))
        document.title = `${en.summary.title}, rabbit hole`
        const hero = en.summary.originalimage && fileNameFromUrl(en.summary.originalimage.source)
        loadCredits([...(hero ? [hero] : []), ...en.lead.files])
      })
      .catch(() => !cancelled && setError('loadError'))
    return () => { cancelled = true }
  }, [title])

  // Spanish interface: is there a Spanish article? (One cached request, in parallel with the above.)
  useEffect(() => {
    if (t.lang !== 'es' || esTitle !== undefined) return
    getSpanishTitles([title]).then((m) => setEsTitle(m.get(title) ?? null), () => setEsTitle(null))
  }, [t.lang, title, esTitle])

  // Spanish Wikipedia when the interface is Spanish and the article exists there; English otherwise.
  const wiki: Wiki = (prefer ?? t.lang) === 'es' && esTitle ? 'es' : 'en'
  const waitingForSpanish = t.lang === 'es' && prefer !== 'en' && esTitle === undefined

  useEffect(() => {
    if (wiki !== 'es' || texts.es || !esTitle) return
    let cancelled = false
    loadText(esTitle, 'es')
      .then((es) => { if (!cancelled) { setTexts((x) => ({ ...x, es })); loadCredits(es.lead.files) } })
      .catch(() => !cancelled && setPrefer('en')) // the English text is there to fall back on
    return () => { cancelled = true }
  }, [wiki, esTitle, texts.es])

  const text = waitingForSpanish ? undefined : texts[wiki]
  const ready = !!text && !!nodeId

  // The transition from the previous screen waits for this frame, so the hero can morph.
  useLayoutEffect(() => { if (ready || error) screenReady() }, [ready, error])

  const { cards, revealed, reveal } = useSuggestions(title, nodeId)
  const articleRef = useRef<HTMLElement>(null)
  const en = texts.en?.summary
  const signals = useReadingSignals(nodeId, en?.wikibase_item ?? null, articleRef)

  // Card titles and sentences in Spanish, when the reader reads Spanish.
  const [cardTitlesEs, setCardTitlesEs] = useState<Map<string, string>>(new Map())
  const cardKey = cards?.map((c) => c.title).join('|') ?? ''
  useEffect(() => {
    if (wiki !== 'es' || !cardKey) return
    getSpanishTitles(cardKey.split('|')).then(setCardTitlesEs).catch(() => {})
  }, [wiki, cardKey])

  const heroFile = en?.originalimage ? fileNameFromUrl(en.originalimage.source) : null
  const intro = useMemo(
    () => withCredits((text?.full ?? text?.lead)?.lead ?? '', credits, heroFile),
    [text, credits, heroFile],
  )
  const sections = useMemo(
    () => text?.full?.sections.map((s) => ({ ...s, html: withCredits(s.html, credits) })) ?? [],
    [text, credits],
  )

  async function openFull() {
    if (!text) return
    signals.openedFull()
    setLoadingFull(true)
    try {
      const full = cleanArticle(await getArticleHtml(text.summary.title, false, wiki))
      setTexts((x) => ({ ...x, [wiki]: { ...x[wiki]!, full } }))
      loadCredits(full.files)
    } catch {
      setError('loadFullError')
    } finally {
      setLoadingFull(false)
    }
  }

  // Links inside Wikipedia text open in the app and count as the reader's choice. A link
  // in the Spanish text goes to its English article; with none, it opens on Wikipedia.
  async function onTextClick(e: MouseEvent<HTMLElement>) {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-title]')
    if (!a) return
    if (wiki === 'en') return linkHandler(articlePath(a.dataset.title!), { from: 'link' })(e)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    const target = await getEnglishTitle(a.dataset.title!).catch(() => null)
    if (target) navigate(articlePath(target), { from: 'link' })
    else window.open(articleUrl(a.dataset.title!, 'es'), '_blank', 'noopener')
  }

  const summary = text?.summary
  const hero = en && heroImage(en)
  const heroCredit = en?.originalimage && credits.get(fileNameFromUrl(en.originalimage.source) ?? '')
  const other: Wiki = wiki === 'es' ? 'en' : 'es'

  return (
    <main className="page reader">
      {/* The title is known from the URL, so the page has its headline before any request returns. */}
      <article ref={articleRef} lang={wiki}>
        <header className="article-head">
          <Display text={summary?.title ?? (waitingForSpanish ? ' ' : title)} />
          <p className="article-desc">{summary?.description ?? ' '}</p>
          {t.lang === 'es' && esTitle !== undefined && (
            esTitle
              ? <button type="button" className="text-switch" onClick={() => setPrefer(other)}>
                  {other === 'en' ? t('readInEnglish') : t('readInSpanish')}
                </button>
              : <p className="text-switch">{t('onlyEnglish')}</p>
          )}
        </header>

        {error && !text && <p className="error">{t(error)}</p>}
        {!text && !error && <p className="sr-only">{t('loading')}</p>}

        {hero && (
          <figure className="frame hero">
            {/* The small thumbnail is already cached (it was the card image), so it shows at
                once behind the large one while that loads. */}
            <img src={hero} alt="" style={en?.thumbnail ? { backgroundImage: `url("${en.thumbnail.source}")` } : undefined} />
            {heroCredit && (
              <figcaption>
                <a className="credit" href={heroCredit.descriptionUrl} target="_blank" rel="noopener noreferrer">
                  {[heroCredit.artist, heroCredit.license].filter(Boolean).join(', ')}
                </a>
              </figcaption>
            )}
          </figure>
        )}
        {text && <div className="prose" onClick={onTextClick} dangerouslySetInnerHTML={{ __html: intro }} />}

        {text && !text.full && (
          <button className="button" onClick={openFull} disabled={loadingFull}>
            {loadingFull ? t('loading') : t('readFull')}
          </button>
        )}
        {error && text && <p className="error">{t(error)}</p>}
        {text?.full && (
          <div className="prose sections" onClick={onTextClick}>
            {sections.map((s) => (
              <details key={s.id || s.title} onToggle={(e) => e.currentTarget.open && signals.openedSection(s.title)}>
                <summary>{s.title}</summary>
                <div dangerouslySetInnerHTML={{ __html: s.html }} />
              </details>
            ))}
          </div>
        )}

        {/* One way down, after whatever the reader chose to read. */}
        <NextPath
          cards={cards}
          revealed={revealed}
          onReveal={reveal}
          spanish={wiki === 'es' && text ? { titles: cardTitlesEs, links: (text.full ?? text.lead).links } : null}
        />

        {summary && (
          <footer className="attribution">
            {t('attrText')} <a href={articleUrl(summary.title, wiki)} target="_blank" rel="noopener noreferrer">{summary.title} {t('attrOnWikipedia')}</a>
            {t('attrLicense')} <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>.
            {' '}{t('attrImages')}
          </footer>
        )}
      </article>
    </main>
  )
}
