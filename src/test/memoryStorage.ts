/** Minimal in-memory Storage for tests. `quota` (in chars) simulates QuotaExceededError. */
export function memoryStorage(quota = Infinity): Storage {
  const map = new Map<string, string>()
  const used = () => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0)
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      const after = used() - (map.has(k) ? k.length + map.get(k)!.length : 0) + k.length + v.length
      if (after > quota) throw new DOMException('quota', 'QuotaExceededError')
      map.set(k, String(v))
    },
    removeItem: (k) => { map.delete(k) },
    clear: () => map.clear(),
  }
}
