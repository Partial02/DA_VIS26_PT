import { useMemo } from 'react'
import { seededRandom } from '../domain/catalog'

export function AmbientBackground() {
  const stars = useMemo(() => {
    const random = seededRandom(761)
    return Array.from({ length: 310 }, (_, id) => ({ id, x: random() * 1600, y: random() * 1000, r: .25 + random() * .8, opacity: .08 + random() * .34 }))
  }, [])
  return <div className="ambient" aria-hidden="true">
    <div className="nebula" />
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">{stars.map(s => <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#c4c0d9" opacity={s.opacity} />)}</svg>
    <div className="grain" />
  </div>
}
