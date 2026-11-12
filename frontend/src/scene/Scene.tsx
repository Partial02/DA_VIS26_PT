import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera, Vector3 } from 'three'
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

function CameraRig({ reduced, controls }: { reduced: boolean; controls: RefObject<NavigationControls | null> }) {
  const { catalog, state, dispatch } = useExperience()
  const { camera, size, raycaster, gl } = useThree()
  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return
    const isSystem = state.view.level === 'system'
    const members = state.view.level === 'universe' ? catalog.tracks :
      catalog.genreById.get(state.view.genreId)!.trackIds.map(id => catalog.trackById.get(id)!)
    const xs = members.map(t => t.position[0]), ys = members.map(t => t.position[1])
    const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys)
    const center = state.view.level === 'system' ? catalog.subgenreById.get(state.view.subgenreId)!.position : [(xMin + xMax) / 2, (yMin + yMax) / 2]
    const width = isSystem ? 8.7 : state.view.level === 'genre' ? Math.max(xMax - xMin + .7, 1.8) : xMax - xMin + 3
    const height = isSystem ? 7 : state.view.level === 'genre' ? Math.max(yMax - yMin + .8, 1.8) : yMax - yMin + 5
    const target = { x: camera.position.x, y: camera.position.y, zoom: camera.zoom }
    const zoom = Math.min(size.width / width, size.height / height)
    raycaster.params.Points = { threshold: Math.max(.06, 5 / zoom) }
    let travelFinished = false
    const tween = gsap.to(target, {
      x: center[0], y: center[1], zoom, duration: reduced ? .15 : .65, ease: 'power3.inOut',
      onUpdate: () => { camera.position.x = target.x; camera.position.y = target.y; camera.zoom = target.zoom; camera.updateProjectionMatrix() },
      onComplete: () => { travelFinished = true; dispatch({ type: 'arrive', transition: state.transition }) },
    })
    const canvas = gl.domElement
    let pointer: { id: number; x: number; y: number } | null = null
    function finishTravel() { if (!travelFinished) tween.progress(1); tween.kill() }
    function update() {
      const span = Math.max(xMax - xMin, yMax - yMin, 4)
      camera.position.x = Math.max(xMin - span, Math.min(xMax + span, camera.position.x))
      camera.position.y = Math.max(yMin - span, Math.min(yMax + span, camera.position.y))
      camera.updateProjectionMatrix()
      raycaster.params.Points = { threshold: 5 / camera.zoom }
    }
    function changeZoom(factor: number, x = 0, y = 0) {
      finishTravel()
      const oldZoom = camera.zoom
      camera.zoom = Math.max(zoom * .4, Math.min(zoom * 8, oldZoom * factor))
      camera.position.x += x / oldZoom - x / camera.zoom
      camera.position.y += y / oldZoom - y / camera.zoom
      update()
    }
    function pan(x: number, y: number) {
      finishTravel()
      camera.position.x -= x / camera.zoom
      camera.position.y += y / camera.zoom
      update()
    }
    function down(event: PointerEvent) {
      if (isSystem || event.button !== 0 || !event.isPrimary) return
      finishTravel()
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    function move(event: PointerEvent) {
      if (!pointer || pointer.id !== event.pointerId) return
      pan(event.clientX - pointer.x, event.clientY - pointer.y)
      pointer.x = event.clientX; pointer.y = event.clientY
    }
    function up(event: PointerEvent) {
      if (pointer?.id !== event.pointerId) return
      pointer = null
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      canvas.style.cursor = ''
    }
    function wheel(event: WheelEvent) {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      changeZoom(Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * .003),
        event.clientX - rect.left - rect.width / 2, rect.height / 2 - (event.clientY - rect.top))
    }
    controls.current = { zoom: changeZoom, pan, reset: () => {
      finishTravel(); camera.position.x = center[0]; camera.position.y = center[1]; camera.zoom = zoom; update()
    } }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      tween.kill(); controls.current = null
      if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id)
      canvas.style.cursor = ''
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [camera, catalog, controls, dispatch, gl, raycaster, reduced, size, state.transition, state.view])
  return null
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
    return <group key={item.id} position={[...item.position, 1]}>
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

export default function Scene({ reduced, onUnavailable }: { reduced: boolean; onUnavailable: () => void }) {
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
        position: [...sub.position, 1], orbit: index, visited: false,
        selected: (state.selectedTrackId ?? tracks[0].id) === track.id,
        navigate: () => dispatch({ type: 'selectTrack', id: track.id }) }))
    }
    const items = state.view.level === 'universe' ? catalog.genres : catalog.genreById.get(state.view.genreId)!.subgenreIds.map(id => catalog.subgenreById.get(id)!)
    return [...items].sort((a, b) => b.trackIds.length - a.trackIds.length)
      .filter((item, index) => state.view.level === 'universe' || index < 7 || item.id === hovered)
      .map(item => ({ id: item.id, name: item.name, detail: `${item.trackIds.length.toLocaleString()} TRACKS`,
        position: [...item.position, 1], visited: 'color' in item ? item.subgenreIds.some(id => state.visits[id]) : Boolean(state.visits[item.id]),
        navigate: () => { if (!suppressed()) dispatch({ type: 'navigate', destination: 'color' in item ? { level: 'genre', genreId: item.id } : { level: 'system', genreId: item.genreId, subgenreId: item.id } }) },
      }))
  }, [catalog, dispatch, hovered, state.selectedTrackId, state.view, state.visits])
  function step(direction: number) {
    if (state.view.level !== 'system') return
    const sub = adjacentSubgenre(catalog, state.view.subgenreId, direction)
    dispatch({ type: 'navigate', destination: { level: 'system', genreId: sub.genreId, subgenreId: sub.id } })
  }
  return <div className={styles.viewport} tabIndex={0} role="region" aria-label="장르 우주 지도. 드래그로 이동, 휠로 확대 축소. 항성계에서 좌우 방향키로 세부장르를 전환합니다."
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
      <Canvas orthographic camera={{ position: [0, 0, 40], zoom: 20, near: .1, far: 100 }} dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        fallback={<span className="srOnly">3D 지도 대신 장르 목록에서 탐색해 주세요.</span>}>
        <Suspense fallback={null}>
          <CameraRig reduced={reduced} controls={controls} />
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
      onClick={label.navigate} title={label.name}>
      {label.orbit !== undefined ? <><span>{label.detail}</span> {label.name}</> : <><span className={styles.markerName}>{label.name}</span><span>{label.detail}{label.visited ? ' · 발견됨' : ''}</span></>}
    </button>)}</div>
    <div className={styles.mapControls} aria-label="지도 배율 조절">
      <button onClick={() => controls.current?.zoom(1.3)} aria-label="지도 확대" title="확대 (+)">+</button>
      <button onClick={() => controls.current?.zoom(1 / 1.3)} aria-label="지도 축소" title="축소 (-)">−</button>
      <button onClick={() => controls.current?.reset()} aria-label="지도 보기 초기화" title="원래 보기 (0)">⌖</button>
      <span>{state.view.level === 'system' ? 'SCROLL TO ZOOM' : 'DRAG TO PAN · SCROLL TO ZOOM'}</span>
    </div>
  </div>
}
