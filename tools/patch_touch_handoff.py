from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = """  const sideOwners={left:null,right:null};
  function clearPointers(){activePointers.clear();sideOwners.left=null;sideOwners.right=null}
  function claimPointer(id,side){if(sideOwners[side]!==null)return false;sideOwners[side]=id;activePointers.set(id,side);return true}
  function releasePointer(id){const side=activePointers.get(id);if(!side)return;activePointers.delete(id);if(sideOwners[side]===id)sideOwners[side]=null}"""
new = """  const sideOwners={left:null,right:null},pointerCandidates=new Map(),pointerPositions=new Map();
  function clearPointers(){activePointers.clear();pointerCandidates.clear();pointerPositions.clear();sideOwners.left=null;sideOwners.right=null}
  function trackPointer(id,side,p){pointerCandidates.set(id,side);pointerPositions.set(id,p);if(sideOwners[side]!==null)return false;sideOwners[side]=id;activePointers.set(id,side);return true}
  function updateTrackedPointer(id,p){const side=pointerCandidates.get(id);if(!side)return;pointerPositions.set(id,p);if(sideOwners[side]===id)applyPointer(side,p)}
  function promotePointer(side){if(sideOwners[side]!==null)return false;for(const [id,candidateSide] of pointerCandidates){if(candidateSide!==side)continue;sideOwners[side]=id;activePointers.set(id,side);const p=pointerPositions.get(id);if(p)applyPointer(side,p);return true}return false}
  function releasePointer(id){const side=pointerCandidates.get(id)||activePointers.get(id);if(!side)return;const wasOwner=sideOwners[side]===id;activePointers.delete(id);pointerCandidates.delete(id);pointerPositions.delete(id);if(wasOwner){sideOwners[side]=null;promotePointer(side)}}"""
if old not in s:
    raise SystemExit('ownership block not found')
s = s.replace(old, new, 1)

old = """    canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=localPoint(e),side=p.x<split?'left':'right';if(!claimPointer(e.pointerId,side))return;try{canvas.setPointerCapture(e.pointerId)}catch{}applyPointer(side,p);if(state==='running'||state==='countdown')ensureAudio()},{passive:false});
    canvas.addEventListener('pointermove',e=>{const side=activePointers.get(e.pointerId);if(!side)return;e.preventDefault();applyPointer(side,localPoint(e))},{passive:false});"""
new = """    canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=localPoint(e),side=p.x<split?'left':'right',becameOwner=trackPointer(e.pointerId,side,p);try{canvas.setPointerCapture(e.pointerId)}catch{}if(becameOwner)applyPointer(side,p);if(state==='running'||state==='countdown')ensureAudio()},{passive:false});
    canvas.addEventListener('pointermove',e=>{if(!pointerCandidates.has(e.pointerId))return;e.preventDefault();updateTrackedPointer(e.pointerId,localPoint(e))},{passive:false});"""
if old not in s:
    raise SystemExit('pointer event block not found')
s = s.replace(old, new, 1)

old = """    canvas.addEventListener('touchstart',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();for(const t of e.changedTouches){const p={x:t.clientX-r.left,y:t.clientY-r.top},side=p.x<split?'left':'right';if(claimPointer(t.identifier,side))applyPointer(side,p)}if(state==='running'||state==='countdown')ensureAudio()},{passive:false});
    canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();for(const t of e.changedTouches){const side=activePointers.get(t.identifier);if(side)applyPointer(side,{x:t.clientX-r.left,y:t.clientY-r.top})}},{passive:false});"""
new = """    canvas.addEventListener('touchstart',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();for(const t of e.changedTouches){const p={x:t.clientX-r.left,y:t.clientY-r.top},side=p.x<split?'left':'right';if(trackPointer(t.identifier,side,p))applyPointer(side,p)}if(state==='running'||state==='countdown')ensureAudio()},{passive:false});
    canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();for(const t of e.changedTouches){if(pointerCandidates.has(t.identifier))updateTrackedPointer(t.identifier,{x:t.clientX-r.left,y:t.clientY-r.top})}},{passive:false});"""
if old not in s:
    raise SystemExit('touch event block not found')
s = s.replace(old, new, 1)

# Expose candidate count for runtime diagnostics without depending on the exact existing health-field order.
s = s.replace("activePointers:activePointers.size", "activePointers:activePointers.size,touchCandidates:pointerCandidates.size", 1)
if 'touchCandidates:pointerCandidates.size' not in s:
    raise SystemExit('health field insertion failed')

p.write_text(s, encoding='utf-8')
print('patched touch handoff')
