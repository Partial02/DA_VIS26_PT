import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Catalog, MusicData } from './domain/catalog'
import { indexCatalog } from './domain/catalog'
import type { AtlasModel } from './domain/atlas'
import { ExperienceProvider } from './state/ExperienceContext'
import { AmbientBackground } from './components/AmbientBackground'
import { Header } from './components/Header'
import { Explore } from './components/Explore'
import { IntroPage, StoryPages } from './presentation/StoryPages'
import { useReducedMotion } from './state/useReducedMotion'
import { journeyMotion } from './state/motion'

function parseHash() {
  if (location.hash === '#/explore') return { story: false, chapter: 0 }
  const match = location.hash.match(/^#\/story\/([1-5])$/)
  return { story: true, chapter: match ? Number(match[1]) : 0 }
}

function Experience({ route }: { route: ReturnType<typeof parseHash> }) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(route)
  const [changing, setChanging] = useState(false)
  const current = useRef(route)
  const stage = useRef<HTMLDivElement>(null)
  const drift = useRef({ depth: 0 })
  useLayoutEffect(() => {
    const previous = current.current
    if (previous.story === route.story && previous.chapter === route.chapter) {
      gsap.set(stage.current, { opacity: 1 })
      setChanging(false)
      return
    }
    setChanging(true)
    const direction = route.story && (!previous.story || route.chapter < previous.chapter) ? -1 : 1
    const duration = reduced ? .2 : journeyMotion.duration
    const fade = reduced ? .1 : journeyMotion.fade
    const timeline = gsap.timeline({ onComplete: () => setChanging(false) })
    timeline.to(stage.current, { opacity: 0, duration: fade, ease: 'power2.in' }, 0)
    timeline.call(() => { current.current = route; setDisplayed(route) }, [], fade)
    if (!reduced) timeline.to(drift.current, { depth: drift.current.depth + direction * .45, duration, ease: journeyMotion.ease }, 0)
    timeline.to(stage.current, { opacity: 1, duration: reduced ? .1 : journeyMotion.reveal, ease: 'power2.out' }, duration - (reduced ? .1 : journeyMotion.reveal))
    return () => { timeline.kill() }
  }, [route, reduced])
  useEffect(() => {
    if (!changing) stage.current?.querySelector<HTMLElement>('main[tabindex]')?.focus({ preventScroll: true })
  }, [changing])
  return <div className="app">
    <AmbientBackground cover={displayed.story && displayed.chapter === 0} exploring={!displayed.story} drift={drift} />
    <Header story={displayed.story} chapter={displayed.chapter} />
    <div ref={stage} className="routeStage" inert={changing} aria-busy={changing}>
      {displayed.story ? displayed.chapter === 0 ? <IntroPage /> : <StoryPages page={displayed.chapter} /> : <Explore />}
    </div>
  </div>
}

export default function App() {
  const [route, setRoute] = useState(parseHash)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const change = () => setRoute(parseHash())
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const load = <T,>(file: string) => fetch(`${import.meta.env.BASE_URL}data/${file}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`${file} unavailable`); return response.json() as Promise<T> })
    Promise.all([load<MusicData>('music-catalog.json'), load<AtlasModel>('atlas-model.json')])
      .then(([data, atlas]) => setCatalog(indexCatalog(data, atlas)))
      .catch(reason => { if (reason.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [])
  if (error) return <main className="loadScreen"><h1>별의 지도를 불러오지 못했어요.</h1><p>데이터 파일과 개발 서버 연결을 확인한 뒤 다시 시도해 주세요.</p><button className="outlinedButton" onClick={() => location.reload()}>다시 불러오기 ↗</button></main>
  if (!catalog) return <main className="loadScreen"><i /><span>GATHERING THE STARS</span></main>
  return <ExperienceProvider catalog={catalog}>
    <Experience route={route} />
  </ExperienceProvider>
}
