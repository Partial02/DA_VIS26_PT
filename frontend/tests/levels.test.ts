import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { bandLevels, createLevelState, loudness } from '../src/audio/levels.ts'

const N = 1024, BIN_HZ = 48000 / 2048, BARS = 40

/** A music-like spectrum: flat to 100 Hz, then −3.5 dB/octave, with deterministic ±5 dB texture. */
function spectrum(level: number, frame: number) {
  const bins = new Float32Array(N)
  for (let i = 1; i < N; i++) bins[i] = level - 3.5 * Math.max(0, Math.log2(i * BIN_HZ / 100)) + 5 * Math.sin(i * 1.7 + frame * .9)
  return bins
}

function run(level: number, frames = 300) {
  const state = createLevelState(), out = new Float32Array(BARS), all: number[] = []
  for (let frame = 0; frame < frames; frame++) {
    assert.equal(bandLevels(spectrum(level, frame), BIN_HZ, out, state, 1 / 60), true)
    if (frame >= 60) all.push(...out)
  }
  return all.toSorted((a, b) => a - b)
}

test('a loud master does not pin the bars at the top', () => {
  const all = run(-12)
  assert.ok(all.every(x => x >= 0 && x <= 1))
  assert.ok(all.filter(x => x >= .98).length / all.length < .02)
  assert.ok(all[all.length >> 1] < .8)
})

test('a quiet song still moves, and loud and quiet songs look alike after the gain settles', () => {
  const loud = run(-12), quiet = run(-50)
  assert.ok(quiet[quiet.length >> 1] > .3)
  assert.ok(Math.abs(loud[loud.length >> 1] - quiet[quiet.length >> 1]) < .1)
})

test('silence is flat and reported as no signal', () => {
  const out = new Float32Array(BARS).fill(.5)
  assert.equal(bandLevels(new Float32Array(N).fill(-Infinity), BIN_HZ, out, createLevelState(), 1 / 60), false)
  assert.ok(out.every(x => x === 0))
})

test('loudness rises with RMS but never clips', () => {
  assert.equal(loudness(0), 0)
  assert.ok(loudness(.1) < loudness(.3) && loudness(.3) < loudness(1) && loudness(1) < 1)
})
