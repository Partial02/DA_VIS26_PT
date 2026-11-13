import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Raycaster, ShaderMaterial, Vector2 } from 'three'
import type { Points } from 'three'
import { seededRandom, seedOf } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { spacePosition } from './space'
import { hoveredGenre } from './hover'

// Match refer/index (1).html: tiny tapered points and slow, seed-based alpha.
const fieldVertexShader = `
  attribute float aSize, aGlow, aSeed, aGenre;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uTime, uMotion, uOpacity, uDpr;
  uniform float uFocus[15], uVisibility[15];
  void main() {
    float focus = uFocus[int(aGenre)];
    float twinkle = .55 + .45 * sin(aSeed * 45. + uTime * (.35 + aSeed * .2) * uMotion);
    vec3 tint = color / max(max(color.r, color.g), color.b);
    vColor = mix(vec3(.75, .78, .85), tint, focus);
    vAlpha = twinkle * aGlow * uOpacity * uVisibility[int(aGenre)] * (1. + focus * .2);
    vec4 mv = modelViewMatrix * vec4(position, 1.);
    gl_PointSize = clamp(aSize * uDpr * 65. / max(8., -mv.z), 1.25 * uDpr, 2.5 * uDpr);
    gl_Position = projectionMatrix * mv;
  }
`
const fieldFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - .5);
    if (d > .5) discard;
    gl_FragColor = vec4(vColor, pow(1. - d * 2., 1.4) * vAlpha);
  }
`

const vertexShader = `
  attribute float aSize;
  attribute float aGlow;
  attribute float aGenre;
  varying vec3 vColor;
  varying float vGlow;
  varying float vFlare;
  varying float vFocus;
  uniform float uTime;
  uniform float uMotion;
  uniform float uOpacity;
  uniform float uField;
  uniform float uFocus[15];
  uniform float uVisibility[15];
  void main() {
    float focus = uFocus[int(aGenre)] * uField;
    vFocus = focus;
    float phase = position.x * 5. + position.y * 3. + position.z * 2.;
    float twinkle = sin(uTime * .85 + phase) * sin(uTime * .37 + phase * 1.7);
    vColor = mix(color, mix(vec3(.86, .9, 1.), color, .06 + focus * .88), uField);
    float visibility = mix(1., uVisibility[int(aGenre)], uField);
    vGlow = aGlow * visibility * uOpacity * (1. + twinkle * (.16 + uField * .2) * uMotion) * (1. + focus * .35);
    vFlare = uField * step(.97, fract(sin(phase * 12.9898) * 43758.5453));
    vec3 p = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
    float distanceScale = clamp(24. / max(1., -(modelViewMatrix * vec4(p, 1.)).z), .55, 2.4);
    gl_PointSize = aSize * distanceScale * (1. + vFlare * 1.25) * (1. + twinkle * .08 * uMotion);
  }
`
const fragmentShader = `
  varying vec3 vColor;
  varying float vGlow;
  varying float vFlare;
  varying float vFocus;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    if (d > 1.) discard;
    float core = exp(-d * d * 18.);
    float halo = exp(-d * d * 5.) * .22;
    vec2 p = abs(gl_PointCoord - .5);
    float rays = (exp(-p.x * 95. - p.y * 8.) + exp(-p.y * 95. - p.x * 8.)) * .22 * vFlare;
    vec3 starlight = mix(vColor, vec3(.98, .97, .94), core * mix(.7, .2, vFocus));
    gl_FragColor = vec4(starlight, min(1., (core + halo + rays) * vGlow));
  }
