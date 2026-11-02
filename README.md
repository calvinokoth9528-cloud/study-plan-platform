# 📚 Study Plan Platform

> Turn a student's courses, topics, deadlines, and available study time into a **realistic day-by-day study plan** — then keep it useful when reality diverges.

**Live production app:** https://cal-studyplan.vercel.app

Built with **Next.js 16 (App Router)** + **TypeScript** + **Tailwind CSS v4** + **Prisma 5** + **NextAuth v5 (Credentials)** on top of **Neon serverless Postgres**, deployed to **Vercel**.

---

## What it does

### 1. Planning — *build the plan once*
- **Courses, topics, deadlines, and weekly capacity** are your inputs: name, color, estimated hours per topic, exam date, weekly study capacity (hours), and unavailable days.
- **Plan generation** maps every topic into a day-by-day schedule in 30-minute units, prioritising:
  - topics that expire soonest (exam-date aware),
  - topics with the most estimated work,
  - the course's unit ordering.
- **LLM topic breakdown (optional):** paste a syllabus excerpt and get AI-suggested topics with hour estimates. Fully **graceful degradation** — when `OPENAI_API_KEY` is unset, manual topic entry and **CSV import** work identically. No API key, no feature gate, no lock-in.
- **Manual + CSV entry** of topics, plus per-course estimates.

### 2. Execution — *teach the plan*
- **Week view** per plan, plus a **month/week calendar** across all active plans.
- **Roadmap** with a progress bar per topic.
- **Study logging:** start/stop sessions record real hours; you rate each session with a **confidence 0–5** (and a note). Statuses `pending → in_progress → done | partial` roll task totals.
- One tap to **log a session**, immediately tied to a specific task.

### 3. Adaptive repair — *the plan survives reality*
- When reality drifts, the **repair engine** produces a **minimal-disturbance reschedule** (or a "rebalance" variant) with a **diff preview** first: which tasks move, new catch-up/review tasks added, protected (locked) tasks untouched, and any conflicts flagged — all with a single click to **apply**.
- Every repair snapshots a **PlanVersion** (JSON) so you can restore any previous state.

### 4. Reviews — *remember what you learn*
- **FSRS** (true spaced-repetition model via `ts-fsrs`) upgraded the old confidence→interval heuristic. Each topic stores a serialized FSRS card (`Topic.fsrsState`) that advances whenever you log a session with a confidence score.
- The repair loop **prefers persisted FSRS due dates** over the fallback heuristic, so covered topics resurface just before they're forgotten.

### 5. Analytics & exports
- Sessions, hours, completion % + **weekly trend** bar chart, per-course hours **donut**, top topics.
- **ICS export** (subscribe in any calendar app) and **CSV export** (tasks and sessions).

### 6. Essentials
- **Multi-user auth:** NextAuth Credentials (email/password, bcrypt hashes, JWT sessions) with per-user workspace isolation — every query scopes by `userId`.
- **Study reminders:** daily emails listing each user's tasks scheduled today (Resend, pure fetch, no SDK) triggered by a Vercel cron daily at 08:00, or by a self-test POST from any logged-in user. Idempotent via `ReminderLog` (`[userId, day]`).
- **PWA:** installable web app with a static-asset service worker registered production-only.

### Out of scope (future phases)
- Syllabus PDF parsing (paste is the shipped path), LMS sync (Canvas/Brightspace/Moodle), collaboration, mobile app, PDF export.

---

## Quick start

### 1. Clone & install
```bash
git clone https://github.com/calvinokoth9528-cloud/study-plan-platform.git
cd study-plan-platform
npm install
```

### 2. Seed the local database
```bash
npm run db:push          # dev schema (SQLite) — no env needed
npm run seed
```

### 3. Run locally
```bash
npm run dev
# → http://localhost:3000
```

TypeScript type-check, lint, and build:
```bash
npx tsc --noEmit
npm run lint
npm run build
```

### 4. Test
```bash
npx playwright test
# needs a logged-in session (playwright.global-setup.mjs creates it)
```

---

## Local development details

### Environment
The `.env` file ships for local dev (SQLite + a dev-only NextAuth secret). Copy `.env.example` for reference.

