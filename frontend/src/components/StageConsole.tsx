import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cellKey, crossCells } from '../domain/category'
import { rankRecommendations } from '../domain/recommendations'
import type { RecommendationTarget } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
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


/** English instrument names, keyed by session. */
const sessionEnglish: Record<string, string> = {
  drums: 'Drums', beats: 'Beats', percussion: 'Percussion', bass: 'Bass', electric_guitar: 'E. Guitar', acoustic_guitar: 'A. Guitar',
  piano: 'Piano', keys: 'Keys', synth: 'Synth', strings: 'Strings', brass: 'Brass', woodwind: 'Woodwind', mallets: 'Mallets',
  folk_reed: 'Reed', ethnic: 'Ethnic', vocal: 'Vocal',
}
export const instrumentName = (key: string) => sessionEnglish[key] ?? key
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

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
    <div className={styles.viewSwitch} role="group" aria-label="Table view">
      <button aria-pressed={!bubbles} onClick={() => setBubbles(false)}>Heatmap</button>
      <button aria-pressed={bubbles} onClick={() => setBubbles(true)}>Bubbles</button>
    </div>
    <div className={styles.categoryTable} data-bubbles={bubbles} role="group" aria-label={`${genres.length} genres × ${sessions.length} instruments`}
      style={{ '--sessions': sessions.length } as CSSProperties} onPointerLeave={() => setHover(null)}>
      <span className={styles.tableCorner} aria-hidden="true">Genre \ Inst.</span>
      {sessions.map((session, s) => {
        const ids = columnIds(s)
        const on = ids.every(id => picked.has(id))
        return <button key={session.key} className={styles.sessionHead} aria-pressed={on} title={`${on ? 'Deselect' : 'Select'} the whole ${instrumentName(session.key)} column`}
          aria-label={`${on ? 'Deselect' : 'Select'} the whole ${instrumentName(session.key)} column`} onClick={() => dispatch({ type: 'toggleCells', ids })}>
          <span aria-hidden="true">{instrumentName(session.key)}</span><SessionGlyph session={session.key} size={14} />
        </button>
      })}
      {genres.map(genre => {
        const ids = rowIds(genre.id)
        const rowOn = ids.every(id => picked.has(id))
        return <div key={genre.id} className={styles.tableRow} style={{ '--genre-color': genre.color } as CSSProperties}>
          <button className={styles.genreHead} aria-pressed={rowOn} title={`${rowOn ? 'Deselect' : 'Select'} the whole ${genre.name} row`}
            aria-label={`${rowOn ? 'Deselect' : 'Select'} the whole ${genre.name} row`} onClick={() => dispatch({ type: 'toggleCells', ids })}>
            <i aria-hidden="true" /><span>{shortGenreName(genre.name)}</span>
          </button>
          {sessions.map((session, s) => {
            const id = index.cellOf.get(cellKey(genre.id, s))
            if (id === undefined) return <span key={session.key} className={styles.cellVoid} aria-hidden="true" />
            const category = categories[id]
            const on = picked.has(id)
            return <button key={session.key} className={styles.cell} aria-pressed={on}
              style={{ '--heat': `${heat(category.rate)}%`, '--size': `${bubbleSize(category.rate)}%`, '--lift': liftStrength(category.lift) } as CSSProperties}
              aria-label={`${genre.name} × ${instrumentName(session.key)}, ${plural(category.tracks, 'song')}, used in ${Math.round(category.rate * 100)}% of the genre, ${on ? 'picked' : 'not picked'}`}
              onPointerEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
              onClick={() => dispatch({ type: 'toggleCell', id })}>
              {bubbles ? <i className={styles.bubble} aria-hidden="true" /> : <SessionGlyph session={session.key} size={13} />}
            </button>
          })}
        </div>
      })}
    </div>
    {bubbles ? <div className={styles.heatLegend} aria-hidden="true">
      <span className={styles.bubbleKey}><i style={{ width: 5 }} /><i style={{ width: 12 }} /></span><span>Size = share of the genre's songs using it</span>
      <span className={styles.bubbleKey}><i style={{ opacity: .3 }} /><i /></span><span>Depth = used more than in other genres</span>
      <small>Big, deep circles are a genre's signature instruments</small>
    </div> : <div className={styles.heatLegend} aria-hidden="true">
      <span>Rare</span><i /><span>Common</span>
      <small>The darker the cell, the more often the genre uses that instrument</small>
    </div>}
    <p className={styles.cellInfo} aria-live="polite">{info && infoGenre
      ? <><b style={{ color: infoGenre.color }}>{shortGenreName(infoGenre.name)}</b> × {instrumentName(sessions[info.session].key)} · {plural(info.tracks, 'song')} · used in {Math.round(info.rate * 100)}% · {info.lift.toFixed(1)}× the average<small>{info.instruments.join(', ')}</small></>
      : <>Tap a cell to pick that genre × instrument. Row and column heads pick the whole line.</>}</p>
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
  if (!ranked.length) return <p className={styles.stageEmpty}>Pick a genre and tap instrument orbs to rank the subgenres that match.</p>
  return <>
    <ol className={styles.rankList} start={current * perPage + 1}>{ranked.slice(current * perPage, (current + 1) * perPage).map((result, i) => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      const percent = Math.round(result.score * 100)
      return <li key={result.subgenreId}>
        <button style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => { choose(result); onChoose?.() }}
          aria-label={`#${current * perPage + i + 1} ${subgenre.name}, ${genre.name}, ${plural(subgenre.trackIds.length, 'song')}, score ${percent}. Go to this subgenre`}>
          <span className={styles.rankName}><i className={styles.rankDot} aria-hidden="true" />{subgenre.name}</span><span className={styles.rankScore}>{percent}</span>
          <span className={styles.rankMeta}>{genre.name} · {plural(subgenre.trackIds.length, 'song')}{!state.genreVisits[genre.id] && ' · Unvisited'}</span>
          <span className={styles.rankBar} aria-hidden="true"><i style={{ width: `${Math.max(3, percent)}%` }} /></span>
        </button>
      </li>
    })}</ol>
    {pages > 1 && <nav className={styles.pager} aria-label="Subgenre pages">
      <button onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">‹</button>
      <span>{current + 1} / {pages}</span>
      <button onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">›</button>
    </nav>}
  </>
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
  const hint = !open.length ? 'Pick a genre to see its instrument orbs.'
    : !state.selection.length ? 'Tap orbs to add the instruments you want. Big, deep orbs are the genre\'s signature sound.'
    : `${plural(state.selection.length, 'pick')} — jump to a match below.`
  return <div className={styles.chipPicker}>
    <fieldset>
      <legend><b>1</b> Which genre?</legend>
      <div className={styles.chipRow}>{genres.map(genre =>
        <button key={genre.id} className={styles.chip} aria-pressed={isOpen(genre.id)} title={genre.name}
          style={{ '--genre-color': genre.color } as CSSProperties} onClick={() => dispatch({ type: 'pickGenre', genreId: genre.id, rowIds: rowIds(genre.id) })}>
          <i className={styles.chipDot} aria-hidden="true" />{shortGenreName(genre.name)}
        </button>)}</div>
    </fieldset>
    {open.length > 0 && <fieldset>
      <legend><b>2</b> Which instruments?
        <span className={styles.orbLegend} aria-hidden="true"><i style={{ width: 6 }} /><i style={{ width: 12 }} />Size = how often<i style={{ opacity: .35 }} /><i />Depth = genre signature</span></legend>
      <div className={styles.orbRows} onPointerLeave={() => setHover(null)}>{open.map(genreId => {
        const genre = catalog.genreById.get(genreId)!
        const cells = rowIds(genreId).toSorted((a, b) => categories[b].rate - categories[a].rate)
        const count = cells.filter(id => picked.has(id)).length
        // The most used instruments first; rarer ones wait behind a "+n" orb unless already picked.
        const all = expanded.has(genreId)
        const visible = all ? cells : cells.filter((id, i) => i < FIRST_ORBS || picked.has(id))
        const hidden = cells.length - visible.length
        return <section key={genreId} className={styles.orbRow} style={{ '--genre-color': genre.color } as CSSProperties} aria-label={`${genre.name} instruments`}>
          <header><i className={styles.chipDot} aria-hidden="true" /><b>{shortGenreName(genre.name)}</b>{count > 0 && <small>{count} picked</small>}
            <button onClick={() => dispatch({ type: 'pickGenre', genreId, rowIds: cells })} aria-label={`Close ${genre.name}`} title="Remove this genre"><Icon name="close" size={12} /></button></header>
          <div className={styles.orbField}>{visible.map((id, i) => {
            const category = categories[id]
            const session = sessions[category.session]
            const on = picked.has(id)
            return <button key={id} className={styles.orbButton} aria-pressed={on}
              style={{ '--size': `${orbSize(category.rate)}px`, '--lift': liftStrength(category.lift), '--i': i } as CSSProperties}
              aria-label={`${genre.name} × ${instrumentName(session.key)}, used in ${Math.round(category.rate * 100)}% of the genre, ${category.lift.toFixed(1)}× the average, ${on ? 'picked' : 'not picked'}`}
              onPointerEnter={() => setHover(id)} onFocus={() => setHover(id)} onBlur={() => setHover(null)}
              onClick={() => dispatch({ type: 'toggleCell', id })}>
              <span className={styles.orb}><SessionGlyph session={session.key} size={13} /></span>
              <span className={styles.orbName}>{instrumentName(session.key)}</span>
            </button>
          })}
          {(hidden > 0 || all) && <button className={`${styles.orbButton} ${styles.orbMore}`} aria-expanded={all}
            style={{ '--i': visible.length } as CSSProperties}
            aria-label={all ? `Hide rarer ${genre.name} instruments` : `Show ${hidden} more ${genre.name} instruments`}
            onClick={() => setExpanded(previous => { const next = new Set(previous); if (all) next.delete(genreId); else next.add(genreId); return next })}>
            <span className={styles.orb}>{all ? '−' : `+${hidden}`}</span><span className={styles.orbName}>{all ? 'Less' : 'More'}</span>
          </button>}</div>
        </section>
      })}</div>
    </fieldset>}
    <p className={styles.pickerHint} aria-live="polite">{info
      ? <><b style={{ color: catalog.genreById.get(info.genreId)!.color }}>{shortGenreName(catalog.genreById.get(info.genreId)!.name)}</b> × {instrumentName(sessions[info.session].key)} · used in {Math.round(info.rate * 100)}% · {info.lift.toFixed(1)}× the average</>
      : hint}</p>
  </div>
}

/** Pick a genre → pick its instrument orbs → see the subgenre ranking; the full table folds below. */
export function StageConsole({ onChoose, perPage = 6 }: { onChoose?: () => void; perPage?: number }) {
  const { state, dispatch } = useExperience()
  const empty = !state.selection.length && !state.pickedGenres.length
  return <div className={styles.stageConsole}>
    <section aria-labelledby="pickHeading">
      <div className={styles.stageHeader}><h3 id="pickHeading">What do you want to hear? {state.selection.length > 0 && <span>{plural(state.selection.length, 'pick')}</span>}</h3>
        <button className={styles.inlineAction} onClick={() => dispatch({ type: 'clearSelection' })} disabled={empty}>Clear</button></div>
      <BubblePicker />
    </section>
    <section aria-labelledby="rankHeading">
      <h3 id="rankHeading">Matching subgenres</h3>
      <SubgenreRanking perPage={perPage} onChoose={onChoose} />
    </section>
    <details className={styles.tableDetails}>
      <summary>Full genre × instrument table <span>pick cell by cell</span></summary>
      <CategoryTable />
    </details>
  </div>
}
