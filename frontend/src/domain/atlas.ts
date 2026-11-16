// Genre Atlas v4 recommendation model: performers (session × family) on a stage
// rank subgenres, and the stage orders the songs inside a subgenre.
// Formulas follow genre_atlas_v4.html and docs/logic.md §8.
import type { Catalog, Track } from './catalog.ts'

export interface AtlasModel {
  meta: { source: string; catalogSha256: string; note: string }
  sessions: { key: string; name: string }[]
  baseRates: number[]
  families: { name: string; genreIds: string[]; sessions: number[] }[]
  genres: { id: string; name: string; weights: number[] }[]
  subgenres: { id: string; weights: number[]; rates: number[]; artists: number }[]
  /** [trackId, session bit mask] in v4 order; the order feeds the tie-break hash. */
  tracks: [string, number][]
}

export interface Performer {
  id: number
  session: number
  family: number
}

export interface Atlas {
  model: AtlasModel
  performers: Performer[]
  familyOfGenre: Map<string, number>
  genreWeights: Map<string, number[]>
  genreName: Map<string, string>
  subgenreWeights: Map<string, number[]>
  subgenreIndex: Map<string, number>
  trackIndex: Map<string, number>
  trackMask: Map<string, number>
  maxCount: number
}

export interface RankedSubgenre {
  subgenreId: string
  genreId: string
  score: number
}

export interface LineupChange {
  /** Core sessions (weight 2) that were missing and get a performer. */
  need: number[]
  /** Performer ids whose session has weight 0 for the subgenre. */
  drop: number[]
}

/** Weight of the family-mismatch floor (FAMW0). */
export const FAMILY_FLOOR = .55
/** Shrinkage strength k: small subgenres lean on their parent genre. */
export const SHRINKAGE = 12
export const CORE_WEIGHT = .86
export const SIZE_WEIGHT = .14
export const EXPLORE_BONUS = 1.06
/** applyLineup prefers these families, in order, when adding a core session. */
const LINEUP_FAMILIES = [0, 1, 2, 3]

export function indexAtlas(model: AtlasModel, catalog: Catalog): Atlas {
  const performers: Performer[] = []
  model.families.forEach((family, index) => family.sessions.forEach(session => performers.push({ id: performers.length, session, family: index })))
  const familyOfGenre = new Map<string, number>()
  model.families.forEach((family, index) => family.genreIds.forEach(id => familyOfGenre.set(id, index)))
  return {
    model,
    performers,
    familyOfGenre,
    genreWeights: new Map(model.genres.map(g => [g.id, g.weights])),
    genreName: new Map(model.genres.map(g => [g.id, g.name])),
    subgenreWeights: new Map(model.subgenres.map(s => [s.id, s.weights])),
    subgenreIndex: new Map(model.subgenres.map((s, index) => [s.id, index])),
    trackIndex: new Map(model.tracks.map(([id], index) => [id, index])),
    trackMask: new Map(model.tracks),
    maxCount: Math.max(...model.subgenres.map(s => catalog.subgenreById.get(s.id)?.trackIds.length ?? 0)),
  }
}

/** Distinct sessions on stage, in the order performers were added. */
export function stageSessions(atlas: Atlas, stage: readonly number[]): number[] {
  return [...new Set(stage.map(id => atlas.performers[id].session))]
}

/** F1 of stage sessions against a 0/1/2 weight vector. */
export function fit(weights: readonly number[], sessions: readonly number[]): number {
  if (!sessions.length) return 0
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (!total) return 0
  const hit = sessions.reduce((sum, s) => sum + weights[s], 0)
  const coverage = hit / total, precision = hit / (2 * sessions.length)
  return coverage + precision ? 2 * coverage * precision / (coverage + precision) : 0
}

/** Share of stage performers drawn from the family that owns the genre. */
export function familyShare(atlas: Atlas, stage: readonly number[], genreId: string): number {
  if (!stage.length) return 1
  const want = atlas.familyOfGenre.get(genreId)
  return stage.filter(id => atlas.performers[id].family === want).length / stage.length
}

