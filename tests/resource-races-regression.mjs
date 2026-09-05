import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Execute the shipped functions, with controllable platform promises. These tests
// exercise event ordering rather than duplicating the game's state machine.
const source = fs.readFileSync(process.env.GAME_SOURCE || new URL('../index.html', import.meta.url), 'utf8');
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing runtime section: ${start}`);
  return source.slice(from, to);
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function target() {
  const handlers = new Map();
  return {
    addEventListener(type, fn) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(fn);
    },
    emit(type, event) { for (const fn of handlers.get(type) || []) fn(event); },
    setAttribute() {},
    contains(node) { return node === this || node?.parent === this; },
  };
}
function audioHarness({ prefixed = false, unavailable = false } = {}) {
  const button = target(), document = { ...target(), hidden: false };
  const contexts = [], nodes = [], stored = new Map();
  const node = () => {
    const value = {
      gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      frequency: { value: 0 }, disconnected: false,
      connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop() {},
    };
    nodes.push(value);
    return value;
  };
  class AudioContext {
    constructor() {
      Object.assign(this, target());
      this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 44100;
      this.destination = {}; this.resumes = []; this.suspends = 0;
      contexts.push(this);
    }
    createGain() { return node(); }
    createOscillator() { return node(); }
    createBufferSource() { return node(); }
    createBuffer() { return {}; }
    createDynamicsCompressor() {
      return Object.assign(node(), Object.fromEntries(
        ['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, { value: 0 }])));
    }
    resume() {
      const request = deferred(); this.resumes.push(request);
      return request.promise.then(() => { this.state = 'running'; });
    }
    async suspend() { this.state = 'suspended'; this.suspends++; }
  }
  const window = { ...target() };
  if (!unavailable) window[prefixed ? 'webkitAudioContext' : 'AudioContext'] = AudioContext;
  const sandbox = vm.createContext({
    document, window, navigator: {}, audioBtn: button,
    storage: { get: (_, fallback) => fallback, set: (key, value) => stored.set(key, value) },
    setInterval: () => 1, clearInterval() {}, state: 'running', difficultyElapsed: () => 0,
  });
  vm.runInContext(section('  let audioCtx=', "  fullscreenBtn.addEventListener"), sandbox);
  const run = code => vm.runInContext(code, sandbox);
  const gesture = async (type, onButton) => {
    document.emit(type, { target: onButton ? button : {} });
    await flush();
  };
  const click = () => button.emit('click', { stopPropagation() {} });
  return { contexts, nodes, stored, document, button, run, gesture, click };
}

for (const type of ['pointerdown', 'touchstart', 'keydown']) {
  const h = audioHarness();
  await h.gesture(type, true);
  // A browser may finish capture-phase resume before dispatching click.
  const earlyContext = h.contexts[0];
  if (earlyContext) { earlyContext.resumes[0].resolve(); await flush(); }
  h.click();
  if (!earlyContext) h.contexts[0].resumes[0].resolve();
  await flush();
  assert.equal(h.run('audioOn'), true, `${type}: first click must enable sound, not mute it`);
  assert.equal(h.run('audioState()'), 'running');
  assert.equal(h.run('audioPrimed'), true);
  h.click(); await flush();
  assert.equal(h.run('audioOn'), false, 'next click must mute');
  assert.equal(h.stored.get('dualAxisAudio'), 'off');
  h.click(); h.contexts[0].resumes.at(-1).resolve(); await flush();
  assert.equal(h.run('audioState()'), 'running', 'sound can be re-enabled');
  assert.equal(h.stored.get('dualAxisAudio'), 'on');
}

{
  const h = audioHarness({ prefixed: true });
  await h.gesture('touchstart', false);
  h.contexts[0].resumes[0].reject(new Error('gesture required'));
  await flush();
  assert.equal(h.run('audioOn'), true, 'a rejected resume must allow a later retry');
  await h.gesture('touchstart', false);
  h.contexts[0].resumes[1].resolve(); await flush();
  assert.equal(h.run('audioState()'), 'running', 'Safari fallback recovers on the next gesture');
  for (const node of h.nodes.filter(node => node.onended)) node.onended();
  assert.ok(h.nodes.filter(node => node.onended).every(node => node.disconnected), 'priming nodes disconnect');
  h.run('playTone(440)');
  const [oscillator, gain] = h.nodes.slice(-2);
  oscillator.onended();
  assert.ok(oscillator.disconnected && gain.disconnected, 'finished tones disconnect both nodes');
}

for (const interruption of ['mute', 'hidden']) {
  const h = audioHarness();
  const pending = h.run('ensureAudio(true)');
  if (interruption === 'mute') h.run('audioOn=false');
  else h.document.hidden = true;
  h.contexts[0].resumes[0].resolve();
  assert.equal(await pending, false, `${interruption}: delayed audio resume must be discarded`);
  assert.equal(h.contexts[0].state, 'suspended');
  assert.equal(h.run('audioPrimed'), false);
}
{
  const h = audioHarness({ unavailable: true });
  assert.equal(await h.run('ensureAudio(true)'), false);
  const hidden = audioHarness(); hidden.document.hidden = true;
  assert.equal(await hidden.run('ensureAudio(true)'), false);
  assert.equal(hidden.contexts.length, 0, 'hidden pages must not create an audio context');
}

function wakeHarness() {
  const requests = [], document = { visibilityState: 'visible' };
  const sandbox = vm.createContext({
    document, state: 'running', wakeLock: null,
    navigator: { wakeLock: { request() { const r = deferred(); requests.push(r); return r.promise; } } },
  });
  const start = source.includes('  let wakeLockToken=') ? '  let wakeLockToken=' : '  async function acquireWakeLock()';
  vm.runInContext(section(start, '  function resetRound()'), sandbox);
  return { requests, document, run: code => vm.runInContext(code, sandbox) };
}
function sentinel({ rejectRelease = false } = {}) {
  return { ...target(), released: false, releases: 0,
    async release() {
      this.releases++;
      if (rejectRelease) throw new Error('platform release failed');
      this.released = true; this.emit('release');
    },
  };
}
{
  const h = wakeHarness();
  const first = h.run('acquireWakeLock()'); h.run('acquireWakeLock()');
  assert.equal(h.requests.length, 1, 'overlapping acquisition must share one pending request');
  h.run("state='paused';releaseWakeLock()");
  const old = sentinel(); h.requests[0].resolve(old); await first;
  assert.equal(old.releases, 1, 'a late lock must be released after pause');
  assert.equal(h.run('wakeLock'), null);
  await h.run('acquireWakeLock()');
  assert.equal(h.requests.length, 1, 'paused games must not request a new screen lock');
}
{
  const h = wakeHarness();
  const first = h.run('acquireWakeLock()'); h.run('releaseWakeLock()');
  const second = h.run('acquireWakeLock()');
  const current = sentinel(), old = sentinel();
  h.requests[1].resolve(current); await second;
  h.requests[0].resolve(old); await first;
  assert.equal(h.run('wakeLock'), current, 'a late old request must not replace the new lock');
  assert.equal(old.releases, 1);
  await current.release();
  assert.equal(h.run('wakeLock'), null, 'system release must clear the owned lock');
  const retry = h.run('acquireWakeLock()'); h.requests[2].reject(new Error('denied')); await retry;
  const recovered = h.run('acquireWakeLock()');
  const bad = sentinel({ rejectRelease: true }); h.requests[3].resolve(bad); await recovered;
  h.run('releaseWakeLock()'); await flush();
  assert.equal(bad.releases, 1, 'release rejection is handled without an unhandled promise');
  assert.equal(h.run('wakeLock'), null);
}
{
  const h = wakeHarness();
  const pending = h.run('acquireWakeLock()'); h.document.visibilityState = 'hidden';
  const lock = sentinel(); h.requests[0].resolve(lock); await pending;
  assert.equal(lock.releases, 1, 'backgrounding before completion must discard the lock');
}

console.log('resource races OK: sound-button events, delayed resume, Safari retry, audio cleanup, wake-lock ownership and rejection');
