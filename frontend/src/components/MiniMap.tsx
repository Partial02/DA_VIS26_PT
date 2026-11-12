import { useMemo } from 'react'
import { useExperience } from '../state/ExperienceContext'
import type { Position } from '../domain/catalog'
import styles from './Interface.module.css'

export function MiniMap({ bounds }: { bounds: Position[] | null }) {
  const { catalog, state, dispatch } = useExperience()
  const project = useMemo(() => {
    const xs = catalog.tracks.map(t => t.position[0]), ys = catalog.tracks.map(t => t.position[1])
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.max(...ys), bottom = Math.min(...ys)
    const scale = Math.min(180 / (right - left), 200 / (top - bottom))
    return (p: Position) => [110 + (p[0] - (left + right) / 2) * scale, 120 - (p[1] - (top + bottom) / 2) * scale]
  }, [catalog])
  const trackDots = useMemo(() => catalog.tracks.map(t => {
    const [x, y] = project(t.position)
    return <circle key={t.id} cx={x} cy={y} r=".45" fill={catalog.genreById.get(t.genreId)!.color} opacity={state.view.level === 'universe' || t.genreId === state.view.genreId ? .55 : .12} />
  }), [catalog, project, state.view])
  const current = state.view.level === 'system' ? catalog.subgenreById.get(state.view.subgenreId)!.position : state.view.level === 'genre' ? catalog.genreById.get(state.view.genreId)!.position : null
  const trail = state.history.map(id => project(catalog.subgenreById.get(id)!.position).join(',')).join(' ')
  const footprint = bounds?.map(point => project(point).join(',')).join(' ')
  return <aside className={styles.miniMap} aria-label="방문 기록과 전체 내비게이션 지도">
    <svg viewBox="0 0 220 240" role="group" aria-label="장르와 세부장르의 실제 분포를 표시하는 미니맵">
      <defs><clipPath id="miniMapBounds"><rect x="1" y="1" width="218" height="238" rx="10" /></clipPath></defs>
      <path d="M1 12V1h11m196 0h11v11M1 228v11h11m196 0h11v-11" fill="none" stroke="#b9a6d03b" strokeWidth=".6" />
      <path d="M110 1v238M1 120h218" stroke="#9b87b520" strokeDasharray="2 6" strokeWidth=".5" />
      {trackDots}
      {footprint && <polygon points={footprint} clipPath="url(#miniMapBounds)" pointerEvents="none" fill="#d5c3ef05" stroke="#e2d4fa" opacity=".4" strokeWidth=".6" strokeDasharray="3 3" />}
      {trail && <polyline points={trail} fill="none" stroke="#b4a3d7" strokeWidth=".6" opacity=".6" />}
      {catalog.subgenres.map(sub => {
        const [x, y] = project(sub.position)
        const active = state.view.level !== 'universe' && sub.genreId === state.view.genreId
        const go = () => dispatch({ type: 'navigate', destination: { level: 'system', genreId: sub.genreId, subgenreId: sub.id } })
        return <g key={sub.id} className={active ? styles.mapDot : undefined} role={active ? 'button' : undefined} tabIndex={active ? 0 : undefined}
          aria-label={active ? sub.name : undefined} onClick={active ? go : undefined}
          onKeyDown={active ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go() } } : undefined}>
          <title>{sub.name}</title>
          {active && <circle cx={x} cy={y} r="4" fill="transparent" />}
          <path transform={`translate(${x} ${y})`} d="M0-2.2 .6-.6 2.2 0 .6.6 0 2.2-.6.6-2.2 0-.6-.6Z" fill={catalog.genreById.get(sub.genreId)!.color} opacity={active ? .9 : .35} />
        </g>
      })}
      {catalog.genres.map(genre => {
        const [x, y] = project(genre.position)
        const visits = genre.subgenreIds.reduce((sum, id) => sum + (state.visits[id] ?? 0), 0)
        const go = () => dispatch({ type: 'navigate', destination: { level: 'genre', genreId: genre.id } })
        return <g className={styles.mapDot} key={genre.id} role="button" tabIndex={0} aria-label={`${genre.name}, 방문 ${visits}회`} onClick={go} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go() } }}>
          <title>{genre.name} · 방문 {visits}회</title>
          <circle cx={x} cy={y} r="6" fill="transparent" />
          <circle cx={x} cy={y} r={visits ? 2.5 : 1.8} fill={genre.color} stroke="#e6dcfb" strokeWidth=".5" />
          {visits > 0 && <circle cx={x} cy={y} r={3 + Math.min(visits, 5)} fill={genre.color} opacity=".12" />}
        </g>
      })}
      {current && <g fill="none" stroke="#f3ecff" pointerEvents="none"><circle cx={project(current)[0]} cy={project(current)[1]} r="6" strokeWidth=".8" /><circle cx={project(current)[0]} cy={project(current)[1]} r="8" strokeWidth=".4" opacity=".4" /></g>}
    </svg>
  </aside>
}
