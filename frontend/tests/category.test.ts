import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { indexCatalog, scoredPlaylist } from '../src/domain/catalog.ts'
import type { MusicData } from '../src/domain/catalog.ts'
import { ARTIST_PENALTY, cellKey, crossCells, lengthFit, signatureSessions, subgenreProfile, rankSubgenres, sessionsOf, subgenreScore, trackMatch } from '../src/domain/category.ts'
import type { CategoryModel } from '../src/domain/category.ts'

const read = (file: string) => JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'))
const catalog = indexCatalog(read('music-catalog.json') as MusicData, read('category-model.json') as CategoryModel)
const index = catalog.categories!
const session = (key: string) => index.model.sessions.findIndex(s => s.key === key)
const cell = (genreId: string, key: string) => index.cellOf.get(cellKey(genreId, session(key)))!

test('the category model covers the catalog: 15 genres × 16 sessions, 231 cells', () => {
  assert.equal(index.model.sessions.length, 16)
  assert.equal(index.model.genres.length, 15)
  assert.equal(index.cells.length, 231)
  assert.equal(index.model.tracks.length, catalog.tracks.length)
  assert.ok(index.model.tracks.every(([, mask]) => mask > 0))
  assert.equal(index.cellOf.get(cellKey('metal', session('ethnic'))), undefined) // Metal has 11 sessions.
})

test('a genre row of picks ranks that genre first; the unvisited bonus applies', () => {
  const electronicRow = index.model.sessions.map((_, s) => index.cellOf.get(cellKey('electronic', s))).filter((id): id is number => id !== undefined)
  const ranked = rankSubgenres(index, catalog, electronicRow, {})
  assert.ok(ranked.slice(0, 5).every(r => r.genreId === 'electronic'))
  const sub = ranked[0].subgenreId
  assert.ok(subgenreScore(index, catalog, sub, electronicRow, {}) > subgenreScore(index, catalog, sub, electronicRow, { electronic: 1 }))
  assert.deepEqual(rankSubgenres(index, catalog, [], {}), [])
})

test('the session pattern matters: strings pull Classical, beats pull Electronic', () => {
  const strings = rankSubgenres(index, catalog, [cell('classical', 'strings'), cell('classical', 'woodwind')], {})
  assert.equal(strings[0].genreId, 'classical')
  const beats = rankSubgenres(index, catalog, [cell('electronic', 'beats'), cell('electronic', 'synth')], {})
  assert.equal(beats[0].genreId, 'electronic')
})

test('a same-session pick from another genre counts partially', () => {
  const mask = 1 << session('drums')
  const own = trackMatch(index, mask, 'rock', [cell('rock', 'drums')])
  const other = trackMatch(index, mask, 'rock', [cell('pop', 'drums')])
  assert.equal(own, 1)
  assert.ok(other > 0 && other < own)
  assert.equal(trackMatch(index, mask, 'rock', [cell('rock', 'piano')]), 0)
})

test('length fit peaks between 2:30 and 5:00', () => {
  assert.equal(lengthFit(200), 1)
  assert.equal(lengthFit(60), 0)
  assert.ok(lengthFit(120) > 0 && lengthFit(120) < 1)
  assert.ok(lengthFit(480) < lengthFit(360))
  assert.equal(lengthFit(600), 0)
})

test('the playlist follows the picks, is deterministic, and spreads artists', () => {
  const sub = catalog.subgenres.toSorted((a, b) => b.trackIds.length - a.trackIds.length)[0]
  const picks = [cell(sub.genreId, 'drums'), cell(sub.genreId, 'electric_guitar')]
  const list = scoredPlaylist(catalog, sub.id, picks)
  assert.equal(list.length, sub.trackIds.length)
  assert.equal(scoredPlaylist(catalog, sub.id, picks), list) // Same selection array: reused, not recomputed.
  const again = scoredPlaylist(catalog, sub.id, [...picks]) // A new array is computed afresh, with the same result.
  assert.notEqual(again, list)
  assert.deepEqual(again, list)
  // The top songs answer the picks better than the bottom ones.
  const mean = (items: typeof list) => items.reduce((sum, item) => sum + item.match, 0) / items.length
  assert.ok(mean(list.slice(0, 10)) > mean(list.slice(-10)))
  // An artist's second song never beats a fresh artist unless it scores ARTIST_PENALTY higher.
  const seen = new Map<string, number>()
  for (const [i, item] of list.entries()) {
    const earlier = seen.get(item.track.artist) ?? 0
    for (const later of list.slice(i + 1)) {
      const laterEarlier = list.slice(0, i).filter(x => x.track.artist === later.track.artist).length
      assert.ok(item.score - ARTIST_PENALTY * earlier >= later.score - ARTIST_PENALTY * laterEarlier - 1e-9)
    }
    seen.set(item.track.artist, earlier + 1)
  }
})

test('session masks decode back to sessions', () => {
  assert.deepEqual(sessionsOf(0b1010), [1, 3])
  assert.deepEqual(sessionsOf(0), [])
})

test('the picker cross product keeps only existing cells', () => {
  const metalAndRock = crossCells(index, ['metal', 'rock'], [session('drums'), session('ethnic')])
  assert.deepEqual(metalAndRock, [cell('metal', 'drums'), cell('rock', 'drums'), cell('rock', 'ethnic')]) // Metal × ethnic does not exist.
  assert.deepEqual(crossCells(index, ['rock'], []), [])
})

test('a subgenre signature is its three strongest sessions, strongest first, ties by session order', () => {
  assert.deepEqual(signatureSessions([0, .5, 1, .5, 0, .2]), [{ session: 2, weight: 1 }, { session: 1, weight: .5 }, { session: 3, weight: .5 }])
  assert.deepEqual(signatureSessions([0, 0]), [])
  const orchestral = catalog.subgenres.find(s => s.name === 'Orchestral')!
  const signature = signatureSessions(subgenreProfile(index, catalog, orchestral.id))
  assert.equal(signature[0].weight, 1)
  assert.ok(signature.some(item => item.session === session('strings')))
})
