import { useMemo } from 'react'
import { useExperience } from '../state/ExperienceContext'
import type { Position } from '../domain/catalog'
import styles from './Interface.module.css'

export function MiniMap() {
  const { catalog, state, dispatch } = useExperience()
  const project = useMemo(() => {
    const xs = catalog.tracks.map(t => t.position[0]), ys = catalog.tracks.map(t => t.position[1])
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.max(...ys), bottom = Math.min(...ys)
    const scale = Math.min(210 / (right - left), 97 / (top - bottom))
    return (p: Position) => [120 + (p[0] - (left + right) / 2) * scale, 61 - (p[1] - (top + bottom) / 2) * scale]
  }, [catalog])
  const current = state.view.level === 'system' ? catalog.subgenreById.get(state.view.subgenreId)!.position : state.view.level === 'genre' ? catalog.genreById.get(state.view.genreId)!.position : null
  const trail = state.history.map(id => project(catalog.subgenreById.get(id)!.position).join(',')).join(' ')
  return <aside className={styles.miniMap} aria-label="방문 기록과 전체 내비게이션 지도">
    <div className={styles.panelHeading}><span>YOUR CONSTELLATION</span><span>{Object.keys(state.visits).length.toString().padStart(2, '0')} FOUND</span></div>
    <svg viewBox="0 0 240 125" role="group" aria-label="장르를 선택해 이동할 수 있는 미니맵">
      <path d="M0 10V0h10m220 0h10v10M0 115v10h10m220 0h10v-10" fill="none" stroke="#6d628248" />
      <path d="M120 0v125M0 62.5h240" stroke="#6d62821a" strokeDasharray="2 6" />
      {catalog.tracks.filter((_, i) => i % 15 === 0).map(t => { const [x, y] = project(t.position); return <circle key={t.id} cx={x} cy={y} r=".55" fill="#b7b1ce" opacity=".3" /> })}
      {trail && <polyline points={trail} fill="none" stroke="#b4a3d7" strokeWidth=".6" opacity=".6" />}
      {catalog.genres.map(genre => {
        const [x, y] = project(genre.position)
        const visits = genre.subgenreIds.reduce((sum, id) => sum + (state.visits[id] ?? 0), 0)
        const go = () => dispatch({ type: 'navigate', destination: { level: 'genre', genreId: genre.id } })
        return <g className={styles.mapDot} key={genre.id} role="button" tabIndex={0} aria-label={`${genre.name}, 방문 ${visits}회`} onClick={go} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go() } }}>
          <title>{genre.name} · 방문 {visits}회</title>
          <circle cx={x} cy={y} r="6" fill="transparent" />
          <circle cx={x} cy={y} r={visits ? 2.3 : 1.4} fill={visits ? '#e6dcfb' : '#7a748b'} />
          {visits > 0 && <circle cx={x} cy={y} r={3 + Math.min(visits, 5)} fill={genre.color} opacity=".12" />}
        </g>
      })}
      {current && <circle cx={project(current)[0]} cy={project(current)[1]} r="6" fill="none" stroke="#b9abd8" strokeWidth=".7" pointerEvents="none" />}
    </svg>
    <div className={styles.mapLegend}><span><i /> UNEXPLORED</span><span><i /> VISITED</span><span>CLICK TO TRAVEL ↗</span></div>
  </aside>
}
