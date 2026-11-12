import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { formatDuration, systemTracks } from '../domain/catalog'
import { createDemoSignal } from '../domain/visualization'
import type { VisualizationSignal } from '../domain/visualization'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
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
  return <aside className={styles.trackDock} aria-label="항성계의 세 곡">
    <div className={styles.panelHeading}><span>THREE SIGNALS</span><span>{tracks.length ? '01 — 03' : 'AWAITING DISCOVERY'}</span></div>
    {!tracks.length ? <div className={styles.awaiting}>
      <div className={styles.emptyOrbit}><i /><i /><i /><b /></div>
      <h2>아직 닿지 않은 소리.</h2>
      <p>장르의 별을 따라 들어가면<br />그 안의 노래 세 곡을 만납니다.</p>
      <span>EVERY DISCOVERY BEGINS WITH A DOT.</span>
    </div> : <>
      <div className={styles.trackList}>{tracks.map((track, index) => <button key={track.id}
        className={`${styles.trackCard} ${current?.id === track.id ? styles.activeTrack : ''}`}
        aria-pressed={current?.id === track.id} onClick={() => dispatch({ type: 'selectTrack', id: track.id })}>
        <span className={styles.trackIndex}>0{index + 1}</span>
        <span className={styles.trackArt} style={{ '--cover-hue': `${220 + index * 23}deg` } as CSSProperties}><i /><b /></span>
        <span className={styles.trackText}><strong>{track.title}</strong><span>{track.artist}</span></span>
        <span className={styles.duration}>{formatDuration(track.duration)}</span>
      </button>)}</div>
      <div className={styles.signalCaption}><span><Icon name="star" size={11} /> SILENT MOTION STUDY</span><span>DEMO</span></div>
      <SignalBars signal={signal} />
    </>}
  </aside>
}
