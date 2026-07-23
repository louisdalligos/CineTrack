# Deployment runbook (E6-S3)

Target: **Vercel** (web) + **Railway** (API) + **Neon** (database).

Order matters — each step needs a URL from the previous one.

---

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech). Pick a region close to where the Railway
   service will run.
2. Copy the **pooled** connection string from the dashboard.
3. Ensure it ends with `?sslmode=require`.

Keep this as `DATABASE_URL`.

> Use the pooled string, not the direct one. Container platforms open and drop connections
> frequently, and Postgres will hit its connection limit without a pooler.

<details>
<summary>Alternative: use Railway's own Postgres instead</summary>

If you'd rather keep everything on one platform, add a Postgres service in the same Railway
project (**New → Database → Add PostgreSQL**), then reference it from the API service's variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway resolves that reference automatically, so there's no connection string to copy. Neon is
what the project plan specifies, but this is fewer moving parts if you hit trouble.
</details>

---

## 2. API — Railway

The API image builds from the **monorepo root**, because it needs the workspace `pnpm-lock.yaml`.
Railway defaults to building from the service root, so this has to be set explicitly.

### Create the service

1. **New Project → Deploy from GitHub repo**, select this repository.
2. Railway will attempt a build immediately and probably fail — that's expected until the settings
   below are applied.

### Build settings

| Setting         | Value                               |
| --------------- | ----------------------------------- |
| Root Directory  | `/` (repository root — leave unset) |
| Builder         | Dockerfile                          |
| Dockerfile Path | `apps/api/Dockerfile`               |

The included `railway.json` at the repo root sets the builder, Dockerfile path, and health check
declaratively, so Railway should pick these up without UI changes. Verify them anyway under
**Settings → Build**.

### Environment variables

Under **Variables**:

| Variable       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | Neon pooled connection string from step 1                    |
| `JWT_SECRET`   | Generate one: `openssl rand -base64 32` — **not** `changeme` |
| `TMDB_API_KEY` | Your TMDB v3 key                                             |
| `CORS_ORIGIN`  | Leave empty for now; set in step 4                           |

Do **not** set `PORT` — Railway injects it, and the app reads it from the environment.

### Expose it

**Settings → Networking → Generate Domain.** Copy the resulting `*.up.railway.app` URL.

### Verify

```bash
curl https://<api-url>/health          # {"status":"ok"}

curl -X POST https://<api-url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Password123!"}'
```

Migrations and the seed run automatically on container boot via `start:prod`, so a successful
login confirms the whole chain worked. If it fails, check **Deployments → View Logs** for the
Prisma error.

---

## 3. Web — Vercel

1. **New Project**, import the same repository.
2. **Root Directory**: `apps/web` — this one _does_ point at the app folder, unlike Railway.
3. Framework preset: Next.js (auto-detected). Leave build and install commands as defaults.

### Environment variables

| Variable              | Value                                          |
| --------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | The Railway URL from step 2, no trailing slash |

> `NEXT_PUBLIC_*` values are inlined at **build** time, not read at runtime. Changing this
> requires a redeploy, not a restart.

### Analytics (E5-S3)

`@vercel/analytics` is already wired into the root layout. Enable it under the project's
**Analytics** tab. Events appear after real page views on the deployed URL — it does not report
from localhost.

---

## 4. Close the CORS loop

Back in Railway, set:

```
CORS_ORIGIN=https://<your-vercel-url>
```

Railway redeploys automatically on variable changes. To also allow preview deployments, pass a
comma-separated list:

```
CORS_ORIGIN=https://cinetrack.vercel.app,https://cinetrack-git-develop-you.vercel.app
```

---

## Post-deploy checklist

- [ ] `GET /health` returns ok
- [ ] Demo login works against the Railway API via curl
- [ ] Web app loads and redirects to `/login` when signed out
- [ ] Demo login works **in the browser** — this is the only check that proves CORS is right
- [ ] Discover shows trending movies and posters render
- [ ] Search returns results
- [ ] Adding a movie from its details page survives a refresh
- [ ] Watchlist filters work and the URL updates
- [ ] Dashboard shows non-zero stats
- [ ] Vercel Analytics registers page views
- [ ] Both production URLs added to the top of `README.md`

---

## Common failures

**Railway build fails immediately** — Dockerfile path not set, so it's looking for a Dockerfile at
the repo root. Set it to `apps/api/Dockerfile` with the root directory left at `/`.

**Browser requests fail but curl works** — CORS. `CORS_ORIGIN` must match the browser's origin
exactly: scheme, host, no trailing slash. curl doesn't send an `Origin` header, which is why it
passes regardless.

**API deploys then crashes on boot** — usually `DATABASE_URL` unreachable or migrations failing.
Railway's deploy logs will show the Prisma error directly.

**Health check never passes** — the app must bind `0.0.0.0`, not localhost, and must use Railway's
injected `PORT`. Both are handled in `main.ts`; if you've edited it, check those.

**Web builds but all requests 404 or hang** — `NEXT_PUBLIC_API_URL` wrong or unset at build time.
Check the browser devtools Network tab for which host is actually being called.

**Login works, then everything 401s** — `JWT_SECRET` changed between deploys, invalidating issued
tokens. Log out and back in.
