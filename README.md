# ShyftForce

Workforce management platform built for **grocery stores, security companies, and restaurants** — schedules, attendance, payroll, compliance, EWA, demand forecasting, and a cross-employer worker network.

## Stack
- **Next.js 15** (App Router) · TypeScript · Tailwind · React Server Components
- **Prisma** + **Postgres** (production on Neon; local dev hits the same)
- **NextAuth** credentials auth (JWT sessions)
- **Anthropic** Claude for Co-pilot + Auto-Scheduler
- **Stripe** for billing, **Resend** for email, **Finch** for payroll, **Toast/Square** for POS

## Quick start (dev)

```bash
cd shyftforce
cp .env.example .env        # fill in DATABASE_URL, NEXTAUTH_SECRET, SHYFTFORCE_AI_KEY
npm install
npm run db:push             # apply schema to your Postgres DB
npm run db:seed             # OPTIONAL: load Platinum Security demo data
npm run dev                 # http://localhost:3210
```

## Demo logins (only after `db:seed`)
| Email                  | Password   | Role     |
|------------------------|------------|----------|
| admin@platinum.com     | password   | Admin    |
| sarah@platinum.com     | password   | Manager  |
| jordan@platinum.com    | password   | Employee |

In production, new orgs sign up at `/signup`, pick an industry in the onboarding wizard, and get sample shifts + day notes auto-seeded for their first week.

## Verticals & vertical-specific features

| Vertical | Industry template | Killer features |
|---|---|---|
| **Grocery** | `grocery` | 11 positions (cashier/deli/bakery/produce/stocker/pharmacy), 4 shift blocks, minor-labor compliance, POS-driven demand forecast |
| **Security** | `security` | **Incident reports** (`/incidents`), **patrol checkpoint QR scanning** (`/settings/checkpoints` + `/checkpoints/scan`), **client billing per hour** (`/clients` + `/reports/client-billing`) |
| **Restaurant** | `restaurant` | **Tip pooling automation** (`/tips`), **live POS labor%** (`/reports/labor-live`), demand forecast → auto-generate draft week |

## Major modules

- **Schedule** — week grid, draft/publish, recurring patterns, copy-week, print view, auto-scheduler, demand forecast → auto-generate
- **Self-Healing Schedule** — employee call-out triggers wave-1 offers; cron auto-advances to wave 2/3 on expiry; no-show detection
- **Compliance Autopilot 2.0** — 8 jurisdiction rule packs (NYC/Seattle/Chicago/Philly/LA/Oregon/CA + default); predictability pay auto-tracked; live errors at draft time; minor labor protection
- **Live POS labor cost** — Toast/Square adapter layer (OAuth shells) + manual entry; per-location labor% vs target; send-home recommendations
- **Earned Wage Access** — calc engine + provider abstraction (internal ledger + stubs for Branch/Tapcheck/DailyPay/Stripe Treasury)
- **Demand forecasting** — 8-week median × 2-week trend × context-event multipliers; one-click apply as draft week
- **Worker Network** — cross-employer identity, reputation scoring, post shifts to network + claim from other employers
- **Attendance** — clock in/out + breaks + geofence + photo verification + offline PWA queue
- **Time-off + PTO** — multi-policy accrual, balance tracking, approve/reject flow
- **Timesheets + payroll** — Finch integration for ADP / Gusto / Paychex / Rippling / QuickBooks
- **Co-pilot** — Claude-powered scheduling assistant (⌘K)
- **Tip pooling** — hours / role-weighted / equal / custom distribution rules with IRS-audit-friendly history
- **Incident reports** — 8 categories × 4 severities, auto-DM managers on high/critical
- **Patrol checkpoints** — printable QR codes, GPS-verified scans, post-by-post audit trail
- **Client billing** — per-location client assignment, bill rate + OT multiplier, monthly invoice CSV export

## Architecture
- Multi-tenant: `Organization → Location → Member`. Every query gates on `organizationId`.
- All `(app)` routes wrapped by `requireUser()` (redirects to `/login`).
- Manager-only mutations gated via `requireManagerOrAdmin()`.
- Cron jobs in `vercel.json` hit `/api/coverage/tick` (2 min), `/api/pos/sync` (15 min), `/api/network/reputation` (6h) — secured by `CRON_SECRET` Bearer.

## Database
```
prisma/schema.prisma     # 45+ models, multi-tenant, Postgres
prisma/seed.ts           # Platinum Security demo org with 4 sites + 15 members
```

Key models: `Organization`, `Member`, `Shift`, `Location`, `ComplianceSettings`, `PredictabilityPayEvent`, `PosConnection`, `PosRevenueSnapshot`, `EwaSettings`, `EwaWithdrawal`, `DemandForecast`, `DemandContext`, `WorkerProfile`, `NetworkShiftOffer`, `IncidentReport`, `CheckpointPost`, `CheckpointScan`, `ClientAccount`, `TipPool`, `TipDistribution`.

## Production deployment
See **[LAUNCH.md](./LAUNCH.md)** for the full Vercel + Stripe + Resend setup checklist.

## License
Proprietary — © The Ecom Network.
