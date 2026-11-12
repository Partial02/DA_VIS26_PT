import { useEffect, useRef, useState } from 'react'
import { createAmbientEngine } from '../audio/ambient'
import styles from './Interface.module.css'

export function SoundToggle() {
  const engine = useRef<ReturnType<typeof createAmbientEngine> | null>(null)
  const mounted = useRef(false)
  const busy = useRef(false)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; engine.current?.dispose(); engine.current = null }
  }, [])
  useEffect(() => {
    const visibility = () => {
      if (!enabled) return
      if (document.hidden) engine.current?.pause()
      else void engine.current?.play().catch(() => { if (mounted.current) { setEnabled(false); setError(true) } })
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [enabled])
  async function toggle() {
    if (busy.current) return
    busy.current = true
    try {
      if (enabled) { engine.current?.pause(); setEnabled(false) }
      else {
        engine.current ??= createAmbientEngine()
        await engine.current.play()
        if (mounted.current) { setEnabled(true); setError(false) }
      }
    } catch { if (mounted.current) { setEnabled(false); setError(true) } }
    finally { busy.current = false }
  }
  return <>
    <button className={styles.soundToggle} onClick={toggle} aria-pressed={enabled}
      aria-label={enabled ? '우주 앰비언트 소리 끄기' : '우주 앰비언트 소리 켜기'} title={error ? '오디오를 사용할 수 없습니다. 다시 눌러 재시도하세요.' : '직접 합성한 우주 앰비언트'}>
      <span className={styles.soundBars} aria-hidden="true"><i /><i /><i /><i /></span>
      <span>{enabled ? '소리 끄기' : '소리 켜기'}</span>
    </button>
    {error && <span className="srOnly" role="status">소리를 재생하지 못했습니다. 소리 버튼으로 다시 시도할 수 있습니다.</span>}
  </>
}
