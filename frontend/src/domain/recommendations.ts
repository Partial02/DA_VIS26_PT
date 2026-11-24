import type { Catalog } from './catalog.ts'
import { rankSubgenres } from './category.ts'
import type { RankedSubgenre } from './category.ts'

export type RecommendationTarget = RankedSubgenre

/** Full ranking of subgenres for the picked genre × session cells. */
export function rankRecommendations(catalog: Catalog, selection: readonly number[], genreVisits: Record<string, number>): RecommendationTarget[] {
  return catalog.categories ? rankSubgenres(catalog.categories, catalog, selection, genreVisits) : []
}

/** The best subgenre of up to three different parent genres. */
export function topGenreDestinations(ranked: readonly RecommendationTarget[], count = 3): RecommendationTarget[] {
  return ranked.filter((result, index) => ranked.findIndex(other => other.genreId === result.genreId) === index).slice(0, count)
}
