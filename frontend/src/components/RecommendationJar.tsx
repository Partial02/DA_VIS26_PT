import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { subgenreProfile } from '../domain/category'
import { rankRecommendations, topGenreDestinations } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import { SessionGlyph } from './SessionGlyph'
import { instrumentName, shortGenreName, useChooseRecommendation } from './StageConsole'
import styles from './Interface.module.css'

/**
 * Inside a subgenre: the best subgenre of three other genres. The filter button turns the
 * dock itself into the genre × instrument picker (see Explore), so nothing floats apart.
 */
export function RecommendationJar({ onPick }: { onPick: () => void }) {
  const { catalog, state } = useExperience()
  const choose = useChooseRecommendation()
  const current = state.view.level === 'system' ? state.view.subgenreId : null
  const results = useMemo(() => topGenreDestinations(rankRecommendations(catalog, state.selection, state.genreVisits)
    .filter(result => result.subgenreId !== current)), [catalog, current, state.selection, state.genreVisits])
  const index = catalog.categories
  const pickedSessions = useMemo(() => new Set(index ? state.selection.map(id => index.cells[id].session) : []), [index, state.selection])
  return <aside className={styles.recommendation} aria-label="Subgenres matching your picks">
    <div className={styles.recommendationHeader}><span>Up next{state.selection.length > 0 && <small> · {state.selection.length} {state.selection.length === 1 ? 'pick' : 'picks'}</small>}</span>
      <button data-pick-entry onClick={onPick} aria-label="Open the genre × instrument picker" title="Genre × instrument picker"><Icon name="mix" size={16} /></button></div>
    <ol className={styles.genreRecommendations}>{results.map(result => {
      const genre = catalog.genreById.get(result.genreId)!
      const subgenre = catalog.subgenreById.get(result.subgenreId)!
      const signature = index ? signatureSessions(subgenreProfile(index, catalog, subgenre.id)) : []
      const names = signature.map(({ session }) => instrumentName(index!.model.sessions[session].key))
      const seed = [...subgenre.id].reduce((sum, char) => sum * 31 + char.charCodeAt(0) >>> 0, 7)
      return <li key={result.genreId}>
        <LiquidGlass as="button" className={styles.genreGlass} tint={genre.color} style={{ '--genre-color': genre.color } as CSSProperties}
          aria-label={`Explore ${subgenre.name} (${genre.name}), score ${Math.round(result.score * 100)}${names.length ? `, signature instruments ${names.join(', ')}` : ''}`}
          onClick={() => choose(result)}>
          {/* The subgenre's signature instruments as genre-colored orbs melting into the glass. */}
          <span className={styles.cardBlobs} aria-hidden="true">{signature.map(({ weight }, i) =>
            <i key={i} style={{ ...blobPlace(i, seed), '--d': `${Math.round(36 + 40 * weight)}%`, '--o': (.16 + .24 * weight).toFixed(2) } as CSSProperties} />)}</span>
          <span className={styles.genreGlassLabel}><strong>{subgenre.name}</strong><small>{shortGenreName(genre.name)} · {Math.round(result.score * 100)}</small></span>
          {signature.length > 0 && <span className={styles.cardOrbRow} aria-hidden="true">{signature.map(({ session, weight }) =>
            <i key={session} className={styles.cardOrb} data-matched={pickedSessions.has(session)} title={instrumentName(index!.model.sessions[session].key)}
              style={{ '--d': `${Math.round(16 + 8 * weight)}px` } as CSSProperties}>
              <SessionGlyph session={index!.model.sessions[session].key} size={10} />
            </i>)}</span>}
        </LiquidGlass>
      </li>
    })}</ol>
    {!results.length && <p className={styles.emptyMix}>Pick genres and instruments to see matching subgenres.<br /><button className={styles.inlineAction} onClick={onPick}>Open picker <Icon name="arrow" size={13} /></button></p>}
  </aside>
}

/** The three sessions most typical of a subgenre (profile already scaled so the top one is 1). */
function signatureSessions(profile: readonly number[]) {
  return profile.map((weight, session) => ({ session, weight })).filter(({ weight }) => weight > 0)
    .sort((a, b) => b.weight - a.weight).slice(0, 3)
}

/** Blob centers: three loose slots, nudged per subgenre so no two cards look alike. */
function blobPlace(i: number, seed: number): CSSProperties {
  const slots = [[26, 30], [76, 72], [74, 20]]
  const jitter = (shift: number) => ((seed >>> shift) % 17) - 8
  return { left: `${slots[i][0] + jitter(i * 5)}%`, top: `${slots[i][1] + jitter(i * 5 + 3)}%`, animationDelay: `${-((seed >>> i * 3) % 9)}s` }
}
