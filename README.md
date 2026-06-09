# typing-dot

> **무엇을 썼는가보다, 어떤 상태로 쓰고 있었는지를 기록한다.**

타이핑하는 순간의 감정과 리듬을 텍스트 자체에 새기는 감정 반응형 글쓰기 캔버스.
AI가 문장의 감정을 분석해 폰트를 바꾸고, 키 입력 속도가 글자의 크기·굵기·기울기를 실시간으로 결정한다.

🔗 **라이브:** https://typing-dot.vercel.app

---

## 어떻게 동작하나

### 1. 감정 → 폰트 (AI 분석)
텍스트 블록에 15자 이상·단어 3개 이상을 입력하고 잠시 멈추면, 서버의 AI(OpenRouter)가 문장의 감정을 분석한다.
감정마다 수십 종의 한글 손글씨/디스플레이 폰트가 묶여 있고, 분석된 감정의 폰트 풀에서 **하나를 무작위로 골라** 블록에 적용한다 — 같은 감정이어도 매번 다른 글씨체로 쓰인다.

| 감정 | 결 |
|------|------|
| `joy` | 밝고 통통 튀는 손글씨 |
| `delight` | 화사하고 장식적인 디스플레이 |
| `calm` | 차분하고 균형 잡힌 본문체 |
| `sadness` | 얇고 가라앉은 필기체 |
| `melancholy` | 무게 있는 명조·세리프 |
| `anxiety` | 불안정하고 흔들리는 획 |
| `anger` | 굵고 압축된 강한 글씨 |
| `neutral` | 기본 본문 폰트 |

> 폰트 파일은 `public/fonts/`에 로컬로 두고 `src/data/emotion-fonts.json`이 감정별로 묶는다. (`@font-face`는 `fontLoader.ts`가 자동 등록)

### 2. 타이핑 리듬 → 크기·굵기·기울기 (실시간)
키 입력 간격(IKI, Inter-Key Interval)을 측정해 타이핑 에너지를 글자에 반영한다.

| 상태 | 조건 | 크기 | 굵기 | 기울임 |
|------|------|------|------|--------|
| 빠른 타이핑 | IKI < 150ms | 1.4× | Bold 700 | — |
| 보통 | 150–400ms | 1.0× | Regular 400 | — |
| 느린 타이핑 | 400–900ms | 0.85× | Light 300 | — |
| 망설임 | IKI > 900ms | 0.7× | Thin 200 | italic |
| 연속 백스페이스 | 3회 이상 | — | — | italic |

문자별 스타일은 `charStyles`로 스냅샷되어 새로고침 후에도 유지된다.

### 3. 감정 모멘텀
AI가 `neutral`이나 `unclassified`(분석 불가)를 반환해도 폰트가 갑자기 초기화되지 않는다.
최근 블록의 감정 이력을 유지하며 이전 감정을 부드럽게 이어간다.

```
B1: joy       → joy 폰트 적용
B2: neutral   → 이전 joy 유지 (이력엔 기록, 폰트는 블렌딩)
B3: 분석 실패 → unclassified → joy 유지
B4: sadness   → sadness로 전환
B5: sadness   → 2회 연속 확정 → 이력 리셋, 완전 고정
```

---

## 주요 기능

- **무한 캔버스** — 클릭/탭으로 어디에나 글을 쓰고, 드래그(모바일은 두 손가락)로 이동
- **줌** — PC는 마우스 휠, 모바일은 두 손가락 핀치로 확대/축소 (0.3×–3×)
- **퀵 색상 메뉴** — 길게 눌러 방사형 팔레트에서 글자 색을 고르고, 팔레트는 직접 편집
- **캔버스 테마** — 기본 점지·줄노트·모눈·옛 종이·크라프트지 (Pro)
- **클라우드 동기화** — 로그인하면 월별 기록이 Supabase에 저장되고 기기 간 동기화
- **이미지로 공유** — 원하는 영역을 드래그 선택해 4:5 / 1:1 / 자유 비율 이미지로 내보내기·공유 (Pro)
- **친구** — 친구를 추가하고 서로의 캔버스를 둘러보기

---

## 요금제

| | Free | Pro |
|------|------|-----|
| AI 감정 분석 | 하루 20회 | 무제한 |
| 기록 보관 | 제한 | 무제한 |
| 프리미엄 폰트 | — | ✓ |
| 캔버스 테마 | 기본 | 전체 |
| 이미지 내보내기/공유 | — | ✓ |

