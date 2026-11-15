import type { Catalog } from './catalog.ts'
import { rankSubgenres } from './atlas.ts'
import type { RankedSubgenre } from './atlas.ts'

export type RecommendationTarget = RankedSubgenre

/** Full Genre Atlas ranking of subgenres for the performers on stage. */
export function rankRecommendations(catalog: Catalog, stage: readonly number[], genreVisits: Record<string, number>): RecommendationTarget[] {
  return catalog.atlas ? rankSubgenres(catalog.atlas, catalog, stage, genreVisits) : []
}

/** The best subgenre of up to three different parent genres, for the glass cards. */
export function topGenreDestinations(ranked: readonly RecommendationTarget[], count = 3): RecommendationTarget[] {
  return ranked.filter((result, index) => ranked.findIndex(other => other.genreId === result.genreId) === index).slice(0, count)
}
