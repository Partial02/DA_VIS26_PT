import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { adjacentSubgenre } from '../domain/catalog'
import type { Position } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { useReducedMotion } from '../state/useReducedMotion'
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
  const [listOpen, setListOpen] = useState(false)
  const [mapBounds, setMapBounds] = useState<Position[] | null>(null)
  const [mobilePanel, setMobilePanel] = useState('none')
  const listButton = useRef<HTMLElement>(null)
  const view = state.view
  const genre = view.level !== 'universe' ? catalog.genreById.get(view.genreId)! : null
  const subgenre = view.level === 'system' ? catalog.subgenreById.get(view.subgenreId)! : null
  const transitioning = state.transition !== state.arrivedTransition
  useEffect(() => {
    if (webgl) return
    const timeout = setTimeout(() => dispatch({ type: 'arrive', transition: state.transition }), reduced ? 150 : 650)
    return () => clearTimeout(timeout)
  }, [dispatch, reduced, state.transition, webgl])
  function step(direction: number) {
    if (!subgenre) return
    const next = adjacentSubgenre(catalog, subgenre.id, direction)
    dispatch({ type: 'navigate', destination: { level: 'system', genreId: next.genreId, subgenreId: next.id } })
  }
  function closeList() { setListOpen(false); listButton.current?.focus() }
  return <main className={styles.explorer} data-panel={mobilePanel}>
    {webgl ? <Suspense fallback={<div className={styles.sceneLoading}>GATHERING THE STARS<span /></div>}><Scene reduced={reduced} onUnavailable={() => setWebgl(false)} onBoundsChange={setMapBounds} /></Suspense>
      : <div className={styles.sceneFallback}><Icon name="star" size={32} /><h2>소리의 지도를 목록으로 만나보세요.</h2><p>이 브라우저에서 3D 지도를 표시할 수 없습니다.<br />장르 탐색과 추천은 계속 사용할 수 있어요.</p><button className="outlinedButton" onClick={() => setListOpen(true)}>장르 목록 열기 <Icon name="arrow" /></button></div>}
    <div className={styles.worldHeading}>
      {genre && <div className={styles.worldTitleRow}>
        <button className={styles.parentButton} aria-label={subgenre ? `${genre.name}로 돌아가기` : '전체 지도로 돌아가기'}
          onClick={() => dispatch({ type: 'navigate', destination: subgenre ? { level: 'genre', genreId: genre.id } : { level: 'universe' } })}><Icon name="chevron" size={24} /></button>
        <h1 id="worldTitle" key={subgenre?.id ?? genre.id}>{subgenre ? subgenre.name : genre.name}</h1>
      </div>}
      <details className={styles.atlasDisclosure} open={listOpen}>
        <summary ref={listButton} aria-controls="atlasPanel" aria-expanded={listOpen} onClick={event => { event.preventDefault(); setListOpen(!listOpen) }}>
          <Icon name="list" size={16} /><span>장르</span><Icon name="chevron" size={14} />
        </summary>
        <AtlasDialog open={listOpen} onClose={closeList} />
      </details>
    </div>
    <TrackDock />
    <RecommendationJar />
    <MiniMap bounds={webgl ? mapBounds : null} />
    {subgenre && <div className={styles.centerFooter}><div className={styles.systemNav}>
      <div><button onClick={() => step(-1)} aria-label="이전 세부장르"><Icon name="back" /></button><span><strong>{subgenre.name}</strong></span><button onClick={() => step(1)} aria-label="다음 세부장르"><Icon name="arrow" /></button></div>
    </div></div>}
    <div className={styles.mobileTools}><button onClick={() => setMobilePanel(mobilePanel === 'tracks' ? 'none' : 'tracks')} aria-expanded={mobilePanel === 'tracks'}>노래</button><button onClick={() => setMobilePanel(mobilePanel === 'mix' ? 'none' : 'mix')} aria-expanded={mobilePanel === 'mix'}><Icon name="mix" size={14} /> 추천</button></div>
    <div className="srOnly" role="status" aria-live="polite">{!transitioning && (subgenre ? `${genre!.name}, ${subgenre.name} 항성계. 방문 ${state.visits[subgenre.id] ?? 0}회.` : genre ? `${genre.name}. 세부장르 ${genre.subgenreIds.length}개.` : '전체 음악 지도. 15개 장르, 4961곡.')}</div>
  </main>
}
