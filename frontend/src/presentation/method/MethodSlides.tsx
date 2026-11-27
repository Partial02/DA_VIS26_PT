import { useEffect, useRef } from 'react'
import type { ComponentType } from 'react'
import { AlgorithmFormula, AlgorithmPlaylist, AlgorithmTable, DatasetOverview, DatasetSessions, MethodCover, SystemArchitecture, SystemLimits, SystemPipeline } from './slides'
import styles from './Method.module.css'

/**
 * Part 3 발표: 추천 알고리즘·데이터셋·시스템 방법.
 * 각 슬라이드는 `#/method/<번호>`로 접근하며, 내용은 docs/logic.md와 실제 카탈로그·범주 모델을 그대로 읽습니다.
 */
export const methodSections = [
  { key: 'dataset', title: '사용한 데이터셋' },
  { key: 'algorithm', title: '추천 알고리즘' },
  { key: 'system', title: '시스템 방법' },
] as const

export const methodSlides: { title: string; section?: (typeof methodSections)[number]['key']; component: ComponentType }[] = [
  { title: 'Part 3 표지', component: MethodCover },
  { title: 'MTG-Jamendo 4,961곡', section: 'dataset', component: DatasetOverview },
  { title: '악기 125개 → 세션 16개', section: 'dataset', component: DatasetSessions },
  { title: '장르 × 세션 선택표', section: 'algorithm', component: AlgorithmTable },
  { title: '세부장르 점수 식', section: 'algorithm', component: AlgorithmFormula },
  { title: '세부장르 안의 곡 순서', section: 'algorithm', component: AlgorithmPlaylist },
  { title: '태그로 만든 3차원 지도', section: 'system', component: SystemPipeline },
  { title: '시스템 구성', section: 'system', component: SystemArchitecture },
  { title: '해석의 범위', section: 'system', component: SystemLimits },
]

const interactive = 'button, a, input, select, textarea, summary, dialog, [role="button"], [role="slider"], [contenteditable="true"], [data-no-advance]'

/** 클릭·아래 스크롤·방향키로 넘기는 Part 3 슬라이드. 첫 슬라이드에서 뒤로 가면 Part 2로 돌아갑니다. */
export function MethodSlides({ slide }: { slide: number }) {
  const stage = useRef<HTMLElement>(null)
  const lastNavigation = useRef(-Infinity)
  const touch = useRef<[number, number] | null>(null)
  const current = Math.min(Math.max(0, slide), methodSlides.length - 1)
  function move(direction: number) {
    if (stage.current?.closest('[inert]')) return
    if (performance.now() - lastNavigation.current < 650) return
    const next = current + direction
    if (next >= methodSlides.length) return
    lastNavigation.current = performance.now()
    location.hash = next < 0 ? '#/explore' : next === 0 ? '#/method' : `#/method/${next}`
  }
  useEffect(() => {
    stage.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as Element
      if (target.closest(interactive) || target.closest('header')) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) { event.preventDefault(); move(1) }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); move(-1) }
    }
    let previousWheel = 0, wheelAmount = 0, usedWheel = false
    const wheel = (event: WheelEvent) => {
      if ((event.target as Element).closest(interactive)) return
      event.preventDefault()
      const now = performance.now()
      if (now - previousWheel > 180) { wheelAmount = 0; usedWheel = false }
      previousWheel = now
      if (usedWheel) return
      wheelAmount += event.deltaY * (event.deltaMode === 1 ? 16 : 1)
      if (Math.abs(wheelAmount) > 45) { usedWheel = true; move(wheelAmount > 0 ? 1 : -1) }
    }
    const element = stage.current!
    window.addEventListener('keydown', keydown)
    element.addEventListener('wheel', wheel, { passive: false })
    return () => { window.removeEventListener('keydown', keydown); element.removeEventListener('wheel', wheel) }
  }, [current])
  const Slide = methodSlides[current].component
  const section = methodSections.findIndex(item => item.key === methodSlides[current].section)
  return <main ref={stage} tabIndex={0} className={styles.stage} aria-label="Part 3 발표. 클릭 또는 방향키로 이동합니다."
    onClick={event => { if (!(event.target as Element).closest(interactive) && !window.getSelection()?.toString()) move(1) }}
    onPointerDown={event => { if (event.pointerType === 'touch' && !(event.target as Element).closest(interactive)) touch.current = [event.clientX, event.clientY] }}
    onPointerCancel={() => { touch.current = null }}
    onPointerUp={event => {
      if (!touch.current) return
      const dx = event.clientX - touch.current[0], dy = event.clientY - touch.current[1]
      touch.current = null
      const distance = Math.abs(dy) > Math.abs(dx) ? dy : dx
      if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1)
    }}>
    {section >= 0 && <p className={styles.sectionMark}><span>{String(section + 1).padStart(2, '0')}</span>{methodSections[section].title}</p>}
    <div key={current} className={styles.slide}><Slide /></div>
    <p className={styles.progress} aria-hidden="true">{String(current + 1).padStart(2, '0')} / {String(methodSlides.length).padStart(2, '0')}</p>
    <span className="srOnly" role="status" aria-live="polite">{methodSlides[current].title}</span>
  </main>
}
