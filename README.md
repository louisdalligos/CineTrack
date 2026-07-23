# CineTrack

A personal movie watchlist tracker. Browse trending films, search TMDB, track what you plan to
watch, and see your viewing stats.

## Live deployment

|             | URL                                                     |
| ----------- | ------------------------------------------------------- |
| **Web app** | https://cinetrack-web-service-production.up.railway.app |
| **API**     | https://cinetrack-production-590e.up.railway.app        |

No setup required — open the web app and sign in with the demo account below.

### Demo account

```
Email:    demo@example.com
Password: Password123!
```

The account is seeded automatically on first boot with 10 pre-populated watchlist items spanning
every status, so every screen has data on first login.

---

## Quick start (Docker — recommended)

Everything runs with one command. Postgres, the API, and the web app all start, migrations apply,
and the demo data seeds automatically.

```bash
git clone <repository-url>
cd cinetrack
cp .env.example .env
docker compose up
```

Then open **http://localhost:3000** and log in with the demo account above.

> **TMDB key — recommended.** Without one, login, the watchlist, and the dashboard all work on
> seeded data, but the Discover screen shows an error and seeded movies have no posters. A free
> v3 key takes about a minute to obtain from
> [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api); set it as
> `TMDB_API_KEY` in `.env` before starting.
>
> To see the full app without setting anything up, use the deployed URLs at the top of this file.

To stop and wipe the database:

```bash
docker compose down -v
```

### Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Ports `3000`, `4000`, and `5432` free

---

## Running without Docker

### Prerequisites

- Node.js 20+ (`.nvmrc` provided — `nvm use`)
- pnpm 9 (`corepack enable`)
- A running PostgreSQL 16 instance

### Steps

```bash
pnpm install

# API
cp apps/api/.env.example apps/api/.env    # set DATABASE_URL, JWT_SECRET, TMDB_API_KEY
cd apps/api
pnpm prisma:generate                      # generates the typed Prisma client
pnpm prisma:migrate:deploy
pnpm prisma:seed
cd ../..

# Web
cp apps/web/.env.example apps/web/.env    # set NEXT_PUBLIC_API_URL

# Both apps together
pnpm dev
```

Web runs on `:3000`, API on `:4000`.

---

## Tests

```bash
pnpm test                  # everything
pnpm --filter api test     # NestJS (Jest)
pnpm --filter web test     # React (Vitest)
```

Other checks:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
```

All four run in CI on every push and pull request to `main` and `develop`. Pull requests into
`main` additionally run a full `docker compose` cold-start smoke test.

Production runs on Railway (API and web) with Neon for Postgres. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Architecture

| Layer        | Choice                                        |
| ------------ | --------------------------------------------- |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind |
| Server state | TanStack Query                                |
| Client state | Zustand                                       |
| Backend      | NestJS, TypeScript                            |
| Auth         | JWT via passport-jwt, bcrypt password hashing |
| ORM          | Prisma                                        |
| Database     | PostgreSQL 16                                 |
| External API | TMDB, proxied server-side                     |

### Repository layout

```
apps/
  web/          Next.js frontend
    app/        routes (App Router)
    src/
      components/
      hooks/
      lib/
      stores/
      types/
  api/          NestJS backend
    prisma/     schema, migrations, seed
    src/
      auth/       registration, login, JWT guard/strategy
      movies/     TMDB proxy with in-memory cache
      watchlist/  per-user CRUD
      stats/      dashboard aggregation
