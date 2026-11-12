import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { PerspectiveCamera } from 'three'
import { cameraFootprint, frameSpace, spacePosition } from '../src/scene/space.ts'
import type { MusicData } from '../src/domain/catalog.ts'

test('space staging preserves embedding coordinates and provides stable, bounded depth', () => {
  const electronic = spacePosition([.12305, 10.8231], 'electronic')
  assert.equal(electronic.x, .12305)
  assert.equal(electronic.y, 10.8231)
  assert.deepEqual(electronic, spacePosition([.12305, 10.8231], 'electronic'))
  assert.notEqual(electronic.z, spacePosition([.12305, 10.8231], 'rock').z)
  for (let i = 0; i < 100; i++) {
    const track = spacePosition([1, 2], 'electronic', String(i))
    assert.ok(Math.abs(track.z - electronic.z) <= .8)
  }
})

test('mini-map footprint follows perspective camera translation, dolly and orbit', () => {
  const camera = new PerspectiveCamera(90, 2, .1, 100)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const original = cameraFootprint(camera)!
  const near = (value: number, expected: number) => assert.ok(Math.abs(value - expected) < 1e-8)
  near(original[0][0], -20)
  near(original[0][1], 10)
  camera.position.set(3, 4, 5)
  camera.lookAt(3, 4, 0)
  camera.updateMatrixWorld()
  const moved = cameraFootprint(camera)!
  near(moved[0][0], -7)
  near(moved[0][1], 9)
  camera.position.set(4, 0, 10)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const orbited = cameraFootprint(camera)!
  assert.ok(orbited.every(p => p.every(Number.isFinite)))
  assert.notDeepEqual(orbited, original)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 20)
  camera.updateMatrixWorld()
  assert.equal(cameraFootprint(camera), null)
})

test('home and genre camera framing keeps the actual stars within rectangular viewports', () => {
  const catalog = JSON.parse(readFileSync(new URL('../public/data/music-catalog.json', import.meta.url), 'utf8')) as MusicData
  const groups = [catalog.tracks, ...catalog.genres.map(genre => catalog.tracks.filter(track => track.genreId === genre.id))]
  for (const aspect of [660 / 722, 1100 / 822, 1580 / 1002, 390 / 650]) {
    for (const group of groups) {
      const points = group.map(track => spacePosition(track.position, track.genreId, track.id))
      const { center, destination } = frameSpace(points, aspect, 45, false)
      const camera = new PerspectiveCamera(45, aspect, .1, 500)
      camera.position.copy(destination)
      camera.lookAt(center)
      camera.updateMatrixWorld()
      for (const point of points) {
        const screen = point.clone().project(camera)
        assert.ok(Math.abs(screen.x) < .98 && Math.abs(screen.y) < .98 && Math.abs(screen.z) < 1,
          `star clipped at aspect ${aspect}: ${screen.toArray()}`)
      }
    }
  }
})
