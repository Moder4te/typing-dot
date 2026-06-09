# Changelog

## v1.1 (2026-06-10)

### 캔버스 줌
- **PC** — 마우스 휠로 확대/축소 (커서 위치 기준, 0.3×–3×)
- **모바일** — 두 손가락 핀치로 확대/축소 + 이동 동시 처리
- 블록 생성 좌표를 줌 스케일에 맞춰 월드 좌표로 변환
- 하단 힌트에 확대/축소 안내 추가

### 공유 캡쳐 버그 수정
- 캔버스를 이동(패닝)/줌한 상태에서 공유 이미지가 선택 영역과 어긋나던 문제 수정
  - 월드 레이어의 `left`/`top`(패닝 오프셋)과 `transform: scale`(줌)이 캡쳐 클론에 남아 결과가 밀리던 원인
  - `renderRegion`에서 `left`/`top`을 0으로 초기화하고 `transform`을 `translate`로만 덮어써 월드 좌표 기준으로 정확히 잘리도록 함
  - 선택 영역(화면 좌표)을 줌 스케일로 나눠 월드 좌표로 변환 (`ShareImageModal`)

---

## v1.0 (2026-06-08) — 상용 빌드

### 인증 / 클라우드
- Supabase 기반 회원가입·로그인 및 보호된 라우트(`ProtectedRoute`)
- 월별 캔버스 기록을 Supabase에 저장하고 기기 간 동기화(`cloudStore`)
- 로컬 기록 → 클라우드 마이그레이션 배너(`MigrationBanner`)

### 요금제 / 권한
- Free / Pro 티어 도입 (`entitlements`, `billing`)
  - Free: AI 분석 하루 20회 · 기록/폰트/테마/내보내기 제한
  - Pro: AI 무제한 · 무제한 기록 · 프리미엄 폰트 · 전체 테마 · 이미지 내보내기
- 요금제 페이지(`/pricing`)

### AI 파이프라인 전환
- 클라이언트 API 키 입력 방식 폐기 → Supabase Edge Function `analyze-emotion`으로 이전
- OpenRouter 키는 서버에만 보관, AI 호출 한도도 서버 측에서 강제

### 감정 폰트 개편
- 감정 레이블 재정의: `joy · delight · calm · sadness · melancholy · anxiety · anger · neutral`
- 감정마다 수십 종의 로컬 한글 폰트를 묶고, 블록마다 무작위로 한 종을 선택
- 폰트를 Google Fonts → `public/fonts/` 로컬 파일로 전환

### 소셜 / 공유
- 친구 추가 및 캔버스 둘러보기(`/friends`, `social`)
- 영역 선택 → 4:5 / 1:1 / 자유 비율 이미지로 내보내기·공유 (`SelectionOverlay`, `ShareImageModal`, `imageExport`)
- 글자 색 방사형 퀵 메뉴 및 팔레트 편집(`RadialColorMenu`, `PaletteEditor`)

### 테마
- 캔버스 테마 추가: 기본(점지) · 줄노트 · 모눈 · 옛 종이 · 크라프트지 (`theme`)

---

## v0.4.1 (2026-06-02)

### 터치 인터페이스 개선
- **한 손가락 탭** → 해당 위치에 텍스트 블록 생성 및 타이핑 모드 진입
- **두 손가락 드래그** → 캔버스 이동 (기존 한 손가락 이동 방식 변경)
- 하단 힌트 문구 터치/비터치 기기별 분기 표시
- 힌트 문구 폰트 크기 확대 (가독성 개선)
- 힌트 문구 앱 시작 5분 후 자동 숨김

---

## v0.4 (2026-06-02)

### UI / 레이아웃
- 노트 배경색 `#faf9f6` → `#fafafa` 통일
- 메뉴바·사이드바·버튼 폰트 Helvetica Neue 적용
- 사이드바: 화면 좌측 8px 트리거 바에 hover/tap 시에만 슬라이드인, 기본 화면은 노트 풀스크린
- 분석 버튼: 우상단 빨간 점으로 숨김, hover 시 전체 버튼 표시
- 디버그 콘솔: 우하단 점으로 숨김, hover 시 전체 콘솔 표시

### 반응형 / 모바일 지원
- 캔버스 터치 이벤트 추가 (panning, 탭으로 블록 생성)
- 모바일 사이드바 탭 토글 및 바깥 탭으로 닫기
- `touch-action: none` 적용으로 브라우저 기본 스크롤 충돌 방지
- textarea `font-size: 16px` 설정으로 iOS 자동 줌 방지
- textarea `height: 44px`로 iOS 포커스 신뢰성 향상

### IME 입력 버그 수정
- textarea `value` 제어 방식 → uncontrolled(`defaultValue`)로 전환
  - 기존: React가 렌더마다 `value`를 재설정 → 조합 중 IME 세션 강제 종료 → 자모 분리 버그
- `handleKeyDown`에서 `e.nativeEvent.isComposing || isComposingRef.current` 이중 체크
  - iPadOS + 블루투스 키보드 환경에서 `isComposing`이 항상 `false`로 오보고되는 문제 대응
- `compositionEnd`에서 `e.data` 대신 `textarea.value` 직접 읽기 (크로스 브라우저 안정성)
- `onChange`에서 삭제 감지 로직 추가 (Android 가상키보드 `key="Unidentified"` 백스페이스 대응)
- `compositionEnd` 시 `consecutiveBsRef` 초기화

### 로컬 폰트 지원
- `public/fonts/{joy,sadness,anger,fear,calm,surprise,neutral}/` 폴더 구조 생성
- `emotion-fonts.json`에 `local` 필드 추가 지원
- `fontLoader.ts`에서 로컬 폰트 `@font-face` 자동 등록
- Google Fonts 폴백 유지 (local 미설정 시 기존대로 동작)

---

## v0.3 (2026-05-28)

### 디버그 콘솔
- Raw data export 버튼 추가 (타이핑 데이터 JSON 복사)
- 콘솔 로그 복사 기능

---

## v0.2 (2026-05-28)

### 핵심 기능
- OpenRouter API 연동 (감정 분석)
- 문자별 타이포그래피 적용 (글자마다 크기·굵기·기울기 독립 계산)
- 한국어 IME 기본 처리 (compositionStart/End 핸들링)

---

## v0.1 (2026-05-28)

### 초기 구현
- 감정 반응형 글쓰기 캔버스 기본 구조
- 무한 캔버스 (pan + 텍스트 블록 배치)
- 타이핑 리듬 기반 폰트 변화 (IKI 측정)
- 감정별 폰트 매핑 (`emotion-fonts.json`)
- 로컬스토리지 월별 저장
