import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { indexCatalog, subgenrePlaylist, systemTracks } from '../src/domain/catalog.ts'
import type { MusicData } from '../src/domain/catalog.ts'
import { applyLineup, fit, hash, lengthBonus, lineupDiff, rankSubgenres, stageSessions, subgenreScore, trackMatch } from '../src/domain/atlas.ts'
import type { AtlasModel } from '../src/domain/atlas.ts'
import { rankRecommendations, topGenreDestinations } from '../src/domain/recommendations.ts'

const read = (file: string) => JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'))
const data = read('music-catalog.json') as MusicData
const model = read('atlas-model.json') as AtlasModel
const catalog = indexCatalog(data, model)
const atlas = catalog.atlas!
const family = (name: string) => model.families.findIndex(f => f.name === name)
const session = (key: string) => model.sessions.findIndex(s => s.key === key)
const performer = (familyName: string, sessionKey: string) => atlas.performers.find(p => p.family === family(familyName) && p.session === session(sessionKey))!.id
const subgenre = (genreId: string, name: string) => catalog.subgenres.find(s => s.genreId === genreId && s.name === name)!
const names = (ids: { subgenreId: string }[]) => ids.map(r => catalog.subgenreById.get(r.subgenreId)!.name)

test('the atlas model matches the shipped catalog', () => {
  assert.equal(model.meta.catalogSha256, data.meta.sourceSha256)
  assert.equal(model.sessions.length, 9)
  assert.equal(model.families.length, 5)
  assert.equal(atlas.performers.length, 22) // 45 session × family pairs filtered to 22 performers.
  assert.equal(new Set(atlas.performers.map(p => `${p.family}:${p.session}`)).size, 22)
  assert.deepEqual(model.families.flatMap(f => f.genreIds).toSorted(), catalog.genres.map(g => g.id).toSorted())
  assert.equal(model.subgenres.length, catalog.subgenres.length)
  assert.ok(model.subgenres.every(s => catalog.subgenreById.has(s.id) && s.weights.every(w => w === 0 || w === 1 || w === 2)))
  assert.equal(model.tracks.length, catalog.tracks.length)
  assert.ok(model.tracks.every(([id, mask]) => catalog.trackById.has(id) && mask >= 0 && mask < 512))
})

test('F1 fit balances coverage against precision', () => {
  assert.equal(fit([2, 0, 2], []), 0)
  assert.equal(fit([0, 0, 0], [0]), 0)
  assert.equal(fit([2, 0, 2], [0, 2]), 1)
  // cov = 2/4, prec = 2/(2·1) → F1 = 2·.5·1/1.5
  assert.ok(Math.abs(fit([2, 0, 2], [0]) - 2 / 3) < 1e-12)
  assert.deepEqual(stageSessions(atlas, [performer('밴드', 'Drums'), performer('전자', 'Drums'), performer('전자', 'Bass')]), [session('Drums'), session('Bass')])
})

test('the family term reproduces the design document examples', () => {
  const orchestraKeys = rankSubgenres(atlas, catalog, [performer('오케스트라', 'Keys')], {})
  assert.deepEqual(names(orchestraKeys.slice(0, 4)), ['Neoclassical', 'Waltz', 'Opera', 'Orchestral'])
  const electronicRhythm = rankSubgenres(atlas, catalog, [performer('전자', 'Drums'), performer('전자', 'Bass')], {})
  assert.deepEqual(names(electronicRhythm.slice(0, 4)), ['Drum and Bass', 'Industrial', 'Dance', 'Techno'])
  assert.ok(orchestraKeys.every((r, i) => i === 0 || orchestraKeys[i - 1].score >= r.score))
  assert.ok(orchestraKeys.every(r => r.score > 0 && r.score <= 1))
})

test('shrinkage, the unvisited bonus and the empty stage behave as specified', () => {
  const blackMetal = subgenre('metal', 'Black Metal')
  assert.equal(blackMetal.trackIds.length, 12) // λ = 12 / (12 + 12) = .5
  const stage = [performer('밴드', 'Guitar'), performer('밴드', 'Drums')]
  const fresh = subgenreScore(atlas, catalog, blackMetal.id, stage, {})
  const visited = subgenreScore(atlas, catalog, blackMetal.id, stage, { metal: 1 })
  assert.ok(Math.abs(Math.min(1, visited * 1.06) - fresh) < 1e-12)
  assert.deepEqual(rankSubgenres(atlas, catalog, [], {}), [])
  assert.deepEqual(rankRecommendations(catalog, [], {}), [])
  assert.deepEqual(rankRecommendations(indexCatalog(data), stage, {}), [])
})

test('glass cards keep the best subgenre of three different genres', () => {
  const ranked = rankRecommendations(catalog, [performer('그루브', 'Keys'), performer('밴드', 'Guitar')], {})
  const cards = topGenreDestinations(ranked)
  assert.equal(cards.length, 3)
  assert.equal(new Set(cards.map(c => c.genreId)).size, 3)
  for (const card of cards) assert.equal(ranked.find(r => r.genreId === card.genreId), card)
})

test('choosing a subgenre brings on core sessions and sends off unused performers', () => {
  const target = subgenre('electronic', 'Drum and Bass')
  const weights = model.subgenres.find(s => s.id === target.id)!.weights
  const unused = atlas.performers.find(p => weights[p.session] === 0)!
  const { need, drop } = lineupDiff(atlas, target.id, [unused.id])
  assert.deepEqual(drop, [unused.id])
  assert.deepEqual(need, weights.flatMap((w, i) => w === 2 ? [i] : []))
  const result = applyLineup(atlas, target.id, [unused.id])
  assert.ok(!result.stage.includes(unused.id))
  assert.deepEqual(stageSessions(atlas, result.stage).toSorted(), need.toSorted())
  assert.deepEqual(applyLineup(atlas, target.id, result.stage).stage, result.stage)
})

test('song order uses fit, length bonus and tie noise, then spreads artists', () => {
  assert.equal(trackMatch(0, [0]), 0)
  assert.equal(trackMatch(0b101, []), 0)
  assert.equal(trackMatch(0b101, [0, 2]), 1)
  assert.equal(lengthBonus(119.9), 0)
  assert.equal(lengthBonus(120), .03)
  assert.equal(lengthBonus(300.9), .03)
  assert.equal(lengthBonus(421), -.04)
  assert.equal(hash(10, 3, 31), hash(10, 3, 31))
  for (let i = 0; i < 200; i++) assert.ok(hash(i, i % 146, 31) >= 0 && hash(i, i % 146, 31) <= 1)

  const techHouse = subgenre('electronic', 'Tech House')
  const stage = [performer('전자', 'Drums'), performer('전자', 'Synth')]
  const playlist = subgenrePlaylist(catalog, techHouse.id, stage)
  const artists = new Set(playlist.map(t => t.artist))
  assert.equal(playlist.length, techHouse.trackIds.length)
  assert.equal(new Set(playlist.slice(0, artists.size).map(t => t.artist)).size, artists.size)
  const grunge = subgenre('rock', 'Grunge')
  const grungeList = subgenrePlaylist(catalog, grunge.id, stage)
  const grungeArtists = new Set(grungeList.map(t => t.artist)).size
  assert.equal(new Set(grungeList.slice(0, grungeArtists).map(t => t.artist)).size, grungeArtists)
  assert.deepEqual(subgenrePlaylist(catalog, grunge.id, stage), grungeList)
  assert.deepEqual(systemTracks(catalog, grunge.id, null, stage), grungeList.slice(0, 3))
})
