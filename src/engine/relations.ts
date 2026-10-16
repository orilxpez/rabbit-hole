// Relation labels derived from direct Wikidata statements between the current
// article and a candidate. Order matters: the first matching row wins.
//
// Columns: [current → candidate, candidate → current, both share the same value].
// E.g. P170 creator: current's creator is the candidate → "Creador";
// the candidate's creator is the current article → "Obra"; same creator → "Mismo creador".

type Labels = [from: string | null, to: string | null, shared: string | null]

export const RELATIONS: [pid: string, labels: Labels][] = [
  ['P737', ['Influencia', 'Influencia', null]], // influenced by
  ['P135', ['Movimiento', 'Del movimiento', 'Mismo movimiento']],
  ['P170', ['Creador', 'Obra', 'Mismo creador']],
  ['P50', ['Autor', 'Obra', 'Mismo autor']],
  ['P84', ['Arquitecto', 'Obra', 'Mismo arquitecto']],
  ['P86', ['Compositor', 'Obra', 'Mismo compositor']],
  ['P88', ['Encargado por', 'Encargo', null]], // commissioned by
  ['P61', ['Inventor', 'Invento', null]], // discoverer or inventor
  ['P800', ['Obra destacada', 'Autor', null]], // notable work
  ['P112', ['Fundador', 'Fundación', null]], // founded by
  ['P144', ['Basado en', 'Adaptación', null]], // based on
  ['P138', ['Origen del nombre', 'Lleva su nombre', null]], // named after
  ['P155', ['Anterior', 'Siguiente', null]], // follows
  ['P156', ['Siguiente', 'Anterior', null]], // followed by
  ['P1365', ['Predecesor', 'Sucesor', null]], // replaces
  ['P1366', ['Sucesor', 'Predecesor', null]], // replaced by
  ['P361', ['Parte de', 'Componente', 'Mismo conjunto']], // part of
  ['P527', ['Componente', 'Parte de', null]], // has part
  ['P607', ['Conflicto', 'Participante', 'Mismo conflicto']],
  ['P710', ['Participante', 'Participó', null]], // participant
  ['P1344', ['Participó', 'Participante', null]], // participant in
  ['P19', ['Lugar de nacimiento', 'Nació aquí', null]],
  ['P20', ['Lugar de muerte', 'Murió aquí', null]],
  ['P69', ['Formación', 'Alumno', 'Misma escuela']], // educated at
  ['P101', ['Campo', 'Figura del campo', 'Mismo campo']], // field of work
  ['P921', ['Tema', 'Obra sobre el tema', 'Mismo tema']], // main subject
  ['P140', ['Religión', null, null]],
  ['P279', ['Categoría más amplia', 'Variante', null]], // subclass of
  ['P31', ['Tipo', 'Ejemplo', null]], // instance of
  ['P131', ['Ubicación', 'Lugar dentro', 'Mismo lugar']], // located in admin. entity
  ['P276', ['Ubicación', 'Lugar dentro', 'Mismo lugar']], // location
]

export const DEFAULT_RELATION = 'Relacionado'

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
