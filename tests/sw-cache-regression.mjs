import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const handlers = {};
const data = new Map();
const scope = 'https://example.test/game/';
const key = item => new URL(typeof item === 'string' ? item : item.url, scope).href;
const cache = {
  async addAll(paths) { for (const path of paths) data.set(key(path), new Response('precache')); },
  async put(path, response) { data.set(key(path), response.clone()); }
};
const caches = {
  async open() { return cache; },
  async match(path) { return data.get(key(path))?.clone(); },
  async keys() { return []; },
  async delete() { return true; }
};
let network = async () => new Response('good page');
const self = {
  location: { origin: 'https://example.test' },
  addEventListener(type, fn) { handlers[type] = fn; },
  async skipWaiting() {},
  clients: { async claim() {} }
};
runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), {
  self, caches, fetch: request => network(request), URL
});

async function navigate(path) {
  let promise;
  handlers.fetch({
    request: { method: 'GET', mode: 'navigate', url: key(path) },
    respondWith(p) { promise = p; }
  });
  const response = await promise;
  await new Promise(resolve => setImmediate(resolve)); // Detached cache write
  return response;
}

await navigate('./');
assert.equal(await (await caches.match('./index.html')).text(), 'good page');
network = async () => new Response('not found', { status: 404 });
assert.equal((await navigate('./missing')).status, 404);
assert.equal(await (await caches.match('./index.html')).text(), 'good page', '404 must not overwrite offline shell');
network = async () => { throw new Error('offline'); };
assert.equal(await (await navigate('./')).text(), 'good page', 'offline must serve last good shell');

// Install must cover the whole shell under the repository's nested Pages scope.
let install;
handlers.install({waitUntil(p){install=p}});
await install;
for(const path of ['./','./index.html','./manifest.webmanifest','./icon.svg','./arcade-games.js','./arcade-games.css','./games/dual-axis-dodge/','./games/dual-axis-dodge/index.html','./games/dual-axis-dodge/manifest.webmanifest','./games/dual-axis-dodge/icon.svg']){
  assert.ok(await caches.match(path),`Missing precached resource ${path}`);
}
await cache.put('./index.html',new Response('lobby with sequence memory'));
await cache.put('./games/dual-axis-dodge/index.html',new Response('original dodge'));
for(const path of ['./','./index.html','./?game=sequence']){
  assert.equal(await (await navigate(path)).text(),'lobby with sequence memory');
}
for(const path of ['./games/dual-axis-dodge/','./games/dual-axis-dodge/index.html','./games/dual-axis-dodge/?mode=classic']){
  assert.equal(await (await navigate(path)).text(),'original dodge','Dodge must never fall back to lobby');
}
for(const asset of ['./arcade-games.js','./arcade-games.css']){
  let response;handlers.fetch({request:{method:'GET',mode:'cors',url:key(asset)},respondWith(p){response=p}});
  assert.equal(await (await response).text(),'precache','Scripts/styles must work offline');
}
console.log('Service worker cache regression: passed');
