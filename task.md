# PagerDuty Clone — Task Plan

## 기술 스택
- **Framework**: Next.js 14+ (App Router) — FE + BE 모노레포
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (Credentials + OAuth)
- **Styling**: Tailwind CSS + shadcn/ui (PagerDuty 스타일 커스터마이징)
- **Notification**: Slack API (Bot Token + Webhooks)
- **Queue/Job**: pg-boss 또는 BullMQ (에스컬레이션 타이머)
- **Realtime**: Server-Sent Events (인시던트 상태 실시간 반영)
- **Agent Payment**: x402 프로토콜 (`@x402/next`) — USDC on Base
- **Agent Discovery**: A2A 프로토콜 (`/.well-known/agent-card.json`)

---

## Phase 1: 프로젝트 기반 세팅

### TASK-001 — Next.js 모노레포 초기화
- `npx create-next-app` (App Router, TypeScript)
- 폴더 구조 세팅:
  ```
  /app           → 페이지 & API Routes
  /components    → 공통 UI 컴포넌트
  /lib           → 서버 유틸 (db, auth, slack)
  /prisma        → 스키마 & 마이그레이션
  /types         → 공통 타입 정의
  ```
- ESLint, Prettier, path alias(`@/`) 설정

### TASK-002 — PostgreSQL + Prisma 설정
- Docker Compose로 로컬 PostgreSQL 구동
- Prisma 초기화 및 `.env` 구성
- 기본 DB 연결 확인

### TASK-003 — NextAuth.js 인증 설정
- Credentials Provider (이메일 + 비밀번호)
- 세션 전략: JWT
- 미들웨어로 인증 보호 라우트 설정

