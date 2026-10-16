import { describe, expect, it } from 'vitest'
import type { VisitNode } from '../storage/store'
import { layoutThread } from './layout'

const node = (id: string, parentId: string | null, visitedAt: number): VisitNode => ({
  id, title: id, qid: null, visitedAt, parentId, threadId: 'a', chosenFrom: parentId ? 'link' : 'seed',
  suggestionsShown: [], suggestionSource: null, chosen: null,
})

describe('layoutThread', () => {
  it('keeps the main line in one column and opens a column per branch', () => {
    // a → b → c, and a second branch from a → d (read later)
    const placed = layoutThread([node('a', null, 1), node('b', 'a', 2), node('c', 'b', 3), node('d', 'a', 4)], 'a')
    const at = Object.fromEntries(placed.map((p) => [p.node.id, [p.col, p.row]]))
    expect(at).toEqual({ a: [0, 0], b: [0, 1], c: [0, 2], d: [1, 1] })
    expect(placed.find((p) => p.node.id === 'd')!.order).toBe(3)
  })
})
