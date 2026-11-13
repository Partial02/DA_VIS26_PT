import { useLayoutEffect, useMemo, useRef } from 'react'
import { Billboard, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import type { Group, Mesh } from 'three'
import gsap from 'gsap'
import { seedOf, systemTracks } from '../domain/catalog'
import type { Track } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { journeyMotion } from '../state/motion'
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
        <meshBasicMaterial color={selected ? '#f5ecda' : new Color('#dddcd5').lerp(new Color(color), .18)} />
      </mesh>
    </group>
  </>
}

export function MusicSystem({ view, reduced }: { view: Destination; reduced: boolean }) {
  const { catalog, state, dispatch } = useExperience()
  const root = useRef<Group>(null)
  useLayoutEffect(() => {
    if (!root.current || reduced) return
    const context = gsap.context(() => {
      const timeline = gsap.timeline()
      root.current!.traverse(object => {
        const materials = (object as Mesh).material
        if (!materials) return
        for (const material of Array.isArray(materials) ? materials : [materials]) {
          if (material instanceof ShaderMaterial && material.uniforms.uOpacity) {
            timeline.fromTo(material.uniforms.uOpacity, { value: 0 }, { value: 1, duration: journeyMotion.reveal }, 0)
          } else {
            material.transparent = true
            timeline.fromTo(material, { opacity: 0 }, { opacity: material.opacity, duration: journeyMotion.reveal }, 0)
          }
        }
      })
    })
    return () => context.revert()
  }, [reduced])
  if (view.level !== 'system') return null
  const sub = catalog.subgenreById.get(view.subgenreId)!
  const genre = catalog.genreById.get(sub.genreId)!
  const tracks = systemTracks(catalog, sub.id)
  const selected = state.selectedTrackId ?? tracks[0]?.id
  const position = spacePosition(sub.position).toArray() as [number, number, number]
  return <group ref={root}>
    <SystemDust key={`${sub.id}:${selected}`} id={`${sub.id}:${selected}`} position={position} color={genre.color} reduced={reduced} />
    <group position={position}>
      <Billboard><mesh>
        <planeGeometry args={[3.2, 3.2]} />
        <shaderMaterial transparent depthWrite={false} blending={AdditiveBlending} uniforms={{ uOpacity: { value: 1 }, uColor: { value: new Color('#f0d6a8').lerp(new Color(genre.color), .08) } }}
          vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }"
          fragmentShader="varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity; void main() { float d = length(vUv - .5) * 2.; float core = exp(-d * d * 440.); float halo = exp(-d * d * 34.) * .24 + exp(-d * 9.) * .08; gl_FragColor = vec4(mix(uColor, vec3(1., .98, .9), core), min(1., core + halo) * uOpacity); }" />
      </mesh></Billboard>
      {tracks.map((track, index) => <TrackOrbit key={track.id} track={track} index={index} color={genre.color}
        reduced={reduced} selected={selected === track.id} onSelect={() => dispatch({ type: 'selectTrack', id: track.id })} />)}
    </group>
  </group>
}
