# AlertHive

Incident management platform with on-call scheduling, escalation policies, and Slack notifications.

## Features

- On-call schedule management
- Escalation policy engine with automated timers
- Real-time incident tracking (SSE)
- Slack notifications (Bot Token + Block Kit)
- Agent-to-Agent (A2A) protocol support
- x402 crypto payment gating (USDC on Base)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (JWT)
- **Styling**: Tailwind CSS + shadcn/ui
- **Job Queue**: pg-boss
- **Agent Payment**: x402 protocol (`@x402/next`)

## Getting Started

```bash
docker compose up -d    # Start PostgreSQL
npm install
npx prisma migrate dev  # Run DB migrations
npm run dev             # Start dev server
```
