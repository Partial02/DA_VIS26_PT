import { Box3, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Camera } from 'three'
import type { Position, SpacePosition } from '../domain/catalog.ts'

// All three coordinates come from the tag-based spherical display layout.
export function spacePosition(position: SpacePosition) {
  return new Vector3(...position)
}

// Fit only when entering a destination or explicitly resetting it. Resizing the
// canvas changes its aspect ratio without restarting navigation or zooming.
export function frameSpace(points: Vector3[], aspect: number, fov: number, system: boolean) {
  const box = new Box3().setFromPoints(points)
  const center = box.getCenter(new Vector3())
  const tangent = Math.tan(fov * Math.PI / 360)
  const direction = new Vector3(0, -.16, 1).normalize()
  const up = new Vector3(0, 1, .16).normalize()
  // Fit actual 3D points, including the near side of the globe and tilted view.
  const distance = system ? Math.max(7 / (2 * tangent), 9 / (2 * tangent * aspect)) + 2 :
    Math.max(...points.map(point => {
      const offset = point.clone().sub(center)
      return offset.dot(direction) + Math.max(Math.abs(offset.x) / (tangent * aspect), Math.abs(offset.dot(up)) / tangent)
    })) + 2.4
  const destination = center.clone().addScaledVector(direction, distance)
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
