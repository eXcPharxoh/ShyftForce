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
        body: JSON.stringify(item.payload),
      });
      if (r.ok) {
        const dx = await db();
        await new Promise((ok, no) => {
          const tx = dx.transaction("clockEvents", "readwrite");
          tx.objectStore("clockEvents").delete(item.id);
          tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error);
        });
      }
    } catch { /* still offline */ }
  }
}

self.addEventListener("sync", (e) => {
  if (e.tag === "drain-clock-queue") e.waitUntil(drainQueue());
});

// Allow page to ask us to drain manually
self.addEventListener("message", (e) => {
  if (e.data?.type === "drain-clock-queue") drainQueue();
});
