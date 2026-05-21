// Service Worker PS ULTRA — mode hors-ligne
const CACHE = "ps-ultra-v1";

// Fichiers à mettre en cache pour l'offline
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

// Installation : précache tout
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll échoue si UN fichier manque ; on ajoute un par un pour être tolérant
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// Activation : nettoie les vieux caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch :
//  - data/*.json → réseau d'abord (pour avoir les MAJ), cache en secours
//  - le reste → cache d'abord (rapide + offline), réseau en secours
self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  const isData = url.includes("/data/") && url.endsWith(".json");

  if (isData) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
      )
    );
  }
});
