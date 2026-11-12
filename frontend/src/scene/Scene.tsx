import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cameraFootprint, frameSpace, spacePosition } from './space'
import type { Position } from '../domain/catalog'
import gsap from 'gsap'
import { adjacentSubgenre, seedOf, systemTracks } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { ParticleField } from './ParticleField'
import { MusicSystem } from './MusicSystem'
import styles from './Scene.module.css'

interface NavigationControls {
  zoom: (factor: number) => void
  pan: (x: number, y: number) => void
  reset: () => void
}

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function CameraRig({ reduced, controls, onBoundsChange }: { reduced: boolean; controls: RefObject<NavigationControls | null>; onBoundsChange: (bounds: Position[] | null) => void }) {
  const { catalog, state, dispatch } = useExperience()
  const { camera, get, raycaster } = useThree()
  const orbit = useRef<OrbitControlsImpl>(null)
  const travel = useRef<gsap.core.Tween | null>(null)
  const lastBounds = useRef('')
  const lastReport = useRef(-Infinity)
  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastReport.current < .1) return
    const bounds = cameraFootprint(camera)
    const key = JSON.stringify(bounds)
    if (key === lastBounds.current) return
    lastBounds.current = key
    lastReport.current = clock.elapsedTime
    onBoundsChange(bounds)
  })
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !orbit.current) return
    const controller = orbit.current
    const system = state.view.level === 'system'
    const members = state.view.level === 'universe' ? catalog.tracks :
      catalog.genreById.get(state.view.genreId)!.trackIds.map(id => catalog.trackById.get(id)!)
    const size = get().size
    const points = state.view.level === 'system' ? [spacePosition(catalog.subgenreById.get(state.view.subgenreId)!.position, state.view.genreId)] :
      members.map(track => spacePosition(track.position, track.genreId, track.id))
    const { center, destination, distance } = frameSpace(points, size.width / size.height, camera.fov, system)
    controller.minDistance = Math.max(1.5, distance * .12)
    controller.maxDistance = distance * 3
    raycaster.params.Points = { threshold: .09 }
    const origin = camera.position.clone(), oldTarget = controller.target.clone()
    const progress = { value: 0 }
    travel.current = gsap.to(progress, {
      value: 1, duration: reduced ? .15 : .8, ease: 'power3.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(origin, destination, progress.value)
        controller.target.lerpVectors(oldTarget, center, progress.value)
        controller.update()
      },
      onComplete: () => { dispatch({ type: 'arrive', transition: state.transition }) },
    })
    const finishTravel = () => { travel.current?.progress(1); travel.current?.kill() }
    controller.addEventListener('start', finishTravel)
    controls.current = {
      zoom: factor => {
        finishTravel()
        const offset = camera.position.clone().sub(controller.target)
        offset.setLength(Math.max(controller.minDistance, Math.min(controller.maxDistance, offset.length() / factor)))
        camera.position.copy(controller.target).add(offset); controller.update()
      },
      pan: (x, y) => {
        finishTravel()
        const offset = camera.position.clone().sub(controller.target)
        offset.applyAxisAngle(new Vector3(0, 1, 0), x * .003)
        offset.applyAxisAngle(new Vector3(1, 0, 0), y * .003)
        camera.position.copy(controller.target).add(offset); controller.update()
      },
      reset: () => { finishTravel(); camera.position.copy(destination); controller.target.copy(center); controller.update() },
    }
    return () => { travel.current?.kill(); controller.removeEventListener('start', finishTravel); controls.current = null }
  }, [camera, catalog, controls, dispatch, get, raycaster, reduced, state.transition, state.view])
  return <OrbitControls ref={orbit} makeDefault enableDamping={!reduced} dampingFactor={.08} rotateSpeed={.55}
    minAzimuthAngle={-1.1} maxAzimuthAngle={1.1} minPolarAngle={.5} maxPolarAngle={2.6} enableRotate={state.view.level !== 'system'}
    enablePan={state.view.level !== 'system'} />
}

function Markers({ suppressed, onHover }: { suppressed: () => boolean; onHover: (id: string) => void }) {
  const { catalog, state, dispatch } = useExperience()
  const items = useMemo(() => state.view.level === 'universe' ? catalog.genres : state.view.level === 'genre'
    ? catalog.genreById.get(state.view.genreId)!.subgenreIds.map(id => catalog.subgenreById.get(id)!) : [], [catalog, state.view])
  return <>{items.map(item => {
    const genre = 'color' in item ? item : catalog.genreById.get(item.genreId)!
    const count = 'color' in item ? item.subgenreIds.reduce((sum, id) => sum + (state.visits[id] ?? 0), 0) : state.visits[item.id] ?? 0
    const navigate = () => {
      if (suppressed()) return
      dispatch({ type: 'navigate', destination: 'color' in item ? { level: 'genre', genreId: item.id }
        : { level: 'system', genreId: item.genreId, subgenreId: item.id } })
    }
    return <group key={item.id} position={spacePosition(item.position, genre.id)}>
      <mesh onClick={event => { event.stopPropagation(); navigate() }} onPointerOver={() => onHover(item.id)}>
        <sphereGeometry args={[state.view.level === 'universe' ? .045 : .014, 12, 12]} />
        <meshBasicMaterial color={count ? '#ece4ff' : genre.color} />
      </mesh>
    </group>
  })}</>
}

