// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cleanArticle, excerpt } from './cleanHtml'

describe('excerpt', () => {
  it('keeps short sentences whole', () => {
    expect(excerpt({ text: 'Built by Justinian.', start: 9, end: 18 })).toEqual({ before: 'Built by ', link: 'Justinian', after: '.' })
  })

  it('always shows the linked words of a long sentence', () => {
    const text = 'x'.repeat(300) + ' Zenodotus ' + 'y'.repeat(300)
    const e = excerpt({ text, start: 301, end: 310 }, 60)
    expect(e.link).toBe('Zenodotus')
    expect(e.before.startsWith('…')).toBe(true)
    expect(e.after.endsWith('…')).toBe(true)
    expect((e.before + e.link + e.after).length).toBeLessThanOrEqual(62)
  })

  it('cuts at word boundaries', () => {
    const text = 'Among his contemporaries were Aratus, Apollonius of Rhodes and Theocritus, poets of the court in Alexandria.'
    const start = text.indexOf('Apollonius')
    const e = excerpt({ text, start, end: start + 'Apollonius of Rhodes'.length }, 60)
    // Starts right after a space and ends right before one: no fragments like "…ith his".
    expect(text).toContain(' ' + e.before.slice(1))
    expect(text).toContain(e.after.slice(0, -1) + ' ')
  })
})

const html = `
<div class="mw-parser-output">
  <div class="hatnote">For other uses, see X.</div>
  <table class="infobox"><tr><td>Infobox</td></tr></table>
  <p><b>Hagia Sophia</b><sup class="reference"><a href="#cite_note-1">[1]</a></sup> is a mosque in
  <a href="/wiki/Istanbul" title="Istanbul">Istanbul</a>. It was built by the
  <a href="/wiki/Byzantine_Empire">Eastern Roman Empire</a> in 537.</p>
  <p>See <a href="/wiki/Star_Wars:_A_New_Hope">a film</a>, a <a href="/wiki/Category:Mosques">category</a>,
  a <a class="new" href="/w/index.php?title=Nope&action=edit&redlink=1">red link</a>
  and <a href="https://example.org">a site</a>.</p>
  <div class="mw-heading mw-heading2"><h2 id="History">History</h2></div>
  <figure><a href="/wiki/File:Some_image.jpg" class="mw-file-description"><img src="//upload.wikimedia.org/x.jpg" srcset="//upload.wikimedia.org/x2.jpg 2x"></a></figure>
  <p>Again <a href="/wiki/Istanbul">Istanbul</a> and <a href="/wiki/Justinian_I#Reign">Justinian</a>.</p>
  <table><tr><td>data</td></tr></table>
  <div class="navbox">nav</div>
  <div class="mw-heading mw-heading2"><h2 id="See_also">See also</h2></div>
  <ul><li><a href="/wiki/Hagia_Irene">Hagia Irene</a></li></ul>
  <div class="mw-heading mw-heading2"><h2 id="References">References</h2></div>
  <p><a href="/wiki/Some_Book">Some Book</a></p>
</div>`

describe('cleanArticle', () => {
  const a = cleanArticle(html)

  it('removes chrome: hatnotes, infoboxes, references, navboxes', () => {
    const all = a.lead + a.sections.map((s) => s.html).join('')
    for (const junk of ['For other uses', 'Infobox', '[1]', 'nav</div>']) expect(all).not.toContain(junk)
  })

  it('splits into lead and h2 sections, dropping reference sections', () => {
    expect(a.sections.map((s) => s.title)).toEqual(['History', 'See also'])
  })

  it('rewrites internal links to the app and unwraps the rest', () => {
    expect(a.lead).toContain('href="/a/Istanbul" data-title="Istanbul"')
    expect(a.lead).toContain('data-title="Star Wars: A New Hope"')
    expect(a.lead).not.toContain('Category:')
    expect(a.lead).not.toContain('redlink')
    expect(a.lead).toContain('target="_blank"')
  })

  it('lists links in reading order with section and sentence, first occurrence only', () => {
    expect(a.links.map((l) => [l.title, l.section])).toEqual([
      ['Istanbul', 0], ['Byzantine Empire', 0], ['Star Wars: A New Hope', 0], ['Justinian I', 1], ['Hagia Irene', 2],
    ])
    const q = a.links[1].sentence!
    expect(q.text).toBe('It was built by the Eastern Roman Empire in 537.')
    expect(q.text.slice(q.start, q.end)).toBe('Eastern Roman Empire')
    expect(a.links[4]).toMatchObject({ sectionTitle: 'See also', sentence: null })
  })

  it('drops the figure already shown as hero and credits the rest', async () => {
    const { withCredits } = await import('./cleanHtml')
    const html = '<figure data-file="Hero.jpg"><img></figure><figure data-file="Other.jpg"><img></figure>'
    const credits = new Map([['Other.jpg', { artist: 'Ann', license: 'CC0', descriptionUrl: 'u' }]])
    const out = withCredits(html, credits, 'Hero.jpg')
    expect(out).not.toContain('Hero.jpg')
    expect(out).toContain('>Ann, CC0</a>')
  })

  it('drops MediaWiki cite warnings left by parsing only the introduction', () => {
    const lead = cleanArticle('<div class="mw-parser-output"><p>Text</p><div class="mw-references-wrap"></div><span class="error mw-ext-cite-error">Cite error: {{reflist}} template</span></div>')
    expect(lead.lead).toBe('<p>Text</p>')
  })

  it('strips script handlers and javascript: URLs', () => {
    const dirty = cleanArticle('<div class="mw-parser-output"><p onclick="x()">Hi <a href="javascript:alert(1)">y</a></p><iframe src="z"></iframe></div>')
    expect(dirty.lead).toBe('<p>Hi y</p>')
  })

  it('fixes images, keeps the file name and wraps tables', () => {
    const history = a.sections[0].html
    expect(history).toContain('src="https://upload.wikimedia.org/x.jpg"')
    expect(history).toContain('srcset="https://upload.wikimedia.org/x2.jpg 2x"')
    expect(history).toContain('data-file="Some image.jpg"')
    expect(history).toContain('class="table-scroll"')
  })
})
