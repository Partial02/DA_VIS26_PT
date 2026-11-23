import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { adjacentSubgenre, indexCatalog, subgenrePlaylist } from '../src/domain/catalog.ts'
import type { MusicData, Track } from '../src/domain/catalog.ts'
import { experienceReducer, initialState } from '../src/state/reducer.ts'
import { genreVisitAppearance } from '../src/domain/visits.ts'

const catalog = indexCatalog(JSON.parse(readFileSync(new URL('../public/data/music-catalog.json', import.meta.url), 'utf8')) as MusicData)

test('genre colors match genre_color.csv', () => {
  const rows = readFileSync(new URL('../../genre_color.csv', import.meta.url), 'utf8').trim().split(String.fromCharCode(10)).slice(1).map(line => line.trim().split(','))
  assert.equal(rows.length, 15)
  for (const [name, color] of rows) assert.equal(catalog.genres.find(g => g.name === name)?.color, color.toLowerCase(), name)
})

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
    assert.equal(subgenrePlaylist(catalog, sub.id).length, sub.trackIds.length)
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

test('the selection toggles cells, whole rows or columns, and clears', () => {
  let state = experienceReducer(initialState, { type: 'toggleCell', id: 3 })
  state = experienceReducer(state, { type: 'toggleCell', id: 7 })
  assert.deepEqual(state.selection, [3, 7])
  state = experienceReducer(state, { type: 'toggleCell', id: 3 })
  assert.deepEqual(state.selection, [7])
  // A line with an unpicked cell picks the rest; a fully picked line is dropped.
  state = experienceReducer(state, { type: 'toggleCells', ids: [7, 8, 9] })
  assert.deepEqual(state.selection, [7, 8, 9])
  state = experienceReducer(state, { type: 'toggleCells', ids: [8, 9] })
  assert.deepEqual(state.selection, [7])
  state = experienceReducer(state, { type: 'clearSelection' })
  assert.deepEqual(state.selection, [])
  assert.equal(experienceReducer(state, { type: 'clearSelection' }), state)
})

test('picker chips add their cross cells, drop their whole line, and clear with the selection', () => {
  // A tiny 2 genre × 2 session grid; jazz × session 1 does not exist.
  const cells = [{ id: 0, genreId: 'rock', session: 0 }, { id: 1, genreId: 'rock', session: 1 }, { id: 2, genreId: 'jazz', session: 0 }]
  const row = (genreId: string) => cells.filter(c => c.genreId === genreId)
  const column = (session: number) => cells.filter(c => c.session === session)
  let state = experienceReducer(initialState, { type: 'pickChip', chip: { genreId: 'rock' }, line: row('rock') })
  assert.deepEqual(state.pickedGenres, ['rock'])
  assert.deepEqual(state.selection, []) // No instrument yet: nothing to cross with.
  state = experienceReducer(state, { type: 'pickChip', chip: { session: 0 }, line: column(0) })
  assert.deepEqual(state.selection, [0])
  state = experienceReducer(state, { type: 'toggleCell', id: 1 }) // A cell picked by hand in the table.
  state = experienceReducer(state, { type: 'pickChip', chip: { genreId: 'jazz' }, line: row('jazz') })
  assert.deepEqual(state.selection, [0, 1, 2])
  state = experienceReducer(state, { type: 'pickChip', chip: { session: 1 }, line: column(1) }) // Already picked by hand.
  assert.deepEqual(state.selection, [0, 1, 2])
  state = experienceReducer(state, { type: 'pickChip', chip: { genreId: 'rock' }, line: row('rock') })
  assert.deepEqual(state.selection, [2])
  assert.deepEqual(state.pickedGenres, ['jazz'])
  state = experienceReducer(state, { type: 'pickChip', chip: { session: 0 }, line: column(0) })
  assert.deepEqual([state.selection, state.pickedSessions], [[], [1]])
  state = experienceReducer(state, { type: 'clearSelection' })
  assert.deepEqual([state.selection, state.pickedGenres, state.pickedSessions], [[], [], []])
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

test('genre visits count completed entries without counting subgenre moves twice', () => {
  let state = experienceReducer(initialState, { type: 'navigate', destination: { level: 'genre', genreId: 'jazz' } })
  assert.deepEqual(state.genreVisits, {})
  state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  assert.deepEqual(state.genreVisits, { jazz: 1 })
  assert.equal(experienceReducer(state, { type: 'arrive', transition: state.transition }), state)
  for (const subgenreId of ['a', 'b']) {
    state = experienceReducer(state, { type: 'navigate', destination: { level: 'system', genreId: 'jazz', subgenreId } })
    state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  }
  state = experienceReducer(state, { type: 'navigate', destination: { level: 'genre', genreId: 'jazz' } })
  state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  assert.deepEqual(state.genreVisits, { jazz: 1 })
  assert.deepEqual(state.visits, { a: 1, b: 1 })
  state = experienceReducer(state, { type: 'navigate', destination: { level: 'universe' } })
  state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  state = experienceReducer(state, { type: 'navigate', destination: { level: 'genre', genreId: 'jazz' } })
  state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  assert.deepEqual(state.genreVisits, { jazz: 2 })
})

test('direct recommendations count their parent genre and canceled arrivals do not add visits', () => {
  let state = experienceReducer(initialState, { type: 'navigate', destination: { level: 'genre', genreId: 'rock' } })
  const canceled = state.transition
  state = experienceReducer(state, { type: 'navigate', destination: { level: 'system', genreId: 'jazz', subgenreId: 'a' } })
  assert.equal(experienceReducer(state, { type: 'arrive', transition: canceled }), state)
  state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  assert.deepEqual(state.genreVisits, { jazz: 1 })
  state = experienceReducer(state, { type: 'navigate', destination: { level: 'system', genreId: 'rock', subgenreId: 'b' } })
  state = experienceReducer(state, { type: 'arrive', transition: state.transition })
  assert.deepEqual(state.genreVisits, { jazz: 1, rock: 1 })
  state = experienceReducer(state, { type: 'selectTrack', id: '0007391' })
  assert.deepEqual(state.genreVisits, { jazz: 1, rock: 1 })
})

test('accumulated color reaches the hover tint and brightness increases with a finite cap', () => {
  assert.deepEqual(genreVisitAppearance(0), { colorMix: 0, brightness: 1 })
  let previous = genreVisitAppearance(0)
  for (let visits = 1; visits <= 10; visits++) {
    const current = genreVisitAppearance(visits)
    assert.ok(current.colorMix >= previous.colorMix && current.colorMix <= 1)
    assert.ok(current.brightness > previous.brightness)
    previous = current
  }
  assert.equal(genreVisitAppearance(5).colorMix, 1)
  assert.deepEqual(genreVisitAppearance(10), genreVisitAppearance(1000))
})

test('swiping wraps through alphabetic siblings, without crossing parent genres', () => {
  const jazz = catalog.genreById.get('jazz')!
  const siblings = jazz.subgenreIds.map(id => catalog.subgenreById.get(id)!).sort((a, b) => a.name.localeCompare(b.name, 'en'))
  assert.equal(adjacentSubgenre(catalog, siblings[0].id, -1).id, siblings.at(-1)!.id)
  assert.equal(adjacentSubgenre(catalog, siblings.at(-1)!.id, 1).id, siblings[0].id)
  assert.equal(adjacentSubgenre(catalog, siblings[0].id, 1).genreId, 'jazz')
})

