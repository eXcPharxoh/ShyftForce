# ShyftForce — Deploy Runbook

Concrete reference for getting this codebase into a healthy production state and
keeping it there. Read this top-to-bottom on first deploy; reach for it any
time something looks off later.

---

## 1. Architecture in 30 seconds

- **Single Next.js 15 app**, hosted on Vercel.
- **One Neon Postgres database** (pooled connection at runtime, direct
  connection for migrations).
- **Three subdomains** (`src/middleware.ts` routes by host):
  - `shyftforce.com` — marketing + auth pages
  - `app.shyftforce.com` — the customer app (everything under `(app)`)
  - `admin.shyftforce.com` — the Operator console at `/platform` (god-view)

If you deploy on a different root domain, override the `NEXT_PUBLIC_*_HOST`
variables and `NEXT_PUBLIC_APP_URL`.

---

## 2. First-time setup checklist

Run these once before customer traffic. Skip any of them and something
described later in this doc will break.

### 2.1 Vercel project

1. Connect the GitHub repo, framework preset = Next.js.
2. **Build Command:** leave default (`npm run build`). Don't override.
   The build script is `prisma generate && next build` — no DB calls.
3. **Install Command:** `npm ci` (default).

### 2.2 Vercel environment variables

Set all of these in **Project → Settings → Environment Variables** for
**Production** (and Preview if you want trial workspaces there too).

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** URL (`-pooler` host + `?pgbouncer=true&connection_limit=1`) | runtime |
| `DIRECT_URL` | Neon **direct** URL (no `-pooler`) | only used by `prisma migrate` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | strong random ≥ 32 bytes |
| `NEXTAUTH_URL` | `https://app.shyftforce.com` (or your app domain) | OAuth callbacks rely on this |
| `NEXTAUTH_COOKIE_DOMAIN` | `.shyftforce.com` (lead with the dot) | shares session across subdomains |
| `NEXT_PUBLIC_MARKETING_HOST` | `shyftforce.com` | |
| `NEXT_PUBLIC_APP_HOST` | `app.shyftforce.com` | |
| `NEXT_PUBLIC_ADMIN_HOST` | `admin.shyftforce.com` | |
| `NEXT_PUBLIC_APP_URL` | `https://app.shyftforce.com` | used in every outbound link (SMS/email/push/ICS) |
| `PLATFORM_ADMIN_EMAILS` | `you@company.com,cofounder@company.com` | who gets the Operator console |
| `CRON_SECRET` | `openssl rand -hex 24` | required — the cron routes now fail closed without it |
| `SHYFTFORCE_AI_KEY` | Anthropic API key | unset = Co-pilot button auto-hides |
| `RESEND_API_KEY` | Resend key | unset = emails log to console |
| `EMAIL_FROM` | `shyftforce <noreply@yourdomain.com>` | sender address |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_*` | Stripe values | unset = billing flows return 500 |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` | Twilio values | unset = SMS logs to console (clean fallback) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` | optional; unset = no push |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | **NOT WIRED YET** — kept for future use | even when set, errors go to console; see `src/lib/observability.ts` to plug in real Sentry |

### 2.3 GitHub Actions secrets

Required for the migrate-prod workflow:

- `PROD_DATABASE_URL` — same value as Vercel's `DATABASE_URL`
- `PROD_DIRECT_URL` — same value as Vercel's `DIRECT_URL`

Set in **Repo → Settings → Secrets and variables → Actions**.

### 2.4 One-time database baseline

The build script does NOT touch the DB. Migrations are applied by the
`migrate-prod` workflow. To kick that off cleanly the first time:

1. If the prod DB was created by Prisma `migrate deploy` from scratch:
   nothing to do, you're already good.
2. If the prod DB was synced via the old `db push` workflow (likely if you
   started development before the migration switch), baseline the existing
   tables as already-applied:

   ```powershell
   $env:DATABASE_URL = "<your PROD pooled url>"
   $env:DIRECT_URL   = "<your PROD direct url>"
   npx prisma migrate resolve --applied 0_init
   npx prisma migrate deploy
   ```

3. Confirm:

   ```powershell
   npx prisma migrate status
   # Database schema is up to date!
   ```

### 2.5 Rotate dev secrets

The local `.env` was used during development and contains real credentials
(Anthropic key + Neon password). Rotate them now so no copy on a laptop is a
valid credential anymore.

---

## 3. Day-to-day operations

### 3.1 Shipping code

`git push origin main` → Vercel auto-deploys. The build never touches the
database.

### 3.2 Shipping a schema change

1. Edit `prisma/schema.prisma` locally.
2. `npm run migrate:dev -- --name what_this_changes` to generate + apply
   against your local DB.
3. Commit the new file under `prisma/migrations/`.
4. Push.
5. The `.github/workflows/migrate-prod.yml` job runs automatically because
   the push touched `prisma/migrations/**`, and `prisma migrate deploy`
   applies the migration to prod.
6. Watch the GitHub Actions tab — the job must go green before the new code
   is safe to serve traffic. If you push a code change and a migration in
   the same commit, Vercel may finish the build before the migration job
   finishes; usually fine because the columns are additive, but on a
   destructive migration you should toggle off auto-deploy in Vercel until
   the migration is confirmed.

### 3.3 Checking what's pending in prod

```powershell
$env:DATABASE_URL = "<prod pooled>"
$env:DIRECT_URL   = "<prod direct>"
npm run migrate:status
```

### 3.4 Running a one-off SQL fix on prod

Neon dashboard → SQL Editor. Idempotent statements only (`ALTER TABLE ... ADD
COLUMN IF NOT EXISTS`, `UPDATE ... WHERE ... IS NULL`). Anything destructive
goes through a migration, never the SQL editor.

---

## 4. Common gotchas

### "Failed production deployment" emails from Vercel
Almost always the build itself: a TypeScript error, a missing dependency, or
a route handler that throws at import time. Click `See deployment details`
→ check the red line.

### Login works but every page errors
Schema mismatch. The deployed code expects a column the prod DB doesn't have.
Run the migrate-prod workflow manually (Actions → Migrate production
database → Run workflow), or paste the matching `ALTER TABLE ... ADD COLUMN
IF NOT EXISTS` from the latest migration file into the Neon SQL editor.

### "Invalid credentials" on a freshly-signed-up account
The user exists but their `Member.onboardingAt` is null and the employee
gate is redirecting to `/welcome` — that's expected. If the `/welcome` page
itself errors with "Failed to save," the prod DB is missing the
`onboardingAt` column. Apply the `20260529104229_member_onboarding_at`
migration.

### Trial banner stuck on red "Trial ends today"
The org's `trialEndsAt` is in the past. Either:
- Add a Stripe subscription via `/settings/billing`, or
- (Operator console) extend the trial in **Operator → Organizations → \[org\]
  → Trial ends on**.

### Map shows "No location data yet" forever
The location has no `latitude`/`longitude`. Either re-add it through the org
owner's Step 3 onboarding (which geocodes the address via OSM) or set them
manually in `/settings/locations`.

### Employees being assigned shifts they said they can't work
Their availability rules aren't being honored — except they ARE now. Confirm
they actually went through `/welcome` (look at the manager nudge widget on
the dashboard). If they skipped it, ask them to revisit
`/settings/availability`.

### Face-Block mode locked out the whole team
You flipped the toggle without enrolling first. From the Operator console
(or the workspace admin via `/admin`) flip it back to `Off` or `Flag`, then
ask each member to enroll under `/attendance` → Face ID, then re-enable.

---

## 5. Periodic checks

Once a week (or before any release that touches money or auth):

- `npm run migrate:status` against prod — should report "up to date".
- Spot-check `/attendance/review` for unusual flag patterns.
- Spot-check the Operator console's MRR + Past-due rolls.
- Check Vercel's function-log volume (a 10× spike usually means an error
  loop somewhere).

Once a quarter:

- Rotate `NEXTAUTH_SECRET` (invalidates all sessions — schedule it for an
  off-hours window).
- Rotate `CRON_SECRET`.
- Review who's in `PLATFORM_ADMIN_EMAILS`.

---

## 6. The features that need explicit env to work

The app degrades gracefully when these aren't configured, but the
corresponding feature won't function:

| Feature | Required vars | What happens if unset |
|---|---|---|
| AI Co-pilot + Auto-Scheduler | `SHYFTFORCE_AI_KEY` | "Generate with AI" button auto-hides |
| Stripe billing | `STRIPE_*` | billing routes return 500 |
| Outbound email | `RESEND_API_KEY`, `EMAIL_FROM` | emails log to console |
| Outbound SMS | `TWILIO_*` | SMS logs to console |
| Web Push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | push silently no-ops |
| OAuth login (Google/Microsoft) | `GOOGLE_CLIENT_*`, `AZURE_AD_CLIENT_*`, `NEXT_PUBLIC_GOOGLE_LOGIN`, `NEXT_PUBLIC_MICROSOFT_LOGIN` | SSO buttons hide |
| Slack notifications | `SLACK_*` | Slack action becomes a no-op |
| Finch payroll | `FINCH_CLIENT_ID`, `FINCH_CLIENT_SECRET`, `FINCH_REDIRECT_URI` | Finch connect returns 500 |
| POS integrations | `TOAST_*`, `SQUARE_*` (or `CLOVER_*`) | provider connect returns 500 |
| Cron loops | `CRON_SECRET` | cron routes return 503 (fail-closed) |
| Error tracking | _none — not wired_ | structured console output only; install `@sentry/nextjs` + wire `src/lib/observability.ts` to enable |
| Demo seed page | (none) | `/api/admin/seed-demo?secret=$CRON_SECRET` always available to operators |

---

That's it. If you find yourself doing something not described here more than
twice, add it.
