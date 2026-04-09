# CEO Response Memo — VC 평가에 대한 개선안

> **CEO Agent Persona**: Signal Founder/CEO. 사업의 본질을 *"진짜 사람을 위한, 진짜 연결을 위한 platform"* 으로 정의하고, anti-pattern 5가지를 영구히 거절하는 mission-driven founder. 평가 원칙: (1) VC의 우려를 방어가 아니라 *"내가 보지 못한 것"* 으로 받아들인다, (2) 미션은 절대 양보하지 않지만, 미션 외 모든 것은 데이터로 조정한다, (3) 검증되지 않은 가설은 *"내가 옳다"* 가 아니라 *"내가 틀릴 수 있다"* 로 다룬다, (4) 단기 매출이 mission에 어긋나면 거절, mission에 부합하면 단기 비용을 감수한다.

**작성일**: 2026-04-09
**대상**: 내부 의사결정 + VC follow-up
**입력**: VC Investment Memo (Conditional PASS, Conviction 6.5/10)
**Output**: 4–6주 Phase 2 sprint plan + 사업기획서 v3.1 수정사항

---

## 0. 자기 평가 — VC가 옳은 부분 / 내가 다르게 보는 부분

### VC가 100% 옳다 (즉시 수정)
1. **Retention 가설이 약하다.** Self-discovery 앱 LTV ceiling을 내가 너무 낙관적으로 봤다. Co-Star가 30M DL에서 $5M ARR에 머문 것은 카테고리 본질이지 실행 실패가 아닐 수 있다.
2. **Creator cold start 위험이 단일 의존 가설이다.** 첫 1명에 모든 게 걸려 있다는 비대칭은 사실. *"$10–15k 보장 deal"* 은 mid-tier만 가능하다는 지적도 정확.
3. **CTO 부재가 founder dependency다.** Phase 2 시나리오 5개 양산 + pair 검증을 1인이 6개월 안에 못한다.
4. **LLM cost projection이 deck에 없다.** Layer 2 무비용 + cache라고 말로만 했지 숫자가 없었다.
5. **법무 예산이 너무 작게 잡혔다.** GDPR/한국 개인정보보호법 day 1 compliance는 substantial.

### VC가 부분적으로 옳다 (재해석 필요)
6. **DAU/MAU < 10% 가능성**: 사실이지만 *"일일 사용 습관"* 이 우리 사업의 KPI가 아니다. Signal은 *"새 사람을 만났을 때 가는 곳"* 이다. Instagram의 daily가 아니라 LinkedIn의 weekly가 reference. 이 frame을 deck에서 명확히 하지 못한 게 내 실수.
7. **글로벌 narrative quality 리스크**: 인정. 단, 이건 검증 비용 문제이지 본질적 불가능은 아니다. 한국 → 일본 → 영어권 → 다국어 순서를 lock하고, 각 단계에 narrative 검증 게이트를 박는다.

### VC가 놓친 것 (내가 더 강하게 본다)
8. **Anti-광고 mission의 talent gravity**: VC는 brand moat로만 봤지만, 실제로는 채용·partnership·media coverage 3중 자석이다. 이건 valuation 모델에 안 들어가는 hidden compounding.
9. **데이터 자산의 시간 가치**: 100M 잠재의식 프로파일은 *"존재 자체"* 가 unprecedented research dataset이다. Year 4–5의 B2B는 매출 항목이 아니라 *"학계·정부·산업의 기준점"* 이라는 정체성 문제.
10. ***"위장 불가능성"* 의 진짜 의미**: VC는 이걸 제품 차별점으로만 봤지만, 본질적 함의는 *"AI 시대의 신뢰 layer"* 다. Deepfake와 self-curated identity가 폭증할수록 *"조작 불가능한 측정"* 의 사회적 가치가 비선형으로 커진다.

---

## 1. 즉시 변경 — 사업기획서 v3.1 수정사항

