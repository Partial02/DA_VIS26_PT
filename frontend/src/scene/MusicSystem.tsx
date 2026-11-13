import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import type { Group } from 'three'
import { seedOf, systemTracks } from '../domain/catalog'
import type { Track } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { SystemDust } from './ParticleField'
import { spacePosition } from './space'

function TrackOrbit({ track, index, selected, color, reduced, onSelect }: {
  track: Track; index: number; selected: boolean; color: string; reduced: boolean; onSelect: () => void
}) {
  const group = useRef<Group>(null)
  const radius = 1.25 + index * .76
  const phase = (seedOf(track.id) % 628) / 100
  useFrame(({ clock }) => {
    if (!group.current) return
    const angle = phase + (reduced ? 0 : clock.elapsedTime * (.055 - index * .01))
    group.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .65, .5)
  })
  const line = useMemo(() => Array.from({ length: 121 }, (_, i): [number, number, number] => {
    const angle = i / 120 * Math.PI * 2
    return [Math.cos(angle) * radius, Math.sin(angle) * radius * .65, .1]
  }), [radius])
  return <>
    <Line points={line} color={color} transparent opacity={selected ? .27 : .1} lineWidth={.6} />
    <group ref={group}>
      <mesh onClick={event => { event.stopPropagation(); onSelect() }}>
        <sphereGeometry args={[selected ? .1 : .065, 20, 16]} />
        <meshBasicMaterial color={selected ? '#f1edf9' : color} />
      </mesh>
    </group>
  </>
}

export function MusicSystem({ reduced }: { reduced: boolean }) {
  const { catalog, state, dispatch } = useExperience()
  if (state.view.level !== 'system') return null
  const sub = catalog.subgenreById.get(state.view.subgenreId)!
  const genre = catalog.genreById.get(sub.genreId)!
  const tracks = systemTracks(catalog, sub.id)
  const selected = state.selectedTrackId ?? tracks[0]?.id
  const position = spacePosition(sub.position).toArray() as [number, number, number]
  return <>
    <SystemDust key={`${sub.id}:${selected}`} id={`${sub.id}:${selected}`} position={position} color={genre.color} reduced={reduced} />
    <group position={position}>
      <mesh>
        <planeGeometry args={[1.7, 1.7]} />
        <shaderMaterial transparent depthWrite={false} uniforms={{ uColor: { value: new Color(genre.color) } }}
          vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }"
          fragmentShader="varying vec2 vUv; uniform vec3 uColor; void main() { float d = length(vUv - .5) * 2.; float core = exp(-d * d * 220.); float halo = exp(-d * 7.) * .65; gl_FragColor = vec4(mix(uColor, vec3(1.), core), min(1., core + halo)); }" />
      </mesh>
      {tracks.map((track, index) => <TrackOrbit key={track.id} track={track} index={index} color={genre.color}
        reduced={reduced} selected={selected === track.id} onSelect={() => dispatch({ type: 'selectTrack', id: track.id })} />)}
    </group>
  </>
}
