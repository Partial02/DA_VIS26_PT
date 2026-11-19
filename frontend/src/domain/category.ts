// Genre × session category recommender.
// The listener picks cells of a 15 genre (color) × 16 session (pattern) table.
// The same picks rank the 146 subgenres and order the songs inside one subgenre.
// Formulas are documented in docs/logic.md §8.
import type { Catalog, Track } from './catalog.ts'

export interface CategoryModel {
  meta: { source: string; sourceSha256: string; definitionSha256: string; note: string }
  sessions: { key: string; name: string }[]
  /** rates: family_rate per session (share of the genre's tracks using it). lifts: rate ÷ overall rate. */
  genres: { id: string; name: string; color: string; rates: number[]; lifts: number[] }[]
  categories: { key: string; genreId: string; session: number; tracks: number; rate: number; lift: number; instruments: string[] }[]
  subgenres: { id: string; rates: number[]; artists: number }[]
  /** [trackId, session bit mask]; bit i is sessions[i]. */
  tracks: [string, number][]
}

export interface Cell { genreId: string; session: number }

export interface CategoryIndex {
  model: CategoryModel
  cells: Cell[]
  cellOf: Map<string, number>
  genreRates: Map<string, number[]>
  subgenreRates: Map<string, number[]>
  subgenreOrder: Map<string, number>
  trackMask: Map<string, number>
  trackOrder: Map<string, number>
  maxCount: number
}

export interface RankedSubgenre {
  subgenreId: string
  genreId: string
  score: number
}

export interface ScoredTrack {
  track: Track
  /** Final listening score in [0, 1] before the artist spread. */
  score: number
  /** How well the track's sessions answer the selected cells, in [0, 1]. */
  match: number
}

/** Credit for a selected session picked in another genre's row (same pattern, other color). */
export const CROSS_GENRE = .5
/** Shrinkage strength k: small subgenres lean on their genre profile. */
export const SHRINKAGE = 12
export const CORE_WEIGHT = .86
export const SIZE_WEIGHT = .14
/** Floor of the genre-focus factor when no picked cell is in the subgenre's genre. */
export const GENRE_FLOOR = .55
export const EXPLORE_BONUS = 1.06
/** Track score weights with cells picked: match, typicality, length. */
export const TRACK_WEIGHTS = { match: .74, typical: .12, length: .14 }
/** Track score weights with nothing picked: typicality, length. */
export const IDLE_WEIGHTS = { typical: .55, length: .45 }
/** Each earlier song by the same artist lowers the next one by this much. */
export const ARTIST_PENALTY = .18

export const cellKey = (genreId: string, session: number) => `${genreId}:${session}`

export function indexCategories(model: CategoryModel, catalog: Catalog): CategoryIndex {
  const cells = model.categories.map(c => ({ genreId: c.genreId, session: c.session }))
  return {
    model,
    cells,
    cellOf: new Map(cells.map((cell, index) => [cellKey(cell.genreId, cell.session), index])),
    genreRates: new Map(model.genres.map(g => [g.id, g.rates])),
    subgenreRates: new Map(model.subgenres.map(s => [s.id, s.rates])),
    subgenreOrder: new Map(model.subgenres.map((s, index) => [s.id, index])),
    trackMask: new Map(model.tracks),
    trackOrder: new Map(model.tracks.map(([id], index) => [id, index])),
    maxCount: Math.max(...model.subgenres.map(s => catalog.subgenreById.get(s.id)?.trackIds.length ?? 0)),
  }
}

/** Per-session weight of the picks for a genre: 1 own row, CROSS_GENRE another row only, 0 unpicked. */
export function sessionWeights(index: CategoryIndex, selection: readonly number[], genreId: string): number[] {
  const weights = new Array(index.model.sessions.length).fill(0)
  for (const id of selection) {
    const cell = index.cells[id]
    weights[cell.session] = Math.max(weights[cell.session], cell.genreId === genreId ? 1 : CROSS_GENRE)
  }
  return weights
}

const f1 = (precision: number, recall: number) => precision + recall ? 2 * precision * recall / (precision + recall) : 0

