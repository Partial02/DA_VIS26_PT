import type { ReactNode } from 'react'
import styles from './Presentation.module.css'

export function ChapterFrame({ number, title, body, visualization }: {
  number: string; title: string; body?: ReactNode; visualization?: ReactNode
}) {
  return <div className={styles.chapter}>
    <section className={styles.chapterCopy}>
      <p className="eyebrow"><i />THE QUESTION / CHAPTER {number}</p>
      <h1>{title}</h1>
      <div className={styles.bodySlot}>{body ?? <><span>STORY</span><p>본문을 추가할 공간입니다.</p><i /><i /><i /></>}</div>
    </section>
    <section className={styles.visualSlot} aria-label={`챕터 ${number} 시각화 삽입 영역`}>
      {visualization ?? <><div className={styles.slotCorners} /><span className={styles.slotNumber}>{number}</span><div className={styles.slotLabel}><span>VISUALIZATION CANVAS</span><p>시각화가 들어갈 공간</p></div></>}
    </section>
  </div>
}
