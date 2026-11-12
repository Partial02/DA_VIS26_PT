import { useEffect, useState } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import styles from './Interface.module.css'

export function AtlasDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog, state, dispatch } = useExperience()
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [open, onClose])
  const subgenres = state.view.level !== 'universe' || query.trim().length > 0
  const groups = subgenres ? catalog.subgenres.filter(s => (state.view.level === 'universe' || s.genreId === state.view.genreId) &&
    `${s.name} ${catalog.genreById.get(s.genreId)!.name}`.toLowerCase().includes(query.toLowerCase().trim())) : catalog.genres
  return <section id="atlasPanel" hidden={!open} className={styles.atlasPanel} aria-label="장르 검색 및 목록">
      {state.view.level !== 'universe' && <button className={styles.listBack} onClick={() => { dispatch({ type: 'navigate', destination: { level: 'universe' } }); setQuery('') }}><Icon name="back" size={14} /> 전체 장르</button>}
      <label className={styles.searchLabel}><span className="srOnly">장르 또는 세부장르 검색</span><input placeholder="찾고 싶은 장르가 있나요?" value={query} onChange={event => setQuery(event.target.value)} type="search" /></label>
      <div className={styles.atlasList}>{groups.map(group => {
        const visits = 'genreId' in group ? state.visits[group.id] ?? 0 : group.subgenreIds.reduce((sum, id) => sum + (state.visits[id] ?? 0), 0)
        return <button key={group.id} onClick={() => {
          dispatch({ type: 'navigate', destination: 'genreId' in group
            ? { level: 'system', genreId: group.genreId, subgenreId: group.id } : { level: 'genre', genreId: group.id } })
          setQuery(''); onClose()
        }}>
          <span><strong>{group.name}</strong><small>{'genreId' in group ? catalog.genreById.get(group.genreId)!.name : `${group.subgenreIds.length} SUBGENRES`}</small></span>
          <span>{group.trackIds.length}곡{visits > 0 && <small>방문 {visits}회</small>}</span>
        </button>
      })}</div>
      {!groups.length && <p className={styles.dialogCopy}>일치하는 장르가 없습니다.</p>}
  </section>
}
