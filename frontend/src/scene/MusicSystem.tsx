import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, PlaneGeometry, ShaderMaterial } from 'three'
import type { Mesh } from 'three'
import { jamendoPlayer } from '../audio/jamendo'
import { scoredPlaylist } from '../domain/catalog'
import type { Track } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { spacePosition } from './space'

const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }'
// Soft core + halo; uFlare adds a four-point sparkle for the playing song.
const fragmentShader = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uAlpha, uFlare;
  void main() {
    vec2 p = vUv - .5;
    float d = length(p) * 2.;
    float core = exp(-d * d * 38.);
    float halo = exp(-d * d * 6.) * .38;
    float rays = (exp(-abs(p.x) * 70.) * exp(-abs(p.y) * 5.) + exp(-abs(p.y) * 70.) * exp(-abs(p.x) * 5.)) * uFlare;
    vec3 color = mix(uColor, vec3(1.), core * .55 + rays * .4);
    gl_FragColor = vec4(color, (core + halo + rays) * uAlpha * (1. - smoothstep(.92, 1., d)));
  }
`

function starMaterial(color: string, alpha: number, flare = 0) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, vertexShader, fragmentShader,
    // Like the star field, the shader writes display RGB directly.
    uniforms: { uColor: { value: new Color(color).convertLinearToSRGB() }, uAlpha: { value: alpha }, uFlare: { value: flare } },
  })
}

/**
 * Every song of the subgenre as a still star at its map position. Size follows the
 * song's score for the picked categories; the playing song twinkles and swells with
 * the live loudness. Hover grows a star slightly; click selects and plays it.
 */
export function MusicSystem({ view, reduced, suppressed, hovered, onHover }: {
  view: Destination; reduced: boolean; suppressed: () => boolean; hovered: string | null; onHover: (id: string | null) => void
}) {
  const { catalog, state, dispatch } = useExperience()
  const player = useSyncExternalStore(jamendoPlayer.subscribe, jamendoPlayer.getSnapshot)
  const subgenreId = view.level === 'system' ? view.subgenreId : null
  const color = view.level === 'system' ? catalog.genreById.get(view.genreId)!.color : '#ffffff'
  const stars = useMemo(() => subgenreId ? scoredPlaylist(catalog, subgenreId, state.selection).map(({ track, score }) => ({
    track, position: spacePosition(track.position).toArray() as [number, number, number], size: .2 + score * .16,
  })) : [], [catalog, subgenreId, state.selection])
  const geometry = useMemo(() => new PlaneGeometry(1, 1), [])
  const materials = useMemo(() => ({ idle: starMaterial(color, .85), selected: starMaterial(color, 1, .5), playing: starMaterial(color, 1, 1) }), [color])
  useEffect(() => () => { geometry.dispose(); Object.values(materials).forEach(m => m.dispose()) }, [geometry, materials])
  const meshes = useRef(new Map<string, Mesh>())
  const scales = useRef(new Map<string, number>())
  const pulse = useRef(0)
  const playingId = player.playing ? player.trackId : null
  useFrame(({ camera, clock }, delta) => {
    const volume = jamendoPlayer.volume()
    pulse.current += (volume - pulse.current) * (volume > pulse.current ? .5 : .12)
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(delta, .05) * 12)
    for (const { track, size } of stars) {
      const mesh = meshes.current.get(track.id)
      if (!mesh) continue
      mesh.quaternion.copy(camera.quaternion)
      let target = size * (hovered === track.id ? 1.18 : 1)
      if (track.id === playingId) {
        const twinkle = reduced ? 0 : .08 * Math.sin(clock.elapsedTime * 7) + .05 * Math.sin(clock.elapsedTime * 13.3)
        target = Math.max(target, .36) * (1.15 + pulse.current * 1.1 + twinkle)
      } else if (track.id === state.selectedTrackId) target = Math.max(target, .32)
      const current = scales.current.get(track.id) ?? target
      const next = current + (target - current) * blend
      scales.current.set(track.id, next)
      mesh.scale.setScalar(next)
    }
    if (!reduced) materials.playing.uniforms.uFlare.value = .7 + pulse.current * 1.6 + .2 * Math.sin(clock.elapsedTime * 5)
  })
  if (!subgenreId) return null
  const select = (track: Track) => {
    if (suppressed()) return
    dispatch({ type: 'selectTrack', id: track.id })
    void jamendoPlayer.play(track)
  }
  return <group>
    {stars.map(({ track, position }) => <mesh key={track.id} position={position} geometry={geometry} userData={{ musicStar: true }}
      material={track.id === playingId ? materials.playing : track.id === state.selectedTrackId ? materials.selected : materials.idle}
      renderOrder={track.id === playingId ? 2 : 1}
      ref={mesh => { if (mesh) meshes.current.set(track.id, mesh); else meshes.current.delete(track.id) }}
      onPointerOver={event => { event.stopPropagation(); onHover(track.id); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = '' }}
      onClick={event => { event.stopPropagation(); select(track) }} />)}
  </group>
}
