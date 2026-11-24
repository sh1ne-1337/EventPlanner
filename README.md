# Planner — event planning app

A full-stack event planner built with **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL**.

Users sign up with email/password or Google, then create, edit, delete and reschedule events in a
calendar (month / week / day) or a list. Events can be filtered by importance and found by
full-text search. Every user sees only their own events.

> **No custom API routes.** All database logic lives in Server Actions (`"use server"`) and a
> server-only Data Access Layer. `src/app/api` contains only the Auth.js handler, which OAuth needs.

---

## Quick start

Requirements: Node.js ≥ 20.19, Docker.

```bash
cp .env.example .env            # then set AUTH_SECRET:  npx auth secret
npm install                     # also generates the Prisma client
npm run setup                   # starts Postgres (docker), applies migrations, seeds demo data
npm run dev                     # http://localhost:3000
```

**Demo account:** `demo@example.com` / `Demo12345` (about 20 events around today, in English and Ukrainian).

### Environment variables

| Variable             | Required | Description                                                                                   |
| -------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | yes      | Postgres connection string. The default points to the Docker database on port 5433.           |
| `AUTH_SECRET`        | yes      | Random secret used to encrypt the session JWT cookie. Generate with `npx auth secret`.        |
| `AUTH_GOOGLE_ID`     | no       | OAuth **Client ID** from Google Cloud. Leave empty to hide the "Continue with Google" button. |
| `AUTH_GOOGLE_SECRET` | no       | OAuth **Client secret** from Google Cloud (pairs with the client ID).                         |

### Google sign-in (optional)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. **APIs & Services → OAuth consent screen**: choose _External_, fill in the app name and your
   email, and add your Google account under _Test users_.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, application type
   _Web application_.
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** into `AUTH_GOOGLE_ID` and the **Client secret** into `AUTH_GOOGLE_SECRET`
   in `.env`, then restart `npm run dev`.

The "Continue with Google" button now appears on the sign-in and sign-up pages. For a deployed
app, add the production origin and `https://<your-domain>/api/auth/callback/google` to the same
OAuth client.

| Script                                         | What it does                                       |
| ---------------------------------------------- | -------------------------------------------------- |
| `npm run dev` / `build` / `start`              | Next.js                                            |
| `npm run lint` / `typecheck` / `format`        | ESLint, `tsc` (with Next route types), Prettier    |
| `npm test`                                     | Unit and integration tests (Vitest)                |
| `npm run test:unit` / `test:integration`       | Run one Vitest project                             |
| `npm run test:e2e`                             | Playwright, which builds and starts the app itself |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma                                             |

---

## Features

**Authentication & authorization**

