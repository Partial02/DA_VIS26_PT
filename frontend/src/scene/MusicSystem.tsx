import { useMemo, useRef } from 'react'
import { Billboard, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color } from 'three'
import type { Group } from 'three'
import { systemTracks } from '../domain/catalog'
import type { Track } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { trackOrbitPosition } from './orbits'

function TrackOrbit({ track, index, selected, color, reduced, onSelect }: {
  track: Track; index: number; selected: boolean; color: string; reduced: boolean; onSelect: () => void
}) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (group.current) trackOrbitPosition(track.id, index, reduced ? 0 : clock.elapsedTime, 1, group.current.position)
  })
  const line = useMemo(() => Array.from({ length: 97 }, (_, step): [number, number, number] => {
    const angle = step / 96 * Math.PI * 2, radius = 1.25 + index * .76
    return [Math.cos(angle) * radius, Math.sin(angle) * radius * .65, .5]
  }), [index])
  return <>
    <Line points={line} color={color} transparent opacity={selected ? .25 : .1} lineWidth={.6} raycast={() => {}} />
    <group ref={group} userData={{ trackId: track.id }}>
      <Billboard><mesh userData={{ orbitTrack: true }} onClick={event => { event.stopPropagation(); onSelect() }}>
        <planeGeometry args={[selected ? .42 : .3, selected ? .42 : .3]} />
        <shaderMaterial transparent depthWrite={false} blending={AdditiveBlending}
          uniforms={{ uColor: { value: new Color(selected ? '#f5ecda' : color) } }}
          vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }"
          fragmentShader="varying vec2 vUv; uniform vec3 uColor; void main() { float d = length(vUv - .5) * 2.; float core = exp(-d*d*45.); float halo = exp(-d*d*7.)*.35; gl_FragColor = vec4(uColor, core + halo); }" />
      </mesh></Billboard>
    </group>
  </>
}

export function MusicSystem({ view, reduced, orbitScale, suppressed }: {
  view: Destination; reduced: boolean; orbitScale: () => number; suppressed: () => boolean
}) {
  const { catalog, state, dispatch } = useExperience()
  const root = useRef<Group>(null)
  useFrame(() => { root.current?.scale.setScalar(orbitScale()) })
  if (view.level !== 'system') return null
  const sub = catalog.subgenreById.get(view.subgenreId)!
  const tracks = systemTracks(catalog, sub.id, state.selectedTrackId)
  const selected = state.selectedTrackId ?? tracks[0]?.id
  const color = catalog.genreById.get(view.genreId)!.color
  return <group ref={root} position={sub.position}>
    {tracks.map((track, index) => <TrackOrbit key={track.id} track={track} index={index} selected={track.id === selected}
      color={color} reduced={reduced} onSelect={() => { if (!suppressed()) dispatch({ type: 'selectTrack', id: track.id }) }} />)}
  </group>
}
