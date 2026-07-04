// shyftforce service worker — minimal cache + offline clock-in queue
// Bumping CACHE_VERSION invalidates old caches.
const CACHE_VERSION = "shyftforce-v1";
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const OFFLINE_CLOCK_QUEUE = "shyftforce-clock-queue-v1";

const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.endsWith(CACHE_VERSION) && !k.endsWith(OFFLINE_CLOCK_QUEUE)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Don't intercept API mutations except clock-in (handled below)
  if (req.method !== "GET") {
    if (url.pathname === "/api/attendance/clock") return handleOfflineClock(e);
    return;
  }

  // Same-origin GET: stale-while-revalidate for static + cached docs
  if (url.origin === self.location.origin) {
    if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webmanifest|woff2?)$/) ||
        url.pathname.startsWith("/_next/static/")) {
      e.respondWith(staleWhileRevalidate(req));
    }
  }
});

// Intercept POST /api/attendance/clock — if network fails, queue the body for later replay
function handleOfflineClock(event) {
  event.respondWith((async () => {
    const cloned = event.request.clone();
    try {
      const res = await fetch(event.request);
      // If success and we had queued events, try to drain them
      if (res.ok) drainQueue();
      return res;
    } catch (e) {
      // Offline — store the payload
      const body = await cloned.json().catch(() => null);
      if (body) await enqueue(body);
      // Tell the page we queued
      return new Response(JSON.stringify({
        ok: true, queued: true,
        message: "Offline — clock event queued. We'll send it when you're back online.",
      }), { status: 202, headers: { "Content-Type": "application/json" } });
    }
  })());
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}

// ---------- Queue (IndexedDB) ----------
function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("shyftforce-queue", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("clockEvents", { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function enqueue(payload) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction("clockEvents", "readwrite");
    tx.objectStore("clockEvents").add({ payload, at: Date.now() });
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function deleteQueued(id) {
  const dx = await db();
  await new Promise((ok, no) => {
    const tx = dx.transaction("clockEvents", "readwrite");
    tx.objectStore("clockEvents").delete(id);
    tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error);
  });
}

async function notify(title, body) {
  try {
    await self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "clock-sync",
    });
  } catch { /* notifications may be denied — nothing else we can do here */ }
}

async function drainQueue() {
  const d = await db();
  const items = await new Promise((res, rej) => {
    const tx = d.transaction("clockEvents", "readonly");
    const req = tx.objectStore("clockEvents").getAll();
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
  for (const item of items) {
    try {
      const r = await fetch("/api/attendance/clock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // redirect:"manual" so a 307 -> /login (expired session) is NOT
        // followed. Previously we followed it, got the login page as 200 OK,
        // saw r.ok === true, and DELETED the punch — permanently losing paid
        // time. Also stamp the ORIGINAL punch time (occurredAt) so late-
        // draining doesn't record the shift at drain time.
        redirect: "manual",
        body: JSON.stringify({ ...item.payload, occurredAt: new Date(item.at).toISOString() }),
      });

      // A followed-manually redirect shows up as an opaque redirect (status 0,
      // type "opaqueredirect"). Treat that as "session expired — keep it."
      if (r.type === "opaqueredirect" || r.status === 0 || r.status === 401 || r.status === 307) {
        await notify("Sign in to sync your clock-in", "You have a saved punch waiting. Open ShyftForce and sign in to send it.");
        continue; // keep the item, retry after re-login
      }

      if (r.ok) {
        await deleteQueued(item.id);
        continue;
      }

      // 4xx that isn't auth = terminal rejection (e.g. 422 photo/face required,
      // 409 checklist gate). Retrying forever won't help — delete it and tell
      // the employee it couldn't be recorded so they can fix it with a manager.
      if (r.status >= 400 && r.status < 500) {
        await deleteQueued(item.id);
        const when = new Date(item.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        await notify("A saved clock-in couldn't be recorded", `Your punch from ${when} wasn't accepted. Please clock in again or ask your manager to add it.`);
        continue;
      }

      // 5xx: transient server error — leave it queued to retry later.
    } catch { /* still offline — leave queued */ }
  }
}

self.addEventListener("sync", (e) => {
  if (e.tag === "drain-clock-queue") e.waitUntil(drainQueue());
});

// Allow page to ask us to drain manually
self.addEventListener("message", (e) => {
  if (e.data?.type === "drain-clock-queue") drainQueue();
});

// ---------- Web Push handler ----------
// Server posts { title, body, url, tag, icon } as the JSON payload.
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let payload = {};
  try { payload = e.data.json(); } catch { payload = { title: "shyftforce", body: e.data.text() }; }

  const options = {
    body:  payload.body || "",
    icon:  payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag:   payload.tag,                    // dedupes successive notifications
    data:  { url: payload.url || "/dashboard" },
    requireInteraction: false,
  };
  e.waitUntil(self.registration.showNotification(payload.title || "shyftforce", options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/dashboard";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // If a window is already open at the target URL, focus it.
    for (const c of all) {
      if (c.url.includes(url) && "focus" in c) return c.focus();
    }
    // Otherwise open a new one.
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
