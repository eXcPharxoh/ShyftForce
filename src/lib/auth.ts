import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { verifyCode } from "./totp";

// Brute-force lockout policy.
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
// Precomputed once at module load. Compared against when the email doesn't
// exist so a missing-user login takes the same time as a wrong-password login
// (defeats user-enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync("user-enumeration-decoy", 10);

// OAuth providers are only added when their client IDs are configured. Lets
// us deploy without setting them up and skip the "this provider isn't
// configured" screen.
const oauthProviders = [
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && GoogleProvider({
    clientId:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Restricted to verified emails; we'll only allow login if the email
    // matches an existing User (or accepted invitation).
    authorization: { params: { prompt: "select_account" } },
  }),
  process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && AzureADProvider({
    clientId:     process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    tenantId:     process.env.AZURE_AD_TENANT_ID ?? "common", // "common" = any AAD or personal MS account
  }),
].filter(Boolean) as any[];

// When the app is deployed on multiple subdomains (app.shyftforce.com,
// admin.shyftforce.com), set NEXTAUTH_COOKIE_DOMAIN=.shyftforce.com so the
// session cookie is shared across them. In dev / single-host deploys, leave
// the var unset and NextAuth uses host-only cookies (default behavior).
const COOKIE_DOMAIN = process.env.NEXTAUTH_COOKIE_DOMAIN || undefined;
const useSecureCookies = process.env.NODE_ENV === "production";
const sessionCookieName = useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: COOKIE_DOMAIN,
      },
    },
    callbackUrl: {
      name: useSecureCookies ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies, domain: COOKIE_DOMAIN },
    },
    csrfToken: {
      name: useSecureCookies ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      // __Host- prefix forbids the Domain attribute; intentional — CSRF is host-bound.
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
    },
  },
  providers: [
    ...oauthProviders,
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp:  { label: "2FA code", type: "text" },
        recoveryCode: { label: "Recovery code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Normalize the typed email to match how we stored it on signup
        // (z.string().email().toLowerCase().trim()). Without this, somebody
        // who typed Omar@gmail.com here but signed up with omar@gmail.com
        // would silently fail with "Invalid credentials" — which is exactly
        // the bug that was happening.
        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { member: { include: { organization: true, location: true } } },
        });
        if (!user) {
          // Constant-ish time: do a throwaway compare so a non-existent email
          // can't be distinguished from a wrong password by response latency.
          await bcrypt.compare(credentials.password, DUMMY_HASH);
          return null;
        }

        // Account lockout — refuse while the cooldown window is active.
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) {
          // Increment failures; lock after the threshold.
          const attempts = user.failedLoginAttempts + 1;
          const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: attempts, lockedUntil },
          }).catch(() => {});
          return null;
        }

        // Password correct — clear any prior failure state.
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          }).catch(() => {});
        }

        // 2FA gate. If TOTP is enabled, require a fresh code OR a recovery code.
        // We throw a specifically-named Error so the login page can detect
        // "password ok, code needed" and prompt for the code without losing state.
        if (user.totpEnabled && user.totpSecret) {
          const totp = credentials.totp?.trim();
          const recovery = credentials.recoveryCode?.trim();
          let passed = false;
          if (totp && /^\d{6}$/.test(totp)) {
            passed = verifyCode(user.totpSecret, totp);
          } else if (recovery) {
            const codes: string[] = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
            for (let i = 0; i < codes.length; i++) {
              if (await bcrypt.compare(recovery, codes[i])) {
                // Burn the used recovery code so it can't be reused
                const next = [...codes];
                next.splice(i, 1);
                await prisma.user.update({ where: { id: user.id }, data: { recoveryCodes: JSON.stringify(next) } });
                passed = true;
                break;
              }
            }
          }
          if (!passed) {
            // NextAuth surfaces error.message via the ?error= URL param on /login.
            throw new Error("TOTP_REQUIRED");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar ?? null,
          memberId: user.member?.id,
          role: user.member?.role,
          organizationId: user.member?.organizationId,
          organizationName: user.member?.organization?.name,
          organizationIndustry: user.member?.organization?.industry ?? null,
          locationId: user.member?.locationId ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    // OAuth gate: an external IdP can only sign you in if the email it
    // returns already exists as a User (so randoms can't claim an org).
    // We then upsert an OAuthIdentity link so future logins are 1-click.
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "credentials") return true;
      const email = (profile as any)?.email ?? user.email;
      if (!email) return false;
      const dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!dbUser) {
        // Brand-new email coming via OAuth — refuse. Customer admins invite
        // them through normal flow; THEN they can SSO in.
        return "/login?error=AccessDenied&reason=not_invited";
      }
      // 2FA still applies — if the user enrolled in TOTP, refuse OAuth.
      // OAuth bypassing TOTP would silently downgrade their security.
      if (dbUser.totpEnabled) {
        return "/login?error=AccessDenied&reason=2fa_use_password";
      }
      try {
        await prisma.oAuthIdentity.upsert({
          where:  { provider_providerId: { provider: account.provider, providerId: account.providerAccountId } },
          create: {
            userId:     dbUser.id,
            provider:   account.provider,
            providerId: account.providerAccountId,
            email:      email.toLowerCase(),
          },
          update: { userId: dbUser.id, lastUsedAt: new Date() },
        });
      } catch (e) {
        console.error("[oauth] failed to upsert identity:", e);
      }
      return true;
    },
    async jwt({ token, user, trigger, account }) {
      // OAuth users hit jwt() without going through authorize(), so we need
      // to enrich the token with their member context here.
      if (account && account.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          include: { member: { include: { organization: true } } },
        });
        if (dbUser?.member) {
          Object.assign(token, {
            sub: dbUser.id,
            memberId: dbUser.member.id,
            role: dbUser.member.role,
            organizationId: dbUser.member.organizationId,
            organizationName: dbUser.member.organization.name,
            organizationIndustry: dbUser.member.organization.industry ?? null,
            locationId: dbUser.member.locationId ?? null,
          });
        }
      }

      if (user) {
        Object.assign(token, {
          memberId: (user as any).memberId,
          role: (user as any).role,
          organizationId: (user as any).organizationId,
          organizationName: (user as any).organizationName,
          organizationIndustry: (user as any).organizationIndustry ?? null,
          locationId: (user as any).locationId,
        });
      }
      // Refresh industry on session update (so picking it in onboarding propagates without re-login)
      if (trigger === "update" && (token as any).organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: (token as any).organizationId },
          select: { industry: true, name: true },
        });
        if (org) {
          (token as any).organizationIndustry = org.industry ?? null;
          (token as any).organizationName = org.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      Object.assign(session, {
        memberId: token.memberId,
        role: token.role,
        organizationId: token.organizationId,
        organizationName: token.organizationName,
        organizationIndustry: (token as any).organizationIndustry ?? null,
        locationId: token.locationId,
      });
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
