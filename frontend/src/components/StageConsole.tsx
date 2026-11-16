import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { applyLineup } from '../domain/atlas'
import { rankRecommendations } from '../domain/recommendations'
import type { RecommendationTarget } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { drawStage, nebulaUrl, performerSpec } from './nebula'
import styles from './Interface.module.css'

const PERFORMER_MIME = 'application/x-innerverse-performer'

export function useChooseRecommendation() {
  const { catalog, state, dispatch } = useExperience()
  return (result: RecommendationTarget) => {
    const { stage, need, drop } = applyLineup(catalog.atlas!, result.subgenreId, state.stage)
    dispatch({ type: 'setLineup', stage, change: { need, drop } })
    dispatch({ type: 'navigate', destination: { level: 'system', genreId: result.genreId, subgenreId: result.subgenreId } })
  }
}

export function useLineupText() {
  const { catalog, state } = useExperience()
  const atlas = catalog.atlas!
  const change = state.lineupChange
  if (!change) return ''
  if (!change.need.length && !change.drop.length) return '편성 그대로 갑니다'
  return [
    change.need.length ? `+ ${change.need.map(session => atlas.model.sessions[session].name).join(', ')} 등판` : '',
    change.drop.length ? `− ${change.drop.map(id => `${atlas.model.families[atlas.performers[id].family].name} ${atlas.model.sessions[atlas.performers[id].session].name}`).join(', ')} 퇴장` : '',
  ].filter(Boolean).join('   ')
}

/** The staged performer nebulae merged into one system. */
export function StageSystem({ size = 220 }: { size?: number }) {
  const { catalog, state, dispatch } = useExperience()
  const atlas = catalog.atlas!
  const canvas = useRef<HTMLCanvasElement>(null)
  const [over, setOver] = useState(false)
  const specs = useMemo(() => state.stage.map(id => performerSpec(atlas, catalog, id)), [atlas, catalog, state.stage])
  useEffect(() => { if (canvas.current) drawStage(canvas.current, specs) }, [specs])
  const drop = (event: DragEvent) => {
    event.preventDefault(); setOver(false)
    const id = Number(event.dataTransfer.getData(PERFORMER_MIME))
    if (Number.isInteger(id) && atlas.performers[id] && !state.stage.includes(id)) dispatch({ type: 'togglePerformer', id })
  }
  const label = state.stage.length
    ? `무대의 성운: ${state.stage.map(id => `${atlas.model.families[atlas.performers[id].family].name} ${atlas.model.sessions[atlas.performers[id].session].name}`).join(', ')}`
    : '빈 무대'
  return <div className={styles.stageSystem} data-over={over} data-empty={!state.stage.length} style={{ '--stage-size': `${size}px` } as CSSProperties}
    onDragOver={event => { if (event.dataTransfer.types.includes(PERFORMER_MIME)) { event.preventDefault(); setOver(true) } }}
    onDragLeave={() => setOver(false)} onDrop={drop}>
    <canvas ref={canvas} width={size * 2} height={size * 2} role="img" aria-label={label} />
    {!state.stage.length && <p>성운을 눌러 무대에 올리세요<br /><small>끌어다 놓아도 됩니다</small></p>}
  </div>
}

/** Rows: style families. Columns: sessions. 22 of the 45 cells hold a performer nebula. */
export function PerformerBench() {
  const { catalog, state, dispatch } = useExperience()
  const atlas = catalog.atlas!
  const { sessions, families } = atlas.model
  return <div className={styles.bench} role="group" aria-label={`벤치: 세션 × 스타일 패밀리 연주자 ${atlas.performers.length}명`}
    style={{ '--sessions': sessions.length } as CSSProperties}>
    <span aria-hidden="true" />
    {sessions.map(session => <span key={session.key} className={styles.benchSession} aria-hidden="true" title={session.name}>{session.name}</span>)}
    {families.map((family, familyIndex) => <div key={family.name} className={styles.benchRowGroup} role="group" aria-label={`${family.name}: ${family.genreIds.map(id => catalog.genreById.get(id)!.name).join(', ')}`}>
      <span className={styles.benchFamily} title={family.genreIds.map(id => catalog.genreById.get(id)!.name).join(' · ')}>
        <strong>{family.name}</strong>
        <i aria-hidden="true">{family.genreIds.map(id => <b key={id} style={{ background: catalog.genreById.get(id)!.color }} />)}</i>
      </span>
      {sessions.map((session, sessionIndex) => {
        const performer = atlas.performers.find(p => p.family === familyIndex && p.session === sessionIndex)
        if (!performer) return <span key={session.key} className={styles.benchVoid} aria-hidden="true" />
        const on = state.stage.includes(performer.id)
        return <button key={session.key} className={styles.nebulaToken} aria-pressed={on} draggable={!on}
          aria-label={`${family.name} ${session.name} ${on ? '무대에서 내리기' : '무대에 올리기'}`} title={`${family.name} ${session.name}`}
          onDragStart={event => { event.dataTransfer.setData(PERFORMER_MIME, String(performer.id)); event.dataTransfer.effectAllowed = 'copy' }}
          onClick={() => dispatch({ type: 'togglePerformer', id: performer.id })}>
          <img src={nebulaUrl(performerSpec(atlas, catalog, performer.id))} alt="" draggable={false} />
        </button>
      })}
    </div>)}
  </div>
}

