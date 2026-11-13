import { genreVisitAppearance } from '../domain/visits'
import { useExperience } from '../state/ExperienceContext'
import styles from './Interface.module.css'

export function VisitPanel() {
  const { catalog, state } = useExperience()
  const genres = catalog.genres.map(genre => ({ genre, visits: state.genreVisits[genre.id] ?? 0 }))
    .sort((a, b) => b.visits - a.visits || a.genre.name.localeCompare(b.genre.name, 'en'))
  const total = genres.reduce((sum, item) => sum + item.visits, 0)
  const discovered = genres.filter(item => item.visits > 0).length
  return <div>
    <dl className={styles.visitStats}>
      <div><dt>전체 방문</dt><dd>{total}<small>회</small></dd></div>
      <div><dt>방문한 장르</dt><dd>{discovered}<small> / {genres.length}</small></dd></div>
      <div><dt>색 완성</dt><dd>{genres.filter(item => item.visits >= 5).length}<small>개</small></dd></div>
    </dl>
    <p className={styles.visitDescription}>{total ? '자주 찾은 장르일수록 고유한 색과 빛이 남아요.' : '장르를 방문하면 별에 색과 빛이 쌓이기 시작해요.'}</p>
    <ol className={styles.visitList} aria-label="장르별 방문 누적">
      {genres.map(({ genre, visits }) => {
        const appearance = genreVisitAppearance(visits)
        return <li key={genre.id} data-genre-id={genre.id}>
          <div className={styles.visitRow}>
            <span><i style={{ background: visits ? genre.color : '#696777' }} />{genre.name}</span>
            <strong>{visits ? `${visits}회` : '미방문'}</strong>
          </div>
          <div className={styles.visitMeter} role="progressbar" aria-label={`${genre.name} 색 누적`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(appearance.colorMix * 100)}>
            <span style={{ width: `${appearance.colorMix * 100}%`, background: genre.color }} />
          </div>
          <small className={styles.visitStrength}>색 {Math.round(appearance.colorMix * 100)}% · 밝기 +{Math.round((appearance.brightness - 1) * 100)}%</small>
        </li>
      })}
    </ol>
    <p className={styles.visitNote}>색은 5회, 밝기는 10회 방문하면 최대가 됩니다. 그 이후에도 방문 횟수는 계속 쌓입니다.</p>
    <p className={styles.visitNote}>이번 탐색의 기록이며, 새로고침하면 초기화됩니다.</p>
  </div>
}
