# ShyftForce Launch Guide

End-to-end checklist to take ShyftForce from "feature complete" to "live, paid customers" — targeted at **grocery stores, security companies, and restaurants**.

## 1. Three-subdomain production deployment

ShyftForce runs from a **single Vercel deployment** with three custom domains:

| Subdomain | Serves | Who uses it |
|---|---|---|
| `shyftforce.com` (root) | Marketing landing + auth flows + legal pages | Prospects, search engines |
| `app.shyftforce.com` | The customer app (everything under `/dashboard`, `/schedule`, etc.) | Paying / trialing customers |
| `admin.shyftforce.com` | Platform admin dashboard (`/platform/*`) | **You only** (cross-org diagnostics + impersonation) |

The middleware at `src/middleware.ts` routes by host — visiting `app.shyftforce.com/platform` redirects to `admin.shyftforce.com/platform`, `shyftforce.com/dashboard` redirects to `app.shyftforce.com/dashboard`, etc. Localhost + Vercel previews are unaffected.

### 1a. DNS records (whatever registrar — Cloudflare, Namecheap, Route53…)

Point all three at Vercel:

| Type | Name | Value |
|---|---|---|
| `A`     | `@`     | `76.76.21.21` (Vercel) |
| `CNAME` | `www`   | `cname.vercel-dns.com.` |
| `CNAME` | `app`   | `cname.vercel-dns.com.` |
| `CNAME` | `admin` | `cname.vercel-dns.com.` |

### 1b. Vercel project setup

```bash
cd D:\ShyftForce
npm i -g vercel
vercel link               # link to your project
vercel domains add shyftforce.com
vercel domains add www.shyftforce.com
vercel domains add app.shyftforce.com
vercel domains add admin.shyftforce.com
```

Vercel auto-provisions TLS for all four.

### 1c. Production env vars (Vercel dashboard → Settings → Environment Variables)

| Var | Required for | Example |
|---|---|---|
| `DATABASE_URL` | everything | Neon Postgres pooled URL |
| `NEXTAUTH_URL` | auth | `https://app.shyftforce.com` |
| `NEXTAUTH_SECRET` | auth | `openssl rand -base64 32` |
| `NEXT_PUBLIC_MARKETING_HOST` | routing | `shyftforce.com` |
| `NEXT_PUBLIC_APP_HOST` | routing | `app.shyftforce.com` |
| `NEXT_PUBLIC_ADMIN_HOST` | routing | `admin.shyftforce.com` |
| `NEXTAUTH_COOKIE_DOMAIN` | cross-subdomain login | `.shyftforce.com` (leading dot!) |
| `PLATFORM_ADMIN_EMAILS` | admin subdomain access | `you@yourdomain.com` |
| `SHYFTFORCE_AI_KEY` | Co-pilot, Auto-Scheduler | Anthropic key |
| `RESEND_API_KEY` + `EMAIL_FROM` | transactional email | Resend key + verified sender |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | billing | Live keys |
| `STRIPE_PRICE_STARTER` + `STRIPE_PRICE_PRO` | billing | Price IDs from Stripe |
| `CRON_SECRET` | self-healing + POS + reputation crons | `openssl rand -hex 24` |
| `FINCH_*` | payroll integration | Only if offering |
| `TOAST_*` / `SQUARE_*` | live POS | Optional — manual revenue works without |

> **Cookie domain matters.** `.shyftforce.com` (note the leading dot) means a session cookie set by `app.shyftforce.com` is visible to `admin.shyftforce.com`, so a platform admin can sign in once and use both surfaces.

### 1d. Cron jobs

`vercel.json` already lists them. They activate on first deploy + are secured by `CRON_SECRET`:

- `/api/coverage/tick` — every 2 min (Self-Healing Schedule)
- `/api/pos/sync` — every 15 min (POS revenue pull)
- `/api/network/reputation` — every 6 h (cross-employer reputation rebuild)

## 2. Stripe setup

1. **Products** — create **Starter** ($29/loc/mo) + **Pro** ($59/loc/mo) + optional **Enterprise** (manual).
2. **Price IDs** → `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`.
3. **Webhook** — `https://app.shyftforce.com/api/webhooks/stripe` (note: app subdomain). Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
4. **Customer portal** — enable subscription management + payment method updates in Stripe Dashboard → Customer Portal.

