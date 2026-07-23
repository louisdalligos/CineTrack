#!/usr/bin/env bash
#
# CineTrack — bulk-import story tickets into GitHub Issues via gh CLI
#
# Usage:
#   1. gh auth login              (if not already authenticated)
#   2. cd into your repo (or set REPO below to "owner/name")
#   3. chmod +x create_issues.sh && ./create_issues.sh
#
# Creates 6 epic labels + 17 issues, each tagged with its epic label
# and a "story" label. Body includes the user story, AC, and any
# FR/NFR references so nothing from the PRD gets lost on import.

set -euo pipefail

# Set this to "owner/repo" to target a specific repo instead of the
# current directory's repo.
REPO=""
REPO_FLAG=()
if [[ -n "$REPO" ]]; then
  REPO_FLAG=(--repo "$REPO")
fi

echo "==> Creating labels..."
create_label () {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" "${REPO_FLAG[@]}" --force
}

create_label "epic:foundation"     "5319E7" "E1 — Foundation & Environment"
create_label "epic:auth"           "1D76DB" "E2 — Authentication & Protected Routing"
create_label "epic:discovery"      "0E8A16" "E3 — Movie Discovery"
create_label "epic:watchlist"      "FBCA04" "E4 — Watchlist Management"
create_label "epic:dashboard"      "D93F0B" "E5 — Dashboard & Analytics"
create_label "epic:release"        "B60205" "E6 — Release Readiness"
create_label "story"               "C2E0C6" "User story ticket"

echo "==> Creating issues..."

create_issue () {
  local title="$1" epic_label="$2" body="$3"
  gh issue create "${REPO_FLAG[@]}" \
    --title "$title" \
    --label "story,$epic_label" \
    --body "$body"
}

# ---------------------------------------------------------------------
# Epic 1 — Foundation & Environment (Day 1 AM)
# ---------------------------------------------------------------------

create_issue "E1-S1 · Monorepo scaffold (2h)" "epic:foundation" "$(cat <<'EOF'
**Story**
As a developer, I want a monorepo with `apps/web` (Next.js) and `apps/api` (NestJS) so both apps share tooling and one clone runs everything.

**Refs:** NFR4

