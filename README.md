# Apex Insights — Survey Made Easy

A full-stack survey application: create surveys, collect real responses through a
public link, explore analytics, preview synthetic demo data, and export results to
CSV or JSON.

Built with Next.js (App Router), TypeScript, Drizzle ORM + Neon Postgres, Better
Auth, Zod, and Recharts.

## Features

- **Auth** — email/password sign-up and sign-in via Better Auth (session cookies,
  httpOnly, sameSite=lax).
- **Survey builder** — 7 question types (short text, paragraph, single choice,
  multiple choice, dropdown, linear scale, yes/no) with a drag-free, ordered editor.
- **Lifecycle** — draft → published → closed. Editing is safe after responses exist:
  questions with answers keep their type and existing options can't be removed.
- **Public form** — shareable `/survey/[slug]` link with validation and a thank-you
  state. Protected by rate limiting and body-size limits.
- **Analytics** — per-question breakdowns (distributions, scale stats, word clouds,
  yes/no splits), response timeline, and a real/demo/both source toggle.
- **Demo data** — a deterministic, seeded generator produces synthetic responses
  stored in a **separate dataset** so they never contaminate real counts, analytics,
  or exports unless you explicitly include them. Text placeholders stay blank except
  short-text questions that ask for a name, which get a common English name.
- **Exports** — CSV and JSON downloads for any data source.
- **Theming** — light and dark themes (chaicode-style orange + charcoal palette) with
  a header toggle, persisted in `localStorage`.

## Tech stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 16 (App Router, Turbopack)       |
| Language       | TypeScript (strict)                      |
| Database       | Neon Postgres via `postgres` (postgres.js) + Drizzle ORM |
| Auth           | Better Auth                              |
| Validation     | Zod                                      |
| Charts         | Recharts                                 |
| Styling        | Tailwind CSS v4                          |
| Tests          | Vitest                                   |

## Prerequisites

- Node.js 20+ (developed on Node 24)
- A Neon Postgres database (or any Postgres; the connection string is used as-is)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment files:

   ```bash
   cp .env.example .env.local
   ```