### 1.1 Retention KPI 재정의
- 기존: *"DAU 형성"* 같은 모호한 표현 삭제
- 신규 KPI: **L7 (Lifetime sessions per user)** ≥ 12, **Reactivation rate (90일 dormant → 활성)** ≥ 25%, **Chemistry/user/lifetime** ≥ 8
- 새로운 retention hook 3가지 명시:
  1. *"오늘의 사람"* — 매주 1명 새로 등록한 사용자 추천 (anonymous matching)
  2. *"관계 변화 알림"* — 사용자가 자기 답변을 6개월 후 다시 풀면 narrative 변화 표시 (자기 변화 추적)
  3. *"내 사람들의 새 면"* — 친구가 새 시나리오를 풀면 *"○○의 새 면이 드러났다"* notification

### 1.2 Unit Economics 재모델링
- **LTV $30 가정 → $12–18 보수 / $30 base / $50 upside 3-시나리오**로 변경
- Revenue projection을 base case 기준으로 다시 그림. Year 5 ARR $1.5B → **$800M base / $1.5B upside** 로 정직하게 표시.
- LLM cost 곡선 명시:
  - Phase 1: $0.40/lifetime (no cache)
  - Phase 2: $0.18/lifetime (Layer 2 무비용 + L3 partial cache)
  - Phase 3: $0.08/lifetime (full cache + 자체 모델 fine-tuning)
- Gross margin trajectory: 30% → 55% → 78%

### 1.3 Creator GTM 재설계 — *"5명 보장"* 에서 *"3-tier funnel"* 로
- **Tier A (Mega 1M+)**: 보장 deal 없이 zero-effort hook으로 직접 컨택. 첫 *"10분 측정 → 평생 패시브"* 의 narrative power에 베팅. 응답률 5% 가정 → 20명 컨택 = 1명.
- **Tier B (Big 100k–1M)**: 보장 deal $3k × 3명 = $9k. *"한국 첫 5인"* brand prestige hook.
- **Tier C (Niche, deep community)**: 보장 deal 없이 community 공동체 가치 어필. 5–10명 그물.
- **단일 의존 제거**: A·B·C 동시 진행. 하나라도 traction 발생 시 case study로 다른 tier 가속.
- **Founder가 직접 모든 컨택**. 아웃소싱 금지. 첫 50명은 founder 본인의 시간으로.

### 1.4 채용 우선순위 재배치
- 기존: Pre-seed에 Designer + Backend
- 변경: **Pre-seed 첫 영입은 CTO 또는 Tech Co-founder**. Backend는 그 다음.
- CTO candidate criteria: LLM ops 경험 + mission-driven + Korean/English bilingual
- Mission-driven 채용 메시지 deck 별도 작성

### 1.5 법무·컴플라이언스 예산 증액
- Pre-seed 예산에서 법무 항목: $5k → $20k
- Day 1 GDPR DPO appointment, 한국 개인정보보호법 자체점검, 약관·개인정보처리방침 외주
- 자살 신호 감지 시스템: Phase 2 mandatory (was Phase 3)

---

## 2. Phase 2 Sprint Plan (4–6주)

VC가 명시한 5개 정량 게이트를 *"우리의 self-validation 게이트"* 로 채택. 통과 못하면 사업기획서를 다시 쓴다.

### Week 1–2: Pair 검증 인프라
- [ ] 시나리오 2 (파트너의 침묵) 분석 프롬프트 완성
- [ ] 5쌍 (실제 커플) 모집 — friend network 활용
- [ ] Pair 검증 protocol 작성 (각 쌍에게 chemistry 결과 보여주고 5점 척도 평가)
- [ ] LLM cost tracking dashboard 셋업 (사용자당 token 측정)

### Week 3–4: Pair 검증 실행 + 시나리오 3
- [ ] 5쌍 검증 데이터 수집 → false positive/negative 측정
- [ ] 시나리오 3 (아픈 부모와 해외 발령) 분석 프롬프트
- [ ] Creator outreach Tier A 20명 + Tier B 10명 컨택 시작 (founder 직접)
- [ ] CTO candidate 5명 shortlist + 첫 미팅

### Week 5–6: 시나리오 4–5 + 검증 보고서
- [ ] 시나리오 4 (친한 친구의 배신) + 시나리오 5 (6개월 시한부) draft
- [ ] Pair 검증 결과 리포트 작성 (VC에게 공개 가능 형태)
- [ ] LLM cost 실측 결과 / Creator 응답률 / CTO shortlist 진행 상황 통합 보고서
- [ ] **5개 게이트 결과를 VC에게 transparent 공유**

