import { useEffect, useRef, useState } from 'react'
import { useExperience } from '../state/ExperienceContext'
import { Icon } from './Icon'
import { SoundToggle } from './SoundToggle'
import styles from './Interface.module.css'

export function Header({ story }: { story: boolean }) {
  const { state, catalog } = useExperience()
  const discovered = Object.keys(state.visits).length
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <header className={styles.header}>
    <a className={styles.wordmark} href="#/story/1" aria-label="INNER VERSE 발표 처음으로">INNER<span>//</span>VERSE<span className={styles.brandDot}>®</span></a>
    <div className={styles.headerActions}><SoundToggle /><div ref={menu} className={styles.navigationMenu}>
      <button ref={trigger} className={styles.menuButton} aria-label="파트 메뉴" aria-expanded={open} aria-controls="partNavigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
      <nav id="partNavigation" hidden={!open} className={styles.mainNav} aria-label="파트 선택">
        <a href="#/story/1" onClick={() => setOpen(false)} aria-current={story ? 'page' : undefined}><span>01</span> THE QUESTION · 발표</a>
        <a href="#/explore" onClick={() => setOpen(false)} aria-current={!story ? 'page' : undefined}><span>02</span> THE UNIVERSE · 탐색</a>
        <div className={styles.headerMeta}><span className={styles.liveDot} />{discovered} / {catalog.subgenres.length} WORLDS DISCOVERED</div>
      </nav>
    </div></div>
  </header>
}
