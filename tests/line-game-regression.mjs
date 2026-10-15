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
  const h=extraHarness();h.api.start('line');const board=h.$('lineBoard');
  board.emit('pointerdown',{pointerId:1,button:0,target:board.querySelectorAll('[data-line-node]')[0]});
  assert.equal(h.api.state().owner,1);
  board.emit('pointerdown',{pointerId:2,button:0,target:board.querySelectorAll('[data-line-node]')[1]});assert.equal(h.api.state().owner,1);
  const [x,y]=h.api.state().puzzle.nodes[1];board.emit('pointermove',{pointerId:1,clientX:x*3.4,clientY:y*3.4});
  assert.equal(h.api.state().path.length,2);h.api.pause();assert.equal(h.api.state().owner,null);
  h.api.lineNode(2);assert.equal(h.api.state().path.length,2);h.api.resume();h.api.lineNode(2);assert.equal(h.api.state().path.length,3);
  h.api.stop();assert.equal(h.api.state(),null);
}
console.log('Line game regression passed: all six Euler solutions, edge reuse, undo, untimed modes, progression and independent pointer ownership');
