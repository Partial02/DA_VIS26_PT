import Consumption from './chapters/Consumption'
import Diversity from './chapters/Diversity'
import Exploration from './chapters/Exploration'
import Entrenchment from './chapters/Entrenchment'
import Comparison from './chapters/Comparison'
import NeedForExploration from './chapters/NeedForExploration'
import { Icon } from '../components/Icon'
import styles from './Presentation.module.css'

export const chapters = [
  { title: '소비량–소비자 수', component: Consumption },
  { title: '패턴–장르 다양화', component: Diversity },
  { title: '탐색 vs 유지', component: Exploration },
  { title: '고착화 논문', component: Entrenchment },
  { title: '추천 시스템 비교', component: Comparison },
  { title: '탐색의 필요성', component: NeedForExploration },
]

export function Presentation({ chapter }: { chapter: number }) {
  const Chapter = chapters[chapter - 1].component
  return <main className={styles.presentation}>
    <div className={styles.partLabel}>PART 01 <span>THE QUESTION BEFORE THE JOURNEY</span></div>
    <Chapter />
    <footer className={styles.storyFooter}>
      <nav aria-label="발표 챕터">{chapters.map((c, index) => <a key={c.title} href={`#/story/${index + 1}`} aria-label={`${index + 1}. ${c.title}`} aria-current={chapter === index + 1 ? 'step' : undefined}>{(index + 1).toString().padStart(2, '0')}</a>)}</nav>
      <div><a className={chapter === 1 ? styles.disabled : ''} aria-disabled={chapter === 1} tabIndex={chapter === 1 ? -1 : 0} href={`#/story/${Math.max(1, chapter - 1)}`}><Icon name="back" size={15} /> PREVIOUS</a><a href={chapter === 6 ? '#/explore' : `#/story/${chapter + 1}`}>{chapter === 6 ? 'ENTER THE UNIVERSE' : 'NEXT CHAPTER'}<Icon name="arrow" size={15} /></a></div>
    </footer>
  </main>
}