`

export function ParticleField({ view, reduced, suppressed, highlighted, onHover }: {
  view: Destination; reduced: boolean; suppressed: () => boolean; highlighted: string | null; onHover: (id: string | null) => void
}) {
  const { catalog, dispatch } = useExperience()
  const { gl } = useThree()
  const points = useRef<Points>(null)
  const hover = useMemo(() => ({ ray: new Raycaster(), pointer: new Vector2(), active: false, dirty: false, lastCheck: 0 }), [])
  useEffect(() => {
    const move = (event: PointerEvent) => {
      hover.active = event.pointerType === 'mouse' && event.buttons === 0
      hover.dirty = true
      const rect = gl.domElement.getBoundingClientRect()
      hover.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
    }
    const leave = () => { hover.active = false; onHover(null) }
    gl.domElement.addEventListener('pointermove', move)
    gl.domElement.addEventListener('pointerleave', leave)
    return () => { gl.domElement.removeEventListener('pointermove', move); gl.domElement.removeEventListener('pointerleave', leave) }
  }, [gl, hover, onHover])
  const material = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const positions: number[] = [], colors: number[] = [], sizes: number[] = [], glows: number[] = [], genres: number[] = [], seeds: number[] = []
    for (const track of catalog.tracks) {
      const rng = seededRandom(seedOf(track.id))
      const seed = rng()
      seeds.push(seed)
      positions.push(...spacePosition(track.position).toArray())
      const color = new Color(catalog.genreById.get(track.genreId)!.color)
      colors.push(color.r, color.g, color.b)
      genres.push(catalog.genres.findIndex(genre => genre.id === track.genreId))
      sizes.push(.55 + seed * .65)
      glows.push(1.3 + rng() * .35)
    }
    result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    result.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1))
    result.setAttribute('aGlow', new BufferAttribute(new Float32Array(glows), 1))
    result.setAttribute('aGenre', new BufferAttribute(new Float32Array(genres), 1))
    result.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1))
    return result
  }, [catalog])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 1 }, uMotion: { value: reduced ? 0 : 1 },
    uDpr: { value: Math.min(devicePixelRatio, 1.75) }, uFocus: { value: new Float32Array(15) }, uVisibility: { value: new Float32Array(15).fill(1) } }), [reduced])
  useFrame(({ clock, camera }, delta) => {
    const rendered = material.current?.uniforms
    if (!rendered) return
    rendered.uTime.value = clock.elapsedTime
    if (view.level === 'universe' && hover.active && hover.dirty && !suppressed() && points.current && clock.elapsedTime - hover.lastCheck > .08) {
      hover.lastCheck = clock.elapsedTime
      hover.dirty = false
      hover.ray.params.Points = { threshold: .32 }
      hover.ray.setFromCamera(hover.pointer, camera)
      onHover(hoveredGenre(hover.ray.intersectObject(points.current, false), catalog.tracks, highlighted))
    }
    const genreId = view.level === 'universe' ? highlighted : view.genreId
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(delta, .05) * 5)
    catalog.genres.forEach((genre, index) => {
      rendered.uFocus.value[index] += ((genre.id === genreId ? 1 : 0) - rendered.uFocus.value[index]) * blend
      const visibility = view.level === 'system' ? .02 : view.level === 'universe' || view.genreId === genre.id ? 1 : .03
      rendered.uVisibility.value[index] += (visibility - rendered.uVisibility.value[index]) * (reduced ? 1 : 1 - Math.exp(-Math.min(delta, .05) * 8))
    })
  })
  function select(event: ThreeEvent<MouseEvent>) {
    if (suppressed() || event.index === undefined || view.level === 'system') return
    const track = catalog.tracks[event.index]
    if (view.level === 'genre' && track.genreId !== view.genreId) return
    event.stopPropagation()
    const genreId = hoveredGenre(event.intersections.filter(hit => hit.object === event.object), catalog.tracks, null) ?? track.genreId
    dispatch({ type: 'navigate', destination: view.level === 'universe'
      ? { level: 'genre', genreId }
      : { level: 'system', genreId: track.genreId, subgenreId: track.subgenreIds[0] } })
  }
  return <points ref={points} geometry={geometry} onClick={select}>
    <shaderMaterial ref={material} vertexColors transparent depthWrite={false} blending={AdditiveBlending}
      uniforms={uniforms} vertexShader={fieldVertexShader} fragmentShader={fieldFragmentShader} />
  </points>
}

export function ConstellationLinks({ view, highlighted }: { view: Destination; highlighted: string | null }) {
  const { catalog } = useExperience()
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const positions: number[] = [], colors: number[] = []
    for (const [left, right] of catalog.links) {
      const pair = [catalog.trackById.get(left)!, catalog.trackById.get(right)!]
      const genreId = view.level === 'universe' ? null : view.genreId
      if (genreId && !pair.some(track => track.genreId === genreId)) continue
      for (const track of pair) {
        positions.push(...track.position)
        const color = new Color('#c1c9d8').lerp(new Color(catalog.genreById.get(track.genreId)!.color), .2)
        colors.push(color.r, color.g, color.b)
      }
    }
    result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    return result
  }, [catalog, view])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (view.level === 'system') return null
  return <lineSegments geometry={geometry} raycast={() => {}}>
    <lineBasicMaterial vertexColors transparent opacity={highlighted ? .25 : .19} depthWrite={false} />
  </lineSegments>
}

export function SystemDust({ id, position, color, reduced }: {
  id: string; position: [number, number, number]; color: string; reduced: boolean
}) {
  const geometry = useMemo(() => {
    const rng = seededRandom(seedOf(id)), count = reduced ? 2600 : 5600
    const positions: number[] = [], colors: number[] = [], sizes: number[] = [], glows: number[] = []
    const tint = new Color(color), silver = new Color('#e6e0d3')
    for (let i = 0; i < count; i++) {
      const radius = .38 + Math.pow(rng(), .68) * 3.15
      const angle = rng() * Math.PI * 2 + radius * 1.4
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * .65, (rng() - .5) * .3)
      const shade = silver.clone().lerp(tint, rng() * .2)
      colors.push(shade.r, shade.g, shade.b)
      sizes.push((.7 + rng() * 1.5) * Math.min(devicePixelRatio, 1.75))
      glows.push(.15 + rng() * .4)
    }
    const result = new BufferGeometry()
    result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    result.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1))
    result.setAttribute('aGlow', new BufferAttribute(new Float32Array(glows), 1))
    result.setAttribute('aGenre', new BufferAttribute(new Float32Array(count), 1))
    return result
  }, [id, color, reduced])
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 1 }, uMotion: { value: reduced ? 0 : 1 },
    uField: { value: 0 }, uFocus: { value: new Float32Array(15) }, uVisibility: { value: new Float32Array(15).fill(1) } }), [reduced])
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
