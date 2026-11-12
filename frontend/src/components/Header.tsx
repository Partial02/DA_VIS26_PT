import { useExperience } from '../state/ExperienceContext'
import styles from './Interface.module.css'

export function Header({ story }: { story: boolean }) {
  const { state, catalog } = useExperience()
  const discovered = Object.keys(state.visits).length
  return <header className={styles.header}>
    <a className={styles.wordmark} href="#/story/1" aria-label="INNER VERSE 발표 처음으로">INNER<span>//</span>VERSE<span className={styles.brandDot}>®</span></a>
    <nav className={styles.mainNav} aria-label="파트 선택">
      <a href="#/story/1" aria-current={story ? 'page' : undefined}><span>01</span> THE QUESTION</a>
      <a href="#/explore" aria-current={!story ? 'page' : undefined}><span>02</span> THE UNIVERSE</a>
    </nav>
    <div className={styles.headerMeta}><span className={styles.liveDot} />{story ? 'AN EXPLORATION OF SOUND & SELF' : <>{discovered.toString().padStart(2, '0')} <span className={styles.dim}>/ {catalog.subgenres.length} WORLDS DISCOVERED</span></>}</div>
  </header>
}
