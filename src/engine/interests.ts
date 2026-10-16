// Interest tags (used by seeds and the reader profile) and the Wikidata classes that
// define them: an item has a tag when its P31 (or, for people, P106 occupation) is
// one of these classes or a subclass up to 3 levels. Labels verified 2026-10-16.

export const INTERESTS: Record<string, { anchors: string[] }> = {
  architecture: { anchors: ['Q811979', 'Q41176', 'Q32880', 'Q42973'] }, // built structure, building, architectural style, architect
  history: { anchors: ['Q11514315', 'Q3024240', 'Q48349', 'Q198', 'Q178561'] }, // historical period, historical country, empire, war, battle
  science: { anchors: ['Q11862829', 'Q17737', 'Q11344', 'Q12136', 'Q901'] }, // academic discipline, theory, chemical element, disease, scientist
  art: { anchors: ['Q838948', 'Q968159', 'Q483501'] }, // work of art, art movement, artist
  nature: { anchors: ['Q16521', 'Q271669', 'Q8502', 'Q4022'] }, // taxon, landform, mountain, river
  technology: { anchors: ['Q11016', 'Q11019', 'Q39546', 'Q7397'] }, // technology, machine, physical tool, software
  music: { anchors: ['Q2188189', 'Q188451', 'Q34379', 'Q639669'] }, // musical work, music genre, musical instrument, musician
  literature: { anchors: ['Q7725634', 'Q571', 'Q36180'] }, // literary work, book, writer
  space: { anchors: ['Q6999', 'Q40218', 'Q5916'] }, // astronomical object, spacecraft, spaceflight
  myth: { anchors: ['Q24334685', 'Q178885', 'Q9134', 'Q9174'] }, // mythical entity, deity, mythology, religion
  philosophy: { anchors: ['Q5891', 'Q4964182'] }, // philosophy, philosopher
}

/** anchor Q-id → tags, for reading SPARQL results back. */
export const TAGS_BY_ANCHOR: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>()
  for (const [tag, { anchors }] of Object.entries(INTERESTS)) {
    for (const q of anchors) map.set(q, [...(map.get(q) ?? []), tag])
  }
  return map
})()
