# ShyftForce Launch Guide

End-to-end checklist to take ShyftForce from "feature complete" to "live, paid customers" — targeted at **grocery stores, security companies, and restaurants**.

## 1. Production deployment (Vercel)

```bash
# From D:\ShyftForce
npm i -g vercel
vercel link
vercel env pull .env.production
```

Set these env vars in the Vercel dashboard (every entry below is required for the named feature):

| Var | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Neon Postgres connection string (pooled) |
| `NEXTAUTH_URL` | auth | `https://app.shyftforce.com` (or your domain) |
| `NEXTAUTH_SECRET` | auth | `openssl rand -base64 32` |
| `SHYFTFORCE_AI_KEY` | Co-pilot, Auto-Scheduler | Anthropic key, named to avoid Claude Code shell shadowing |
| `RESEND_API_KEY` | email (invites, password reset, autopilot DMs) | Verify your sending domain in Resend |
| `EMAIL_FROM` | email | `ShyftForce <noreply@yourdomain.com>` |
| `STRIPE_SECRET_KEY` | billing | Live key for paid customers |
| `STRIPE_WEBHOOK_SECRET` | billing | From the webhook endpoint config |
| `STRIPE_PRICE_STARTER` | billing | Stripe price id |
| `STRIPE_PRICE_PRO` | billing | Stripe price id |
| `CRON_SECRET` | self-healing autopilot + POS sync + reputation | `openssl rand -hex 24` |
| `FINCH_*` | payroll integration | Only if offering payroll connection |
| `TOAST_*` | live POS | Toast OAuth keys |
| `SQUARE_*` | live POS | Square OAuth keys |

Cron jobs in `vercel.json` are wired automatically on deploy.

## 2. Stripe — what to set up

1. Create Products: **Starter** ($29/loc/mo) + **Pro** ($59/loc/mo) + optional **Enterprise** (manual).
2. Price IDs go in `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`.
3. Webhook endpoint: `https://yourdomain.com/api/webhooks/stripe` → events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
4. Customer Portal: enable subscription management + payment method updates in Stripe Dashboard → Customer Portal.

## 3. Resend — email domain

1. Add your sending domain in Resend; complete SPF + DKIM DNS records.
2. Set `EMAIL_FROM` to a verified sender on that domain.
3. Smoke test: invite a teammate from `/hr/members` — they should receive the email.

## 4. Pick your launch verticals — what's ready

| Vertical | Industry template | Vertical-specific features |
|---|---|---|
| **Grocery** | `grocery` (cashier/deli/produce/bakery/stocker positions, 4 shift blocks, minor-labor compliance) | Demand forecast tied to POS revenue, predictability pay (NYC fast-food rules apply to grocery in some jurisdictions) |
| **Security** | `security` (armed/unarmed/patrol/dispatcher positions, 3+12hr shift blocks) | **Incident reports** (`/incidents`), **Patrol checkpoints + QR scanning** (`/settings/checkpoints` + `/checkpoints/scan`), **Client billing per hour** (`/clients`, `/reports/client-billing`) |
| **Restaurant** | `restaurant` | **POS sync** (Toast/Square stubs ready), **Live labor cost** (`/reports/labor-live`), **Tip pooling automation** (`/tips`), **Demand forecast** |

## 5. First-customer playbook

1. **Demo prep** — Run `npm run db:reset` to load Platinum Security sample data. Show the schedule, compliance autopilot (switch to NYC), self-healing call-out flow, demand forecast (use manual revenue entry), incident reports + client billing for security demos, tip pooling for restaurant demos.
2. **Trial signup** — `/signup` → onboarding wizard picks industry → 5 minutes to first shift.
3. **Real money path** — `/settings/billing` upgrades to Pro via Stripe Checkout. Webhook updates `subscriptionStatus`.
4. **Live POS** — `/settings/pos` → paste Toast/Square API key → cron pulls every 15min.
5. **Network effect** — Customers' workers turn on `/worker/profile` discoverability → cross-employer shift claims drive viral acquisition.

## 6. Known production gaps (clearly stubbed, will not block launch)

| Gap | Where | Risk | Fix when |
|---|---|---|---|
| Toast/Square OAuth not wired (long-lived tokens accepted) | `src/lib/pos/*.ts` | Customer manually pastes token | Wire OAuth in week 2 |
| EWA money movement is internal ledger only | `src/lib/ewa/provider.ts` | Employer settles via payroll | Add Branch/Tapcheck partnership |
| Worker identity verification stubbed | `WorkerProfile.identityProvider` | Reputation-only, no KYC | Persona / Stripe Identity |
| Cross-org DMs use audit-log only | `/api/network/claim` | Worker contacts posting org out-of-band | Cross-org notification feed |
| Encrypted credential storage | `PosConnection.accessToken`, `Organization.finchAccessToken` | Plain text in DB | libsodium / AWS KMS before scaling |

## 7. The launch path (sequenced)

- [x] All features feature-complete for 3 verticals
- [ ] Deploy to Vercel staging (yourorg-staging.shyftforce.com)
- [ ] Verify Resend domain + send test invite
- [ ] Configure Stripe products + webhook
- [ ] Run smoke tests against staging (signup → onboarding → schedule → invite → invite accept → billing upgrade)
- [ ] Production deployment + custom domain
- [ ] Soft launch: 3 pilot customers across 3 verticals (1 grocery, 1 security, 1 restaurant)
- [ ] Marketing landing page → vertical-specific positioning + case study capture forms
- [ ] Open signups
