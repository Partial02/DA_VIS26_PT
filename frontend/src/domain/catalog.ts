export type Position = [number, number]

export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  path: string
  genreId: string
  subgenreIds: string[]
  instruments: string[]
  position: Position
}

export interface Genre {
  id: string
  name: string
  color: string
  trackIds: string[]
  subgenreIds: string[]
  instruments: string[]
  position: Position
}

export interface Subgenre {
  id: string
  name: string
  genreId: string
  trackIds: string[]
  position: Position
}

export interface MusicData {
  meta: {
    source: string
    sourceSha256: string
    profileCount: number
    seed: number
    embedding: string
    placement: string
    audio: boolean
  }
  tracks: Track[]
  genres: Genre[]
  subgenres: Subgenre[]
}

export interface Catalog extends MusicData {
  trackById: Map<string, Track>
  genreById: Map<string, Genre>
  subgenreById: Map<string, Subgenre>
}

export function indexCatalog(data: MusicData): Catalog {
  return {
    ...data,
    trackById: new Map(data.tracks.map(t => [t.id, t])),
    genreById: new Map(data.genres.map(g => [g.id, g])),
    subgenreById: new Map(data.subgenres.map(s => [s.id, s])),
  }
}

export function systemTracks(catalog: Catalog, subgenreId: string): Track[] {
  return (catalog.subgenreById.get(subgenreId)?.trackIds ?? [])
    .toSorted().slice(0, 3).map(id => catalog.trackById.get(id)!)
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