```

### Notable decisions

**TMDB is proxied, never called from the browser.** Every request goes through the NestJS API, so
the TMDB key stays server-side. Responses are mapped into the app's own shapes rather than passed
through raw, so the frontend never couples to TMDB's schema. The proxy caches responses in memory
for 5 minutes to stay under rate limits.

**Every route is protected by default.** A global `JwtAuthGuard` applies to the whole API; routes
opt out with an explicit `@Public()` decorator (only `/auth/register`, `/auth/login`, and
`/health`). Adding a new controller can't accidentally leave data exposed.

**User scoping is enforced from the token, never the request.** The authenticated user id comes
from the verified JWT via a `@CurrentUser()` decorator. No endpoint accepts a user id from a
route param, query string, or body, so one user cannot read or mutate another's data. Ownership
misses return `404` rather than `403`, so the API doesn't confirm that another user's record
exists.

**The service worker only handles push.** It has no `fetch` handler and caches
nothing, so it cannot serve stale assets after a deploy — a failure mode worse
than the offline support it would buy.

**Stats are aggregated in the database.** The dashboard hits a single `/stats` endpoint backed by
four concurrent Prisma aggregate queries rather than loading rows and counting in JavaScript.

---

## Screens

| Route                 | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `/login`, `/register` | Authentication with inline validation                             |
| `/discover`           | Trending movies and debounced title search, paginated             |
| `/movies/[id]`        | Full details, cast, and add/edit watchlist entry                  |
| `/watchlist`          | Filterable list with inline status, rating, and removal           |
| `/dashboard`          | Counts per status, watched this month, average rating, top genres |
| `/settings`           | Reminder preferences and notification permissions                 |

Unauthenticated visits to any protected route redirect to `/login` and return to the originally
requested page after signing in.

### Workflows

1. **Discover → track:** search a title → open its details → add it with a status → it appears on
   the watchlist with a badge back on the discover grid.
2. **Track → review:** change an item's status to Watched → rate it 1–10 → the dashboard reflects
   the new count, average rating, and genre breakdown.

---

## Reminders

Films left in Planned past a chosen interval trigger a push notification, so a
watchlist does not quietly become a list of things you forgot about. The
interval defaults to two weeks and is configurable per account under Settings.

Reminders are optional. Without VAPID keys the settings screen says so plainly
and everything else is unaffected.

### Enabling them locally

```bash
npx web-push generate-vapid-keys
```

Put the private key in `VAPID_PRIVATE_KEY`, a contact address in
`VAPID_SUBJECT`, and the **public key in both** `VAPID_PUBLIC_KEY` and
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the API signs with it and the browser needs it
to subscribe.

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined into the bundle at build time, so
after setting it run `docker compose up --build` rather than restarting.

### Trying it out

Sign in, open **Settings**, turn reminders on, and accept the browser prompt.
**Send a test notification** delivers one immediately — the scheduled job only
fires for films added more than a fortnight ago, so it is not a practical way
to see the feature working.

### Platform notes

- **iOS and iPadOS** deliver web push only to sites installed to the Home
  Screen, on 16.4 or later. The settings screen detects this and explains the
  install step rather than offering a control that would do nothing.
- **Safari on macOS, Chrome, Edge and Firefox** work without installation.
- The reminder job runs in-process on a single API instance. Running more than
  one would produce duplicate sends; that would need an advisory lock or a
  dedicated worker, neither of which is warranted at this size.

---

## Environment variables

Set in the root `.env` for Docker (Compose substitutes them into each service):

| Variable                       | Purpose                                                             | Default                                |
| ------------------------------ | ------------------------------------------------------------------- | -------------------------------------- |
| `POSTGRES_USER`                | Database user                                                       | `postgres`                             |
| `POSTGRES_PASSWORD`            | Database password                                                   | `postgres`                             |
| `POSTGRES_DB`                  | Database name                                                       | `cinetrack`                            |
| `JWT_SECRET`                   | Signing secret for auth tokens                                      | `changeme` — **replace in production** |
| `TMDB_API_KEY`                 | TMDB v3 API key                                                     | none — discovery disabled without it   |
| `NEXT_PUBLIC_API_URL`          | API base URL the browser calls                                      | `http://localhost:4000`                |
| `VAPID_PUBLIC_KEY`             | Web push signing key                                                | none — reminders disabled without it   |
| `VAPID_PRIVATE_KEY`            | Web push signing key, server-side only                              | none                                   |
| `VAPID_SUBJECT`                | Contact address for the push service, e.g. `mailto:you@example.com` | none                                   |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY`; the browser needs it to subscribe | none                                   |

For non-Docker runs, `apps/api/.env` additionally needs:

| Variable       | Purpose                    |
| -------------- | -------------------------- |
| `DATABASE_URL` | Postgres connection string |
| `PORT`         | API port (default `4000`)  |

---

## API reference

All endpoints require `Authorization: Bearer <token>` except where marked public.

| Method   | Endpoint                   | Description                                         |
| -------- | -------------------------- | --------------------------------------------------- |
| `POST`   | `/auth/register`           | Create an account. Public. `409` on duplicate email |
| `POST`   | `/auth/login`              | Exchange credentials for a 24h JWT. Public          |
| `GET`    | `/health`                  | Liveness check. Public                              |
| `GET`    | `/movies/trending?page=`   | Trending movies via TMDB                            |
| `GET`    | `/movies/search?q=&page=`  | Search movies by title                              |
| `GET`    | `/movies/:id`              | Full details including top-billed cast              |
| `GET`    | `/watchlist?status=`       | The current user's watchlist, optionally filtered   |
| `POST`   | `/watchlist`               | Add a movie. `409` if already present               |
| `PATCH`  | `/watchlist/:id`           | Update status and/or rating                         |
| `DELETE` | `/watchlist/:id`           | Remove an item                                      |
| `GET`    | `/stats`                   | Aggregated dashboard statistics                     |
| `GET`    | `/notifications/settings`  | Reminder preferences and push availability          |
| `PATCH`  | `/notifications/settings`  | Update reminder preferences                         |
| `POST`   | `/notifications/subscribe` | Register a browser for push                         |
| `DELETE` | `/notifications/subscribe` | Remove a browser's subscription                     |
| `POST`   | `/notifications/test`      | Send the caller a test notification                 |

---

## Development

Branching follows GitFlow: features branch from `develop` and merge back via pull request;
`main` holds releases.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by a
commit-msg hook. Staged files are formatted and linted on commit; typecheck and tests run on push.

```bash
pnpm format        # apply Prettier across the repo
```
