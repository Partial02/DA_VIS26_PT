import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import type { Mesh } from 'three'
import { jamendoPlayer } from '../audio/jamendo'
import { scoredPlaylist } from '../domain/catalog'
import type { Track } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { spacePosition } from './space'

/** Seconds between two glints of the playing star; the beacon ring is synced to it. */
const GLINT_PERIOD = 1.5

const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }'
// Soft core + halo; uFlare adds a four-point sparkle (the playing song also gets a fainter
// diagonal set through uDiagonal), turned by uAngle.
const starFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uAlpha, uFlare, uDiagonal, uAngle;
  float rays(vec2 p, float thin, float reach) {
    return exp(-abs(p.x) * thin) * exp(-abs(p.y) * reach) + exp(-abs(p.y) * thin) * exp(-abs(p.x) * reach);
  }
  void main() {
    vec2 p = vUv - .5;
    float d = length(p) * 2.;
    float c = cos(uAngle), s = sin(uAngle);
    vec2 r = mat2(c, -s, s, c) * p;
    float core = exp(-d * d * 38.);
    float halo = exp(-d * d * 6.) * .38;
    float spark = (rays(r, 70., 5.) + rays(mat2(.7071, -.7071, .7071, .7071) * r, 95., 9.) * uDiagonal) * uFlare;
    vec3 color = mix(uColor, vec3(1.), core * .55 + spark * .4);
    gl_FragColor = vec4(color, (core + halo + spark) * uAlpha * (1. - smoothstep(.92, 1., d)));
  }
`
// An expanding ring with a soft glow, so the playing song can be found at a glance.
const beaconFragment = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity, uPhase;
  void main() {
    float r = length(vUv - .5) * 2.;
    float ring = exp(-pow((r - uPhase) * 16., 2.)) * (1. - uPhase) * (1. - uPhase);
    float glow = exp(-r * r * 10.) * .45;
    gl_FragColor = vec4(mix(uColor, vec3(1.), .35), (ring + glow) * uOpacity * (1. - smoothstep(.9, 1., r)));
  }
`
// Domain-warped value noise in a soft disc: a slowly drifting nebula in the genre color.
const nebulaFragment = `
  varying vec2 vUv;
  uniform vec3 uColor, uDeep;
  uniform float uOpacity, uTime, uSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0., a = .5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
    return v;
  }
  void main() {
    vec2 p = (vUv - .5) * 2.;
    float r = length(p);
    vec2 q = p * 1.7 + uSeed;
    float warp = fbm(q + vec2(uTime * .03, -uTime * .02));
    float cloud = fbm(q * 1.3 + warp * 1.9 - vec2(uTime * .012, 0.));
    float falloff = exp(-r * r * 2.4);
    float density = smoothstep(.3, .82, cloud) * falloff + falloff * falloff * .3;
    vec3 color = mix(uDeep, mix(uColor, vec3(1.), .2 * falloff), smoothstep(.35, .85, cloud));
    gl_FragColor = vec4(color, density * uOpacity * (1. - smoothstep(.8, 1., r)));
  }
`

// Like the star field, these shaders write display RGB directly.
const display = (color: Color) => color.clone().convertLinearToSRGB()

function starMaterial(color: string, alpha: number, flare = 0, diagonal = 0) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, vertexShader, fragmentShader: starFragment,
    uniforms: { uColor: { value: display(new Color(color)) }, uAlpha: { value: alpha }, uFlare: { value: flare }, uDiagonal: { value: diagonal }, uAngle: { value: 0 } },
  })
}

/** The genre colors are pastel; the nebula uses a richer version so it reads as color, not haze. */
function nebulaColors(color: string) {
  const hsl = new Color(color).getHSL({ h: 0, s: 0, l: 0 })
  const rich = new Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.5 + .2), Math.min(hsl.l, .6))
  const deep = new Color().setHSL((hsl.h + .06) % 1, Math.min(1, hsl.s * 1.5 + .25), Math.min(hsl.l, .6) * .55)
  return { rich: display(rich), deep: display(deep) }
}

/**
 * Every song of the subgenre as a still star at its map position. Size follows the
 * song's score for the picked categories. The playing song glints, sends out a beacon
 * ring and sits in a faint nebula of the genre color, all swelling with the live
 * loudness. Hover grows a star slightly; click selects and plays it.
 */
