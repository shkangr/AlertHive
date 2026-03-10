# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PagerDuty clone — incident management platform with on-call scheduling, escalation policies, Slack notifications, and Agent-to-Agent (A2A) + x402 crypto payment integration.

## Tech Stack

- **Framework**: Next.js 14+ (App Router) — FE + BE monorepo
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (JWT strategy)
- **Styling**: Tailwind CSS + shadcn/ui
- **Notifications**: Slack API (Bot Token + Block Kit)
- **Job Queue**: pg-boss (escalation timers)
- **Realtime**: Server-Sent Events (SSE)
- **Agent Payment**: x402 protocol (`@x402/next`) — USDC on Base
- **Agent Discovery**: A2A protocol (`/.well-known/agent-card.json`)

## Architecture

```
/app                    → Pages & API Routes (App Router)
  /app/api/             → REST API endpoints
  /app/api/agent/       → Agent-only endpoints (x402 gated)
  /app/api/a2a/         → A2A JSON-RPC endpoint
  /app/api/slack/       → Slack interaction handlers
  /app/(dashboard)/     → Authenticated UI pages
/components             → Shared UI components
/lib                    → Server utilities (db, auth, slack, x402)
/prisma                 → Schema & migrations
/types                  → Shared TypeScript types
```

## Common Commands

```bash
npm run dev             # Start dev server
npx prisma migrate dev  # Run DB migrations
npx prisma generate     # Regenerate Prisma client
npx prisma studio       # Open DB GUI
docker compose up -d    # Start PostgreSQL
```

## Key Design Decisions

- UI must closely match PagerDuty's look and feel (dark navy sidebar, green #06AC38 accents)
- Agent APIs (`/api/agent/*`) are separate from human APIs — gated by x402 or capability tokens
- Escalation timers use pg-boss job queue (survives server restarts)
- Wallet address serves as machine identity for agent tenants (no signup required)
- Prepaid balance system: x402 payment → credit balance → per-request deduction → re-trigger 402 on depletion

## Task Tracking

See `task.md` for the full implementation plan (42 tasks across 12 phases).
