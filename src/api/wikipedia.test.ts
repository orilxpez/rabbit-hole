import { describe, expect, it } from 'vitest'
import { averageViews, resolveTitles } from './wikipedia'

describe('resolveTitles', () => {
  it('follows normalization and then redirects', () => {
    const res = {
      query: {
        normalized: [{ from: 'List_of_mosques', to: 'List of mosques' }],
        redirects: [{ from: 'List of mosques', to: 'Lists of mosques' }],
      },
    }
    expect(resolveTitles(['List_of_mosques', 'Hagia Sophia'], res)).toEqual(
      new Map([['List_of_mosques', 'Lists of mosques'], ['Hagia Sophia', 'Hagia Sophia']]),
    )
  })
})

describe('averageViews', () => {
  it('ignores days without data', () => {
    expect(averageViews({ a: 10, b: null, c: 20 })).toBe(15)
    expect(averageViews(undefined)).toBe(0)
  })
})
