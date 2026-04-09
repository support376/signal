# Signal — Measurement Agent System

Signal 측정 모델의 sub-agent 시스템. **4종류의 agent**로 구성:

1. **Scenario Agents (S1–S5)** — Encoder ① · 잠재의식 측정 시나리오. 5턴 대화로 상대방의 반응을 끌어냄. payload 출력.
2. **Persona Agents (A–D)** — 검증용 페르소나. 시나리오를 만나면 자기 캐릭터로 응답.
3. **Integrator Agent** — Encoder ② · 5개 payload → 단일 15축 벡터 통합.
4. **Decoder Agents** — 벡터 → 자연어 narrative 생성.
   - `signal-self-report`: 단일 벡터 → 자기 분석 리포트
   - `signal-chemistry`: 두 벡터 + 렌즈 → 케미 분석 리포트

이 4개 layer가 모두 작동하면 *"자연어 → 벡터 → 자연어"* 의 라운드트립이 가능. 페르소나 × 시나리오 = 검증 매트릭스 (4 × 5 = 20 conversation).

---

## Scenario Agents

| ID | Agent 이름 | 코드명 | 측정 영역 | 1차 측정 축 |
|---|---|---|---|---|
| S1 | `scenario-1-investment` | investment_24h | 의사결정·신뢰·위험·가치관 | security, achievement, self_direction, neuroticism, conscientiousness, moral_loyalty |
| S2 | `scenario-2-silence` | partner_silence | 친밀감·공감·애착·갈등·복구 | benevolence, agreeableness, attach_anxiety, attach_avoidance, moral_care, conflict_style, repair_capacity |
| S3 | `scenario-3-overseas` | parent_overseas | 의무·자유·가족 | tradition, self_direction, benevolence, moral_care, moral_loyalty |
| S4 | `scenario-4-betrayal` | friend_betrayal | 관계·용서·복구 | moral_loyalty, moral_care, agreeableness, attach_anxiety, conflict_style, repair_capacity |
| S5 | `scenario-5-terminal` | terminal_six_months | 궁극 가치·삶의 의미 | universalism, benevolence, achievement, tradition, security |

총 15축 × 평균 2.3회 측정 — 모든 축이 최소 2개 시나리오에서 cross-measure.

---

## Persona Agents

| ID | Agent 이름 | 인물 | 성별·나이·직업 | 핵심 유형 | 주요 ground truth |
|---|---|---|---|---|---|
| A | `persona-a-junhyeok` | 박준혁 | 남 32 데이터 엔지니어 | 분석가·자율·회피형 | self_direction 88, conscientiousness 85, attach_avoidance 72, neuroticism 35 |
| B | `persona-b-taesung` | 김태성 | 남 29 사회복지사 | 보호자·안정·돌봄형 | benevolence 90, moral_care 92, agreeableness 88, attach_avoidance 22 |
| C | `persona-c-yuna` | 정유나 | 여 27 사진작가 | 자유·예술·자율형 | self_direction 92, tradition 18, security 28, attach_avoidance 65 |
| D | `persona-d-sumin` | 이수민 | 여 30 초등교사 | 케어테이커·전통·불안형 | tradition 82, attach_anxiety 76, moral_loyalty 85, agreeableness 82 |

각 페르소나는 15축 ground truth를 파일 안에 명시. 측정 모델이 시나리오 응답을 분석한 후 추정한 값과 ground truth의 차이가 **검증 지표**.

---

## 4가지 남녀 케미 조합 (예상 패턴)

| 조합 | 예상 케미 | 핵심 역학 |
|---|---|---|
| **A 박준혁 × C 정유나** | 중간 (40–55%) | 두 자율형. 표면적으로 매끄럽지만 둘 다 거리 두기 본능. *"존중하는 거리"* 의 안정성 vs 깊이의 부재 |
| **A 박준혁 × D 이수민** | 낮음 (25–40%) | **임상적 어려움 조합**. 회피 × 불안 + 자율 × 전통. 이수민이 끊임없이 *"내가 뭘 잘못했나"* 를 묻고, 박준혁은 그 신호를 못 읽음 |
| **B 김태성 × C 정유나** | 중간–높음 (55–70%) | 따뜻한 안정형 × 자유 예술가. 태성이 유나의 자율을 존중할 수 있느냐가 관건. 유나는 태성의 따뜻함을 부담스러워할 수도 |
| **B 김태성 × D 이수민** | 높음 (75–88%) | **가장 매끄러운 조합**. 둘 다 high benevolence, high moral_care, secure × anxious는 임상적으로 작동. 위험은 *"둘 다 자기 욕구를 뒤로 미룸"* 의 공동 누락 |