> 한도는 `src/lib/entitlements.ts`에 정의되며, AI 호출 한도는 Edge Function에서 서버 측으로 강제된다.

---

## 시작하기

```bash
git clone https://github.com/Moder4te/typing-dot.git
cd typing-dot
npm install
npm run dev
```

### 환경 변수

`.env` (예시는 `.env.example` 참고):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

AI 키(OpenRouter)는 **클라이언트에 두지 않는다.** Supabase Edge Function `analyze-emotion`이 서버에서 호출하고 호출 한도도 서버에서 관리한다. 프론트엔드는 키를 전혀 몰라도 된다.

```bash
npm run dev      # 개발 서버
npm run build    # 타입체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

---

## 사용법

1. 캔버스의 원하는 위치를 **클릭(모바일: 탭)** → 커서 생성
2. 자유롭게 타이핑 — 키 속도에 따라 글자 크기·굵기가 실시간으로 변한다
3. 15자 이상 입력 후 잠시 멈추면 AI가 감정을 분석해 폰트가 바뀐다
4. **드래그(모바일: 두 손가락)** 로 이동, **휠/핀치**로 확대·축소
5. 길게 눌러 **글자 색** 선택, `Esc` 로 블록 비활성화
6. 사이드바에서 월별 기록 탐색, 영역을 선택해 **이미지로 공유**

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 프레임워크 | React 19 + TypeScript |
| 라우팅 | React Router 7 |
| 번들러 | Vite |
| 인증·DB·서버리스 | Supabase (Auth / Postgres / Edge Functions) |
| AI | OpenRouter (서버 측 `analyze-emotion` Edge Function) |
| 이미지 내보내기 | html-to-image |
| 폰트 | 감정별 로컬 한글 폰트 — woff2 서브셋 (`public/fonts/`, 변환: `scripts/subset-fonts.py`) |
| 배포 | Vercel |

---

## 프로젝트 구조

```
src/
├── data/
│   └── emotion-fonts.json     # 감정 → 폰트 변종 묶음
├── auth/
│   └── AuthProvider.tsx       # Supabase 인증 컨텍스트
├── pages/
│   ├── CanvasPage.tsx         # 메인 캔버스
│   ├── AuthPages.tsx          # 로그인 / 회원가입
│   ├── PricingPage.tsx        # 요금제
│   ├── FriendsPage.tsx        # 친구
│   └── SettingsPage.tsx       # 설정
├── lib/
│   ├── emotionAnalyzer.ts     # analyze-emotion Edge Function 호출
│   ├── emotionMomentum.ts     # 감정 모멘텀 · 폰트 결정
│   ├── typographyCalc.ts      # IKI → 크기 · 굵기 · 기울기
│   ├── fontLoader.ts          # 로컬 폰트 @font-face 등록
│   ├── theme.ts               # 캔버스 테마
│   ├── palette.ts             # 글자 색 팔레트
│   ├── imageExport.ts         # 영역 캡쳐 · 공유 이미지 합성
│   ├── billing.ts             # 요금제 / 결제
│   ├── entitlements.ts        # 티어별 권한
│   ├── cloudStore.ts          # Supabase 캔버스 동기화
│   ├── social.ts              # 친구 기능
│   ├── supabase.ts            # Supabase 클라이언트
│   └── storage.ts             # 로컬 저장 · 블록 생성
├── hooks/
│   ├── useTypingRhythm.ts     # 키스트로크 IKI 측정
│   ├── useCanvasData.ts       # 캔버스 데이터(로컬/클라우드)
│   ├── useTheme.ts            # 테마 상태
│   └── usePalette.ts          # 팔레트 상태
└── components/
    ├── InfiniteCanvas.tsx     # 무한 캔버스 · 팬 · 줌
    ├── TextBlock.tsx          # 감정 폰트 + 리듬 타이포그래피
    ├── Sidebar.tsx            # 사이드바 / 월별 기록
    ├── ShareImageModal.tsx    # 이미지 공유 모달
    ├── SelectionOverlay.tsx   # 공유 영역 선택
    ├── RadialColorMenu.tsx    # 방사형 퀵 색상 메뉴
    ├── PaletteEditor.tsx      # 팔레트 편집
    └── EmotionIndicator.tsx   # AI 분석 상태 토스트
```

자세한 기능 명세는 [`prd.md`](./prd.md), 버전별 변경 이력은 [`CHANGELOG.md`](./CHANGELOG.md) 참고.
