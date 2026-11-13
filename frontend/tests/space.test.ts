import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { PerspectiveCamera, Vector3 } from 'three'
import { cameraFootprint, frameSpace, spaceFlight, spacePosition } from '../src/scene/space.ts'
import type { MusicData } from '../src/domain/catalog.ts'

test('space coordinates retain the full data-derived depth without genre offsets', () => {
  const position: [number, number, number] = [1.23, -4.56, 7.89]
  assert.deepEqual(spacePosition(position).toArray(), position)
  const vector = spacePosition(position)
  vector.z = 0
  assert.equal(position[2], 7.89)
})

test('camera flights curve between exact destinations without moving the source coordinates', () => {
  const origin = new Vector3(0, -2, 40), destination = new Vector3(8, 4, 12)
  const path = spaceFlight(origin, destination)
  assert.deepEqual(path.getPoint(0), origin)
  assert.deepEqual(path.getPoint(1), destination)
  assert.notDeepEqual(path.getPoint(.5), origin.clone().lerp(destination, .5))
  assert.deepEqual(origin.toArray(), [0, -2, 40])
  assert.deepEqual(destination.toArray(), [8, 4, 12])
  for (let i = 0; i <= 100; i++) assert.ok(path.getPoint(i / 100).toArray().every(Number.isFinite))
  assert.deepEqual(spaceFlight(origin, origin).getPoint(.5), origin)
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
      const points = group.map(track => spacePosition(track.position))
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

test('subgenre close-up zooms into existing stars without changing their coordinates', () => {
  const points = [new Vector3(-3, -2, 1), new Vector3(4, 3, -1), new Vector3(1, 0, 2)]
  const originals = points.map(point => point.toArray())
  const wide = frameSpace(points, 1.4, 45, false)
  const close = frameSpace(points, 1.4, 45, true)
  assert.ok(close.distance < wide.distance)
  assert.deepEqual(close.center.toArray(), wide.center.toArray())
  assert.deepEqual(points.map(point => point.toArray()), originals)
})