### Prisma
```bash
npm run db:generate      # dev client (SQLite)
npm run db:push          # push dev schema
npm run db:studio        # open Prisma Studio
npm run db:generate:prod # prod client (Neon)
npm run db:push:prod     # push prod schema
```

> **Note:** with SQLite (dev), nullable `Float` columns (`actualHours`) can't use `increment` because `NULL + n = NULL`. Aggregations are therefore computed in application code.

### Key module map
| Path | Purpose |
|---|---|
| `src/lib/scheduling/engine.ts` | Pure-function plan generation + repair: `generatePlanForCourse`, `computeRepair` (minimal / rebalance), `nextReviewDateFromSession`, LLM topic breakdown |
| `src/lib/scheduling/fsrs.ts` | FSRS 6 card model: `advanceFsrsCard`, `fsrsNextDue`, confidence → FSRS grade mapping |
| `src/lib/scheduling/types.ts` | All scheduling types (`CourseInput`, `PlanTaskOutput`, `RepairContext`, diff types, …) |
| `src/lib/export/ics.ts` / `csv.ts` | ICS calendar subscribe + CSV (tasks, sessions) |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/reminders.ts` | Reminder email delivery (Resend fetch) + idempotent logging |
| `src/lib/auth.ts` / `auth-client.ts` | NextAuth helpers (server + client) |
| `src/lib/nextauth-config.ts` | Credentials provider, JWT + session config |

---

## Deploy to Vercel

### Prerequisites
1. **Postgres database** (production). The project targets **Neon serverless Postgres**: create a project at https://console.neon.tech, copy the pooled connection string as `DATABASE_URL`.
2. **Vercel account** and the Vercel CLI installed (`npm i -g vercel`).

### One-command deploy
```bash
git clone https://github.com/calvinokoth9528-cloud/study-plan-platform.git
cd study-plan-platform
npm install
# 1) Neon: create a project, copy the pooled connection string
# 2) Vercel: link & deploy
vercel link
vercel env add DATABASE_URL production   # (paste the Neon pooled URL)
vercel env add NEXTAUTH_SECRET production   # auto-generated per project: openssl rand -hex 32
vercel env add CRON_SECRET production
vercel env add NEXTAUTH_URL production   # https://cal-studyplan.vercel.app
vercel --prod
```

The production build runs `prisma generate --schema prisma/schema.prisma.prod` before `next build` (see `vercel.json`).

### Live production link
**https://cal-studyplan.vercel.app**

### Reminder cron
`vercel.json` schedules `POST /api/reminders/send` daily at 08:00 with `Bearer CRON_SECRET`. The endpoint is also triggered by a logged-in user for self-testing. `RESEND_API_KEY` (optional), `REMINDERS_FROM` (default: `Study Plan <onboarding@resend.dev>`) — the whole feature is disabled gracefully when unset.

### Planned/not-yet-implemented production pieces
- `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` for the syllabus→topics LLM breakdown (graceful when empty).
- Seed data for demo tenant (optional).

---

## Data model

```
User 1──∞ Course ∞──∞ Topic ∞──∞ Plan 1──∞ PlanTask n ──∞ Session n
                                    └──∞ PlanVersion n
