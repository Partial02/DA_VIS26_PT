import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useExperience } from '../../state/ExperienceContext'
import { SessionGlyph } from '../../components/SessionGlyph'
import type { Catalog } from '../../domain/catalog'
import {
  ARTIST_PENALTY, CORE_WEIGHT, CROSS_GENRE, EXPLORE_BONUS, GENRE_FLOOR, SHRINKAGE, SIZE_WEIGHT, TRACK_WEIGHTS,
  cellKey, genreFocus, lengthFit, profileFit, rankSubgenres, sessionWeights, subgenreProfile,
} from '../../domain/category'
import type { CategoryIndex } from '../../domain/category'
import styles from './Method.module.css'

// ---------------------------------------------------------------- shared pieces

function Slide({ title, lede, children, wide }: { title: ReactNode; lede?: ReactNode; children?: ReactNode; wide?: boolean }) {
  return <div className={styles.layout} data-wide={wide || undefined}>
    <section className={styles.copy}>
      <h1>{title}</h1>
      {lede && <div className={styles.lede}>{lede}</div>}
    </section>
    {children && <section className={styles.figure}>{children}</section>}
  </div>
}

function useModel(): { catalog: Catalog; index: CategoryIndex } {
  const { catalog } = useExperience()
  return { catalog, index: catalog.categories! }
}

