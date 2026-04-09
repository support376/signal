# Signal — Internal MVP

사내 직원 테스트용 MVP. ID 기반 식별, 시나리오 5개 풀이, 자기 분석 + 케미 테스트.

스택: **Next.js 14 (App Router) + Vercel Postgres + Anthropic API + Tailwind**

---

## 1. 로컬 개발

### 1.1 의존성 설치

```bash
cd signal-mvp
npm install
```

### 1.2 환경 변수

`.env.local` 파일을 만들고 다음을 채워:

```bash
ANTHROPIC_API_KEY=sk-ant-...

# Vercel Postgres (로컬에서는 Vercel 대시보드의 .env 탭에서 복사)
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

> 로컬 Postgres를 쓰고 싶으면 `POSTGRES_URL` 만 채워도 동작 (단 SSL 옵션 조정 필요할 수 있음). 가장 간단한 건 Vercel Postgres를 만들고 그 credential을 그대로 복사해 쓰는 것.

### 1.3 DB 초기화

DB 테이블은 첫 API 호출 시 자동 생성됨 (`ensureSchema()` in `lib/db.ts`). 별도 마이그레이션 불필요.

### 1.4 dev 서버

```bash
npm run dev
```

→ http://localhost:3000

---

## 2. Vercel 배포

### 2.1 GitHub repo 생성 + push

```bash
cd signal-mvp
git init
git add .
git commit -m "Signal MVP v0"
gh repo create signal-mvp --private --source=. --push
```

### 2.2 Vercel에서 import

1. https://vercel.com/new
2. GitHub repo 선택 → Import
3. Framework: Next.js (자동 감지)
4. **Environment Variables**에 `ANTHROPIC_API_KEY` 추가
5. Deploy 클릭

### 2.3 Vercel Postgres 연결

1. Vercel 대시보드 → Storage 탭 → Create Database → **Postgres** 선택
2. 데이터베이스 이름 입력 → Create
3. **Connect Project** → 방금 만든 signal-mvp 선택
4. 자동으로 모든 `POSTGRES_*` 환경 변수 주입됨
5. 다음 deploy 시 자동 적용 (또는 manual redeploy)

### 2.4 첫 deploy 후

배포된 URL 접속 → `/` → ID 입력 → 시나리오 시작.

첫 사용자가 첫 액션을 하면 DB 테이블이 자동 생성됨.

---

## 3. 사용 흐름

1. **로그인** (`/`) — ID + 이름 입력
2. **대시보드** (`/dashboard`) — 시나리오 5개 + 진행 상태
3. **시나리오 채팅** (`/scenario/[id]`) — 5턴 대화 → 분석하기 버튼
4. **자기 분석** (`/report`) — 5/5 완료 후 활성화
5. **케미 테스트** (`/chemistry`) — 다른 사용자 + 렌즈 선택
6. **케미 결과** (`/chemistry/[otherId]/[lens]`)

다른 직원이 같은 5개 시나리오를 마치면 케미 테스트 목록에 자동 등장.

---

## 4. 아키텍처

```
[User] → Next.js Page → API Route → ─┬─ Anthropic SDK (Claude Sonnet 4.5)
                                     └─ Vercel Postgres
                                     
시나리오 시작
  → /api/scenario/state  (기존 turns 조회)
  → /api/scenario/turn   (첫 호출 또는 사용자 응답 + 다음 agent turn)
  → ... (5턴 반복)
  → /api/scenario/finalize  (분석 LLM → ScenarioPayload 저장)
  → 5개 모두 완료 시 자동으로 integrator 실행 → IntegratedVector 저장

자기 분석
  → /api/report (cached) → Self-report LLM 호출 → 마크다운 narrative

케미 테스트
  → /api/chemistry (cached)
    → computeChemistry() (수학, LLM 0)
    → Chemistry narrative LLM → 마크다운 narrative
```

---

## 5. 비용 추정 (사용자 1명 풀 코스)

| 단계 | LLM 호출 수 | 토큰 (대략) | 예상 비용 |
|---|---|---|---|
| 시나리오 5개 × 5턴 chat | 25 | ~30k input + 10k output | ~$0.20 |
| 시나리오별 분석 (5회) | 5 | ~25k input + 10k output | ~$0.18 |
| 통합 (수학) | 0 | 0 | $0 |
| Self-report | 1 | ~3k input + 2k output | ~$0.04 |
| 케미 테스트 1회 | 1 | ~5k input + 3k output | ~$0.06 |
| **합계 (자기 + 케미 1회)** | **32** | | **~$0.50** |

(Claude Sonnet 4.5 기준, 2026-04 가격 가정)

10명 직원 사내 테스트 × 자기 1회 × 케미 5회 평균 ≈ **$25–35**.

---

## 6. 한계 / 알려진 문제

- **인증 없음**: ID만 입력하면 누구든 그 ID로 들어옴. 사내 테스트 한정.
- **재측정 불가능**: 한 시나리오를 마치면 덮어쓰기 X. DB 직접 수정해야 함.
- **에러 복구 약함**: LLM 호출 실패 시 그냥 에러 표시. retry 로직 없음.
- **변동성**: 같은 입력으로 같은 narrative가 나오는 보장 없음 (temperature 0.3–0.7).
- **안전 게이트 미구현**: 시나리오 4·5의 위험 신호 감지 + 정신건강 자원 안내 없음. 사내 한정에서만 사용.
- **스트리밍 없음**: LLM 응답이 한 번에 옴. 시나리오 분석은 10–20초, 케미는 15–30초 대기.

---

## 7. 파일 구조

```
signal-mvp/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                        # 로그인
│   ├── dashboard/page.tsx              # 대시보드
│   ├── scenario/[id]/page.tsx          # 채팅 UI
│   ├── report/page.tsx                 # 자기 분석
│   ├── chemistry/page.tsx              # 케미 상대 선택
│   ├── chemistry/[otherId]/[lens]/page.tsx  # 케미 결과
│   └── api/
│       ├── login/route.ts
│       ├── scenario/state/route.ts     # 기존 turns 조회
│       ├── scenario/turn/route.ts      # 채팅 1턴
│       ├── scenario/finalize/route.ts  # 분석 + 통합
│       ├── report/route.ts             # self-report 생성
│       └── chemistry/route.ts          # 케미 수학 + narrative
├── lib/
│   ├── types.ts                        # 15축, 시나리오, 렌즈
│   ├── db.ts                           # Vercel Postgres 쿼리
│   ├── anthropic.ts                    # Claude 클라이언트
│   ├── integrator.ts                   # Layer 0.5 (순수 수학)
│   ├── chemistry-math.ts               # Layer 2 (순수 수학)
│   └── prompts/
│       ├── scenarios.ts                # 5개 시나리오 system prompt
│       ├── analysis.ts                 # 분석 프롬프트 (시나리오별 rubric)
│       ├── self-report.ts              # Decoder ① prompt
│       └── chemistry-narrative.ts      # Decoder ② prompt
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.example
└── README.md
```

---

## 8. 다음 단계

이 MVP가 사내에서 작동 확인되면:

1. **변동성 측정**: 같은 사용자를 두 번 풀게 해서 vector 차이 측정
2. **사용자 피드백 수집**: 분석 결과에 *"맞다 / 틀리다"* 버튼 추가
3. **회귀 테스트**: 페르소나 4명 vector를 golden set으로 freeze
4. **안전 게이트**: 시나리오 4·5에 risk detection 추가
5. **재측정**: dashboard에서 한 시나리오를 다시 풀 수 있게
6. **변화 추적**: 6개월 후 재측정 시 vector diff 시각화
