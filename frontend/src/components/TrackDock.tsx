import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { jamendoPlayer, jamendoTrackUrl } from '../audio/jamendo'
import { formatDuration, subgenrePlaylist } from '../domain/catalog'
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

function JamendoPlayerBar() {
  const player = useSyncExternalStore(jamendoPlayer.subscribe, jamendoPlayer.getSnapshot)
  const [editingKey, setEditingKey] = useState(false)
  const [key, setKey] = useState(player.clientId)
  // Leaving the subgenre unmounts the dock; stop the song with it.
  useEffect(() => () => jamendoPlayer.stop(), [])
  return <div className={styles.player}>
    <div className={styles.playerRow}>
      <button className={styles.playButton} onClick={() => jamendoPlayer.toggle()} disabled={!player.trackId || player.loading}
        aria-label={player.playing ? '일시정지' : '재생'}><Icon name={player.playing ? 'pause' : 'play'} size={16} /></button>
      <div className={styles.playerText} aria-live="polite">
        <strong>{player.trackId ? `${player.title} — ${player.artist}` : '선택된 곡이 없습니다'}</strong>
        <span>{player.message}</span>
      </div>
      <a className={styles.playerLink} href={player.trackId ? jamendoTrackUrl(player.trackId) : 'https://www.jamendo.com'} target="_blank" rel="noopener noreferrer"
        aria-label="Jamendo에서 열기 (새 창)" title="Jamendo에서 열기"><Icon name="external" size={15} /></a>
      <button className={styles.playerLink} aria-expanded={editingKey} aria-controls="jamendoKey" aria-label="Jamendo API 키 설정" title="API 키"
        onClick={() => { setKey(player.clientId); setEditingKey(!editingKey) }}><Icon name="key" size={15} /></button>
    </div>
    {editingKey && <form id="jamendoKey" className={styles.keyForm} onSubmit={event => { event.preventDefault(); jamendoPlayer.setClientId(key); setEditingKey(false) }}>
      <label>Jamendo client_id<input value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} placeholder="예: f564a7a8" /></label>
      <button className="outlinedButton" type="submit">저장</button>
    </form>}
    <p className={styles.playerNote}>곡 정보는 MTG-Jamendo 데이터셋 기반이며, 음원은 Jamendo의 CC 라이선스 트랙입니다{player.license && <> · <a href={player.license} target="_blank" rel="noopener noreferrer">라이선스</a></>}.</p>
  </div>
}

export function TrackDock() {
  const { catalog, state, dispatch } = useExperience()
  const subgenreId = state.view.level === 'system' ? state.view.subgenreId : null
  // Genre Atlas order: songs that fit the stage first, one per artist before repeats. Scores stay hidden.
  const tracks = useMemo(() => subgenreId ? subgenrePlaylist(catalog, subgenreId, state.stage) : [], [catalog, subgenreId, state.stage])
  const current = tracks.find(t => t.id === state.selectedTrackId) ?? tracks[0]
  const signal = useMemo(() => createDemoSignal(current?.id ?? 'quiet'), [current?.id])
  if (!tracks.length) return null
  return <aside className={styles.trackDock} aria-label="현재 영역의 플레이리스트">
    <div className={styles.panelHeading}><span>플레이리스트 · {tracks.length.toLocaleString()}곡</span><span>{state.stage.length ? '무대 편성에 어울리는 순' : '길이·아티스트 분산 순'}</span></div>
      <div className={styles.trackList}>{tracks.map((track, index) => <button key={track.id}
        className={`${styles.trackCard} ${current?.id === track.id ? styles.activeTrack : ''}`}
        aria-pressed={current?.id === track.id} onClick={() => { dispatch({ type: 'selectTrack', id: track.id }); void jamendoPlayer.play(track) }}>
        <span className={styles.trackIndex}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.trackArt} style={{ '--cover-angle': `${-35 + index * 18}deg` } as CSSProperties}><i /><b /></span>
        <span className={styles.trackText}><strong>{track.title}</strong><span>{track.artist}</span></span>
        <span className={styles.duration}>{formatDuration(track.duration)}</span>
      </button>)}</div>
      <SignalBars signal={signal} />
      <JamendoPlayerBar />
  </aside>
}
