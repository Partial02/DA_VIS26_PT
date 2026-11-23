import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cellKey, crossCells } from '../domain/category'
import { rankRecommendations } from '../domain/recommendations'
import type { RecommendationTarget } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { SessionGlyph } from './SessionGlyph'
import { SignatureOrbs, usePickedSessions, useSignature } from './SignatureOrbs'
import styles from './Interface.module.css'

export function useChooseRecommendation() {
  const { dispatch } = useExperience()
  return (result: RecommendationTarget) =>
    dispatch({ type: 'navigate', destination: { level: 'system', genreId: result.genreId, subgenreId: result.subgenreId } })
}

export function shortGenreName(name: string) {
  return name.replace('Easy Listening / Chill', 'Easy · Chill').replace(' / New Age', '').replace(' / Soul / R&B', ' · Soul')
    .replace(' / Caribbean', '').replace(' / Country', ' · Country')
}

/** Column-head label: at most three syllables so the vertical labels line up. */
export function shortSessionName(name: string) {
  return ({ '일렉 기타': '일렉', '어쿠스틱 기타': '통기타', '민속 악기': '민속' } as Record<string, string>)[name] ?? name
}

/**
 * Rows: 15 genres, drawn in their colors. Columns: 16 sessions, drawn as patterns.
 * Each of the 231 existing cells is genre color × session pattern. Row and column
 * headers pick (or drop) the whole line.
 */
export function CategoryTable() {
  const { catalog, state, dispatch } = useExperience()
  const index = catalog.categories!
  const { sessions, genres, categories } = index.model
  const [hover, setHover] = useState<number | null>(null)
  const [bubbles, setBubbles] = useState(false)
  const picked = useMemo(() => new Set(state.selection), [state.selection])
  const rowIds = (genreId: string) => sessions.map((_, s) => index.cellOf.get(cellKey(genreId, s))).filter((id): id is number => id !== undefined)
  const columnIds = (session: number) => genres.map(g => index.cellOf.get(cellKey(g.id, session))).filter((id): id is number => id !== undefined)
  const info = hover !== null ? categories[hover] : null
  const infoGenre = info ? catalog.genreById.get(info.genreId)! : null
  return <div className={styles.categoryTableWrap}>
    <div className={styles.viewSwitch} role="group" aria-label="표 보기 방식">
      <button aria-pressed={!bubbles} onClick={() => setBubbles(false)}>히트맵</button>
      <button aria-pressed={bubbles} onClick={() => setBubbles(true)}>버블</button>
    </div>
    <div className={styles.categoryTable} data-bubbles={bubbles} role="group" aria-label={`장르 ${genres.length}개 × 세션 ${sessions.length}개 범주 선택표`}
      style={{ '--sessions': sessions.length } as CSSProperties} onPointerLeave={() => setHover(null)}>
      <span className={styles.tableCorner} aria-hidden="true">장르 \ 악기</span>
      {sessions.map((session, s) => {
        const ids = columnIds(s)
        const on = ids.every(id => picked.has(id))
        return <button key={session.key} className={styles.sessionHead} aria-pressed={on} title={`${session.name} 열 전체 ${on ? '해제' : '선택'}`}
          aria-label={`${session.name} 열 전체 ${on ? '해제' : '선택'}`} onClick={() => dispatch({ type: 'toggleCells', ids })}>
          <span aria-hidden="true">{shortSessionName(session.name)}</span><SessionGlyph session={session.key} size={14} />
        </button>
      })}
      {genres.map(genre => {
        const ids = rowIds(genre.id)
        const rowOn = ids.every(id => picked.has(id))
        return <div key={genre.id} className={styles.tableRow} style={{ '--genre-color': genre.color } as CSSProperties}>
          <button className={styles.genreHead} aria-pressed={rowOn} title={`${genre.name} 행 전체 ${rowOn ? '해제' : '선택'}`}
            aria-label={`${genre.name} 장르 전체 ${rowOn ? '해제' : '선택'}`} onClick={() => dispatch({ type: 'toggleCells', ids })}>
            <i aria-hidden="true" /><span>{shortGenreName(genre.name)}</span>
          </button>
          {sessions.map((session, s) => {
            const id = index.cellOf.get(cellKey(genre.id, s))
            if (id === undefined) return <span key={session.key} className={styles.cellVoid} aria-hidden="true" />
            const category = categories[id]
            const on = picked.has(id)
            return <button key={session.key} className={styles.cell} aria-pressed={on}
              style={{ '--heat': `${heat(category.rate)}%`, '--size': `${bubbleSize(category.rate)}%`, '--lift': liftStrength(category.lift) } as CSSProperties}
              aria-label={`${genre.name} × ${session.name}, ${category.tracks}곡, 장르 곡의 ${Math.round(category.rate * 100)}%, ${on ? '선택됨' : '선택 안 됨'}`}
              onPointerEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
              onClick={() => dispatch({ type: 'toggleCell', id })}>
              {bubbles ? <i className={styles.bubble} aria-hidden="true" /> : <SessionGlyph session={session.key} size={13} />}
            </button>
          })}
        </div>
      })}
    </div>
    {bubbles ? <div className={styles.heatLegend} aria-hidden="true">
      <span className={styles.bubbleKey}><i style={{ width: 5 }} /><i style={{ width: 12 }} /></span><span>원 크기 = 장르 곡 중 사용 비율</span>
      <span className={styles.bubbleKey}><i style={{ opacity: .3 }} /><i /></span><span>진하기 = 다른 장르보다 유독 많이 씀</span>
      <small>크고 진한 원이 그 장르를 대표하는 악기예요</small>
    </div> : <div className={styles.heatLegend} aria-hidden="true">
      <span>드물게 씀</span><i /><span>자주 씀</span>
      <small>칸이 진할수록 그 장르 곡에서 그 악기가 자주 쓰여요</small>
    </div>}
    <p className={styles.cellInfo} aria-live="polite">{info && infoGenre
      ? <><b style={{ color: infoGenre.color }}>{shortGenreName(infoGenre.name)}</b> × {sessions[info.session].name} · {info.tracks}곡 · 장르 곡의 {Math.round(info.rate * 100)}%가 사용 · 전체 평균의 {info.lift.toFixed(1)}배<small>{info.instruments.join(', ')}</small></>
      : <>칸을 누르면 그 장르 × 악기 조합이 담겨요. 행·열 머리를 누르면 한 줄 전체가 담겨요.</>}</p>
  </div>
}

