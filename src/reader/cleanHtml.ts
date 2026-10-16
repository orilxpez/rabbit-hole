import { articlePath } from '../router'

// Turns MediaWiki parser output into readable HTML: no infoboxes, navboxes,
// references or edit chrome; internal links point inside the app.

export interface Section {
  id: string
  title: string
  html: string
}

export interface ArticleLink {
  title: string
  /** 0 is the introduction; n is the n-th kept section. */
  section: number
  sectionTitle: string | null
  /** Sentence of the article where the link first appears, if it is inside a paragraph. */
  sentence: Quote | null
}

/** A sentence and the position of the linked words inside it. */
export interface Quote {
  text: string
  start: number
  end: number
}

export interface CleanArticle {
  lead: string
  sections: Section[]
  /** Internal article links in reading order, first occurrence only. */
  links: ArticleLink[]
  /** File names of the article's figures, for author/license credits. */
  files: string[]
}

const REMOVE = [
  'style', 'link', 'script', 'meta', '.shortdescription', '.hatnote', '.infobox', '.navbox',
  '.vertical-navbox', '.sidebar', '.ambox', '.ombox', '.tmbox', '.mbox-small', '.metadata',
  '.noprint', '.mw-editsection', '.reference', '.reflist', '.mw-references-wrap', '.mw-empty-elt',
  '.portalbox', '.sistersitebox', '.side-box', '#coordinates', '.navigation-not-searchable',
  // Parsing only the introduction leaves notes without their list, and MediaWiki prints a red warning.
  '.mw-ext-cite-error', '.cite-error', '.error',
].join(',')

// English and Spanish Wikipedia section names.
const DROPPED_SECTIONS = /^(notes|references|citations|sources|bibliography|further reading|external links|footnotes|works cited|explanatory notes|general (and cited )?(sources|references)|notas|referencias|notas y referencias|bibliografía|enlaces externos|fuentes|lecturas adicionales|obras citadas)$/i

const NAMESPACES = /^(file|image|category|help|wikipedia|template|portal|special|talk|module|draft|user|mediawiki|wp|wikt|commons|archivo|imagen|categoría|ayuda|plantilla|especial|discusión|módulo|usuario|anexo|wikiproyecto):/i

const MAX_EXCERPT = 150 // characters of a sentence shown on a suggestion card

export function cleanArticle(html: string): CleanArticle {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.querySelector('.mw-parser-output') ?? doc.body
  root.querySelectorAll(REMOVE).forEach((el) => el.remove())
  // MediaWiki already sanitizes its output; this is defense in depth since the HTML is rendered as-is.
  root.querySelectorAll('iframe, object, embed, form').forEach((el) => el.remove())
  for (const el of root.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name)
    }
  }

  fixFigures(root)
  fixLinks(root)
  root.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy')
    const src = img.getAttribute('src')
    if (src?.startsWith('//')) img.setAttribute('src', 'https:' + src)
    const srcset = img.getAttribute('srcset')
    if (srcset) img.setAttribute('srcset', srcset.replace(/(^|[\s,])\/\//g, '$1https://'))
  })
  root.querySelectorAll('table').forEach((table) => {
    const wrap = doc.createElement('div')
    wrap.className = 'table-scroll'
    table.replaceWith(wrap)
    wrap.append(table)
  })

  // Split into the lead and one block per h2, dropping reference-like sections.
  const blocks: { id: string; title: string; nodes: Element[] }[] = [{ id: '', title: '', nodes: [] }]
  for (const el of [...root.children]) {
    if (el.matches('.mw-heading2, h2')) {
      const h2 = el.matches('h2') ? el : el.querySelector('h2')!
      blocks.push({ id: h2.id, title: h2.textContent?.trim() ?? '', nodes: [] })
    } else {
      blocks.at(-1)!.nodes.push(el)
    }
  }
  const kept = blocks.filter((b, i) => i === 0 || !DROPPED_SECTIONS.test(b.title))

  const links: ArticleLink[] = []
  const seen = new Set<string>()
  kept.forEach((block, section) => {
    for (const el of block.nodes) {
      for (const a of el.querySelectorAll<HTMLAnchorElement>('a[data-title]')) {
        const title = a.dataset.title!
        if (seen.has(title)) continue
        seen.add(title)
        const p = a.closest('p')
        links.push({ title, section, sectionTitle: block.title || null, sentence: p ? sentenceAround(p, a) : null })
      }
    }
  })

  const toHtml = (b: (typeof kept)[number]) => b.nodes.map((n) => n.outerHTML).join('')
  return {
    lead: toHtml(kept[0]),
    sections: kept.slice(1).map((b) => ({ id: b.id, title: b.title, html: toHtml(b) })),
    links,
    files: [...root.querySelectorAll<HTMLElement>('figure[data-file]')].map((f) => f.dataset.file!),
  }
}

