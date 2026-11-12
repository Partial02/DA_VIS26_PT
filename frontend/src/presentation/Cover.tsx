import { useMemo } from 'react'
import { seededRandom } from '../domain/catalog'
import { Icon } from '../components/Icon'
import styles from './Presentation.module.css'

export function Cover({ onContinue }: { onContinue: () => void }) {
  const particles = useMemo(() => {
    const random = seededRandom(412)
    return Array.from({ length: 1600 }, (_, i) => {
      const radius = Math.pow(random(), .55) * 610
      const angle = random() * Math.PI * 2 + radius * .006
      return { id: i, x: 920 + Math.cos(angle) * radius, y: 520 + Math.sin(angle) * radius * .6,
        r: .35 + random() * 1.1, opacity: .08 + random() * .45 }
    })
  }, [])
  return <div className={styles.cover}>
    <svg className={styles.coverArt} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><radialGradient id="coverGlow"><stop stopColor="#7764a0" stopOpacity=".15" /><stop offset="1" stopColor="#020205" stopOpacity="0" /></radialGradient></defs>
      <ellipse cx="920" cy="520" rx="700" ry="460" fill="url(#coverGlow)" />
      <g fill="#c6bedc">{particles.map(p => <circle key={p.id} cx={p.x} cy={p.y} r={p.r} opacity={p.opacity} />)}</g>
      <g fill="none" stroke="#b8a9d5" strokeWidth=".6" opacity=".13" transform="rotate(-18 920 520)">
        <ellipse cx="920" cy="520" rx="420" ry="210" /><ellipse cx="920" cy="520" rx="580" ry="290" />
      </g>
    </svg>
    <div className={styles.coverContent}>
      <h1>취향 너머의<br /><em>소리를 찾아서.</em></h1>
      <button className={styles.continueButton} onClick={onContinue} aria-label="발표 시작하기"><Icon name="arrow" size={26} /></button>
    </div>
  </div>
}
