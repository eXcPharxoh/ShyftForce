# shyftforce

Workforce management platform — schedules, attendance, payroll, time-off, expenses, HR. Multi-location, multi-role.

## Stack
- **Next.js 15** (App Router) · TypeScript · Tailwind
- **Prisma** + **SQLite** (swap to Postgres for prod by changing `DATABASE_URL` and the `provider` in `prisma/schema.prisma`)
- **NextAuth** credentials login

## Quick start

```bash
cd shyftforce
npm install
npm run db:reset       # create schema + seed Platinum Security org
npm run dev            # http://localhost:3210
```

## Demo logins
| Email                  | Password   | Role     |
|------------------------|------------|----------|
| admin@platinum.com     | password   | Admin    |
| sarah@platinum.com     | password   | Manager  |
| jordan@platinum.com    | password   | Employee |

## Modules
- **Dashboard** — 14 widgets (live clock, pay period, conflicts, anniversaries, my space, pending requests, day notes, high fives, attendance, unpublished schedules, shift tasks, onboarding, timesheet approval, weekly budget, surveys, HR reminders)
- **Schedule** — week grid, open shifts, drafts, publish flow
- **Time Off** — request → approve flow
- **Attendance** — clock in/out + breaks, timesheets, payroll, tip management
- **Expenses** — submit + approve flow
- **HR** — members, kudos/high fives, surveys, onboarding
- **Documents** — file storage + document requests
- **Messenger** — 1-to-1 internal messaging
- **News Feed** — billboard announcements
- **Reports** — labor cost by location, hours by day-of-week
- **More** — settings, integrations, referral program

## Architecture
- Multi-tenant: `Organization → Location → Member`. Org UUID `258ae555-e8b8-435a-b844-c1e7a860e756` matches the spec.
- All app routes are gated by `requireUser()` which redirects to `/login`.
- Manager-only mutations gated via `requireManagerOrAdmin()`.
- Live attendance polled every 15s via `/api/attendance/live`.

## Database

```
prisma/schema.prisma     # 23 models, multi-tenant
prisma/seed.ts           # Platinum Security + 4 sites + 15 members + shifts + timesheets + surveys + kudos + posts
```
