import { cacheGet, cacheSet } from '../storage/store'

// Wikimedia asks browser clients to identify themselves with this header.
// Every endpoint we use allows it in CORS preflight (checked 2026-10-16).
export const API_USER_AGENT = 'RabbitHole/0.1 (https://github.com/orilxpez/rabbit-hole)'

export const DAY = 24 * 60 * 60 * 1000
const MAX_CONCURRENT = 2
const MAX_RETRY_WAIT_MS = 5000

const memory = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

/**
 * GET with three cache levels: memory, localStorage (with TTL) and in-flight
 * dedupe, so a page that asks twice for the same URL only hits the network once.
 */
export function cachedFetch<T>(url: string, opts: { ttlMs: number; as?: 'json' | 'text' }): Promise<T> {
  if (memory.has(url)) return Promise.resolve(memory.get(url) as T)
  const stored = cacheGet(url)
  if (stored !== undefined) {
    memory.set(url, stored)
    return Promise.resolve(stored as T)
  }
  let pending = inflight.get(url)
  if (!pending) {
    pending = limited(() => request(url, opts.as ?? 'json'))
      .then((value) => {
        memory.set(url, value)
        cacheSet(url, value, opts.ttlMs)
        return value
      })
      .finally(() => inflight.delete(url))
    inflight.set(url, pending)
  }
  return pending as Promise<T>
}

async function request(url: string, as: 'json' | 'text', retried = false): Promise<unknown> {
  const res = await fetch(url, { headers: { 'Api-User-Agent': API_USER_AGENT } })
  if (res.status === 429 && !retried) {
    // Wikimedia enforces rate limits since 2026: wait once as told, then give up.
    const wait = Math.min(Number(res.headers.get('Retry-After') ?? 1) * 1000, MAX_RETRY_WAIT_MS)
    await new Promise((r) => setTimeout(r, wait))
    return request(url, as, true)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return as === 'json' ? res.json() : res.text()
}

// Tiny concurrency limiter: no request bursts, whatever the caller does.
let active = 0
const waiting: (() => void)[] = []

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active < MAX_CONCURRENT) active++
  else await new Promise<void>((resolve) => waiting.push(resolve)) // slot is handed over, see below
  try {
    return await fn()
  } finally {
    const next = waiting.shift()
    if (next) next()
    else active--
  }
}

/** Builds a URL with encoded query params. */
export function withParams(base: string, params: Record<string, string | number>): string {
  const url = new URL(base)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  return url.toString()
}