interface Label {
  id: string
  name: string
  detail: string
  position: [number, number, number]
  visited: boolean
  color?: string
  orbit?: number
  selected?: boolean
  navigate: () => void
}

// Project into the existing DOM tree; avoid extra React roots inside the WebGL renderer.
function LabelProjection({ labels, elements, lines, reduced, onUnavailable, onReady }: {
  labels: Label[]; elements: RefObject<Map<string, HTMLButtonElement>>; lines: RefObject<Map<string, SVGLineElement>>; reduced: boolean; onUnavailable: () => void; onReady: () => void
}) {
  const vector = useMemo(() => new Vector3(), [])
  const ready = useRef(false)
  const { gl } = useThree()
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onUnavailable() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onUnavailable])
  useFrame(({ camera, size, clock }) => {
    if (!ready.current) { ready.current = true; onReady() }
    const boxes: { x: number; y: number; w: number; h: number }[] = []
    for (const label of labels) {
      const element = elements.current.get(label.id)
      if (!element) continue
      vector.set(...label.position)
      if (label.orbit !== undefined) {
        const radius = 1.25 + label.orbit * .76
        const angle = (seedOf(label.id) % 628) / 100 + (reduced ? 0 : clock.elapsedTime * (.055 - label.orbit * .01))
        vector.x += Math.cos(angle) * radius
        vector.y += Math.sin(angle) * radius * .65 - .16
      }
      vector.project(camera)
      const anchorX = (vector.x + 1) / 2 * size.width
      const anchorY = (1 - vector.y) / 2 * size.height
      if (anchorX < -20 || anchorX > size.width + 20 || anchorY < -20 || anchorY > size.height + 20) {
        element.style.visibility = 'hidden'
        const line = lines.current.get(label.id)
        if (line) line.style.opacity = '0'
        continue
      }
      const width = element.offsetWidth, height = element.offsetHeight
      let x = anchorX, y = anchorY
      if (label.orbit === undefined) {
        let placed = false
        for (const offsetY of [8, -42, 42, -80, 80, -118, 118, -156, 156]) {
          for (const offsetX of [0, -65, 65, -130, 130]) {
            const cx = Math.min(size.width - width / 2 - 6, Math.max(width / 2 + 6, anchorX + offsetX))
            const cy = Math.min(size.height - height - 78, Math.max(5, anchorY + offsetY))
            if (!boxes.some(b => Math.abs(b.x - cx) < (b.w + width) / 2 + 5 && cy < b.y + b.h + 3 && cy + height + 3 > b.y)) {
              x = cx; y = cy; placed = true; break
            }
          }
          if (placed) break
        }
        boxes.push({ x, y, w: width, h: height })
        const line = lines.current.get(label.id)
        if (line) {
          line.setAttribute('x1', String(anchorX)); line.setAttribute('y1', String(anchorY))
          line.setAttribute('x2', String(x)); line.setAttribute('y2', String(y < anchorY ? y + height : y))
          line.style.opacity = Math.hypot(x - anchorX, y - anchorY) > 25 ? '.3' : '0'
        }
      }
      element.style.transform = `translate3d(${x}px,${y}px,0) translateX(-50%)`
      element.style.visibility = vector.z < -1 || vector.z > 1 || x < 0 || x > size.width || y < 0 || y > size.height - 25 ? 'hidden' : 'visible'
    }
  })
  return null
}

