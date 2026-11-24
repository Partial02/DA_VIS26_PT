import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cameraFootprint, frameSpace, spaceFlight, spacePosition } from './space'
import type { Position } from '../domain/catalog'
import gsap from 'gsap'
import { formatDuration } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import type { Destination } from '../state/reducer'
import { journeyMotion } from '../state/motion'
import { ConstellationLinks, ParticleField } from './ParticleField'
import { starHitRadius } from './hover'
import { MusicSystem } from './MusicSystem'
import styles from './Scene.module.css'

const zoomFactor = 1.3

interface NavigationControls {
  zoom: (factor: number) => void
  pan: (x: number, y: number) => void
  reset: () => void
}

interface FlightState { busy: boolean; reveal: number }

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function CameraRig({ reduced, paused, controls, flight, onSceneArrival, onTravelChange, onBoundsChange }: {
  reduced: boolean; paused: boolean; controls: RefObject<NavigationControls | null>; flight: RefObject<FlightState>;
  onSceneArrival: (view: Destination) => void; onTravelChange: (busy: boolean) => void; onBoundsChange: (bounds: Position[] | null) => void
}) {
  const { catalog, state, dispatch } = useExperience()
  const { camera, get, gl, raycaster } = useThree()
  const orbit = useRef<OrbitControlsImpl>(null)
  const lastBounds = useRef('')
  const lastReport = useRef(-Infinity)
  const firstFlight = useRef(true)
  const previousView = useRef(state.view)
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
    const ids = state.view.level === 'system' ? catalog.subgenreById.get(state.view.subgenreId)!.trackIds :
      state.view.level === 'genre' ? catalog.genreById.get(state.view.genreId)!.trackIds : null
    const members = ids ? ids.map(id => catalog.trackById.get(id)!) : catalog.tracks
    const size = gl.domElement.parentElement!.getBoundingClientRect()
    const points = members.map(track => spacePosition(track.position))
    const { center, destination, distance } = frameSpace(points, size.width / size.height, 45, system)
    if (state.view.level === 'system') {
      const offset = destination.clone().sub(center)
      center.copy(spacePosition(catalog.subgenreById.get(state.view.subgenreId)!.position))
      destination.copy(center).add(offset)
    }
    const localZoom = !firstFlight.current && previousView.current.level !== 'universe' && state.view.level !== 'universe'
      && previousView.current.genreId === state.view.genreId
    if (localZoom) destination.copy(center).addScaledVector(camera.position.clone().sub(controller.target).normalize(), distance)
    previousView.current = state.view
    controller.enabled = false
    flight.current.busy = true
    onTravelChange(true)
    raycaster.params.Points = { threshold: system ? .09 : starHitRadius }
    const origin = firstFlight.current && !reduced
      ? destination.clone().add(new Vector3(0, 0, distance * .12)) : camera.position.clone()
    const oldTarget = firstFlight.current ? center.clone() : camera.position.clone()
      .addScaledVector(camera.getWorldDirection(new Vector3()), camera.position.distanceTo(controller.target))
    const path = spaceFlight(origin, destination)
    const initial = firstFlight.current
    firstFlight.current = false
    camera.fov = 45
    camera.updateProjectionMatrix()
    const progress = { value: 0 }
    const lookTarget = oldTarget.clone()
    const timeline = gsap.timeline({ onComplete: () => {
      controller.minDistance = Math.max(1.5, distance * .12)
      controller.maxDistance = distance * 3
      controller.enabled = true
      flight.current.busy = false
      onTravelChange(false)
      dispatch({ type: 'arrive', transition: state.transition })
    } })
    timeline.to(flight.current, { reveal: 0, duration: reduced ? 0 : journeyMotion.fade }, 0)
    timeline.to(progress, {
      value: 1, duration: reduced ? .12 : initial ? .9 : journeyMotion.duration, ease: journeyMotion.ease,
      onUpdate: () => {
        if (reduced || localZoom) camera.position.lerpVectors(origin, destination, progress.value)
        else path.getPoint(progress.value, camera.position)
        controller.target.lerpVectors(oldTarget, center, progress.value)
        lookTarget.lerpVectors(oldTarget, center, progress.value)
        camera.lookAt(lookTarget)
        camera.updateMatrixWorld()
      },
    }, 0)
    timeline.call(() => onSceneArrival(state.view))
    timeline.to(flight.current, { reveal: 1, duration: reduced ? .08 : journeyMotion.reveal, ease: 'power2.out' })
    controls.current = {
      zoom: factor => {
        if (flight.current.busy) return
        const offset = camera.position.clone().sub(controller.target)
        offset.setLength(Math.max(controller.minDistance, Math.min(controller.maxDistance, offset.length() / factor)))
        camera.position.copy(controller.target).add(offset); controller.update()
      },
      pan: (x, y) => {
        if (flight.current.busy) return
        const offset = camera.position.clone().sub(controller.target)
        offset.applyAxisAngle(new Vector3(0, 1, 0), x * .003)
        offset.applyAxisAngle(new Vector3(1, 0, 0), y * .003)
        camera.position.copy(controller.target).add(offset); controller.update()
      },
      reset: () => {
        if (flight.current.busy) return
        const viewport = get().size
        const frame = frameSpace(points, viewport.width / viewport.height, 45, system)
        if (state.view.level === 'system') {
          const offset = frame.destination.clone().sub(frame.center)
          frame.center.copy(spacePosition(catalog.subgenreById.get(state.view.subgenreId)!.position))
          frame.destination.copy(frame.center).add(offset)
        }
        controller.minDistance = Math.max(1.5, frame.distance * .12)
        controller.maxDistance = frame.distance * 3
        camera.position.copy(frame.destination); controller.target.copy(frame.center); controller.update()
      },
    }
    return () => { timeline.kill(); controller.enabled = true; controls.current = null }
  }, [camera, catalog, controls, dispatch, flight, get, gl, onSceneArrival, onTravelChange, raycaster, reduced, state.transition, state.view])
  return <OrbitControls ref={orbit} makeDefault enableDamping={!reduced} dampingFactor={.08} rotateSpeed={.55}
    autoRotate={!reduced && state.view.level === 'universe' && !paused} autoRotateSpeed={.22}
    minPolarAngle={.5} maxPolarAngle={2.6} enableRotate enablePan />
}

