// Service Worker PS ULTRA — v4
// Offline robuste : ignore les query strings (?v=timestamp) pour le cache
const CACHE = "ps-ultra-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./data/aliments.json",
  "./data/seances.json",
  "./data/recettes.json",
  "./data/courses.json",
  "https://unpkg.com/react@18.2.0/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js",
];

// Normalise une requête : enlève le ?v=... pour matcher le cache
function cacheKey(request) {
  const url = new URL(request.url);
  url.search = "";  // retire ?v=timestamp
  return url.toString();
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = req.url;
  const isCDN = url.includes("unpkg.com");
  const key = cacheKey(req);  // clé sans ?v=

  if (isCDN) {
    // React : cache-first
    e.respondWith(
      caches.match(req).then((c) =>
        c || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cc) => cc.put(req, copy));
          return res;
        })
      )
    );
    return;
  }

  // Code + données : network-first, fallback cache (en ignorant ?v=)
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Met en cache sous la clé normalisée (sans ?v=)
        const copy = res.clone();
        caches.open(CACHE).then((cc) => cc.put(key, copy));
        return res;
      })
      .catch(() =>
        // Offline : cherche dans le cache avec la clé normalisée
        caches.match(key).then((c) => c || caches.match(req))
      )
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