/** Subgenre session profile shrunk toward its genre, scaled so its most typical session is 1. */
export function subgenreProfile(index: CategoryIndex, catalog: Catalog, subgenreId: string): number[] {
  const subgenre = catalog.subgenreById.get(subgenreId)!
  const own = index.subgenreRates.get(subgenreId)!, parent = index.genreRates.get(subgenre.genreId)!
  const lambda = subgenre.trackIds.length / (subgenre.trackIds.length + SHRINKAGE)
  const blended = own.map((rate, s) => lambda * rate + (1 - lambda) * parent[s])
  const top = Math.max(...blended)
  return top ? blended.map(rate => rate / top) : blended
}

/** Soft F1 between the picked cells and a subgenre profile. */
export function profileFit(index: CategoryIndex, profile: readonly number[], genreId: string, selection: readonly number[]): number {
  if (!selection.length) return 0
  const precision = selection.reduce((sum, id) => {
    const cell = index.cells[id]
    return sum + profile[cell.session] * (cell.genreId === genreId ? 1 : CROSS_GENRE)
  }, 0) / selection.length
  const weights = sessionWeights(index, selection, genreId)
  const total = profile.reduce((sum, rate) => sum + rate, 0)
  const recall = total ? profile.reduce((sum, rate, s) => sum + rate * weights[s], 0) / total : 0
  return f1(precision, recall)
}

/** Share of picked cells that sit in the genre's own row. */
export function genreFocus(index: CategoryIndex, selection: readonly number[], genreId: string): number {
  if (!selection.length) return 1
  return selection.filter(id => index.cells[id].genreId === genreId).length / selection.length
}

export function subgenreScore(index: CategoryIndex, catalog: Catalog, subgenreId: string, selection: readonly number[], genreVisits: Record<string, number>): number {
  const subgenre = catalog.subgenreById.get(subgenreId)!
  const core = profileFit(index, subgenreProfile(index, catalog, subgenreId), subgenre.genreId, selection)
  const size = Math.log(subgenre.trackIds.length + 1) / Math.log(index.maxCount + 1)
  const focus = GENRE_FLOOR + (1 - GENRE_FLOOR) * genreFocus(index, selection, subgenre.genreId)
  let score = (CORE_WEIGHT * core + SIZE_WEIGHT * size) * focus
  if (!genreVisits[subgenre.genreId]) score *= EXPLORE_BONUS
  return Math.min(1, score)
}

