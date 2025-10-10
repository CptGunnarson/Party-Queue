// --- Offline-Support für Spotify Party Queue ---
const CACHE_NAME = "party-queue-v1";
const FILES_TO_CACHE = ["/", "/index.html", "/guest", "/style.css"];

// Beim Installieren App-Dateien cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Dateien werden gecacht…");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Bei Aktivierung alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Netzwerk-Anfragen abfangen
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
