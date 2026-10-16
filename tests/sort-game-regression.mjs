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
  if(sample<100){
    const shortest=rules.sortRoute(puzzle.tubes,puzzle.capacity),exact=puzzle.tubes.map(tube=>[...tube]);
    assert.ok(shortest?.length);assert.ok(shortest.length<=puzzle.solution.length,'Shortest route cannot exceed the stored generation route');
    for(const [from,to] of shortest){assert.ok(rules.sortAllowed(exact,from,to,puzzle.capacity));exact[to].push(exact[from].pop())}
    assert.ok(rules.sortSolved(exact,puzzle.capacity),'Computed shortest route must solve the puzzle');
  }
}
assert.equal(rules.sortAllowed([[0],[1]],0,1,3),false);assert.equal(rules.sortAllowed([[0],[]],0,0,3),false);
assert.equal(rules.sortAllowed([[0],[0,0,0]],0,1,3),false);assert.equal(rules.sortAllowed([[],[]],0,1,3),false);
for(const mode of ['easy','challenge']){
  const h=extraHarness({blocked:mode==='challenge'});h.mode(mode);h.api.start('sort');h.advance(300000);let totalTarget=0;
  for(let level=0;level<(mode==='easy'?3:4);level++){
    const initial=JSON.stringify(h.api.state().tubes),solution=rules.sortRoute(h.api.state().tubes,h.api.state().capacity);
    totalTarget+=solution.length;
    assert.equal(h.api.state().target,solution.length);assert.equal(h.$('extraHint').hidden,false);
    h.api.hintSort();assert.equal(JSON.stringify(h.api.state().tubes),initial,'Hint must not move a piece');
    assert.equal(JSON.stringify(h.api.state().hint),JSON.stringify(solution[0]));assert.equal(h.api.state().hints,1);
    const hinted=h.$('extraBoard').querySelectorAll('[data-tube]');
    assert.ok(hinted[solution[0][0]].classList.contains('hint-from'));assert.ok(hinted[solution[0][1]].classList.contains('hint-to'));
    const [from,to]=solution[0];h.api.sortTap(from);h.api.sortTap(to);assert.equal(h.api.state().history.length,1);
    h.api.sortUndo();assert.equal(JSON.stringify(h.api.state().tubes),initial);
    h.api.sortTap(from);h.api.sortTap(to);h.api.resetLevel();assert.equal(JSON.stringify(h.api.state().tubes),initial);
    assert.equal(h.api.state().hints,0);h.api.hintSort();assert.equal(h.api.state().hints,1);
    h.api.pause();h.api.sortTap(from);assert.equal(h.api.state().selected,null);h.api.resume();
    for(const [a,b] of solution){if(h.api.state().phase!=='playing')break;h.api.sortTap(a);h.api.sortTap(b)}
    assert.ok(rules.sortSolved(h.api.state().tubes,h.api.state().capacity));assert.equal(h.api.state().score,level+1);
    if(level===0){
      const [a,b]=solution.at(-1);h.api.sortUndo();assert.equal(h.api.state().totalTarget,0,'Undo before next level must not double-count the route');
      h.api.sortTap(a);h.api.sortTap(b);assert.equal(h.api.state().phase,'complete');
    }
    if(h.api.state().phase==='complete')h.$('extraNext').click();
  }
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.best('sort'),mode==='easy'?3:4);assert.equal(h.api.bestSortRoute(),0);
  assert.equal(h.api.state().totalTarget,totalTarget);
  assert.match(h.$('extraResult').innerHTML,/多走 0 步/);assert.match(h.$('extraResult').innerHTML,/使用提示 [34] 次/);
  if(mode==='easy')assert.equal(h.storage.get('sortRoute:easy'),'0');else assert.equal(h.storage.has('sortRoute:challenge'),false);
}
console.log('Sort game regression passed: 2000 reversible puzzles, 200 exact shortest routes, non-playing hints, route review, undo, reset, pause and progression');
