// Every tunable number of the suggestion engine lives here.

export const WEIGHTS = {
  /** Where the link sits in the current article (0..1, see positionScore). */
  position: 1,
  /** Candidate links back to the current article. Strong signal. */
  reciprocity: 0.8,
  /** Candidate also shows up in CirrusSearch morelike:. */
  moreLike: 0.5,
  /** Mid popularity is best; obscure pages and huge hubs score low (0..1). */
  popularity: 0.6,
  /** Candidate matches the reader's interests (0..1). */
  affinity: 0.5,
}

export const POSITION = {
  intro: 1,
  /** Body links decay linearly from the first section to the last. */
  bodyFirst: 0.6,
  bodyLast: 0.3,
  seeAlso: 0.3,
}

/** Average daily views, compared on a log10 scale. */
export const POPULARITY = {
  floor: 10, // at or below: score 0
  idealMin: 100, // from here to idealMax: score 1
  idealMax: 5_000,
  ceiling: 50_000, // at or above: score 0 (hubs such as "United States")
}

/** Each time a suggestion is shown and not chosen, its future score is multiplied by this. */
export const IGNORED_DECAY = 0.7

/** Soft profile adjustment from reading signals. */
export const READING = {
  /** Active reading time after which the article's interest tags get a nudge. */
  nudgeAfterMs: 60_000,
  nudge: 0.1,
  /** Interests chosen in onboarding are 1; nudges never push a tag above this. */
  maxInterest: 1,
}

export const LIMITS = {
  /** Article links considered (intro and "See also" first, then body in reading order). */
  linkCandidates: 50,
  moreLike: 20,
  /** Reciprocity is only checked for the best N, to limit requests. */
  reciprocityTopN: 15,
  suggestions: 4,
}