**Acceptance Criteria**
- [ ] pnpm workspaces (or turborepo) configured
- [ ] TypeScript strict mode across all packages
- [ ] Shared ESLint + Prettier config
- [ ] `pnpm dev` runs both apps
- [ ] Initial commit follows conventional commits

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E1-S2 · Database & Prisma setup (2h)" "epic:foundation" "$(cat <<'EOF'
**Story**
As a developer, I want Prisma wired to Postgres with the User and WatchlistItem models so persistence is ready before features.

**Refs:** Data model (Phase 3)

**Acceptance Criteria**
- [ ] Schema matches data model: User (id, email, passwordHash, createdAt) · WatchlistItem (id, userId FK, tmdbId, title, posterPath, genres[], status enum, rating?, watchedAt?, createdAt)
- [ ] Unique constraint on (userId, tmdbId)
- [ ] Migration committed
- [ ] `prisma migrate deploy` runs on API boot

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E1-S3 · Docker Compose environment (3h)" "epic:foundation" "$(cat <<'EOF'
**Story**
As a reviewer, I want `docker compose up` to start db + api + web fully migrated and seeded so the app runs out of the box.

**Refs:** NFR1 (auto-fail rubric item — gets its own stories + clean-clone dry run)
**Blocks:** E6-S4 (revisit after seed exists)

**Acceptance Criteria**
- [ ] Three services with healthchecks
- [ ] `api` waits for `db`
- [ ] `web` on :3000, `api` on :4000
- [ ] `.env.example` for both apps
- [ ] Cold start on a clean machine reaches a working login page

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

# ---------------------------------------------------------------------
# Epic 2 — Authentication & Protected Routing (Day 1 PM)
# ---------------------------------------------------------------------

create_issue "E2-S1 · Registration & login API (3h)" "epic:auth" "$(cat <<'EOF'
**Story**
As a user, I want to register and log in so my watchlist is mine.

**Refs:** FR1, FR2, NFR2

**Acceptance Criteria**
- [ ] `POST /auth/register` — 409 on duplicate email, bcrypt hash (cost ≥ 10)
- [ ] `POST /auth/login` — JWT with 24h expiry, 401 on bad creds
- [ ] DTO validation via class-validator
- [ ] Unit tests for AuthService happy + failure paths

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E2-S2 · JWT guard & user scoping (2h)" "epic:auth" "$(cat <<'EOF'
**Story**
As the system, I want all non-auth endpoints guarded so data is per-user.

**Refs:** FR17 (server-side enforcement)

**Acceptance Criteria**
- [ ] Global `JwtAuthGuard` with public-route decorator
- [ ] `userId` always taken from token (never a client-supplied id)
- [ ] Request with missing/expired token → 401
- [ ] Unit test for guard behavior

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E2-S3 · Login/Register UI + protected routes (3h)" "epic:auth" "$(cat <<'EOF'
**Story**
As a user, I want login/register forms and to be redirected when unauthenticated.

**Refs:** FR2, FR3, FR4

**Acceptance Criteria**
- [ ] `/login` and `/register` with inline validation errors (no page reload)
- [ ] Zustand auth store + token persistence
- [ ] Next.js middleware redirects unauthenticated users and returns them to the original URL post-login
- [ ] Logout available in the nav; session invalidated client-side
- [ ] Component test for the auth hook/form

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

# ---------------------------------------------------------------------
# Epic 3 — Movie Discovery (Day 2 AM)
# ---------------------------------------------------------------------

create_issue "E3-S1 · TMDB proxy module (2h)" "epic:discovery" "$(cat <<'EOF'
**Story**
As the system, I want a NestJS module wrapping TMDB so the key stays server-side.

**Refs:** FR21, FR22, NFR6

**Acceptance Criteria**
- [ ] `GET /movies/trending?page=`
- [ ] `GET /movies/search?q=&page=`
- [ ] `GET /movies/:id` (details incl. cast)
- [ ] 5-minute in-memory cache to stay under TMDB rate limits
- [ ] TMDB errors mapped to clean 502s
- [ ] Unit tests with mocked HTTP

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E3-S2 · Discover screen (3h)" "epic:discovery" "$(cat <<'EOF'
**Story**
As a user, I want to browse trending movies and search by title.

**Refs:** FR6, FR7, FR8, FR9

**Acceptance Criteria**
- [ ] Responsive MovieCard grid (poster, title, year, TMDB rating)
- [ ] Debounced SearchBar (≥300ms); clearing search restores trending grid
- [ ] Load-more/infinite-scroll pagination via TanStack Query
- [ ] Skeleton loading + error + no-results states
- [ ] Watchlist StatusBadge shown on cards already on the watchlist
- [ ] MovieCard component test

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E3-S3 · Movie details screen (3h)" "epic:discovery" "$(cat <<'EOF'
**Story**
As a user, I want a movie's details and to add it to my watchlist from there.

**Refs:** FR10, FR11, FR12

**Acceptance Criteria**
- [ ] `/movies/[id]` route with poster, synopsis, genres, runtime, release date, rating, top-billed cast
- [ ] Add-to-watchlist control with status (Planned / Watching / Watched)
- [ ] If already listed: shows current status/rating and allows editing in place (no duplicate entries)
- [ ] Back navigation preserves Discover scroll/search state

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

# ---------------------------------------------------------------------
# Epic 4 — Watchlist Management (Day 2 PM)
# ---------------------------------------------------------------------

create_issue "E4-S1 · Watchlist CRUD API (3h)" "epic:watchlist" "$(cat <<'EOF'
**Story**
As a user, I want my watchlist stored and editable via the API.

**Refs:** FR13, FR14, FR15, FR16, FR17

**Acceptance Criteria**
- [ ] `GET /watchlist?status=`
- [ ] `POST /watchlist` — 409 on duplicate
- [ ] `PATCH /watchlist/:id` — status/rating; sets `watchedAt` when status → Watched
- [ ] `DELETE /watchlist/:id`
- [ ] All endpoints scoped to JWT user
- [ ] WatchlistService unit tests incl. cross-user access rejection

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E4-S2 · Watchlist screen (3h)" "epic:watchlist" "$(cat <<'EOF'
**Story**
As a user, I want to manage my list with filters, ratings, and removal.

**Refs:** FR13, FR14, FR15, FR16, FR20

**Acceptance Criteria**
- [ ] Status filter tabs synced to URL query string
- [ ] Inline status change + RatingStars (1–10, watched items only)
- [ ] Remove with confirm step + optimistic UI update, rolled back on API failure
- [ ] EmptyState with Discover CTA when watchlist is empty
- [ ] RatingStars + EmptyState component tests

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

# ---------------------------------------------------------------------
# Epic 5 — Dashboard & Analytics (Day 3 AM)
# ---------------------------------------------------------------------

create_issue "E5-S1 · Stats endpoint (2h)" "epic:dashboard" "$(cat <<'EOF'
**Story**
As a user, I want my viewing stats computed server-side.

**Refs:** FR18, FR19

**Acceptance Criteria**
- [ ] `GET /stats` returns: counts per status, watched-this-month, average rating, top 3 genres
- [ ] Efficient aggregation (no N+1)
- [ ] StatsService unit tests incl. empty-list case

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E5-S2 · Dashboard screen (2h)" "epic:dashboard" "$(cat <<'EOF'
**Story**
As a user, I want a dashboard visualizing my stats.

**Refs:** FR18, FR20
**Note:** cuttable-degrade path — can fall back to plain stat cards without genre bar list if time is short.

**Acceptance Criteria**
- [ ] Stat cards (totals per status, watched this month, average rating)
- [ ] Simple genre bar list (no chart lib needed)
- [ ] EmptyState with CTA when watchlist is empty
- [ ] Refetches on focus

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E5-S3 · Page analytics (0.5h)" "epic:dashboard" "$(cat <<'EOF'
**Story**
As the product owner, I want page-view analytics.

**Refs:** FR23
**Note:** the only cuttable story if time runs short — everything else maps to a hard rubric item.

**Acceptance Criteria**
- [ ] Vercel Analytics enabled on all screens
- [ ] Verified events appear in the Vercel Analytics dashboard
- [ ] Noted in README

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

# ---------------------------------------------------------------------
# Epic 6 — Release Readiness (Day 3 PM)
# ---------------------------------------------------------------------

create_issue "E6-S1 · Seed script & demo account (1.5h)" "epic:release" "$(cat <<'EOF'
**Story**
Idempotent seed script creating the demo account and sample data.

**Refs:** FR5

**Acceptance Criteria**
- [ ] Idempotent seed creates demo user (demo@example.com / Password123!)
- [ ] ~10 varied watchlist items: all statuses, ratings, multiple genres, some watched this month
- [ ] Runs automatically on Docker boot

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E6-S2 · README (1.5h)" "epic:release" "$(cat <<'EOF'
**Story**
Write the project README for reviewers and future devs.

**Refs:** NFR8

**Acceptance Criteria**
- [ ] Production URLs (web + API) linked at the top
- [ ] Demo credentials listed
- [ ] Prerequisites documented
- [ ] One-command Docker run documented
- [ ] Manual (non-Docker) run documented
- [ ] Test commands documented
- [ ] Architecture overview + screen list
- [ ] Env var table

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E6-S3 · Production deploy (2h)" "epic:release" "$(cat <<'EOF'
**Story**
Deploy the app to production infrastructure.

**Refs:** NFR8

**Acceptance Criteria**
- [ ] Web deployed on Vercel
- [ ] API deployed on Railway/Render
- [ ] DB on Neon
- [ ] CORS + env vars configured correctly across services
- [ ] Demo login works in production

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

create_issue "E6-S4 · Clean-clone dry run (1h)" "epic:release" "$(cat <<'EOF'
**Story**
Final out-of-the-box verification before submission.

**Refs:** NFR1
**Depends on:** E1-S3, E6-S1

**Acceptance Criteria**
- [ ] Fresh clone into an empty directory
- [ ] Follow README verbatim
- [ ] `docker compose up` succeeds
- [ ] Log in with demo account
- [ ] Complete both exam workflows end-to-end
- [ ] Any deviation is a P0 fix before submission

**Definition of Done:** code merged to main via PR · lint + typecheck green · unit tests for new logic green · no secrets in code · works inside Docker Compose.
EOF
)"

echo "==> Done. 17 issues created."
