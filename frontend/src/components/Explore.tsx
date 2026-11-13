import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Position } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { useReducedMotion } from '../state/useReducedMotion'
import { journeyMotion } from '../state/motion'
import { AtlasDialog } from './AtlasDialog'
import { Icon } from './Icon'
import { MiniMap } from './MiniMap'
import { RecommendationJar } from './RecommendationJar'
import { TrackDock } from './TrackDock'
import styles from './Interface.module.css'

const Scene = lazy(() => import('../scene/Scene'))

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
  const [activePanel, setActivePanel] = useState<'genres' | 'recommendations' | 'map' | null>(null)
  const [recommendationWidth, setRecommendationWidth] = useState(420)
  const resizeStart = useRef<{ x: number; width: number } | null>(null)
  const [mapBounds, setMapBounds] = useState<Position[] | null>(null)
  const toolbar = useRef<HTMLElement>(null)
  const view = state.view
  const genre = view.level !== 'universe' ? catalog.genreById.get(view.genreId)! : null
  const subgenre = view.level === 'system' ? catalog.subgenreById.get(view.subgenreId)! : null
  useEffect(() => {
    if (view.level === 'system') setActivePanel(panel => panel === 'recommendations' ? null : panel)
  }, [view.level])
  const transitioning = state.transition !== state.arrivedTransition
  const [headingView, setHeadingView] = useState(view)
  const headingGenre = headingView.level !== 'universe' ? catalog.genreById.get(headingView.genreId)! : null
  const headingSubgenre = headingView.level === 'system' ? catalog.subgenreById.get(headingView.subgenreId)! : null
  useEffect(() => { if (!transitioning) setHeadingView(view) }, [transitioning, view])
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
    { id: 'recommendations', icon: 'mix', label: '추천' },
  ] as const
  const showRecommendations = Boolean(subgenre) || activePanel === 'recommendations'
  const panelLabel = activePanel === 'map' ? '미니맵' : tools.find(tool => tool.id === activePanel)?.label
  return <main className={styles.explorer} data-recommendations={showRecommendations} data-traveling={transitioning} data-system={Boolean(subgenre)}
    style={{ '--recommendation-width': `${recommendationWidth}px` } as CSSProperties}>
    {webgl ? <Suspense fallback={<div className={styles.sceneLoading}>GATHERING THE STARS<span /></div>}><Scene reduced={reduced} onUnavailable={() => setWebgl(false)} onBoundsChange={setMapBounds} onOpenMap={() => setActivePanel(activePanel === 'map' ? null : 'map')} /></Suspense>
      : <div className={styles.sceneFallback}><Icon name="star" size={32} /><h2>소리의 지도를 목록으로 만나보세요.</h2><p>이 브라우저에서 3D 지도를 표시할 수 없습니다.<br />장르 탐색과 추천은 계속 사용할 수 있어요.</p><button className="outlinedButton" onClick={() => setActivePanel('genres')}>장르 목록 열기 <Icon name="arrow" /></button></div>}
    <div className={styles.worldHeading}>
      {headingGenre && <div className={styles.worldTitleRow}>
        <button className={styles.parentButton} aria-label={headingSubgenre ? `${headingGenre.name}로 돌아가기` : '전체 지도로 돌아가기'}
          onClick={() => dispatch({ type: 'navigate', destination: headingSubgenre ? { level: 'genre', genreId: headingGenre.id } : { level: 'universe' } })}><Icon name="chevron" size={24} /></button>
        <h1 id="worldTitle" key={headingSubgenre?.id ?? headingGenre.id}>{headingSubgenre ? headingSubgenre.name : headingGenre.name}</h1>
      </div>}
    </div>
    {!subgenre && <nav ref={toolbar} className={styles.toolRail} aria-label="탐색 도구">
      {tools.map(tool => <button key={tool.id} aria-label={tool.label} title={tool.label} aria-expanded={activePanel === tool.id} aria-controls="exploreTools"
        onClick={() => setActivePanel(activePanel === tool.id ? null : tool.id)}><Icon name={tool.icon} size={20} /></button>)}
    </nav>}
    {activePanel && activePanel !== 'recommendations' && (!subgenre || activePanel === 'map') && <section id="exploreTools" className={`${styles.utilityPanel} ${activePanel === 'map' ? styles.mapPanel : ''}`} aria-label={panelLabel}
      onKeyDown={event => { if (event.key === 'Escape' && !(event.target as Element).closest('dialog')) { event.stopPropagation(); closePanel() } }}>
      <div className={styles.utilityPanelHeader}><span>{panelLabel}</span><button onClick={closePanel} aria-label="패널 닫기"><Icon name="close" size={18} /></button></div>
      <div className={styles.utilityPanelBody}>
        {activePanel === 'genres' && <AtlasDialog open onClose={closePanel} />}
        {activePanel === 'map' && <MiniMap bounds={webgl ? mapBounds : null} />}
      </div>
    </section>}
    {showRecommendations && <div id={activePanel === 'recommendations' ? 'exploreTools' : undefined} className={subgenre ? styles.systemSidebar : styles.recommendationPopover}
      role={subgenre ? 'complementary' : undefined} aria-label={subgenre ? '세부장르 플레이리스트와 추천' : undefined} inert={Boolean(subgenre) && transitioning}
      onKeyDown={event => { if (!subgenre && event.key === 'Escape' && !(event.target as Element).closest('dialog')) { event.stopPropagation(); closePanel() } }}>
      <div className={styles.recommendationResize} role="separator" aria-orientation="vertical" aria-label={subgenre ? '오른쪽 패널 너비 조절' : '추천 패널 너비 조절'} tabIndex={0}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          const bounds = event.currentTarget.closest('main')!.getBoundingClientRect()
          setRecommendationWidth(width => Math.max(300, Math.min(bounds.width - 32, width + (event.key === 'ArrowLeft' ? 24 : -24))))
        }}
        onPointerDown={event => {
          resizeStart.current = { x: event.clientX, width: recommendationWidth }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          if (!resizeStart.current) return
          const bounds = event.currentTarget.closest('main')!.getBoundingClientRect()
          setRecommendationWidth(Math.max(300, Math.min(bounds.width - 32, resizeStart.current.width + resizeStart.current.x - event.clientX)))
        }}
        onPointerUp={() => { resizeStart.current = null }}
        onPointerCancel={() => { resizeStart.current = null }} />
      {subgenre && <TrackDock />}
      <RecommendationJar onClose={subgenre ? undefined : closePanel} />
    </div>}
    <div className="srOnly" role="status" aria-live="polite">{!transitioning && (subgenre ? `${genre!.name}, ${subgenre.name} 항성계. 방문 ${state.visits[subgenre.id] ?? 0}회.` : genre ? `${genre.name}. 세부장르 ${genre.subgenreIds.length}개.` : '전체 음악 지도. 15개 장르, 4961곡.')}</div>
  </main>
}
