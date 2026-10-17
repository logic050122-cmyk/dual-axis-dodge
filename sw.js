const CACHE = 'playdot-arcade-v36';
const CORE = ['./','./index.html','./manifest.webmanifest','./icon.svg','./arcade-games.js?v=35','./arcade-games.css',
  './games/dual-axis-dodge/','./games/dual-axis-dodge/index.html',
  './games/dual-axis-dodge/manifest.webmanifest','./games/dual-axis-dodge/icon.svg'];
const ROOT_PAGE = './index.html', DODGE_PAGE = './games/dual-axis-dodge/index.html';
function reply(event,makeResponse){
  const writes=[];
  const persist=(key,response)=>{
    if(!response?.ok)return;
    const copy=response.clone();
    writes.push(caches.open(CACHE).then(cache=>cache.put(key,copy)).catch(()=>{}));
  };
  const response=makeResponse(persist);
  // Register synchronously, and keep cache writes alive after delivering HTML.
  event.waitUntil(response.then(()=>Promise.all(writes)).catch(()=>{}));
  event.respondWith(response);
}
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
  const base=new URL('./',self.location.href).pathname;
  if(!url.pathname.startsWith(base))return;
  if (request.mode === 'navigate') {
    const dodge=base+'games/dual-axis-dodge';
    const isDodge=[dodge,dodge+'/',dodge+'/index.html'].includes(url.pathname);
    const isRoot=url.pathname===base||url.pathname===base+'index.html';
    // Other successful pages must never poison the canonical offline shells.
    const fallback=isDodge?DODGE_PAGE:isRoot?ROOT_PAGE:request;
    reply(event,persist=>fetch(request).then(response=>{
      persist(fallback,response);return response;
    }).catch(()=>caches.match(fallback).then(response=>response||caches.match(ROOT_PAGE))));
    return;
  }
  if(/\.(?:js|css)$/.test(url.pathname)){
    reply(event,persist=>fetch(request).then(response=>{
      persist(request,response);return response;
    }).catch(()=>caches.match(request)));
    return;
  }
  reply(event,persist=>caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    persist(request,response);return response;
  })));
});
