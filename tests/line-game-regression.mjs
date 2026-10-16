import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
const {rules}=extraHarness().module;
for(let level=0;level<6;level++){
  const puzzle=rules.linePuzzle(level),used=new Set(),path=[];
  for(const node of puzzle.solution){assert.ok(rules.lineAllowed(puzzle,path,node));path.push(node)}
  for(const [a,b] of puzzle.edges){assert.notEqual(a,b);const key=rules.edgeKey(a,b);assert.ok(!used.has(key));used.add(key)}
  assert.equal(used.size,path.length-1);assert.ok(puzzle.nodes.every(([x,y])=>x>=10&&x<=90&&y>=10&&y<=90));
  assert.equal(rules.lineAllowed(puzzle,path,puzzle.solution.at(-2)),false,'Used edges cannot be retraced');
  const again=rules.linePuzzle(level);puzzle.nodes[0][0]=-99;assert.ok(again.nodes[0][0]>0,'Levels must not mutate their template');
}
for(const choice of ['easy','challenge']){
  const h=extraHarness();h.mode(choice);h.api.start('line');h.advance(300000);
  for(let level=0;level<(choice==='easy'?4:6);level++){
    const solution=[...h.api.state().puzzle.solution];
    h.api.lineNode((solution[0]+1)%h.api.state().puzzle.nodes.length);assert.equal(h.api.state().path.length,0);
    h.api.lineNode(solution[0]);h.api.lineNode(solution[1]);h.api.lineUndo();assert.equal(h.api.state().path.length,1);
    for(const node of solution.slice(1))h.api.lineNode(node);
    assert.equal(h.api.state().score,level+1);
    if(level+1<(choice==='easy'?4:6)){assert.equal(h.api.state().phase,'complete');h.$('extraNext').click()}
  }
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.best('line'),choice==='easy'?4:6);
}
{
  const h=extraHarness();h.api.render('line');
  assert.equal(h.$('lineStartLevel').value,'1');
  assert.match(h.$('lineUnlockNote').textContent,/已解锁 1 \/ 4 关/);
  h.$('lineStartLevel').value='4';h.$('extraStart').click();
  assert.equal(h.api.state().level,0,'Locked levels cannot be selected by changing the DOM value');
}
{
  const h=extraHarness({seed:{'line:challenge':'4'}});h.mode('challenge');h.api.render('line');
  assert.match(h.$('lineStartLevel').innerHTML,/第 5 关 · 多分支路线/);
  assert.doesNotMatch(h.$('lineStartLevel').innerHTML,/第 6 关 · 九点路线/);
  h.$('lineStartLevel').value='5';h.$('extraStart').click();
  assert.equal(h.api.state().level,4);assert.equal(h.api.state().startLevel,4);
  for(let level=4;level<6;level++){
    for(const node of h.api.state().puzzle.solution)h.api.lineNode(node);
    if(level===4)h.$('extraNext').click();
  }
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.best('line'),6);
  assert.match(h.$('extraResult').innerHTML,/从第 5 关练到第 6 关/);
  assert.match(h.$('lineStartLevel').innerHTML,/第 6 关 · 九点路线/);
}
{
  const h=extraHarness({blocked:true});h.api.render('line');h.$('extraStart').click();
  for(const node of h.api.state().puzzle.solution)h.api.lineNode(node);
  assert.equal(h.api.best('line'),1);h.$('lineStartLevel').value='2';h.$('extraStart').click();
  assert.equal(h.api.state().level,1,'Session best should unlock targeted practice when storage is blocked');
}
{
  const h=extraHarness();h.api.start('line');const board=h.$('lineBoard');
  board.emit('pointerdown',{pointerId:1,button:0,target:board.querySelectorAll('[data-line-node]')[0]});
  assert.equal(h.api.state().owner,1);
  board.emit('pointerdown',{pointerId:2,button:0,target:board.querySelectorAll('[data-line-node]')[1]});assert.equal(h.api.state().owner,1);
  const [x,y]=h.api.state().puzzle.nodes[1];board.emit('pointermove',{pointerId:1,clientX:x*3.4,clientY:y*3.4});
  assert.equal(h.api.state().path.length,2);h.api.pause();assert.equal(h.api.state().owner,null);
  h.api.lineNode(2);assert.equal(h.api.state().path.length,2);h.api.resume();h.api.lineNode(2);assert.equal(h.api.state().path.length,3);
  h.api.stop();assert.equal(h.api.state(),null);
}
{
  const h=extraHarness();h.api.start('line');const board=h.$('lineBoard');
  board.emit('pointerdown',{pointerId:5,button:0,clientX:68,clientY:272,target:board.querySelectorAll('[data-line-node]')[0]});
  board.emit('pointermove',{pointerId:5,clientX:187,clientY:34});
  assert.deepEqual([...h.api.state().path],[0,1],'Fast swipes crossing a node must count even if no sample ends inside it');
}
{
  const h=extraHarness();h.api.start('line');const board=h.$('lineBoard');
  board.emit('pointerdown',{pointerId:6,button:0,clientX:68,clientY:272,target:board.querySelectorAll('[data-line-node]')[0]});
  board.emit('pointermove',{pointerId:6,clientX:68,clientY:272,getCoalescedEvents:()=>[{clientX:170,clientY:68},{clientX:272,clientY:272}]});
  assert.deepEqual([...h.api.state().path],[0,1,2,0]);assert.equal(h.api.state().phase,'complete');assert.equal(h.api.state().owner,null);
}
for(let level=0;level<6;level++){
  const puzzle=rules.linePuzzle(level);
  for(let prefix=0;prefix<puzzle.solution.length;prefix++){
    const path=puzzle.solution.slice(0,prefix),tail=rules.lineContinuation(puzzle,path);
    assert.ok(tail);for(const next of tail){assert.ok(rules.lineAllowed(puzzle,path,next));path.push(next)}
    assert.equal(path.length-1,puzzle.edges.length);
  }
}
assert.equal(rules.lineContinuation({solution:[0,1,2,0,3],edges:[[0,1],[1,2],[2,0],[0,3]]},[0,3]),null,'Hint must detect a dead end, not suggest an impossible edge');
assert.equal(rules.segmentEntry([0,0],[100,0],[50,0],10),.4);
assert.equal(rules.segmentEntry([0,0],[100,0],[50,20],10),null);
assert.equal(rules.segmentEntry([0,0],[0,0],[50,0],10),null);
assert.equal(rules.segmentEntry([0,0],[100,0],[0,0],10),0);
{
  const h=extraHarness();h.api.start('line');
  const board=h.$('lineBoard'),first=board.querySelectorAll('[data-line-node]')[0];
  h.$('extraHint').click();assert.equal(h.api.state().hint,0);assert.equal(h.api.state().path.length,0);
  assert.ok(first.classList.contains('hinted'));first.click(); // Delegation tested below in full lobby.
  h.api.lineNode(0);assert.equal(board.querySelectorAll('[data-line-node]')[0],first,'Keep keyboard focus targets alive');
  assert.equal(first.getAttribute('aria-current'),'true');h.api.hintLine();assert.ok(h.api.state().hint!==null);
  h.api.pause();const pathLength=h.api.state().path.length;h.api.hintLine();assert.equal(h.api.state().path.length,pathLength);
}
console.log('Line game regression passed: six Euler solutions, honest hints, swept/coalesced touch, undo, stable nodes and pointer ownership');
