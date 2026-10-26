/* Incrementar VERSION cuando cambien los archivos de la aplicación. */
const VERSION = 'mi-hielo-shell-v4';
const FILES = ['./', './index.html', './styles.css', './core.js', './pdf.js', './vendor/jspdf.umd.min.js', './app.js', './manifest.webmanifest', './icons/icon.svg', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mi-hielo-shell-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // Only cache the app shell. Orders live in localStorage, never in the network cache.
  event.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch:true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    }
  }));
});