/** Bubble diameter (percent of the cell): area grows with the share of the genre's songs using the session. */
function bubbleSize(rate: number) {
  return Math.round(18 + 82 * Math.sqrt(Math.min(1, rate)))
}

/** Bubble opacity from lift on a log scale: ≤ 0.37× is faint, 1× is middling, ≥ 2.7× is full. */
function liftStrength(lift: number) {
  return +(.22 + .78 * Math.min(1, Math.max(0, (Math.log(lift) + 1) / 2))).toFixed(2)
}

/** Fill strength (percent of the genre color) for a cell: share of the genre's songs using the session. */
function heat(rate: number) {
  return Math.round(6 + 58 * Math.min(1, rate / .7))
}

export function SubgenreRanking({ perPage = 6, onChoose }: { perPage?: number; onChoose?: () => void }) {
  const { catalog, state } = useExperience()
  const choose = useChooseRecommendation()
  const [page, setPage] = useState(0)
  const ranked = useMemo(() => rankRecommendations(catalog, state.selection, state.genreVisits), [catalog, state.selection, state.genreVisits])
  const selectionKey = state.selection.toSorted((a, b) => a - b).join(',')
  useEffect(() => { setPage(0) }, [selectionKey])
  const pages = Math.max(1, Math.ceil(ranked.length / perPage))
  const current = Math.min(page, pages - 1)
  if (!ranked.length) return <p className={styles.stageEmpty}>장르를 고르고 악기 구슬을 누르면 어울리는 세부장르가 점수 순으로 떠요.</p>
  return <>
    <ol className={styles.rankList} start={current * perPage + 1}>{ranked.slice(current * perPage, (current + 1) * perPage).map((result, i) =>
      <li key={result.subgenreId}><RankRow result={result} rank={current * perPage + i + 1} onChoose={() => { choose(result); onChoose?.() }} /></li>)}</ol>
    {pages > 1 && <nav className={styles.pager} aria-label="세부장르 추천 페이지">
      <button onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="이전 페이지">‹</button>
      <span>{current + 1} / {pages}</span>
      <button onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="다음 페이지">›</button>
    </nav>}
  </>
}

