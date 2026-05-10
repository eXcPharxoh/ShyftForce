# shyftforce — Production checklist

Everything you must do to go from "great demo" to "real SaaS people pay for." Items marked **🤖 me** I can build for you in follow-up sessions. Items marked **👤 you** are admin / external work only you can do.

---

## 1. Legal & business setup (👤 you only — do these in parallel with weeks 1-2 of dev)

| Task | Tool / Cost | Time |
|---|---|---|
| Form an LLC | Stripe Atlas ($500), Firstbase ($399), or local lawyer | 1-2 days |
| Get an EIN | irs.gov/EIN — free | 10 min |
| Open a business bank account | Mercury, Relay, or local | 1 day |
| Buy `shyftforce.com` (or your chosen domain) | Cloudflare Registrar (~$10/yr) | 5 min |
| Privacy Policy + Terms of Service + DPA | Termly ($120/yr), Iubenda, or lawyer ($1-3k) | 1-2 hours |
| Trademark search + register | USPTO TEAS Plus $250 + lawyer optional | 30 min to file |
| Business insurance | Vouch, Embroker (E&O + Cyber + General) ~$2-5k/yr | 1-2 days |

**Totals:** ~$1,500-3,500 one-time, ~$2-5k/yr ongoing.

---

## 2. Hosting & infrastructure (👤 you decide, 🤖 me migrate)

### Recommended: **Vercel + Neon**
Why: Vercel is built for Next.js (zero config), Neon is serverless Postgres with a generous free tier and instant cold starts.

