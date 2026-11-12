import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three'
import { seededRandom, seedOf } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { spacePosition } from './space'

const vertexShader = `
  attribute float aSize;
  attribute float aGlow;
  varying vec3 vColor;
  varying float vGlow;
  uniform float uTime;
  uniform float uMotion;
  void main() {
    vColor = color; vGlow = aGlow;
    vec3 p = position;
    p.y += sin(uTime * .19 + p.x * 1.3) * .025 * uMotion;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
    float distanceScale = clamp(24. / max(1., -(modelViewMatrix * vec4(p, 1.)).z), .55, 2.4);
    gl_PointSize = aSize * distanceScale * (1. + sin(uTime * .7 + position.x * 5.) * .12 * uMotion);
  }
`
const fragmentShader = `
  varying vec3 vColor;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    if (d > 1.) discard;
    float core = exp(-d * d * 30.);
    float halo = exp(-d * d * 4.) * .32;
    vec3 starlight = mix(vColor, vec3(.94, .95, 1.), core * .85);
    gl_FragColor = vec4(starlight, min(1., (core + halo) * vGlow));
  }
`

export function ParticleField({ reduced, suppressed }: { reduced: boolean; suppressed: () => boolean }) {
  const { catalog, state, dispatch } = useExperience()
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const positions: number[] = [], colors: number[] = [], sizes: number[] = [], glows: number[] = []
    for (const track of catalog.tracks) {
      const rng = seededRandom(seedOf(track.id))
      positions.push(...spacePosition(track.position, track.genreId, track.id).toArray())
      const visited = track.subgenreIds.reduce((sum, id) => sum + (state.visits[id] ?? 0), 0)
      const active = state.view.level === 'universe' || state.view.genreId === track.genreId
      const color = new Color(catalog.genreById.get(track.genreId)!.color)
      colors.push(color.r, color.g, color.b)
      sizes.push((1.8 + rng() * 3.4 + Math.min(visited, 6) * .5) * Math.min(devicePixelRatio, 1.75))
      glows.push(state.view.level === 'system' ? .07 : active ? .5 + Math.min(visited, 6) * .04 : .05)
    }
    result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    result.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1))
    result.setAttribute('aGlow', new BufferAttribute(new Float32Array(glows), 1))
    return result
  }, [catalog, state.view, state.visits])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMotion: { value: reduced ? 0 : 1 } }), [reduced])
  useFrame(({ clock }) => { if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime })
  function select(event: ThreeEvent<MouseEvent>) {
    if (suppressed() || event.index === undefined || state.view.level === 'system') return
    const track = catalog.tracks[event.index]
    if (state.view.level === 'genre' && track.genreId !== state.view.genreId) return
    event.stopPropagation()
    dispatch({ type: 'navigate', destination: state.view.level === 'universe'
      ? { level: 'genre', genreId: track.genreId }
      : { level: 'system', genreId: track.genreId, subgenreId: track.subgenreIds[0] } })
  }
  return <points geometry={geometry} onClick={select}>
    <shaderMaterial ref={material} vertexColors transparent depthWrite={false} blending={AdditiveBlending}
      uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
  </points>
}

export function SystemDust({ id, position, color, reduced }: {
  id: string; position: [number, number, number]; color: string; reduced: boolean
}) {
  const geometry = useMemo(() => {
    const rng = seededRandom(seedOf(id)), count = reduced ? 2600 : 5600
    const positions: number[] = [], colors: number[] = [], sizes: number[] = [], glows: number[] = []
    const tint = new Color(color), silver = new Color('#e3e0ed')
    for (let i = 0; i < count; i++) {
      const radius = .38 + Math.pow(rng(), .68) * 3.15
      const angle = rng() * Math.PI * 2 + radius * 1.4
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * .65, (rng() - .5) * .3)
      const shade = silver.clone().lerp(tint, rng() * .8)
      colors.push(shade.r, shade.g, shade.b)
      sizes.push((1 + rng() * 3) * Math.min(devicePixelRatio, 1.75))
      glows.push(.2 + rng() * .5)
    }
    const result = new BufferGeometry()
    result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    result.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1))
    result.setAttribute('aGlow', new BufferAttribute(new Float32Array(glows), 1))
    return result
  }, [id, color, reduced])
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMotion: { value: reduced ? 0 : 1 } }), [reduced])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }, delta) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
    if (points.current && !reduced) points.current.rotation.z += delta * .025
  })
  const points = useRef<import('three').Points>(null)
  return <points ref={points} position={position} geometry={geometry}>
    <shaderMaterial ref={material} vertexColors transparent depthWrite={false} blending={AdditiveBlending}
      vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
  </points>
}
