import { Box3, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Camera } from 'three'
import { seedOf } from '../domain/catalog.ts'
import type { Position } from '../domain/catalog.ts'

// XY remains the tag embedding. Depth is visual staging, not a measured feature.
export function spacePosition(position: Position, genreId: string, trackId?: string) {
  const depth = (seedOf(genreId) % 1000 / 999 - .5) * 6
  const spread = trackId ? (seedOf(trackId) % 1000 / 999 - .5) * 1.6 : 0
  return new Vector3(position[0], position[1], depth + spread)
}

// Fit only when entering a destination or explicitly resetting it. Resizing the
// canvas changes its aspect ratio without restarting navigation or zooming.
export function frameSpace(points: Vector3[], aspect: number, fov: number, system: boolean) {
  const box = new Box3().setFromPoints(points)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const width = system ? 9 : size.x + 3
  const height = system ? 7 : size.y + 3
  const tangent = Math.tan(fov * Math.PI / 360)
  const distance = Math.max(height / (2 * tangent), width / (2 * tangent * aspect)) + (system ? 2 : 8)
  const destination = center.clone().add(new Vector3(0, -distance * .16, distance))
  return { center, destination, distance }
}

// Project the actual camera frustum onto the embedding plane for the overview map.
export function cameraFootprint(camera: Camera): Position[] | null {
  const plane = new Plane(new Vector3(0, 0, 1), 0)
  const ray = new Raycaster()
  const corners: Position[] = []
  for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
    ray.setFromCamera(new Vector2(x, y), camera)
    const point = ray.ray.intersectPlane(plane, new Vector3())
    if (!point) return null
    corners.push([point.x, point.y])
  }
  return corners
}
