import { Icon } from '../components/Icon'
import styles from './Presentation.module.css'

export function Cover({ onContinue }: { onContinue: () => void }) {
  return <div className={styles.cover}>
    <div className={styles.coverContent}>
      <h1>취향 너머의<br /><em>소리를 찾아서.</em></h1>
      <button className={styles.continueButton} onClick={onContinue} aria-label="발표 시작하기"><Icon name="arrow" size={26} /></button>
    </div>
  </div>
}
