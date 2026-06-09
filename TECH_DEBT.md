# 추후 고칠 점 (Tech Debt / Review Backlog)

2026-06-10 시니어 코드 리뷰에서 나온 항목 중 **이번에 처리하지 않은 것들**.
이번 작업(`0005_lock_tier_columns` + `set-tier` 함수 / 폰트 woff2·서브셋)으로
🔴 #1·#2는 해결됨. 아래는 우선순위순 잔여 백로그.

> 표기: 영향도(🟠 High / 🟡 Medium / 🟢 Low) · 위치 · 문제 · 고칠 방향

---

## 🟠 High

### H1. 공유 다이어리에서 남의 블록을 수정·삭제 가능 (RLS author 체크 누락)
- **위치:** `supabase/migrations/0001_init.sql:148-149` (blocks update/delete 정책)
- **문제:** update/delete 정책이 `is_diary_member(diary_id)`만 검사하고 `author_id = auth.uid()`가 없다. insert에는 있음(`:147`). 공유 다이어리 멤버 누구나 다른 사람 글을 고치고 지울 수 있고, 실시간 동기화와 합쳐지면 데이터 파손으로 이어짐.
- **고칠 방향:** 새 마이그레이션에서 정책 재정의 —
  `using (public.is_diary_member(diary_id) and author_id = auth.uid())`.
  (공유 다이어리에서 "공동 편집"을 의도한다면 별도 권한 모델을 명시적으로 설계.)

### H2. 동기화 충돌 해결 없음 + 감정 이력 유실
- **위치:** `src/lib/cloudStore.ts:109`(전체 행 upsert), `:43`(`rowToBlock`에서 `emotionHistory: []`)
- **문제:**
  - 블록 저장이 last-write-wins 전체 행 upsert. 두 기기/멤버 동시 편집 시 조용히 덮어씀. `updated_at` 컬럼이 있지만 충돌 감지에 안 씀.
  - 클라우드 round-trip에서 `emotionHistory`를 버려, 새로고침하면 감정 모멘텀이 리셋됨 → PRD가 약속한 "최근 3개 블록 이력 유지"가 세션 내에서만 동작(문서·구현 불일치).
- **고칠 방향:** `updated_at` 기반 낙관적 동시성(서버가 더 최신이면 거부/머지). `emotion_history`를 blocks 컬럼으로 영속화하거나, 로드 시 같은 달 블록 순서로 재구성.

### H3. 자동 테스트 0개 / CI 없음
- **위치:** `package.json`(test 스크립트·러너 없음), CI 워크플로 없음
- **문제:** IME 커밋 로직(`TextBlock.tsx`), 감정 모멘텀(`emotionMomentum`), 줌 좌표 변환(`InfiniteCanvas`), 공유 캡쳐(`imageExport`)처럼 회귀가 잦은 코드가 수동 테스트에만 의존. (실제로 공유 캡쳐 버그가 v1.0 내내 살아 있었음.)
- **고칠 방향:** Vitest 도입 → 우선 순수 함수부터(`typographyCalc`, `emotionMomentum`, `imageExport`의 좌표 계산). GitHub Actions에서 `lint + build + test` 게이트.

---

## 🟡 Medium

### M1. AI 쿼터 카운트 레이스 컨디션
- **위치:** `supabase/functions/analyze-emotion/index.ts:65,94`
- **문제:** `used` read → +1 → write 비원자적. 동시 요청이 모두 같은 값을 읽고 통과 → 무료 한도 초과 가능.
- **고칠 방향:** DB 함수/RPC로 원자적 증가
  (`update profiles set ai_calls_today = case when ai_reset_date = current_date then ai_calls_today+1 else 1 end, ai_reset_date = current_date where id = $uid returning ai_calls_today`),
  한도 검사도 같은 트랜잭션에서.

### M2. TextBlock 자체 에디터의 기능 제약
- **위치:** `src/components/TextBlock.tsx` (committed/pending 이중 모델), `:320` `userSelect:none`
- **문제:** 항상 끝에만 append/backspace → 문장 중간 편집 불가. 텍스트 드래그 복사 불가. 붙여넣기 분기(`:192`)가 위태로움.
- **고칠 방향:** 중간 편집이 제품상 필요한지 결정. 필요하면 contentEditable 또는 textarea+오버레이 측정 방식으로 재설계, 불필요하면 "추가 전용"임을 UX로 명시.

