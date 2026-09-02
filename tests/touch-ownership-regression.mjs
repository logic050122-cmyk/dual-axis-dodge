import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function requireSource(fragment, message) {
  assert.ok(source.includes(fragment), message);
}

requireSource('touch-action:none;overscroll-behavior:none', 'page must suppress browser pan/zoom gesture takeover');
requireSource('#game{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}', 'canvas must keep touch-action:none');
requireSource('const sideOwners={left:null,right:null},pointerCandidates=new Map(),pointerPositions=new Map();', 'per-side ownership maps are missing');
requireSource("const side=pointerCandidates.get(id);if(!side)return;pointerPositions.set(id,p);if(sideOwners[side]===id)applyPointer(side,p)", 'pointer motion must use stored ownership instead of recalculating side after crossing the split');
requireSource('if(sideOwners[side]!==null)return false;sideOwners[side]=id;', 'a second finger must not steal an occupied side');
requireSource('if(wasOwner){sideOwners[side]=null;promotePointer(side)}', 'owner release must promote an eligible same-side candidate');
requireSource('canvas.setPointerCapture(e.pointerId)', 'pointer capture is required for drags that leave the canvas bounds');
requireSource("canvas.addEventListener('pointercancel',release)", 'pointercancel must release ownership');
requireSource("canvas.addEventListener('lostpointercapture',release)", 'lost pointer capture must release ownership');
requireSource('e.getCoalescedEvents?.()', 'coalesced pointer samples should be consumed when available');
requireSource("if('onpointerrawupdate'in window)canvas.addEventListener('pointerrawupdate'", 'pointerrawupdate fast path should remain capability-gated');
requireSource("canvas.addEventListener('touchstart'", 'Touch Events fallback start handler is missing');
requireSource("canvas.addEventListener('touchmove'", 'Touch Events fallback move handler is missing');
requireSource("canvas.addEventListener('touchend',release)", 'Touch Events fallback release handler is missing');
requireSource("canvas.addEventListener('touchcancel',release)", 'Touch Events fallback cancel handler is missing');

const sideOwners = { left: null, right: null };
const candidates = new Map();
const positions = new Map();
const applied = [];
function apply(side, p) { applied.push({ side, p: { ...p } }); }
function track(id, side, p) {
  candidates.set(id, side); positions.set(id, p);
  if (sideOwners[side] !== null) return false;
  sideOwners[side] = id; apply(side, p); return true;
}
function move(id, p) {
  const side = candidates.get(id); if (!side) return;
  positions.set(id, p); if (sideOwners[side] === id) apply(side, p);
}
function promote(side) {
  if (sideOwners[side] !== null) return false;
  for (const [id, candidateSide] of candidates) {
    if (candidateSide !== side) continue;
    sideOwners[side] = id;
    const p = positions.get(id); if (p) apply(side, p);
    return true;
  }
  return false;
}
function release(id) {
  const side = candidates.get(id); if (!side) return;
  const wasOwner = sideOwners[side] === id;
  candidates.delete(id); positions.delete(id);
  if (wasOwner) { sideOwners[side] = null; promote(side); }
}

assert.equal(track(1, 'left', { x: 100, y: 200 }), true);
assert.equal(track(2, 'right', { x: 700, y: 200 }), true);
assert.deepEqual(sideOwners, { left: 1, right: 2 }, 'two fingers must independently own opposite halves');
move(1, { x: 750, y: 210 });
assert.equal(candidates.get(1), 'left', 'cross-split drag must retain original side ownership');
assert.equal(applied.at(-1).side, 'left', 'cross-split drag must still drive the original role');
assert.equal(sideOwners.right, 2, 'cross-split drag must not steal the other side');
assert.equal(track(3, 'left', { x: 150, y: 260 }), false);
assert.equal(sideOwners.left, 1, 'same-side candidate must not steal ownership');
const beforeCandidateMove = applied.length;
move(3, { x: 180, y: 280 });
assert.equal(applied.length, beforeCandidateMove, 'non-owner movement must not control the role');
release(1);
assert.equal(sideOwners.left, 3, 'same-side candidate must be promoted after owner release');
assert.deepEqual(applied.at(-1), { side: 'left', p: { x: 180, y: 280 } }, 'promotion must apply the candidate latest position immediately');
assert.equal(sideOwners.right, 2, 'left promotion must not disturb the right owner');
release(2); release(3);
assert.deepEqual(sideOwners, { left: null, right: null }, 'all owners must clear after releases');
assert.equal(candidates.size, 0, 'all candidates must clear after releases');

console.log('touch ownership regression OK: dual-hand ownership, cross-split stability, candidate promotion, cancel/capture/raw/coalesced guards');
