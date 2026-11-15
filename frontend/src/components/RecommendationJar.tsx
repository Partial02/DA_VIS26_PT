import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { seededRandom } from '../domain/catalog'
import { applyLineup } from '../domain/atlas'
import { rankRecommendations, topGenreDestinations } from '../domain/recommendations'
import type { RecommendationTarget } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { containDialogFocus } from './dialogFocus'
import styles from './Interface.module.css'

const RANK_PER_PAGE = 8

export function RecommendationJar({ onClose }: { onClose?: () => void }) {
  const { catalog, state, dispatch } = useExperience()
  const atlas = catalog.atlas!
  const [editing, setEditing] = useState(false)
  const [page, setPage] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const ranked = useMemo(() => rankRecommendations(catalog, state.stage, state.genreVisits), [catalog, state.stage, state.genreVisits])
  const results = useMemo(() => topGenreDestinations(ranked), [ranked])
  const pages = Math.max(1, Math.ceil(ranked.length / RANK_PER_PAGE))
  const current = Math.min(page, pages - 1)
  const stageKey = state.stage.toSorted((a, b) => a - b).join(',')
  useEffect(() => { setPage(0) }, [stageKey])
  const dust = useMemo(() => {
    const random = seededRandom(91)
    return Array.from({ length: 65 }, () => ({ x: random() * 320, y: random() * 90, radius: .3 + random() * 1.1, opacity: .15 + random() * .6 }))
  }, [])
  useEffect(() => {
    if (editing) dialog.current?.showModal()
    else dialog.current?.close()
  }, [editing])
  function close() { setEditing(false); editButton.current?.focus() }
  function choose(result: RecommendationTarget) {
    const { stage, need, drop } = applyLineup(atlas, result.subgenreId, state.stage)
    dispatch({ type: 'setLineup', stage, change: { need, drop } })
    dispatch({ type: 'navigate', destination: { level: 'system', genreId: result.genreId, subgenreId: result.subgenreId } })
    if (editing) close()
  }
  const performerName = (id: number) => {
    const performer = atlas.performers[id]
    return `${atlas.model.families[performer.family].name} ${atlas.model.sessions[performer.session].name}`
  }
  const change = state.lineupChange
  const changeText = change && (change.need.length || change.drop.length) ? [
    change.need.length ? `+ ${change.need.map(session => atlas.model.sessions[session].name).join(', ')} 등판` : '',
    change.drop.length ? `− ${change.drop.map(performerName).join(', ')} 퇴장` : '',
  ].filter(Boolean).join('   ') : change ? '편성 그대로 갑니다' : ''
  return <aside className={styles.recommendation} aria-label="연주자 편성으로 고른 세부장르 추천">
    <div className={styles.recommendationHeader}><span>추천{state.stage.length > 0 && <small> · 무대 {state.stage.length}명</small>}</span><div>
      <button ref={editButton} onClick={() => setEditing(true)} aria-label="무대 편성 편집"><Icon name="mix" size={16} /></button>
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
          <span className={styles.genreGlassLabel}><strong>{genre.name}</strong><small>{subgenre.name} · {Math.round(result.score * 100)}%</small></span>
        </button>
      </li>
    })}</ol>
    {!results.length && <p className={styles.emptyMix}>연주자를 무대에 올리면 어울리는 세부장르가 뜹니다.<br /><button className={styles.inlineAction} onClick={() => setEditing(true)}>무대 편성 열기 <Icon name="arrow" size={13} /></button></p>}
    {changeText && <p className={styles.lineupChange} role="status">{changeText}</p>}
    <dialog ref={dialog} className={`${styles.mixerDialog} ${styles.stageDialog}`} onKeyDown={containDialogFocus} onCancel={close} onClose={() => setEditing(false)} onClick={event => { if (event.target === event.currentTarget) close() }} aria-labelledby="mixerTitle">
      <div className={styles.dialogInner}>
        <div className={styles.panelHeading}><span>WHO'S ON STAGE</span><button onClick={close} aria-label="무대 편성 닫기"><Icon name="close" /></button></div>
        <h2 id="mixerTitle">Play it, <em>then find it.</em></h2>
        <p className={styles.dialogCopy}>장르 이름 대신 악기 편성으로 탐색합니다. 연주자를 무대에 올리면<br />그 편성으로 연주할 수 있는 세부장르가 순위로 제시됩니다.</p>

        <section className={styles.stageBox} aria-labelledby="stageTitle">
          <div className={styles.stageBoxHeader}><h3 id="stageTitle">무대 <span>{state.stage.length ? `${state.stage.length}명` : ''}</span></h3>
            <button className={styles.inlineAction} onClick={() => dispatch({ type: 'clearStage' })} disabled={!state.stage.length}>무대 비우기</button></div>
          {state.stage.length ? <ul className={styles.stageRow}>{state.stage.map(id => <li key={id}>
            <button className={styles.performerChip} aria-pressed="true" onClick={() => dispatch({ type: 'togglePerformer', id })} aria-label={`${performerName(id)} 무대에서 내리기`}>
              <small>{atlas.model.families[atlas.performers[id].family].name}</small>{atlas.model.sessions[atlas.performers[id].session].name}<Icon name="close" size={11} />
            </button></li>)}</ul>
            : <p className={styles.stageEmpty}>아래 벤치에서 연주자를 골라 무대에 올리세요.</p>}
          {changeText && <p className={styles.lineupChange}>{changeText}</p>}
        </section>

        <section className={styles.benchBox} aria-labelledby="benchTitle">
          <h3 id="benchTitle">벤치 · 세션 × 스타일 패밀리 {atlas.performers.length}명</h3>
          {atlas.model.families.map((family, familyIndex) => <div key={family.name} className={styles.benchFamily}>
            <div className={styles.benchFamilyName}><strong>{family.name}</strong><small>{family.genreIds.map(id => catalog.genreById.get(id)!.name).join(' · ')}</small></div>
            <div className={styles.benchRow}>{atlas.performers.filter(p => p.family === familyIndex).map(performer => {
              const on = state.stage.includes(performer.id)
              return <button key={performer.id} className={styles.performerChip} aria-pressed={on}
                aria-label={`${family.name} ${atlas.model.sessions[performer.session].name} ${on ? '무대에서 내리기' : '무대에 올리기'}`}
                onClick={() => dispatch({ type: 'togglePerformer', id: performer.id })}>{atlas.model.sessions[performer.session].name}</button>
            })}</div>
          </div>)}
        </section>

        <section className={styles.rankBox} aria-labelledby="rankTitle">
          <h3 id="rankTitle">세부장르 추천 {ranked.length > 0 && <span>{ranked.length}개</span>}</h3>
          {ranked.length ? <ol className={styles.rankList} start={current * RANK_PER_PAGE + 1}>{ranked.slice(current * RANK_PER_PAGE, (current + 1) * RANK_PER_PAGE).map(result => {
            const genre = catalog.genreById.get(result.genreId)!
            const subgenre = catalog.subgenreById.get(result.subgenreId)!
            const percent = Math.round(result.score * 100)
            return <li key={result.subgenreId}>
              <button style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => choose(result)}
                aria-label={`${subgenre.name}, ${genre.name}, ${subgenre.trackIds.length}곡, 적합도 ${percent}%. 이 세부장르로 이동`}>
                <span className={styles.rankName}>{subgenre.name}</span><span className={styles.rankScore}>{percent}%</span>
                <span className={styles.rankMeta}>{genre.name} · {subgenre.trackIds.length}곡{!state.genreVisits[genre.id] && ' · 미방문'}</span>
                <span className={styles.rankBar} aria-hidden="true"><i style={{ width: `${Math.max(3, percent)}%` }} /></span>
              </button>
            </li>
          })}</ol> : <p className={styles.stageEmpty}>연주자를 무대에 올리면 어울리는 세부장르가 뜹니다.</p>}
          {pages > 1 && <nav className={styles.pager} aria-label="세부장르 추천 페이지">
            <button onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="이전 페이지">‹</button>
            <span>{current + 1} / {pages}</span>
            <button onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="다음 페이지">›</button>
          </nav>}
        </section>

        <p className={styles.methodNote}>점수 = [0.86 × 적합도 + 0.14 × 규모] × 패밀리 친화도 × 탐험 보너스. 적합도는 무대 세션과 세부장르 악기 가중치의 F1이며, 곡이 적은 세부장르는 상위 장르 쪽으로 축소 추정합니다. 아직 방문하지 않은 장르는 6% 우대합니다. 세부장르를 고르면 핵심 세션이 등판하고 쓰이지 않는 연주자는 퇴장합니다.</p>
        <button className="outlinedButton" onClick={close}>이 편성으로 탐색하기 <Icon name="arrow" size={16} /></button>
      </div>
    </dialog>
  </aside>
}
