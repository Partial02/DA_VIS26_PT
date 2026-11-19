import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cellKey } from '../domain/category'
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
      <span className={styles.tableCorner} aria-hidden="true">장르 \ 세션</span>
      {sessions.map((session, s) => {
        const ids = columnIds(s)
        const on = ids.every(id => picked.has(id))
        return <button key={session.key} className={styles.sessionHead} aria-pressed={on} title={`${session.name} 열 전체 ${on ? '해제' : '선택'}`}
          aria-label={`${session.name} 세션 전체 ${on ? '해제' : '선택'}`} onClick={() => dispatch({ type: 'toggleCells', ids })}>
          <SessionGlyph session={session.key} size={14} />
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
              style={{ '--rate': .3 + .7 * Math.min(1, category.rate / .6) } as CSSProperties}
              aria-label={`${genre.name} × ${session.name}, ${category.tracks}곡, ${on ? '선택됨' : '선택 안 됨'}`}
              onPointerEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
              onClick={() => dispatch({ type: 'toggleCell', id })}>
              <SessionGlyph session={session.key} size={13} />
            </button>
          })}
        </div>
      })}
    </div>
    <p className={styles.cellInfo} aria-live="polite">{info && infoGenre
      ? <><b style={{ color: infoGenre.color }}>{shortGenreName(infoGenre.name)}</b> × {sessions[info.session].name} · {info.tracks}곡 · 장르 안 {Math.round(info.rate * 100)}% · 특이도 {info.lift.toFixed(2)}<small>{info.instruments.join(', ')}</small></>
      : <>칸을 누르면 그 장르 색 × 세션 무늬의 범주가 담깁니다. 행·열 머리는 한 줄 전체를 담습니다.</>}</p>
  </div>
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
  if (!ranked.length) return <p className={styles.stageEmpty}>표에서 범주를 고르면 그 조합에 어울리는 세부장르가 점수 순으로 뜹니다.</p>
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

/** Pick cells → see the subgenre ranking. */
export function StageConsole({ onChoose, perPage = 6 }: { onChoose?: () => void; perPage?: number }) {
  const { state, dispatch } = useExperience()
  return <div className={styles.stageConsole}>
    <section aria-labelledby="tableHeading">
      <div className={styles.stageHeader}><h3 id="tableHeading">범주 고르기 <span>{state.selection.length ? `${state.selection.length}칸` : '장르 색 × 세션 무늬'}</span></h3>
        <button className={styles.inlineAction} onClick={() => dispatch({ type: 'clearSelection' })} disabled={!state.selection.length}>비우기</button></div>
      <CategoryTable />
    </section>
    <section aria-labelledby="rankHeading">
      <h3 id="rankHeading">세부장르 추천</h3>
      <SubgenreRanking perPage={perPage} onChoose={onChoose} />
    </section>
  </div>
}
