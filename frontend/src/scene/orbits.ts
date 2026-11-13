import { Vector3 } from 'three'
import { seedOf } from '../domain/catalog.ts'

// Display-only orbits; the catalog's embedding coordinates remain unchanged.
export function trackOrbitPosition(trackId: string, index: number, time: number, scale: number, target = new Vector3()) {
  const radius = (1.25 + index * .76) * scale
  const angle = (seedOf(trackId) % 628) / 100 + time * (.055 - index * .01)
  return target.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .65, .5 * scale)
}
