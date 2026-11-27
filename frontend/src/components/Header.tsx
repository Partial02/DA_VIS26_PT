import { useEffect, useRef, useState } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { SoundToggle } from './SoundToggle'
import { storyPages } from '../presentation/StoryPages'
import { methodSlides } from '../presentation/method/MethodSlides'
import type { Part } from '../App'
import styles from './Interface.module.css'

export function Header({ part, chapter }: { part: Part; chapter: number }) {
  const story = part === 'story'
  const { state, catalog, dispatch } = useExperience()
  const genre = state.view.level !== 'universe' ? catalog.genreById.get(state.view.genreId)! : null
  const subgenre = state.view.level === 'system' ? catalog.subgenreById.get(state.view.subgenreId)! : null
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <header className={styles.header}>
    <div className={styles.headerIdentity}>
      <a className={styles.wordmark} href="#/explore" aria-label="INNER VERSE 시스템 홈으로" onClick={() => { setOpen(false); dispatch({ type: 'navigate', destination: { level: 'universe' } }) }}>INNER<span>//</span>VERSE</a>
      {part === 'explore' && genre && <nav className={styles.breadcrumbs} data-traveling={state.transition !== state.arrivedTransition} inert={state.transition !== state.arrivedTransition} aria-label="현재 탐색 경로">
        <button onClick={() => dispatch({ type: 'navigate', destination: { level: 'genre', genreId: genre.id } })} aria-current={!subgenre ? 'location' : undefined}>{genre.name}</button><span aria-hidden="true">/</span>
        {subgenre && <><span aria-current="location">{subgenre.name}</span><span aria-hidden="true">/</span></>}
      </nav>}
    </div>
    <div className={styles.headerActions}>
      <SoundToggle /><div ref={menu} className={styles.navigationMenu}>
      <button ref={trigger} className={styles.menuButton} aria-label="목차 및 사용법" aria-expanded={open} aria-controls="partNavigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
      <nav id="partNavigation" hidden={!open} className={styles.mainNav} aria-label="발표 목차 및 파트 이동">
        <a href="#/story" onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={story && chapter === 0 ? 'page' : undefined}>Part 1 · 발표</a>
        <ol className={styles.chapterNav}>
          <li><a href="#/story" onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={story && chapter === 0 ? 'page' : undefined}><span>00</span>인트로</a></li>
          {storyPages.map((item, index) => <li key={item.title}><a href={`#/story/${index + 1}`} onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={story && chapter === index + 1 ? 'page' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{item.title}</a></li>)}
        </ol>
        <a href="#/explore" onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={part === 'explore' ? 'page' : undefined}>Part 2 · 음악 탐색</a>
        <a href="#/method" onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={part === 'method' && chapter === 0 ? 'page' : undefined}>Part 3 · 데이터와 방법</a>
        <ol className={styles.chapterNav}>
          {methodSlides.slice(1).map((item, index) => <li key={item.title}><a href={`#/method/${index + 1}`} onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={part === 'method' && chapter === index + 1 ? 'page' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{item.title}</a></li>)}
        </ol>
        <details className={styles.menuDetails}><summary>사용법</summary>
          <p>인트로는 아래로 스크롤하거나 방향키를 누르면 넘어갑니다. 발표는 아래로 스크롤하면 이어지고, 위로 스크롤하면 이전 내용으로 돌아갑니다. 햄버거 메뉴의 목차에서 파트와 페이지를 선택할 수 있습니다.</p>
          <p>전체 지도·장르·항성계에서 드래그 또는 방향키로 회전하고 우클릭 드래그·두 손가락으로 이동합니다. 휠 또는 +/−로 접근·후퇴하고 지도에 포커스를 둔 상태에서 0으로 원래 보기를 복원합니다.</p>
          <p>장르 안의 연한 별 영역을 호버하면 세부장르가 진한 색으로 강조되고, 클릭하면 같은 공간에서 줌인합니다. 오른쪽 플레이리스트·추천 패널은 세부장르 진입 시 표시됩니다. 세부장르에 도착하면 세 곡이 천천히 공전하며, 다른 곡을 선택하면 궤도에도 반영됩니다.</p>
          <p>미니맵의 장르를 눌러 이동할 수 있습니다. 오른쪽 위 방문 기록에서 장르별 누적 횟수를 확인합니다. 다시 찾을수록 별에 장르색이 남고 밝아집니다.</p>
          <p>소리 아이콘으로 직접 합성한 앰비언트를 켜거나 끕니다.</p>
        </details>
        <details className={styles.menuDetails}><summary>지도·추천 설명</summary>
          <p>{catalog.tracks.length.toLocaleString()}곡, {catalog.genres.length}개 장르, {catalog.subgenres.length}개 세부장르를 표시합니다. 장르·세부장르·악기 조합 {catalog.meta.profileCount.toLocaleString()}개로 3차원 지도를 만들고 구 안에 펼쳤습니다.</p>
          <p>장르 15%, 세부장르 30%, 악기 55%의 비중으로 태그 관계를 계산합니다. 둥근 외곽과 밀도는 화면 배치를 위한 조정이며, 별 사이 거리와 깊이는 실제 음향의 차이를 측정한 값이 아닙니다.</p>
          <p>고정된 가는 선은 가까이 배치된 곡 중 태그 구성이 비슷한 일부 쌍을 연결합니다. 짧게 움직이는 꼬리별은 장식입니다.</p>
          <p>추천은 장르×악기 비중과 악기 태그 비율을 합산한 데모입니다. 조합 편집에서 비중을 조절할 수 있습니다.</p>
          <p>입자·막대는 실제 음원을 분석하지 않는 시각화 데모입니다. 배경 앰비언트는 별도로 합성한 소리입니다.</p>
        </details>
      </nav>
    </div></div>
  </header>
}