#### What you do (~30 min):
1. **Sign up at [neon.tech](https://neon.tech)** (free)
   - Create a project named "shyftforce"
   - Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb`)
2. **Sign up at [vercel.com](https://vercel.com)** with your GitHub
   - Push this repo to GitHub first: `git remote add origin git@github.com:YOU/shyftforce.git && git push -u origin main`
   - In Vercel, "New Project" → select the repo
   - Add environment variables (see below)
3. **Sign up at [resend.com](https://resend.com)** (transactional email)
   - Verify your domain (DNS records)
   - Generate an API key
4. **Sign up at [stripe.com](https://stripe.com)**
   - Create products: **Starter** ($29/mo) and **Pro** ($79/mo)
   - Copy the price IDs (start with `price_…`)
   - Set up webhook → endpoint `https://shyftforce.com/api/webhooks/stripe`, events: `checkout.session.completed`, `customer.subscription.*`
   - Copy the webhook signing secret (starts with `whsec_…`)

#### Environment variables to set in Vercel:
```
DATABASE_URL                    = postgresql://… (from Neon)
NEXTAUTH_URL                    = https://shyftforce.com
NEXTAUTH_SECRET                 = (run: openssl rand -base64 32)
SHYFTFORCE_AI_KEY               = sk-ant-… (your Anthropic key)
RESEND_API_KEY                  = re_… (from Resend)
EMAIL_FROM                      = "shyftforce <noreply@shyftforce.com>"
STRIPE_SECRET_KEY               = sk_live_… (from Stripe)
STRIPE_WEBHOOK_SECRET           = whsec_… (from Stripe webhook setup)
STRIPE_PRICE_STARTER            = price_… (from Stripe Starter product)
STRIPE_PRICE_PRO                = price_… (from Stripe Pro product)
```

#### What I do once you've got a Neon URL:
- Switch `prisma/schema.prisma` provider from `sqlite` to `postgresql`
- Run `prisma db push` against Neon
- Re-seed Platinum Security demo org
- Test the full flow on production

---

## 3. Pre-launch security hardening (🤖 me — next sessions)

| Item | Status |
|---|---|
| MFA / 2FA via TOTP authenticator | Schema ready, UI TODO |
| Rate limiting on auth + AI endpoints (`@upstash/ratelimit`) | TODO |
| Sentry error tracking (free tier) | TODO |
| Better Uptime monitoring (free tier) | TODO |
| Daily DB backups (auto with Neon) | ✅ included with Neon |
| Account lockout after N failed logins | Schema ready, logic TODO |
| Email change requires reverify | TODO |
| CSP headers + security headers (`next.config.mjs`) | TODO |

---

## 4. Trust & sales enablement (mix)

### What I can build (next 1-2 sessions):
- 🤖 **Marketing landing page** (`/`) — what is this, who's it for, screenshots, signup CTA
- 🤖 **Pricing page** (`/pricing`) — already in `/settings/billing`, just need a public version
- 🤖 **Public sandbox / demo mode** — clickable Platinum Security data, resets every hour
- 🤖 **Help center skeleton** (`/help`) — 10 starter articles
- 🤖 **Status page** widget (or wire to Better Uptime)
- 🤖 **`/legal/privacy` and `/legal/terms`** pages — HTML wrappers around the text you generate via Termly

### What you must do:
- 👤 **Generate Privacy Policy + ToS via Termly** (paste output into the legal pages)
- 👤 **Get 3 design-partner customers** — free in exchange for logo + testimonial
- 👤 **Write 5 case studies** (short — "X solved Y with shyftforce")
- 👤 **LinkedIn / Twitter / Product Hunt launch**
- 👤 **Cold outreach** to 50 prospects (your network: security companies, restaurants, retail you know)
- 👤 **Set up `support@shyftforce.com`** in Google Workspace ($6/user/mo)

---

## 5. The 3-week sprint (realistic timeline)

### Week 1 — Foundation [✅ MOSTLY DONE]
- ✅ Self-serve signup + email verification
- ✅ Forgot/reset password
- ✅ Team invitations
- ✅ Onboarding wizard with 6 industry templates
- ✅ Stripe billing scaffold (checkout + portal + webhook)
- ✅ Audit log
- ✅ Email service (Resend + console fallback)
- ⏳ **YOU**: LLC, domain, Neon/Vercel/Stripe/Resend signups
- ⏳ **ME (next session)**: SQLite → Postgres migration, deploy to Vercel

### Week 2 — Polish & trust signals
- 🤖 Marketing landing page + pricing page
- 🤖 Public demo / sandbox
- 🤖 MFA / 2FA
- 🤖 Rate limiting + Sentry + Better Uptime
- 🤖 Account lockout + security headers
- 🤖 Legal pages (you generate text via Termly, I wire them in)
- 🤖 Help center skeleton (5-10 starter articles)

### Week 3 — Go to market
- 👤 First outreach: 20 prospects from your network
- 👤 Get 3 design partners free in exchange for testimonial
- 👤 Launch on LinkedIn, X, Product Hunt
- 👤 Land first 5 paying customers

**Realistic Month 1 revenue:** $500-2,000 MRR (10-20 customers @ $29-79)
**Realistic Month 6 revenue:** $5-15k MRR with consistent outbound

---

## 6. After your first 10 paying customers

These unlock larger deals but don't matter at launch:

- SOC 2 Type 2 — Vanta or Drata, ~$15-30k/yr, 6-12 months to certify
- SSO (Google / Microsoft / Okta SAML)
- Native iOS + Android apps (PWA covers 80% first)
- Multi-language / multi-currency
- Public REST API + webhooks
- Affiliate / referral program
- Integrations: Gusto, ADP, QuickBooks, Square, Toast (each is its own session)

---

## 7. Quick reference: what's already built

| Feature | Where | Status |
|---|---|---|
| 10-module workforce platform | All routes | ✅ |
| AI Co-pilot (Cmd+K) | Topbar everywhere | ✅ |
| AI Auto-Scheduler | Schedule page | ✅ |
| Compliance Autopilot | `/compliance` | ✅ |
| Open-Shift Marketplace | `/open-shifts` | ✅ |
| Geofenced + photo clock-in | `/attendance` | ✅ |
| Self-serve signup | `/signup` | ✅ |
| Email verification | `/verify-email` | ✅ |
| Forgot / reset password | `/forgot-password`, `/reset-password` | ✅ |
| Team invitations | `/hr/members` → Invite | ✅ |
| Onboarding wizard | `/onboarding` | ✅ |
| Stripe billing | `/settings/billing` | ✅ scaffolded (needs your Stripe price IDs) |
| Audit log | `/settings/audit` | ✅ |

---

## 8. Quick start for new dev environments

```bash
git clone <repo>
cd shyftforce
npm install
cp .env.example .env       # then fill in the values
npm run db:reset           # creates schema + seeds Platinum Security demo org
npm run dev                # http://localhost:3210
```

Demo accounts (from seed):
- `admin@platinum.com` / `password`  (Admin)
- `sarah@platinum.com` / `password`  (Manager)
- `jordan@platinum.com` / `password` (Employee)

To test the full signup flow: visit `/signup` → fills out → check the dev console for the verification email link (no Resend key needed locally).
