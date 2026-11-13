export function genreVisitAppearance(visits: number) {
  return { colorMix: Math.min(visits, 5) / 5, brightness: 1 + Math.min(visits, 10) * .12 }
}
