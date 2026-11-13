# INNER//VERSE — immersive music-discovery prototype build prompt

## 작업 원칙

아래 명세에 따라 실제 실행 가능한 웹페이지를 구현하라. 계획서나 코드 예시만 제시하지 말고 프로젝트 생성, 애셋 준비, 구현, 실행, 브라우저 검증까지 완료한다.

불명확한 세부사항은 전체 콘셉트와 기술적 안정성을 기준으로 합리적으로 결정하고 계속 진행한다. 외부 인증이나 필수 파일 누락처럼 작업을 막는 문제가 있을 때만 질문한다.

이번 결과물은 데스크톱 중심의 인터랙티브 프로토타입이다. 실제 음악 검색 API, 스트리밍, 로그인, 백엔드와 데이터베이스는 구현하지 않는다.

---

## 1. Goal

가상의 노래 탐색 서비스 **“INNER//VERSE”**를 만든다.

서비스의 핵심 은유는 다음과 같다.

> 사람의 뇌 안에는 아직 도달하지 못한 우주가 있고, 노래를 발견할 때마다 그 우주에서 새로운 장소로 이동할 수 있다.
> 

페이지는 검은 공간에 떠 있는 반짝이는 뇌에서 시작한다. 뇌는 수만 개의 은백색 입자로 이루어져 있으며, 보라색·푸른색·청록색·아주 적은 주황색 신호가 신경망을 따라 흐른다. 이 신호는 뇌를 통과하는 노래의 흐름을 상징한다.

사용자가 `Enter` 버튼을 누르면 카메라가 뇌에서 가장 밝게 빛나는 신경 지점을 향해 빠르게 이동한다. 뇌의 입자는 별로 바뀌고 신경 신호는 성운과 별자리로 이어진다. 장면 전환이 끝나면 사용자는 자신의 뇌 안에 존재하는 거대한 우주에 들어와 있다.

우주에서는 캐릭터나 몸이 보이지 않는다. 사용자는 1인칭 시점으로 작은 시작 행성에 서 있다. 멀리 다른 별과 성운이 보이지만 연결된 길이 없어 이동할 수 없다. 앞으로 가려고 하면 아주 희미한 입자 장벽이 나타나 고립감을 전달한다.

화면의 추천곡 카드 중 하나를 선택하면 입자들이 별자리 형태의 이동 경로를 만든다. 카메라는 그 경로를 따라 목적지까지 비행한다. 도착하면 해당 곡의 감정과 질감을 반영한 새로운 우주 환경이 사용자 주위에 3D로 펼쳐진다.

새로운 노래를 발견할수록 우주 지도에 별과 경로가 추가되고, 갈 수 있는 장소가 늘어난다.

---

## 2. Creative references

다음 링크는 분위기와 표현 방식에 관한 참고 자료일 뿐이다. 장면, 문구, 로고, 모델과 레이아웃을 복제하지 않는다.

- 입자로 이루어진 뇌와 몰입형 3D 웹 경험:
    
    `https://www.instagram.com/reel/De1dl_quffJ/`
    
- 색감과 파티클 밀도:
    
    `https://www.instagram.com/reel/DfMkNY3uBfE/`
    

참고할 요소:

- 깊은 검은색 배경
- 은백색 입자 덩어리
- 희미한 인디고와 바이올렛
- 제한적인 전기 청색과 청록색
- 매우 적은 따뜻한 주황색 포인트
- 넓은 여백
- 천천히 흐르는 입자
- 부드럽고 연속적인 카메라 이동
- 프리미엄 인터랙티브 웹사이트의 절제된 UI

피해야 할 요소:

- 무지개색 우주
- 일반적인 SF 게임 HUD
- 전투, 우주선, 무기
- 만화풍 우주비행사
- 지나치게 밝은 네온
- 폭발과 화면 흔들림
- 영화나 게임 캐릭터의 모방

---

## 3. Experience flow

전체 경험은 다음 순서로 진행한다.

1. 검은 공간에 입자형 뇌가 떠 있다.
2. 신경망을 따라 노래를 상징하는 빛의 파동이 흐른다.
3. 브랜드, 짧은 설명과 `Enter` 버튼이 나타난다.
4. 버튼을 누르면 앰비언트 사운드가 시작된다.
5. 카메라가 뇌의 가장 밝은 지점으로 진입한다.
6. 뇌 입자가 별과 성운으로 변한다.
7. 사용자는 작은 시작 행성에 도착한다.
8. 멀리 여러 목적지가 보이지만 이동 경로가 없다.
9. 추천곡 카드 5개 중 하나를 선택한다.
10. 입자 장벽이 선택한 방향으로 열리고 별자리 길이 생성된다.
11. 카메라가 1인칭으로 별자리 경로를 따라 비행한다.
12. 목적지에서 해당 곡의 우주가 사용자 주위에 펼쳐진다.
13. 곡의 이름과 짧은 설명이 나타난다.
14. 발견한 곡과 경로가 우주 지도에 기록된다.
15. 다른 곡을 선택해 다음 장소로 이동한다.
16. 다섯 곡을 모두 발견하면 완성된 개인 우주를 보여준다.

발견 상태는 새로고침하면 초기화한다. `localStorage`, 쿠키 또는 서버에 저장하지 않는다.