- Email/password registration and sign-in (argon2id hashing), plus Google OAuth (Auth.js v5).
- **JWT sessions**: a signed and encrypted http-only cookie. Checking a request needs no database lookup.
- Route protection in `proxy.ts` (Next 16's replacement for `middleware.ts`), enforced again in every
  query and action (see [Security](#security)).

**Events**

- Create an event by clicking a day (or dragging over a time range) in the calendar, or with the
  **New event** button. Fields: title, start/end date and time, all-day, description, and importance
  (Normal / Important / Critical).
- Edit by clicking an event. **Drag & drop / resize** in the calendar reschedules it, with an optimistic UI.
- Delete with a confirmation dialog, with an optimistic UI that rolls back automatically on failure.
- Moving the start time shifts the end time with it, keeping the duration (like Google Calendar).

**Viewing, filtering, search**

- **Calendar** (FullCalendar: month, week, day) and **list** (grouped by day; upcoming, past or all;
  paginated with "Show more").
- **Importance filter** (multi-select) and **full-text search** over title and description, with
  prefix matching ("meet" finds "meeting"). Works for Cyrillic as well as Latin text. Matches are
  highlighted in the list.
- All of this state lives in the **URL** (view, filters, search, calendar date and view), so it is
  shareable, survives reload, and works with back/forward.

**UX**: dark mode, responsive layout, keyboard-accessible dialogs (Radix), loading skeletons,
toasts, and empty states.

---

## Architecture

```
src/
├─ app/
│  ├─ (auth)/login, register     # public pages
│  ├─ (app)/events               # protected pages
│  ├─ api/auth/[...nextauth]     # the only API route (Auth.js)
│  └─ layout.tsx, error.tsx, not-found.tsx
├─ features/
│  ├─ auth/      actions.ts ("use server"), schemas.ts (Zod), components/
│  └─ events/
│     ├─ actions.ts       # "use server": create / update / move / delete
│     ├─ queries.ts       # server-only reads for Server Components (cached)
│     ├─ schemas.ts       # Zod schemas shared by client and server
│     ├─ search-params.ts # typed URL contract (nuqs), shared by client and server
│     ├─ search.ts        # user input -> safe Postgres tsquery
│     ├─ form-values.ts   # browser-local form values <-> UTC instants
│     └─ components/      # board, calendar, list, toolbar, dialogs
├─ server/
│  ├─ auth/               # Auth.js config (proxy-safe and full), password hashing, session/requireUser
│  ├─ repositories/       # Prisma persistence, every query scoped by userId
│  ├─ db.ts, rate-limit.ts, timezone.ts
├─ lib/                   # safe-action client, date/time helpers, utils
├─ proxy.ts               # optimistic route protection
└─ env.ts                 # validated environment (@t3-oss/env-nextjs + Zod)
```

### Request flow

```
Client component ──(server action)──► authActionClient ──► Zod ──► repository (WHERE userId = …)
                                        │ requireUser()                  │
                                        └──────────── updateTag(`events:<userId>`) ◄┘

Server Component ──► queries.ts ──► requireUser() ──► "use cache" worker (tagged per user) ──► repository
```

### Key decisions

- **Writes go through Server Actions; reads go through a server-only Data Access Layer.** Server
  Actions are POST endpoints meant for mutations: they run sequentially and can't be cached.
  Server Components call the DAL (`queries.ts`, marked `server-only`) directly, which is the pattern
  Next.js recommends. Both live entirely on the server, and there are no REST endpoints.
- **`next-safe-action`** wraps every action: an auth middleware puts the user into `ctx`, Zod
  validates the input, and results are typed. Unknown errors are logged and replaced with a generic
  message, so internals never reach the client. Validation errors are mapped back onto the
  react-hook-form fields.
- **Cache Components (Next 16).** Pages prerender a static shell; anything that depends on the
  session streams in behind `<Suspense>`. Event reads use `"use cache"` keyed by user and filters,
  tagged `events:<userId>`. Every mutation calls `updateTag`, so a user always sees their own writes
  immediately. The cached worker is not exported, so callers can't request another user's data by
  passing an id.
- **URL as state** (`nuqs`): one typed parser map is shared by the server loader and the client
  hooks. Filter changes run inside a transition, so the current UI stays on screen (dimmed) instead
  of flashing a skeleton.
- **Time zones.** Instants are stored as UTC `timestamptz`. The browser's IANA zone is synced into a
  cookie, so the server renders times and "today" in the user's zone, with no UTC/local hydration
  mismatch. Form inputs are converted to instants in the browser. All-day events are stored as
  calendar dates (UTC midnight, exclusive end, the iCal convention), so "24 November" stays
  24 November in every time zone; range queries use date bounds for them and instant bounds for
  timed events.
- **Full-text search in Postgres**, not `ILIKE '%…%'`. A weighted `tsvector` (title > description)
  is maintained by a trigger and indexed with GIN. User input is reduced to letters and digits, then
  turned into an AND-ed prefix query (`team:* & meet:*`), so typed operators can never break the
  query. It is passed as a bound parameter. A trigger is used instead of a `GENERATED` column
  because Prisma's schema diff misreports generated columns as drift; the schema is verified
  drift-free.
- **Range queries use overlap semantics**, so a multi-day event that started last month still
  appears in this month's grid. Composite indexes on `(userId, startsAt)` and
  `(userId, importance, startsAt)` match the query shapes.

---

## Security

| Threat                                      | Mitigation                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessing others' events (IDOR)             | Ownership is part of every `WHERE` (`updateManyAndReturn` / `deleteMany` with `{ id, userId }`), not a separate fetch-then-check step. Covered by integration and e2e tests.                                                                                                             |
| Unauthenticated calls to server actions     | Every action re-authenticates through the `authActionClient` middleware. The proxy is only a UX redirect.                                                                                                                                                                                |
| Untrusted input                             | Zod on the server for every action (bounds on lengths and dates, end after start, enum importance).                                                                                                                                                                                      |
| Password storage                            | argon2id with OWASP parameters.                                                                                                                                                                                                                                                          |
| User enumeration                            | Generic "Invalid email or password". A dummy hash is verified for unknown emails so response timing matches.                                                                                                                                                                             |
| Brute force                                 | Rate limiting on sign-in (per IP + email) and sign-up (per IP). Auth.js's own credentials endpoints are blocked, so the limited server action is the only way in. In-memory and per instance, keyed on the platform-provided client IP: use Redis/Upstash on multi-instance deployments. |
| Open redirect                               | `callbackUrl` is reduced to a same-origin path.                                                                                                                                                                                                                                          |
| Account pre-hijacking via Google            | No automatic account linking: if an email already belongs to a password account, Google sign-in is refused (`OAuthAccountNotLinked`), so a squatter who pre-registered someone's email never receives their data. Google sign-ins also require `email_verified`.                         |
| SQL / tsquery injection                     | Prisma parameters everywhere; the raw FTS query uses tagged-template parameters plus input sanitization.                                                                                                                                                                                 |
| Stale sessions                              | Every request re-loads the user from the database, so a deleted account loses access immediately (redirect to login with "session expired").                                                                                                                                             |
| Leaking internals                           | Unknown server errors are replaced with a generic message; `server-only` guards the DAL, repositories and secrets.                                                                                                                                                                       |
| Clickjacking, MIME sniffing, referrer leaks | Security headers in `next.config.ts` (`X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS); `X-Powered-By` removed.                                                                                                                           |

---

## Deployment (Vercel + Neon)

1. Create a Postgres database on [Neon](https://neon.tech) and copy the **pooled** connection string.
2. Import the repository into [Vercel](https://vercel.com) and set the environment variables
   `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
3. Apply the migrations once from your machine:
   `DATABASE_URL="<neon url>" npx prisma migrate deploy` (optionally `npm run db:seed` for demo data).
4. In Google Cloud Console, add `https://<your-domain>` as an authorized JavaScript origin and
   `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI.

On hosts other than Vercel, also set `AUTH_TRUST_HOST=true` (or `AUTH_URL=https://<your-domain>`)
so Auth.js accepts the host header.

---

## Testing

- **Unit (Vitest):** Zod schemas, the search query builder, time zone and date-range helpers,
  form ↔ API conversions (run in `Europe/Kyiv`), the callback URL sanitizer, and the rate limiter.
- **Integration (Vitest + real Postgres):** the repository against a dedicated `*_test` database,
  covering tenant isolation (read, update and delete of another user's event), overlap ranges,
  importance filters, full-text search (Cyrillic, prefix matching, trigger sync on update, hostile
  input). The suite refuses to run against any database not named `*_test`.
- **E2E (Playwright):** register, sign out, sign in (including a wrong password and a duplicate
  email); create, search, filter, edit and delete with confirmation, then reload; calendar
  day-click creation; form validation; users cannot see each other's events.
- **CI (GitHub Actions):** six independent workflows in `.github/workflows`: format, lint,
  typecheck, unit tests, integration tests and e2e tests (the last two use a Postgres service container).

---

## Known trade-offs

- Search first collects matching ids, then applies filters in a second query. That's simple and
  index-backed, but a single SQL query would save a round trip at large scale.
- The calendar loads the whole 6-week grid around the visible date (capped at 1000 events) so
  switching between month, week and day views doesn't refetch.
- Sign-up reveals that an email is already registered (rate-limited), a common UX trade-off.

## What I'd add with more time

- Email verification and password reset (Resend + Auth.js email provider), then linking Google to
  an existing password account from a settings page.
- Redis-backed rate limiting (`@upstash/ratelimit`) for multi-instance deployments.
- Recurring events (RRULE) and reminders (a cron job plus email or web push).
- "Undo" on delete (soft delete with a TTL) and `.ics` import/export.
- i18n (uk/en) with `next-intl`.
