// Relation labels derived from direct Wikidata statements between the current
// article and a candidate. Order matters: the first matching row wins.
// Labels are English; src/i18n.ts translates them for the interface.
//
// Columns: [current → candidate, candidate → current, both share the same value].
// E.g. P170 creator: current's creator is the candidate → "Creator";
// the candidate's creator is the current article → "Work"; same creator → "Same creator".

type Labels = [from: string | null, to: string | null, shared: string | null]

export const RELATIONS: [pid: string, labels: Labels][] = [
  ['P737', ['Influence', 'Influence', null]], // influenced by
  ['P135', ['Movement', 'From the movement', 'Same movement']],
  ['P170', ['Creator', 'Work', 'Same creator']],
  ['P50', ['Author', 'Work', 'Same author']],
  ['P84', ['Architect', 'Work', 'Same architect']],
  ['P86', ['Composer', 'Work', 'Same composer']],
  ['P88', ['Commissioned by', 'Commission', null]],
  ['P61', ['Inventor', 'Invention', null]], // discoverer or inventor
  ['P800', ['Notable work', 'Author', null]],
  ['P112', ['Founder', 'Founded', null]], // founded by
  ['P144', ['Based on', 'Adaptation', null]],
  ['P138', ['Named after', 'Named after it', null]],
  ['P155', ['Previous', 'Next', null]], // follows
  ['P156', ['Next', 'Previous', null]], // followed by
  ['P1365', ['Predecessor', 'Successor', null]], // replaces
  ['P1366', ['Successor', 'Predecessor', null]], // replaced by
  ['P361', ['Part of', 'Component', 'Same whole']],
  ['P527', ['Component', 'Part of', null]], // has part
  ['P607', ['Conflict', 'Participant', 'Same conflict']],
  ['P710', ['Participant', 'Took part', null]],
  ['P1344', ['Took part', 'Participant', null]], // participant in
  ['P19', ['Birthplace', 'Born here', null]],
  ['P20', ['Place of death', 'Died here', null]],
  ['P69', ['Education', 'Alumnus', 'Same school']], // educated at
  ['P101', ['Field', 'Figure in the field', 'Same field']], // field of work
  ['P921', ['Subject', 'Work on this', 'Same subject']], // main subject
  ['P140', ['Religion', null, null]],
  ['P279', ['Broader category', 'Variant', null]], // subclass of
  ['P31', ['Type', 'Example', null]], // instance of
  ['P131', ['Location', 'Place within', 'Same place']], // located in admin. entity
  ['P276', ['Location', 'Place within', 'Same place']], // location
]

export const DEFAULT_RELATION = 'Related'

export type Direction = 'from' | 'to' | 'shared'

export interface WikidataRelation {
  pid: string
  dir: Direction
}

const COLUMN: Record<Direction, 0 | 1 | 2> = { from: 0, to: 1, shared: 2 }

export const DIRECT_PIDS = RELATIONS.map(([pid]) => pid)
export const SHARED_PIDS = RELATIONS.filter(([, l]) => l[2]).map(([pid]) => pid)

/** Most specific label for a candidate; direct statements beat shared values. */
export function relationLabel(relations: WikidataRelation[]): string {
  for (const dirs of [['from', 'to'], ['shared']] as Direction[][]) {
    for (const [pid, labels] of RELATIONS) {
      for (const dir of dirs) {
        const label = labels[COLUMN[dir]]
        if (label && relations.some((r) => r.pid === pid && r.dir === dir)) return label
      }
    }
  }
  return DEFAULT_RELATION
}