---

## 4. Scope

이번 프로토타입에 포함한다.

- 입자로 이루어진 3D 뇌
- 뇌를 통과하는 음악 신호
- `Enter` 버튼
- 뇌 내부로 진입하는 카메라 전환
- 뇌 입자에서 별로 이어지는 모핑
- 시작 행성과 입자 장벽
- 가상의 추천곡 5개
- 노래 카드 선택
- 별자리 경로 생성
- 목적지까지의 1인칭 비행
- 곡마다 다른 우주 공간
- 발견 진행률
- 간단한 우주 지도
- 저작권 문제가 없는 절차적 앰비언트 사운드
- 사운드 켜기/끄기
- reduced motion 지원

포함하지 않는다.

- 실제 음악 검색
- 실제 음악 스트리밍
- Spotify, Apple Music 또는 YouTube API
- 실제 앨범 커버
- 사용자 계정
- 추천 알고리즘
- 모바일 전용 조작
- 자유 이동 게임
- WebXR 또는 VR

---

## 5. Stack and setup

다음 기술을 사용한다.

- Vite
- React 19
- TypeScript
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- GSAP
- `@react-three/postprocessing`
- `postprocessing`
- CSS Modules
- 전역 디자인 토큰용 일반 CSS
- Web Audio API
- 별도의 상태 관리 라이브러리는 사용하지 않는다.
- UI 또는 CSS 프레임워크를 사용하지 않는다.

프로젝트 생성:

```
npm create vite@latest innerverse -- --template react-ts
cd innerverse
npm install three @react-three/fiber @react-three/drei gsap @react-three/postprocessing postprocessing
npm install -D @types/three
npm run dev
```

TypeScript의 `"strict": true`를 유지한다.

React `<StrictMode>`를 유지한다. 모든 effect에서 이벤트, 타이머, animation frame, GSAP context, AudioContext와 Three.js 리소스를 정리한다.

---

## 6. Folder layout

```
index.html
public/
  assets/
    covers/
      glass-tides.webp
      solar-bloom.webp
      static-hearts.webp
      velvet-gravity.webp
      pale-garden.webp
    nebulae/
      glass-tides.webp
      solar-bloom.webp
      static-hearts.webp
      velvet-gravity.webp
      pale-garden.webp
src/
  main.tsx
  App.tsx
  data/
    tracks.ts
    destinations.ts
  state/
    useExperienceState.ts
  lib/
    brainPoints.ts
    starPoints.ts
    seededRandom.ts
    easing.ts
  audio/
    createAmbientEngine.ts
  styles/
    tokens.css
    global.css
  components/
    Experience/
      Experience.tsx
      Experience.module.css
    Intro/
      IntroOverlay.tsx
      IntroOverlay.module.css
    Scene/
      SceneRoot.tsx
      CameraRig.tsx
      ParticleBrain.tsx
      NeuralPulse.tsx
      BrainDive.tsx
      StarField.tsx
      OriginPlanet.tsx
      ParticleBarrier.tsx
      ConstellationPath.tsx
      TravelSequence.tsx
      DestinationWorld.tsx
      WorldReveal.tsx
      Effects.tsx
    UI/
      Header.tsx
      RecommendationDock.tsx
      TrackCard.tsx
      TrackDetail.tsx
      DiscoveryProgress.tsx
      StarMap.tsx
      Instruction.tsx
      SoundToggle.tsx
      CompletionOverlay.tsx
      UI.module.css
```

한 파일에 전체 Three.js 장면과 모든 상태를 몰아넣지 않는다.

---

## 7. Page metadata

페이지 제목:

```
INNER//VERSE — Every song opens a new world
```

메타 설명:

```
노래를 발견하고, 내면의 우주에서 새로운 별과 세계로 이동해 보세요.
```

빈 favicon을 사용한다.

```
<link rel="icon" href="data:,">
```

---

## 8. Brand and copy

브랜드명:

```
INNER//VERSE
```

영문 태그라인:

```
Every song opens a new world.
```

한국어 소개:

```
당신의 뇌 안에는 아직 도달하지 못한 우주가 있습니다.
노래를 발견하고, 새로운 세계로 이동해 보세요.
```

입장 버튼:

```
ENTER
```

우주 도착 후 최초 안내:

```
보이지만 닿을 수 없는 곳들이 있습니다.
노래를 선택해 첫 번째 길을 열어 보세요.
```

노래 선택 전:

```
어떤 소리가 당신의 다음 세계를 열까요?
```

이동 중:

```
새로운 신호를 따라가는 중…
```

도착 직후:

```
새로운 세계가 열렸습니다.
```

전체 완료:

```
당신의 우주가 완성되었습니다.
다섯 개의 노래가 서로 다른 세계를 하나의 별자리로 연결합니다.
```

---

## 9. Design direction

### Overall mood

- 깊고 고요함
- 아름답지만 약간 고립된 느낌
- 신비롭고 사색적
- 미래적이지만 차갑기만 하지 않음
- 입자와 공간이 유기적으로 호흡함
- UI는 장면보다 조용하게 존재함
- 화면 대부분은 검은 공간과 여백으로 유지

### Color hierarchy

