# Tatimar — Cleaning Operations Platform

**Next.js 14 · TypeScript · Prisma · PostgreSQL · tRPC · NextAuth.js · Notion API · TailwindCSS**

---

## Quick Start

### 1. Install dependencies

```bash
npm install
# If you hit peer dependency errors, use:
npm install --legacy-peer-deps
```

### 2. Environment variables

```bash
cp .env.example .env
```

Minimum required to run locally:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) free tier (takes 2 min) — copy the connection string |
| `NEXTAUTH_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NOTION_TOKEN` | Notion → Settings → Integrations → New integration → copy token |
| `NOTION_*_DB_ID` | Each Notion database URL contains the 32-char ID after the workspace slug |
| `UPSTASH_REDIS_*` | [upstash.com](https://upstash.com) free tier Redis — copy REST URL + token |

> The app runs without Notion and Redis in development — just set DATABASE_URL and NEXTAUTH_SECRET to start.

### 3. Database setup

```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to database (creates all tables)
npm run db:seed       # load demo accounts + sample data
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@tatimar.ca | admin123 |
| Manager | manager@tatimar.ca | user1234 |
| Accountant | finance@tatimar.ca | user1234 |
| Cleaner | maria@tatimar.ca | user1234 |

---

## Notion Setup (optional for Phase 1)

### 1. Create integration
Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration → copy the token → `NOTION_TOKEN`

### 2. Share databases with integration
For each Notion database: open it → `···` menu → **Add connections** → select your integration

### 3. Get database IDs
The ID is in the URL: `notion.so/workspace/`**`<32-char-id>`**`?v=...`

### 4. Expected Notion database property names

**Schedules DB:** Name (title), Client (relation), Date (date), Start Time (date), Max Hours (number), Status (select: Pending/In Progress/Completed/Cancelled), Services (multi_select), Instructions (rich_text), Access Notes (rich_text)

**Clients DB:** Name (title), Type (select), Address (rich_text), City (rich_text), Access Notes (rich_text), Contact Name (rich_text), Contact Phone (rich_text), Frequency (select), Latitude (number), Longitude (number)

### 5. Run initial sync
```bash
npm run notion:sync
```

---

## Project Structure

```
tatimar/
├── app/
│   ├── (auth)/login/          # Login page with role selector
│   ├── (dashboard)/           # All protected pages + shared layout
│   │   ├── layout.tsx         # Sidebar + topbar shell
│   │   ├── dashboard/         # Admin/manager KPI overview
│   │   ├── schedule/          # Weekly calendar + new job modal
│   │   ├── cleaner/           # Mobile-first cleaner job view
│   │   ├── employees/         # Staff grid with cert status
│   │   ├── payroll/           # Hours breakdown + export
│   │   ├── clients/           # Client table + management
│   │   ├── certifications/    # Cert tracking with expiry alerts
│   │   ├── reports/           # Report generation hub
│   │   ├── settings/          # Notion config + notifications
│   │   └── my-certifications/ # Cleaner's own cert view
│   └── api/
│       ├── auth/[...nextauth] # NextAuth v5 handler
│       ├── trpc/[trpc]        # tRPC batch handler
│       ├── webhooks/notion    # Notion change webhook receiver
│       └── uploads            # R2 presigned URL generator
├── components/
│   ├── cleaner/JobCard.tsx    # Clock in/out, GPS, photo upload, complete
│   ├── shared/Sidebar.tsx     # Role-aware navigation
│   ├── shared/Topbar.tsx      # Search + notifications
│   └── shared/RoleGuard.tsx   # Server-side role enforcement
├── server/
│   ├── auth/config.ts         # NextAuth config + JWT callbacks
│   ├── db/client.ts           # Prisma singleton
│   ├── trpc.ts                # tRPC init + role-based procedures
│   ├── root.ts                # Combined AppRouter
│   ├── notifications.ts       # Web push + cert expiry alerts
│   ├── notion/
│   │   ├── client.ts          # Notion SDK wrapper + property extractors
│   │   ├── sync-engine.ts     # Bidirectional incremental sync
│   │   └── mappers/           # Notion page ↔ DB model converters
│   ├── queue/notion-queue.ts  # Bull queue workers for write-back
│   └── routers/               # tRPC routers: schedule, clock, user, client, certification
├── lib/
│   ├── permissions.ts         # Role permission matrix + helpers
│   ├── trpc.ts                # Browser-side tRPC client
│   └── utils.ts               # Date, currency, cert status helpers
├── middleware.ts               # Route-level RBAC (runs before every page)
├── prisma/
│   ├── schema.prisma           # Full DB schema
│   └── seed.ts                 # Demo data
└── scripts/
    └── initial-sync.ts         # One-time Notion → PostgreSQL import
```

---

## Architecture

### Notion sync strategy
- **Polling**: Bull queue polls Notion every 60s using `last_edited_time` filter — only fetches changed pages
- **Write-back**: App writes to PostgreSQL first (instant response), then queues Notion update with 5-retry exponential backoff
- **Conflict resolution**: PostgreSQL wins for operational data (clock events, status). Notion wins for content (instructions, notes)

### Auth flow
1. User submits credentials → NextAuth validates against PostgreSQL
2. Role embedded in JWT at login
3. Next.js middleware validates JWT + role before any page renders
4. tRPC procedures enforce role again server-side (defence in depth)

### Role access
| Feature | Super Admin | Manager | Accountant | Cleaner |
|---|---|---|---|---|
| View all schedules | ✅ | ✅ | ✅ (read) | Own only |
| Create/edit schedules | ✅ | ✅ | ❌ | ❌ |
| Clock in/out | ✅ | ❌ | ❌ | ✅ |
| View payroll | ✅ | ❌ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |

---

## Deployment (Vercel + Neon)

```bash
npm i -g vercel
vercel --prod
```

Set all `.env` variables in Vercel dashboard → Project → Settings → Environment Variables.

**Recommended services:**
- **Database**: [Neon](https://neon.tech) — serverless Postgres, free tier, works perfectly with Vercel
- **Redis / Queue**: [Upstash](https://upstash.com) — serverless Redis, free tier
- **File storage**: Cloudflare R2 — S3-compatible, free egress
- **Email**: [Resend](https://resend.com) — developer-friendly, generous free tier
- **SMS**: Twilio

> **Note on the queue worker**: Bull needs a persistent process. For production, deploy the queue worker separately on [Railway](https://railway.app) or [Fly.io](https://fly.io). For development, the sync runs on demand via the webhook endpoint.
