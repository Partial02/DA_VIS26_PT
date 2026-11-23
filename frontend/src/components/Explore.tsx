import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Position } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { useReducedMotion } from '../state/useReducedMotion'
import { journeyMotion } from '../state/motion'
import { AtlasDialog } from './AtlasDialog'
import { Icon } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import { MiniMapDock } from './MiniMap'
import { RecommendationJar } from './RecommendationJar'
import { StageConsole } from './StageConsole'
import { TrackDock } from './TrackDock'
import { VisitPanel } from './VisitPanel'
import styles from './Interface.module.css'

const Scene = lazy(() => import('../scene/Scene'))
type MapZoom = import('../scene/Scene').MapZoom

function hasWebGL() {
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}

export function Explore() {
  const { catalog, state, dispatch } = useExperience()
  const reduced = useReducedMotion()
  const [webgl, setWebgl] = useState(hasWebGL)
  const [activePanel, setActivePanel] = useState<'genres' | 'visits' | null>(null)
  // The recommendation dock sits on the right and starts open.
  const [dockOpen, setDockOpen] = useState(true)
  const [mapOpen, setMapOpen] = useState(true)
  const [dockWidth, setDockWidth] = useState(440)
  const resizeStart = useRef<{ x: number; width: number } | null>(null)
  const [mapBounds, setMapBounds] = useState<Position[] | null>(null)
  const toolbar = useRef<HTMLElement>(null)
  const zoom = useRef<MapZoom | null>(null)
  const view = state.view
  const genre = view.level !== 'universe' ? catalog.genreById.get(view.genreId)! : null
  const subgenre = view.level === 'system' ? catalog.subgenreById.get(view.subgenreId)! : null
  const transitioning = state.transition !== state.arrivedTransition
  const [headingView, setHeadingView] = useState(view)
  const headingGenre = headingView.level !== 'universe' ? catalog.genreById.get(headingView.genreId)! : null
  const headingSubgenre = headingView.level === 'system' ? catalog.subgenreById.get(headingView.subgenreId)! : null
  useEffect(() => { if (!transitioning) setHeadingView(view) }, [transitioning, view])
  // Entering a subgenre always shows its playlist.
  useEffect(() => { if (view.level === 'system') setDockOpen(true) }, [view.level])
  useEffect(() => {
    if (webgl) return
    const timeout = setTimeout(() => dispatch({ type: 'arrive', transition: state.transition }), reduced ? 200 : (journeyMotion.duration + journeyMotion.reveal) * 1000)
    return () => clearTimeout(timeout)
  }, [dispatch, reduced, state.transition, webgl])
  function closePanel() {
    toolbar.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus()
    setActivePanel(null)
  }
  const tools = [
    { id: 'genres', icon: 'list', label: '장르' },
    { id: 'visits', icon: 'history', label: '방문 기록' },
  ] as const
  const panelLabel = tools.find(tool => tool.id === activePanel)?.label
  const clampWidth = (width: number, main: Element) => Math.max(380, Math.min(main.getBoundingClientRect().width * .6, width))
  return <main className={styles.explorer} data-traveling={transitioning} data-system={Boolean(subgenre)} data-dock={dockOpen} data-map={mapOpen}
    style={{ '--dock-width': `${dockWidth}px` } as CSSProperties}>
    {webgl ? <Suspense fallback={<div className={styles.sceneLoading}>GATHERING THE STARS<span /></div>}><Scene reduced={reduced} onUnavailable={() => setWebgl(false)} onBoundsChange={setMapBounds} zoomRef={zoom} /></Suspense>
      : <div className={styles.sceneFallback}><Icon name="star" size={32} /><h2>소리의 지도를 목록으로 만나보세요.</h2><p>이 브라우저에서 3D 지도를 표시할 수 없습니다.<br />장르 탐색과 추천은 계속 사용할 수 있어요.</p><button className="outlinedButton" onClick={() => setActivePanel('genres')}>장르 목록 열기 <Icon name="arrow" /></button></div>}
    <div className={styles.worldHeading}>
      {headingGenre && <div className={styles.worldTitleRow}>
        <button className={styles.parentButton} aria-label={headingSubgenre ? `${headingGenre.name}로 돌아가기` : '전체 지도로 돌아가기'}
          onClick={() => dispatch({ type: 'navigate', destination: headingSubgenre ? { level: 'genre', genreId: headingGenre.id } : { level: 'universe' } })}><Icon name="chevron" size={24} /></button>
        <h1 id="worldTitle" key={headingSubgenre?.id ?? headingGenre.id} style={{ color: headingGenre.color }}>{headingSubgenre ? headingSubgenre.name : headingGenre.name}</h1>
      </div>}
    </div>
    <LiquidGlass as="nav" elementRef={toolbar} className={styles.toolRail} aria-label="탐색 도구">
      {tools.map(tool => <button key={tool.id} aria-label={tool.label} title={tool.label} aria-expanded={activePanel === tool.id} aria-controls="exploreTools"
        onClick={() => setActivePanel(activePanel === tool.id ? null : tool.id)}><Icon name={tool.icon} size={20} /></button>)}
      <button aria-label="추천 패널" title="추천 패널" aria-pressed={dockOpen} aria-controls="recommendationDock" onClick={() => setDockOpen(!dockOpen)}><Icon name="mix" size={20} /></button>
      <button aria-label="전체 지도" title="전체 지도" aria-pressed={mapOpen} aria-controls="miniMapDock" onClick={() => setMapOpen(!mapOpen)}><Icon name="map" size={20} /></button>
    </LiquidGlass>
    {activePanel && <LiquidGlass as="section" id="exploreTools" className={styles.utilityPanel} aria-label={panelLabel}
      onKeyDown={event => { if (event.key === 'Escape' && !(event.target as Element).closest('dialog')) { event.stopPropagation(); closePanel() } }}>
      <div className={styles.utilityPanelHeader}><span>{panelLabel}</span><button onClick={closePanel} aria-label="패널 닫기"><Icon name="close" size={18} /></button></div>
      <div className={styles.utilityPanelBody}>
        {activePanel === 'genres' && <AtlasDialog open onClose={closePanel} />}
        {activePanel === 'visits' && <VisitPanel />}
      </div>
    </LiquidGlass>}
    {dockOpen && <LiquidGlass as="aside" id="recommendationDock" className={styles.rightDock} strength={.6}
      aria-label={subgenre ? '세부장르 플레이리스트와 추천' : '범주 선택과 세부장르 추천'} inert={Boolean(subgenre) && transitioning}
      onKeyDown={event => { if (!subgenre && event.key === 'Escape' && !(event.target as Element).closest('dialog')) { event.stopPropagation(); setDockOpen(false) } }}>
      <div className={styles.recommendationResize} role="separator" aria-orientation="vertical" aria-label="추천 패널 너비 조절" tabIndex={0}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          const main = event.currentTarget.closest('main')!
          setDockWidth(width => clampWidth(width + (event.key === 'ArrowLeft' ? 24 : -24), main))
        }}
        onPointerDown={event => { resizeStart.current = { x: event.clientX, width: dockWidth }; event.currentTarget.setPointerCapture(event.pointerId) }}
        onPointerMove={event => {
          if (!resizeStart.current) return
          setDockWidth(clampWidth(resizeStart.current.width + resizeStart.current.x - event.clientX, event.currentTarget.closest('main')!))
        }}
        onPointerUp={() => { resizeStart.current = null }}
        onPointerCancel={() => { resizeStart.current = null }} />
      <div className={styles.rightDockHeader}><span>{subgenre ? 'PLAYLIST' : 'RECOMMEND'}</span>
        <button onClick={() => setDockOpen(false)} aria-label="추천 패널 접기"><Icon name="close" size={16} /></button></div>
      <div className={styles.rightDockBody}>
        {subgenre ? <><TrackDock /><RecommendationJar /></> : <StageConsole />}
      </div>
    </LiquidGlass>}
    {webgl && <LiquidGlass className={styles.zoomPill} role="group" aria-label="지도 배율 조절">
      <button aria-label="지도 확대" title="확대 (+)" disabled={transitioning} onClick={() => zoom.current?.zoomIn()}><Icon name="plus" size={16} /></button>
      <button aria-label="지도 축소" title="축소 (-)" disabled={transitioning} onClick={() => zoom.current?.zoomOut()}><Icon name="minus" size={16} /></button>
    </LiquidGlass>}
    {mapOpen && <MiniMapDock bounds={webgl ? mapBounds : null} onClose={() => {
      toolbar.current?.querySelector<HTMLButtonElement>('[aria-controls="miniMapDock"]')?.focus()
      setMapOpen(false)
    }} />}
    <div className="srOnly" role="status" aria-live="polite">{!transitioning && (subgenre ? `${genre!.name}, ${subgenre.name}. ${subgenre.trackIds.length}곡. 방문 ${state.visits[subgenre.id] ?? 0}회.` : genre ? `${genre.name}. 방문 ${state.genreVisits[genre.id] ?? 0}회. 세부장르 ${genre.subgenreIds.length}개.` : '전체 음악 지도. 15개 장르, 4961곡.')}</div>
  </main>
}
