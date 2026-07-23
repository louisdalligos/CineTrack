# Deployment runbook (E6-S3)

Target: **Railway** (API + web) + **Neon** (database).

Both services build from the same repository but use different Dockerfiles, so they are created as
two separate Railway services in one project.

Order matters — each step needs a URL from the previous one.

---

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech). Pick a region close to the Railway region.
2. Copy the **pooled** connection string.
3. Ensure it ends with `?sslmode=require`.

> Use the pooled string, not the direct one. Container platforms open and drop connections
> frequently, and Postgres will hit its connection limit without a pooler.

<details>
<summary>Alternative: Railway's own Postgres</summary>

Add a Postgres service in the same project (**New → Database → Add PostgreSQL**), then set the
API's variable to a reference rather than a literal string:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Fewer moving parts, and no connection string to copy by hand.
</details>

---

## 2. API service — Railway

Both images build from the **monorepo root**, because they need the workspace `pnpm-lock.yaml`.
Railway defaults to building from the service root, so the Dockerfile path must be set explicitly.

### Create it

**New Project → Deploy from GitHub repo**, select this repository. The first build will likely
fail before the settings below are applied — that's expected.

### Settings

| Setting             | Value              |
| ------------------- | ------------------ |
| Root Directory      | `/` (leave unset)  |
| Railway Config File | `railway.api.json` |

`railway.api.json` supplies the Dockerfile path and the `/health` health check, so nothing else
needs setting under Build.

### Variables

| Variable       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | Neon pooled connection string from step 1                    |
| `JWT_SECRET`   | Generate one: `openssl rand -base64 32` — **not** `changeme` |
| `TMDB_API_KEY` | Your TMDB v3 key                                             |
| `CORS_ORIGIN`  | Leave empty for now; set in step 4                           |

Do **not** set `PORT` — Railway injects it and the app reads it from the environment.

### Expose and verify

**Settings → Networking → Generate Domain**, then:

```bash
curl https://<api-url>/health          # {"status":"ok"}

curl -X POST https://<api-url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Password123!"}'
```

Migrations and the seed run automatically on boot, so a successful login proves the whole chain.
If it fails, check **Deployments → View Logs**.

---

## 3. Web service — Railway

In the **same project**: **New → GitHub Repo**, select the same repository again.

### Settings

| Setting             | Value              |
| ------------------- | ------------------ |
| Root Directory      | `/` (leave unset)  |
| Railway Config File | `railway.web.json` |

### Variables

| Variable              | Value                                      |
| --------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | The API URL from step 2, no trailing slash |

> **This one is consumed at build time, not runtime.** `next build` inlines `NEXT_PUBLIC_*` values
> into the bundle, so `apps/web/Dockerfile` declares it as an `ARG`. Railway passes service
> variables to Docker builds as build arguments, so setting it here is enough — but it means
> **changing it requires a rebuild, not a restart**.
>
> If the deployed site calls `localhost:4000` instead of your API, the variable wasn't present at
> build time. Confirm it is set, then trigger a fresh deploy.

### Expose

**Settings → Networking → Generate Domain.** This is the URL you give the examiner.

---

## 4. Close the CORS loop

Back on the **API** service, set:

```
CORS_ORIGIN=https://<your-web-url>
```

Railway redeploys automatically. Exact match — scheme, host, no trailing slash.

---

## Post-deploy checklist

- [ ] `GET /health` returns ok
- [ ] Demo login works against the API via curl
- [ ] Web app loads and redirects to `/login` when signed out
- [ ] Demo login works **in the browser** — the only check that proves CORS
- [ ] Discover shows trending movies and posters render
- [ ] Search returns results
- [ ] Adding a movie from its details page survives a refresh
- [ ] Watchlist filters work and the URL updates
- [ ] Dashboard shows non-zero stats
- [ ] Both production URLs added to the top of `README.md`

---

## Common failures

**Build fails immediately** — Railway Config File not set, so it can't find the Dockerfile. Set
`railway.api.json` or `railway.web.json` on the respective service, with root directory at `/`.

**Deployed site calls localhost:4000** — `NEXT_PUBLIC_API_URL` was missing at build time. Set it
and redeploy; a restart won't help.

**Browser requests fail but curl works** — CORS. curl sends no `Origin` header, so it passes
regardless. Check `CORS_ORIGIN` matches the web URL exactly.

**API deploys then crashes on boot** — usually `DATABASE_URL` unreachable or migrations failing.
The deploy logs will show the Prisma error directly.

**Health check never passes** — the app must bind `0.0.0.0` and use Railway's injected `PORT`.
Both are handled in `main.ts`.

**Login works, then everything 401s** — `JWT_SECRET` changed between deploys, invalidating issued
tokens. Log out and back in.
