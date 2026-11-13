import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Raycaster, ShaderMaterial, Vector2 } from 'three'
import type { Points } from 'three'
import { seededRandom, seedOf, systemTracks } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { spacePosition } from './space'
import { hoveredGenre, hoveredSubgenre, starHitRadius } from './hover'
import { genreVisitAppearance } from '../domain/visits'

// Keep the reference's tapered starlight, with larger points for actual catalog tracks.
const fieldVertexShader = `
  attribute float aSize, aGlow, aSeed, aGenre, aRegion, aTrack, aOrbit;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFocus, vSpread;
  uniform float uTime, uMotion, uOpacity, uDpr, uDetail, uRegionFocus, uSelectedTrack, uOrbits;
  uniform float uFocus[15], uVisibility[15], uVisitColor[15], uVisitBrightness[15];
  void main() {
    float selected = 1. - step(.5, abs(aTrack - uSelectedTrack));
    float focus = max(uFocus[int(aGenre)], max(aRegion * uRegionFocus, selected));
    vFocus = focus;
    vSpread = 1. + focus * 2.5;
    float twinkle = .55 + .45 * sin(aSeed * 45. + uTime * (.35 + aSeed * .2) * uMotion);
    vec3 tint = color / max(max(color.r, color.g), color.b);
    vec3 base = mix(vec3(.75, .78, .85), tint, uVisitColor[int(aGenre)]);
    vec3 pale = mix(vec3(.83, .88, .96), tint, .25);
    vColor = mix(mix(base, pale, uDetail), tint, focus);
    vAlpha = mix(twinkle, .65 + twinkle * .35, focus) * aGlow * uOpacity * uVisibility[int(aGenre)] * uVisitBrightness[int(aGenre)] * (1. + focus * .45);
    vAlpha *= mix(1., mix(.38, 1., aRegion), uDetail * uRegionFocus);
    vAlpha *= 1. - aOrbit * uOrbits;
    vec4 mv = modelViewMatrix * vec4(position, 1.);
    gl_PointSize = clamp(aSize * uDpr * 100. / max(8., -mv.z), 1.8 * uDpr, 4. * uDpr) * vSpread;
    gl_Position = projectionMatrix * mv;
  }
`
const fieldFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFocus, vSpread;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    if (d > 1.) discard;
    float core = pow(max(0., 1. - d * vSpread), 1.4);
    float glimmer = exp(-d * d * 7.) * (1. - smoothstep(.65, 1., d)) * vFocus * .22;
    gl_FragColor = vec4(vColor, (core + glimmer) * vAlpha);
  }
