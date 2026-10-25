/* APP ATC · service worker: guarda la app en el dispositivo para que funcione sin conexión.
   Solo cachea los archivos de la propia app (nunca tus datos: esos están en IndexedDB y no salen del móvil).
   Al publicar una versión nueva cambia VERSION (lo hace build.py) y la app muestra «Actualizar». */
const VERSION = "atc-blq20261025";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./favicon-32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL.map(u => new Request(u, {cache: "reload"})))));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("atc-") && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => { if (event.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // nada externo
  if (req.mode === "navigate") {                              // la app se abre siempre desde la copia local
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match("./index.html")) || (await cache.match("./")) || fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, {ignoreSearch: true});
    if (hit) return hit;
    try { return await fetch(req); }
    catch (e) { return new Response("", {status: 504, statusText: "Sin conexión"}); }
  })());
});
