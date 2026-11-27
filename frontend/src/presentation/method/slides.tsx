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

export function Slide({ title, lede, children, wide }: { title: ReactNode; lede?: ReactNode; children?: ReactNode; wide?: boolean }) {
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
  const steps: [string, ReactNode, ReactNode][] = [
    ['① match', <>F1(prec, recall)</>, <>prec = Σ<sub>c: s_c ∈ T</sub> ρ(c) / |C|, recall = Σ<sub>s ∈ T</sub> w(s) / |T|. T = 곡의 세션 집합.</>],
    ['② typical', <>mean<sub>s ∈ T</sub> q_S(s) / max q_S</>, <>곡의 편성이 그 세부장르에서 흔한 세션으로 이루어졌는가.</>],
    ['③ length', <>1 (2:30–5:00), 선형 감소, 0</>, <>1:00 이하와 9:00 이상은 0, 그 사이는 직선으로 이어집니다.</>],
    ['④ 곡 점수', <>{TRACK_WEIGHTS.match}·match + {TRACK_WEIGHTS.typical}·typical + {TRACK_WEIGHTS.length}·length</>, <>칸을 안 골랐으면 0.55·typical + 0.45·length. 동점 방지용 해시 잡음 ≤ 0.008.</>],
    ['⑤ 순서', <>argmax [점수 − {ARTIST_PENALTY}·k<sub>artist</sub>]</>, <>k = 이미 목록에 들어간 같은 아티스트 곡 수. 매번 가장 큰 곡을 하나씩 뽑습니다.</>],
  ]
  return <Slide wide title={<>세부장르 안에서는<br /><em>곡</em>마다 점수</>} lede={<ol className={styles.steps}>{steps.map(([label, formula, text]) => <li key={label}>
    <span className={styles.stepLabel}>{label}</span><code>{formula}</code><p>{text}</p>
  </li>)}</ol>}>
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

