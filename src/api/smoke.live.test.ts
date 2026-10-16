import { expect, it, vi } from 'vitest'
import { memoryStorage } from '../test/memoryStorage'
import { API_USER_AGENT } from './http'
import { getHtml, getLinkingBack, getMoreLike, getPageInfo, getSummary } from './wikipedia'
import { getTypes } from './wikidata'

vi.stubGlobal('localStorage', memoryStorage())
// Node's default User-Agent is rejected (403) or throttled (429); browsers send their own.
const realFetch = fetch
vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
  realFetch(url, { ...init, headers: { ...init.headers, 'User-Agent': API_USER_AGENT } }))

it('talks to the real APIs', async () => {
  const s = await getSummary('Hagia Sophia')
  expect(s.wikibase_item).toBe('Q12506')
  expect((await getHtml('Hagia Sophia')).length).toBeGreaterThan(100_000)
  const titles = Array.from({ length: 60 }, (_, i) => `${1900 + i}`).concat(['Mercury', 'List_of_mosques', 'France'])
  const info = await getPageInfo(titles)
  console.log('pageInfo size', info.size, info.get('Mercury'), info.get('List_of_mosques'), info.get('1959')?.dailyViews)
  const more = await getMoreLike('Hagia Sophia')
  console.log('morelike', more.slice(0, 5))
  const back = await getLinkingBack([...more, 'Banana', 'Python (programming language)'], 'Hagia Sophia')
  console.log('link back', back.size, 'of', more.length + 2, back.has('Banana'))
  const types = await getTypes(['Q142', 'Q2485', 'Q2728', 'Q12506'])
  console.log('types', Object.fromEntries(types))
}, 30_000)
