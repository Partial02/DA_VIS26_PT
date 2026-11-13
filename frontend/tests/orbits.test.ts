import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { indexCatalog, systemTracks } from '../src/domain/catalog.ts'
import { trackOrbitPosition } from '../src/scene/orbits.ts'

test('display orbits move deterministically and scale with the view', () => {
  const start = trackOrbitPosition('a-song', 1, 0, 1)
  const later = trackOrbitPosition('a-song', 1, 10, 1)
  assert.ok(start.distanceTo(later) > .1)
  assert.deepEqual(trackOrbitPosition('a-song', 1, 10, 1).toArray(), later.toArray())
  assert.ok(trackOrbitPosition('a-song', 1, 10, .5).distanceTo(later.multiplyScalar(.5)) < 1e-10)
})

test('selecting another member keeps three unique orbit songs within the subgenre', () => {
  const catalog = indexCatalog(JSON.parse(readFileSync(new URL('../public/data/music-catalog.json', import.meta.url), 'utf8')))
  const sub = catalog.subgenres.find(sub => sub.trackIds.length > 3)!
  const original = [...sub.trackIds]
  const base = systemTracks(catalog, sub.id)
  const selected = sub.trackIds.toSorted()[3]
  const updated = systemTracks(catalog, sub.id, selected)
  assert.equal(updated.length, 3)
  assert.equal(new Set(updated.map(track => track.id)).size, 3)
  assert.ok(updated.some(track => track.id === selected))
  assert.ok(updated.every(track => sub.trackIds.includes(track.id)))
  const foreign = catalog.tracks.find(track => !sub.trackIds.includes(track.id))!
  assert.deepEqual(systemTracks(catalog, sub.id, foreign.id), base)
  assert.deepEqual(sub.trackIds, original)
})