/**
 * Appends "author, license" under every figure whose credit is known, and drops the
 * figure already shown as the hero image (Wikipedia's lead often repeats it).
 */
export function withCredits(
  html: string,
  credits: Map<string, { artist: string; license: string; descriptionUrl: string }>,
  heroFile: string | null = null,
): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const fig of doc.querySelectorAll<HTMLElement>('figure[data-file]')) {
    if (fig.dataset.file === heroFile) {
      fig.remove()
      continue
    }
    const c = credits.get(fig.dataset.file!)
    if (!c) continue
    const credit = doc.createElement('a')
    credit.className = 'credit'
    credit.href = c.descriptionUrl
    credit.target = '_blank'
    credit.rel = 'noopener noreferrer'
    credit.textContent = [c.artist, c.license].filter(Boolean).join(', ')
    fig.append(credit)
  }
  return doc.body.innerHTML
}

// Remembers each figure's file name (for the author/license credit) and makes the image not a link.
function fixFigures(root: Element) {
  for (const a of root.querySelectorAll<HTMLAnchorElement>('figure a.mw-file-description')) {
    const href = a.getAttribute('href') ?? ''
    const fig = a.closest('figure')!
    fig.dataset.file = decodeURIComponent(href.replace(/^\/wiki\/[^:]+:/, '')).replaceAll('_', ' ')
    a.replaceWith(...a.childNodes)
  }
}

function fixLinks(root: Element) {
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a')) {
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('/wiki/') && !a.classList.contains('new')) {
      const title = decodeURIComponent(href.slice(6).split('#')[0]).replaceAll('_', ' ')
      if (title && !NAMESPACES.test(title)) {
        a.setAttribute('href', articlePath(title))
        a.dataset.title = title
        a.removeAttribute('title')
        continue
      }
    } else if (/^https?:/.test(href)) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
      continue
    }
    a.replaceWith(...a.childNodes) // red links, anchors, namespaces: keep the text only
  }
}

const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' })

function sentenceAround(p: Element, a: Element): Quote | null {
  const range = p.ownerDocument.createRange()
  range.setStart(p, 0)
  range.setEndBefore(a)
  // Collapse whitespace first: a raw newline inside a paragraph is a hard sentence break for Intl.Segmenter.
  const squash = (s: string) => s.replace(/\s+/g, ' ')
  const offset = squash(range.toString()).length
  const linkLength = squash(a.textContent ?? '').length
  const text = squash(p.textContent ?? '')
  for (const { segment, index } of segmenter.segment(text)) {
    if (offset < index + segment.length) {
      const lead = segment.length - segment.trimStart().length
      const start = offset - index - lead
      return { text: segment.trim(), start, end: start + linkLength }
    }
  }
  return null
}

/**
 * A window of the sentence that always contains the linked words, so a card can
 * show why it is suggested even when the link sits at the end of a long sentence.
 */
export function excerpt(q: Quote, max = MAX_EXCERPT): { before: string; link: string; after: string } {
  let from = 0
  let to = q.text.length
  if (to > max) {
    const room = max - (q.end - q.start)
    from = Math.max(0, q.start - Math.floor(room / 3))
    to = Math.min(q.text.length, from + max)
    from = Math.max(0, to - max)
    // Snap to word boundaries, never past the linked words.
    if (from > 0) from = Math.min(q.start, q.text.indexOf(' ', from) + 1 || q.start)
    if (to < q.text.length) to = Math.max(q.end, q.text.lastIndexOf(' ', to))
  }
  const cut = (s: string, left: boolean, right: boolean) => (left ? '…' : '') + s + (right ? '…' : '')
  return {
    before: cut(q.text.slice(from, q.start), from > 0, false),
    link: q.text.slice(q.start, q.end),
    after: cut(q.text.slice(q.end, to), false, to < q.text.length),
  }
}
