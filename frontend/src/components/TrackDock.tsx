import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { formatDuration, systemTracks } from '../domain/catalog'
import { createDemoSignal } from '../domain/visualization'
import type { VisualizationSignal } from '../domain/visualization'
import { useExperience } from '../state/ExperienceContext'
import styles from './Interface.module.css'

export function SignalBars({ signal }: { signal: VisualizationSignal }) {
  return <div className={styles.signalBars} aria-label={signal.source === 'demo' ? '무음 시각화 데모. 실제 음원 분석 결과가 아닙니다.' : '오디오 반응 시각화'}>
    {signal.levels.map((level, i) => <i key={i} style={{ height: `${level * 100}%`, '--delay': `${-i * .137}s`, '--speed': `${.8 + level}s` } as CSSProperties} />)}
  </div>
}

export function TrackDock() {
  const { catalog, state, dispatch } = useExperience()
  const tracks = state.view.level === 'system' ? systemTracks(catalog, state.view.subgenreId) : []
  const current = tracks.find(t => t.id === state.selectedTrackId) ?? tracks[0]
  const signal = useMemo(() => createDemoSignal(current?.id ?? 'quiet'), [current?.id])
  if (!tracks.length) return null
  return <aside className={styles.trackDock} aria-label="항성계의 세 곡">
    <div className={styles.panelHeading}><span>노래</span></div>
      <div className={styles.trackList}>{tracks.map((track, index) => <button key={track.id}
        className={`${styles.trackCard} ${current?.id === track.id ? styles.activeTrack : ''}`}
        aria-pressed={current?.id === track.id} onClick={() => dispatch({ type: 'selectTrack', id: track.id })}>
        <span className={styles.trackIndex}>0{index + 1}</span>
        <span className={styles.trackArt} style={{ '--cover-hue': `${220 + index * 23}deg` } as CSSProperties}><i /><b /></span>
        <span className={styles.trackText}><strong>{track.title}</strong><span>{track.artist}</span></span>
        <span className={styles.duration}>{formatDuration(track.duration)}</span>
      </button>)}</div>
      <SignalBars signal={signal} />
  </aside>
}
