import type { Catalog } from './catalog.ts'

export interface PreferencePair {
  genreId: string
  instrument: string
  weight: number
}

export interface RecommendationTarget {
  subgenreId: string
  genreId: string
  score: number
  instruments: string[]
}

export const initialPreferences: PreferencePair[] = [
  { genreId: 'jazz', instrument: 'Piano', weight: 50 },
  { genreId: 'pop', instrument: 'Piano', weight: 30 },
  { genreId: 'rock', instrument: 'Guitar', weight: 20 },
]

export function pairKey(pair: Pick<PreferencePair, 'genreId' | 'instrument'>) {
  return `${pair.genreId}::${pair.instrument}`
}

// Frontend tag-match demo. Replace this function with an API adapter for a real recommender.
export function recommendGenres(catalog: Catalog, preferences: PreferencePair[]): RecommendationTarget[] {
  const pairs = preferences.filter(p => p.weight > 0 && catalog.genreById.get(p.genreId)?.instruments.includes(p.instrument))
  const total = pairs.reduce((sum, pair) => sum + pair.weight, 0)
  if (!total) return []
  const ranked = catalog.subgenres.map(sub => {
    let score = 0
    const instruments: string[] = []
    for (const pair of pairs) {
      if (pair.genreId !== sub.genreId) continue
      const matches = sub.trackIds.filter(id => catalog.trackById.get(id)!.instruments.includes(pair.instrument)).length
      if (matches) instruments.push(pair.instrument)
      score += (pair.weight / total) * (matches / sub.trackIds.length)
    }
    return { subgenreId: sub.id, genreId: sub.genreId, score, instruments }
  }).filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || catalog.subgenreById.get(a.subgenreId)!.name.localeCompare(catalog.subgenreById.get(b.subgenreId)!.name, 'en'))
  // Offer one destination per parent genre, keeping its highest-scoring subgenre.
  return ranked.filter((result, index) => ranked.findIndex(other => other.genreId === result.genreId) === index).slice(0, 3)
}
