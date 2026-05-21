# Mobile app strategy

> Decision doc for the README open question:
> _"Mobile employee app — separate React Native codebase?"_

**Decision: PWA-first. Defer a native React Native app to v2.**

## TL;DR

- The current web app is already a **PWA** (manifest, service worker, push,
  offline queue). It installs to the home screen on iOS + Android and feels
  ~95% native to employees.
- A dedicated **manager** view stays desktop-focused — too dense for phones.
  Managers who need on-the-go access use the responsive PWA fallback.
- A dedicated **employee** view (the `?view=employee` toggle in the topbar
  designed in the spec) is being shipped as a focused PWA experience rather
  than a separate codebase.
- We'll **revisit native** when one of these happens:
  - Geofence reliability needs background location (PWA can't access).
  - Push delivery rate on iOS PWAs falls below ~85%.
  - We hit 500+ paying orgs and the App Store presence becomes a marketing
    moat.

## Why not React Native (yet)

| Argument                         | Verdict                                                                 |
|----------------------------------|-------------------------------------------------------------------------|
| Duplicates the codebase          | True. Web + RN = 1.6x engineering cost for ~10% UX gain pre-scale.       |
| App Store presence helps trust   | Real, but for B2B workforce tools it's not a primary buy signal.        |
| iOS push reliability             | PWA push works on iOS 16.4+. Reliability is good for app-in-foreground. |
| Background geofencing            | PWA limitation — Service Worker can't run when tab is closed.           |
| Selfie clock-in / camera         | PWA can use `getUserMedia` + `capture="user"` — already wired.          |
| Offline scheduling browse        | Service worker caches `/schedule` and `/open-shifts` already.           |

## PWA gaps to close (instead of RN)

These belong on the v1 backlog rather than a native rewrite:

1. **iOS install prompt** — proactive `beforeinstallprompt` UI for Android,
   and a one-time iOS "Add to Home Screen" walkthrough on first sign-in.
2. **Push notification audit** — verify VAPID push delivery on iOS 16.4+ +
   Android Chrome 90+. Currently shipped, needs telemetry.
3. **Offline shift-claim queue** — already exists in `lib/push/offline-queue.ts`,
   needs UX polish (toast confirmation when queued, replay banner when back online).
4. **Camera permission UX** — graceful fallback when the user denies camera
   for selfie clock-in (route to manager-approved override).
5. **Geofence improvements** — surface `accuracy` from `getCurrentPosition` to
   the user so they understand why a clock-in flagged as "outside".

## v2 RN plan (if/when we go native)

- **Expo + React Native**, share the design system + business logic
  (TanStack Query) with web via a shared packages workspace.
- Focus on employee features only — managers stay on web.
- Native modules to add: background geolocation (geofence enter/exit), local
  push (no internet required for shift reminders), camera with selfie review.
- App Store + Google Play release through Expo EAS.

## Open question for product

If we proceed with PWA-first, do we want to add a **"Send install link"**
button in the manager's HR roster that texts each employee the
`https://app.shyftforce.com/install` URL with iOS + Android walkthrough?
Low effort, drives PWA adoption.
