# typing-dot

> **무엇을 썼는가보다, 어떤 상태로 쓰고 있었는지를 기록한다.**

타이핑하는 순간의 감정과 리듬을 텍스트 자체에 새기는 감정 반응형 글쓰기 캔버스.  
AI가 문장의 감정을 분석해 폰트를 바꾸고, 키 입력 속도가 글자의 크기와 굵기를 실시간으로 결정한다.

---

## 어떻게 동작하나

### 1. 감정 → 폰트 (AI 분석)
텍스트 블록에 15자 이상, 단어 3개 이상을 입력하고 1초간 멈추면 Claude 또는 Gemini API가 감정을 분석한다.  
분석 결과에 따라 해당 감정에 매핑된 한국어 폰트가 블록 전체에 적용된다.

| 감정 | 폰트 | 느낌 |
|------|------|------|
| joy | Gamja Flower | 둥글고 밝은 손글씨 |
| sadness | Nanum Myeongjo | 얇고 무게있는 명조 |
| anger | Black Han Sans | 굵고 압축된 고딕 |
| fear | Nanum Pen Script | 불규칙한 펜 필기체 |
| calm | Sunflower | 가볍고 균형잡힌 산세리프 |
| surprise | Jua | 두툼하고 강조된 디스플레이 |
| neutral | Noto Serif KR | 기본 세리프 |

### 2. 타이핑 리듬 → 크기·굵기·기울기 (실시간)
키 입력 간격(IKI, Inter-Key Interval)을 측정해 타이핑 에너지를 시각화한다.

| 상태 | 조건 | 크기 | 굵기 | 기울임 |
|------|------|------|------|--------|
| 빠른 타이핑 | IKI < 150ms | 1.4× | Bold 700 | — |
| 보통 | 150–400ms | 1.0× | Regular 400 | — |
| 느린 타이핑 | 400–900ms | 0.85× | Light 300 | — |
| 망설임 | IKI > 900ms | 0.7× | Thin 200 | italic |
| 연속 백스페이스 | 3회 이상 | — | — | italic |

### 3. 감정 모멘텀
AI가 `neutral` 또는 `unclassified`를 반환해도 폰트가 갑자기 초기화되지 않는다.  
최근 3개 블록의 감정 이력을 유지하며 이전 감정을 부드럽게 이어간다.

```
B1: joy       → Gamja Flower 적용
B2: neutral   → 이전 joy 폰트 유지 (neutral은 이력에 기록되지만 폰트는 유지)
B3: API 실패  → unclassified → 여전히 joy 폰트 유지
B4: sadness   → Nanum Myeongjo로 전환
B5: sadness   → 2회 연속 확정 → 이력 리셋, 완전 고정
```

---

## 시작하기

### 설치

```bash
git clone https://github.com/Moder4te/typing-dot.git
cd typing-dot
npm install
npm run dev
```

### API 키 설정

앱 실행 후 사이드바 **Settings** 패널에서 API 키를 입력한다.  
키 없이도 타이핑 리듬 기반 크기·굵기·기울기 변화는 동작한다. AI 감정 분석은 키 입력 후 활성화된다.

- **Claude API 키** — [console.anthropic.com](https://console.anthropic.com)
- **Gemini API 키** — [aistudio.google.com](https://aistudio.google.com)

두 키를 모두 입력하면 주 API 실패 시 자동으로 나머지로 재시도한다.

---

## 폰트 커스터마이징

`src/data/emotion-fonts.json` 을 수정해 각 감정에 원하는 폰트를 연결할 수 있다.

```json
{
  "joy": {
    "family": "원하는 폰트명",
    "google": "https://fonts.googleapis.com/css2?family=..."
  }
}
```

---

## 사용법

1. 흰 캔버스의 원하는 위치를 **클릭** → `…` 커서 생성
2. 자유롭게 타이핑 — 키 속도에 따라 글자 크기·굵기가 실시간으로 변한다
3. 15자 이상 입력 후 잠시 멈추면 AI가 감정을 분석해 폰트가 바뀐다
4. 캔버스를 **드래그**해 자유롭게 이동
5. `Esc` 키로 현재 블록 비활성화
6. 사이드바 **Diary** 에서 월별 기록 탐색

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 프레임워크 | React 19 + TypeScript |
| 번들러 | Vite |
| AI | Claude API (Anthropic) / Gemini API (Google) |
| 저장 | localStorage |
| 폰트 | Google Fonts (한국어 감정 폰트 7종) |
| 스타일 | Inline styles + CSS animations |

---

## 프로젝트 구조

```
src/
├── data/
│   └── emotion-fonts.json     # 감정 → 폰트 매핑
├── lib/
│   ├── emotionAnalyzer.ts     # Claude / Gemini API 호출
│   ├── emotionMomentum.ts     # 감정 모멘텀 · 이력 해석
│   ├── typographyCalc.ts      # IKI → 크기 · 굵기 · 기울기
│   ├── fontLoader.ts          # Google Fonts 동적 로드
│   └── storage.ts             # localStorage 저장·불러오기
├── hooks/
│   └── useTypingRhythm.ts     # 키스트로크 IKI 측정
└── components/
    ├── TextBlock.tsx           # 감정 폰트 + 리듬 타이포그래피
    ├── InfiniteCanvas.tsx      # 무한 캔버스 · 팬 이동
    ├── Sidebar.tsx             # Diary / Settings 패널
    └── EmotionIndicator.tsx    # AI 분석 상태 토스트
```
