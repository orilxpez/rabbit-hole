import { RELATIONS, DEFAULT_RELATION } from './engine/relations'
import { useAppState } from './state'
import type { Lang } from './storage/store'

// Interface strings. English is the default because the articles are English
// Wikipedia; Spanish is a reader option. No em dashes in any string.

const en = {
  brand: 'rabbit hole',
  map: 'map',
  stop: 'stop',
  depth: '{n} deep',
  loading: 'Loading…',
  loadError: "This article didn't load. Check your connection and try again.",
  loadFullError: "The full article didn't load. Try again.",
  readFull: 'Read the full article',
  readInEnglish: 'Read the English original',
  readInSpanish: 'Read the Spanish version',
  onlyEnglish: 'Only on English Wikipedia.',
  downTheHole: 'down the hole',
  goDeeper: 'Go deeper',
  otherPaths: 'Other paths ({n})',
  hidePaths: 'Hide other paths',
  findingNext: 'Finding where to go next…',
  attrText: 'Text from',
  attrOnWikipedia: 'on Wikipedia',
  attrLicense: ', available under',
  attrImages: 'Images keep their own author and license.',
  pickTitle: 'Pick a way in',
  pickHint: 'One is enough. The rabbit hole goes on from there.',
  continueWith: 'Continue with {title}',
  todaysSeed: "today's seed",
  orNewThread: 'or start a new thread',
  seeMap: 'See your map',
  mapTitleOne: 'One article down',
  mapTitle: '{n} articles down',
  mapEmpty: 'Nothing here yet. Pick a seed and start reading.',
  mapFromTo: 'From {from} to {to}.',
  keepReading: 'Keep reading',
  startNew: 'Start a new thread',
  yourThreads: 'your threads',
  stopped: 'stopped',
  open: 'open',
}

type Key = keyof typeof en

const es: Record<Key, string> = {
  brand: 'rabbit hole',
  map: 'mapa',
  stop: 'parar',
  depth: '{n} de profundidad',
  loading: 'Cargando…',
  loadError: 'El artículo no ha cargado. Comprueba la conexión y vuelve a intentarlo.',
  loadFullError: 'El artículo completo no ha cargado. Vuelve a intentarlo.',
  readFull: 'Leer artículo completo',
  readInEnglish: 'Leer el original en inglés',
  readInSpanish: 'Leer la versión en español',
  onlyEnglish: 'Solo existe en la Wikipedia en inglés.',
  downTheHole: 'más hondo',
  goDeeper: 'Seguir bajando',
  otherPaths: 'Otros caminos ({n})',
  hidePaths: 'Ocultar otros caminos',
  findingNext: 'Buscando por dónde seguir…',
  attrText: 'Texto de',
  attrOnWikipedia: 'en Wikipedia',
  attrLicense: ', disponible bajo la licencia',
  attrImages: 'Las imágenes conservan su autor y licencia.',
  pickTitle: 'Elige por dónde entrar',
  pickHint: 'Con uno basta. La madriguera sigue desde ahí.',
  continueWith: 'Continuar con {title}',
  todaysSeed: 'semilla del día',
  orNewThread: 'o abre un hilo nuevo',
  seeMap: 'Ver tu mapa',
  mapTitleOne: 'Un artículo hacia abajo',
  mapTitle: '{n} artículos hacia abajo',
  mapEmpty: 'Aquí aún no hay nada. Elige una semilla y empieza a leer.',
  mapFromTo: 'De {from} a {to}.',
  keepReading: 'Seguir leyendo',
  startNew: 'Abrir un hilo nuevo',
  yourThreads: 'tus hilos',
  stopped: 'parado',
  open: 'abierto',
}

// Relation labels come from engine/relations.ts in English.
const RELATIONS_ES: Record<string, string> = {
  Influence: 'Influencia', Movement: 'Movimiento', 'From the movement': 'Del movimiento', 'Same movement': 'Mismo movimiento',
  Creator: 'Creador', Work: 'Obra', 'Same creator': 'Mismo creador', Author: 'Autor', 'Same author': 'Mismo autor',
  Architect: 'Arquitecto', 'Same architect': 'Mismo arquitecto', Composer: 'Compositor', 'Same composer': 'Mismo compositor',
  'Commissioned by': 'Encargado por', Commission: 'Encargo', Inventor: 'Inventor', Invention: 'Invento',
  'Notable work': 'Obra destacada', Founder: 'Fundador', Founded: 'Fundación', 'Based on': 'Basado en',
  Adaptation: 'Adaptación', 'Named after': 'Origen del nombre', 'Named after it': 'Lleva su nombre',
  Previous: 'Anterior', Next: 'Siguiente', Predecessor: 'Predecesor', Successor: 'Sucesor',
  'Part of': 'Parte de', Component: 'Componente', 'Same whole': 'Mismo conjunto', Conflict: 'Conflicto',
  Participant: 'Participante', 'Same conflict': 'Mismo conflicto', 'Took part': 'Participó',
  Birthplace: 'Lugar de nacimiento', 'Born here': 'Nació aquí', 'Place of death': 'Lugar de muerte', 'Died here': 'Murió aquí',
  Education: 'Formación', Alumnus: 'Alumno', 'Same school': 'Misma escuela', Field: 'Campo',
  'Figure in the field': 'Figura del campo', 'Same field': 'Mismo campo', Subject: 'Tema',
  'Work on this': 'Obra sobre el tema', 'Same subject': 'Mismo tema', Religion: 'Religión',
  'Broader category': 'Categoría más amplia', Variant: 'Variante', Type: 'Tipo', Example: 'Ejemplo',
  Location: 'Ubicación', 'Place within': 'Lugar dentro', 'Same place': 'Mismo lugar', [DEFAULT_RELATION]: 'Relacionado',
}

const STRINGS: Record<Lang, Record<Key, string>> = { en, es }

export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  return STRINGS[lang][key].replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? ''))
}

export function relationText(lang: Lang, label: string): string {
  return lang === 'es' ? RELATIONS_ES[label] ?? label : label
}

/** Every English relation label has a Spanish translation (checked in tests). */
export function missingRelationTranslations(): string[] {
  const labels = new Set(RELATIONS.flatMap(([, l]) => l).filter((l): l is string => !!l))
  return [...labels].filter((l) => !RELATIONS_ES[l])
}

export function useT() {
  const { lang } = useAppState()
  return Object.assign((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), {
    lang,
    relation: (label: string) => relationText(lang, label),
  })
}