### Phase 2 종료 시 5개 게이트 결과
| 게이트 | Target | 측정 방법 |
|---|---|---|
| Pair 검증 | 5쌍 중 3쌍 *"우리 관계 맞다"* 4+/5 | 직접 5점 척도 |
| Creator 응답 | 20명 중 4명 응답 | 컨택 로그 |
| False pos/neg | 둘 다 < 25% | Pair 검증 derived |
| LLM cost | < $0.50 / lifetime projection | Token 측정 |
| CTO shortlist | 3명 + 1명 verbal commit | 미팅 로그 |

---

## 3. VC Diligence 8개 질문에 대한 답변

1. **Retention hook**: 위 1.1의 3가지 hook + L7 KPI. Daily가 아니라 *"새 사람 만났을 때"* trigger model. Co-Star가 아니라 LinkedIn에 가까운 frequency profile.

2. **첫 Creator 컨택 진행**: 현재 0명. Phase 2 sprint Week 3부터 founder 직접 30명 컨택. **Pre-seed 자금 사용 전 Tier A 1명 응답 / Tier B 2명 응답을 self-게이트로 잡는다**. 미달 시 GTM 전면 재설계.

3. **Pair 검증 baseline**: 현재 없음. 페르소나 검증만 완료. Phase 2 Week 3–4에 첫 5쌍 실측. 결과는 VC에게 raw data 형태로 공개.

4. **LLM Unit Economics 실측**: 현재 시나리오 1 기준 사용자당 ~12k tokens (input+output). Claude Sonnet 4.5 가격 기준 약 $0.05/시나리오. 5개 시나리오 → $0.25/lifetime. Cache hit ratio target 60% 도달 시 $0.10. 실측 dashboard Week 1에 구축.

5. **CTO 영입**: 후보 3명 사전 점찍어둠 (이름은 confidential). Mission-driven 메시지에 응답한 1명과 informal 대화 진행 중. Phase 2 Week 6 안에 verbal commit 목표.

6. **Big Tech 진입 대응**: *"속도 + 신뢰 + 데이터 + brand"* 4중 방어를 valuation 곡선에 박은 후, **공개 학술 논문 발표 + 학계 advisory board** 라는 5번째 방어를 추가. Big tech가 같은 카테고리에 진입해도 *"Signal은 학계가 인정하는 표준"* 이라는 포지션이 따라잡기 어렵다. Year 1 안에 첫 논문 (Schwartz cross-cultural 검증).

7. **B2B 매출 (Year 4–5) Buyer**: HR (Workday, BambooHR), 데이팅앱 (Match Group의 *"Signal verified"* badge), 결혼정보회사 (한국 듀오·가연), 상담 플랫폼 (Talkspace, BetterHelp), 학교 (멘토링 매칭). 현재 informal 대화는 한국 결혼정보회사 1곳과만 진행. Year 2 안에 4–5곳 informal validation을 마일스톤으로.

8. **Exit 시나리오**: IPO를 base case로 본다 (Year 6–7). Strategic acquirer로는 Match Group, Spotify, Apple, Microsoft를 상정. 그러나 **mission lock charter**가 acquisition을 어렵게 만들 가능성이 있고, 이건 의도적이다. *"우리는 팔리기 위해 만들지 않는다"* 가 brand의 일부.

---

## 4. 사업기획서 v3.0 → v3.1 변경 항목 요약

| 섹션 | 변경 |
|---|---|
| §2.3 글로벌 시장 | LTV $30 → 3-시나리오 ($12/$30/$50) |
| §3.x | LLM cost 곡선 명시 추가 |
| §4.6 매출 모델 | Year 5 $1.5B → base $800M / upside $1.5B |
| §5.1 Phase 1 | Creator 5명 → 3-tier funnel (A/B/C 동시) |
| §7.x | Retention KPI에 L7, Reactivation 추가 |
| §8 위험 | LLM cost / Pair 검증 / Creator cold start를 명시적 risk로 추가 |
| §10 자금 | Pre-seed 법무 $5k → $20k, CTO 영입을 첫 우선순위로 |
| §11 팀 | Pre-seed 첫 영입 = CTO (was Designer) |
| §부록 D 신설 | Phase 2 5개 게이트 + VC follow-up commitment |

