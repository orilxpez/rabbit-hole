import { describe, expect, it } from 'vitest'
import { emptyState } from '../storage/store'
import { addVisit, setCurrent, setSuggestionsShown } from './history'

const visit = (id: string, title: string, chosenFrom: 'seed' | 'link' | 'suggestion') =>
  ({ id, title, qid: null, chosenFrom, now: 1 })

describe('addVisit', () => {
  it('starts a thread from a seed and chains children', () => {
    let s = addVisit(emptyState(), visit('a', 'A', 'seed'))
    s = addVisit(s, visit('b', 'B', 'link'))
    expect(s.threads.a.rootNodeId).toBe('a')
    expect(s.nodes.b).toMatchObject({ parentId: 'a', threadId: 'a', chosenFrom: 'link' })
    expect(s.nodes.a.chosen).toBe('B')
    expect(s.currentNodeId).toBe('b')
  })

  it('opens a new thread for a new seed without deleting anything', () => {
    let s = addVisit(emptyState(), visit('a', 'A', 'seed'))
    s = addVisit(s, visit('c', 'C', 'seed'))
    expect(Object.keys(s.threads)).toEqual(['a', 'c'])
    expect(s.nodes.c.parentId).toBeNull()
    expect(s.nodes.a).toBeDefined()
  })

  it('counts shown-but-not-chosen suggestions', () => {
    let s = addVisit(emptyState(), visit('a', 'A', 'seed'))
    s = setSuggestionsShown(s, 'a', ['X', 'Y', 'Z'])
    s = addVisit(s, visit('y', 'Y', 'suggestion'))
    expect(s.ignoredCounts).toEqual({ X: 1, Z: 1 })
  })

  it('branches from an earlier node after going back', () => {
    let s = addVisit(emptyState(), visit('a', 'A', 'seed'))
    s = addVisit(s, visit('b', 'B', 'link'))
    s = setCurrent(s, 'a')
    s = addVisit(s, visit('c', 'C', 'link'))
    expect(s.nodes.c.parentId).toBe('a')
    expect(s.nodes.b.parentId).toBe('a')
  })

  it('treats a first visit without context as a seed', () => {
    const s = addVisit(emptyState(), visit('a', 'A', 'link'))
    expect(s.nodes.a.chosenFrom).toBe('seed')
  })
})
