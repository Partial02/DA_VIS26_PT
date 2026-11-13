interface StarHit { index?: number; distance: number; distanceToRay?: number }

export const starHitRadius = .32

// Vote among actual stars, retaining the current region near a shared boundary.
function hoveredCluster(hits: StarHit[], groups: (index: number) => string[], current: string | null) {
  const nearest = hits.reduce((distance, hit) => Math.min(distance, hit.distance), Infinity)
  const scores = new Map<string, number>()
  for (const hit of hits) {
    if (hit.index === undefined) continue
    const memberships = groups(hit.index)
    const weight = 1 / (.04 + (hit.distanceToRay ?? 0) ** 2) / (1 + (hit.distance - nearest) / 4)
    for (const id of memberships) scores.set(id, (scores.get(id) ?? 0) + weight / memberships.length)
  }
  let best: string | null = null, highest = 0
  for (const [id, score] of scores) {
    if (score > highest) { best = id; highest = score }
  }
  if (current && (scores.get(current) ?? 0) >= highest * .8 && highest > 0) return current
  return best
}

export function hoveredGenre(hits: StarHit[], tracks: { genreId: string }[], current: string | null) {
  return hoveredCluster(hits, index => [tracks[index].genreId], current)
}

export function hoveredSubgenre(hits: StarHit[], tracks: { genreId: string; subgenreIds: string[] }[], genreId: string, current: string | null) {
  return hoveredCluster(hits.filter(hit => hit.index !== undefined && tracks[hit.index].genreId === genreId),
    index => tracks[index].subgenreIds, current)
}