interface Label {
  id: string
  name: string
  detail: string
  position: [number, number, number]
  visited: boolean
  color?: string
  track?: boolean
  artist?: string
  navigate: () => void
}

// Project into the existing DOM tree; avoid extra React roots inside the WebGL renderer.
function LabelProjection({ labels, elements, lines, container, flight, onUnavailable, onReady }: {
  labels: Label[]; elements: RefObject<Map<string, HTMLButtonElement>>; lines: RefObject<Map<string, SVGLineElement>>; onUnavailable: () => void; onReady: () => void
  container: RefObject<HTMLDivElement | null>; flight: RefObject<FlightState>
}) {
  const vector = useMemo(() => new Vector3(), [])
  const ready = useRef(false)
  const { gl } = useThree()
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onUnavailable() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onUnavailable])
  useFrame(({ camera, size }) => {
    if (container.current) {
      container.current.style.opacity = String(flight.current.reveal)
      container.current.inert = flight.current.busy
    }
    if (!ready.current) { ready.current = true; onReady() }
    const boxes: { x: number; y: number; w: number; h: number }[] = []
    for (const label of labels) {
      const element = elements.current.get(label.id)
      if (!element) continue
      vector.set(...label.position)
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
      let x = anchorX, y = anchorY + (label.track ? 16 : 0)
      if (!label.track) {
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

/** Zoom handle the scene hands to the tool rail's + / − buttons. */
export interface MapZoom { zoomIn: () => void; zoomOut: () => void }

export default function Scene({ reduced, onUnavailable, onBoundsChange, zoomRef }: {
  reduced: boolean; onUnavailable: () => void; onBoundsChange: (bounds: Position[] | null) => void; zoomRef?: RefObject<MapZoom | null>
}) {
  const { catalog, state, dispatch } = useExperience()
  const viewport = useRef<HTMLDivElement>(null)
  const start = useRef<[number, number] | null>(null)
  const suppressUntil = useRef(0)
  const controls = useRef<NavigationControls | null>(null)
  useEffect(() => {
    if (!zoomRef) return
    zoomRef.current = { zoomIn: () => controls.current?.zoom(zoomFactor), zoomOut: () => controls.current?.zoom(1 / zoomFactor) }
    return () => { zoomRef.current = null }
  }, [zoomRef])
  const flight = useRef<FlightState>({ busy: true, reveal: 0 })
  const [starHover, setStarHover] = useState<string | null>(null)
  const labelsContainer = useRef<HTMLDivElement>(null)
  const [sceneView, setSceneView] = useState(state.view)
  const [traveling, setTraveling] = useState(true)
  const elements = useRef(new Map<string, HTMLButtonElement>())
  const lines = useRef(new Map<string, SVGLineElement>())
  const [hovered, setHovered] = useState<string | null>(null)
  const hoverTarget = useRef<string | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)
  const highlight = useCallback((id: string | null, immediate = false) => {
    if (!immediate && hoverTarget.current === id) return
    hoverTarget.current = id
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    if (immediate) setHovered(id)
    else hoverTimer.current = setTimeout(() => setHovered(id), id ? 100 : 240)
  }, [])
  useEffect(() => {
    hoverTarget.current = null
    setHovered(null)
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }
  }, [state.view])
  useEffect(() => {
    const element = viewport.current!
    const wheel = (event: WheelEvent) => {
      if (!controls.current || !event.deltaY) return
      event.preventDefault()
      event.stopPropagation()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1)
      controls.current.zoom(Math.pow(zoomFactor, -delta / 100))
    }
    // Capture before OrbitControls so a wheel gesture only zooms once.
    element.addEventListener('wheel', wheel, { capture: true, passive: false })
    return () => element.removeEventListener('wheel', wheel, true)
  }, [])
  const suppressed = () => flight.current.busy || performance.now() < suppressUntil.current
  const labels = useMemo((): Label[] => {
    if (sceneView.level === 'system') {
      // Only the clicked song shows its card: title, artist, length — values only.
      const track = state.selectedTrackId ? catalog.trackById.get(state.selectedTrackId) : undefined
      if (!track || !track.subgenreIds.includes(sceneView.subgenreId)) return []
      return [{ id: track.id, name: track.title, artist: track.artist, detail: formatDuration(track.duration), track: true, visited: false,
        position: spacePosition(track.position).toArray() as [number, number, number], navigate: () => {} }]
    }
    const items = sceneView.level === 'universe' ? catalog.genres : catalog.genreById.get(sceneView.genreId)!.subgenreIds.map(id => catalog.subgenreById.get(id)!)
    return [...items].sort((a, b) => b.trackIds.length - a.trackIds.length)
      .filter((item, index) => sceneView.level === 'universe' || index < 7 || item.id === hovered)
      .map(item => ({ id: item.id, name: item.name, detail: `${item.trackIds.length.toLocaleString()} TRACKS`,
        position: spacePosition(item.position).toArray() as [number, number, number],
        color: 'color' in item ? item.color : catalog.genreById.get(item.genreId)!.color, visited: 'color' in item ? Boolean(state.genreVisits[item.id]) : Boolean(state.visits[item.id]),
        navigate: () => { if (!suppressed()) dispatch({ type: 'navigate', destination: 'color' in item ? { level: 'genre', genreId: item.id } : { level: 'system', genreId: item.genreId, subgenreId: item.id } }) },
      }))
  }, [catalog, dispatch, hovered, state.selectedTrackId, sceneView, state.visits, state.genreVisits])
  return <div ref={viewport} className={`${styles.viewport} ${sceneView.level === 'universe' ? styles.universe : ''}`} data-system={state.view.level === 'system'} data-hovered={sceneView.level !== 'system' && hovered !== null} tabIndex={0} role="region" aria-busy={traveling} aria-label="장르 우주 지도. 드래그로 회전, 우클릭 드래그 또는 두 손가락으로 이동, 휠로 접근하거나 물러납니다. 방향키로 회전하고 0으로 원래 보기를 복원합니다."
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key)) event.preventDefault()
      if (event.key === '+' || event.key === '=') controls.current?.zoom(zoomFactor)
      else if (event.key === '-') controls.current?.zoom(1 / zoomFactor)
      else if (event.key === '0') controls.current?.reset()
      else {
        if (event.key === 'ArrowLeft') controls.current?.pan(50, 0)
        if (event.key === 'ArrowRight') controls.current?.pan(-50, 0)
        if (event.key === 'ArrowUp') controls.current?.pan(0, 50)
        if (event.key === 'ArrowDown') controls.current?.pan(0, -50)
      }
    }}
    onPointerDownCapture={event => {
      if (flight.current.busy) return
      if ((event.target as HTMLElement).tagName !== 'CANVAS') return
      event.currentTarget.focus({ preventScroll: true })
      start.current = [event.clientX, event.clientY]
    }}
    onPointerUpCapture={event => {
      if (!start.current) return
      const dx = event.clientX - start.current[0], dy = event.clientY - start.current[1]
      start.current = null
      if (Math.hypot(dx, dy) > 8) suppressUntil.current = performance.now() + 300
    }} onPointerCancel={() => { start.current = null }} onPointerLeave={() => highlight(null)}>
    <CanvasBoundary onError={onUnavailable}>
      <Canvas camera={{ position: [0, -6, 40], fov: 45, near: .1, far: 500 }} dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        fallback={<span className="srOnly">3D 지도 대신 장르 목록에서 탐색해 주세요.</span>}>
        <Suspense fallback={null}>
          <CameraRig reduced={reduced} paused={traveling || hovered !== null} controls={controls} flight={flight} onSceneArrival={setSceneView} onTravelChange={setTraveling} onBoundsChange={onBoundsChange} />
          <ParticleField view={state.view} reduced={reduced} suppressed={suppressed} highlighted={hovered} onHover={highlight} />
          <ConstellationLinks view={sceneView} highlighted={sceneView.level === 'universe' ? hovered : null} />
          {!traveling && <MusicSystem view={sceneView} reduced={reduced} suppressed={suppressed} hovered={starHover} onHover={setStarHover} />}
          <LabelProjection labels={labels} elements={elements} lines={lines} container={labelsContainer} flight={flight} onUnavailable={onUnavailable} onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>
    </CanvasBoundary>
    {!ready && <div className={styles.loadingStars} role="status"><i />GATHERING THE STARS</div>}
    <div ref={labelsContainer} className={styles.labels} style={{ opacity: 0 }}><svg className={styles.labelLines} aria-hidden="true">{labels.filter(l => !l.track).map(label => <line key={label.id} data-highlighted={hovered === label.id} ref={element => { if (element) lines.current.set(label.id, element); else lines.current.delete(label.id) }} />)}</svg>{labels.map(label => <button key={label.id}
      ref={element => { if (element) elements.current.set(label.id, element); else elements.current.delete(label.id) }}
      className={!label.track ? `${styles.marker} ${label.visited ? styles.visitedMarker : ''}` : `liquidGlass ${styles.trackCardLabel}`}
      onClick={label.navigate} onPointerEnter={() => highlight(label.id)} onPointerLeave={() => highlight(null)} onFocus={() => highlight(label.id, true)} onBlur={() => highlight(null)}
      data-highlighted={hovered === label.id} title={label.name}
      style={label.color ? { color: hovered === label.id ? label.color : sceneView.level === 'universe' ? '#aeb5c2' : `color-mix(in srgb, ${label.color} 30%, #e3e9f7)` } : undefined}>
      {label.track ? <><strong>{label.name}</strong><span>{label.artist}</span><small>{label.detail}</small></> : <><span className={styles.markerName}>{label.name}</span><span className="srOnly">{label.detail}{label.visited ? ' · 발견됨' : ''}</span></>}
    </button>)}</div>
  </div>
}
