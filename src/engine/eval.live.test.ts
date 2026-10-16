// @vitest-environment jsdom
// Live evaluation against the real APIs: prints the engine's picks for a fixed set of
// non-curated articles, with each pick's score breakdown. Run: npm run test:live
import { it, vi } from 'vitest'
import { memoryStorage } from '../test/memoryStorage'
import { API_USER_AGENT } from '../api/http'
import { emptyState } from '../storage/store'
import { suggest } from './suggest'

vi.stubGlobal('localStorage', memoryStorage())
const realFetch = fetch
vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
  realFetch(url, { ...init, headers: { ...init.headers, 'User-Agent': API_USER_AGENT } }))

const ARTICLES = [
  'Rohonc Codex', 'The Library of Babel', 'Tunguska event', 'Theremin', 'Emu War',
  'Lascaux', 'Mpemba effect', 'Ship of Theseus', 'Kowloon Walled City', 'Golem',
]

it('prints the picks', async () => {
  for (const title of ARTICLES) {
    const { cards } = await suggest({ title, state: emptyState() })
    const lines = cards.map((c) => {
      const p = c.scored?.parts
      const why = p && Object.entries(p).filter(([, v]) => v && v !== 1).map(([k, v]) => `${k}=${(+v).toFixed(2)}`).join(' ')
      return `   ${c.title} [${c.relation}] ${why ?? ''}`
    })
    console.log(`${title}\n${lines.join('\n')}`)
  }
}, 120_000)
