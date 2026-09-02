import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function requireSource(fragment, message) {
  assert.ok(source.includes(fragment), message);
}

// Backgrounding must never leave active input or timing state alive.
requireSource("window.addEventListener('pagehide',()=>{if(!interruptGame()){clearPointers();releaseWakeLock()}lastTime=performance.now()}", 'pagehide must pause/clear input, release wake lock, and reset frame timing');
requireSource("document.addEventListener('visibilitychange',()=>{", 'visibilitychange lifecycle handler is missing');
requireSource("if(document.hidden){", 'hidden-page lifecycle branch is missing');
requireSource("if(!interruptGame())releaseWakeLock()", 'hidden page must pause safely or at minimum release wake lock');
requireSource("lastTime=performance.now()", 'lifecycle transitions must reset frame timing to avoid resume jumps');

// Countdown interruption is a race-sensitive lifecycle invariant. Backgrounding during
// 3/2/1/GO must invalidate every already-scheduled callback before entering paused.
requireSource("function interruptGame(){", 'interruptGame lifecycle helper is missing');
requireSource("if(state!=='running'&&state!=='countdown')return false", 'only live running/countdown states may be interrupted');
requireSource("++countdownToken;state='paused';clearPointers();releaseWakeLock()", 'interrupting countdown must invalidate its token before pausing/clearing input');
requireSource("if(token!==countdownToken||state!=='countdown')return", 'countdown ticks must reject stale tokens or non-countdown state');
requireSource("if(token===countdownToken&&state==='countdown'){state='running'", 'delayed countdown completion must re-check token and state before running');

// Deterministic model of the real token/state contract: a stale timeout captured before
// backgrounding may fire later, but it must never resurrect gameplay.
{
  let state = 'countdown';
  let countdownToken = 7;
  const capturedToken = countdownToken;
  const interrupt = () => {
    if (state !== 'running' && state !== 'countdown') return false;
    ++countdownToken;
    state = 'paused';
    return true;
  };
  const delayedCompletion = token => {
    if (token === countdownToken && state === 'countdown') state = 'running';
  };

  assert.equal(interrupt(), true, 'active countdown must be interruptible');
  assert.equal(state, 'paused', 'background interruption must enter paused state');
  assert.equal(countdownToken, 8, 'background interruption must invalidate scheduled countdown callbacks');
  delayedCompletion(capturedToken);
  assert.equal(state, 'paused', 'stale countdown completion must not resurrect running state');
  assert.equal(interrupt(), false, 'already-paused state must not be interrupted twice');
}

// Foreground recovery should be best-effort: reacquire wake lock only for live play,
// and attempt audio recovery without making the game loop depend on success.
requireSource("if(state==='running'||state==='countdown')acquireWakeLock()", 'visible-page recovery must reacquire wake lock for active play');
requireSource("if(audioOn)recoverAudio()", 'visible-page recovery must attempt Web Audio recovery when enabled');
requireSource("function recoverAudio(){", 'audio recovery helper is missing');
requireSource("ensureAudio(false).then(ok=>{if(ok&&!musicTimer)startMusic()})", 'background recovery must be best-effort and restart music only after a running AudioContext');

// Web Audio must degrade safely and support prefixed Safari constructors.
requireSource("const AudioCtor=window.AudioContext||window.webkitAudioContext", 'Safari webkitAudioContext fallback is missing');
requireSource("if(!AudioCtor){audioOn=false;syncAudioButton();return false}", 'missing Web Audio must degrade without breaking gameplay');
requireSource("if(audioCtx.state!=='running')await audioCtx.resume()", 'suspended AudioContext must be resumed before use');
requireSource("catch{syncAudioButton();return false}", 'AudioContext resume failure must remain non-fatal');

// A visibility-triggered resume can be rejected by iOS autoplay policy. The next real
// user gesture must provide a separate unlock path that explicitly primes the output.
requireSource("const unlockAudio=()=>{if(audioOn)ensureAudio(true)}", 'real user gestures must unlock/prime audio after an autoplay-policy rejection');
requireSource("document.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true})", 'pointer gesture audio unlock hook is missing');
requireSource("document.addEventListener('touchstart',unlockAudio,{capture:true,passive:true})", 'touch gesture audio unlock hook is missing');
requireSource("document.addEventListener('keydown',unlockAudio,{capture:true,passive:true})", 'keyboard gesture audio unlock hook is missing');
requireSource("if(fromGesture)primeAudioOutput()", 'gesture unlock must prime audio output after resume');

// Music ticks themselves must refuse to run while hidden or while the context is not running.
requireSource("if(!audioOn||!audioCtx||audioCtx.state!=='running'||document.hidden)return", 'music scheduler must stay silent while hidden/suspended');

console.log('lifecycle/audio regression OK: background safety, countdown race, foreground recovery, Safari fallback, gesture unlock, non-fatal resume');