export function subgenreScore(atlas: Atlas, catalog: Catalog, subgenreId: string, stage: readonly number[], genreVisits: Record<string, number>): number {
  const subgenre = catalog.subgenreById.get(subgenreId)!
  const sessions = stageSessions(atlas, stage)
  const count = subgenre.trackIds.length
  const own = fit(atlas.subgenreWeights.get(subgenreId)!, sessions)
  const parent = fit(atlas.genreWeights.get(subgenre.genreId)!, sessions)
  const lambda = count / (count + SHRINKAGE)
  const core = lambda * own + (1 - lambda) * parent
  const size = Math.log(count + 1) / Math.log(atlas.maxCount + 1)
  const family = FAMILY_FLOOR + (1 - FAMILY_FLOOR) * familyShare(atlas, stage, subgenre.genreId)
  let score = (CORE_WEIGHT * core + SIZE_WEIGHT * size) * family
  if (!genreVisits[subgenre.genreId]) score *= EXPLORE_BONUS
  return Math.min(1, score)
}

/** Every subgenre with a positive score, best first (ties keep the v4 order). */
export function rankSubgenres(atlas: Atlas, catalog: Catalog, stage: readonly number[], genreVisits: Record<string, number>): RankedSubgenre[] {
  if (!stage.length) return []
  return atlas.model.subgenres
    .map(({ id }) => ({ subgenreId: id, genreId: catalog.subgenreById.get(id)!.genreId, score: subgenreScore(atlas, catalog, id, stage, genreVisits) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function lineupDiff(atlas: Atlas, subgenreId: string, stage: readonly number[]): LineupChange {
  const weights = atlas.subgenreWeights.get(subgenreId)!
  const have = stageSessions(atlas, stage)
  const need: number[] = []
  for (let session = 0; session < weights.length; session++) if (weights[session] === 2 && !have.includes(session)) need.push(session)
  const drop = stage.filter(id => weights[atlas.performers[id].session] === 0)
  return { need, drop }
}

/** Bring on missing core sessions and send off performers the subgenre never uses. */
export function applyLineup(atlas: Atlas, subgenreId: string, stage: readonly number[]): LineupChange & { stage: number[] } {
  const change = lineupDiff(atlas, subgenreId, stage)
  const next = stage.filter(id => !change.drop.includes(id))
  for (const session of change.need) {
    const free = (family?: number) => atlas.performers.find(p => p.session === session && (family === undefined || p.family === family) && !next.includes(p.id))
    const pick = LINEUP_FAMILIES.map(family => free(family)).find(Boolean) ?? free()
    if (pick) next.push(pick.id)
  }
  return { ...change, stage: next }
}

/** F1 between a track's session mask and the stage sessions (precision without the 2× weight). */
export function trackMatch(mask: number, sessions: readonly number[]): number {
  if (!sessions.length) return 0
  let hit = 0
  for (const session of sessions) if (mask >> session & 1) hit++
  let total = 0
  for (let session = 0; session < 9; session++) if (mask >> session & 1) total++
  if (!total) return 0
  const coverage = hit / total, precision = hit / sessions.length
  const f = coverage + precision ? 2 * coverage * precision / (coverage + precision) : 0
  return Math.max(0, Math.min(1, f))
}

/** v4 hash noise in [0, 1]; keep the 32-bit integer semantics exactly. */
export function hash(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 982451653
  h = (h ^ (h >> 13)) * 1274126177
  return Math.min(1, (((h ^ (h >> 16)) >>> 0) / 4294967295) * 2)
}

export function lengthBonus(duration: number): number {
  const seconds = Math.floor(duration)
  return seconds >= 120 && seconds <= 300 ? .03 : seconds > 420 ? -.04 : 0
}

/**
 * Songs of a subgenre in listening order: stage fit + length bonus + tiny hash noise,
 * then each artist's first song before everyone's remaining songs. Scores are never shown.
 */
export function orderSubgenreTracks(atlas: Atlas, catalog: Catalog, subgenreId: string, stage: readonly number[]): Track[] {
  const subgenre = catalog.subgenreById.get(subgenreId)
  if (!subgenre) return []
  const sessions = stageSessions(atlas, stage)
  const subIndex = atlas.subgenreIndex.get(subgenreId)!
  const scored = subgenre.trackIds
    .map(id => ({ track: catalog.trackById.get(id)!, index: atlas.trackIndex.get(id)! }))
    .sort((a, b) => a.index - b.index)
    .map(({ track, index }) => {
      const match = trackMatch(atlas.trackMask.get(track.id)!, sessions)
      return { track, score: Math.max(0, Math.min(1, match + lengthBonus(track.duration) + hash(index, subIndex, 31) * .008)) }
    })
    .sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title))
  const seen = new Set<string>()
  const first: Track[] = [], rest: Track[] = []
  for (const { track } of scored) {
    if (seen.has(track.artist)) rest.push(track)
    else { seen.add(track.artist); first.push(track) }
  }
  return [...first, ...rest]
}
