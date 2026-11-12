import { useEffect, useRef, useState } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { SoundToggle } from './SoundToggle'
import { chapters } from '../presentation/Presentation'
import styles from './Interface.module.css'

export function Header({ story, chapter }: { story: boolean; chapter: number }) {
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
      {!story && genre && <nav className={styles.breadcrumbs} aria-label="현재 탐색 경로">
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
          <li><a href="#/story" onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={story && chapter === 0 ? 'page' : undefined}><span>00</span>표지</a></li>
          {chapters.map((item, index) => <li key={item.title}><a href={`#/story/${index + 1}`} onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={story && chapter === index + 1 ? 'page' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{item.title}</a></li>)}
        </ol>
        <a href="#/explore" onClick={() => { setOpen(false); trigger.current?.focus() }} aria-current={!story ? 'page' : undefined}>Part 2 · 음악 탐색</a>
        <details className={styles.menuDetails}><summary>사용법</summary>
          <p>발표는 화면 클릭·스크롤·방향키로 넘기고, 이전 화면은 위·왼쪽 방향키로 돌아갑니다. 햄버거 메뉴의 목차에서 파트와 슬라이드를 선택할 수 있습니다.</p>
          <p>전체 지도·장르: 드래그로 회전하고 우클릭 드래그·두 손가락으로 이동합니다. 휠 또는 +/−로 접근·후퇴하고 ⌖ 버튼으로 원래 보기를 복원합니다.</p>
          <p>항성계: 좌우 드래그·방향키·화살표 버튼으로 다음 세부장르로 이동합니다. 곡을 선택하면 입자 패턴이 바뀝니다.</p>
          <p>미니맵의 장르를 눌러 이동할 수 있습니다. 방문할수록 별이 밝아집니다.</p>
          <p>소리 아이콘으로 직접 합성한 앰비언트를 켜거나 끕니다.</p>
        </details>
        <details className={styles.menuDetails}><summary>지도·추천 설명</summary>
          <p>{catalog.tracks.length.toLocaleString()}곡, {catalog.genres.length}개 장르, {catalog.subgenres.length}개 세부장르를 표시합니다. 장르 태그 조합 {catalog.meta.profileCount}개의 t-SNE 좌표 주변에 같은 태그를 가진 곡들을 펼쳤습니다.</p>
          <p>별 사이 거리는 음향적 유사성을 뜻하지 않습니다. 깊이는 공간 탐색을 위한 연출이며, 악기는 추천 패널에서만 사용합니다.</p>
          <p>추천은 장르×악기 비중과 악기 태그 비율을 합산한 데모입니다. 조합 편집에서 비중을 조절할 수 있습니다.</p>
          <p>입자·막대는 실제 음원을 분석하지 않는 시각화 데모입니다. 배경 앰비언트는 별도로 합성한 소리입니다.</p>
        </details>
      </nav>
    </div></div>
  </header>
}
