import Consumption from './chapters/Consumption'
import Diversity from './chapters/Diversity'
import Exploration from './chapters/Exploration'
import Entrenchment from './chapters/Entrenchment'
import Comparison from './chapters/Comparison'
import NeedForExploration from './chapters/NeedForExploration'
import { useEffect, useRef } from 'react'
import { Cover } from './Cover'
import styles from './Presentation.module.css'

export const chapters = [
  { title: '소비량–소비자 수', component: Consumption },
  { title: '패턴–장르 다양화', component: Diversity },
  { title: '탐색 vs 유지', component: Exploration },
  { title: '고착화 논문', component: Entrenchment },
  { title: '추천 시스템 비교', component: Comparison },
  { title: '탐색의 필요성', component: NeedForExploration },
]

const interactive = 'button, a, input, select, textarea, summary, dialog, [role="button"], [role="slider"], [contenteditable="true"], [data-no-advance]'

export function Presentation({ chapter }: { chapter: number }) {
  const stage = useRef<HTMLElement>(null)
  const lastNavigation = useRef(-Infinity)
  const touch = useRef<[number, number] | null>(null)
  function move(direction: number) {
    if (stage.current?.closest('[inert]')) return
    if (performance.now() - lastNavigation.current < 650) return
    const next = Math.max(0, chapter + direction)
    if (next === chapter) return
    lastNavigation.current = performance.now()
    location.hash = next > chapters.length ? '#/explore' : next === 0 ? '#/story' : `#/story/${next}`
  }
  useEffect(() => {
    stage.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as Element).closest(interactive) || (event.target as Element).closest('header')) return
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
  }, [chapter])
  const Chapter = chapter > 0 ? chapters[chapter - 1].component : null
  return <main ref={stage} tabIndex={0} className={styles.presentation} aria-label="발표. 클릭 또는 방향키로 이동합니다."
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
    <div key={chapter} className={styles.slide}>{Chapter ? <Chapter /> : <Cover onContinue={() => move(1)} />}</div>
    <span className="srOnly" role="status" aria-live="polite">{chapter === 0 ? '발표 표지' : chapters[chapter - 1].title}</span>
  </main>
}