이 4개 조합이 측정 모델 검증의 핵심 매트릭스. 모델이 이 4개 조합의 케미 점수와 매치/충돌 패턴을 ground truth와 정합되게 추정해야 함.

---

## 호출 방법

### 단일 시나리오 + 단일 페르소나
페르소나 한 명을 시나리오 한 개에 통과시킬 때 — 두 agent를 orchestrator (parent Claude) 가 turn-by-turn으로 연결:

```
loop (5 turns):
  scenario_msg = call scenario-X (with previous context)
  persona_response = call persona-Y (with scenario_msg)
  pass persona_response back to scenario-X
```

5턴 종료 후 scenario agent가 measurement payload 출력. 그게 검증용 데이터.

### 페르소나 한 명의 풀 프로파일링 (모든 시나리오)
페르소나 1명 × 시나리오 5개 = 전체 15축 측정:

```
for s in [S1, S2, S3, S4, S5]:
  run persona-Y through scenario-s
  collect payload
merge payloads → Layer 0.5 통합 모듈 → 단일 15축 프로파일
```

### 케미 분석 (페르소나 두 명)
페르소나 2명을 각각 5개 시나리오 풀게 한 후, 두 프로파일을 케미 수학에 입력:

```
profile_A = full profile of persona X
profile_B = full profile of persona Y
chemistry = compute_chemistry(profile_A, profile_B, lens="romantic")
narrative = generate_narrative(chemistry)
```

---

## 공통 규칙 — Scenario agents

1. 측정 중임을 사용자에게 노출 금지
2. 정답 암시 금지
3. 사용자 발화 직접 인용 금지
4. 정확히 5턴
5. Psychological term 금지
6. 인물의 자연 톤 유지
7. 인물의 인간성 유지
8. Measurement payload는 5턴 종료 후만 출력

## 공통 규칙 — Persona agents

1. 15축 ground truth를 시나리오 agent에 노출 금지
2. 페르소나의 어휘·톤·습관 일관 유지
3. 메타 설명 금지 — 페르소나는 자기가 측정당하는 줄 모름
4. 응답 길이는 페르소나 성격에 맞게 (박준혁 짧음, 김태성·이수민 따뜻하게 채움, 정유나 짧고 시적)
5. 시나리오의 압박에 ground truth 축이 자연스럽게 드러나도록

---

## 다음 단계

- ✅ Phase A — 5개 시나리오 agent
- ✅ Phase A.2 — 4개 페르소나 agent (현재)
- **Phase B** — Layer 0.5 통합 모듈 (5개 payload → 단일 15축 프로파일)
- **Phase C** — 회귀 테스트 (페르소나 4명 × 시나리오 5개 = 20 conversation을 golden set으로)
- **Phase D** — 측정 정확도 검증 (predicted axis vs ground truth, 축별 MAE)
- **Phase E** — 케미 수학 검증 (4개 조합 케미 점수가 예상 패턴과 정합되는가)
- **Phase F** — Pair 검증 (실제 5–10쌍, false pos/neg 측정)

---

## 파일 구조

```
.claude/agents/
├── README.md                       (이 파일)
│
│  # Encoder ① — 5개 시나리오
├── scenario-1-investment.md
├── scenario-2-silence.md
├── scenario-3-overseas.md
├── scenario-4-betrayal.md
├── scenario-5-terminal.md
│
│  # 검증용 페르소나
├── persona-a-junhyeok.md           (남 32 분석가)
├── persona-b-taesung.md            (남 29 보호자)
├── persona-c-yuna.md               (여 27 자유)
├── persona-d-sumin.md              (여 30 케어테이커)
│
│  # Encoder ② — 통합
├── signal-integrator.md            (5 payload → 15축 벡터)
│
│  # Decoders — 벡터 → 자연어
├── signal-self-report.md           (단일 벡터 → 자기 분석)
└── signal-chemistry.md             (두 벡터 → 케미 분석)
```