`

export function ParticleField({ view, reduced, suppressed, highlighted, onHover }: {
  view: Destination; reduced: boolean; suppressed: () => boolean; highlighted: string | null; onHover: (id: string | null) => void
}) {
  const { catalog, state, dispatch } = useExperience()
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
      // The custom field shader writes display RGB directly, like the CSS labels.
      const color = new Color(catalog.genreById.get(track.genreId)!.color).convertLinearToSRGB()
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
    result.setAttribute('aRegion', new BufferAttribute(new Float32Array(catalog.tracks.length), 1))
    result.setAttribute('aOrbit', new BufferAttribute(new Float32Array(catalog.tracks.length), 1))
    result.setAttribute('aTrack', new BufferAttribute(Float32Array.from(catalog.tracks, (_, index) => index), 1))
    return result
  }, [catalog])
  useEffect(() => () => geometry.dispose(), [geometry])
  const regionId = view.level === 'system' ? view.subgenreId : view.level === 'genre' ? highlighted : null
  useEffect(() => {
    const mask = geometry.getAttribute('aRegion')
    const members = new Set(catalog.subgenreById.get(regionId ?? '')?.trackIds ?? [])
    catalog.tracks.forEach((track, index) => mask.setX(index, members.has(track.id) ? 1 : 0))
    mask.needsUpdate = true
  }, [catalog, geometry, regionId])
  const orbitIds = useMemo(() => view.level === 'system' ? systemTracks(catalog, view.subgenreId, state.selectedTrackId).map(track => track.id) : [], [catalog, view, state.selectedTrackId])
  useEffect(() => {
    const mask = geometry.getAttribute('aOrbit')
    catalog.tracks.forEach((track, index) => mask.setX(index, orbitIds.includes(track.id) ? 1 : 0))
    mask.needsUpdate = true
  }, [catalog, geometry, orbitIds])
  const selectedIndex = useMemo(() => view.level === 'universe' ? -1 : catalog.tracks.findIndex(track => track.id === state.selectedTrackId), [catalog, state.selectedTrackId, view.level])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 1 }, uMotion: { value: reduced ? 0 : 1 },
    uDpr: { value: Math.min(devicePixelRatio, 1.75) }, uDetail: { value: 0 }, uRegionFocus: { value: 0 }, uSelectedTrack: { value: -1 }, uOrbits: { value: 0 }, uFocus: { value: new Float32Array(15) }, uVisibility: { value: new Float32Array(15).fill(1) },
    uVisitColor: { value: new Float32Array(15) }, uVisitBrightness: { value: new Float32Array(15).fill(1) } }), [reduced])
  useFrame(({ clock, camera }, delta) => {
    const rendered = material.current?.uniforms
    if (!rendered) return
    rendered.uTime.value = clock.elapsedTime
    if (view.level !== 'system' && hover.active && hover.dirty && !suppressed() && points.current && clock.elapsedTime - hover.lastCheck > .08) {
      hover.lastCheck = clock.elapsedTime
      hover.dirty = false
      hover.ray.params.Points = { threshold: starHitRadius }
      hover.ray.setFromCamera(hover.pointer, camera)
      const hits = hover.ray.intersectObject(points.current, false)
      onHover(view.level === 'universe' ? hoveredGenre(hits, catalog.tracks, highlighted) : hoveredSubgenre(hits, catalog.tracks, view.genreId, highlighted))
    }
    const genreId = view.level === 'universe' ? highlighted : null
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(delta, .05) * 5)
    rendered.uDetail.value += ((view.level === 'universe' ? 0 : 1) - rendered.uDetail.value) * blend
    rendered.uRegionFocus.value += ((regionId ? 1 : 0) - rendered.uRegionFocus.value) * blend
    rendered.uSelectedTrack.value = selectedIndex
    rendered.uOrbits.value = view.level === 'system' && state.transition === state.arrivedTransition ? 1 : 0
    catalog.genres.forEach((genre, index) => {
      const accumulated = genreVisitAppearance(state.genreVisits[genre.id] ?? 0)
      rendered.uVisitColor.value[index] += (accumulated.colorMix - rendered.uVisitColor.value[index]) * blend
      rendered.uVisitBrightness.value[index] += (accumulated.brightness - rendered.uVisitBrightness.value[index]) * blend
      rendered.uFocus.value[index] += ((genre.id === genreId ? 1 : 0) - rendered.uFocus.value[index]) * blend
      const visibility = view.level === 'universe' || view.genreId === genre.id ? 1 : .03
      rendered.uVisibility.value[index] += (visibility - rendered.uVisibility.value[index]) * (reduced ? 1 : 1 - Math.exp(-Math.min(delta, .05) * 8))
    })
  })
  function select(event: ThreeEvent<MouseEvent>) {
    if (suppressed() || event.index === undefined) return
    const track = catalog.tracks[event.index]
    const hits = event.intersections.filter(hit => hit.object === event.object)
    if (view.level === 'system') {
      if (event.intersections.some(hit => hit.object.userData.orbitTrack)) return
      const selected = hits.map(hit => catalog.tracks[hit.index!]).find(candidate => candidate?.genreId === view.genreId && candidate.subgenreIds.includes(view.subgenreId) && !orbitIds.includes(candidate.id))
      if (!selected) return
      event.stopPropagation()
      dispatch({ type: 'selectTrack', id: selected.id })
    } else if (view.level === 'genre') {
      const subgenreId = hoveredSubgenre(hits, catalog.tracks, view.genreId, highlighted)
      if (!subgenreId) return
      event.stopPropagation()
      dispatch({ type: 'navigate', destination: { level: 'system', genreId: view.genreId, subgenreId } })
    } else {
      event.stopPropagation()
      const genreId = hoveredGenre(hits, catalog.tracks, highlighted) ?? track.genreId
      dispatch({ type: 'navigate', destination: { level: 'genre', genreId } })
    }
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
  return <lineSegments geometry={geometry} raycast={() => {}}>
    <lineBasicMaterial vertexColors transparent opacity={highlighted ? .25 : .19} depthWrite={false} />
  </lineSegments>
}