export function MusicSystem({ view, reduced, suppressed, hovered, onHover }: {
  view: Destination; reduced: boolean; suppressed: () => boolean; hovered: string | null; onHover: (id: string | null) => void
}) {
  const { catalog, state, dispatch } = useExperience()
  const player = useSyncExternalStore(jamendoPlayer.subscribe, jamendoPlayer.getSnapshot)
  const subgenreId = view.level === 'system' ? view.subgenreId : null
  const color = view.level === 'system' ? catalog.genreById.get(view.genreId)!.color : '#ffffff'
  const stars = useMemo(() => subgenreId ? scoredPlaylist(catalog, subgenreId, state.selection).map(({ track, score }) => ({
    track, position: spacePosition(track.position), size: .2 + score * .16,
  })) : [], [catalog, subgenreId, state.selection])
  // The nebula spans the subgenre: about three times the distance that holds 90% of its songs.
  const nebulaSize = useMemo(() => {
    if (!stars.length) return 6
    const center = stars.reduce((sum, star) => sum.add(star.position), new Vector3()).divideScalar(stars.length)
    const spread = stars.map(star => star.position.distanceTo(center)).sort((a, b) => a - b)[Math.floor(stars.length * .9)]
    return Math.min(22, Math.max(5, spread * 3.2))
  }, [stars])
  const geometry = useMemo(() => new PlaneGeometry(1, 1), [])
  const materials = useMemo(() => {
    const { rich, deep } = nebulaColors(color)
    return {
      idle: starMaterial(color, .85),
      selected: starMaterial(color, 1, .5),
      playing: starMaterial(color, 1, 1, .5),
      beacon: new ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, vertexShader, fragmentShader: beaconFragment,
        uniforms: { uColor: { value: display(new Color(color)) }, uOpacity: { value: 0 }, uPhase: { value: 0 } },
      }),
      nebula: new ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, vertexShader, fragmentShader: nebulaFragment,
        uniforms: { uColor: { value: rich }, uDeep: { value: deep }, uOpacity: { value: 0 }, uTime: { value: 0 }, uSeed: { value: [...subgenreId ?? ''].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 997, 0) * .37 } },
      }),
    }
  }, [color, subgenreId])
  useEffect(() => () => { geometry.dispose(); Object.values(materials).forEach(m => m.dispose()) }, [geometry, materials])
  const meshes = useRef(new Map<string, Mesh>())
  const scales = useRef(new Map<string, number>())
  const nebula = useRef<Mesh>(null)
  const beacon = useRef<Mesh>(null)
  const pulse = useRef(0)
  const fade = useRef(0)
  const playingId = player.playing ? player.trackId : null
  const playing = stars.find(star => star.track.id === playingId)
  useFrame(({ camera, clock }, delta) => {
    const t = clock.elapsedTime, step = Math.min(delta, .05)
    const volume = jamendoPlayer.volume()
    pulse.current += (volume - pulse.current) * (volume > pulse.current ? .5 : .12)
    const blend = reduced ? 1 : 1 - Math.exp(-step * 12)
    const phase = (t % GLINT_PERIOD) / GLINT_PERIOD
    // A sharp flash at the start of every period that fades within a third of it.
    const glint = reduced ? 0 : Math.exp(-phase * 9)
    for (const { track, size } of stars) {
      const mesh = meshes.current.get(track.id)
      if (!mesh) continue
      mesh.quaternion.copy(camera.quaternion)
      let target = size * (hovered === track.id ? 1.18 : 1)
      if (track.id === playingId) {
        const twinkle = reduced ? 0 : .06 * Math.sin(t * 7) + .04 * Math.sin(t * 13.3)
        target = Math.max(target, .48) * (1.1 + pulse.current * .8 + glint * .5 + twinkle)
      } else if (track.id === state.selectedTrackId) target = Math.max(target, .32)
      const current = scales.current.get(track.id) ?? target
      const next = current + (target - current) * blend
      scales.current.set(track.id, next)
      mesh.scale.setScalar(next)
    }
    const uniforms = materials.playing.uniforms
    uniforms.uFlare.value = reduced ? 1.2 : 1 + pulse.current * 1.4 + glint * 1.6 + .15 * Math.sin(t * 5)
    if (!reduced) uniforms.uAngle.value = t * .35

    // The nebula and beacon fade in while a song plays and follow its star smoothly.
    fade.current += ((playing ? 1 : 0) - fade.current) * (reduced ? 1 : 1 - Math.exp(-step * (playing ? 2.2 : 3.5)))
    for (const mesh of [nebula.current, beacon.current]) {
      if (!mesh) continue
      mesh.visible = fade.current > .005
      if (playing) {
        // Jump while still invisible; glide when moving from one playing song to the next.
        if (fade.current < .02) mesh.position.copy(playing.position)
        else mesh.position.lerp(playing.position, blend)
      }
      mesh.quaternion.copy(camera.quaternion)
    }
    if (nebula.current) {
      nebula.current.scale.setScalar(nebulaSize * (1 + pulse.current * .06))
      materials.nebula.uniforms.uOpacity.value = fade.current * (.34 + pulse.current * .16)
      if (!reduced) materials.nebula.uniforms.uTime.value = t
    }
    if (beacon.current) {
      // Constant size on screen: proportional to the distance from the camera.
      beacon.current.scale.setScalar(camera.position.distanceTo(beacon.current.position) * .22)
      materials.beacon.uniforms.uPhase.value = reduced ? .55 : phase
      materials.beacon.uniforms.uOpacity.value = fade.current * (reduced ? .5 : .9)
    }
  })
  if (!subgenreId) return null
  const select = (track: Track) => {
    if (suppressed()) return
    dispatch({ type: 'selectTrack', id: track.id })
    void jamendoPlayer.play(track)
  }
  return <group>
    {/* Decorations only: they never take pointer events from the stars. */}
    <mesh ref={nebula} geometry={geometry} material={materials.nebula} renderOrder={0} visible={false} raycast={() => {}} />
    <mesh ref={beacon} geometry={geometry} material={materials.beacon} renderOrder={3} visible={false} raycast={() => {}} />
    {stars.map(({ track, position }) => <mesh key={track.id} position={position} geometry={geometry} userData={{ musicStar: true }}
      material={track.id === playingId ? materials.playing : track.id === state.selectedTrackId ? materials.selected : materials.idle}
      renderOrder={track.id === playingId ? 2 : 1}
      ref={mesh => { if (mesh) meshes.current.set(track.id, mesh); else meshes.current.delete(track.id) }}
      onPointerOver={event => { event.stopPropagation(); onHover(track.id); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = '' }}
      onClick={event => { event.stopPropagation(); select(track) }} />)}
  </group>
}