### M3. 스트로크 무한 누적 → 저장 페이로드 비대
- **위치:** `src/hooks/useTypingRhythm.ts:27`, `src/hooks/useCanvasData.ts:86`
- **문제:** 모든 키 입력을 `strokes`에 영구 push하고 700ms마다 배열 전체를 jsonb로 재업로드. 타이포 계산은 최근 10개만 사용하는데 전부 저장.
- **고칠 방향:** 링버퍼(최근 N개)만 유지하거나 저장 시 절삭. 또는 스트로크를 영속화 대상에서 제외하고 파생 통계만 저장.

### M4. Edge Function CORS 와일드카드
- **위치:** `supabase/functions/analyze-emotion/index.ts:22`, `set-tier/index.ts`
- **문제:** `Access-Control-Allow-Origin: '*'`. 유효 JWT만 있으면 어느 출처에서나 호출 가능.
- **고칠 방향:** 허용 출처 화이트리스트(프로덕션 도메인 + localhost)로 제한.

### M5. 전체 프로필이 모든 인증 사용자에게 read 공개
- **위치:** `supabase/migrations/0001_init.sql:129` (`profiles read using(true)`)
- **문제:** 친구 검색 의도지만 `tier` 등 모든 사용자의 프로필이 노출됨.
- **고칠 방향:** 검색은 필요한 컬럼만 반환하는 `security definer` RPC로 좁히고, 직접 select 정책은 본인/친구로 제한.

### M6. 실 결제 미연동 (set-tier는 여전히 MOCK)
- **위치:** `supabase/functions/set-tier/index.ts` (TODO 표시됨)
- **문제:** 이번에 tier 쓰기를 서버로 옮겨 보안 구멍(직접 컬럼 쓰기/쿼터 리셋)은 막았지만, 함수 자체는 결제 검증 없이 Pro를 부여하는 mock.
- **고칠 방향:** Stripe Checkout 세션 + webhook(서비스 롤)에서 결제 확인 후에만 tier 갱신. `subscriptions.period_end`/상태 동기화.

---

## 🟢 Low / 코드 품질

### L1. 번들 531KB 단일 청크 (코드 스플리팅 없음)
- **위치:** `src/App.tsx` (모든 페이지 eager import), Vite 빌드 경고
- **고칠 방향:** 라우트 단위 `React.lazy` + `Suspense`. `/pricing`·`/friends`·`/settings`는 지연 로드.

### L2. 전면 인라인 스타일
- **위치:** 거의 모든 컴포넌트
- **문제:** 디자인 토큰/시스템 없음, 렌더마다 스타일 객체 재생성, 테마 확장이 `theme.ts` 문자열 그라디언트에 묶여 깨지기 쉬움.
- **고칠 방향:** CSS Modules/Tailwind/바닐라-extract 등 도입, 공통 토큰 추출.

### L3. 프로덕션에서 키스트로크마다 로깅
- **위치:** `src/components/TextBlock.tsx:125,235` (`logger.log`)
- **고칠 방향:** `logger`가 프로덕션에서 게이팅되는지 확인하고, 안 되면 dev 전용으로.

### L4. 마이그레이션 순차 await
- **위치:** `src/lib/cloudStore.ts:132` (`for...await upsertBlock`)
- **문제:** 블록 많으면 느림, 중간 실패 시 플래그 미설정. (id 기반 upsert라 재실행은 안전.)
- **고칠 방향:** 배치 upsert(한 번의 `upsert([...])`)로.

### L5. 죽은 스키마 `subscriptions`
- **위치:** `0001_init.sql:80`
- **문제:** 테이블만 있고 M6 전까지 사실상 미사용.
- **고칠 방향:** M6(Stripe) 작업 시 실제 연동하거나 제거.

### L7. 폰트를 git/번들에서 분리해 CDN으로
- **위치:** `public/fonts/` (현재 woff2 145개 ≈ 63MB가 리포지토리·배포에 포함)
- **문제:** v1.2에서 389MB→63MB로 줄였지만 여전히 git 히스토리·Vercel 배포에 폰트 바이너리가 들어감.
- **고칠 방향:** 폰트를 Supabase Storage/CDN으로 옮기고 `@font-face` URL을 외부로. 무거운 변종(2~5MB woff2: `calm-7`, `neutral-2`, `melancholy-4` 등)은 추가 서브셋/교체 검토.

### L6. 줌 transform: scale의 텍스트 렌더링
- **위치:** `src/components/InfiniteCanvas.tsx` (world 레이어 `transform: scale`)
- **문제:** 큰 확대 시 GPU 합성으로 텍스트가 약간 흐려질 수 있음(현재 규모에선 무해).
- **고칠 방향:** 필요해지면 폰트 크기 자체를 스케일링하는 방식으로 전환 검토.
