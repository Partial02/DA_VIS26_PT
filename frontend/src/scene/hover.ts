interface StarHit { index?: number; distance: number; distanceToRay?: number }

// Vote among actual stars under the pointer, with a small preference for the
// current cluster so neighboring points do not make the highlight flicker.
export function hoveredGenre(hits: StarHit[], tracks: { genreId: string }[], current: string | null) {
  const nearest = hits.reduce((distance, hit) => Math.min(distance, hit.distance), Infinity)
  const scores = new Map<string, number>()
  for (const hit of hits) {
    if (hit.index === undefined) continue
    const genre = tracks[hit.index].genreId
    const weight = 1 / (.04 + (hit.distanceToRay ?? 0) ** 2) / (1 + (hit.distance - nearest) / 4)
    scores.set(genre, (scores.get(genre) ?? 0) + weight)
  }
  let best: string | null = null, highest = 0
  for (const [genre, score] of scores) {
    if (score > highest) { best = genre; highest = score }
  }
  if (current && (scores.get(current) ?? 0) >= highest * .8 && highest > 0) return current
  return best
}
