import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { RecommendationTarget } from '../domain/recommendations'
import { rankRecommendations, topGenreDestinations } from '../domain/recommendations'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import { SignatureOrbs, usePickedSessions, useSignature } from './SignatureOrbs'
import { shortGenreName, useChooseRecommendation } from './StageConsole'
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
  return <aside className={styles.recommendation} aria-label="고른 범주로 찾은 세부장르 추천">
    <div className={styles.recommendationHeader}><span>다음 추천{state.selection.length > 0 && <small> · {state.selection.length}칸</small>}</span>
      <button data-pick-entry onClick={onPick} aria-label="장르 × 악기 고르기 열기" title="장르 × 악기 고르기"><Icon name="mix" size={16} /></button></div>
    <ol className={styles.genreRecommendations}>{results.map(result => <li key={result.genreId}><NextCard result={result} onChoose={() => choose(result)} /></li>)}</ol>
    {!results.length && <p className={styles.emptyMix}>장르와 악기를 고르면 어울리는 세부장르가 떠요.</p>}
  </aside>
}

/** One next-recommendation card: the subgenre's signature orbs melt into the glass and sit under its name. */
function NextCard({ result, onChoose }: { result: RecommendationTarget; onChoose: () => void }) {
  const { catalog } = useExperience()
  const genre = catalog.genreById.get(result.genreId)!
  const subgenre = catalog.subgenreById.get(result.subgenreId)!
  const signature = useSignature(subgenre.id)
  const picked = usePickedSessions()
  const seed = [...subgenre.id].reduce((sum, char) => sum * 31 + char.charCodeAt(0) >>> 0, 7)
  return <LiquidGlass as="button" className={styles.genreGlass} tint={genre.color} style={{ '--genre-color': genre.color } as CSSProperties}
    aria-label={`${genre.name} 추천: ${subgenre.name} 탐색하기, 점수 ${Math.round(result.score * 100)}${signature.length ? `, 대표 악기 ${signature.map(s => s.name).join(', ')}` : ''}`}
    onClick={onChoose}>
    <span className={styles.cardBlobs} aria-hidden="true">{signature.map(({ weight }, i) =>
      <i key={i} style={{ ...blobPlace(i, seed), '--d': `${Math.round(36 + 40 * weight)}%`, '--o': (.16 + .24 * weight).toFixed(2) } as CSSProperties} />)}</span>
    <span className={styles.genreGlassLabel}><strong>{subgenre.name}</strong><small>{shortGenreName(genre.name)} · {Math.round(result.score * 100)}</small></span>
    <SignatureOrbs signature={signature} picked={picked} />
  </LiquidGlass>
}

/** Blob centers: three loose slots, nudged per subgenre so no two cards look alike. */
function blobPlace(i: number, seed: number): CSSProperties {
  const slots = [[26, 30], [76, 72], [74, 20]]
  const jitter = (shift: number) => ((seed >>> shift) % 17) - 8
  return { left: `${slots[i][0] + jitter(i * 5)}%`, top: `${slots[i][1] + jitter(i * 5 + 3)}%`, animationDelay: `${-((seed >>> i * 3) % 9)}s` }
}
