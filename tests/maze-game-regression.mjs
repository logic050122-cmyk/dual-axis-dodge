import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
const {rules}=extraHarness().module;
let seed=203;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
const directions=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
for(const mode of ['easy','challenge'])for(let sample=0;sample<1000;sample++){
  const maze=rules.mazePuzzle(mode,sample===0?()=>0:sample===1?()=>1:rng),{size,cells}=maze;
  assert.equal(size,mode==='easy'?5:7);const seen=new Set([0]),queue=[0];let passages=0;
  for(let cell=0;cell<cells.length;cell++)for(const [dx,dy,wall,opposite] of directions){
    const x=cell%size+dx,y=Math.floor(cell/size)+dy;
    if(x<0||y<0||x>=size||y>=size){assert.ok(cells[cell]&wall,'Outer boundary cannot leak');continue}
    const next=y*size+x;assert.equal(!!(cells[cell]&wall),!!(cells[next]&opposite),'Walls must agree from both sides');
    if(!(cells[cell]&wall))passages++;
  }
  for(let at=0;at<queue.length;at++)for(const [dx,dy,wall] of directions){
    const cell=queue[at];if(cells[cell]&wall)continue;
    const next=cell+dy*size+dx;if(!seen.has(next)){seen.add(next);queue.push(next)}
  }
  assert.equal(seen.size,cells.length);assert.equal(passages/2,cells.length-1,'Maze must be a connected tree');
  assert.equal(maze.solution[0],0);assert.equal(maze.solution.at(-1),cells.length-1);
  for(let i=1;i<maze.solution.length;i++)assert.ok([0,1,2,3].some(dir=>rules.mazeMove(maze,maze.solution[i-1],dir)===maze.solution[i]));
}
for(const mode of ['easy','challenge']){
  const h=extraHarness();h.mode(mode);h.api.start('maze');h.advance(300000);
  const maze=h.api.state().puzzle,serialized=JSON.stringify(maze.cells);
  h.api.mazeStep(0);h.api.mazeStep(3);assert.equal(h.api.state().moves,0);
  const path=[...maze.solution],direction=(a,b)=>[0,1,2,3].find(dir=>rules.mazeMove(maze,a,dir)===b);
  h.api.mazeStep(direction(path[0],path[1]));assert.equal(h.api.state().moves,1);
  h.api.resetLevel();assert.equal(h.api.state().position,0);assert.equal(h.api.state().moves,0);assert.equal(JSON.stringify(h.api.state().puzzle.cells),serialized);
  h.api.pause();h.api.mazeStep(direction(path[0],path[1]));assert.equal(h.api.state().position,0);h.api.resume();
  for(let i=1;i<path.length;i++)h.api.mazeStep(direction(path[i-1],path[i]));
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.state().score,1000);assert.equal(h.api.best('maze'),1000);
}
{
  const h=extraHarness();h.api.start('maze');const board=h.$('mazeBoard');
  board.emit('pointerdown',{pointerId:7,button:0,clientX:100,clientY:100});
  board.emit('pointerdown',{pointerId:8,button:0,clientX:100,clientY:100});assert.equal(h.api.state().owner,7);
  const dir=[0,1,2,3].find(d=>rules.mazeMove(h.api.state().puzzle,0,d)!==0),[dx,dy]=directions[dir];
  board.emit('pointermove',{pointerId:7,clientX:100+dx*30,clientY:100+dy*30});assert.equal(h.api.state().moves,1);
  h.api.pause();assert.equal(h.api.state().owner,null);assert.equal(board.pointerId,null);
  h.api.resume();h.api.key({key:'ArrowUp',preventDefault(){}});h.api.stop();assert.equal(h.api.state(),null);
}
for(const mode of ['easy','challenge']){
  const h=extraHarness();h.mode(mode);h.api.start('maze');
  const start=h.api.state().position;h.$('extraHint').click();
  assert.equal(h.api.state().position,start);assert.equal(h.api.state().moves,0);assert.equal(h.api.state().hints,1);
  assert.ok(rules.mazePath(h.api.state().puzzle,start).includes(h.api.state().hint));
  h.api.pause();h.api.hintMaze();assert.equal(h.api.state().hints,1);h.api.resume();
  h.api.resetLevel();assert.equal(h.api.state().hint,null);assert.equal(h.api.state().hints,1);
  for(let guard=0;guard<50&&h.api.state().phase==='playing';guard++){
    h.api.hintMaze();const {puzzle,position,hint}=h.api.state();
    const dir=[0,1,2,3].find(d=>rules.mazeMove(puzzle,position,d)===hint);assert.notEqual(dir,undefined);
    h.api.mazeStep(dir);
  }
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.state().score,1000);
  assert.ok(h.$('extraResult').innerHTML.includes('使用提示'));
}
{
  const h=extraHarness();h.api.render('maze');h.$('extraStart').click();
  const first=h.api.state().puzzle,serialized=JSON.stringify(first.cells),path=[...first.solution];
  const direction=(a,b)=>[0,1,2,3].find(dir=>rules.mazeMove(first,a,dir)===b);
  h.api.mazeStep(direction(path[0],path[1]));h.api.mazeStep(direction(path[1],path[0]));
  for(let i=1;i<path.length;i++)h.api.mazeStep(direction(path[i-1],path[i]));
  assert.equal(h.api.state().attempts,1);assert.equal(h.api.state().bestExtra,2);
  assert.match(h.$('extraResult').innerHTML,/多走 2 步 · 本图最佳 \+2 步/);
  assert.equal(h.$('extraStart').textContent,'再走同一图');assert.ok(h.$('mazeNew'));
  h.$('extraStart').click();
  assert.equal(JSON.stringify(h.api.state().puzzle.cells),serialized,'Same-maze retry must preserve the layout');
  assert.equal(h.api.state().attempts,1);assert.equal(h.api.state().bestExtra,2);assert.equal(h.api.state().moves,0);assert.equal(h.api.state().hints,0);
  for(let i=1;i<path.length;i++)h.api.mazeStep(direction(path[i-1],path[i]));
  assert.equal(h.api.state().attempts,2);assert.equal(h.api.state().bestExtra,0);
  assert.match(h.$('extraResult').innerHTML,/第 2 次到达.*多走 0 步 · 本图最佳 \+0 步/);
  const mastered=h.api.state().puzzle;h.$('mazeNew').click();
  assert.notEqual(h.api.state().puzzle,mastered,'New maze must not reuse the previous puzzle object');
  assert.equal(h.api.state().attempts,0);assert.equal(h.api.state().bestExtra,null);
}
console.log('Maze game regression passed: 2000 connected trees, shortest-path hints, same-map mastery replay, detour review, reset and touch ownership');
