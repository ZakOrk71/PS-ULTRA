// Service Worker PS ULTRA — v3
// Offline intelligent + auto-nettoyage des vieux caches
const CACHE = "ps-ultra-v3";

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
  const url = e.request.url;
  const isCDN = url.includes("unpkg.com");
  const isData = url.includes("/data/") && url.endsWith(".json");
  // app.js arrive avec ?v=timestamp → on le traite en network-first
  const isCode = url.includes("app.js") || url.endsWith("index.html") || url.endsWith("/");

  if (isCDN) {
    // React : cache-first (jamais modifié)
    e.respondWith(
      caches.match(e.request).then((c) =>
        c || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cc) => cc.put(e.request, copy));
          return res;
        })
      )
    );
  } else if (isData || isCode) {
    // Code + données : NETWORK-FIRST (toujours frais si online, cache si offline)
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cc) => cc.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match("./app.js")))
    );
  } else {
    // Reste : cache-first basique
    e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
  }
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