const percent = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`
const cellFill = (color: string, rate: number) => `color-mix(in srgb, ${color} ${6 + 58 * Math.min(1, rate / .7)}%, #0b0a14)`

/** Share of all tracks whose category uses each session. */
function overallRates(index: CategoryIndex): number[] {
  const counts = new Array(index.model.sessions.length).fill(0)
  for (const [, mask] of index.model.tracks) for (let s = 0; s < counts.length; s++) if (mask >> s & 1) counts[s]++
  return counts.map(count => count / index.model.tracks.length)
}

// ---------------------------------------------------------------- cover

export function MethodCover() {
  return <div className={styles.cover}>
    <p className={styles.eyebrow}>PART 3</p>
    <h1>별 지도 뒤의<br /><em>계산.</em></h1>
    <p className={styles.coverLede}>방금 탐색한 음악 우주가 어떤 데이터로, 어떤 규칙으로 추천하고, 어떻게 화면이 되는지 순서대로 살펴봅니다.</p>
    <ol className={styles.coverList}>
      <li><span>01</span>사용한 데이터셋</li>
      <li><span>02</span>추천 알고리즘</li>
      <li><span>03</span>시스템 방법</li>
    </ol>
  </div>
}

// ---------------------------------------------------------------- 01 dataset

export function DatasetOverview() {
  const { catalog } = useModel()
  const instruments = useMemo(() => new Set(catalog.tracks.flatMap(track => track.instruments)).size, [catalog])
  const genres = [...catalog.genres].sort((a, b) => b.trackIds.length - a.trackIds.length)
  const max = genres[0].trackIds.length
  const stats: [string, string][] = [
    [catalog.tracks.length.toLocaleString(), '곡'],
    [String(catalog.genres.length), '대장르'],
    [String(catalog.subgenres.length), '세부장르'],
    [String(instruments), '악기 태그'],
  ]
  return <Slide title={<>MTG-Jamendo,<br />태그가 달린 {catalog.tracks.length.toLocaleString()}곡</>} lede={<>
    <p>Jamendo의 CC 라이선스 음원에 장르·세부장르·악기 태그를 붙인 <strong>MTG-Jamendo</strong> 데이터셋을 정리한 CSV 한 장이 출발점입니다.</p>
    <ul>
      <li>곡마다 <b>대장르 1개</b>, <b>세부장르 여러 개</b>, <b>악기 여러 개</b></li>
      <li><code>TRACK_ID</code>로 Jamendo에서 실제 음원을 불러와 재생</li>
      <li>BPM·음량 같은 <b>오디오 특징은 쓰지 않고</b> 태그만 사용</li>
    </ul>
  </>}>
    <div className={styles.stats}>{stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <figure className={styles.panel}>
      <figcaption>대장르별 곡 수</figcaption>
      <div className={styles.bars} role="list">{genres.map(genre => <div key={genre.id} role="listitem" className={styles.barRow} title={`${genre.name}: ${genre.trackIds.length}곡, 세부장르 ${genre.subgenreIds.length}개`}>
        <span className={styles.barLabel}>{genre.name}</span>
        <span className={styles.barTrack}><i style={{ width: `${genre.trackIds.length / max * 100}%`, background: genre.color }} /></span>
        <span className={styles.barValue}>{genre.trackIds.length}</span>
      </div>)}</div>
    </figure>
  </Slide>
}

export function DatasetSessions() {
  const { index } = useModel()
  const { sessions, categories, genres } = index.model
  const overall = useMemo(() => overallRates(index), [index])
  const examples = useMemo(() => sessions.map((_, s) => {
    const counts = new Map<string, number>()
    for (const category of categories) if (category.session === s) for (const name of category.instruments) counts.set(name, (counts.get(name) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([name]) => name)
  }), [sessions, categories])
  const ambient = genres.find(genre => genre.id === 'ambient-new-age') ?? genres[0]
  const synth = sessions.findIndex(session => session.key === 'synth')
  const example = categories.find(category => category.genreId === ambient.id && category.session === synth)
  return <Slide wide title={<>악기 {new Set(categories.flatMap(c => c.instruments)).size}개를<br />세션 {sessions.length}개로 묶기</>} lede={<>
    <p>악기 태그는 너무 잘게 나뉘어 있어서(예: Pad·Synthesizer·Vocoder) 비슷한 역할끼리 <b>세션</b>으로 묶었습니다. 장르 {genres.length}개 × 세션 {sessions.length}개 중 실제로 존재하는 <b>{categories.length}칸</b>이 추천의 입력이 됩니다.</p>
    <dl className={styles.definitions}>
      <div><dt>family_rate</dt><dd>그 장르 곡 중 이 세션을 쓰는 곡의 비율</dd></div>
      <div><dt>lift</dt><dd>family_rate ÷ 전체 곡에서의 비율. 1보다 크면 그 장르의 특징</dd></div>
    </dl>
    {example && <p className={styles.note}>예: {ambient.name}의 신스는 family_rate {example.rate.toFixed(2)}, lift {example.lift.toFixed(2)}배</p>}
  </>}>
    <div className={styles.sessionGrid}>{sessions.map((session, s) => <div key={session.key} className={styles.sessionCard} title={`${session.name}: 전체 곡의 ${percent(overall[s], 1)}`}>
      <SessionGlyph session={session.key} size={26} />
      <strong>{session.name}</strong>
      <span className={styles.sessionShare}><i style={{ width: percent(overall[s] / Math.max(...overall)) }} /></span>
      <small>{percent(overall[s])} · {examples[s].join(', ')}</small>
    </div>)}</div>
    <p className={styles.caption}>막대 = 전체 {index.model.tracks.length.toLocaleString()}곡 중 그 세션을 쓰는 곡의 비율 · 오른쪽은 대표 악기 태그</p>
  </Slide>
}

// ---------------------------------------------------------------- 02 algorithm

function defaultSelection(index: CategoryIndex): number[] {
  const session = (key: string) => index.model.sessions.findIndex(s => s.key === key)
  return [['jazz', 'piano'], ['jazz', 'brass']]
    .map(([genre, key]) => index.cellOf.get(cellKey(genre, session(key))))
    .filter((id): id is number => id !== undefined)
}

export function AlgorithmTable() {
  const { catalog, index } = useModel()
  const [selection, setSelection] = useState(() => defaultSelection(index))
  const [hovered, setHovered] = useState<number | null>(null)
  const { sessions, genres, categories } = index.model
  const ranked = useMemo(() => rankSubgenres(index, catalog, selection, {}).slice(0, 6), [index, catalog, selection])
  const toggle = (id: number) => setSelection(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  const info = hovered !== null ? categories[hovered] : null
  return <Slide wide title={<>고른 칸으로<br />146개 세부장르 채점</>} lede={<>
    <p>사용자는 <b>장르색 × 세션 무늬</b> 칸을 고릅니다. 고른 칸 집합 하나로 모든 세부장르의 점수를 계산하고, 높은 순으로 추천합니다.</p>
    <p className={styles.note}>칸을 눌러 직접 바꿔 보세요. 칸 색이 진할수록 그 장르에서 자주 쓰는 세션입니다.</p>
    <div className={styles.actions}>
      <button type="button" className="outlinedButton" onClick={() => setSelection(defaultSelection(index))}>예시로 되돌리기</button>
      <button type="button" className="outlinedButton" onClick={() => setSelection([])} disabled={!selection.length}>비우기</button>
    </div>
  </>}>
    <div className={styles.tableDemo} data-no-advance>
      <div className={styles.heatmap} style={{ gridTemplateColumns: `minmax(120px, 11.5em) repeat(${sessions.length}, minmax(0, 1fr))` }} role="grid" aria-label="장르 × 세션 선택표">
        <span />
        {sessions.map(session => <span key={session.key} className={styles.columnHead} title={session.name}><SessionGlyph session={session.key} size={14} /><small>{session.name}</small></span>)}
        {genres.map(genre => <div key={genre.id} role="row" className={styles.heatRow}>
          <span className={styles.rowHead}><i style={{ background: genre.color }} />{genre.name}</span>
          {sessions.map((session, s) => {
            const id = index.cellOf.get(cellKey(genre.id, s))
            if (id === undefined) return <span key={session.key} className={styles.emptyCell} aria-hidden="true">·</span>
            const picked = selection.includes(id)
            return <button key={session.key} type="button" className={styles.cell} aria-pressed={picked}
              aria-label={`${genre.name} × ${session.name}, ${categories[id].tracks}곡`}
              style={{ background: cellFill(genre.color, categories[id].rate), color: genre.color }}
              onClick={() => toggle(id)} onPointerEnter={() => setHovered(id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(id)} onBlur={() => setHovered(null)}>
              <SessionGlyph session={session.key} size={12} />
            </button>
          })}
        </div>)}
      </div>
      <p className={styles.caption} aria-live="polite">{info
        ? <>{catalog.genreById.get(info.genreId)!.name} × {sessions[info.session].name}: {info.tracks}곡 · 장르 곡의 {percent(info.rate)} · lift {info.lift.toFixed(2)}배 · {info.instruments.slice(0, 4).join(', ')}</>
        : <>고른 칸 {selection.length}개 · 칸에 마우스를 올리면 곡 수·비율·lift를 보여줍니다</>}</p>
      <ol className={styles.ranking} aria-label="세부장르 추천 순위">
        {ranked.map((item, rank) => {
          const subgenre = catalog.subgenreById.get(item.subgenreId)!, genre = catalog.genreById.get(item.genreId)!
          return <li key={item.subgenreId}>
            <span className={styles.rank}>{rank + 1}</span>
            <span className={styles.rankName}><i style={{ background: genre.color }} />{subgenre.name}<small>{genre.name}</small></span>
            <span className={styles.rankBar}><i style={{ width: percent(item.score) }} /></span>
            <span className={styles.rankScore}>{Math.round(item.score * 100)}</span>
          </li>
        })}
        {!ranked.length && <li className={styles.emptyRank}>칸을 하나 이상 고르면 추천이 나타납니다.</li>}
      </ol>
    </div>
  </Slide>
}

export function AlgorithmFormula() {
  const { catalog, index } = useModel()
  const selection = useMemo(() => defaultSelection(index), [index])
  const top = useMemo(() => rankSubgenres(index, catalog, selection, {})[0], [index, catalog, selection])
  const subgenre = catalog.subgenreById.get(top.subgenreId)!, genre = catalog.genreById.get(top.genreId)!
  const profile = subgenreProfile(index, catalog, subgenre.id)
  const weights = sessionWeights(index, selection, genre.id)
  const core = profileFit(index, profile, genre.id, selection)
  const size = Math.log(subgenre.trackIds.length + 1) / Math.log(index.maxCount + 1)
  const focus = GENRE_FLOOR + (1 - GENRE_FLOOR) * genreFocus(index, selection, genre.id)
  const lambda = subgenre.trackIds.length / (subgenre.trackIds.length + SHRINKAGE)
  const steps: [string, ReactNode, ReactNode][] = [
    ['① 프로필', <>q̂ = λ·세부장르 + (1−λ)·장르</>, <>λ = n/(n+{SHRINKAGE}). 곡이 적은 세부장르는 부모 장르 분포에 기댑니다.</>],
    ['② 적합도', <>core = F1(precision, recall)</>, <>고른 세션이 프로필에 맞는 정도(precision)와 프로필을 덮는 정도(recall). 다른 장르 행의 같은 세션은 {CROSS_GENRE}만 인정.</>],
    ['③ 보정', <>× focus × explore</>, <>focus = {GENRE_FLOOR} + {(1 - GENRE_FLOOR).toFixed(2)}×(고른 칸 중 같은 장르 비율), 안 가 본 장르는 ×{EXPLORE_BONUS}.</>],
    ['④ 최종', <>({CORE_WEIGHT}·core + {SIZE_WEIGHT}·size) × focus × explore</>, <>size = 곡 수의 로그 비율. 규모는 작은 비중으로만 반영합니다.</>],
  ]
  return <Slide wide title={<>점수 = <em>적합도</em><br />× 작은 보정</>} lede={<ol className={styles.steps}>{steps.map(([label, formula, text]) => <li key={label}>
    <span className={styles.stepLabel}>{label}</span><code>{formula}</code><p>{text}</p>
  </li>)}</ol>}>
    <figure className={styles.panel}>
      <figcaption>예시: Jazz × 피아노·금관을 골랐을 때 1위 <b style={{ color: genre.color }}>{subgenre.name}</b></figcaption>
      <div className={styles.profile} role="list">{index.model.sessions.map((session, s) => <div key={session.key} role="listitem" className={styles.profileColumn} data-picked={weights[s] > 0 || undefined} title={`${session.name}: q̂ ${profile[s].toFixed(2)}`}>
        <span className={styles.profileBar}><i style={{ height: percent(profile[s]), background: weights[s] > 0 ? genre.color : undefined }} /></span>
        <SessionGlyph session={session.key} size={13} />
        <small>{session.name}</small>
      </div>)}</div>
      <p className={styles.caption}>막대 = 세부장르 프로필 q̂ (가장 전형적인 세션 = 1) · 색칠한 막대 = 고른 세션 · {subgenre.trackIds.length}곡, λ = {lambda.toFixed(2)}</p>
      <dl className={styles.breakdown}>
        <div><dt>core</dt><dd>{core.toFixed(2)}</dd></div>
        <div><dt>size</dt><dd>{size.toFixed(2)}</dd></div>
        <div><dt>focus</dt><dd>{focus.toFixed(2)}</dd></div>
        <div><dt>explore</dt><dd>×{EXPLORE_BONUS}</dd></div>
        <div data-total><dt>score</dt><dd>{Math.round(top.score * 100)}</dd></div>
      </dl>
    </figure>
  </Slide>
}

export function AlgorithmPlaylist() {
  const width = 520, height = 170, pad = { left: 36, right: 14, top: 14, bottom: 30 }
  const x = (seconds: number) => pad.left + seconds / 600 * (width - pad.left - pad.right)
  const y = (value: number) => pad.top + (1 - value) * (height - pad.top - pad.bottom)
  const points = Array.from({ length: 121 }, (_, i) => i * 5).map(t => `${x(t).toFixed(1)},${y(lengthFit(t)).toFixed(1)}`).join(' ')
  const ticks: [number, string][] = [[60, '1:00'], [150, '2:30'], [300, '5:00'], [540, '9:00']]
  const parts: [string, number, string][] = [
    ['match', TRACK_WEIGHTS.match, '고른 칸과 곡의 세션이 맞는 정도 (F1)'],
    ['typical', TRACK_WEIGHTS.typical, '그 세부장르다운 편성인가'],
    ['length', TRACK_WEIGHTS.length, '듣기 좋은 길이인가'],
  ]
  const penalty: [string, string, number, number, string][] = [
    ['A', '곡 1', .90, .90, '1'],
    ['A', '곡 2', .85, .85 - ARTIST_PENALTY, '3'],
    ['B', '곡 1', .80, .80, '2'],
  ]
  return <Slide wide title={<>세부장르 안에서는<br /><em>곡</em>에 점수를 매긴다</>} lede={<>
    <p>세부장르에 들어가면 같은 선택으로 플레이리스트 순서를 정합니다. 곡 점수는 세 항목의 가중합입니다.</p>
    <p className={styles.note}>아무 칸도 고르지 않았다면 대표성 0.55 + 길이 0.45로 정렬합니다.</p>
  </>}>
    <figure className={styles.panel}>
      <figcaption>곡 점수 = 0.74·match + 0.12·typical + 0.14·length</figcaption>
      <div className={styles.stack}>{parts.map(([name, weight], i) => <span key={name} style={{ flexGrow: weight, opacity: 1 - i * .28 }}><b>{name}</b>{weight}</span>)}</div>
      <ul className={styles.legend}>{parts.map(([name, , text], i) => <li key={name}><i style={{ opacity: 1 - i * .28 }} /><b>{name}</b>{text}</li>)}</ul>
    </figure>
    <div className={styles.twoUp}>
      <figure className={styles.panel}>
        <figcaption>length: 2:30–5:00이면 1</figcaption>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.lineChart} role="img" aria-label="곡 길이 적합도: 1분 이하 0, 2분 30초부터 5분까지 1, 9분 이상 0">
          {[0, .5, 1].map(v => <g key={v}><line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className={styles.grid} /><text x={pad.left - 8} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
          {ticks.map(([t, label]) => <text key={label} x={x(t)} y={height - 8} textAnchor="middle">{label}</text>)}
          <polyline points={points} className={styles.line} />
        </svg>
      </figure>
      <figure className={styles.panel}>
        <figcaption>같은 아티스트는 한 곡마다 −{ARTIST_PENALTY}</figcaption>
        <table className={styles.table}>
          <thead><tr><th>곡</th><th>점수</th><th>감점 후</th><th>순서</th></tr></thead>
          <tbody>{penalty.map(([artist, song, score, after, order]) => <tr key={artist + song}><td>아티스트 {artist} · {song}</td><td>{score.toFixed(2)}</td><td>{after.toFixed(2)}</td><td>{order}</td></tr>)}</tbody>
        </table>
        <p className={styles.caption}>한 아티스트가 목록을 독차지하지 않도록, 두 번째 곡은 다른 곡보다 0.18 이상 잘 맞을 때만 앞에 섭니다.</p>
      </figure>
    </div>
  </Slide>
}

// ---------------------------------------------------------------- 03 system

export function SystemPipeline() {
  const { catalog } = useModel()
  const instruments = useMemo(() => new Set(catalog.tracks.flatMap(track => track.instruments)).size, [catalog])
  const dims = catalog.genres.length + catalog.subgenres.length + instruments
  const steps: [string, string, string][] = [
    ['CSV', `${catalog.tracks.length.toLocaleString()}곡`, '장르·세부장르·악기 태그'],
    ['프로필', `${catalog.meta.profileCount.toLocaleString()}개`, '중복 없는 태그 조합'],
    ['특징', `${dims}차원`, `장르 ${catalog.genres.length} + 세부 ${catalog.subgenres.length} + 악기 ${instruments}`],
    ['t-SNE', '3차원', 'cosine · perplexity 40 · PCA 초기값 · seed 42'],
    ['구형 배치', '반경 12', '축 균형 · 밀도 조정 · 곡별 오프셋'],
    ['JSON', 'music-catalog', '브라우저가 그대로 읽음'],
  ]
  const weights: [string, number][] = [['대장르', .15], ['세부장르', .30], ['악기', .55]]
  return <Slide wide title={<>태그만으로 만든<br /><em>3차원</em> 음악 지도</>} lede={<>
    <p>비슷한 태그 조합을 가진 곡이 가까이 모이도록 t-SNE로 3차원 좌표를 만들고, 둥근 우주처럼 보이도록 구 안에 다시 펼쳤습니다.</p>
    <p className={styles.note}>모든 계산은 Python으로 미리 끝내고, 브라우저는 저장된 좌표만 읽습니다.</p>
  </>}>
    <ol className={styles.pipeline}>{steps.map(([name, value, detail]) => <li key={name}><span>{name}</span><strong>{value}</strong><small>{detail}</small></li>)}</ol>
    <figure className={styles.panel}>
      <figcaption>특징 묶음의 비중 (cosine 유사도에 기여하는 몫)</figcaption>
      <div className={styles.stack}>{weights.map(([name, weight], i) => <span key={name} style={{ flexGrow: weight, opacity: .45 + i * .27 }}><b>{name}</b>{percent(weight)}</span>)}</div>
      <p className={styles.caption}>각 묶음을 √(w/k)로 정규화해 태그 수가 많아도 묶음의 비중은 그대로입니다. 악기를 가장 크게 둔 것은 “어떤 소리로 이루어졌나”를 지도의 기준으로 삼기 위해서입니다.</p>
    </figure>
  </Slide>
}

export function SystemArchitecture() {
  const columns: { title: string; tag: string; items: [string, string][] }[] = [
    { title: '오프라인 준비', tag: 'Python', items: [
      ['prepare_data.py', '태그 특징 → t-SNE → 구형 배치'],
      ['build_category_model.py', '장르 × 세션 231칸, 세부장르 프로필'],
    ] },
    { title: '정적 데이터', tag: 'JSON', items: [
      ['music-catalog.json', '곡·장르·좌표·장르색'],
      ['category-model.json', '세션 16종·범주·곡별 세션'],
    ] },
    { title: '브라우저', tag: 'React · Three.js', items: [
      ['별 지도', '전체 → 장르 → 세부장르 줌'],
      ['추천 엔진', 'category.ts: 세부장르·곡 점수'],
      ['방문 누적', '장르색·밝기, 미방문 보너스'],
    ] },
    { title: '소리', tag: 'Jamendo · Web Audio', items: [
      ['Jamendo API', 'TRACK_ID로 CC 음원 재생'],
      ['AnalyserNode', '실시간 스펙트럼 → 막대·별 반짝임'],
    ] },
  ]
  return <Slide wide title={<>서버 없이 돌아가는<br /><em>정적</em> 웹 앱</>} lede={<>
    <p>무거운 계산은 미리 JSON으로 만들어 두고, 추천 점수처럼 선택에 따라 바뀌는 부분만 브라우저에서 즉시 계산합니다.</p>
    <ul>
      <li>로그인·추천 서버·사용자 학습 없음</li>
      <li>선택·방문 기록은 메모리에만 보관</li>
      <li>정적 호스팅만으로 배포 가능</li>
    </ul>
  </>}>
    <ol className={styles.architecture}>{columns.map(column => <li key={column.title}>
      <header><strong>{column.title}</strong><span>{column.tag}</span></header>
      <ul>{column.items.map(([name, text]) => <li key={name}><code>{name}</code><small>{text}</small></li>)}</ul>
    </li>)}</ol>
    <p className={styles.caption}>선택(장르 × 세션 칸) → 추천 엔진 → 세부장르 이동 → 방문 기록 → 다음 추천의 미방문 보너스로 다시 이어집니다.</p>
  </Slide>
}

export function SystemLimits() {
  const items: [string, string][] = [
    ['거리 ≠ 음향 차이', 't-SNE와 구형 후처리는 거리를 바꿉니다. 가까운 별은 태그가 비슷하다는 단서일 뿐, 소리의 차이를 잰 값이 아닙니다.'],
    ['설계한 가중치', '15·30·55%, 0.86·0.14, 0.74·0.12·0.14는 사용자 데이터에서 학습한 값이 아니라 설명 가능하도록 정한 값입니다.'],
    ['태그의 한계', '오디오 특징을 쓰지 않아, 태그가 빈약하거나 틀린 곡은 엉뚱한 자리에 놓일 수 있습니다.'],
    ['다음 단계', '실제 오디오 임베딩 결합, 청취 기록으로 가중치 보정, 추천 다양성의 정량 평가.'],
  ]
  return <Slide wide title={<>무엇을 말할 수 있고,<br /><em>무엇은</em> 아닌가</>} lede={<p>이 시스템은 정답을 맞히는 추천기라기보다, <b>왜 이 장르가 추천됐는지 보이는</b> 탐색 도구를 목표로 했습니다.</p>}>
    <ul className={styles.limits}>{items.map(([title, text]) => <li key={title}><strong>{title}</strong><p>{text}</p></li>)}</ul>
  </Slide>
}
