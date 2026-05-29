// Host-aware routing for the three-subdomain deployment.
// One Vercel deployment serves all three from the same codebase; the middleware
// keeps the surfaces cleanly separated:
//
//   shyftforce.com           → marketing landing + auth + legal
//   app.shyftforce.com       → the customer app (everything under (app))
//   admin.shyftforce.com     → the platform admin dashboard (/platform/*)
//
// In dev (localhost) + on Vercel preview URLs, the middleware no-ops so nothing
// gets in the way. Only the three configured hosts are enforced.
//
// Configure via env (see .env.example):
//   NEXT_PUBLIC_MARKETING_HOST=shyftforce.com
//   NEXT_PUBLIC_APP_HOST=app.shyftforce.com
//   NEXT_PUBLIC_ADMIN_HOST=admin.shyftforce.com

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MARKETING = (process.env.NEXT_PUBLIC_MARKETING_HOST ?? "shyftforce.com").toLowerCase();
const APP       = (process.env.NEXT_PUBLIC_APP_HOST       ?? "app.shyftforce.com").toLowerCase();
const ADMIN     = (process.env.NEXT_PUBLIC_ADMIN_HOST     ?? "admin.shyftforce.com").toLowerCase();

// Routes that live in the (app) group — anything under one of these prefixes
// belongs to the customer app and should be served from app.<domain>.
const APP_PATH_PREFIXES = [
  "/dashboard", "/schedule", "/attendance", "/time-off", "/hr", "/documents",
  "/messenger", "/billboard", "/compliance", "/reports", "/more", "/expenses",
  "/open-shifts", "/settings", "/incidents", "/checkpoints", "/clients", "/tips",
  "/ewa", "/network", "/worker", "/onboarding", "/admin", "/log-book", "/welcome", "/suspended",
];

const AUTH_PATHS = new Set([
  "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/accept-invite",
]);

function isAppRoute(p: string) {
  return APP_PATH_PREFIXES.some((r) => p === r || p.startsWith(r + "/"));
}
function isPlatformRoute(p: string) {
  return p === "/platform" || p.startsWith("/platform/");
}

export function middleware(req: NextRequest) {
  const rawHost = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Skip Next internals, static, API — let them pass.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // any file with an extension (images, fonts, etc.)
  ) {
    return NextResponse.next();
  }

  const rootDomain = MARKETING.replace(/^www\./, "");

  // Not our domain? (localhost, *.vercel.app, custom dev hosts) — no-op.
  if (!rawHost.endsWith(rootDomain)) {
    return NextResponse.next();
  }

  const isMarketing = rawHost === MARKETING || rawHost === `www.${MARKETING}`;
  const isApp = rawHost === APP;
  const isAdmin = rawHost === ADMIN;

  // === MARKETING (root domain) ===
  if (isMarketing) {
    // /dashboard, /schedule, etc. on marketing site → bounce to app
    if (isAppRoute(pathname)) {
      const dest = url.clone(); dest.hostname = APP;
      return NextResponse.redirect(dest);
    }
    // /platform on marketing site → bounce to admin
    if (isPlatformRoute(pathname)) {
      const dest = url.clone(); dest.hostname = ADMIN;
      return NextResponse.redirect(dest);
    }
    // Everything else (/, /pricing, /legal/*, /login, /signup, /verify-email, …) stays.
    return NextResponse.next();
  }

  // === APP SUBDOMAIN ===
  if (isApp) {
    // /platform on app → bounce to admin
    if (isPlatformRoute(pathname)) {
      const dest = url.clone(); dest.hostname = ADMIN;
      return NextResponse.redirect(dest);
    }
    // Root → /login (NextAuth will fwd to /dashboard if a session exists)
    if (pathname === "/") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    // Marketing-only routes (/pricing, /legal/*) bounce back to marketing root
    if (pathname === "/pricing" || pathname.startsWith("/legal/")) {
      const dest = url.clone(); dest.hostname = MARKETING;
      return NextResponse.redirect(dest);
    }
    return NextResponse.next();
  }

  // === ADMIN SUBDOMAIN ===
  if (isAdmin) {
    // App routes on admin → bounce to app
    if (isAppRoute(pathname)) {
      const dest = url.clone(); dest.hostname = APP;
      return NextResponse.redirect(dest);
    }
    // Root → /platform (which itself gates on platform-admin email)
    if (pathname === "/") {
      url.pathname = "/platform";
      return NextResponse.redirect(url);
    }
    // Auth pages allowed (admin needs to sign in too)
    if (AUTH_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    // Marketing-only pages → bounce to marketing
    if (pathname === "/pricing" || pathname.startsWith("/legal/")) {
      const dest = url.clone(); dest.hostname = MARKETING;
      return NextResponse.redirect(dest);
    }
    // Anything else that isn't /platform → /platform
    if (!isPlatformRoute(pathname)) {
      url.pathname = "/platform";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Unknown host that ends with our root domain (e.g. blog.shyftforce.com that
  // isn't yet a real subdomain) — let it pass; Vercel will 404 if no route matches.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
