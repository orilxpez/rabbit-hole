import { DAY, cachedFetch, withParams } from './http'

// SPARQL instead of wbgetentities: claims for 20 items weigh ~8 MB (1.3 MB gzipped),
// the same P31 lookup through the query service is ~500 bytes.
const SPARQL = 'https://query.wikidata.org/sparql'

/** Instance-of (P31) values that are never valid suggestions. Labels verified on Wikidata 2026-10-16. */
export const EXCLUDED_TYPES: Record<string, string> = {
  Q4167410: 'Wikimedia disambiguation page',
  Q13406463: 'Wikimedia list article',
  Q577: 'year',
  Q3186692: 'calendar year',
  Q39911: 'decade',
  Q578: 'century',
  Q14795564: 'point in time with respect to recurrent timeframe', // e.g. "July 20"
  Q47150325: 'calendar day of a given year',
  Q6256: 'country',
  Q3624078: 'sovereign state',
}

interface SparqlResponse {
  results: { bindings: Record<string, { value: string }>[] }
}

export function sparql(query: string): Promise<SparqlResponse> {
  return cachedFetch(withParams(SPARQL, { query, format: 'json' }), { ttlMs: 7 * DAY })
}

const qidOf = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1)
const isQid = (id: string) => /^Q\d+$/.test(id)

/** P31 values per item. Items without P31 are absent from the result. */
export async function getTypes(qids: string[]): Promise<Map<string, string[]>> {
  const ids = [...new Set(qids)].filter(isQid).sort() // sorted: same set, same URL, same cache entry
  const out = new Map<string, string[]>()
  if (!ids.length) return out
  const res = await sparql(`SELECT ?item ?type WHERE { VALUES ?item { ${ids.map((q) => 'wd:' + q).join(' ')} } ?item wdt:P31 ?type }`)
  for (const b of res.results.bindings) {
    const item = qidOf(b.item.value)
    out.set(item, [...(out.get(item) ?? []), qidOf(b.type.value)])
  }
  return out
}
