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

// Sorted: the same set gives the same URL, so the same cache entry.
const values = (ids: string[]) => [...new Set(ids)].filter(isQid).sort().map((q) => 'wd:' + q).join(' ')
const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => map.set(key, [...(map.get(key) ?? []), value])

export interface Facts {
  /** P31 values per item. */
  types: Map<string, string[]>
  /** Statements linking each item with `current`: current → item ("from"), item → current ("to") or a value both share. */
  relations: Map<string, { pid: string; dir: 'from' | 'to' | 'shared' }[]>
}

/** Types and relations to the current article for many items, in one query (~0.5 s). */
export async function getFacts(current: string | null, qids: string[], directPids: string[], sharedPids: string[]): Promise<Facts> {
  const facts: Facts = { types: new Map(), relations: new Map() }
  const items = values(qids)
  if (!items) return facts
  const wdt = (pids: string[]) => pids.map((p) => 'wdt:' + p).join(' ')
  const relationPatterns = current && isQid(current) ? `
    UNION { VALUES ?p { ${wdt(directPids)} } ?item ?p wd:${current} . BIND("to" AS ?dir) }
    UNION { VALUES ?p { ${wdt(directPids)} } wd:${current} ?p ?item . BIND("from" AS ?dir) }
    UNION { VALUES ?p { ${wdt(sharedPids)} } wd:${current} ?p ?v . ?item ?p ?v . BIND("shared" AS ?dir) }` : ''
  const res = await sparql(`SELECT DISTINCT ?item ?type ?p ?dir WHERE {
    VALUES ?item { ${items} }
    { ?item wdt:P31 ?type } ${relationPatterns}
  }`)
  for (const b of res.results.bindings) {
    const item = qidOf(b.item.value)
    if (b.type) push(facts.types, item, qidOf(b.type.value))
    if (b.p && b.dir) push(facts.relations, item, { pid: qidOf(b.p.value), dir: b.dir.value as 'from' | 'to' | 'shared' })
  }
  return facts
}

/**
 * Which anchor classes each item belongs to, via P31 (or P106 occupation) and up to
 * 3 subclass levels. Unbounded P279* takes 5-9 s on WDQS; 3 levels take ~1.5 s.
 */
export async function getAnchors(qids: string[], anchors: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const items = values(qids)
  if (!items) return out
  const res = await sparql(`SELECT DISTINCT ?item ?anchor WHERE {
    VALUES ?item { ${items} } VALUES ?anchor { ${values(anchors)} }
    ?item (wdt:P31|wdt:P106)/wdt:P279?/wdt:P279?/wdt:P279? ?anchor .
  }`)
  for (const b of res.results.bindings) push(out, qidOf(b.item.value), qidOf(b.anchor.value))
  return out
}
