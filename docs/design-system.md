# INNER//VERSE 디자인 시스템

[README로 돌아가기](../README.md) · [데이터·탐색 로직](logic.md)

**Part 2의 디자인을 Part 1 발표·차트 제작에도 활용하기 위한 가이드입니다.** 색상과 재질, 서체, 인터랙션은 현재 Part 2 구현에서 가져왔습니다. 발표용 크기·간격과 새 상자의 형태는 아래의 **Part 1 적용 권장값**을 따릅니다. 이 문서를 추가하면서 화면 스타일을 변경하지는 않았습니다.

## 빠르게 적용하기

- [ ] 바탕은 `#020205`, 본문은 `#D9DCEA`, 보조 설명은 `#8F8B9F`로 시작합니다.
- [ ] 설명·차트 상자는 `border-radius: 0`, 얇은 1px 테두리로 만듭니다.
- [ ] 한글과 본문은 Noto Sans KR / Instrument Sans, 짧은 영문 강조만 Instrument Serif italic을 씁니다.
- [ ] 장르를 표현할 때는 [장르 팔레트](#장르-팔레트)의 실제 Part 2 색상을 그대로 씁니다.
- [ ] 넓은 검은 여백을 남기고, 별빛·글로우는 점과 강조 요소에 제한합니다.
- [ ] 차트의 제목·축·범례는 호버 없이 읽을 수 있게 표시합니다.
- [ ] 조작하는 차트에는 `data-no-advance`를 붙이고 키보드 포커스와 모션 감소를 확인합니다.

## 1. 컨셉과 시각 언어

**검은 우주 위에 음악의 관계가 은은한 별빛으로 드러나는 화면.** 배경보다 데이터와 제목이 먼저 읽혀야 합니다.

| 요소 | Part 2에서 쓰는 표현 | Part 1에 가져오는 방법 |
| --- | --- | --- |
| 공간 | 거의 검은 바탕, 희미한 보라·청색 성운, 낮은 농도의 그레인 | 기존 공통 배경 위에 내용 배치. 큰 불투명 색상 면은 최소화 |
| 데이터 | 작은 은회색 별, 선택·방문에 따라 장르색 활성화 | 기본 데이터는 은회색, 비교·선택한 데이터는 의미에 맞는 장르색 |
| 경계 | 얇고 반투명한 1px 선 | 차트 프레임·구분선·버튼에 같은 두께 사용 |
| 표면 | 검은 반투명 유리, 작은 상단 반사광 | 설명·차트 상자에 유리 재질을 적용하되 모서리는 직각 |
| 글자 | 절제된 Sans, 짧은 영문에 Serif italic | 설명은 담백하게, 핵심 단어만 서체로 강조 |
| 움직임 | 느린 회전·반짝임, 부드러운 상태 전환 | 발표의 핵심 내용을 방해하지 않는 등장·강조에 사용 |

## 2. 색상

### 공통 색상

아래 CSS 변수는 이미 [tokens.css](../frontend/src/styles/tokens.css)에 선언되어 있고 앱 전체에서 사용할 수 있습니다. 변수명이 없는 색상은 Part 2에서 사용하는 실제 값을 적었습니다.

| 용도 | CSS 변수 | 코드 | 적용 |
| --- | --- | --- | --- |
| 우주 배경 | `--void` | `#020205` | 화면 바탕 |
| 기본 전경 | — | `#F7F7FB` | 가장 중요한 텍스트, 공통 기본 글자색 |
| 은회색 | `--silver` | `#D9DCEA` | 본문, 일반 데이터 |
| 보조 텍스트 | `--muted` | `#8F8B9F` | 부가 설명·출처. 작은 글자는 실제 배경 위에서 가독성 확인 |
| 공통 강조 | `--violet` | `#A999DC` | 장르를 특정하지 않는 강조·선택 상태 |
| 기본 경계 | `--line` | `#B8A9D522` | 약 13% 불투명도의 가는 구분선 |
| 유리 바탕 | `--glass` | `#0D0B18A6` | 약 65% 불투명도의 어두운 패널 바탕 |
| 조작 요소 경계 | — | `#B8A9D544` | 약 27% 불투명도의 버튼 테두리 |
| 호버 바탕 | — | `#A999DC1A` | 약 10% 불투명도의 보라색 면 |
| 키보드 포커스 | — | `#B1A1D6` | 포커스 아웃라인 |

8자리 HEX는 `#RRGGBBAA`입니다. 끝의 `AA`가 불투명도이므로 `#B8A9D522`와 `#B8A9D5`는 화면에서 다르게 보입니다. 투명도를 뺀 진한 선으로 바꾸지 않습니다.

### 장르 팔레트

출처는 [music-catalog.json](../frontend/public/data/music-catalog.json)의 `genres[].color`입니다. **Part 1과 Part 2에서 같은 장르는 같은 색**을 씁니다. 데이터 재생성으로 팔레트가 바뀌면 JSON을 기준으로 이 표도 갱신합니다.

| 장르 | HEX |
| --- | --- |
| Ambient / New Age | `#A999DC` |
| Classical | `#BFC8E3` |
| Easy Listening / Chill | `#809CDB` |
| Electronic | `#B49DC5` |
| Experimental | `#91BDBD` |
| Folk / Country | `#8495CA` |
| Funk / Soul / R&B | `#B89AC8` |
| Hip-Hop | `#7EACD2` |
| Jazz | `#B49AD6` |
| Latin | `#D5AE83` |
| Metal | `#A99CC6` |
| Pop | `#799BD6` |
| Reggae / Caribbean | `#82B8C6` |
| Rock | `#79B3BD` |
| World | `#B7AECF` |

- 한 장르 안의 항목은 같은 색을 공유하고 명도·불투명도로 강약을 줍니다. 추가 범주 구분이 필요하면 범례와 선 모양도 함께 사용합니다.
- 이 팔레트는 서로 가까운 파스텔 색입니다. 색만으로 15개 장르를 식별하게 하지 말고 이름·범례·선택 표시를 병행합니다.
- 장르가 아닌 일반 수치 비교에는 은회색을 기본으로, 핵심 계열에 보라색을 쓰는 방식을 권장합니다. 이는 Part 1용 권장 규칙입니다.

## 3. 서체와 글자 크기

폰트는 [index.html](../frontend/index.html)에서 불러오므로 Part 1에서 다시 불러올 필요가 없습니다.

| 서체 | 역할 | 사용 규칙 |
| --- | --- | --- |
| Instrument Sans | 영문 UI·숫자·본문 | 기본 서체. 보통 400, 중요한 라벨은 500–600 |
| Noto Sans KR | 한글 | 기본 폰트 스택의 한글 폴백. 본문 400 권장 |
| Instrument Serif | 영문 장르명·짧은 감성적 강조 | 400 italic. 긴 본문·한글 설명·차트 축에는 사용하지 않음 |

```css
/* 앱의 기본 스택과 동일 */
.copy {
  font-family: 'Instrument Sans', 'Noto Sans KR', sans-serif;
}

.englishAccent {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-weight: 400;
}

.numericValue {
  font-variant-numeric: tabular-nums;
}
```

**현재 Part 2 구현값**은 탐색 UI를 위한 크기입니다.

| 요소 | 현재 크기·스타일 |
| --- | --- |
| 워드마크 | 12px / 600 / 자간 2px |
| 장르 화면 제목 | 18px / 400 / 줄높이 1.4, 모바일 15px |
| 플레이리스트 곡 제목 | 13px / 400 |
| 추천 카드 영문 제목 | 보통 18–24px / Serif italic, 600px 이하에서는 21px |
| 추천 카드 부제 | 10px / Sans |
| 방문 누적 숫자 | 25px / 고정 폭 숫자 |

**Part 1 발표용 권장값**은 화면을 멀리서 읽는 상황을 기준으로 키웁니다. 위의 작은 UI 글자를 발표 본문에 그대로 복사하지 않습니다.

| 역할 | 권장 크기 | 권장 줄높이 |
| --- | --- | --- |
| 챕터 제목 | `clamp(36px, 4.5vw, 64px)` | 1.1–1.2 |
| 핵심 수치 | `clamp(40px, 5vw, 72px)` | 1.0–1.1 |
| 설명 본문 | `clamp(18px, 1.6vw, 24px)` | 1.6–1.8 |
| 차트 축·범례 | 14–16px | 1.4–1.6 |
| 출처·각주 | 12–14px | 1.6 |

한글 본문에는 큰 자간을 넣지 않습니다. 넓은 자간은 짧은 영문 분류명 정도에만 사용합니다.

## 4. 상자와 유리 재질

### 기본은 네모난 상자

**Part 1에 새로 만드는 설명 상자·차트 프레임·버튼은 `border-radius: 0`으로 통일합니다.** 기본 형태는 직사각형이며, 반드시 가로세로 길이가 같은 정사각형일 필요는 없습니다.

현재 Part 2도 메뉴·목차 항목·사운드 버튼·지도 컨트롤·믹서 다이얼로그는 직각입니다. 다만 다음은 실제 구현에 남아 있는 별도 형태입니다.

| Part 2 요소 | 현재 형태 | Part 1 재사용 지침 |
| --- | --- | --- |
| 기본 컨트롤·목록·다이얼로그 | `border-radius: 0` | 기본값으로 사용 |
| 장르 추천 글래스 카드 `.genreGlass` | 17px, 모바일 15px | 재질을 가져오고 새 설명·차트 상자는 0으로 적용 |
| 도구 패널 `.utilityPanel` | 18px | 색상·블러를 참고하고 새 상자는 직각으로 제작 |
| 항성계 사이드바 `.systemSidebar` | 20px | 새 발표 레이아웃의 기본 모서리로 확장하지 않음 |
| 별·궤도·원형 데이터 표식 | 원형 | 데이터나 천체의 모양에 맞게 유지 |

유리 느낌은 모서리 반경이 아니라 **어두운 투명 바탕 + 얇은 밝은 경계 + 작은 반사광 + 배경 블러**로 만듭니다.

### 복사 예제: 네모난 글래스 패널

아래 클래스는 새 컴포넌트의 CSS Module에 복사해서 쓰는 예제입니다. 재질은 Part 2 도구 패널에서 가져왔고, 모서리·여백·글자 크기는 Part 1용 권장값을 적용했습니다. 블러를 사용할 수 없어도 어두운 바탕은 유지됩니다.

```css
.figurePanel {
  min-width: 0;
  padding: 24px;
  border: 1px solid #ffffff1f;
  border-radius: 0;
  background:
    linear-gradient(135deg, #ffffff09, #ffffff02),
    #0b0a14c9;
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
  box-shadow: 0 12px 40px #0005;
  color: var(--silver);
}

.figureTitle {
  margin: 0 0 16px;
  font-size: 22px;
  font-weight: 400;
  line-height: 1.4;
}

.figureSource {
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 600px) {
  .figurePanel { padding: 16px; }
}
```

전체 화면 차트에는 상자를 생략해도 됩니다. 공간을 나누는 데 필요할 때만 경계와 유리 면을 추가합니다.

### 복사 예제: 네모난 버튼

공통 [global.css](../frontend/src/styles/global.css)의 `.outlinedButton`을 그대로 사용할 수 있습니다. 기존 클래스는 전역 스타일이므로 CSS Module의 `styles.outlinedButton`으로 참조하지 않습니다.

```tsx
<button type="button" className="outlinedButton">
  비교 보기
</button>
```

현재 버튼 재질은 아래와 같습니다. 새 버튼 스타일이 필요할 때 이 값을 기준으로 만듭니다.

```css
.squareAction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid #b8a9d544;
  border-radius: 0;
  background: linear-gradient(120deg, #a999dc0d, transparent);
  color: var(--silver);
  font-size: 16px; /* Part 1용 확대값. 기존 outlinedButton은 12px */
  transition: background .2s, border-color .2s;
}

.squareAction:hover:not(:disabled) {
  background: #a999dc1a;
  border-color: #b8a9d57a;
}

.squareAction:focus-visible {
  outline: 2px solid #b1a1d6;
  outline-offset: 5px;
}
```

## 5. 간격·레이아웃·아이콘

- **Part 1 권장 간격:** `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px`. 패널 안쪽은 24px, 좁은 화면은 16px부터 시작합니다.
- 한 화면에 주요 차트 하나와 짧은 설명을 우선 배치합니다. 제목·수치·차트·출처 순서로 읽히게 합니다.
- 제목 영역과 차트가 겹치지 않도록 챕터별로 위치를 정합니다. 모든 내용을 작은 카드에 나눠 채우지 않습니다.
- 현재 Part 2의 상단 헤더 높이는 48px입니다. 화면 끝까지 쓰는 발표 시각화에서도 헤더와 조작 요소를 가리지 않습니다.
- 아이콘은 [Icon.tsx](../frontend/src/components/Icon.tsx)의 선 아이콘을 우선 재사용합니다. 기본 크기 18px, 24×24 viewBox, 선 두께 1.2, `currentColor`입니다.
- 아이콘 버튼에는 `aria-label`을 붙입니다. Part 2 세로 도구 버튼은 36×44px이며, Part 1에서 새로 만드는 아이콘 버튼은 44×44px 이상을 권장합니다.

```tsx
import { Icon } from '../components/Icon'

<button type="button" className="outlinedButton" aria-label="장르 목록 열기">
  <Icon name="list" />
</button>
```

## 6. 차트와 상태 표현

| 항목 | Part 1 적용 권장 규칙 |
| --- | --- |
| 기본 데이터 | `--silver`를 기본으로 사용. 비활성 항목은 농도를 낮추되 필요한 정보는 읽히게 유지 |
| 선택한 장르 | 장르 팔레트의 해당 색 + 라벨·선 두께 등 추가 표식 |
| 축·눈금 | 텍스트는 `--muted`, 그리드는 `--line`의 얇은 1px 선 |
| 제목·수치 | 밝은 은백색, 숫자는 `tabular-nums` |
| 툴팁 | 어두운 직각 패널, 1px 테두리. 키보드로도 같은 정보 접근 |
| 강조 | 핵심 점·선·수치에 집중. 축이나 긴 본문 전체에 글로우를 적용하지 않음 |
| 장르 외 상태 | 호버·선택·비활성·로딩을 명도와 테두리로도 구분 |
| 연결선 | 실제 관계를 나타내면 의미와 기준을 설명. 장식 선을 데이터 관계처럼 보이게 배치하지 않음 |

Part 2 홈에서는 기본 별이 은회색이고 호버한 **실제 장르 클러스터**에 장르색이 나타납니다. 홈 장르 이름은 호버 또는 키보드 포커스 때 표시됩니다. 방문은 장르색과 밝기를 누적합니다. 이 탐색 효과를 발표 차트에 그대로 적용해 필수 라벨까지 숨기지는 않습니다. 정확한 상태 계산은 [로직 문서](logic.md)에 있습니다.

## 7. 별빛과 모션

**별은 작고 중심이 밝으며 가장자리가 부드럽게 사라지는 점**으로 표현합니다. 밝기가 시간에 따라 천천히 달라져야 하며, 단색 원판을 크기만 바꿔 깜빡이는 효과는 피합니다.

- Part 2의 기본 별 지도는 셰이더의 중심–가장자리 감쇠와 서로 다른 위상의 밝기 변화로 반짝입니다. 호버는 별의 크기보다 장르색과 밝기를 바꿉니다.
- 배경 성운과 그레인은 낮은 농도로 둡니다. 공통 배경이 있으므로 Part 1에서 배경 Canvas를 중복 생성할 필요가 없습니다.
- 장르색을 표현하는 별과 데이터 점은 장르 팔레트를 따릅니다. 장식 입자와 실제 데이터는 구분합니다.
- 긴 본문에는 반짝임·이동을 적용하지 않습니다. 발표 차트의 값이나 위치는 데이터가 바뀔 때 움직입니다.

| 효과 | 현재 Part 2 값 | Part 1 활용 |
| --- | --- | --- |
| 공통 CSS easing | `cubic-bezier(.22, 1, .36, 1)` / `--ease` | 짧은 등장·상태 전환 |
| 버튼 호버 | 0.2초 | 같은 속도로 사용 |
| 홈 라벨 | 등장 0.3초, 색 0.45초 | 툴팁·선택 강조 참고 |
| 추천 카드 | 0.25초, 호버 시 위로 2px | 클릭 가능한 요소에만 작은 움직임 |
| 카드 안개 | 12초, 왕복 반복 | 장식에만 사용 |
| 카메라 여정 | 1.65초, `power2.inOut` | 공간 이동 전용. 버튼 호버에 사용하지 않음 |
| 여정의 숨김·등장 | fade 0.2초 / reveal 0.4초 | 챕터 내 짧은 전환 참고 |

앱의 공통 CSS는 `prefers-reduced-motion: reduce`에서 애니메이션과 transition을 끕니다. 별도 Canvas·GSAP 애니메이션을 추가하면 해당 코드에서도 모션 감소 설정을 확인해야 합니다. 중요한 정보는 애니메이션이 꺼져도 남아 있어야 합니다.

## 8. Part 1에서 쓰기

공통 색상 변수·폰트·배경은 이미 앱에 적용되어 있습니다. 아래처럼 시각화 컴포넌트에 필요한 패널 스타일만 추가하면 됩니다. `styles`는 위의 예제 CSS를 넣은 해당 컴포넌트의 CSS Module입니다.

```tsx
<section className={styles.figurePanel} data-no-advance aria-labelledby="genre-chart-title">
  <h2 id="genre-chart-title" className={styles.figureTitle}>
    장르별 곡 수
  </h2>
  {/* SVG·Canvas 차트 또는 접근 가능한 데이터 표 */}
  <p className={styles.figureSource}>출처: MTG-Jamendo 장르·악기 데이터</p>
</section>
```

- 챕터의 `visualization` 영역에 넣고 제목·본문과 겹치지 않도록 크기와 위치를 정합니다.
- `data-no-advance`는 차트를 클릭·스크롤할 때 발표가 다음 장으로 넘어가는 것을 막습니다. 직접 조작할 필요가 없는 시각화에는 생략할 수 있습니다.
- SVG·Canvas 차트에도 제목·설명이나 데이터 표를 제공하고, 색 외의 방식으로 선택 상태를 표시합니다.

## 9. 구현 출처와 갱신 기준

| 확인할 내용 | 현재 구현 |
| --- | --- |
| 공통 색상·easing | [tokens.css](../frontend/src/styles/tokens.css) |
| 폰트 로딩 | [index.html](../frontend/index.html) |
| 배경·공통 버튼·포커스·모션 감소 | [global.css](../frontend/src/styles/global.css) |
| 도구막대·유리 카드·패널·글자 크기 | [Interface.module.css](../frontend/src/components/Interface.module.css) |
| 지도 라벨·지도 버튼 | [Scene.module.css](../frontend/src/scene/Scene.module.css) |
| 아이콘 | [Icon.tsx](../frontend/src/components/Icon.tsx) |
| 별빛 셰이더 | [ParticleField.tsx](../frontend/src/scene/ParticleField.tsx) |
| 공간 이동 시간 | [motion.ts](../frontend/src/state/motion.ts) |
| 장르별 실제 색상 | [music-catalog.json](../frontend/public/data/music-catalog.json) |

[초기 콘셉트 명세](references/inner-verse.md)는 아이디어를 보존한 참고 자료입니다. 현재 화면과 다른 내용이 있으므로 재사용할 디자인은 이 가이드와 위 구현 파일을 기준으로 확인합니다.

### 작업 완료 체크리스트

- [ ] 장르 이름과 색상이 Part 2 팔레트와 일치한다.
- [ ] 새 설명·차트 상자와 기본 버튼의 모서리가 직각이다.
- [ ] 발표 거리에서도 본문과 축·범례를 읽을 수 있다.
- [ ] 배경·글로우가 본문과 차트보다 눈에 띄지 않는다.
- [ ] 색상을 보지 않아도 라벨·범례·표식으로 정보를 구분할 수 있다.
- [ ] 키보드 포커스가 보이고 아이콘 버튼에 이름이 있다.
- [ ] 인터랙티브 차트를 조작해도 발표가 넘어가지 않는다.
- [ ] 좁은 화면과 모션 감소 설정에서도 핵심 정보가 유지된다.
