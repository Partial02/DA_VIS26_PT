import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { hoveredGenre, hoveredSubgenre } from '../src/scene/hover.ts'

const tracks = [{ genreId: 'electronic' }, { genreId: 'rock' }, { genreId: 'electronic' }]

test('hover uses the actual hit stars, including depth and nearby genre votes', () => {
  assert.equal(hoveredGenre([
    { index: 0, distance: 12, distanceToRay: .04 },
    { index: 2, distance: 13, distanceToRay: .1 },
    { index: 1, distance: 24, distanceToRay: .2 },
  ], tracks, 'rock'), 'electronic')
  assert.equal(hoveredGenre([{ index: 1, distance: 12 }], tracks, 'electronic'), 'rock')
  assert.equal(hoveredGenre([], tracks, 'rock'), null)
})

test('small changes around a cluster boundary retain the current genre', () => {
  const hits = [{ index: 0, distance: 12, distanceToRay: .1 }, { index: 1, distance: 12, distanceToRay: .11 }]
  assert.equal(hoveredGenre(hits, tracks, null), 'electronic')
  assert.equal(hoveredGenre(hits, tracks, 'rock'), 'rock')
})

test('subgenre voting includes shared memberships and excludes other parent genres', () => {
  const members = [
    { genreId: 'folk', subgenreIds: ['country', 'americana'] },
    { genreId: 'folk', subgenreIds: ['americana'] },
    { genreId: 'rock', subgenreIds: ['indie'] },
  ]
  const hits = [{ index: 2, distance: 10 }, { index: 0, distance: 11 }, { index: 1, distance: 12 }]
  assert.equal(hoveredSubgenre(hits, members, 'folk', null), 'americana')
  assert.equal(hoveredSubgenre([{ index: 0, distance: 11 }], members, 'folk', 'country'), 'country')
  assert.equal(hoveredSubgenre([{ index: 2, distance: 10 }], members, 'folk', 'country'), null)
})
