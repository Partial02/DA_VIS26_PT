import type { ReactNode } from 'react'
import styles from './Presentation.module.css'

export function ChapterFrame({ number, title, body, visualization }: {
  number: string; title: string; body?: ReactNode; visualization?: ReactNode
}) {
  return <div className={styles.chapter} data-chapter={number} data-empty={!body && !visualization}>
    {visualization && <section className={styles.visualSlot} aria-label={`${title} 시각화`}>{visualization}</section>}
    <section className={styles.chapterCopy}>
      <h1>{title}</h1>
      {body && <div className={styles.bodySlot}>{body}</div>}
    </section>
  </div>
}
