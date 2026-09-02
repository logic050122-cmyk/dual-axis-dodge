import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function requireSource(fragment, message) {
  assert.ok(source.includes(fragment), message);
}

// Structural guards: keyboard input must be state-driven, not OS key-repeat driven.
requireSource("const keyboardHeld=new Set()", 'keyboard held-state set is missing');
requireSource("keyboardHeld.add(e.code)", 'keydown must only register held state');
requireSource("keyboardHeld.delete(e.code)", 'keyup must release held state');
requireSource("window.addEventListener('blur',()=>keyboardHeld.clear()", 'blur must clear held keys');
requireSource("keyboardHeld.clear()", 'input reset must clear held keys');
requireSource("keyboardHorizontalSpeed()*dt", 'horizontal keyboard motion must be dt-driven');
requireSource("keyboardVerticalSpeed()*dt", 'vertical keyboard motion must be dt-driven');
requireSource("Math.hypot(nextLX-prevLX,nextLY-prevLY)", 'collision substeps must account for 2D player motion');
requireSource("Math.hypot(nextRX-prevRX,nextRY-prevRY)", 'collision substeps must account for the second player motion');

// Guard against the old failure mode: fixed target increments in keydown handlers.
const keydownHandler = source.match(/window\.addEventListener\('keydown',[\s\S]*?\},\{passive:false\}\);/)?.[0] ?? '';
assert.ok(keydownHandler, 'keydown handler not found');
assert.ok(!/target[XY]\s*[+\-]=/.test(keydownHandler), 'keydown must not increment target positions');
assert.ok(!/e\.repeat/.test(keydownHandler), 'movement must not depend on KeyboardEvent.repeat');

function axis(held, neg, pos) {
  return (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);
}

function simulate({ hz, seconds = 0.5, speed = 800, held = new Set(['KeyD']) }) {
  const dt = 1 / hz;
  const frames = Math.round(seconds * hz);
  let x = 0;
  for (let i = 0; i < frames; i++) x += axis(held, 'KeyA', 'KeyD') * speed * dt;
  return x;
}

const rates = [30, 60, 90, 120, 144];
const expected = 400;
for (const hz of rates) {
  const distance = simulate({ hz });
  assert.ok(Math.abs(distance - expected) < 1e-9, `${hz}Hz drifted: ${distance} vs ${expected}`);
}

// Opposite keys cancel deterministically.
for (const hz of rates) {
  const distance = simulate({ hz, held: new Set(['KeyA', 'KeyD']) });
  assert.equal(distance, 0, `${hz}Hz opposite horizontal keys must cancel`);
}

// Simultaneous horizontal + vertical input should progress independently.
function simulateDual(hz, seconds = 0.5, sx = 800, sy = 640) {
  const dt = 1 / hz;
  const frames = Math.round(seconds * hz);
  const held = new Set(['KeyD', 'KeyS']);
  let x = 0, y = 0;
  for (let i = 0; i < frames; i++) {
    x += axis(held, 'KeyA', 'KeyD') * sx * dt;
    y += axis(held, 'KeyW', 'KeyS') * sy * dt;
  }
  return { x, y };
}
for (const hz of rates) {
  const { x, y } = simulateDual(hz);
  assert.ok(Math.abs(x - 400) < 1e-9, `${hz}Hz simultaneous horizontal input drifted`);
  assert.ok(Math.abs(y - 320) < 1e-9, `${hz}Hz simultaneous vertical input drifted`);
}

// Keyup must stop motion immediately on the next update.
{
  const held = new Set(['KeyD']);
  let x = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 10; i++) x += axis(held, 'KeyA', 'KeyD') * 800 * dt;
  held.delete('KeyD');
  const releasedAt = x;
  for (let i = 0; i < 10; i++) x += axis(held, 'KeyA', 'KeyD') * 800 * dt;
  assert.equal(x, releasedAt, 'keyup must stop movement without repeat-tail');
}

// Layout swap: axis-locked controls remain role-based, not physical-side based.
requireSource("keyboardAxis('KeyA','ArrowLeft','KeyD','ArrowRight')", 'A/D and arrows must control the horizontal role');
requireSource("keyboardAxis('KeyW','ArrowUp','KeyS','ArrowDown')", 'W/S and arrows must control the vertical role');
requireSource("function toggleSwap(){if(state==='running'||state==='countdown')interruptGame();setSwap(!swapped)}", 'swap must interrupt/clear live input before remapping');

console.log(`input regression OK: ${rates.join('/')}Hz, dual-axis, opposing keys, keyup, blur/reset, swap guards`);
