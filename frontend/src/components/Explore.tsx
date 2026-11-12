import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { adjacentSubgenre } from '../domain/catalog'
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
  const [mobilePanel, setMobilePanel] = useState('none')
  const listButton = useRef<HTMLButtonElement>(null)
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
    {webgl ? <Suspense fallback={<div className={styles.sceneLoading}>GATHERING THE STARS<span /></div>}><Scene reduced={reduced} onUnavailable={() => setWebgl(false)} /></Suspense>
      : <div className={styles.sceneFallback}><Icon name="star" size={32} /><h2>소리의 지도를 목록으로 만나보세요.</h2><p>이 브라우저에서 3D 지도를 표시할 수 없습니다.<br />장르 탐색과 추천은 계속 사용할 수 있어요.</p><button className="outlinedButton" onClick={() => setListOpen(true)}>장르 목록 열기 <Icon name="arrow" /></button></div>}
    <nav className={styles.breadcrumbs} aria-label="현재 탐색 경로">
      <button onClick={() => dispatch({ type: 'navigate', destination: { level: 'universe' } })} aria-current={view.level === 'universe' ? 'location' : undefined}>UNIVERSE</button>
      {genre && <><span>/</span><button onClick={() => dispatch({ type: 'navigate', destination: { level: 'genre', genreId: genre.id } })} aria-current={view.level === 'genre' ? 'location' : undefined}>{genre.name}</button></>}
      {subgenre && <><span>/</span><span aria-current="location">{subgenre.name}</span></>}
    </nav>
    <section className={styles.worldHeading} aria-labelledby="worldTitle">
      <p className="eyebrow"><i />{view.level === 'universe' ? 'A UNIVERSE OF POSSIBILITIES' : view.level === 'genre' ? 'INSIDE THE CONSTELLATION' : 'YOU HAVE ARRIVED'}</p>
      <h1 id="worldTitle" key={subgenre?.id ?? genre?.id ?? 'universe'}>{subgenre ? subgenre.name : genre ? genre.name : <><span className={styles.heroLine}>A constellation</span>of <em>sound.</em></>}</h1>
      <p className={styles.worldCopy}>{view.level === 'universe' ? <>아직 만나지 못한 소리들이<br />당신의 다음 세계가 됩니다.</> : subgenre ? <>서로 다른 노래가 공전하는 작은 세계.<br />다음 항성으로, 취향의 경계 너머로.</> : <>하나의 장르, 그 안의 수많은 결.<br />별을 골라 더 깊이 들어가 보세요.</>}</p>
      <div className={styles.worldStats}><strong>{(subgenre?.trackIds.length ?? genre?.trackIds.length ?? catalog.tracks.length).toLocaleString()}</strong><span>TRACKS</span><i /><strong>{subgenre ? state.visits[subgenre.id] ?? 0 : genre ? genre.subgenreIds.length : catalog.genres.length}</strong><span>{subgenre ? 'VISITS' : genre ? 'SUBGENRES' : 'CONSTELLATIONS'}</span></div>
      <button ref={listButton} className={styles.listButton} onClick={() => setListOpen(true)}><Icon name="list" size={15} />{view.level === 'universe' ? '모든 장르 살펴보기' : '세부장르 목록'}<Icon name="arrow" size={14} /></button>
    </section>
    <TrackDock />
    <RecommendationJar />
    <MiniMap />
    <div className={styles.centerFooter}>
      {subgenre ? <div className={styles.systemNav}>
        <div><button onClick={() => step(-1)} aria-label="이전 세부장르"><Icon name="back" /></button><span><strong>{subgenre.name}</strong><small>{transitioning ? 'TRAVELING TO THE NEXT WORLD' : 'DRAG TO DISCOVER · ← →'}</small></span><button onClick={() => step(1)} aria-label="다음 세부장르"><Icon name="arrow" /></button></div>
      </div> : <><span className={styles.mapHint}><i />{transitioning ? 'FOLLOWING THE SIGNAL' : 'SELECT A STAR. FIND A NEW WORLD.'}</span><p>장르 태그 기반 t-SNE <span>·</span> {view.level === 'universe' ? '전체 음악 지도' : genre?.name}</p></>}
    </div>
    <div className={styles.mobileTools}><button onClick={() => setMobilePanel(mobilePanel === 'tracks' ? 'none' : 'tracks')} aria-expanded={mobilePanel === 'tracks'}>THREE SIGNALS</button><button onClick={() => setMobilePanel(mobilePanel === 'mix' ? 'none' : 'mix')} aria-expanded={mobilePanel === 'mix'}><Icon name="mix" size={14} /> NEXT WORLD</button></div>
    <footer className={styles.pageFooter}><span>AN ATLAS OF SOUND & CURIOSITY</span><details className={styles.methodDetails}><summary>ABOUT THE MAP ↗</summary><div><h2>이 지도에 담긴 것</h2><p>장르·세부장르 태그 조합 339개에 t-SNE를 적용하고, 같은 태그를 가진 곡을 대표 좌표 주변에 펼쳐 4,961곡을 표시했습니다.</p><p>악기는 추천 패널에서만 사용합니다. 별 사이 거리는 음향적 유사성을 뜻하지 않습니다. 입자와 막대는 실제 음악을 재생하지 않는 시각화 데모입니다.</p><span>MTG-Jamendo CSV · 15 GENRES · 146 SUBGENRES</span></div></details></footer>
    <AtlasDialog open={listOpen} onClose={closeList} />
    <div className="srOnly" role="status" aria-live="polite">{!transitioning && (subgenre ? `${genre!.name}, ${subgenre.name} 항성계. 방문 ${state.visits[subgenre.id] ?? 0}회.` : genre ? `${genre.name}. 세부장르 ${genre.subgenreIds.length}개.` : '전체 음악 지도. 15개 장르, 4961곡.')}</div>
  </main>
}