화면의 약 70~80%는 검정 또는 검정에 가까운 남색이다.

은백색 입자가 주된 정보와 형태를 만든다.

바이올렛과 인디고는 주요 감정색이다.

청록과 주황은 신호와 선택 상태에 제한적으로 사용한다.

---

## 10. Design tokens

`src/styles/tokens.css`에 정의한다.

```
:root {
  --void: #020205;
  --void-soft: #070711;
  --void-blue: #090b18;

  --white: #ffffff;
  --silver: #d9dcea;
  --silver-muted: #8f94a8;

  --indigo: #343b92;
  --violet: #7657c8;
  --violet-soft: #a999dc;

  --blue: #4679d8;
  --cyan: #64cbd4;
  --amber: #e6a55c;
  --rose: #b96786;

  --glass: rgba(10, 11, 22, 0.58);
  --glass-hover: rgba(19, 20, 37, 0.72);
  --glass-edge: rgba(220, 224, 255, 0.18);
  --glass-edge-strong: rgba(220, 224, 255, 0.42);

  --text-primary: #f7f7fb;
  --text-secondary: #a9acba;
  --text-dim: #6f7280;

  --radius-sm: 10px;
  --radius-md: 18px;
  --radius-pill: 999px;

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

---

## 11. Typography

Google Fonts:

- UI and display sans: `Instrument Sans`, weights 400, 500, 600
- Poetic accent: `Instrument Serif`, italic 400

사용 규칙:

- 브랜드: Instrument Sans 500, 넓은 자간
- 큰 영문 태그라인: Instrument Sans 400
- 한국어 설명: Instrument Sans 400
- 곡명: Instrument Sans 500
- 감정 문구 한 줄: Instrument Serif italic

권장 크기:

- Brand: 14px, letter-spacing `0.22em`
- Intro headline: `clamp(48px, 6vw, 92px)`
- Intro description: 17px
- Track title: 18px
- Artist: 13px
- UI text: 13~14px
- Small label: 11px

---

## 12. Desktop scope

주요 해상도:

- 1440×900
- 1280×720
- 1920×1080
- 1024×768

`height: 100svh`, `overflow: hidden`.

너비가 1024px 미만이면 3D 인터랙션 대신 다음 안내를 표시한다.

```
INNER//VERSE는 현재 넓은 화면에서 가장 깊게 경험할 수 있습니다.
데스크톱 브라우저에서 다시 열어 주세요.
```

모바일 전용 조작은 구현하지 않는다.

---

## 13. State machine

```
type ExperiencePhase =
  | "intro"
  | "entering"
  | "stranded"
  | "selecting"
  | "path-forming"
  | "traveling"
  | "revealing"
  | "settled"
  | "complete";

type TrackId =
  | "glass-tides"
  | "solar-bloom"
  | "static-hearts"
  | "velvet-gravity"
  | "pale-garden";

type ExperienceState = {
  phase: ExperiencePhase;
  selectedTrackId: TrackId | null;
  currentWorldId: "origin" | TrackId;
  discovered: Set<TrackId>;
  soundEnabled: boolean;
};
```

매 프레임 변하는 카메라 위치, 파티클 위치와 shader uniform은 React state가 아닌 `ref`, `useFrame`과 Three.js object mutation으로 관리한다.

---

## 14. Intro scene — particle brain

### Composition

- 검은 공간 중앙에 뇌가 떠 있다.
- 뇌는 화면 너비의 약 38~44%를 차지한다.
- 정면보다 약간 측면을 보여주는 3/4 각도
- 아주 느리게 회전
- 사용자가 마우스를 움직이면 최대 4도 정도 반응
- 배경에는 뇌보다 훨씬 희미한 먼지 입자만 존재
- 처음부터 우주처럼 많은 별을 보여주지 않는다.

### Brain geometry

외부 3D 뇌 모델에 의존하지 않고 절차적으로 생성한다.

- 약 32,000~48,000개의 point
- 좌우 두 개의 비대칭 ellipsoid hemisphere
- 중앙 fissure가 보이도록 X축 중앙의 일부 점을 제거
- sinusoidal displacement를 여러 축에 적용해 뇌 주름 생성
- 완벽한 의학 모델이 아니라 인식 가능한 예술적 뇌 형태
- `BufferGeometry`와 커스텀 point shader 사용
- 둥근 점 sprite
- `AdditiveBlending`
- `depthWrite: false`
- 점 크기는 깊이에 따라 약간 달라짐

색상:

- 약 75%: 은백색
- 약 15%: 희미한 인디고
- 약 7%: 바이올렛 또는 청록
- 약 3%: 따뜻한 주황 신호

### Music flowing through the brain

“노래가 뇌를 통과한다”는 느낌을 다음 방식으로 표현한다.

- 뇌 표면과 내부를 지나는 7~9개의 `CatmullRomCurve3`
- 각 경로 위로 밝은 pulse가 이동
- pulse의 앞부분은 흰색
- 꼬리는 바이올렛·청록·주황 중 하나
- 한 pulse가 지나가면 주변 point가 약 0.8초 동안 밝아졌다가 감소
- 경로 전체를 선으로 항상 표시하지 않는다.
- 신호가 지나갈 때만 신경 연결이 잠깐 드러남
- pulse 속도는 각각 약간 다름
- 뇌 전체가 동시에 번쩍이지 않음

### Intro UI

왼쪽 하단 또는 화면 왼쪽 중앙에 배치한다.

```
INNER//VERSE

