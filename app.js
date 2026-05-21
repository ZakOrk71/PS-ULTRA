// Service Worker PS ULTRA — v2 (network-first pour le code, offline garanti)
const CACHE = "ps-ultra-v2";

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

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())   // active la nouvelle version tout de suite
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())  // prend le contrôle des pages ouvertes
  );
});

// Stratégie NETWORK-FIRST :
//  - Si online → on prend la version fraîche du réseau ET on met à jour le cache
//  - Si offline → on sert depuis le cache
// Les fichiers React du CDN restent en cache-first (ils ne changent jamais)
self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  const isCDN = url.includes("unpkg.com");

  if (isCDN) {
    // CDN : cache-first (jamais modifié)
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
      )
    );
    return;
  }

  // Tout le reste (app.js, index.html, data) : network-first
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Permet à la page de forcer l'activation immédiate
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