export default function Scene({ reduced, onUnavailable, onBoundsChange }: { reduced: boolean; onUnavailable: () => void; onBoundsChange: (bounds: Position[] | null) => void }) {
  const { catalog, state, dispatch } = useExperience()
  const start = useRef<[number, number] | null>(null)
  const suppressUntil = useRef(0)
  const controls = useRef<NavigationControls | null>(null)
  const elements = useRef(new Map<string, HTMLButtonElement>())
  const lines = useRef(new Map<string, SVGLineElement>())
  const [hovered, setHovered] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const suppressed = () => performance.now() < suppressUntil.current
  const labels = useMemo((): Label[] => {
    if (state.view.level === 'system') {
      const sub = catalog.subgenreById.get(state.view.subgenreId)!
      const tracks = systemTracks(catalog, sub.id)
      return tracks.map((track, index) => ({ id: track.id, name: track.title, detail: `0${index + 1}`,
        position: spacePosition(sub.position, sub.genreId).add(new Vector3(0, 0, .5)).toArray() as [number, number, number], orbit: index, visited: false,
        selected: (state.selectedTrackId ?? tracks[0].id) === track.id,
        navigate: () => dispatch({ type: 'selectTrack', id: track.id }) }))
    }
    const items = state.view.level === 'universe' ? catalog.genres : catalog.genreById.get(state.view.genreId)!.subgenreIds.map(id => catalog.subgenreById.get(id)!)
    return [...items].sort((a, b) => b.trackIds.length - a.trackIds.length)
      .filter((item, index) => state.view.level === 'universe' || index < 7 || item.id === hovered)
      .map(item => ({ id: item.id, name: item.name, detail: `${item.trackIds.length.toLocaleString()} TRACKS`,
        position: spacePosition(item.position, 'color' in item ? item.id : item.genreId).toArray() as [number, number, number],
        color: 'color' in item ? item.color : catalog.genreById.get(item.genreId)!.color, visited: 'color' in item ? item.subgenreIds.some(id => state.visits[id]) : Boolean(state.visits[item.id]),
        navigate: () => { if (!suppressed()) dispatch({ type: 'navigate', destination: 'color' in item ? { level: 'genre', genreId: item.id } : { level: 'system', genreId: item.genreId, subgenreId: item.id } }) },
      }))
  }, [catalog, dispatch, hovered, state.selectedTrackId, state.view, state.visits])
  function step(direction: number) {
    if (state.view.level !== 'system') return
    const sub = adjacentSubgenre(catalog, state.view.subgenreId, direction)
    dispatch({ type: 'navigate', destination: { level: 'system', genreId: sub.genreId, subgenreId: sub.id } })
  }
  return <div className={styles.viewport} tabIndex={0} role="region" aria-label="장르 우주 지도. 드래그로 회전, 우클릭 드래그 또는 두 손가락으로 이동, 휠로 접근하거나 물러납니다. 항성계에서 좌우 방향키로 세부장르를 전환합니다."
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key)) event.preventDefault()
      if (event.key === '+' || event.key === '=') controls.current?.zoom(1.3)
      else if (event.key === '-') controls.current?.zoom(1 / 1.3)
      else if (event.key === '0') controls.current?.reset()
      else if (state.view.level === 'system' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) step(event.key === 'ArrowRight' ? 1 : -1)
      else if (state.view.level !== 'system') {
        if (event.key === 'ArrowLeft') controls.current?.pan(50, 0)
        if (event.key === 'ArrowRight') controls.current?.pan(-50, 0)
        if (event.key === 'ArrowUp') controls.current?.pan(0, 50)
        if (event.key === 'ArrowDown') controls.current?.pan(0, -50)
      }
    }}
    onPointerDownCapture={event => {
      if ((event.target as HTMLElement).tagName !== 'CANVAS') return
      event.currentTarget.focus({ preventScroll: true })
      start.current = [event.clientX, event.clientY]
    }}
    onPointerUpCapture={event => {
      if (!start.current) return
      const dx = event.clientX - start.current[0], dy = event.clientY - start.current[1]
      start.current = null
      if (Math.hypot(dx, dy) > 8) suppressUntil.current = performance.now() + 300
      if (state.view.level === 'system' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1)
    }} onPointerCancel={() => { start.current = null }}>
    <CanvasBoundary onError={onUnavailable}>
      <Canvas camera={{ position: [0, -6, 40], fov: 45, near: .1, far: 500 }} dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        fallback={<span className="srOnly">3D 지도 대신 장르 목록에서 탐색해 주세요.</span>}>
        <Suspense fallback={null}>
          <CameraRig reduced={reduced} controls={controls} onBoundsChange={onBoundsChange} />
          <ParticleField reduced={reduced} suppressed={suppressed} />
          <Markers suppressed={suppressed} onHover={setHovered} />
          <MusicSystem reduced={reduced} />
          <LabelProjection labels={labels} elements={elements} lines={lines} reduced={reduced} onUnavailable={onUnavailable} onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>
    </CanvasBoundary>
    {!ready && <div className={styles.loadingStars} role="status"><i />GATHERING THE STARS</div>}
    <div className={styles.labels}><svg className={styles.labelLines} aria-hidden="true">{labels.filter(l => l.orbit === undefined).map(label => <line key={label.id} ref={element => { if (element) lines.current.set(label.id, element); else lines.current.delete(label.id) }} />)}</svg>{labels.map(label => <button key={label.id}
      ref={element => { if (element) elements.current.set(label.id, element); else elements.current.delete(label.id) }}
      className={label.orbit === undefined ? `${styles.marker} ${label.visited ? styles.visitedMarker : ''}` : `${styles.planetLabel} ${label.selected ? styles.selectedPlanet : ''}`}
      onClick={label.navigate} title={label.name} style={label.color ? { color: label.color } : undefined}>
      {label.orbit !== undefined ? <><span>{label.detail}</span> {label.name}</> : <><span className={styles.markerName}>{label.name}</span><span className="srOnly">{label.detail}{label.visited ? ' · 발견됨' : ''}</span></>}
    </button>)}</div>
    <div className={styles.mapControls} aria-label="지도 배율 조절">
      <button onClick={() => controls.current?.zoom(1.3)} aria-label="지도 확대" title="확대 (+)">+</button>
      <button onClick={() => controls.current?.zoom(1 / 1.3)} aria-label="지도 축소" title="축소 (-)">−</button>
      <button onClick={() => controls.current?.reset()} aria-label="지도 보기 초기화" title="원래 보기 (0)">⌖</button>
    </div>
  </div>
}