/** One ranked subgenre: name, signature orbs and score; the meta line names the signature instruments, matches lit. */
function RankRow({ result, rank, onChoose }: { result: RecommendationTarget; rank: number; onChoose: () => void }) {
  const { catalog, state } = useExperience()
  const genre = catalog.genreById.get(result.genreId)!
  const subgenre = catalog.subgenreById.get(result.subgenreId)!
  const signature = useSignature(subgenre.id)
  const picked = usePickedSessions()
  const percent = Math.round(result.score * 100)
  return <button className={styles.rankRow} style={{ '--genre-color': genre.color } as CSSProperties} onClick={onChoose}
    aria-label={`${rank}위 ${subgenre.name}, ${genre.name}, ${subgenre.trackIds.length}곡, 점수 ${percent}${signature.length ? `, 대표 악기 ${signature.map(s => s.name).join(', ')}` : ''}. 이 세부장르로 이동`}>
    <span className={styles.rankName}><i className={styles.rankDot} aria-hidden="true" />{subgenre.name}</span>
    <SignatureOrbs signature={signature} picked={picked} min={15} span={7} />
    <span className={styles.rankScore}>{percent}</span>
    <span className={styles.rankMeta}>{genre.name} · {subgenre.trackIds.length}곡{signature.map(item =>
      <span key={item.session}> · <span data-matched={picked.has(item.session)}>{item.name}</span></span>)}{!state.genreVisits[genre.id] && ' · 미방문'}</span>
    <span className={styles.rankBar} aria-hidden="true"><i style={{ width: `${Math.max(3, percent)}%` }} /></span>
  </button>
}

/** Orbs shown per genre before the "+n" orb (one line at the default panel width). */
const FIRST_ORBS = 6

/** Orb diameter in px: area grows with the share of the genre's songs using the session. */
function orbSize(rate: number) {
  return Math.round(22 + 30 * Math.sqrt(Math.min(1, rate)))
}

/**
 * Step 1 asks for genres. Each opened genre pops out a row of instrument orbs, most used first:
 * size = share of the genre's songs using it, depth = lift. Orbs are the buttons that pick cells.
 */
