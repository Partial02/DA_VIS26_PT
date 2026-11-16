import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { seededRandom } from '../domain/catalog'
import { rankRecommendations, topGenreDestinations } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { containDialogFocus } from './dialogFocus'
import { StageConsole, useChooseRecommendation, useLineupText } from './StageConsole'
import styles from './Interface.module.css'

export function RecommendationJar({ onClose, onEditStage }: { onClose?: () => void; onEditStage?: () => void }) {
  const { catalog, state } = useExperience()
  const [editing, setEditing] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const choose = useChooseRecommendation()
  const lineup = useLineupText()
  const results = useMemo(() => topGenreDestinations(rankRecommendations(catalog, state.stage, state.genreVisits)), [catalog, state.stage, state.genreVisits])
  const dust = useMemo(() => {
    const random = seededRandom(91)
    return Array.from({ length: 65 }, () => ({ x: random() * 320, y: random() * 90, radius: .3 + random() * 1.1, opacity: .15 + random() * .6 }))
  }, [])
  useEffect(() => {
    if (editing) dialog.current?.showModal()
    else dialog.current?.close()
  }, [editing])
  function close() { setEditing(false); editButton.current?.focus() }
  // Outside a subgenre the stage panel is the editor; inside, the stage opens as a dialog.
  const edit = () => onEditStage ? onEditStage() : setEditing(true)
  return <aside className={styles.recommendation} aria-label="연주자 편성으로 고른 세부장르 추천">
    <div className={styles.recommendationHeader}><span>추천{state.stage.length > 0 && <small> · 무대 {state.stage.length}명</small>}</span><div>
      <button ref={editButton} onClick={edit} aria-label="무대 편성 편집"><Icon name="mix" size={16} /></button>
      {onClose && <button onClick={onClose} aria-label="추천 닫기"><Icon name="close" size={16} /></button>}
    </div></div>
    <ol className={styles.genreRecommendations}>{results.map(result => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      return <li key={result.genreId}>
        <button className={styles.genreGlass} style={{ '--genre-color': genre.color } as CSSProperties}
          aria-label={`${genre.name} 추천: ${subgenre.name} 탐색하기, 적합도 ${Math.round(result.score * 100)}%`}
          onClick={() => choose(result)}>
          <span className={styles.genreMist} aria-hidden="true" />
          <svg className={styles.genreDust} viewBox="0 0 320 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {dust.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={point.radius} opacity={point.opacity} />)}
          </svg>
          <span className={styles.genreGlassLabel}><strong>{genre.name}</strong><small>{subgenre.name}</small></span>
        </button>
      </li>
    })}</ol>
    {!results.length && <p className={styles.emptyMix}>연주자를 무대에 올리면 어울리는 세부장르가 뜹니다.<br /><button className={styles.inlineAction} onClick={edit}>무대 편성 열기 <Icon name="arrow" size={13} /></button></p>}
    {lineup && <p className={styles.lineupChange} role="status">{lineup}</p>}
    {!onEditStage && <dialog ref={dialog} className={`${styles.mixerDialog} ${styles.stageDialog}`} onKeyDown={containDialogFocus} onCancel={close} onClose={() => setEditing(false)} onClick={event => { if (event.target === event.currentTarget) close() }} aria-labelledby="mixerTitle">
      <div className={styles.dialogInner}>
        <div className={styles.panelHeading}><span>WHO'S ON STAGE</span><button onClick={close} aria-label="무대 편성 닫기"><Icon name="close" /></button></div>
        <h2 id="mixerTitle">Play it, <em>then find it.</em></h2>
        {editing && <StageConsole onChoose={close} stageSize={180} perPage={5} />}
        <button className="outlinedButton" onClick={close}>이 편성으로 탐색하기 <Icon name="arrow" size={16} /></button>
      </div>
    </dialog>}
  </aside>
}
