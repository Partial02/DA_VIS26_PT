import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { adjacentSubgenre, indexCatalog, systemTracks } from '../src/domain/catalog.ts'
import type { MusicData, Track } from '../src/domain/catalog.ts'
import { recommendGenres, pairKey } from '../src/domain/recommendations.ts'
import { experienceReducer, initialState } from '../src/state/reducer.ts'
import { createDemoSignal } from '../src/domain/visualization.ts'

const catalog = indexCatalog(JSON.parse(readFileSync(new URL('../public/data/music-catalog.json', import.meta.url), 'utf8')) as MusicData)

test('the shipped catalog retains every real track and genre relationship', () => {
  assert.equal(catalog.tracks.length, 4961)
  assert.equal(catalog.trackById.size, 4961)
  assert.equal(catalog.genres.length, 15)
  assert.equal(catalog.subgenres.length, 146)
  assert.equal(catalog.meta.profileCount, new Set(catalog.tracks.map(t => JSON.stringify([t.genreId, t.subgenreIds, t.instruments]))).size)
  assert.equal(new Set(catalog.genres.map(g => g.color)).size, 15)
  assert.ok(catalog.genres.every(g => catalog.genreById.get(g.id) === g))
  assert.equal(catalog.trackById.get('0007391')!.title, 'Au Coeur Des Villes / Feat . Cynthia')
  assert.equal(catalog.trackById.get('0007391')!.duration, 188.1)
  assert.ok(catalog.genres.some(g => g.name === 'Folk / Country'))
  for (const sub of catalog.subgenres) {
    assert.ok(catalog.genreById.get(sub.genreId)!.subgenreIds.includes(sub.id))
    assert.equal(systemTracks(catalog, sub.id).length, 3)
    for (const id of sub.trackIds) {
      assert.ok(catalog.trackById.get(id)!.subgenreIds.includes(sub.id))
    }
  }
  for (const track of catalog.tracks) assert.ok(track.position.every(Number.isFinite))
})

test('the music globe fills a solid sphere and every constellation joins nearby real tracks', () => {
  const radius = catalog.meta.layoutRadius
  assert.equal(radius, 12)
  let inner = 0
  for (const track of catalog.tracks) {
    assert.equal(track.position.length, 3)
    const distance = Math.hypot(...track.position)
    assert.ok(distance <= radius + .0001)
    if (distance < radius / 2) inner++
  }
  assert.ok(Math.abs(inner / catalog.tracks.length - .125) < .005)
  assert.ok(catalog.links.length > 0 && catalog.links.length <= 40)
  const used = new Set<string>()
  for (const [left, right] of catalog.links) {
    const a = catalog.trackById.get(left)!, b = catalog.trackById.get(right)!
    assert.ok(a && b && left !== right)
    assert.ok(!used.has(left) && !used.has(right))
    used.add(left); used.add(right)
    assert.ok(a.instruments.some(instrument => b.instruments.includes(instrument)))
    assert.ok(Math.hypot(...a.position.map((value, index) => value - b.position[index])) < 2.8)
  }
  for (const group of [...catalog.genres, ...catalog.subgenres]) {
    for (let axis = 0; axis < 3; axis++) {
      const center = group.trackIds.reduce((sum, id) => sum + catalog.trackById.get(id)!.position[axis], 0) / group.trackIds.length
      assert.ok(Math.abs(group.position[axis] - center) < .0001)
    }
  }
})

test('density balancing retains more tag affinity among neighbors than unrelated tracks', () => {
  const affinity = (a: Track, b: Track) => (a.genreId === b.genreId ? .15 : 0)
    + .3 * a.subgenreIds.filter(id => b.subgenreIds.includes(id)).length / Math.sqrt(a.subgenreIds.length * b.subgenreIds.length)
    + .55 * a.instruments.filter(id => b.instruments.includes(id)).length / Math.sqrt(a.instruments.length * b.instruments.length)
  let nearby = 0, baseline = 0
  for (let sample = 0; sample < 64; sample++) {
    const track = catalog.tracks[sample * 73 % catalog.tracks.length]
    const neighbors = catalog.tracks.filter(other => other !== track).map(other => ({ other,
      distance: other.position.reduce((sum, value, axis) => sum + (value - track.position[axis]) ** 2, 0),
    })).sort((a, b) => a.distance - b.distance).slice(0, 8)
    nearby += neighbors.reduce((sum, { other }) => sum + affinity(track, other), 0) / 8
    for (let i = 0; i < 8; i++) baseline += affinity(track, catalog.tracks[(sample * 173 + i * 617 + 29) % catalog.tracks.length]) / 8
  }
  assert.ok(nearby / 64 > .6)
  assert.ok((nearby - baseline) / 64 > .3)
})

function scoringCatalog() {
  const makeTrack = (id: string, genreId: string, subgenreId: string, instruments: string[]): Track => ({
    id, genreId, subgenreIds: [subgenreId], instruments, title: id, artist: 'Test', duration: 180, path: '', position: [0, 0, 0],
  })
  return indexCatalog({
    meta: catalog.meta, links: [],
    tracks: [makeTrack('01', 'jazz', 'jazz--a', ['Piano']), makeTrack('02', 'jazz', 'jazz--a', ['Guitar']),
      makeTrack('03', 'jazz', 'jazz--b', ['Piano']), makeTrack('04', 'pop', 'pop--c', ['Piano'])],
    genres: [
      { id: 'jazz', name: 'Jazz', trackIds: ['01', '02', '03'], subgenreIds: ['jazz--a', 'jazz--b'], instruments: ['Piano', 'Guitar'], color: '#fff', position: [0, 0, 0] },
      { id: 'pop', name: 'Pop', trackIds: ['04'], subgenreIds: ['pop--c'], instruments: ['Piano'], color: '#fff', position: [1, 1, 0] },
    ],
    subgenres: [
      { id: 'jazz--a', name: 'Acid Jazz', genreId: 'jazz', trackIds: ['01', '02'], position: [0, 0, 0] },
      { id: 'jazz--b', name: 'Bebop', genreId: 'jazz', trackIds: ['03'], position: [0, 0, 0] },
      { id: 'pop--c', name: 'Chanson', genreId: 'pop', trackIds: ['04'], position: [1, 1, 0] },
    ],
  })
}

