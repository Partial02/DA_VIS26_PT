import { useEffect, useState } from 'react'
import type { Catalog, MusicData } from './domain/catalog'
import { indexCatalog } from './domain/catalog'
import { ExperienceProvider } from './state/ExperienceContext'
import { AmbientBackground } from './components/AmbientBackground'
import { Header } from './components/Header'
import { Explore } from './components/Explore'
import { Presentation } from './presentation/Presentation'

function parseHash() {
  if (location.hash === '#/explore') return { story: false, chapter: 1 }
  const match = location.hash.match(/^#\/story\/([1-6])$/)
  return { story: true, chapter: match ? Number(match[1]) : 1 }
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
    fetch(`${import.meta.env.BASE_URL}data/music-catalog.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json() as Promise<MusicData> })
      .then(data => setCatalog(indexCatalog(data)))
      .catch(reason => { if (reason.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [])
  if (error) return <main className="loadScreen"><h1>별의 지도를 불러오지 못했어요.</h1><p>데이터 파일과 개발 서버 연결을 확인한 뒤 다시 시도해 주세요.</p><button className="outlinedButton" onClick={() => location.reload()}>다시 불러오기 ↗</button></main>
  if (!catalog) return <main className="loadScreen"><i /><span>GATHERING THE STARS</span></main>
  return <ExperienceProvider catalog={catalog}>
    <div className="app"><AmbientBackground /><Header story={route.story} />
      {route.story ? <Presentation chapter={route.chapter} /> : <Explore />}
    </div>
  </ExperienceProvider>
}