/** Every subgenre with a positive score, best first; ties keep the model order. */
export function rankSubgenres(index: CategoryIndex, catalog: Catalog, selection: readonly number[], genreVisits: Record<string, number>): RankedSubgenre[] {
  if (!selection.length) return []
  return index.model.subgenres
    .map(({ id }) => ({ subgenreId: id, genreId: catalog.subgenreById.get(id)!.genreId, score: subgenreScore(index, catalog, id, selection, genreVisits) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function sessionsOf(mask: number): number[] {
  const sessions: number[] = []
  for (let s = 0; mask >> s; s++) if (mask >> s & 1) sessions.push(s)
  return sessions
}

/** F1 between a track's sessions and the picked cells; other-genre picks count CROSS_GENRE. */
export function trackMatch(index: CategoryIndex, mask: number, genreId: string, selection: readonly number[]): number {
  const sessions = sessionsOf(mask)
  if (!selection.length || !sessions.length) return 0
  let hit = 0
  for (const id of selection) {
    const cell = index.cells[id]
    if (mask >> cell.session & 1) hit += cell.genreId === genreId ? 1 : CROSS_GENRE
  }
  const weights = sessionWeights(index, selection, genreId)
  const recall = sessions.reduce((sum, s) => sum + weights[s], 0) / sessions.length
  return f1(hit / selection.length, recall)
}

/** 1 for 2:30–5:00, falling linearly to 0 at 1:00 and at 9:00. */
export function lengthFit(duration: number): number {
  if (duration < 150) return Math.max(0, (duration - 60) / 90)
  if (duration <= 300) return 1
  return Math.max(0, 1 - (duration - 300) / 240)
}

/** Deterministic hash noise in [0, 1] (32-bit integer semantics). */
export function hash(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 982451653
  h = (h ^ (h >> 13)) * 1274126177
  return Math.min(1, (((h ^ (h >> 16)) >>> 0) / 4294967295) * 2)
}

/**
 * Songs of a subgenre in listening order. Each song scores
 *   picks:    .74 match + .12 typicality + .14 length fit
 *   no picks: .55 typicality + .45 length fit
 * plus tiny hash noise. The list is then built greedily: every earlier pick by the same
 * artist lowers a song by ARTIST_PENALTY, so repeats sink unless they fit much better.
 */
export function scoreSubgenreTracks(index: CategoryIndex, catalog: Catalog, subgenreId: string, selection: readonly number[]): ScoredTrack[] {
  const subgenre = catalog.subgenreById.get(subgenreId)
  if (!subgenre) return []
  const own = index.subgenreRates.get(subgenreId)!
  const top = Math.max(...own) || 1
  const subOrder = index.subgenreOrder.get(subgenreId) ?? 0
  const pool = subgenre.trackIds.map(id => catalog.trackById.get(id)!)
    .sort((a, b) => index.trackOrder.get(a.id)! - index.trackOrder.get(b.id)!)
    .map(track => {
      const mask = index.trackMask.get(track.id) ?? 0
      const sessions = sessionsOf(mask)
      const typical = sessions.length ? sessions.reduce((sum, s) => sum + own[s] / top, 0) / sessions.length : 0
      const match = trackMatch(index, mask, subgenre.genreId, selection)
      const length = lengthFit(track.duration)
      const base = selection.length
        ? TRACK_WEIGHTS.match * match + TRACK_WEIGHTS.typical * typical + TRACK_WEIGHTS.length * length
        : IDLE_WEIGHTS.typical * typical + IDLE_WEIGHTS.length * length
      return { track, match, score: Math.min(1, base + hash(index.trackOrder.get(track.id)!, subOrder, 31) * .008) }
    })
  return spreadArtists(pool)
}

/**
 * Greedy listening order: always the song with the highest score − ARTIST_PENALTY × (songs
 * of its artist already placed); ties go to the earlier title, then the earlier song.
 * The penalty is shared by an artist's songs, so only each artist's best remaining song
 * can win: those heads sit in a max-heap and only the winner's artist is re-queued,
 * O(n log artists) instead of rescanning every song for every slot.
 */
function spreadArtists(pool: ScoredTrack[]): ScoredTrack[] {
  // One integer tie rank per song: title order (locale aware), then pool order.
  const tie = new Map<ScoredTrack, number>()
  pool.map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.track.title.localeCompare(b.item.track.title) || a.i - b.i)
    .forEach(({ item }, rank) => tie.set(item, rank))
  const queues = new Map<string, ScoredTrack[]>()
  for (const item of pool) {
    const queue = queues.get(item.track.artist)
    if (queue) queue.push(item); else queues.set(item.track.artist, [item])
  }
  interface Head { queue: ScoredTrack[]; next: number; value: number; tie: number }
  const head = (queue: ScoredTrack[], next: number): Head => ({ queue, next, value: queue[next].score - ARTIST_PENALTY * next, tie: tie.get(queue[next])! })
  const before = (a: Head, b: Head) => a.value > b.value || (a.value === b.value && a.tie < b.tie)
  const heap: Head[] = []
  const push = (item: Head) => {
    let i = heap.push(item) - 1
    while (i) {
      const parent = (i - 1) >> 1
      if (!before(heap[i], heap[parent])) break
      ;[heap[i], heap[parent]] = [heap[parent], heap[i]]
      i = parent
    }
  }
  const pop = () => {
    const top = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1
        let best = i
        if (l < heap.length && before(heap[l], heap[best])) best = l
        if (r < heap.length && before(heap[r], heap[best])) best = r
        if (best === i) break
        ;[heap[i], heap[best]] = [heap[best], heap[i]]
        i = best
      }
    }
    return top
  }
  for (const queue of queues.values()) {
    queue.sort((a, b) => b.score - a.score || tie.get(a)! - tie.get(b)!)
    push(head(queue, 0))
  }
  const ordered: ScoredTrack[] = []
  while (heap.length) {
    const { queue, next } = pop()
    ordered.push(queue[next])
    if (next + 1 < queue.length) push(head(queue, next + 1))
  }
  return ordered
}