### TASK-004 — 디자인 시스템 / UI 기반
- Tailwind CSS + shadcn/ui 설치
- PagerDuty 색상 팔레트 적용 (Green #06AC38, 어두운 네이비 사이드바)
- 공통 레이아웃 컴포넌트:
  - `<Sidebar>` — 왼쪽 네비게이션 (PagerDuty 동일 구조)
  - `<TopBar>` — 헤더 (알림 벨, 유저 메뉴)
  - `<PageLayout>` — 콘텐츠 래퍼

---

## Phase 2: 데이터 모델 설계

### TASK-005 — Prisma 스키마 정의
다음 모델 전체 설계 및 마이그레이션:

```
User              — 사용자 (이름, 이메일, 패스워드, 슬랙 유저ID)
Team              — 팀
TeamMember        — 팀-사용자 관계
Service           — 서비스 (이름, 설명, 상태, 에스컬레이션 정책)
EscalationPolicy  — 에스컬레이션 정책
EscalationRule    — 정책 내 단계별 규칙 (순서, 타임아웃, 대상)
EscalationTarget  — 대상 (사용자 or 스케줄)
Schedule          — 온콜 스케줄
ScheduleLayer     — 스케줄 레이어 (로테이션 설정)
ScheduleOverride  — 스케줄 임시 변경
OnCallEntry       — 계산된 온콜 항목 (누가 언제 온콜인지)
Incident          — 인시던트
IncidentLog       — 인시던트 타임라인 로그
IncidentResponder — 인시던트 참여자
Alert             — 인바운드 알럿 (웹훅으로 수신)
Integration       — 서비스별 인입 웹훅 키
SlackConfig       — Slack 연동 설정 (Bot Token, Channel)
```

---

## Phase 3: 인증 & 사용자 관리

### TASK-006 — 로그인 / 회원가입 페이지
- `/login` — PagerDuty 로그인 UI와 동일한 레이아웃
- `/signup` — 계정 생성 폼
- 서버 액션으로 DB 저장 + bcrypt 해시

### TASK-007 — 유저 프로필 & 계정 설정
- `/settings/profile` — 이름, 이메일, 연락처 수정
- `/settings/notifications` — 알림 방법 설정 (Slack 연동)
- Slack 유저 ID 연결 UI

---

## Phase 4: 서비스 관리

### TASK-008 — 서비스 목록 페이지
- `/services` — PagerDuty 서비스 목록과 동일
  - 상태 뱃지 (OK / Warning / Critical)
  - 검색, 팀 필터
  - 활성 인시던트 수 표시

### TASK-009 — 서비스 생성 / 수정 폼
- 서비스 이름, 설명
- 에스컬레이션 정책 선택 (드롭다운)
- 팀 할당

### TASK-010 — 서비스 상세 페이지
- `/services/[id]` — 현재 상태, 활성 인시던트 목록
- Integration 키 발급 (웹훅 URL 표시)
- 최근 인시던트 히스토리

### TASK-011 — 인바운드 웹훅 API
- `POST /api/integrations/[integrationKey]`
- 수신된 알럿 → Alert 레코드 생성 → Incident 자동 생성
- 중복 알럿 그룹핑 (같은 서비스, 같은 키)

---

## Phase 5: 온콜 스케줄링

### TASK-012 — 스케줄 목록 페이지
- `/schedules` — 스케줄 목록 + 현재 온콜 담당자 표시

### TASK-013 — 스케줄 생성 / 수정
- 스케줄 이름, 타임존 설정
- **레이어 추가**: 로테이션 타입 (일별/주별/커스텀), 대상 사용자 순서 설정
- 레이어 미리보기 (달력 형태)

### TASK-014 — 스케줄 캘린더 뷰
- `/schedules/[id]` — 월/주 달력에 온콜 담당자 시각화
- 색상별 레이어 구분 (PagerDuty 동일)

### TASK-015 — 스케줄 오버라이드 (임시 변경)
- 특정 시간대 담당자 교체
- 오버라이드 추가 / 삭제 UI

### TASK-016 — 온콜 계산 엔진
- 스케줄 + 레이어 + 오버라이드 기반 "지금 누가 온콜?" 계산 로직
- API: `GET /api/schedules/[id]/oncall?at=<timestamp>`

---

## Phase 6: 에스컬레이션 정책

### TASK-017 — 에스컬레이션 정책 목록
- `/escalation-policies` — 정책 목록

### TASK-018 — 에스컬레이션 정책 생성 / 수정
- 정책 이름
- **단계(Step) 추가**:
  - Step 1: 대상 (사용자 or 스케줄), 타임아웃(분)
  - Step 2: 타임아웃 후 다음 대상으로 에스컬레이션
  - 반복 설정 (N회 반복 후 종료)
- PagerDuty 동일한 스텝 카드 UI

### TASK-019 — 에스컬레이션 타이머 엔진
- 인시던트 생성 시 → 에스컬레이션 Step 1 알림 발송
- `setTimeout` or Job Queue로 타임아웃 후 미응답 시 다음 Step 알림
- 인시던트 Acknowledge 시 타이머 취소

---

## Phase 7: 인시던트 관리

### TASK-020 — 인시던트 목록 페이지
- `/incidents` — 전체 인시던트 (Triggered / Acknowledged / Resolved)
- 상태 탭 필터
- 서비스, 우선순위 필터
- 인시던트 카드: 제목, 서비스, 발생시간, 담당자, 상태

### TASK-021 — 인시던트 상세 페이지
- `/incidents/[id]`
- **헤더**: 상태 뱃지, Acknowledge / Resolve 버튼
- **타임라인**: 이벤트 로그 (생성, 알림 발송, ACK, 에스컬레이션, 해결)
- **Responders**: 현재 참여자 목록 + 수동 추가
- **Details**: 서비스, 에스컬레이션 정책, 알럿 원본 데이터

### TASK-022 — 인시던트 생성 (수동)
- "New Incident" 버튼 → 모달
- 제목, 서비스, 우선순위, 담당자 선택

### TASK-023 — 인시던트 상태 실시간 업데이트
- Server-Sent Events (SSE) 로 인시던트 상태 변경 → 클라이언트 실시간 반영
- 목록 페이지 / 상세 페이지 모두 적용

### TASK-024 — 인시던트 노트 & 타임라인 추가
- 인시던트 상세에서 노트 작성
- 타임라인에 사용자 노트 표시

---

## Phase 8: Slack 연동

### TASK-025 — Slack App 설정 & Bot Token 연동
- Slack App 생성 가이드 (Bot Token, Signing Secret)
- `/settings/integrations/slack` — Bot Token 입력 UI
- 채널 선택 (채널 목록 조회 API)

### TASK-026 — Slack 알림 발송
- 인시던트 생성 시 → Slack 채널에 메시지 발송
- 메시지 포맷: PagerDuty Slack 알림과 동일한 Block Kit 구조
  - 인시던트 제목, 서비스, 우선순위, 링크 버튼

### TASK-027 — Slack Interactive Actions (ACK / Resolve)
- Slack 메시지에 **Acknowledge** / **Resolve** 버튼 추가
- `POST /api/slack/interactions` — Slack Interactivity 핸들러
- 버튼 클릭 시 인시던트 상태 변경 + Slack 메시지 업데이트

### TASK-028 — Slack 에스컬레이션 알림
- 에스컬레이션 발생 시 → 대상 사용자 Slack DM 발송
- 메시지: "인시던트 [제목] 에스컬레이션됨. 응답해주세요."

---

## Phase 9: 대시보드

### TASK-029 — 메인 대시보드
- `/` — PagerDuty 홈 화면과 동일
  - **현재 나의 온콜 여부** 표시
  - **활성 인시던트 요약** (Triggered N, Acknowledged N)
  - **서비스 상태 요약** (OK / Critical)
  - **최근 인시던트 목록**

---

## Phase 10: 팀 관리

### TASK-030 — 팀 목록 / 생성 / 수정
- `/teams` — 팀 목록
- 팀 생성, 팀원 추가/제거
- 팀에 서비스, 에스컬레이션 정책 연결

---

## Phase 11: 마무리 & 품질

### TASK-031 — API 보안 및 검증
- 모든 API Route에 인증 미들웨어 적용
- 입력값 Zod 스키마 검증
- Slack Signing Secret 검증

### TASK-032 — 에러 처리 & 로딩 UI
- 전역 에러 바운더리
- 스켈레톤 로딩 (PagerDuty 스타일)
- Toast 알림 (성공/실패)

### TASK-033 — 반응형 UI 검토
- 모바일 레이아웃 기본 대응

### TASK-034 — E2E 시나리오 테스트
- 웹훅 → 인시던트 생성 → Slack 알림 → ACK → 에스컬레이션 → Resolve 전체 플로우 검증

---

## Phase 12: Agent-to-Agent (A2A) + x402 결제 연동

> **목표**: AI 에이전트가 서비스를 발견 → 크립토(USDC)로 즉시 결제 → 자동 프로비저닝 → 바로 사용
> **플로우**: 발견 → 402 결제 → 워크스페이스 생성 → Prepaid Balance 사용 → 잔액 부족 시 재결제

### TASK-035 — Agent Card 발행 (서비스 발견 엔드포인트)
- `GET /.well-known/agent-card.json` 엔드포인트 구현
- A2A 프로토콜 스펙에 맞는 Agent Card 반환:
  ```json
  {
    "name": "PagerClone Alert Service",
    "description": "Incident management, on-call scheduling, escalation for your services",
    "url": "https://your-domain.com/api/a2a",
    "protocolVersion": "1.0",
    "capabilities": { "streaming": true },
    "skills": [
      { "id": "create-incident", "name": "Create Incident", "description": "Trigger a new incident on a service" },
      { "id": "get-oncall", "name": "Get On-Call", "description": "Query who is currently on-call for a service" },
      { "id": "list-incidents", "name": "List Incidents", "description": "List active incidents with filters" },
      { "id": "ack-incident", "name": "Acknowledge Incident", "description": "Acknowledge an active incident" },
      { "id": "resolve-incident", "name": "Resolve Incident", "description": "Resolve an incident" }
    ],
    "securitySchemes": {
      "x402": { "type": "http", "scheme": "x402", "description": "Pay-per-request via USDC" },
      "bearer": { "type": "http", "scheme": "bearer", "bearerFormat": "capability-token" }
    }
  }
  ```
- 에이전트가 이 URL을 GET하면 우리 서비스가 무엇을 할 수 있는지 바로 파악 가능

### TASK-036 — x402 결제 미들웨어 적용
- `@x402/next` (또는 `x402-next`) 패키지 설치
- Agent 전용 API 라우트에 x402 paymentMiddleware 적용:
  ```
  POST /api/agent/incidents       → $0.01/건 (인시던트 생성)
  GET  /api/agent/incidents       → $0.001/건 (인시던트 조회)
  GET  /api/agent/oncall          → $0.001/건 (온콜 조회)
  POST /api/agent/incidents/ack   → $0.005/건 (ACK)
  POST /api/agent/incidents/resolve → $0.005/건 (Resolve)
  ```
- 수신 지갑 주소 (Base 네트워크 USDC) 설정
- Facilitator: `https://x402.org/facilitator` (Coinbase 호스티드)

### TASK-037 — 자동 프로비저닝 (첫 결제 시 워크스페이스 생성)
- DB 모델 추가:
  ```
  AgentTenant       — 에이전트 워크스페이스 (walletAddress, tenantName, status)
  AgentBalance      — 잔액 관리 (walletAddress, balance, lastTopUp)
  AgentApiUsage     — API 사용 로그 (endpoint, cost, timestamp)
  ```
- 첫 x402 결제 성공 시:
  1. 결제자 지갑 주소를 Machine Identity로 사용
  2. `AgentTenant` 자동 생성 (워크스페이스 + 기본 서비스 1개 + 기본 에스컬레이션 정책)
  3. **Capability Token** 발급 (JWT, sub=walletAddress, 24시간 만료)
  4. 응답 헤더에 `X-Capability-Token` 포함 → 이후 요청에 Bearer Token으로 사용 가능
- 이미 존재하는 지갑이면 기존 워크스페이스에 연결

### TASK-038 — Prepaid Balance 시스템
- 결제 사이클:
  ```
  [첫 호출] → x402 결제 ($1.00) → AgentBalance에 $1.00 적립 → API 호출마다 차감
  [잔액 부족] → 402 응답 (재결제 요청) → x402 결제 → 잔액 충전
  [Capability Token 보유] → Bearer 인증 → 잔액에서 차감 (x402 스킵)
  ```
- API 호출 시 처리 로직:
  1. `X-Capability-Token` 있으면 → 잔액 확인 → 충분하면 차감 후 처리
  2. 잔액 부족 or 토큰 없으면 → `402 Payment Required` 반환
  3. x402 결제 헤더 있으면 → Facilitator 검증 → 잔액 충전 → 처리
- `/api/agent/balance` — 현재 잔액 조회 API

### TASK-039 — Agent 전용 API 엔드포인트
- 기존 API와 분리된 `/api/agent/*` 라우트:
  - `POST /api/agent/incidents` — 인시던트 생성 (제목, 서비스명, 심각도)
  - `GET  /api/agent/incidents` — 인시던트 목록 조회 (상태 필터)
  - `POST /api/agent/incidents/[id]/ack` — Acknowledge
  - `POST /api/agent/incidents/[id]/resolve` — Resolve
  - `GET  /api/agent/oncall/[serviceName]` — 현재 온콜 담당자 조회
  - `GET  /api/agent/services` — 서비스 목록
- 모든 응답은 machine-readable JSON (에러 포함)
- OpenAPI 3.0 스펙 자동 생성 (`/api/agent/openapi.json`)

### TASK-040 — A2A JSON-RPC 엔드포인트
- `POST /api/a2a` — A2A 프로토콜 JSON-RPC 2.0 핸들러
- 지원 메서드:
  - `A2A_SendMessage` — 태스크 생성 (인시던트 생성, 조회 등)
  - `A2A_GetTask` — 태스크 상태 조회
  - `A2A_CancelTask` — 태스크 취소
- 에이전트 메시지 → 내부 스킬 라우팅:
  - "인시던트 만들어줘" → `create-incident` 스킬 실행
  - "지금 누가 온콜?" → `get-oncall` 스킬 실행
- SSE 스트리밍 응답 지원 (장기 실행 태스크)

### TASK-041 — Agent 관리 대시보드 (관리자 UI)
- `/settings/agents` — 등록된 에이전트 테넌트 목록
  - 지갑 주소, 생성일, 잔액, 총 사용량
  - API 사용 로그 테이블
  - 에이전트별 서비스/인시던트 현황
- 에이전트 차단 / 한도 설정 기능

### TASK-042 — E2E 에이전트 플로우 테스트
- 시나리오:
  1. 에이전트가 `/.well-known/agent-card.json` 발견
  2. `POST /api/agent/incidents` 호출 → 402 응답 수신
  3. x402 결제 (테스트넷 Base Sepolia USDC)
  4. 자동 워크스페이스 생성 확인
  5. Capability Token 수신
  6. 이후 Bearer Token으로 인시던트 생성/ACK/Resolve
  7. 잔액 소진 시 재결제 플로우 확인

---

## 태스크 순서 요약

```
001 → 002 → 003 → 004   (기반)
→ 005                    (DB 스키마)
→ 006 → 007              (인증)
→ 008~011                (서비스)
→ 012~016                (온콜 스케줄)
→ 017~019                (에스컬레이션)
→ 020~024                (인시던트)
→ 025~028                (Slack)
→ 029                    (대시보드)
→ 030                    (팀)
→ 031~034                (마무리)
→ 035~042                (Agent A2A + x402)
```
