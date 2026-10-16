import { RELATIONS, DEFAULT_RELATION } from './engine/relations'
import { useAppState } from './state'
import type { Lang } from './storage/store'

// Interface strings. English is the default because the articles are English
// Wikipedia; Spanish is a reader option. No em dashes in any string.

const en = {
  brand: 'rabbit hole',
  newThread: 'new thread',
  loading: 'Loading…',
  loadError: "This article didn't load. Check your connection and try again.",
  loadFullError: "The full article didn't load. Try again.",
  readFull: 'Read the full article',
  keepGoing: 'keep going',
  findingNext: 'Finding where to go next…',
  attrText: 'Text from',
  attrOnWikipedia: 'on Wikipedia',
  attrLicense: ', available under',
  attrImages: 'Images keep their own author and license.',
  onboardTitle: 'What pulls you in?',
  onboardHint: "Pick at least 3. You'll start reading with your first pick.",
  pickMore: 'Pick {n} more',
  startReading: 'Start reading',
  continueWith: 'Continue with {title}',
  todaysSeed: "today's seed",
  orNewThread: 'or start a new thread',
  threadsOne: 'One thread so far. Starting another never deletes anything.',
  threadsMany: '{n} threads so far. Starting another never deletes anything.',
}

type Key = keyof typeof en

const es: Record<Key, string> = {
  brand: 'rabbit hole',
  newThread: 'nuevo hilo',
  loading: 'Cargando…',
  loadError: 'El artículo no ha cargado. Comprueba la conexión y vuelve a intentarlo.',
  loadFullError: 'El artículo completo no ha cargado. Vuelve a intentarlo.',
  readFull: 'Leer artículo completo',
  keepGoing: 'sigue por aquí',
  findingNext: 'Buscando por dónde seguir…',
  attrText: 'Texto de',
  attrOnWikipedia: 'en Wikipedia',
  attrLicense: ', disponible bajo la licencia',
  attrImages: 'Las imágenes conservan su autor y licencia.',
  onboardTitle: '¿Qué te llama?',
  onboardHint: 'Marca al menos 3. Empezarás a leer por el primero que elijas.',
  pickMore: 'Elige {n} más',
  startReading: 'Empezar a leer',
  continueWith: 'Continuar con {title}',
  todaysSeed: 'semilla del día',
  orNewThread: 'o abre un hilo nuevo',
  threadsOne: 'Llevas un hilo. Empezar otro no borra nada.',
  threadsMany: 'Llevas {n} hilos. Empezar otro no borra nada.',
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
