import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { rankRecommendations, topGenreDestinations } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import { containDialogFocus } from './dialogFocus'
import { StageConsole, shortGenreName, useChooseRecommendation } from './StageConsole'
import styles from './Interface.module.css'

/** Inside a subgenre: the best subgenre of three other genres, and the table in a dialog. */
export function RecommendationJar() {
  const { catalog, state } = useExperience()
  const [editing, setEditing] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const choose = useChooseRecommendation()
  const current = state.view.level === 'system' ? state.view.subgenreId : null
  const results = useMemo(() => topGenreDestinations(rankRecommendations(catalog, state.selection, state.genreVisits)
    .filter(result => result.subgenreId !== current)), [catalog, current, state.selection, state.genreVisits])
  useEffect(() => {
    if (editing) dialog.current?.showModal()
    else dialog.current?.close()
  }, [editing])
  function close() { setEditing(false); editButton.current?.focus() }
  return <aside className={styles.recommendation} aria-label="고른 범주로 찾은 세부장르 추천">
    <div className={styles.recommendationHeader}><span>다음 추천{state.selection.length > 0 && <small> · {state.selection.length}칸</small>}</span>
      <button ref={editButton} onClick={() => setEditing(true)} aria-label="장르 × 악기 고르기 열기" title="장르 × 악기 고르기"><Icon name="mix" size={16} /></button></div>
    <ol className={styles.genreRecommendations}>{results.map(result => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      return <li key={result.genreId}>
        <LiquidGlass as="button" className={styles.genreGlass} tint={genre.color} style={{ '--genre-color': genre.color } as CSSProperties}
          aria-label={`${genre.name} 추천: ${subgenre.name} 탐색하기, 점수 ${Math.round(result.score * 100)}`}
          onClick={() => choose(result)}>
          <span className={styles.genreGlassLabel}><strong>{subgenre.name}</strong><small>{shortGenreName(genre.name)} · {Math.round(result.score * 100)}</small></span>
        </LiquidGlass>
      </li>
    })}</ol>
    {!results.length && <p className={styles.emptyMix}>장르와 악기를 고르면 어울리는 세부장르가 떠요.<br /><button className={styles.inlineAction} onClick={() => setEditing(true)}>고르기 열기 <Icon name="arrow" size={13} /></button></p>}
    <dialog ref={dialog} className={`${styles.mixerDialog} ${styles.stageDialog}`} onKeyDown={containDialogFocus} onCancel={close} onClose={() => setEditing(false)} onClick={event => { if (event.target === event.currentTarget) close() }} aria-labelledby="mixerTitle">
      <div className={styles.dialogInner}>
        <div className={styles.panelHeading}><span id="mixerTitle">장르 × 악기로 고르기</span><button onClick={close} aria-label="선택표 닫기"><Icon name="close" /></button></div>
        {editing && <StageConsole onChoose={close} perPage={5} />}
      </div>
    </dialog>
  </aside>
}