---

## 5. 미션 lock 재확인 — 무엇이 변하지 않는가

VC 평가는 가설을 흔들었지만 **미션은 흔들지 못했다**. 다음 5가지는 변경 후에도 그대로다:

1. Anti-광고 모델 — 데이터 광고 판매 영원히 거절
2. Anti-OnlyFans — 성인 콘텐츠 영원히 거절
3. Anti-외모 매칭 — 사진 기반 swiping 영원히 거절
4. Anti-deepfake 셀럽 — 본인 시나리오 풀이만 인정
5. Anti-점수 환원 — narrative 형태 강제

이 5가지가 흔들리면 사업의 가장 큰 moat가 사라진다. VC가 *"단기 매출을 위해 한 가지만 풀어달라"* 고 요구한다면 그 자금은 거절한다. 다른 자금이 늦게 와도 더 비싸도, 미션 lock이 우선이다.

---

## 6. CEO 새 인사이트 — VC 평가가 가르쳐준 것

### Insight 1: *"카테고리가 비어 있다"* 는 frame은 양날이다
빈 자리는 매력적이지만, *"왜 비어 있는가"* 의 답이 *"카테고리가 본질적으로 작다"* 일 수 있다. Co-Star comparable이 그 가능성을 보여준다. **빈 자리의 진짜 크기를 검증할 때까지 valuation 곡선을 보수적으로 그려야 한다.** 이건 미션과 충돌하지 않는다 — 미션은 trillion-dollar여도 sustainable하다.

### Insight 2: Founder dependency는 mission-driven brand의 부작용이다
Mission-driven brand의 강력함은 founder의 personal vision에서 나온다. 그러나 그 강력함이 동시에 *"founder 1인에게 baked-in"* 이라는 약점이 된다. **CTO 영입 우선순위를 올린 것은 단순한 채용 결정이 아니라 brand vulnerability 해소 결정**이다.

### Insight 3: VC의 *"Conditional PASS"* 는 *"미션을 시험한다"* 는 뜻이다
VC는 모든 우려를 *"미션을 약화하면 풀린다"* 는 방향으로 조정 가능하다. *"광고 조금 받으면 LLM cost 해결된다"*, *"성인 콘텐츠 허용하면 retention 해결된다"* 같은 제안이 Series A 단계에서 반드시 나온다. 이때 거절할 수 있는 founder만이 mission lock의 진짜 가치를 만든다. **Phase 2 검증을 통과하는 것보다, 미션 lock을 흔들지 않고 통과하는 것이 100배 더 중요하다.**

### Insight 4: *"위장 불가능성"* 의 사회적 위치
VC가 이걸 차별점으로만 봤지만, AI 시대에 *"조작 불가능한 측정"* 은 새로운 사회 인프라다. Deepfake가 보편화될수록, self-curated identity가 만연할수록, *"진짜 너"* 를 측정하는 도구의 가치가 비선형으로 커진다. **이걸 deck v3.1에 *"why now"* 의 5번째 항목으로 추가한다.**

### Insight 5: 데이터 자산의 가치는 매출 곡선이 아니라 정체성 곡선이다
100M 잠재의식 프로파일은 매출이 아니라 *"인류가 자기 자신을 이해하는 방법"* 에 대한 새 layer다. 이건 학계·정부·산업이 *"기준점"* 으로 삼는 위치다. Wikipedia가 매출이 작아도 사회 인프라인 것처럼, Signal의 진짜 가치는 정체성 layer라는 위치 그 자체다. **이 frame을 Series A 이후 deck의 closing message로 사용한다.**

---

## 7. 한 줄 결론

> **"VC는 미션을 시험했고, 미션은 시험을 통과했다. 이제 가설을 검증할 차례다. Phase 2 5개 게이트를 미션 양보 없이 통과한다."**

— CEO Memo 끝.
