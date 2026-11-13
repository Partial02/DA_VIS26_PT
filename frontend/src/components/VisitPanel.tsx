import type { CSSProperties } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import styles from './Interface.module.css'

export function VisitPanel() {
  const { catalog, state } = useExperience()
  const genres = catalog.genres.map(genre => ({
    genre,
    visits: state.genreVisits[genre.id] ?? 0,
    subgenres: genre.subgenreIds.map(id => ({ subgenre: catalog.subgenreById.get(id)!, visits: state.visits[id] ?? 0 }))
      .filter(item => item.visits > 0)
      .sort((a, b) => b.visits - a.visits || a.subgenre.name.localeCompare(b.subgenre.name, 'en')),
  })).filter(item => item.visits > 0)
    .sort((a, b) => b.visits - a.visits || a.genre.name.localeCompare(b.genre.name, 'en'))
  const total = genres.reduce((sum, item) => sum + item.visits, 0)
  const discoveredSubgenres = genres.reduce((sum, item) => sum + item.subgenres.length, 0)
  const explored = genres.length + discoveredSubgenres
  const regions = catalog.genres.flatMap(genre => [
    { id: genre.id, visited: (state.genreVisits[genre.id] ?? 0) > 0, color: genre.color },
    ...genre.subgenreIds.map(id => ({ id, visited: (state.visits[id] ?? 0) > 0, color: genre.color })),
  ])
  const coverage = (explored / regions.length * 100).toFixed(1)
  return <div>
    <div className={styles.visitOverview}>
      <div className={styles.visitOverviewHeader}>
        <div><span className={styles.visitOverviewLabel}>탐색률</span><strong>{coverage}<small>%</small></strong></div>
        <span className={styles.visitOverviewCount}>{explored}<span> / {regions.length}</span></span>
      </div>
      <div className={styles.visitAtlas} role="img" aria-label={`탐색률 ${coverage}%, 전체 ${regions.length}개 영역 중 ${explored}개 방문`}>
        {regions.map(region => <span key={region.id} data-visited={region.visited} aria-hidden="true" style={{ '--genre-color': region.color } as CSSProperties} />)}
      </div>
    </div>
    {total ? <ol className={styles.visitList} aria-label="방문한 장르와 세부장르">
      {genres.map(({ genre, visits, subgenres }, index) => {
        const share = visits / total * 100
        const subgenreTotal = subgenres.reduce((sum, item) => sum + item.visits, 0)
        return <li key={genre.id} data-genre-id={genre.id} style={{ '--genre-color': genre.color } as CSSProperties}>
          <div className={styles.visitRow}>
            <span><span className={styles.visitRank}>{String(index + 1).padStart(2, '0')}</span><b>{genre.name}</b></span>
            <strong>{visits}<small>회</small></strong>
          </div>
          <div className={styles.visitBarRow}>
            <div className={styles.visitBar} role="img" aria-label={`${genre.name}: 장르 방문 ${visits}회, 전체의 ${Math.round(share)}%`}>
              <span style={{ width: `${share}%` }} />
            </div>
            <span>{Math.round(share)}%</span>
          </div>
          {subgenres.length > 0 && <div className={styles.visitSubgenres}>
            <ul aria-label={`${genre.name}에서 방문한 세부장르`}>
              {subgenres.map(({ subgenre, visits: count }) => {
                const percentage = count / subgenreTotal * 100
                return <li key={subgenre.id} data-subgenre-id={subgenre.id}>
                  <div className={styles.visitSubgenreRow}><span>{subgenre.name}</span><small>{count}회 <span>· {Math.round(percentage)}%</span></small></div>
                  <div className={`${styles.visitBar} ${styles.visitSubgenreBar}`} role="img" aria-label={`${subgenre.name}: ${count}회, ${genre.name} 세부장르 방문의 ${Math.round(percentage)}%`}>
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                </li>
              })}
            </ul>
          </div>}
        </li>
      })}
    </ol> : <div className={styles.visitEmpty}>
      <Icon name="history" size={26} />
      <h3>방문 기록이 없습니다.</h3>
    </div>}
  </div>
}
