import { useEffect, useRef } from 'react'
import storyUrl from './chapters/Pages_1-5.html?url'
import styles from './Presentation.module.css'

/** Part 1 발표. `chapters/Pages_1-5.html` 한 파일에 다섯 페이지가 하나의 스크롤로 이어져 있습니다. */
export const storyPages = [
  { title: '음반 산업 매출', anchor: '#overview' },
  { title: '국가별 성장률', anchor: '#market-position' },
  { title: '곡 수와 장르 수', anchor: '#catalog-position' },
  { title: '재생횟수 분포', anchor: '#distribution-position' },
  { title: '추천 알고리즘의 한계', anchor: '#recommendation-position' },
]

/** 발표 페이지를 전체 화면으로 띄웁니다. `page`는 목차에서 고른 페이지 번호(1–5)이고 0은 처음입니다. */
export function StoryPages({ page }: { page: number }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const first = useRef(page)
  const anchor = (index: number) => storyPages[Math.max(1, index) - 1].anchor
  useEffect(() => {
    if (page === first.current) return
    first.current = -1
    const view = frame.current?.contentWindow
    if (view) view.location.hash = anchor(page)
  }, [page])
  return <iframe ref={frame} className={styles.storyFrame} title="Part 1 발표: 음악 데이터 스크롤 시각화"
    src={first.current > 1 ? storyUrl + anchor(first.current) : storyUrl} onLoad={() => frame.current?.focus({ preventScroll: true })} />
}
