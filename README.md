# ReachInbox — Full-Stack Email Job Scheduler

> A production-grade, distributed, fault-tolerant email scheduling platform built for high volume, reliability, and observability. Built with **Node.js, TypeScript, Express, BullMQ, Redis, MySQL, Prisma, Elasticsearch, Ethereal SMTP, Google OAuth 2.0, Slack OAuth 2.0, React, Vite, and Tailwind CSS**.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Visual Identity & Design Philosophy](#visual-identity--design-philosophy)
3. [Technology Stack](#technology-stack)
4. [Monorepo Architecture](#monorepo-architecture)
5. [In-Depth Architecture Explanations](#in-depth-architecture-explanations)
   - [BullMQ Delayed Scheduling & Redis Persistence](#1-bullmq-delayed-scheduling--redis-persistence)
   - [Transactional Outbox Pattern (Strictly Zero Cron)](#2-transactional-outbox-pattern-strictly-zero-cron)
   - [Atomic Redis Lua Distributed Hourly Rate Limiting](#3-atomic-redis-lua-distributed-hourly-rate-limiting)
   - [Distributed Minimum Send Delay (Pacing)](#4-distributed-minimum-send-delay-pacing)
   - [Safe Rescheduling on Quota Exhaustion](#5-safe-rescheduling-on-quota-exhaustion)
   - [Deduplicated Slack Rate Limit Notifications](#6-deduplicated-slack-rate-limit-notifications)
   - [Idempotency & Ambiguous SMTP Outcomes](#7-idempotency--ambiguous-smtp-outcomes)
   - [Elasticsearch Multi-Tenant Search Synchronization](#8-elasticsearch-multi-tenant-search-synchronization)
   - [Live Bull Board Dashboard](#9-live-bull-board-dashboard)
6. [Getting Started & Local Setup](#getting-started--local-setup)
7. [Running the Application](#running-the-application)
8. [Automated Testing & 1,000-Job Load Test](#automated-testing--1000-job-load-test)
9. [Step-by-Step 5-Minute Demo Walkthrough](#step-by-step-5-minute-demo-walkthrough)
10. [Assignment Compliance Checklist](#assignment-compliance-checklist)
11. [Assumptions, Trade-Offs & Known Limitations](#assumptions-trade-offs--known-limitations)

---

## Project Overview

ReachInbox is designed to solve the critical challenges of outbound email delivery at scale:
- **Resilient Scheduling**: Schedules thousands of emails across future timestamps using BullMQ delayed sets backed by Redis persistence.
- **Worker Concurrency & Pacing**: Distributes workload across parallel worker instances while strictly respecting per-sender minimum intervals (e.g., 2 seconds between send attempts) via Redis atomic coordination.
- **Distributed Rate Limiting**: Enforces strict hourly limits per sender across worker pools using atomic Redis Lua scripts. When a sender's quota is reached, remaining jobs are **never dropped or permanently failed**; they are automatically rescheduled for the next eligible time window.
- **Deduplicated Slack Alerts**: Triggers real Slack notifications when a sender's rate limit is reached, deduplicated with a Redis key to prevent channel spam.
- **Multiple Senders**: Supports managing multiple SMTP accounts with encrypted credentials and live verification.
- **Searchability**: Full-text multi-tenant email search powered by Elasticsearch.
- **Total Observability**: Real-time Bull Board queue dashboard mounted at `/admin/queues`.

---

## Visual Identity & Design Philosophy

The frontend interface adopts a **Caarvn-inspired minimalist visual identity**:
- **Monochromatic & Premium**: Predominantly white and very light gray backgrounds (`#FAFAFA`), deep near-black typography (`#09090B`), subtle gray borders (`#E4E4E7`), and generous whitespace.
- **Refined Typography**: High-contrast, clean sans-serif typography with large bold section headings and subtle uppercase labels.
- **Subtle Ornamentation**: Monochromatic concentric circular background pattern inspired by Caarvn.
- **Modern Interactions**: Restrained hover transitions, smooth dialogs, responsive tables, and clean status badges.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router 7, TanStack Query, Axios, Lucide React, React Hook Form, Zod, PapaParse |
| **Backend API** | Node.js (v20+), TypeScript, Express.js, Prisma ORM, Bull Board, Helmet, CORS, Cookie-Parser, Pino Logger, Zod |
| **Worker Process** | Node.js, TypeScript, BullMQ, ioredis, Nodemailer (Ethereal SMTP), @slack/web-api, @elastic/elasticsearch |
| **Persistence & Queues** | MySQL 8.0 (Relational Source of Truth), Redis 7.0 (Queue Broker & Rate Limiting), Elasticsearch 8.13 (Search Engine) |
| **Infrastructure** | Docker, Docker Compose, Multi-stage Dockerfiles, Linux/Windows compatible |

---

## Monorepo Architecture

```
reachinbox-scheduler/
├── apps/
│   ├── api/                  # Express REST API & Bull Board Server
│   │   ├── src/
│   │   │   ├── app.ts        # App setup & Bull Board adapter
│   │   │   ├── server.ts     # HTTP server & graceful shutdown
│   │   │   ├── config/       # Env, database, redis, elasticsearch singletons
│   │   │   ├── routes/       # Auth, email, campaign, sender, slack, search, health
│   │   │   ├── controllers/  # Thin request controllers
│   │   │   ├── services/     # Business logic & integrations
│   │   │   ├── repositories/ # Database query layer
│   │   │   ├── middleware/   # Auth, validation, error, request-id
│   │   │   └── queue/        # Email queue definitions
│   │   └── package.json
│   ├── worker/               # Dedicated BullMQ Worker Process
│   │   ├── src/
│   │   │   ├── index.ts      # Worker lifecycle & graceful shutdown
│   │   │   ├── processors/   # processEmailJob orchestrator
│   │   │   ├── services/     # Rate limiter, sender, slack, idempotency, indexing
│   │   │   ├── queue/        # Worker instance & event listeners
│   │   │   └── utils/        # Outbox recovery loop (NO cron)
│   │   └── package.json
│   └── web/                  # React + Vite Frontend Dashboard & Landing
│       ├── src/
│       │   ├── pages/        # Landing, Login, Dashboard, Scheduled, Sent, Senders, Settings
│       │   ├── layouts/      # Caarvn-inspired LandingLayout & DashboardLayout
│       │   ├── components/   # Reusable UI primitives (Button, Modal, Table, Input, etc.)
│       │   ├── services/     # API client and feature endpoints
│       │   └── hooks/        # useAuth, useToast
│       └── package.json
├── packages/
│   └── shared/               # Shared TypeScript types, Zod schemas, constants
├── prisma/
│   ├── schema.prisma         # MySQL normalized relational schema
│   └── seed.ts               # Database seeder
├── infrastructure/
│   ├── docker/               # Dockerfile.api, Dockerfile.worker, Dockerfile.web
│   ├── docker-compose.yml    # MySQL, Redis, Elasticsearch, API, Worker, Web
│   └── elasticsearch/        # Elasticsearch index templates
├── scripts/
│   ├── seed.ts               # Ethereal credentials & sample records
│   └── verify-integrations.ts# Health check verification script
├── tests/
│   ├── integration/          # Vitest integration tests
│   └── load/                 # 1,000+ email jobs load benchmark
└── docs/                     # Architecture, API, and troubleshooting manuals
```

---

## In-Depth Architecture Explanations

### 1. BullMQ Delayed Scheduling & Redis Persistence
- Scheduled emails are pushed to BullMQ with `delay = scheduledAt - now`.
- BullMQ places delayed jobs into a Redis sorted set (`bull:email-scheduler-queue:delayed`).
- **Restart Recovery**: Redis is configured with `appendonly yes` and periodic snapshotting. If the API or Worker restarts while jobs are in a delayed state, no jobs are lost. Upon restart, BullMQ workers query Redis and pick up jobs as they become due.
- **Duplicate Prevention**: Jobs use a deterministic `jobId = emailId`. Attempting to re-add a job with the same ID will return the existing job reference instead of duplicating it.

### 2. Transactional Outbox Pattern (Strictly Zero Cron)
- Scheduling emails executes within a single MySQL transaction (`prisma.$transaction`):
  1. `campaign` record created.
  2. `emails` batch created with unique `idempotencyKey` per recipient.
  3. `outbox_events` batch created with payload and `publishedAt = null`.
- The API publishes each event to BullMQ and updates `publishedAt = now()`.
- **Failure Recovery**: If the API crashes immediately after the database commit, an asynchronous **bounded outbox reconciliation loop** running in the worker process polls for outbox events older than 3 seconds where `publishedAt IS NULL`. It uses a distributed Redis lock (`outbox_recovery_lock`) with an adaptive backoff sleep.
- **Why this is NOT a cron job**: It uses a continuous self-healing bounded while-loop with mutex locking and backoff delay. It does not use `node-cron`, Agenda, or system cron.

### 3. Atomic Redis Lua Distributed Hourly Rate Limiting
- To coordinate hourly quotas across multiple workers without race conditions, ReachInbox executes an atomic Redis Lua script:
  ```lua
  local current = redis.call('get', KEYS[1])
  if current and tonumber(current) >= tonumber(ARGV[1]) then
    return {0, tonumber(current)}
  end
  local count = redis.call('incr', KEYS[1])
  if count == 1 then
    redis.call('expire', KEYS[1], tonumber(ARGV[2]))
  end
  return {1, count}
  ```
- Uses fixed UTC hour windows (`sender_rate:{senderId}:{windowStart}`) with 3600-second TTLs.
- Avoids double-counting retries and persists across worker restarts.

### 4. Distributed Minimum Send Delay (Pacing)
- Enforces an atomic minimum interval (e.g., 2 seconds) between send attempts for any given sender.
- When a worker picks up an email, it reads and updates `sender_pacing:{senderId}` in Redis with the next reserved timestamp.
- If two workers attempt to send for the same sender simultaneously, the second worker computes the difference and sleeps until its reserved time slot arrives.

### 5. Safe Rescheduling on Quota Exhaustion
- If the rate limiter returns `allowed = false`:
  1. The job is **NEVER permanently failed** and **NEVER dropped**.
  2. The next eligible UTC window timestamp is calculated.
  3. The email's status in MySQL is updated to `SCHEDULED` with the new timestamp and audited in `EmailEvent`.
  4. The job is re-added to BullMQ with the same stable `jobId` and a delay set to the start of the next window.

### 6. Deduplicated Slack Rate Limit Notifications
- When a sender limit is reached, the worker attempts to acquire an alert key in Redis:
  `SET slack_alert:{senderId}:{windowKey} 1 EX 3600 NX`
- If successful, a formatted Slack message is posted to the user's connected workspace via Slack Web API.
- Subsequent jobs encountering the same exhausted limit in the same window see the existing key and skip sending notifications.

### 7. Idempotency & Ambiguous SMTP Outcomes
- **Database Processing Lock**: Before sending, the worker performs an atomic transition:
  `UPDATE emails SET status = 'PROCESSING', attemptCount = attemptCount + 1 WHERE id = :id AND status IN ('SCHEDULED', 'QUEUED')`
- **Ambiguous SMTP Outcomes**: If an SMTP connection drops or times out after sending the `DATA` command, remote mail transfer agents may have already accepted the message. Automatically retrying risks duplicate deliveries. ReachInbox transitions ambiguous outcomes to `UNKNOWN_RECONCILE` and logs the error details for manual or automated reconciliation.

### 8. Elasticsearch Multi-Tenant Search Synchronization
- Both scheduled and sent emails are indexed in Elasticsearch (`reachinbox_emails`).
- Search queries strictly enforce user isolation (`term: { userId: currentUserId }`).
- In case Elasticsearch is offline, the search API falls back automatically to MySQL queries.

### 9. Live Bull Board Dashboard
- Accessible at `http://localhost:8383/admin/queues`.
- Displays real-time counts for Active, Waiting, Delayed, Completed, and Failed queues.
- Protected by administrative authorization.

---

## Getting Started & Local Setup

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Docker & Docker Compose** (for running MySQL, Redis, and Elasticsearch)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
cd reachinbox-scheduler

# Install monorepo dependencies
npm install

# Build shared packages
npm run build --workspace=@reachinbox/shared
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration values:
- `DATABASE_URL`: `mysql://reachinbox:reachinbox_secret@localhost:3306/reachinbox`
- `REDIS_HOST`: `localhost`
- `REDIS_PORT`: `6379`
- `ELASTICSEARCH_URL`: `http://localhost:9200`
- `WORKER_CONCURRENCY`: `5`
- `MIN_EMAIL_DELAY_MS`: `2000`
- `MAX_EMAILS_PER_HOUR_PER_SENDER`: `100`

### 3. Start Infrastructure with Docker Compose
```bash
docker compose -f infrastructure/docker-compose.yml up -d mysql redis elasticsearch
```

### 4. Initialize Database Schema & Seed Data
```bash
# Push schema to MySQL
npm run prisma:push

# Seed demo user and Ethereal SMTP test sender
npx tsx scripts/seed.ts
```

---

## Running the Application

### Option A: Local Development Mode (Recommended)
Open three terminal windows:

```bash
# Terminal 1: Start Express API
npm run dev:api

# Terminal 2: Start BullMQ Worker Process
npm run dev:worker

# Terminal 3: Start Vite React Frontend
npm run dev:web
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:8383](http://localhost:8383)
- **Bull Board Queue Dashboard**: [http://localhost:8383/admin/queues](http://localhost:8383/admin/queues)
- **Health Check Endpoint**: [http://localhost:8383/api/health](http://localhost:8383/api/health)

### Option B: Full Docker Compose Deployment
```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

---

## Automated Testing & 1,000-Job Load Test

### 1. Integration Tests
Run the automated test suite covering validation, idempotency, rate limiting, and window calculations:
```bash
npm test
```
*Expected Output: All tests pass with 0 errors.*

### 2. Verification Suite
Verify live connectivity across MySQL, Redis, Elasticsearch, AES encryption, and Ethereal SMTP:
```bash
npx tsx scripts/verify-integrations.ts
```

### 3. 1,000-Job Scalability Load Benchmark
Demonstrates ingestion and scheduling of 1,000 email jobs:
```bash
npm run test:load
```
*Results: Ingests 1,000 jobs into MySQL and BullMQ delayed sets with zero dropped jobs and verified duplicate prevention.*

---

## Step-by-Step 5-Minute Demo Walkthrough

1. **Sign In**:
   - Navigate to [http://localhost:5173](http://localhost:5173).
   - Click **Get Started** or **Sign In**.
   - Click **Continue with Google** (or click **Quick Workspace Demo** for instant offline login).
2. **Inspect Senders**:
   - Navigate to the **Senders** tab.
   - Observe the pre-configured Ethereal SMTP sender with rate limits and send delay.
   - Click **Test Connection** to verify SMTP connectivity.
3. **Compose & Schedule an Email Batch**:
   - Click **Compose Email**.
   - Select the sender. Enter a subject and body.
   - Upload a CSV with recipient emails (or use sample CSV data).
   - Notice the instant duplicate detection and invalid format filtering.
   - Set the start time 30 seconds into the future, pacing to 2s, and hourly limit to 100.
   - Click **Schedule Emails**.
4. **Monitor Delayed Queue**:
   - Open the **Scheduled** tab. View your upcoming emails in the queue.
   - In a new tab, open the **Bull Board** at [http://localhost:8383/admin/queues](http://localhost:8383/admin/queues).
   - Observe the delayed jobs waiting for execution in Redis.
5. **Observe Delivery & View Ethereal Email**:
   - When the scheduled time arrives, the worker dequeues and dispatches the emails.
   - Open the **Sent History** tab.
   - Click **View in Ethereal** on any sent message to see the rendered email in Ethereal's web viewer!
6. **Search via Elasticsearch**:
   - Enter a recipient or subject query in the search bar.
   - Elasticsearch returns the matching documents in real time.
7. **Simulate Worker Restart Recovery**:
   - Stop the worker (`Ctrl+C`).
   - Schedule another email batch.
   - Restart the worker (`npm run dev:worker`).
   - Observe the worker seamlessly resuming delayed jobs without losing or duplicating any tasks.
8. **Rate Limit & Slack Alert Demonstration**:
   - Set a sender's hourly limit to 3.
   - Schedule 5 emails.
   - The first 3 send successfully; the 4th and 5th jobs trigger the rate limit, post a Slack notification (if connected), and are safely rescheduled for the next UTC hour window.

---

## Assignment Compliance Checklist

| Mandatory Assignment Requirement | Implemented Feature | Relevant Source Files | Test & Verification |
| :--- | :--- | :--- | :--- |
| **MySQL Relational Database** | Normalized MySQL schema with relations | `prisma/schema.prisma` | Verified via Prisma & MySQL migrations |
| **Prisma ORM** | Prisma client with transactions | `apps/api/src/config/database.ts` | Type-safe DB transactions verified |
| **BullMQ & Redis Scheduling** | Persistent delayed queue | `apps/api/src/queue/email.queue.ts` | Inspected live via Bull Board |
| **Zero Cron Jobs Constraint** | Continuous bounded outbox reconciliation | `apps/worker/src/utils/outbox-recovery.ts` | Bounded polling with Redis NX locks verified |
| **Ethereal SMTP Delivery** | Real Nodemailer transport with preview URLs | `apps/worker/src/services/email-sender.service.ts` | Real Ethereal preview links generated |
| **Multiple Email Senders** | Per-sender limits, delay & encrypted credentials | `apps/api/src/services/sender.service.ts` | Verified via Senders UI & AES-256 test |
| **Elasticsearch Search** | User-isolated full-text search with DB fallback | `apps/api/src/integrations/elasticsearch/` | Mappings and search endpoints tested |
| **Live Bull Board Dashboard** | Real-time queue monitor at `/admin/queues` | `apps/api/src/app.ts` | BullMQAdapter and UI verified |
| **Configurable Concurrency** | BullMQ worker concurrency via env | `apps/worker/src/config/worker.config.ts` | Configurable worker instances verified |
| **Distributed Minimum Send Delay** | Atomic Redis reservation pacing per sender | `apps/worker/src/services/rate-limit.service.ts` | Cross-worker pacing verified |
| **Hourly Rate Limiting** | Redis Lua atomic counter per sender | `apps/worker/src/services/rate-limit.service.ts` | Atomic Lua script tested |
| **Safe Job Rescheduling** | Jobs rescheduled on quota limit without drops | `apps/worker/src/processors/email.processor.ts` | Tested under quota exhaustion |
| **Slack OAuth & Alerts** | Real Slack OAuth with window deduplication | `apps/worker/src/services/slack-notification.service.ts` | Scoped Redis deduplication verified |
| **Google OAuth 2.0** | Real Google OAuth flow with state token | `apps/api/src/integrations/google/` | Code exchange and token signing verified |
| **Restart Recovery** | Jobs survive API and worker restarts | `apps/api/src/server.ts`, `apps/worker/src/index.ts` | Redis AOF persistence verified |
| **Idempotency Safeguards** | Unique hash keys and atomic MySQL locks | `apps/worker/src/services/idempotency.service.ts` | Duplicate prevention tests pass |
| **Ambiguous SMTP Safety** | Safe handling of unconfirmed delivery | `apps/worker/src/services/email-sender.service.ts` | Marked as `UNKNOWN_RECONCILE` without blind resend |
| **Caarvn Visual Design** | Monochromatic, spacious, elegant UI | `apps/web/src/pages/`, `apps/web/src/styles/` | Responsive React frontend verified |
| **CSV/TXT Recipient Parser** | PapaParse validation with duplicate detection | `apps/web/src/pages/ComposeEmailPage.tsx` | Valid, duplicate, and invalid counters verified |

---

## Assumptions, Trade-Offs & Known Limitations

1. **Transactional Boundary Between SMTP & Database**: No distributed architecture can make remote SMTP acceptance and a local database update atomic within a single two-phase commit. If a network socket drops after SMTP `DATA` transmission, ReachInbox avoids blind re-sends by moving records to `UNKNOWN_RECONCILE`.
2. **Elasticsearch Resilience**: Elasticsearch serves as a dedicated secondary search index; MySQL remains the primary system of record. If Elasticsearch is unreachable, the search API seamlessly falls back to MySQL queries.
3. **Ethereal Email**: Ethereal is an SMTP sandbox designed for testing email delivery. Emails are accepted and viewable via preview URLs, but are not routed to real external recipient inboxes.
