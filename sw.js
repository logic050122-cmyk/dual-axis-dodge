const CACHE = 'playdot-arcade-v9';
const CORE = ['./','./index.html','./manifest.webmanifest','./icon.svg','./arcade-games.js','./arcade-games.css',
  './games/dual-axis-dodge/','./games/dual-axis-dodge/index.html',
  './games/dual-axis-dodge/manifest.webmanifest','./games/dual-axis-dodge/icon.svg'];
const ROOT_PAGE = './index.html', DODGE_PAGE = './games/dual-axis-dodge/index.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
    (key.startsWith('playdot-arcade-') || key.startsWith('dual-axis-dodge-')) && key !== CACHE
  ).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    const isDodge = /\/games\/dual-axis-dodge\/(?:index\.html)?$/.test(url.pathname);
    const fallback = isDodge ? DODGE_PAGE : ROOT_PAGE;
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(fallback, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(fallback).then(response => response || caches.match('./'))));
    return;
  }
  if(/\.(?:js|css)$/.test(url.pathname)){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}
      return response;
    }).catch(()=>caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
    }
    return response;
  })));
});
