import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '../test/memoryStorage'
import { API_USER_AGENT, cachedFetch } from './http'

let n = 0
const uniqueUrl = () => `https://example.org/${++n}`
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

describe('cachedFetch', () => {
  it('sends Api-User-Agent and hits the network once per URL', async () => {
    const fetchMock = vi.fn(async () => ok({ a: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const url = uniqueUrl()
    const [a, b] = await Promise.all([cachedFetch(url, { ttlMs: 1000 }), cachedFetch(url, { ttlMs: 1000 })])
    await cachedFetch(url, { ttlMs: 1000 })
    expect(a).toEqual({ a: 1 })
    expect(b).toEqual({ a: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]).toEqual([url, { headers: { 'Api-User-Agent': API_USER_AGENT } }])
  })

  it('persists to localStorage so a reload does not refetch', async () => {
    const url = uniqueUrl()
    vi.stubGlobal('fetch', vi.fn(async () => ok('x')))
    await cachedFetch(url, { ttlMs: 60_000 })
    expect(localStorage.getItem('rh:cache:' + url)).toContain('"x"')
  })

  it('never runs more than three requests at once', async () => {
    let running = 0
    let peak = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      peak = Math.max(peak, ++running)
      await new Promise((r) => setTimeout(r, 5))
      running--
      return ok(1)
    }))
    await Promise.all(Array.from({ length: 6 }, () => cachedFetch(uniqueUrl(), { ttlMs: 1 })))
    expect(peak).toBe(3)
  })

  it('retries once after a 429', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '0' } }))
      .mockResolvedValueOnce(ok('done'))
    vi.stubGlobal('fetch', fetchMock)
    expect(await cachedFetch(uniqueUrl(), { ttlMs: 1 })).toBe('done')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache failures', async () => {
    const url = uniqueUrl()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    await expect(cachedFetch(url, { ttlMs: 1000 })).rejects.toThrow('HTTP 500')
    vi.stubGlobal('fetch', vi.fn(async () => ok('fine')))
    expect(await cachedFetch(url, { ttlMs: 1000 })).toBe('fine')
  })
})
