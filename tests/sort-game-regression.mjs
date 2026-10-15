import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
const {rules}=extraHarness().module;
let seed=93;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
for(const mode of ['easy','challenge'])for(let sample=0;sample<1000;sample++){
  const puzzle=rules.sortPuzzle(mode,sample===0?()=>0:sample===1?()=>1:rng),tubes=puzzle.tubes.map(tube=>[...tube]);
  assert.equal(rules.sortSolved(tubes,puzzle.capacity),false,'New puzzle must actually be mixed');
  const counts=new Map();for(const color of tubes.flat())counts.set(color,(counts.get(color)||0)+1);
  assert.equal(counts.size,mode==='easy'?3:4);assert.ok([...counts.values()].every(count=>count===puzzle.capacity));
  for(const [from,to] of puzzle.solution){assert.ok(rules.sortAllowed(tubes,from,to,puzzle.capacity));tubes[to].push(tubes[from].pop());assert.ok(tubes.every(t=>t.length<=puzzle.capacity))}
  assert.ok(rules.sortSolved(tubes,puzzle.capacity),'Stored reverse solution must solve the generated puzzle');
}
assert.equal(rules.sortAllowed([[0],[1]],0,1,3),false);assert.equal(rules.sortAllowed([[0],[]],0,0,3),false);
assert.equal(rules.sortAllowed([[0],[0,0,0]],0,1,3),false);assert.equal(rules.sortAllowed([[],[]],0,1,3),false);
for(const mode of ['easy','challenge']){
  const h=extraHarness({blocked:mode==='challenge'});h.mode(mode);h.api.start('sort');h.advance(300000);
  for(let level=0;level<(mode==='easy'?3:4);level++){
    const initial=JSON.stringify(h.api.state().tubes),solution=[...h.api.state().initial.solution];
    const [from,to]=solution[0];h.api.sortTap(from);h.api.sortTap(to);assert.equal(h.api.state().history.length,1);
    h.api.sortUndo();assert.equal(JSON.stringify(h.api.state().tubes),initial);
    h.api.sortTap(from);h.api.sortTap(to);h.api.resetLevel();assert.equal(JSON.stringify(h.api.state().tubes),initial);
    h.api.pause();h.api.sortTap(from);assert.equal(h.api.state().selected,null);h.api.resume();
    for(const [a,b] of solution){if(h.api.state().phase!=='playing')break;h.api.sortTap(a);h.api.sortTap(b)}
    assert.ok(rules.sortSolved(h.api.state().tubes,h.api.state().capacity));assert.equal(h.api.state().score,level+1);
    if(h.api.state().phase==='complete')h.$('extraNext').click();
  }
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.best('sort'),mode==='easy'?3:4);
}
console.log('Sort game regression passed: 2000 reversible solvable puzzles, quantities, legal moves, undo, reset, pause and progression');
