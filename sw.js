/*
 * Service worker de Piano Estudio.
 *
 * Tres políticas, una por tipo de recurso:
 *
 *   assets/piano-samples/ y assets/vendor/  → cache-first, para siempre.
 *     Las muestras no cambian nunca: una vez en caché no se vuelven a pedir a
 *     la red. Es lo que hace que el piano real funcione offline, y la razón por
 *     la que las muestras están autohospedadas (un CDN cross-origin no es
 *     cacheable de forma útil desde acá).
 *
 *   /api/  → solo red, nunca caché.
 *     Son las sincronizaciones con Vercel Blob. Servir una respuesta vieja de
 *     caché haría que la app crea que guardó cuando no guardó.
 *
 *   resto same-origin  → network-first con fallback a caché.
 *     La app funciona offline después de la primera visita, pero una versión
 *     nueva del código nunca queda atascada detrás de la caché.
 */
const APP_CACHE = "piano-app-v1";
const SAMPLE_CACHE = "piano-samples-v1";
const APP_SHELL = ["./", "./index.html", "./assets/audio-engine.js"];

// Las muestras y el bundle vendorizado son inmutables: van a su propia caché,
// que sobrevive a cada actualización de la app.
const IMMUTABLE_PATHS = /\/assets\/(piano-samples|vendor)\//;

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {
        /* si un recurso del shell falla, el SW se instala igual y lo resuelve
           en la primera navegación */
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(name => name !== APP_CACHE && name !== SAMPLE_CACHE)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (IMMUTABLE_PATHS.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(SAMPLE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Navegación offline sin entrada exacta en caché: servimos el shell.
    if (request.mode === "navigate") {
      const shell = await cache.match("./index.html");
      if (shell) return shell;
    }
    throw error;
  }
}
