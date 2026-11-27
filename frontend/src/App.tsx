import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Catalog, MusicData } from './domain/catalog'
import { indexCatalog } from './domain/catalog'
import type { CategoryModel } from './domain/category'
import { ExperienceProvider } from './state/ExperienceContext'
import { AmbientBackground } from './components/AmbientBackground'
import { Header } from './components/Header'
import { Explore } from './components/Explore'
import { IntroPage, StoryPages } from './presentation/StoryPages'
import { MethodSlides, methodSlides } from './presentation/method/MethodSlides'
import { useReducedMotion } from './state/useReducedMotion'
import { journeyMotion } from './state/motion'

export type Part = 'story' | 'explore' | 'method'

/** Part 1 발표 `#/story[/1–5]`, Part 2 탐색 `#/explore`, Part 3 방법 `#/method[/n]`. */
function parseHash(): { part: Part; chapter: number } {
  if (location.hash === '#/explore') return { part: 'explore', chapter: 0 }
  const method = location.hash.match(/^#\/method(?:\/(\d+))?$/)
  if (method) return { part: 'method', chapter: Math.min(Number(method[1] ?? 0), methodSlides.length - 1) }
  const match = location.hash.match(/^#\/story\/([1-5])$/)
  return { part: 'story', chapter: match ? Number(match[1]) : 0 }
}

const partOrder: Record<Part, number> = { story: 0, explore: 1, method: 2 }

function Experience({ route }: { route: ReturnType<typeof parseHash> }) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(route)
  const [changing, setChanging] = useState(false)
  const current = useRef(route)
  const stage = useRef<HTMLDivElement>(null)
  const drift = useRef({ depth: 0 })
  useLayoutEffect(() => {
    const previous = current.current
    if (previous.part === route.part && previous.chapter === route.chapter) {
      gsap.set(stage.current, { opacity: 1 })
      setChanging(false)
      return
    }
    setChanging(true)
    const direction = partOrder[route.part] * 100 + route.chapter < partOrder[previous.part] * 100 + previous.chapter ? -1 : 1
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
    <AmbientBackground cover={displayed.part === 'story' && displayed.chapter === 0} exploring={displayed.part === 'explore'} drift={drift} />
    <Header part={displayed.part} chapter={displayed.chapter} />
    <div ref={stage} className="routeStage" inert={changing} aria-busy={changing}>
      {displayed.part === 'story' ? displayed.chapter === 0 ? <IntroPage /> : <StoryPages page={displayed.chapter} />
        : displayed.part === 'method' ? <MethodSlides slide={displayed.chapter} /> : <Explore />}
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
    Promise.all([load<MusicData>('music-catalog.json'), load<CategoryModel>('category-model.json')])
      .then(([data, model]) => setCatalog(indexCatalog(data, model)))
      .catch(reason => { if (reason.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [])
  if (error) return <main className="loadScreen"><h1>별의 지도를 불러오지 못했어요.</h1><p>데이터 파일과 개발 서버 연결을 확인한 뒤 다시 시도해 주세요.</p><button className="outlinedButton" onClick={() => location.reload()}>다시 불러오기 ↗</button></main>
  if (!catalog) return <main className="loadScreen"><i /><span>GATHERING THE STARS</span></main>
  return <ExperienceProvider catalog={catalog}>
    <Experience route={route} />
  </ExperienceProvider>
}
