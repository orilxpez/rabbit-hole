import { expect, it, vi } from 'vitest'
import { memoryStorage } from '../test/memoryStorage'
import { API_USER_AGENT } from './http'
import { fileNameFromUrl, getArticleHtml, getImageCredits, getLinkingBack, getMoreLike, getPageInfo, getSummary } from './wikipedia'
import { getAnchors, getFacts } from './wikidata'

vi.stubGlobal('localStorage', memoryStorage())
// Node's default User-Agent is rejected (403) or throttled (429); browsers send their own.
const realFetch = fetch
vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
  realFetch(url, { ...init, headers: { ...init.headers, 'User-Agent': API_USER_AGENT } }))

it('talks to the real APIs', async () => {
  const s = await getSummary('Hagia Sophia')
  expect(s.wikibase_item).toBe('Q12506')
  expect(await getArticleHtml('Hagia Sophia', true)).toContain('href="/wiki/Byzantine_Empire"')
  const credits = await getImageCredits([fileNameFromUrl(s.originalimage!.source)!])
  console.log('credits', Object.fromEntries(credits))
  const titles = Array.from({ length: 60 }, (_, i) => `${1900 + i}`).concat(['Mercury', 'List_of_mosques', 'France'])
  const info = await getPageInfo(titles)
  console.log('pageInfo size', info.size, info.get('Mercury'), info.get('List_of_mosques'), info.get('1959')?.dailyViews)
  const more = await getMoreLike('Hagia Sophia')
  console.log('morelike', more.slice(0, 5))
  const back = await getLinkingBack([...more, 'Banana', 'Python (programming language)'], 'Hagia Sophia')
  console.log('link back', back.size, 'of', more.length + 2, back.has('Banana'))
  // Hagia Sophia (Q12506): architect Isidore of Miletus (Q353637), commissioned under Justinian I (Q41866).
  const facts = await getFacts('Q12506', ['Q142', 'Q2485', 'Q353637', 'Q41866'], ['P84', 'P88'], ['P131'])
  console.log('types', Object.fromEntries(facts.types), 'relations', Object.fromEntries(facts.relations))
  expect(facts.types.get('Q142')).toContain('Q6256')
  const anchors = await getAnchors(['Q12506', 'Q353637'], ['Q41176', 'Q42973'])
  console.log('anchors', Object.fromEntries(anchors))
}, 30_000)