export function BubblePicker() {
  const { catalog, state, dispatch } = useExperience()
  const index = catalog.categories!
  const { sessions, genres, categories } = index.model
  const [hover, setHover] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const picked = useMemo(() => new Set(state.selection), [state.selection])
  const allSessions = sessions.map((_, s) => s)
  const rowIds = (genreId: string) => crossCells(index, [genreId], allSessions)
  const holding = new Set(state.selection.map(id => index.cells[id].genreId))
  // Newest genre on top, so its orbs pop right under the chips; genres opened only by table picks follow.
  const open = [...state.pickedGenres].reverse().concat(genres.map(g => g.id).filter(id => holding.has(id) && !state.pickedGenres.includes(id)))
  const isOpen = (genreId: string) => open.includes(genreId)
  const info = hover !== null ? categories[hover] : null
  const hint = !open.length ? '장르를 고르면 그 장르의 악기 구슬이 나와요.'
    : !state.selection.length ? '구슬을 눌러 듣고 싶은 악기를 담아 보세요. 크고 진한 구슬이 그 장르의 대표 악기예요.'
    : `${state.selection.length}개 담았어요. 아래 추천에서 바로 떠날 수 있어요.`
  return <div className={styles.chipPicker}>
    <fieldset>
      <legend><b>1</b> 어떤 장르?</legend>
      <div className={styles.chipRow}>{genres.map(genre =>
        <button key={genre.id} className={styles.chip} aria-pressed={isOpen(genre.id)} title={genre.name}
          style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => dispatch({ type: 'pickGenre', genreId: genre.id, rowIds: rowIds(genre.id) })}>
          <i className={styles.chipDot} aria-hidden="true" />{shortGenreName(genre.name)}
        </button>)}</div>
    </fieldset>
    {open.length > 0 && <fieldset>
      <legend><b>2</b> 어떤 악기?
        <span className={styles.orbLegend} aria-hidden="true"><i style={{ width: 6 }} /><i style={{ width: 12 }} />크기 = 자주 씀<i style={{ opacity: .35 }} /><i />진하기 = 이 장르만의 색</span></legend>
      <div className={styles.orbRows} onPointerLeave={() => setHover(null)}>{open.map(genreId => {
        const genre = catalog.genreById.get(genreId)!
        const cells = rowIds(genreId).toSorted((a, b) => categories[b].rate - categories[a].rate)
        const count = cells.filter(id => picked.has(id)).length
        // The most used instruments first; rarer ones wait behind a "+n" orb unless already picked.
        const all = expanded.has(genreId)
        const visible = all ? cells : cells.filter((id, i) => i < FIRST_ORBS || picked.has(id))
        const hidden = cells.length - visible.length
        return <section key={genreId} className={styles.orbRow} style={{ '--genre-color': genre.color } as CSSProperties} aria-label={`${genre.name} 악기`}>
          <header><i className={styles.chipDot} aria-hidden="true" /><b>{shortGenreName(genre.name)}</b>{count > 0 && <small>{count}개 담음</small>}
            <button onClick={() => dispatch({ type: 'pickGenre', genreId, rowIds: cells })} aria-label={`${genre.name} 닫기`} title="이 장르 빼기"><Icon name="close" size={12} /></button></header>
          <div className={styles.orbField}>{visible.map((id, i) => {
            const category = categories[id]
            const session = sessions[category.session]
            const on = picked.has(id)
            return <button key={id} className={styles.orbButton} aria-pressed={on}
              style={{ '--size': `${orbSize(category.rate)}px`, '--lift': liftStrength(category.lift), '--i': i } as CSSProperties}
              aria-label={`${genre.name} × ${session.name}, 장르 곡의 ${Math.round(category.rate * 100)}%, 평균의 ${category.lift.toFixed(1)}배, ${on ? '담김' : '담기'}`}
              onPointerEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
              onClick={() => dispatch({ type: 'toggleCell', id })}>
              <span className={styles.orb}><SessionGlyph session={session.key} size={13} /></span>
              <span className={styles.orbName}>{shortSessionName(session.name)}</span>
            </button>
          })}
          {(hidden > 0 || all) && <button className={`${styles.orbButton} ${styles.orbMore}`} aria-expanded={all}
            style={{ '--i': visible.length } as CSSProperties}
            aria-label={all ? `${genre.name} 드문 악기 접기` : `${genre.name} 악기 ${hidden}개 더 보기`}
            onClick={() => setExpanded(previous => { const next = new Set(previous); if (all) next.delete(genreId); else next.add(genreId); return next })}>
            <span className={styles.orb}>{all ? '−' : `+${hidden}`}</span><span className={styles.orbName}>{all ? '접기' : '더 보기'}</span>
          </button>}</div>
        </section>
      })}</div>
    </fieldset>}
    <p className={styles.pickerHint} aria-live="polite">{info
      ? <><b style={{ color: catalog.genreById.get(info.genreId)!.color }}>{shortGenreName(catalog.genreById.get(info.genreId)!.name)}</b> × {sessions[info.session].name} · 장르 곡의 {Math.round(info.rate * 100)}%가 사용 · 전체 평균의 {info.lift.toFixed(1)}배</>
      : hint}</p>
  </div>
}

/** Pick a genre → pick its instrument orbs → see the subgenre ranking; the full table folds below. */
export function StageConsole({ onChoose, perPage = 6 }: { onChoose?: () => void; perPage?: number }) {
  const { state, dispatch } = useExperience()
  const empty = !state.selection.length && !state.pickedGenres.length
  return <div className={styles.stageConsole}>
    <section aria-labelledby="pickHeading">
      <div className={styles.stageHeader}><h3 id="pickHeading">무엇을 듣고 싶나요? {state.selection.length > 0 && <span>{state.selection.length}칸</span>}</h3>
        <button className={styles.inlineAction} onClick={() => dispatch({ type: 'clearSelection' })} disabled={empty}>비우기</button></div>
      <BubblePicker />
    </section>
    <section aria-labelledby="rankHeading">
      <h3 id="rankHeading">세부장르 추천</h3>
      <SubgenreRanking perPage={perPage} onChoose={onChoose} />
    </section>
    <details className={styles.tableDetails}>
      <summary>장르 × 악기 표 자세히 보기 <span>칸 하나씩 고르기</span></summary>
      <CategoryTable />
    </details>
  </div>
}
