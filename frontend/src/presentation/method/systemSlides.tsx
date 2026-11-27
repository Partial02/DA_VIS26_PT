import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { Slide } from './slides'
import styles from './Method.module.css'

// 03 시스템 방법: 장르색, Jamendo 음원, 음악 추천의 한계.

/** sRGB hex → CIELAB (D65). */
function lab(hex: string): [number, number, number] {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
  }
  const [r, g, b] = [channel(0), channel(1), channel(2)]
  const xyz = [(.4124 * r + .3576 * g + .1805 * b) / .95047, .2126 * r + .7152 * g + .0722 * b, (.0193 * r + .1192 * g + .9505 * b) / 1.08883]
  const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116
  const [fx, fy, fz] = xyz.map(f)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function SystemColors() {
  const { catalog } = useExperience()
  const colors = useMemo(() => catalog.genres.map(genre => ({ genre, lab: lab(genre.color) })), [catalog])
  const nearest = useMemo(() => {
    let best = { a: colors[0], b: colors[1], d: Infinity }
    for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) {
      const d = Math.hypot(...colors[i].lab.map((v, k) => v - colors[j].lab[k]))
      if (d < best.d) best = { a: colors[i], b: colors[j], d }
    }
    return best
  }, [colors])
  const lightness = colors.map(c => c.lab[0])
  const size = 300, center = size / 2
  const reach = Math.max(10, ...colors.flatMap(c => [Math.abs(c.lab[1]), Math.abs(c.lab[2])])) * 1.15
  const scale = (size / 2 - 22) / reach
  const rings = [10, 20, 30, 40].filter(r => r < reach)
  return <Slide wide title={<>15개 장르색,<br /><em>I want hue</em>로 고르기</>} lede={<>
    <p><b>I want hue</b>는 색상·채도·명도 범위를 정하면, 그 안에서 <b>사람 눈에 서로 가장 멀리 떨어진 색</b>을 CIELAB 공간에서 골라 주는 도구입니다.</p>
    <ul>
      <li>검은 우주 위에서 별빛처럼 보이도록 <b>밝은 파스텔</b> 구간에서 15색 생성</li>
      <li><code>genre_color.csv</code> 한 곳에 저장 → 스크립트가 카탈로그·추천 모델에 일괄 적용</li>
      <li>별·선택표·추천 카드·방문 기록이 모두 같은 장르색</li>
    </ul>
  </>}>
    <div className={styles.colorLayout}>
      <figure className={styles.panel}>
        <figcaption>CIELAB a*–b* 평면 위의 15색</figcaption>
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.labPlot} role="img" aria-label="장르색 15개를 CIELAB a*, b* 평면에 찍은 산점도">
          <line x1={center} x2={center} y1={8} y2={size - 8} className={styles.grid} />
          <line x1={8} x2={size - 8} y1={center} y2={center} className={styles.grid} />
          {rings.map(r => <circle key={r} cx={center} cy={center} r={r * scale} className={styles.grid} fill="none" />)}
          <text x={size - 8} y={center - 6} textAnchor="end">+a* 빨강</text>
          <text x={8} y={center - 6}>−a* 초록</text>
          <text x={center + 6} y={16}>+b* 노랑</text>
          <text x={center + 6} y={size - 8}>−b* 파랑</text>
          {colors.map(c => <circle key={c.genre.id} cx={center + c.lab[1] * scale} cy={center - c.lab[2] * scale} r={8} fill={c.genre.color} stroke="#020205" strokeWidth={2}>
            <title>{`${c.genre.name} ${c.genre.color.toUpperCase()} · L* ${c.lab[0].toFixed(0)} a* ${c.lab[1].toFixed(0)} b* ${c.lab[2].toFixed(0)}`}</title>
          </circle>)}
        </svg>
        <p className={styles.caption}>원점에서 멀수록 채도가 높고, 방향이 색상입니다. 동심원 간격 10. 명도 L*는 {Math.min(...lightness).toFixed(0)}–{Math.max(...lightness).toFixed(0)}로 모두 밝은 쪽입니다.</p>
      </figure>
      <figure className={styles.panel}>
        <figcaption>장르별 대표색</figcaption>
        <ul className={styles.swatches}>{colors.map(c => <li key={c.genre.id}>
          <i style={{ background: c.genre.color }} />
          <span>{c.genre.name}</span>
          <code>{c.genre.color.toUpperCase()}</code>
        </li>)}</ul>
        <p className={styles.caption}>가장 가까운 쌍: {nearest.a.genre.name} ↔ {nearest.b.genre.name} (ΔE {nearest.d.toFixed(1)}). 색만으로 구분하기 어려운 경우를 위해 이름·무늬를 함께 표시합니다.</p>
      </figure>
    </div>
  </Slide>
}

