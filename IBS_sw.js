// IBS_sw.js — Service worker minimal.
// Met en cache le shell de l'app pour un chargement plus rapide et une tolérance aux coupures réseau.
// Les appels à l'API restent toujours en direct (jamais mis en cache) : on ne veut jamais
// afficher de fausses offres ou de faux statuts de contrat par erreur.
const CACHE_NAME = "ibs-shell-v16";
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

  // Le document de l'app passe par le réseau d'abord.
  //
  // En servant le cache en priorité, une version déployée n'atteignait les
  // téléphones qu'au renouvellement du service worker par le navigateur —
  // des heures plus tard, parfois jamais tant que l'app restait ouverte.
  // Changer le nom du cache n'y suffisait pas : la page servie depuis le
  // cache ne provoquait pas la mise à jour.
  //
  // Le réseau d'abord coûte une requête au démarrage ; le cache reste le
  // filet pour les coupures, fréquentes sur un réseau mobile kinois.
  const estDocument = event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") || url.pathname.endsWith("/");

  if (estDocument) {
    event.respondWith(
      fetch(event.request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copie)).catch(() => {});
          return reponse;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("./IBS_App_Live.html")))
    );
    return;
  }

  // Icônes, manifeste : le cache d'abord, ils ne changent pas.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
