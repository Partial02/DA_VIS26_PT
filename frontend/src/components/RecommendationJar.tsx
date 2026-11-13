import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { seededRandom } from '../domain/catalog'
import { pairKey, recommendGenres } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { containDialogFocus } from './dialogFocus'
import styles from './Interface.module.css'

export function RecommendationJar({ onClose }: { onClose?: () => void }) {
  const { catalog, state, dispatch } = useExperience()
  const [editing, setEditing] = useState(false)
  const [genreId, setGenreId] = useState('jazz')
  const [instrument, setInstrument] = useState('Piano')
  const dialog = useRef<HTMLDialogElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const results = useMemo(() => recommendGenres(catalog, state.preferences), [catalog, state.preferences])
  const dust = useMemo(() => {
    const random = seededRandom(91)
    return Array.from({ length: 65 }, () => ({ x: random() * 320, y: random() * 90, radius: .3 + random() * 1.1, opacity: .15 + random() * .6 }))
  }, [])
  const total = state.preferences.reduce((sum, p) => sum + p.weight, 0)
  const duplicate = state.preferences.some(p => p.genreId === genreId && p.instrument === instrument)
  const selectedGenre = catalog.genreById.get(genreId)!
  useEffect(() => {
    if (editing) dialog.current?.showModal()
    else dialog.current?.close()
  }, [editing])
  function close() { setEditing(false); editButton.current?.focus() }
  return <aside className={styles.recommendation} aria-label="장르별 탐색 목적지 추천">
    <div className={styles.recommendationHeader}><span>추천</span><div>
      <button ref={editButton} onClick={() => setEditing(true)} aria-label="장르와 악기 조합 편집"><Icon name="mix" size={16} /></button>
      {onClose && <button onClick={onClose} aria-label="추천 닫기"><Icon name="close" size={16} /></button>}
    </div></div>
    <ol className={styles.genreRecommendations}>{results.map(result => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      return <li key={result.genreId}>
        <button className={styles.genreGlass} style={{ '--genre-color': genre.color } as CSSProperties}
          aria-label={`${genre.name} 추천: ${subgenre.name} 탐색하기`}
          onClick={() => dispatch({ type: 'navigate', destination: { level: 'system', genreId: result.genreId, subgenreId: result.subgenreId } })}>
          <span className={styles.genreMist} aria-hidden="true" />
          <svg className={styles.genreDust} viewBox="0 0 320 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {dust.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={point.radius} opacity={point.opacity} />)}
          </svg>
          <span className={styles.genreGlassLabel}><strong>{genre.name}</strong><small>{subgenre.name}</small></span>
        </button>
      </li>
    })}</ol>
    {!results.length && <p className={styles.emptyMix}>조합을 추가하고 비중을 올려보세요.</p>}
    <dialog ref={dialog} className={styles.mixerDialog} onKeyDown={containDialogFocus} onCancel={close} onClose={() => setEditing(false)} onClick={event => { if (event.target === event.currentTarget) close() }} aria-labelledby="mixerTitle">
      <div className={styles.dialogInner}>
        <div className={styles.panelHeading}><span>COMPOSE YOUR CURIOSITY</span><button onClick={close} aria-label="조합 편집 닫기"><Icon name="close" /></button></div>
        <h2 id="mixerTitle">A little more <em>curiosity.</em></h2>
        <p className={styles.dialogCopy}>장르와 악기를 섞어 탐색할 세계를 골라보세요.<br />처음 담긴 세 조합은 예시입니다.</p>
        <div className={styles.mixPairs}>{state.preferences.map(pair => <div key={pairKey(pair)} className={styles.mixPair}>
          <div><span style={{ color: catalog.genreById.get(pair.genreId)!.color }}>{catalog.genreById.get(pair.genreId)!.name} <b>×</b> {pair.instrument}</span>
            <button onClick={() => dispatch({ type: 'removePair', key: pairKey(pair) })} aria-label={`${catalog.genreById.get(pair.genreId)!.name} ${pair.instrument} 조합 삭제`}><Icon name="close" size={14} /></button></div>
          <label><span className="srOnly">{catalog.genreById.get(pair.genreId)!.name} {pair.instrument} 비중</span>
            <input type="range" min="0" max="100" step="1" value={pair.weight} onChange={event => dispatch({ type: 'weight', key: pairKey(pair), weight: Number(event.target.value) })} />
            <output>{total ? Math.round(pair.weight / total * 100) : 0}%</output>
          </label>
        </div>)}</div>
        <form className={styles.addPair} onSubmit={event => { event.preventDefault(); if (!duplicate) dispatch({ type: 'addPair', pair: { genreId, instrument, weight: 25 } }) }}>
          <label>GENRE<select aria-label="장르 선택" value={genreId} onChange={event => { const next = catalog.genreById.get(event.target.value)!; setGenreId(next.id); setInstrument(next.instruments.includes(instrument) ? instrument : next.instruments[0]) }}>{catalog.genres.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
          <label>INSTRUMENT<select aria-label="악기 선택" value={instrument} onChange={event => setInstrument(event.target.value)}>{selectedGenre.instruments.map(i => <option key={i}>{i}</option>)}</select></label>
          <button className="outlinedButton" disabled={duplicate} type="submit"><Icon name="plus" size={15} />{duplicate ? '이미 담긴 조합' : '조합 담기'}</button>
        </form>
        <p className={styles.methodNote}>비중은 전체 합에 맞춰 정규화됩니다. 추천은 CSV의 악기 태그 비율을 합산하는 프론트 데모입니다.</p>
        <button className="outlinedButton" onClick={close}>이 조합으로 탐색하기 <Icon name="arrow" size={16} /></button>
      </div>
    </dialog>
  </aside>
}