export function SystemAudio() {
  const steps: { label: string; title: string; code: string; text: string; fallback?: boolean }[] = [
    { label: '1', title: 'Jamendo API로 음원 주소 받기', code: 'api.jamendo.com/v3.0/tracks/?client_id=…&id=<TRACK_ID>&audioformat=mp32',
      text: '서버 없이 브라우저에서 바로 부르기 위해 JSONP로 호출합니다(12초 제한). 응답의 results[0].audio가 재생 주소, license_ccurl이 CC 라이선스입니다.' },
    { label: '2', title: 'API가 안 되면: TRACK_ID로 링크 직접 만들기', code: 'prod-1.storage.jamendo.com/?trackid=<TRACK_ID>&format=mp32', fallback: true,
      text: '응답 없음·오류·주소 없음이거나 받은 주소가 재생되지 않으면, Jamendo 저장소 주소를 TRACK_ID로 조립해 한 번 더 시도합니다. 앞자리 0은 떼어 냅니다.' },
    { label: '3', title: '재생과 실시간 분석', code: '<audio crossOrigin="anonymous"> → AnalyserNode (FFT 2048)',
      text: 'Jamendo 저장소는 CORS를 허용하므로 Web Audio로 스펙트럼을 읽어 음악 막대 40개와 재생 중인 별의 반짝임을 움직입니다.' },
    { label: '4', title: '그래도 안 되면: 소리만, 그리고 원본 링크', code: 'jamendo.com/track/<TRACK_ID>', fallback: true,
      text: 'CORS가 거부되면 분석 없이 일반 <audio>로 소리만 재생합니다. 끝내 실패하면 안내를 띄우고, 플레이어의 Jamendo 링크로 곡 페이지를 엽니다.' },
  ]
  return <Slide wide title={<><code className={styles.titleCode}>TRACK_ID</code> 하나로<br /><em>음악</em> 불러오기</>} lede={<>
    <p>MTG-Jamendo의 곡은 실제로 Jamendo에 올라가 있는 CC 라이선스 곡이라, CSV의 <b>TRACK_ID</b>만으로 원곡을 찾을 수 있습니다. CSV의 MP3 경로는 쓰지 않습니다.</p>
    <ul>
      <li>여러 곡을 빠르게 누르면 <b>마지막에 누른 곡</b>만 재생</li>
      <li>기본 client_id 내장, 플레이어의 <b>API 키</b> 버튼으로 교체 가능</li>
      <li>세부장르를 벗어나면 재생 중지</li>
    </ul>
  </>}>
    <ol className={styles.audioFlow}>{steps.map(step => <li key={step.label} data-fallback={step.fallback || undefined}>
      <span className={styles.flowLabel}>{step.fallback ? '실패 시' : '기본'}<b>{step.label}</b></span>
      <div>
        <strong>{step.title}</strong>
        <code>{step.code}</code>
        <p>{step.text}</p>
      </div>
    </li>)}</ol>
  </Slide>
}

export function SystemLimits() {
  const items: { title: string; text: ReactNode; ours: ReactNode; cite: ReactNode }[] = [
    { title: '인기 편향', text: <>Last.fm 실험에서 여섯 가지 추천 알고리즘 모두 <b>인기 아티스트일수록 더 자주 추천</b>했고, 롱테일 아티스트에서는 추천 성능이 더 낮았습니다.</>,
      ours: <>size 항(0.14)이 큰 세부장르를 조금 밀어 줍니다. 비중을 낮추고 미방문 보너스를 두었지만, 쏠림을 정량적으로 재지는 않았습니다.</>,
      cite: <>Kowald, Schedl &amp; Lex, ECIR 2020 · Trainor &amp; Turnbull, RecSys 2023 Workshop</> },
    { title: '태그만 본 추천', text: <>음악 콘텐츠에는 신호·내장 메타데이터·전문가 태그·사용자 태그·파생 정보의 여러 층이 있고, <b>콜드 스타트·다양성·투명성</b>은 여전히 열린 과제입니다.</>,
      ours: <>장르·악기 <b>태그 층만</b> 사용하고 오디오 신호는 쓰지 않아, 태그가 빈약하거나 틀린 곡은 지도와 추천에서 함께 어긋납니다.</>,
      cite: <>Deldjoo, Schedl &amp; Knees, Computer Science Review 2024</> },
    { title: '설명의 평가', text: <>음악 추천의 설명은 신뢰를 높이지만, 설명이 실제로 이해되고 도움이 되는지는 <b>사용자 평가</b>로 확인해야 합니다.</>,
      ours: <>세션 구슬과 장르색으로 추천 이유를 보여주지만, 사용자가 그 이유를 이해했는지는 측정하지 않았습니다.</>,
      cite: <>Afchar et al., AI Magazine 2022</> },
    { title: '다양성의 효과', text: <>110명에게 12주간 다양성을 달리한 추천을 준 결과, 다양한 추천을 받은 청취자가 <b>낯선 장르에 더 열린 태도</b>를 보였습니다.</>,
      ours: <>방문 기록은 한 세션에만 남고 새로고침하면 사라져, 탐색이 취향을 실제로 넓히는지 장기적으로 볼 수 없습니다.</>,
      cite: <>Porcaro, Gómez &amp; Castillo, ACM TORS 2024</> },
  ]
  return <Slide wide title={<>음악 추천의<br /><em>한계</em>와 우리 시스템</>} lede={<p>최근 음악 추천 연구가 지적하는 한계를 기준으로, 이 프로토타입이 <b>무엇을 다뤘고 무엇은 남겨 두었는지</b> 정리합니다.</p>}>
    <ul className={styles.limits}>{items.map(item => <li key={item.title}>
      <strong>{item.title}</strong>
      <p>{item.text}</p>
      <p className={styles.ours}><span>우리 시스템</span>{item.ours}</p>
      <small>{item.cite}</small>
    </li>)}</ul>
  </Slide>
}