## 3. Resend — email domain

1. Add your sending domain in Resend; complete SPF + DKIM DNS records.
2. Set `EMAIL_FROM` to a verified sender on that domain (`ShyftForce <noreply@shyftforce.com>`).
3. Smoke test: from a trial account, invite a teammate from `/hr/members` — they should receive the email.

## 4. Pick your launch verticals — what's ready

| Vertical | Industry template | Vertical-specific features |
|---|---|---|
| **Grocery** | `grocery` (cashier/deli/produce/bakery/stocker positions, 4 shift blocks, minor-labor compliance) | Demand forecast tied to POS revenue |
| **Security** | `security` (armed/unarmed/patrol/dispatcher positions, 3+12hr shift blocks) | **Incident reports**, **Patrol checkpoints + QR scanning**, **Client billing per hour** |
| **Restaurant** | `restaurant` | **POS sync** (Toast/Square stubs), **Live labor cost**, **Tip pooling automation**, **Demand forecast** |

The Sidebar + Dashboard + /more page adapt to the chosen vertical automatically — see `src/lib/verticals/config.ts`.

## 5. First-customer playbook

1. **Demo prep** — Run `npm run db:reset` against a staging DB to load Platinum Security sample data. Show the schedule, compliance autopilot (switch to NYC), self-healing call-out flow, demand forecast (use manual revenue entry), incident reports + client billing for security demos, tip pooling for restaurant demos.
2. **Trial signup** — point them at `shyftforce.com/signup` → onboarding wizard picks industry → app.shyftforce.com/dashboard with sample shifts already seeded.
3. **Real money path** — `/settings/billing` upgrades to Pro via Stripe Checkout. Webhook updates `subscriptionStatus`.
4. **Live POS** — `/settings/pos` → paste Toast/Square API key → cron pulls every 15min.
5. **Network effect** — Customers' workers turn on `/worker/profile` discoverability → cross-employer shift claims drive viral acquisition.

## 6. Platform admin (yours only)

After deploy, set `PLATFORM_ADMIN_EMAILS=you@yourdomain.com` in Vercel env. Then sign in normally at `app.shyftforce.com/login`. Top-right dropdown → **Platform admin** opens `admin.shyftforce.com/platform`. From there:

- See every org's plan, status, members, locations
- Search every user globally
- **Login as** any user (4-hour audited grant) to diagnose problems
- Global audit log + system health dashboard

## 7. Known production gaps (clearly stubbed, will not block launch)

| Gap | Where | Risk | Fix when |
|---|---|---|---|
| Toast/Square OAuth not wired (long-lived tokens accepted) | `src/lib/pos/*.ts` | Customer manually pastes token | Wire OAuth in week 2 |
| EWA money movement is internal ledger only | `src/lib/ewa/provider.ts` | Employer settles via payroll | Add Branch/Tapcheck partnership |
| Worker identity verification stubbed | `WorkerProfile.identityProvider` | Reputation-only, no KYC | Persona / Stripe Identity |
| Cross-org DMs use audit-log only | `/api/network/claim` | Worker contacts posting org out-of-band | Cross-org notification feed |
| Encrypted credential storage | `PosConnection.accessToken`, `Organization.finchAccessToken` | Plain text in DB | libsodium / AWS KMS before scaling |

## 8. The launch path (sequenced)

- [x] All features feature-complete for 3 verticals
- [x] Production build green (104 routes)
- [x] Vertical-aware UI (grocery / security / restaurant)
- [x] Platform admin dashboard with audited impersonation
- [x] Three-subdomain middleware + cross-subdomain sessions
- [ ] DNS: point `@`, `www`, `app`, `admin` at Vercel
- [ ] Vercel: add all four domains to the project
- [ ] Vercel env vars: paste from the table above
- [ ] Verify Resend domain + send test invite
- [ ] Configure Stripe products + webhook on `app.<domain>`
- [ ] Smoke-test against production: signup at `shyftforce.com/signup` → onboarding → invite → accept → billing upgrade
- [ ] Open `admin.shyftforce.com` → impersonate the test user → verify the red banner shows + audit row created
- [ ] Soft launch: 3 pilot customers across 3 verticals
