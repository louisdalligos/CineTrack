# Clean-clone dry run (E6-S4)

Verification that the project runs out of the box from a fresh clone, following the documented
setup steps only.

## Method

Cloned `main` into an empty directory outside the development workspace, then followed the setup
instructions verbatim — without using any knowledge of the project not present in the
documentation.

## Result

**Passed.** Both setup paths reach a working application, and both workflows complete end to end.

### Docker path

- `cp .env.example .env`, set `JWT_SECRET` and `TMDB_API_KEY`
- `docker compose up` — all three services start, migrations apply, demo data seeds
- API reports healthy; web starts once the API healthcheck passes
- `http://localhost:3000` redirects to `/login`; demo account signs in

### Manual path

- `pnpm install`
- `pnpm prisma:generate`, `pnpm prisma:migrate:deploy`, `pnpm prisma:seed`
- `pnpm dev` starts both applications

### Tests

- `pnpm test` passes from the clean clone

### Workflows

1. **Discover and track** — searched by title, opened a film's details, added it with a status;
   the item appeared on the Watchlist and its status badge appeared on the Discover card.
2. **Track and review** — changed an item to Watched and rated it; the Dashboard counts, average
   rating, and genre breakdown all updated.

## Issue found and fixed

The first attempt failed on the manual path. The Prisma client was not generated, so
`prisma db seed` aborted with `Module '"@prisma/client"' has no exported member
'WatchlistStatus'`. The same fault would have broken `pnpm test` and `pnpm typecheck`.

The cause was relying on the `postinstall` hook to generate the client. The Docker image runs
`prisma generate` explicitly during the build and was therefore unaffected, which is why the fault
was invisible until a non-Docker clean clone was attempted.

Fixed by making generation explicit in every documented script — `dev`, `typecheck`, `test`,
`prisma:migrate:deploy`, and `prisma:seed` — rather than depending on an install hook having run.
The setup documentation now lists `pnpm prisma:generate` as its own step.

Re-run after the fix passed on both paths.