User 1──∞ ReminderLog n
User 1──∞ Document n
User 1──∞ Note n
```

- `PlanTask`: scheduled date/time, hours, `isReview`, `reviewDueDate`, status (`pending | in_progress | done | partial`), `actualHours`, `confidence` (0–5), `locked`, `sortOrder`
- `PlanVersion`: label + JSON snapshot of tasks (written before every repair/restore/regenerate)
- `Session`: `startedAt`, `endedAt?`, `actualHours?`, `confidence?`, `note?`
- **User isolation** is enforced on every query/route by `userId`; sessions verify task→plan→user.

---

## API routes (all `/api/...`)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | `GET/POST` | NextAuth session handler |
| `/api/auth/signup` | `POST` | Create an account (bcrypt password) |
| `/api/courses` | `GET/POST` | List / create courses |
| `/api/courses/[id]` | `GET/PATCH/DELETE` | Course detail, rename/color, delete |
| `/api/courses/[id]/topics` | `GET/POST` | List / add topics (CSV-import friendly) |
| `/api/topics/[id]` | `PATCH/DELETE` | Edit topic, delete |
| `/api/plans` | `GET/POST` | List / create plans (archiving the old active plan on generate) |
| `/api/plans/[id]` | `GET/PATCH/DELETE` | Plan detail, rename, delete |
| `/api/plans/[id]/generate` | `POST` | Generate a day-by-day schedule |
| `/api/plans/[id]/repair` | `POST` | Compute a *preview* diff (minimal / rebalance) |
| `/api/plans/[id]/apply-repair` | `POST` | Snapshot + apply a repair (creates a `PlanVersion`) |
| `/api/plans/[id]/restore` | `POST` | Restore a versioned snapshot |
| `/api/plans/[id]/versions` | `GET` | List plan versions |
| `/api/sessions` | `POST` | Log a session (start/stop; confidence) |
| `/api/sessions/[id]` | `PATCH` | Mark status (pending / in_progress / done / partial) |
| `/api/stats` | `GET` | Aggregates: hours, completion %, weekly trend, per-course donut, top topics |
| `/api/export` | `GET?mode=tasks\|sessions` | CSV export |
| `/api/export/ics` | `GET` | ICS export for active plans |
| `/api/reminders/send` | `POST` | Email today's tasks (cron / self-test) |

---

## Project structure

```
src/
├── app/
│   ├── (auth)/login        # auth pages (route group — no path segment)
│   ├── (auth)/signup
│   ├── (dashboard)/dashboard/          # home (route group maps bare '/')
│   ├── (dashboard)/courses/[id]/...
│   ├── (dashboard)/plans/[id]/...
│   ├── (dashboard)/calendar/
│   ├── (dashboard)/analytics/
│   ├── (dashboard)/profile/
│   ├── api/...               # all routes above
│   └── layout.tsx
├── components/
│   ├── ui/            # shadcn/ui-style primitives (button, card, input, select, …)
│   ├── charts.tsx     # Recharts wrapper (client-only component)
│   ├── calendar-view.tsx, week-view.tsx  # custom calendar components
│   └── pwa-register.tsx
├── lib/
│   ├── auth.ts / auth-client.ts
│   ├── db.ts
│   ├── nextauth-config.ts
│   ├── scheduling/   (engine, fsrs, types, index)
│   ├── export/       (ics, csv, index)
│   ├── reminders.ts
│   ├── utils.ts
│   └── storage.ts
├── types/
└── styles/globals.css
public/
├── manifest.webmanifest
├── app-icon.svg, favicon.svg, globe.svg, …
└── sw.js              # static-asset-only service worker (prod only)
```

---

## Tech stack
- **Framework:** Next.js 16.4 (App Router, Turbopack), React 19
- **Styling:** Tailwind CSS v4 (design tokens in `globals.css`), class-variance-authority, clsx, tailwind-merge
- **Data:** Prisma 5 (SQLite dev → Neon Postgres prod)
- **Auth:** NextAuth v5 beta (Credentials + bcrypt + JWT)
- **Charts:** Recharts (client-wrapped)
- **Scheduling review:** `ts-fsrs` (FSRS 6)
- **Other:** Upload Thing (file uploads),uuid
- **Testing:** Playwright (e2e, plan page)

---

## Development notes & gotchas

- **Module format:** source files are ES modules. `package.json` must declare `"type": "module"`.
- **Null-safe aggregation:** `actualHours` and similar nullable floats are summed in app code (SQLite/Postgres return `NULL` for `NULL + n`).
- **`SessionProvider`** must wrap via the client wrapper `src/components/session-provider.tsx`; importing NextAuth's provider directly in a server layout breaks `useSession`.
- **Route groups** (`(auth)`, `(dashboard)`) don't add path segments — so `(dashboard)/dashboard/page.tsx` is the URL `/dashboard`, while `(dashboard)/page.tsx` would be `/`.
- **Prisma in Vercel:** the prod build needs `DATABASE_URL` at build time (handled by the `buildCommand` in `vercel.json`).

---

## Credits

- **Owner:** Calvin
- **Status:** v0.1 (Phase 1 shipped) · Phase 2 additions (FSRS, dark mode, PWA, reminders) included
- **Spec:** see `SPEC.md`
