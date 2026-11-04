/* Minimal service worker: offline fallback page ONLY.
   Privacy rule (handbook §15.9): never cache API, auth, profile, photo or message responses. */
const CACHE = "rdp-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return; // everything else goes straight to the network, uncached
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
