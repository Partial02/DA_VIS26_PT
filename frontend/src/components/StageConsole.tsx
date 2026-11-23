import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cellKey, crossCells } from '../domain/category'
import { rankRecommendations } from '../domain/recommendations'
import type { RecommendationTarget } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { SessionGlyph } from './SessionGlyph'
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
  const picked = useMemo(() => new Set(state.selection), [state.selection])
  const rowIds = (genreId: string) => sessions.map((_, s) => index.cellOf.get(cellKey(genreId, s))).filter((id): id is number => id !== undefined)
  const columnIds = (session: number) => genres.map(g => index.cellOf.get(cellKey(g.id, session))).filter((id): id is number => id !== undefined)
  const info = hover !== null ? categories[hover] : null
  const infoGenre = info ? catalog.genreById.get(info.genreId)! : null
  return <div className={styles.categoryTableWrap}>
    <div className={styles.categoryTable} role="group" aria-label={`장르 ${genres.length}개 × 세션 ${sessions.length}개 범주 선택표`}
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
              style={{ '--heat': `${heat(category.rate)}%` } as CSSProperties}
              aria-label={`${genre.name} × ${session.name}, ${category.tracks}곡, 장르 곡의 ${Math.round(category.rate * 100)}%, ${on ? '선택됨' : '선택 안 됨'}`}
              onPointerEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
              onClick={() => dispatch({ type: 'toggleCell', id })}>
              <SessionGlyph session={session.key} size={13} />
            </button>
          })}
        </div>
      })}
    </div>
    <div className={styles.heatLegend} aria-hidden="true">
      <span>드물게 씀</span><i /><span>자주 씀</span>
      <small>칸이 진할수록 그 장르 곡에서 그 악기가 자주 쓰여요</small>
    </div>
    <p className={styles.cellInfo} aria-live="polite">{info && infoGenre
      ? <><b style={{ color: infoGenre.color }}>{shortGenreName(infoGenre.name)}</b> × {sessions[info.session].name} · {info.tracks}곡 · 장르 곡의 {Math.round(info.rate * 100)}%가 사용 · 전체 평균의 {info.lift.toFixed(1)}배<small>{info.instruments.join(', ')}</small></>
      : <>칸을 누르면 그 장르 × 악기 조합이 담겨요. 행·열 머리를 누르면 한 줄 전체가 담겨요.</>}</p>
  </div>
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
  if (!ranked.length) return <p className={styles.stageEmpty}>장르와 악기를 고르면 그 조합에 어울리는 세부장르가 점수 순으로 떠요.</p>
  return <>
    <ol className={styles.rankList} start={current * perPage + 1}>{ranked.slice(current * perPage, (current + 1) * perPage).map((result, i) => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      const percent = Math.round(result.score * 100)
      return <li key={result.subgenreId}>
        <button style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => { choose(result); onChoose?.() }}
          aria-label={`${current * perPage + i + 1}위 ${subgenre.name}, ${genre.name}, ${subgenre.trackIds.length}곡, 점수 ${percent}. 이 세부장르로 이동`}>
          <span className={styles.rankName}><i className={styles.rankDot} aria-hidden="true" />{subgenre.name}</span><span className={styles.rankScore}>{percent}</span>
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

/**
 * Two-step picker: genre chips × instrument chips. The selection is their cross product
 * (plus any cell picked by hand in the table). A chip shows how many of its cells are picked.
 */
export function ChipPicker() {
  const { catalog, state, dispatch } = useExperience()
  const index = catalog.categories!
  const { sessions, genres } = index.model
  const allSessions = sessions.map((_, s) => s)
  const allGenres = genres.map(g => g.id)
  const picked = useMemo(() => state.selection.map(id => index.cells[id]), [index, state.selection])
  const genresOn = new Set(state.pickedGenres), sessionsOn = new Set(state.pickedSessions)
  const line = (ids: number[]) => ids.map(id => ({ id, ...index.cells[id] }))
  const pickGenre = (genreId: string) => dispatch({ type: 'pickChip', chip: { genreId }, line: line(crossCells(index, [genreId], allSessions)) })
  const pickSession = (session: number) => dispatch({ type: 'pickChip', chip: { session }, line: line(crossCells(index, allGenres, [session])) })
  const g = state.pickedGenres.length, n = state.pickedSessions.length
  const hint = !g && !n ? '장르와 악기를 하나 이상씩 고르면, 그 조합에 맞는 세부장르를 바로 찾아 드려요.'
    : !n ? '이제 듣고 싶은 악기를 골라 보세요.'
    : !g ? '어느 장르에서 찾을지 골라 보세요.'
    : `장르 ${g}개 × 악기 ${n}개로 찾는 중이에요. 칩을 더 누르면 조합이 늘어나요.`
  return <div className={styles.chipPicker}>
    <fieldset>
      <legend><b>1</b> 장르</legend>
      <div className={styles.chipRow}>{genres.map(genre => {
        const count = picked.filter(cell => cell.genreId === genre.id).length
        return <button key={genre.id} className={styles.chip} aria-pressed={genresOn.has(genre.id)} title={genre.name}
          style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => pickGenre(genre.id)}>
          <i className={styles.chipDot} aria-hidden="true" />{shortGenreName(genre.name)}{count > 0 && !genresOn.has(genre.id) && <small aria-label={`표에서 ${count}칸`}>{count}</small>}
        </button>
      })}</div>
    </fieldset>
    <fieldset>
      <legend><b>2</b> 악기</legend>
      <div className={styles.chipRow}>{sessions.map((session, s) => {
        const count = picked.filter(cell => cell.session === s).length
        return <button key={session.key} className={`${styles.chip} ${styles.sessionChip}`} aria-pressed={sessionsOn.has(s)} onClick={() => pickSession(s)}>
          <SessionGlyph session={session.key} size={13} />{session.name}{count > 0 && !sessionsOn.has(s) && <small aria-label={`표에서 ${count}칸`}>{count}</small>}
        </button>
      })}</div>
    </fieldset>
    <p className={styles.pickerHint} aria-live="polite">{hint}</p>
  </div>
}

/** Pick genres × instruments → see the subgenre ranking; the full table folds below. */
export function StageConsole({ onChoose, perPage = 6 }: { onChoose?: () => void; perPage?: number }) {
  const { state, dispatch } = useExperience()
  const empty = !state.selection.length && !state.pickedGenres.length && !state.pickedSessions.length
  return <div className={styles.stageConsole}>
    <section aria-labelledby="pickHeading">
      <div className={styles.stageHeader}><h3 id="pickHeading">무엇을 듣고 싶나요? {state.selection.length > 0 && <span>{state.selection.length}칸</span>}</h3>
        <button className={styles.inlineAction} onClick={() => dispatch({ type: 'clearSelection' })} disabled={empty}>비우기</button></div>
      <ChipPicker />
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