3. Fill `.env.local`:

   ```
   DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
   BETTER_AUTH_SECRET="<openssl rand -base64 32>"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

4. Create the tables:

   ```bash
   npm run db:migrate
   ```

   > `db:migrate` applies the SQL files in `drizzle/` and records them in the
   > `drizzle.__drizzle_migrations` table. If your network/driver keeps the process
   > alive after applying, interrupting it is safe — the applied statements are
   > already committed and journaled.

5. (Optional) Seed a demo account and survey:

   ```bash
   npx tsx scripts/db-check.mts
   ```

6. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Available scripts

| Script                | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `npm run dev`         | Start the dev server                      |
| `npm run build`       | Production build (runs TypeScript checks) |
| `npm run start`       | Serve the production build                |
| `npm run lint`        | ESLint                                    |
| `npm run typecheck`   | `tsc --noEmit`                            |
| `npm test`            | Run the full Vitest suite                 |
| `npm run test:watch`  | Vitest in watch mode                      |
| `npm run db:generate` | Generate a migration from schema changes  |
| `npm run db:migrate`  | Apply pending migrations                  |
| `npm run db:studio`   | Open Drizzle Studio                       |

## Architecture notes

### Data model

Auth tables (`user`, `session`, `account`, `verification`) are managed by Better
Auth. Application tables:

- `surveys` — one row per survey (owner-scoped, unique slug, status enum).
- `questions` — ordered questions per survey with a `config` JSONB holding
  type-specific options (options list, scale min/max/labels, placeholder).
- `responses` / `answers` — **real** submissions.
- `demo_datasets` / `demo_responses` / `demo_answers` — **synthetic** data, keyed by
  a per-survey dataset with a seed + generator version.

Real and synthetic data live in separate tables. Every read path (`Responses`,
`Analytics`, `Exports`) takes an explicit source of `real`, `demo`, or `both`, so the
two never mix by accident.

### Deterministic demo data

The generator uses a seeded `mulberry32` PRNG (`src/lib/synthetic/prng.ts`). For a
given `seed` and `count`, the produced dataset is byte-for-byte reproducible, which
makes analytics and exports demoable and testable without exposing real responses.

### Analytics & exports

- `src/lib/analytics/compute.ts` — pure functions computing per-question stats and a
  submission timeline (unit-tested).
- `src/lib/analytics/load.ts` — loads rows for a given source, owner-scoped.
- `src/lib/exports/` — CSV and JSON builders plus download filenames (unit-tested).
- `GET /api/surveys/[id]/export?format=csv|json&source=real|demo|both` —
  authenticated, owner-scoped download.

## Testing

```bash
npm test
```

- `tests/unit/*` — pure logic (validation, lifecycle transitions, PRNG, analytics
  stats, export formatting). No database required beyond env presence.
- `tests/integration/*` — run against the database in `DATABASE_URL`. **Use a
  development database only; never point tests at production.**

Vitest runs with `isolate: false` and `fileParallelism: false`, so a single shared
connection is reused across files. A setup hook warms the connection and the
`withDbRetry` helper recovers from transient managed-Postgres connection resets.

## Security

- Server actions validate payloads with Zod and scope every query by the
  authenticated owner (`404` for non-owners, `307 → /login` for anonymous).
- The public submission endpoint validates the slug, enforces a 256 KB body cap, a
  per-IP rate limit (20/min), and an answer-count cap.
- All database access uses Drizzle parameterized queries (no string-built SQL).
- No `dangerouslySetInnerHTML` / `eval`; React's default escaping applies.
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`) are set in `next.config.ts`, and `x-powered-by` is disabled.
- Passwords are handled by Better Auth (min 8 / max 128 characters).

## Deploying to Vercel

1. **Push** the repository to GitHub/GitLab/Bitbucket.

2. **Import** it at [vercel.com/new](https://vercel.com/new). Vercel auto-detects
   Next.js.

3. **Add a Postgres database.** Use the `@vercel/postgres` / Neon integration (or any
   external Postgres). Vercel will populate `DATABASE_URL` for you.

4. **Set environment variables:**

   | Variable              | Notes                                             |
   | --------------------- | ------------------------------------------------- |
   | `DATABASE_URL`        | Postgres connection string (pooled, `sslmode=require`) |
   | `BETTER_AUTH_SECRET`  | `openssl rand -base64 32` — required              |
   | `BETTER_AUTH_URL`     | Your production URL, e.g. `https://apex.vercel.app` |

   `BETTER_AUTH_URL` must match the deployed origin so session cookies and trusted
   origins line up.

5. **Apply migrations before/with the first deploy.** Either:
   - run `npm run db:migrate` locally against the production database, or
   - add a one-off build step / GitHub Action that runs the migration.

   > Drizzle migrations are idempotent via the `__drizzle_migrations` journal, so
   > running them repeatedly is safe.

6. **Deploy.** Vercel builds with `next build` and serves via `next start`.

### Deployment notes

- **Fonts** — Poppins is self-hosted via `next/font/local` (woff2 files in
  `src/app/fonts/`), so builds succeed without any outbound font fetch.
- **Theme** — light and dark themes (orange primary, chaicode-style greys) driven by
  CSS variables in `src/app/globals.css` and toggled with the header button; the
  choice persists in `localStorage`. Base font size is 103.125%.
- **Rate limiting** — the public-form limiter is in-memory (per-instance). On
  serverless it's per-instance only; move to a shared store (e.g. Upstash Redis) if
  you need a global limit.
- **Email verification** — disabled (`requireEmailVerification: false`) because no
  email provider is configured. Enable it by adding an email provider to Better Auth.
- **Database pooling** — use Neon's pooler (or PgBouncer) connection string on
  Vercel. `prepare: false` is already set for pooler compatibility.

## Project layout

```
src/
  app/
    api/
      auth/[...all]/                 Better Auth handler
      public/surveys/[slug]/responses/  Public submission endpoint
      surveys/[id]/export/           CSV/JSON downloads
    dashboard/                       Owner area (list, new, edit, preview,
                                     responses, analytics, demo-data)
    survey/[slug]/                   Public survey form
    login/, signup/
  components/                        UI kit + feature components (analytics,
                                     surveys, public form)
  db/                                Drizzle schema + client
  lib/
    analytics/                       compute + load
    exports/                         csv/json builders
    synthetic/                       seeded PRNG + generator
    surveys/, responses/, validation/, session, auth, db-retry
tests/
  unit/                              Pure-logic tests
  integration/                       Database-backed tests
drizzle/                             SQL migrations
```

## Notable deviations from the initial scaffold

- `cacheComponents` was removed from `next.config.ts`.
- Exports are CSV and JSON only; the earlier PDF export was dropped.
- Google Fonts were replaced with self-hosted Poppins (`next/font/local`) for
  offline/CI build reliability.
- One demo dataset per survey (`demo_datasets.surveyId` is unique); regenerating
  replaces it transactionally.
