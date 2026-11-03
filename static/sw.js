/* PRIVACIDAD 360 — Service worker: guarda la app en el dispositivo para que abra y funcione sin internet.
   · Archivos de la app: se responde del caché y se actualiza en segundo plano; la próxima apertura ya usa lo nuevo.
   · API (/api/…): nunca se guarda en caché. Sin conexión responde un error claro, sin inventar datos. */
const VERSION = 'p360-v1';
const ARCHIVOS = [
  '/', '/manifest.webmanifest',
  '/css/estilos.css', '/css/modos.css',
  '/js/i18n.js', '/js/idiomas/textos.js', '/js/idiomas/fr.js', '/js/idiomas/pt.js', '/js/datos.js', '/js/logica.js', '/js/juego.js',
  '/js/nucleo.js', '/js/salas.js', '/js/modos.js', '/js/escape.js', '/js/escuela.js', '/js/docente.js', '/js/app.js',
  '/datos/arena.json', '/datos/casos.json', '/datos/tienda.json', '/datos/escape.json', '/datos/cortafuegos.json', '/datos/colegio.json',
  '/fonts/fredoka-variable.woff2', '/fonts/nunito-variable.woff2', '/fonts/nunito-italic-variable.woff2',
  '/img/icono.svg', '/img/icono-192.png', '/img/icono-512.png', '/img/icono-maskable-512.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function actualizar(peticion, cache) {
  return fetch(peticion).then((r) => {
    if (r.ok) cache.put(peticion, r.clone());
    return r;
  });
}

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (url.origin !== location.origin || ev.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) {
    ev.respondWith(fetch(ev.request).catch(() => new Response(
      JSON.stringify({ error: 'Sin conexión con el servidor.', sinConexion: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }
  // Toda navegación abre la misma página: las secciones se resuelven con #/ruta.
  const clave = ev.request.mode === 'navigate' ? '/' : url.pathname;
  ev.respondWith(caches.open(VERSION).then(async (cache) => {
    const guardado = await cache.match(clave);
    const red = actualizar(ev.request.mode === 'navigate' ? '/' : ev.request, cache);
    if (guardado) {
      red.catch(() => {});
      return guardado;
    }
    return red;
  }));
});
