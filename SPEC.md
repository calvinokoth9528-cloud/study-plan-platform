# Study Plan Platform — SPEC

**Status:** v0.1 (Phase 1 shipped)
**Owner:** Calvin
**Deploy target:** Vercel (Next.js, serverless)

---

## 1. Vision

A multi-user web app that turns a student's courses, topics, deadlines, and available study time into a **realistic, day-by-day study plan** — and keeps it useful after reality diverges from the plan.

Two hard problems it solves well:
1. **Building a big plan without recalculating after every new task** — batch intake, schedule-once.
2. **Keeping the plan usable when reality changes** — adaptive, minimal-disturbance rescheduling with preview before apply.

It also schedules **review sessions** using spaced repetition (confidence-based review intervals, upgradeable to FSRS) so covered topics resurface before you forget them.

---

## 2. Phase 1 scope (shipped)

- Multi-user auth (signup/login/logout via NextAuth Credentials + JWT), personal workspace per user.
- Courses, topics/units, deadlines, weekly study capacity, unavailable days.
- **Plan generation:**
  - Curriculum-aware: topics with estimated hours + exam date drive a day-by-day schedule.
  - **LLM topic breakdown** (OpenAI-compatible, env-gated via `OPENAI_API_KEY`): paste syllabus text → suggested topics + hour estimates; gracefully disabled when no key (manual/CSV entry fully works).
  - Manual entry and **CSV import** of topics.
  - Rule-based scheduling engine (30-min units): deadline-aware priority, capacity spread, unavailable days.
- **Review scheduling:** done topics with low/near recall get scheduled review units by the repair engine.
- **Week view** per plan + month/week **calendar** across all active plans + **roadmap** (per-topic progress bars).
- **Execution logging:** sessions record actual hours + confidence (0–5); status updates (pending/in_progress/done/partial) roll task totals.
- **Adaptive schedule repair:** repair strategies (minimal / rebalance) produce a **diff preview** (moves, additions, protected tasks, conflict notes); explicit apply snapshots a **PlanVersion** for restore.
- **Analytics:** sessions, hours, completion %, weekly trend bar chart, per-course hours donut, top topics.
- **Export:** ICS (calendar subscribe) + CSV (tasks and sessions).
- Design tokens + per-course colors, responsive layout, custom SVG favicon.

### Out of scope (later phases)
- Syllabus PDF file parsing (paste/LLM text breakdown is the shipped path).
- LMS sync (Canvas/Brightspace/Moodle), multi-user collaboration, native mobile, PDF export.

## 1b. Phase 2 additions
- **FSRS review upgrade (shipped):** real FSRS scheduling via `ts-fsrs`. Each topic keeps a serialized FSRS card in `Topic.fsrsState` (String column holding JSON — SQLite has no Json type); it advances whenever a session with a confidence score is logged (`/api/sessions`), and the repair loop prefers persisted FSRS due dates over the old confidence→interval heuristic (kept as fallback, `nextReviewDateFromSession`). Module: `src/lib/scheduling/fsrs.ts`.
- **Dark mode (shipped):** tokens in `globals.css` follow a `.dark` class + next-themes; charts and stat colors use `var(--*)` so they adapt.
- **PWA (shipped):** `public/manifest.webmanifest` + `app-icon.svg`, `themeColor` via the `viewport` export, and a static-asset-only service worker (`public/sw.js`) registered production-only by `src/components/pwa-register.tsx`.
- **Study reminders (shipped):** `POST /api/reminders/send` emails each user's tasks scheduled today using Resend (pure fetch, no SDK). Idempotent via `ReminderLog` (unique `[userId, day]`). Triggered daily by the Vercel cron in `vercel.json` (`Bearer CRON_SECRET`), `REMINDER_SECRET` for external schedulers, or a logged-in user POSTing for a self-test. Env: `RESEND_API_KEY` (+ optional `REMINDERS_FROM`), gracefully disabled when unset.

---

## 3. Architecture