test('recommendations normalize weights and combine actual instrument frequencies', () => {
  const fixture = scoringCatalog()
  const results = recommendGenres(fixture, [
    { genreId: 'jazz', instrument: 'Piano', weight: 75 }, { genreId: 'pop', instrument: 'Piano', weight: 25 },
  ])
  assert.deepEqual(results.map(r => [r.subgenreId, r.score]), [['jazz--b', .75], ['pop--c', .25]])
  assert.deepEqual(results[0].instruments, ['Piano'])
  const combined = recommendGenres(fixture, [
    { genreId: 'jazz', instrument: 'Piano', weight: 50 }, { genreId: 'jazz', instrument: 'Guitar', weight: 50 },
  ])
  assert.equal(combined[0].subgenreId, 'jazz--a') // .25 + .25; alphabetical tie break.
  assert.equal(combined[0].score, .5)
  assert.equal(combined.length, 1)
})

test('weight changes alter destinations; empty, zero and nonexistent pairs yield no results', () => {
  const fixture = scoringCatalog()
  assert.deepEqual(recommendGenres(fixture, []), [])
  assert.deepEqual(recommendGenres(fixture, [{ genreId: 'jazz', instrument: 'Piano', weight: 0 }]), [])
  assert.deepEqual(recommendGenres(fixture, [{ genreId: 'jazz', instrument: 'Unknown', weight: 100 }]), [])
  assert.deepEqual(recommendGenres(fixture, [{ genreId: 'pop', instrument: 'Piano', weight: 100 }]).map(r => r.subgenreId), ['pop--c'])
  const actual = recommendGenres(catalog, initialState.preferences)
  assert.equal(actual.length, 3)
  assert.equal(new Set(actual.map(r => r.genreId)).size, 3)
  assert.ok(actual.every(r => catalog.subgenreById.has(r.subgenreId) && r.score > 0))
})

test('pairs cannot be duplicated and removing all input leaves a valid empty mix', () => {
  const duplicate = experienceReducer(initialState, { type: 'addPair', pair: initialState.preferences[0] })
  assert.equal(duplicate, initialState)
  let state = experienceReducer(initialState, { type: 'addPair', pair: { genreId: 'jazz', instrument: 'Guitar', weight: 25 } })
  assert.equal(state.preferences.length, 4)
  for (const pair of [...state.preferences]) state = experienceReducer(state, { type: 'removePair', key: pairKey(pair) })
  assert.equal(state.preferences.length, 0)
})

test('only arrival at the current destination increments visits, including rapid retargeting', () => {
  const destination = (id: string) => ({ level: 'system' as const, genreId: 'jazz', subgenreId: id })
  let state = experienceReducer(initialState, { type: 'navigate', destination: destination('a') })
  state = experienceReducer(state, { type: 'arrive', transition: 1 })
  assert.deepEqual(state.visits, { a: 1 })
  assert.equal(experienceReducer(state, { type: 'arrive', transition: 1 }), state)
  state = experienceReducer(state, { type: 'selectTrack', id: '0007391' })
  assert.deepEqual(state.visits, { a: 1 })
  assert.equal(experienceReducer(state, { type: 'navigate', destination: destination('a') }), state)
  state = experienceReducer(state, { type: 'navigate', destination: destination('b') })
  state = experienceReducer(state, { type: 'navigate', destination: destination('c') })
  state = experienceReducer(state, { type: 'arrive', transition: 2 })
  assert.deepEqual(state.visits, { a: 1 })
  state = experienceReducer(state, { type: 'arrive', transition: 3 })
  assert.deepEqual(state.visits, { a: 1, c: 1 })
  state = experienceReducer(state, { type: 'navigate', destination: destination('a') })
  state = experienceReducer(state, { type: 'arrive', transition: 4 })
  assert.deepEqual(state.visits, { a: 2, c: 1 })
  assert.deepEqual(state.history, ['a', 'c', 'a'])
})

test('swiping wraps through alphabetic siblings, without crossing parent genres', () => {
  const jazz = catalog.genreById.get('jazz')!
  const siblings = jazz.subgenreIds.map(id => catalog.subgenreById.get(id)!).sort((a, b) => a.name.localeCompare(b.name, 'en'))
  assert.equal(adjacentSubgenre(catalog, siblings[0].id, -1).id, siblings.at(-1)!.id)
  assert.equal(adjacentSubgenre(catalog, siblings.at(-1)!.id, 1).id, siblings[0].id)
  assert.equal(adjacentSubgenre(catalog, siblings[0].id, 1).genreId, 'jazz')
})

test('visualization signals are stable for each track and explicitly marked as demos', () => {
  assert.deepEqual(createDemoSignal('0007391'), createDemoSignal('0007391'))
  assert.notDeepEqual(createDemoSignal('0007391').levels, createDemoSignal('0008561').levels)
  assert.equal(createDemoSignal('0007391').source, 'demo')
})
