import { indexCategories, scoreSubgenreTracks } from './category.ts'
import type { CategoryIndex, CategoryModel, ScoredTrack } from './category.ts'

export type Position = [number, number]
export type SpacePosition = [number, number, number]

export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  path: string
  genreId: string
  subgenreIds: string[]
  instruments: string[]
  position: SpacePosition
}

export interface Genre {
  id: string
  name: string
  color: string
  trackIds: string[]
  subgenreIds: string[]
  instruments: string[]
  position: SpacePosition
}

export interface Subgenre {
  id: string
  name: string
  genreId: string
  trackIds: string[]
  position: SpacePosition
}

export interface MusicData {
  meta: {
    source: string
    sourceSha256: string
    profileCount: number
    seed: number
    embedding: string
    placement: string
    layoutRadius: number
    audio: boolean
  }
  tracks: Track[]
  genres: Genre[]
  subgenres: Subgenre[]
  links: [string, string][]
}

export interface Catalog extends MusicData {
  trackById: Map<string, Track>
  genreById: Map<string, Genre>
  subgenreById: Map<string, Subgenre>
  /** Genre × session category model; absent only in small test fixtures. */
  categories?: CategoryIndex
}

export function indexCatalog(data: MusicData, categoryModel?: CategoryModel): Catalog {
  const catalog: Catalog = {
    ...data,
    trackById: new Map(data.tracks.map(t => [t.id, t])),
    genreById: new Map(data.genres.map(g => [g.id, g])),
    subgenreById: new Map(data.subgenres.map(s => [s.id, s])),
  }
  if (categoryModel) catalog.categories = indexCategories(categoryModel, catalog)
  return catalog
}

// The playlist panel and the subgenre stars ask for the same ordering; the reducer
// replaces `selection` on every change, so the array itself is a safe cache key.
const playlistCache = new WeakMap<Catalog, WeakMap<readonly number[], Map<string, ScoredTrack[]>>>()

/** Scored playlist of a subgenre for the picked cells, or track ID order without the model. Treat the result as read-only. */
export function scoredPlaylist(catalog: Catalog, subgenreId: string, selection: readonly number[] = []): ScoredTrack[] {
  let bySelection = playlistCache.get(catalog)
  if (!bySelection) playlistCache.set(catalog, bySelection = new WeakMap())
  let bySubgenre = bySelection.get(selection)
  if (!bySubgenre) bySelection.set(selection, bySubgenre = new Map())
  let list = bySubgenre.get(subgenreId)
  if (!list) {
    list = catalog.categories
      ? scoreSubgenreTracks(catalog.categories, catalog, subgenreId, selection)
      : (catalog.subgenreById.get(subgenreId)?.trackIds ?? []).toSorted().map(id => ({ track: catalog.trackById.get(id)!, score: 0, match: 0 }))
    bySubgenre.set(subgenreId, list)
  }
  return list
}

export function subgenrePlaylist(catalog: Catalog, subgenreId: string, selection: readonly number[] = []): Track[] {
  return scoredPlaylist(catalog, subgenreId, selection).map(item => item.track)
}

export function adjacentSubgenre(catalog: Catalog, subgenreId: string, direction: number): Subgenre {
  const current = catalog.subgenreById.get(subgenreId)!
  const siblings = catalog.genreById.get(current.genreId)!.subgenreIds
    .map(id => catalog.subgenreById.get(id)!)
    .toSorted((a, b) => a.name.localeCompare(b.name, 'en'))
  return siblings[(siblings.findIndex(s => s.id === subgenreId) + direction + siblings.length) % siblings.length]
}

export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

export function seedOf(value: string) {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
