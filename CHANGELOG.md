# Changelog

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
