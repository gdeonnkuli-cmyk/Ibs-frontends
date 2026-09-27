// IBS_sw.js — Service worker minimal.
// Met en cache le shell de l'app pour un chargement plus rapide et une tolérance aux coupures réseau.
// Les appels à l'API restent toujours en direct (jamais mis en cache) : on ne veut jamais
// afficher de fausses offres ou de faux statuts de contrat par erreur.
const CACHE_NAME = "ibs-shell-v3";
const SHELL_FILES = ["./index.html", "./IBS_App_Live.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jamais de cache pour les appels API : toujours des données fraîches.
  if (url.pathname.startsWith("/api/") || url.hostname.includes("railway.app")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