Every song opens a new world.

당신의 뇌 안에는 아직 도달하지 못한 우주가 있습니다.
노래를 발견하고, 새로운 세계로 이동해 보세요.

[ ENTER ]
```

뇌와 텍스트가 겹치지 않게 하되 텍스트가 별도의 카드 안에 갇힌 것처럼 보이지 않게 한다.

---

## 15. Intro timing

페이지 로드 후:

- 0.0–1.2초: 뇌 입자가 어둠 속에서 서서히 나타남
- 0.5–1.7초: 신경 pulse가 시작
- 0.8–1.5초: 브랜드 등장
- 1.0–1.8초: 헤드라인 등장
- 1.2–2.0초: 설명 등장
- 1.4–2.1초: `Enter` 버튼 등장

등장은 opacity와 작은 blur만 사용한다. 큰 이동이나 bounce는 사용하지 않는다.

---

## 16. Brain dive transition

`Enter` 버튼 클릭을 사용자 제스처로 사용해 AudioContext를 시작한다.

버튼 클릭 후 약 3.8초의 연속 장면 전환을 실행한다.

### Phase 1 — Signal lock, 0.0–0.65초

- 뇌의 한 지점이 다른 신호보다 밝아짐
- 주변 신경 pulse가 해당 지점으로 모임
- Intro UI는 0.45초 동안 사라짐
- 카메라는 밝은 지점 방향으로 아주 조금 이동

### Phase 2 — Acceleration, 0.55–1.8초

- 카메라가 선택된 지점을 향해 가속
- 뇌가 단순히 화면에서 확대되는 것이 아니라 실제 3D 공간에서 가까워짐
- point size가 조금 증가
- 주변 입자가 화면 가장자리로 흐름
- 과한 motion blur나 화면 흔들림은 금지

### Phase 3 — Crossing, 1.65–2.45초

- 카메라가 뇌 표면을 통과
- 뇌 point들이 바깥으로 흩어지며 별 위치로 이동
- 중앙의 neural pulse가 길게 늘어나 성운의 중심선이 됨
- 검은 배경을 유지해 장면 전환의 이음새가 보이지 않게 함

### Phase 4 — Inner universe, 2.3–3.8초

- brain point position과 star position 사이를 shader uniform으로 보간
- 뇌 형태는 완전히 사라짐
- 광대한 별과 성운이 나타남
- 카메라 속도가 감소
- 시작 행성의 지평선이 화면 아래에서 들어옴
- 마지막에는 고요하게 멈춤

가능하면 뇌와 별에 같은 point buffer를 사용하고 두 target position 사이를 GPU에서 보간해 장면 전환이 끊겨 보이지 않게 한다.

---

## 17. Origin world

### View

- 1인칭 시점
- 캐릭터, 손, 몸과 우주복이 보이지 않음
- 화면 아래 약 15~22%에 시작 행성의 곡면 지평선
- 표면은 검은 암석과 은백색의 가느다란 신경 패턴
- 하늘에는 멀리 5개의 목적지가 희미하게 보임
- 각 목적지는 아직 이름이 표시되지 않음

### Isolation

시작 행성 주위에 반구형 입자 장벽을 둔다.

- 평소에는 거의 보이지 않음
- 사용자가 마우스로 화면 가장자리나 목적지 방향을 탐색하면 잠깐 드러남
- 수천 개의 작은 은색 점으로 구성
- 장벽을 클릭하면 약한 파동만 퍼지고 통과할 수 없음
- 실패 메시지를 크게 표시하지 않는다.
- 하단 안내 문구만 나타남:

```
아직 이곳을 떠날 수 없습니다.
먼저 하나의 노래를 선택해 보세요.
```

자유 이동은 구현하지 않는다. 마우스 움직임에 따른 시야 반응만 최대 5도 허용한다.

---

## 18. Fictional recommendations

가상의 곡 5개를 사용한다.

### 1. Glass Tides — Luma Vale

- Style: ambient dream pop
- Tags: `Weightless`, `Reflective`
- Length: `03:42`
- Core colors: 인디고, 유리빛 청색, 은백색
- World: 유리 조각처럼 얇은 행성 고리와 물결치는 푸른 성운
- Motion: 투명한 파편이 파도처럼 천천히 움직임
- Description:

```
유리처럼 투명한 파동이 기억의 표면을 천천히 지나가는 곡.
```

### 2. Solar Bloom — Aven Rook

- Style: warm electronica
- Tags: `Radiant`, `Expanding`
- Length: `04:08`
- Core colors: 앰버, 코럴, 짙은 바이올렛
- World: 어두운 공간에서 태양 꽃처럼 펼쳐지는 별과 둥근 빛의 잎
- Motion: 중심에서 얇은 빛 구조가 호흡하듯 열리고 닫힘
- Description:

```
작은 빛이 서서히 팽창하며 차가운 공간에 온기를 만드는 곡.
```

### 3. Static Hearts — IONA/7

- Style: glitch pop
- Tags: `Fractured`, `Electric`
- Length: `02:56`
- Core colors: 시안, 전기 청색, 마젠타를 아주 제한적으로 사용
- World: 끊어진 링, 신호 오류처럼 순간 이동하는 별 조각과 얇은 격자
- Motion: 일부 입자가 짧게 끊기고 다른 위치에서 재생성
- Description:

```
끊어진 신호와 반복되는 박동이 불완전한 감정을 연결하는 곡.
```

### 4. Velvet Gravity — Orin Sable

- Style: downtempo neo-soul
- Tags: `Deep`, `Magnetic`
- Length: `04:31`
- Core colors: 딥 플럼, 인디고, 은색
- World: 벨벳처럼 부드러운 거대 가스 구름과 낮게 휘어진 중력 고리
- Motion: 먼지 구름이 사용자를 중심으로 아주 천천히 회전
- Description:

```
낮고 깊은 리듬이 보이지 않는 중력처럼 마음을 끌어당기는 곡.
```

### 5. Pale Garden — Eira Nox

- Style: ambient orchestral
- Tags: `Still`, `Organic`
- Length: `05:12`
- Core colors: 흰색, 옅은 라벤더, 청록
- World: 꽃잎처럼 펼쳐지는 성운과 반투명한 씨앗 형태의 별
- Motion: 빛의 꽃잎이 생겼다가 먼지로 돌아감
- Description:

```
고요한 현과 숨결 같은 소리가 어둠 속에 작은 정원을 만드는 곡.
```

실제 아티스트, 실제 곡명, 실제 앨범 이미지를 사용하지 않는다.

---

## 19. Recommendation UI

우주 장면의 하단에 추천곡 dock을 표시한다.

- 화면 아래 24px
- 중앙 정렬
- 카드 5개
- 카드 너비 약 190px
- 선택하지 않은 상태에서는 일부만 보이는 수평 배열 가능
- 전체 화면을 많이 가리지 않음

카드 구성:

- 작은 생성형 커버 이미지
- 곡명
- 가상 아티스트명
- 태그 두 개
- 길이
- 발견 상태

Hover:

- 카드가 4px 위로 이동
- 테두리가 조금 밝아짐
- 해당 목적지가 우주에서 약하게 pulse
- 200ms, `var(--ease-out)`

Click:

- 선택 카드만 확장
- 짧은 설명 표시
- CTA: `이 신호를 따라가기`
- 두 번째 클릭 또는 CTA 클릭으로 이동 시작
- 실수로 hover만 해도 이동하지 않음

이동 또는 reveal 중에는 다른 카드를 비활성화한다.

---

## 20. Constellation path

곡 선택 후 입자 장벽이 목적지 방향으로 열린다.

### Path creation

- 카메라에서 목적지까지 `CatmullRomCurve3`
- 완전한 직선이 아닌 완만한 S자 곡선
- 약 280~420개의 instanced point
- point들이 출발점부터 목적지 방향으로 순서대로 나타남
- 별자리의 일부 지점은 조금 크고 밝음
- 선 전체를 굵은 튜브로 만들지 않음
- 얇은 점선과 짧은 연결선만 사용

### Timing

- 0.0–0.4초: 장벽이 목적지 방향으로 갈라짐
- 0.2–1.5초: 별자리 점이 순서대로 생성
- 0.7–1.6초: 목적지가 더 밝아짐
- 1.6초: 카메라 이동 시작

경로 색상은 선택한 곡의 주조색과 은백색을 섞는다.

---

## 21. Travel sequence

이동은 약 4.2초다.

- 카메라는 별자리 curve를 따라 이동
- 진행 초기에는 부드럽게 가속
- 중간 구간에서 가장 빠름
- 목적지 직전에 감속
- 카메라 회전은 tangent 방향을 따라가되 roll은 최대 2도
- 별들이 화면 가장자리로 약간 늘어남
- 과장된 warp tunnel은 만들지 않는다.
- 1인칭 시점을 유지
- 마우스 시야 반응은 이동 중 비활성화

이동 중 화면 중앙에 로더를 표시하지 않는다.

하단에 작은 곡 정보만 표시한다.

```
GLASS TIDES
Luma Vale

