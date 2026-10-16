import type { VisitNode } from '../storage/store'

export interface Placed {
  node: VisitNode
  /** Column: the main line stays in column 0, each branch opens a column to the right. */
  col: number
  /** Depth from the root: the hole goes down. */
  row: number
  /** Order of visit, for animating the drawing in the order it was read. */
  order: number
}

/**
 * Lays out one thread as a tree that grows downwards. The first child continues its
 * parent's column; later children (branches) start a new column to the right.
 */
export function layoutThread(nodes: VisitNode[], rootId: string): Placed[] {
  const children = new Map<string, VisitNode[]>()
  for (const n of nodes) {
    if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n])
  }
  for (const list of children.values()) list.sort((a, b) => a.visitedAt - b.visitedAt)
  const byTime = [...nodes].sort((a, b) => a.visitedAt - b.visitedAt).map((n) => n.id)

  const placed: Placed[] = []
  let nextCol = 1
  const visit = (node: VisitNode, col: number, row: number) => {
    placed.push({ node, col, row, order: byTime.indexOf(node.id) })
    ;(children.get(node.id) ?? []).forEach((child, i) => visit(child, i === 0 ? col : nextCol++, row + 1))
  }
  const root = nodes.find((n) => n.id === rootId)
  if (root) visit(root, 0, 0)
  return placed
}