export function SubgenreRanking({ perPage = 6, onChoose }: { perPage?: number; onChoose?: () => void }) {
  const { catalog, state } = useExperience()
  const choose = useChooseRecommendation()
  const [page, setPage] = useState(0)
  const ranked = useMemo(() => rankRecommendations(catalog, state.stage, state.genreVisits), [catalog, state.stage, state.genreVisits])
  const stageKey = state.stage.toSorted((a, b) => a - b).join(',')
  useEffect(() => { setPage(0) }, [stageKey])
  const pages = Math.max(1, Math.ceil(ranked.length / perPage))
  const current = Math.min(page, pages - 1)
  if (!ranked.length) return <p className={styles.stageEmpty}>연주자를 무대에 올리면 그 편성으로 연주할 수 있는 세부장르가 순위로 뜹니다.</p>
  return <>
    <ol className={styles.rankList} start={current * perPage + 1}>{ranked.slice(current * perPage, (current + 1) * perPage).map(result => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      const percent = Math.round(result.score * 100)
      return <li key={result.subgenreId}>
        <button style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => { choose(result); onChoose?.() }}
          aria-label={`${subgenre.name}, ${genre.name}, ${subgenre.trackIds.length}곡, 적합도 ${percent}%. 이 세부장르로 이동`}>
          <span className={styles.rankName}>{subgenre.name}</span><span className={styles.rankScore}>{percent}%</span>
          <span className={styles.rankMeta}>{genre.name} · {subgenre.trackIds.length}곡{!state.genreVisits[genre.id] && ' · 미방문'}</span>
          <span className={styles.rankBar} aria-hidden="true"><i style={{ width: `${Math.max(3, percent)}%` }} /></span>
        </button>
      </li>
    })}</ol>
    {pages > 1 && <nav className={styles.pager} aria-label="세부장르 추천 페이지">
      <button onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="이전 페이지">‹</button>
      <span>{current + 1} / {pages}</span>
      <button onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="다음 페이지">›</button>
    </nav>}
  </>
}

/** Stage → bench → ranking, the Genre Atlas order of work. */
export function StageConsole({ onChoose, stageSize = 200, perPage = 6 }: { onChoose?: () => void; stageSize?: number; perPage?: number }) {
  const { state, dispatch } = useExperience()
  const lineup = useLineupText()
  return <div className={styles.stageConsole}>
    <section aria-labelledby="stageHeading">
      <div className={styles.stageHeader}><h3 id="stageHeading">무대 <span>{state.stage.length ? `${state.stage.length}명` : ''}</span></h3>
        <button className={styles.inlineAction} onClick={() => dispatch({ type: 'clearStage' })} disabled={!state.stage.length}>무대 비우기</button></div>
      <StageSystem size={stageSize} />
      {lineup && <p className={styles.lineupChange} role="status">{lineup}</p>}
    </section>
    <section aria-labelledby="benchHeading">
      <h3 id="benchHeading">벤치 <span>세션 × 스타일 패밀리</span></h3>
      <PerformerBench />
    </section>
    <section aria-labelledby="rankHeading">
      <h3 id="rankHeading">세부장르 추천</h3>
      <SubgenreRanking perPage={perPage} onChoose={onChoose} />
    </section>
  </div>
}

export function StagePanel({ onClose }: { onClose: () => void }) {
  return <section className={styles.stagePanel} aria-label="무대 편성과 세부장르 추천"
    onKeyDown={event => { if (event.key === 'Escape' && !(event.target as Element).closest('dialog')) { event.stopPropagation(); onClose() } }}>
    <div className={styles.utilityPanelHeader}><span>STAGE · 연주자를 무대에 올려 세부장르 찾기</span>
      <button onClick={onClose} aria-label="무대 패널 닫기"><Icon name="close" size={18} /></button></div>
    <div className={styles.stagePanelBody}><StageConsole /></div>
  </section>
}