새로운 신호를 따라가는 중…
```

---

## 22. Destination reveal

목적지 도착 후 2.8~3.6초 동안 해당 우주가 사용자 주위에 펼쳐진다.

사용자가 말한 “이미지가 3D로 내 주위에 펼쳐지는 느낌”을 다음 방식으로 구현한다.

### Initial arrival

- 도착 직후 공간은 거의 비어 있음
- 선택한 곡의 핵심 빛 하나만 중앙에 존재
- 기존 별은 낮은 opacity

### Layer unfolding

- 16~28개의 투명한 image plane 또는 shader plane을 카메라 주위에 배치
- 처음에는 중앙 방향을 바라보며 서로 포개져 있음
- 각 plane이 다른 깊이와 각도로 펼쳐짐
- plane은 성운의 얇은 층, 먼지, 빛의 결, 행성 고리 등을 담당
- 펼쳐진 후 카메라 이동에 따라 parallax가 생김
- 단순한 배경 이미지 crossfade로 끝내지 않는다.

### Particle construction

- 4,000~12,000개의 world-specific point
- 중심 빛에서 바깥으로 생성
- 각 목적지의 구조와 색을 형성
- 입자 일부는 image plane과 결합해 깊이감을 만듦
- geometry는 반복 가능한 seeded random으로 생성

### Final world

- 전경, 중경, 배경이 명확히 분리
- 카메라 주변 전체에 공간이 존재하는 느낌
- 중앙에 거대한 오브젝트 하나만 두지 않음
- UI를 숨겼을 때도 완성된 3D 공간처럼 보여야 함

---

## 23. World-specific geometry

### Glass Tides

- 투명한 얇은 ring 5~7개
- 유리 파편 instancing
- 수평으로 흐르는 입자 파동
- 푸른 성운 plane
- 반사보다 투명도와 굴절감을 간접적으로 표현
- 실제 고비용 refraction shader는 피함

### Solar Bloom

- 중심 광원 주위의 8~12개 곡선형 petal plane
- 작은 앰버 별 입자
- 낮은 빈도로 열리고 닫히는 구조
- 화면 전체를 주황색으로 채우지 않음

### Static Hearts

- 끊어진 torus segment
- 불연속적인 얇은 grid plane
- 일부 입자의 짧은 위치 jump
- glitch는 화면 전체 필터가 아니라 오브젝트 단위로 제한

### Velvet Gravity

- 반투명 가스 cloud plane
- 큰 곡률의 중력 고리
- 낮고 느린 particle orbit
- 어두운 플럼색이 검은 공간에 거의 녹아들게 함

### Pale Garden

- 반투명 petal geometry
- 작은 seed star
- 꽃잎이 먼지로 분해되는 loop
- 흰색이 과노출되지 않게 함

---

## 24. Camera behavior after arrival

- 사용자가 자유롭게 이동하지 않음
- 마우스 움직임으로 최대 6도까지 시야를 둘러볼 수 있음
- 아주 느린 idle drift
- 트랙 카드를 hover하면 해당 목적지 방향으로 카메라가 1~2도 반응
- UI 카드 선택 중에도 공간이 계속 움직임
- 멀미를 유발할 정도의 자동 회전 금지

이미 발견한 곡을 다시 선택하면 짧은 이동으로 해당 장소를 재방문할 수 있다. reveal 애니메이션 전체를 반복하지 않고 0.8초 정도의 환경 강조만 실행한다.

---

## 25. Star map and progress

화면 오른쪽 위에 작은 `UNIVERSE MAP` 버튼을 둔다.

열면:

- 시작점 1개
- 노래 목적지 5개
- 발견된 장소를 연결하는 얇은 별자리 선
- 현재 위치 강조
- 발견한 곡 수 `2 / 5`
- 미발견 장소는 이름 없이 희미한 점으로 표시
- 지도에서 직접 이동하지는 못함

발견 진행률은 헤더에도 간결하게 표시한다.

```
DISCOVERED  2 / 5
```

---

## 26. Header and controls

화면 상단 24px, 좌우 28px.

왼쪽:

```
INNER//VERSE
```

중앙 또는 오른쪽:

```
DISCOVERED 0 / 5
```

오른쪽:

- Universe map
- Sound toggle
- Restart

`Restart`는 확인 모달 없이 현재 세션을 초기화하고 Intro로 돌아간다. 이번 프로토타입에는 저장 데이터가 없으므로 파괴적 데이터 삭제가 아니다.

UI 스타일:

- 검은 반투명 배경
- 1px 은색 테두리
- 낮은 opacity
- `backdrop-filter: blur(14px)`
- 작은 둥근 모서리
- hover 시에만 밝아짐

---

## 27. Procedural ambient audio

외부 음원 파일이나 저작권 있는 음악을 사용하지 않는다.

Web Audio API로 짧고 반복 가능한 앰비언트 사운드를 생성한다.

### Audio layers

- 매우 낮은 sine drone 2개
- 약한 triangle overtone
- 필터링된 white noise
- 신경 pulse에 대응하는 짧은 bell-like tone
- 이동 중 올라가는 band-pass texture
- 도착 시 길게 남는 soft chord

### Rules

- `Enter` 클릭 전에는 AudioContext를 만들거나 재생하지 않음
- 기본 음량은 낮게: 약 0.16~0.22
- Sound toggle 제공
- 갑작스러운 시작과 종료를 피하고 gain ramp 사용
- 브라우저 탭이 hidden 상태면 gain을 줄임
- unmount 시 oscillator와 AudioContext 정리
- 실제 곡처럼 멜로디를 구성하지 않음
- 8~12초 안에서 자연스럽게 반복되는 추상적 soundscape

각 destination은 같은 엔진을 사용하되 filter cutoff와 chord interval만 다르게 한다.

---

## 28. Post-processing

절제해서 사용한다.

허용:

- 아주 약한 Bloom
- 약한 Vignette
- 제한적인 Noise 또는 grain
- 부드러운 tone mapping

금지:

- 강한 chromatic aberration
- 화면 전체 glitch
- 과도한 bloom
- motion blur 라이브러리 추가
- 세부가 모두 날아가는 밝기

Bloom threshold를 높게 유지해 밝은 신호와 일부 별만 번지게 한다.

---

## 29. Particle implementation

많은 입자를 개별 React 컴포넌트로 만들지 않는다.

- `BufferGeometry`
- `Points`
- `InstancedMesh`
- custom shader
- `useMemo`로 geometry 생성
- seeded random 사용
- shader uniform은 `useFrame`에서 갱신
- 오브젝트 생성과 제거를 매 프레임 반복하지 않음

최대 권장량:

- Brain: 48,000 points
- Background stars: 18,000 points
- Active world: 12,000 points
- Constellation path: 420 points
- Barrier: 4,000 points
- Reveal fragments: 2,000 points

저사양에서 성능이 떨어지면 자동으로 수를 60% 수준으로 낮춘다.

DPR은 최대 2로 제한한다.

---

## 30. AI image generation prompts

이미지 생성 기능을 사용할 수 있다면 다음 애셋을 생성한다. 각 커버와 성운 이미지는 별도의 호출로 만든다.

생성 이미지는 장면 전체를 대신하지 않고 다음 용도로만 사용한다.

- 노래 카드 커버
- Destination의 성운 plane texture
- 깊이 레이어의 일부

3D 입자와 geometry가 반드시 함께 존재해야 한다.

이미지 생성 기능을 사용할 수 없으면 Canvas procedural texture로 대체하고 작업을 계속한다.

### Album cover template

각 곡의 색상과 subject만 교체한다.

```
Use case: stylized-concept
Asset type: fictional album cover for an immersive music-discovery website
Primary request: Create an abstract cosmic artwork for the fictional track "<TRACK TITLE>" by "<ARTIST>".
Subject: <TRACK-SPECIFIC VISUAL>
Style/medium: premium abstract 3D particle art, refined interactive-web aesthetic, cinematic but minimal
Composition: square cover, one clear focal form, generous black negative space
Color palette: near-black, silver-white, <TRACK COLORS>
Lighting/mood: quiet, mysterious and emotionally specific
Text: no text
Constraints: no people, no spaceships, no logos, no watermark, no rainbow colors, no recognizable real album artwork
```

Track-specific visual:

- Glass Tides: `thin glass-like rings and a slow wave of blue-violet particles`
- Solar Bloom: `a small amber star unfolding into translucent cosmic petals`
- Static Hearts: `two fractured electric rings connected by interrupted cyan particles`
- Velvet Gravity: `a deep plum dust cloud bending around a silver gravitational arc`
- Pale Garden: `translucent pale petals and seed-like stars forming in darkness`

### Nebula texture template

```
Use case: stylized-concept
Asset type: wide nebula layer texture for a Three.js immersive scene
Primary request: Create a dark abstract cosmic cloud for "<TRACK TITLE>" using <TRACK COLORS>.
Style/medium: high-detail particle and volumetric nebula art
Composition: wide landscape image, cloud concentrated away from the edges, large transparent-looking black areas for blending
Lighting: restrained luminous particles, no blown highlights
Constraints: no planets, no text, no people, no spaceships, no watermark, no frame, no rainbow palette
```

생성 결과는 `public/assets/covers/`와 `public/assets/nebulae/`에 저장한다.

---

## 31. Procedural visual fallback

AI 애셋을 얻지 못해도 프로토타입이 실행되어야 한다.

Canvas 2D로 다음을 생성한다.

- radial gradient cloud
- seeded star noise
- transparent particle clusters
- track별 색상 texture
- 간단한 추상 앨범 커버

생성 texture:

- `CanvasTexture`
- 적절한 color space 설정
- 필요 없는 mipmap 비활성화
- 장면 종료 시 dispose

---

## 32. Loading

첫 화면에 일반적인 숫자 로더를 크게 보여주지 않는다.

필수 shader와 texture를 준비하는 동안:

- 검은 배경
- 중앙의 작은 은색 점
- 점 주위에 아주 느린 pulse
- 하단에 작은 글자:

```
FORMING A THOUGHT
```

준비가 끝나면 작은 점이 뇌 입자의 첫 점이 되며 Intro로 자연스럽게 이어진다.

에셋 하나가 실패하면 procedural fallback을 사용한다.

---

## 33. Accessibility

- `Enter` 버튼은 키보드 접근 가능
- 추천곡 카드는 실제 `<button>` 사용
- Space와 Enter로 선택
- Sound toggle에 명확한 `aria-label`
- Universe map은 focus trap을 가진 modal 또는 dialog로 구현
- Escape로 닫을 수 있음
- 색상만으로 발견 여부를 구분하지 않음
- 텍스트로 `발견됨` 표시
- WebGL Canvas와 별개로 접근 가능한 트랙 목록 제공

### Reduced motion

`prefers-reduced-motion: reduce`에서는:

- Brain dive를 3.8초에서 0.8초 crossfade로 변경
- 별이 늘어나는 이동 효과 제거
- travel은 1초 fade transition으로 변경
- destination plane 펼침 stagger 제거
- particle 수를 절반으로 감소
- 마우스 parallax 비활성화
- 기능과 탐색 순서는 유지

---

## 34. Performance and cleanup

- Three.js geometry와 material을 가능한 한 재사용
- 사용하지 않는 destination world는 렌더링하지 않거나 opacity 0만으로 남기지 말고 scene에서 비활성화
- texture, geometry, material dispose
- GSAP animation kill 또는 context revert
- resize listener 정리
- AudioContext 정리
- hidden tab에서 고비용 animation 최소화
- Canvas 크기가 0이면 frame 계산 생략
- console error와 React Strict Mode 중복 listener가 없어야 함

---

## 35. Error handling

WebGL을 사용할 수 없으면 다음 메시지를 표시한다.

```
이 브라우저에서는 INNER//VERSE의 3D 우주를 표시할 수 없습니다.
최신 데스크톱 브라우저에서 다시 시도해 주세요.
```

이미지 애셋이 실패하면 procedural texture를 사용한다.

오디오 초기화가 실패해도 시각적 경험은 정상적으로 계속되어야 한다.

---

## 36. Build order

1. Vite 프로젝트와 전역 디자인 토큰 설정
2. 전체 화면 Canvas와 검은 배경
3. 절차적으로 생성한 정적 brain point cloud
4. Brain 회전과 마우스 parallax
5. Neural pulse
6. Intro UI와 `Enter`
7. Brain-to-star position morph
8. 시작 행성과 입자 장벽
9. 추천곡 카드 UI
10. 하나의 곡으로 constellation path와 travel 완성
11. 하나의 destination reveal 완성
12. 나머지 네 destination 추가
13. 우주 지도와 진행률
14. Web Audio 앰비언트 엔진
15. AI 또는 procedural cover·nebula texture
16. 접근성과 reduced motion
17. 성능 최적화
18. 화면 크기별 검수

다섯 개의 세계를 동시에 만들기 전에 `Glass Tides` 하나로 전체 흐름을 완성하고 확인한다.

---

## 37. Verification

다음 명령을 실행한다.

```
npm run lint
npm run build
```

브라우저에서 직접 다음을 확인한다.

- 뇌가 입자로 구성되어 보이는지
- 신호가 뇌를 통과해 흐르는지
- `Enter` 버튼 전에는 소리가 재생되지 않는지
- 클릭 후 앰비언트 사운드가 시작되는지
- 뇌 진입과 별 전환이 끊기지 않는지
- 도착 후 캐릭터나 우주복이 보이지 않는지
- 시작 행성에서 고립된 느낌이 드는지
- 추천곡 카드 5개가 보이는지
- 곡을 선택하기 전에는 이동할 수 없는지
- 선택 후 별자리 길이 생성되는지
- 카메라가 1인칭으로 목적지까지 이동하는지
- 목적지에서 환경 레이어가 사용자 주위에 펼쳐지는지
- 각 곡의 우주가 명확히 다른지
- 실제 노래나 앨범 이미지를 사용하지 않는지
- 발견 진행률이 중복 집계되지 않는지
- 새로고침하면 초기화되는지
- 사운드 토글이 작동하는지
- reduced motion이 작동하는지
- console error가 없는지

---

## 38. Done when

- 
    
    검은 공간에 입자로 이루어진 뇌가 떠 있다.
    
- 
    
    빛의 신호가 뇌를 통과하며 음악의 흐름을 표현한다.
    
- 
    
    브랜드와 `Enter` 버튼이 있다.
    
- 
    
    Enter 클릭 후 뇌 안으로 들어가는 장면이 실행된다.
    
- 
    
    뇌 입자가 별과 성운으로 자연스럽게 변한다.
    
- 
    
    사용자는 캐릭터가 보이지 않는 1인칭 시점이다.
    
- 
    
    시작 행성에 갇힌 느낌이 전달된다.
    
- 
    
    멀리 목적지는 보이지만 처음에는 갈 수 없다.
    
- 
    
    가상의 추천곡 5개가 있다.
    
- 
    
    곡 선택 후 별자리 경로가 만들어진다.
    
- 
    
    카메라가 경로를 따라 목적지까지 이동한다.
    
- 
    
    도착 후 새로운 공간이 사용자 주위에 3D로 펼쳐진다.
    
- 
    
    다섯 곡의 우주가 색, 형태와 움직임 면에서 구분된다.
    
- 
    
    우주 지도와 발견 진행률이 있다.
    
- 
    
    저작권 있는 음악을 사용하지 않는다.
    
- 
    
    Web Audio API 기반 앰비언트 사운드가 있다.
    
- 
    
    사운드 켜기/끄기가 가능하다.
    
- 
    
    새로고침 시 탐색 상태가 초기화된다.
    
- 
    
    1440×900, 1280×720, 1920×1080에서 잘리지 않는다.
    
- 
    
    reduced motion을 지원한다.
    
- 
    
    lint와 build가 통과한다.
    
- 
    
    가로 스크롤과 console error가 없다.
    

---

## 39. Final handoff

구현이 끝나면 다음 내용을 보고한다.

1. 구현한 핵심 경험
2. 주요 파일 위치
3. 실행 방법
4. lint와 build 결과
5. AI 생성 이미지와 procedural texture 중 실제 사용한 방식
6. Web Audio 구현 방식
7. 성능을 위해 조정한 파티클 수
8. 프로토타입에서 제외한 기능
9. 다음 단계에서 실제 음악 검색 API를 연결할 위치