- **Framework:** Next.js 16 (App Router, Turbopack), React 19 — frontend + API routes in one deploy (Vercel).
- **Language:** TypeScript throughout.
- **Styling:** Tailwind CSS v4 with design tokens in `src/app/globals.css` (`@theme`: `bg-surface`, `text-primary`, `border-border`, `accent`, `success`, `warning`, `danger`); per-course color stored on Course.
- **Data:** Prisma 5 ORM. Dev = SQLite (`prisma/schema.prisma`, `file:./dev.db`, no env needed). Prod = Neon Postgres (`prisma/schema.prisma.prod`, same models, `DATABASE_URL`).
- **Auth:** NextAuth v5 beta (Credentials provider, bcrypt hashes, JWT sessions). Config in `src/lib/nextauth-config.ts`; helpers `auth()` (server) in `src/lib/auth.ts`, client helpers in `src/lib/auth-client.ts`.
- **Calendar:** custom components (`week-view.tsx` per plan, `calendar-view.tsx` month/week across plans) — no heavy calendar lib.
- **Charts:** Recharts wrapped as `src/components/charts.tsx` (`"use client"` — required; recharts breaks server rendering otherwise).
- **Scheduling engine:** pure-function module `src/lib/scheduling/engine.ts` — `generatePlanForCourse`, `computeRepair` (minimal-disturbance: lock protection → keep-on-date → earliest-capacity moves → review catch-ups), `nextReviewDateFromSession` (confidence → interval heuristic), `generateTopicBreakdown` (OpenAI-compatible LLM, env-gated). Types in `src/lib/scheduling/types.ts`.
- **Exports:** `src/lib/export/ics.ts` + `csv.ts`, served by `/api/export/ics` and `/api/export?mode=tasks|sessions`.
- **ts-fsrs** is installed for the Phase 2 upgrade of the review heuristic.

### Key paths
```
src/app/(auth)/{login,signup}/          auth pages
src/app/(dashboard)/dashboard/          home (NOTE: route group maps bare '/' too — /dashboard is this dir)
src/app/(dashboard)/{courses,plans,calendar,analytics,profile}/
src/app/api/auth/[...nextauth]/         NextAuth handlers
src/app/api/auth/signup/                account creation
src/app/api/{courses,topics,plans,sessions,stats,export}/
src/app/api/plans/[id]/{generate,repair,apply-repair,versions}/
src/components/{ui,charts,layout,session-provider}
src/lib/{db,auth,auth-client,nextauth-config,utils,scheduling,export}
prisma/{schema.prisma,schema.prisma.prod}
SPEC.md  .env.example
```

---

## 4. Data model

User(1)→Course(n)→Topic(n); User(1)→Plan(n)>PlanTask(n)>Session(n); Plan>O(PlanVersion) snapshots.
- PlanTask: scheduledDate/hours, isReview, reviewDueDate, status, actualHours, confidence(0–5), locked, sortOrder.
- PlanVersion: label + JSON snapshot of tasks (written before every repair/restore/regenerate).
- User isolation: every query/route scoping by `userId`; sessions verify task→plan→user.

---

## 5. Notes / known behaviors

- **SQL `increment` on NULL:** nullable `Float` columns (`actualHours`) are summed in app code, because `NULL + n = NULL` in SQLite/Postgres. See `src/app/api/sessions/route.ts`.
- **Route groups don't add path segments:** the dashboard home lives in `(dashboard)/dashboard/page.tsx` so `/dashboard` is a real URL; `(dashboard)/page.tsx` would map to `/`.
- **`SessionProvider` must render through a client wrapper** (`src/components/session-provider.tsx`) — importing `next-auth/react`'s provider directly in a server layout breaks `useSession`.
- archive-on-generate: creating a new plan for a course auto-archives its previous active plan.
- Blueprint-only task: bare session logs (no `markStatus`) record the session row only; task totals roll on explicit status updates.

---

## 6. Dev / deploy

```
npm run dev          # local on :3000 (.env has SQLite + dev secret)
npm run build        # typecheck + 23 routes
npm run lint
npm run db:{generate,push,studio}
npm run db:{generate:prod,push:prod}   # Neon Postgres
```
Vercel env vars needed: `DATABASE_URL` (Neon), `NEXTAUTH_SECRET`, optionally `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`, and optionally `RESEND_API_KEY`/`REMINDERS_FROM`/`CRON_SECRET` for the reminder cron. For prod generate, Prisma needs `DATABASE_URL` set (run `npm run db:generate:prod` with it exported, or generate with the dev schema on Vercel build then rely on `postinstall`).
