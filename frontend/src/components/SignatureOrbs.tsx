import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { signatureSessions, subgenreProfile } from '../domain/category'
import { useExperience } from '../state/ExperienceContext'
import { SessionGlyph } from './SessionGlyph'
import styles from './Interface.module.css'

/** A subgenre's three signature sessions with their Korean names, or nothing without a category model. */
export function useSignature(subgenreId: string) {
  const { catalog } = useExperience()
  return useMemo(() => {
    const index = catalog.categories
    if (!index) return []
    return signatureSessions(subgenreProfile(index, catalog, subgenreId))
      .map(item => ({ ...item, key: index.model.sessions[item.session].key, name: index.model.sessions[item.session].name }))
  }, [catalog, subgenreId])
}

/** Sessions of the cells picked so far (in any genre row). */
export function usePickedSessions() {
  const { catalog, state } = useExperience()
  const index = catalog.categories
  return useMemo(() => new Set(index ? state.selection.map(id => index.cells[id].session) : []), [index, state.selection])
}

/** Genre-colored orbs for a subgenre's signature sessions, sized by weight; matches with the picks get a ring. */
export function SignatureOrbs({ signature, picked, min = 16, span = 8 }: {
  signature: ReturnType<typeof useSignature>; picked: ReadonlySet<number>; min?: number; span?: number
}) {
  if (!signature.length) return null
  return <span className={styles.cardOrbRow} aria-hidden="true">{signature.map(({ session, weight, key, name }) =>
    <i key={session} className={styles.cardOrb} data-matched={picked.has(session)} title={name}
      style={{ '--d': `${Math.round(min + span * weight)}px` } as CSSProperties}>
      <SessionGlyph session={key} size={Math.round((min + span * weight) * .48)} />
    </i>)}</span>
}
