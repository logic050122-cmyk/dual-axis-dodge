import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extraHarness} from './helpers/extra-harness.mjs';
const h=extraHarness(),rules=h.module.rules;
let seed=17;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
for(const mode of ['easy','challenge'])for(let round=1;round<=1000;round++){
  const board=rules.oddBoard(round,mode,rng),normal=board.cells[(board.target+1)%board.cells.length].shape;
  assert.ok(board.side>=3&&board.side<=4);assert.equal(board.cells.length,board.side**2);
  assert.equal(board.cells.filter(cell=>cell.shape!==normal).length,1);
  assert.notEqual(board.cells[board.target].shape,normal);
}
for(const blocked of [false,true]){
  const x=extraHarness({blocked,seed:{'reaction:easy':'220'}});x.api.start('odd');
  x.advance(300000);assert.equal(x.api.state().phase,'playing','Easy mode must be untimed');
  x.api.tapOdd((x.api.state().board.target+1)%9);assert.equal(x.api.state().mistakes,1);
  x.api.tapOdd(x.api.state().board.target);assert.equal(x.api.state().correct,0,'Feedback must block duplicate clicks');x.advance(250);
  for(let i=0;i<10;i++){x.api.tapOdd(x.api.state().board.target);x.advance(420)}
  assert.equal(x.api.state().phase,'over');assert.equal(x.api.state().score,990);assert.equal(x.api.best('odd'),990);
  if(!blocked)assert.equal(x.storage.get('reaction:easy'),'220');
}
{
  const x=extraHarness();x.mode('challenge');x.api.start('odd');x.advance(10000);x.api.pause();
  const remaining=x.api.state().remaining;x.advance(100000);assert.equal(x.api.state().phase,'paused');
  x.api.resume();assert.ok(x.api.state().deadline-x.clock()===remaining);
  x.advance(remaining+100);assert.equal(x.api.state().phase,'over');
  assert.equal(x.api.best('odd','easy'),0);
}
for(const action of ['pause','restart','stop']){
  const x=extraHarness();x.api.start('odd');x.api.tapOdd(x.api.state().board.target);
  const stale=[...x.tasks.values()].map(task=>task.fn);
  if(action==='pause')x.api.pause();if(action==='restart')x.api.start('odd');if(action==='stop')x.api.stop();
  for(const fn of stale)fn();
  if(action==='pause'){assert.equal(x.api.state().phase,'paused');x.api.resume();assert.equal(x.api.state().correct,1)}
  if(action==='restart')assert.equal(x.api.state().correct,0);
  if(action==='stop')assert.equal(x.api.state(),null);
}
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/data-open="odd"/);assert.match(html,/src="\.\/arcade-games.js"/);
assert.match(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/\.\/arcade-games\.js/);
console.log('Extra games regression passed: 2000 odd-board fairness samples, modes, score, pause, stale callbacks and storage');
