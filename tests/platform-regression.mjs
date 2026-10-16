import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {lobbyHarness} from './helpers/lobby-harness.mjs';
const names=['reaction','aim','memory','sequence','odd','line','pulse','sort','maze'];
const starts={reaction:'reactionStart',aim:'aimStart',memory:'memoryStart',sequence:'sequenceStart'};
const begin=(h,name)=>{h.api.openGame(name);h.$(starts[name]||'extraStart').click()};

for(const mode of ['easy','challenge']){
  const h=lobbyHarness();assert.equal(h.root.querySelectorAll('.game-card').length,10);
  h.api.setMode(mode);
  for(const name of names){
    begin(h,name);assert.equal(h.api.state().currentGame,name);
    h.doc.hidden=true;h.doc.emit('visibilitychange');h.doc.hidden=false;
    if(name==='sequence'){assert.equal(h.api.state().sequence.phase,'paused');h.$('sequencePause').click()}
    else if(h.api.extras.state()){assert.equal(h.api.extras.state().phase,'paused');h.$('extraPause').click()}
    else assert.ok(h.$(starts[name]),'Interrupted old game must return to a usable intro');
    h.win.emit('blur');
    if(name==='sequence')assert.equal(h.api.state().sequence.phase,'paused');
    else if(h.api.extras.state())assert.equal(h.api.extras.state().phase,'paused');
    h.$('backLobby').click();h.advance(0);assert.equal(h.api.state().currentGame,null);assert.equal(h.tasks.size,0);
    assert.equal(h.doc.activeElement.dataset.open,name,'Returning to lobby must restore the game card focus');
    begin(h,name);h.api.setMode(mode==='easy'?'challenge':'easy');assert.equal(h.api.extras.state(),null);
    assert.equal(h.tasks.size,0);assert.ok(h.$(starts[name]||'extraStart'));h.api.setMode(mode);h.api.showLobby();h.advance(0);
  }
  for(const button of h.root.querySelectorAll('[data-filter]')){
    assert.equal(button.hidden,false,'Every populated category must be discoverable');button.click();
    assert.ok(h.root.querySelectorAll('.game-card').some(card=>!card.hidden));
    for(const card of h.root.querySelectorAll('.game-card'))if(!card.hidden&&button.dataset.filter!=='all')assert.ok(card.dataset.categories.split(' ').includes(button.dataset.filter));
  }
}

// Exercise actual old-game DOM events, including bubbling and completion cards.
{
  const h=lobbyHarness();begin(h,'reaction');
  for(let round=0;round<4;round++){
    h.advance(3300);assert.equal(h.api.state().reaction.phase,'go');h.$('reactionPad').click();
    if(round<3)h.advance(1050);
  }
  assert.ok(h.storage.has('playdot:v1:reaction:easy'));assert.ok(h.$('gameScene').querySelector('.result-card'));
  begin(h,'aim');h.$('aimBoard').click();
  for(let i=0;i<10;i++){h.advance(100);h.$('aimTarget').click()}
  assert.equal(h.api.state().aim.attempts,11,'Target clicks must not bubble into blank-board misses');
  assert.ok(h.storage.has('playdot:v1:aim:easy'));assert.ok(h.$('gameScene').querySelector('.result-card'));
  begin(h,'memory');const pairs=new Map();h.api.state().memory.deck.forEach((card,i)=>{if(!pairs.has(card.pair))pairs.set(card.pair,[]);pairs.get(card.pair).push(i)});
  for(const indexes of pairs.values())for(const index of indexes)h.$('memoryBoard').children[index].click();
  assert.equal(h.api.state().memory.finished,true);assert.equal(h.storage.get('playdot:v1:memory:easy'),'6');
  h.doc.hidden=true;h.doc.emit('visibilitychange');h.doc.hidden=false;assert.ok(h.$('gameScene').querySelector('.result-card'),'Backgrounding a completed game should preserve its result');
  begin(h,'sequence');h.advance(2000);h.api.sequenceTap(h.api.state().sequence.items[0]);h.$('sequenceEnd').click();
  assert.equal(h.storage.get('playdot:v1:sequence:easy'),'1');
}

// Finish all added games through their REAL lobby controls; reload their records.
{
  const h=lobbyHarness({seed:{dualAxisBest:'31.25',dualAxisLevelBests:'{"free:1":22}'}});
  begin(h,'odd');for(let i=0;i<10;i++){const target=h.api.extras.state().board.target;h.$('extraBoard').querySelectorAll('[data-odd]')[target].click();h.advance(420)}
  assert.equal(h.storage.get('playdot:v1:odd:easy'),'1000');
  begin(h,'line');for(let level=0;level<4;level++){
    for(const node of [...h.api.extras.state().puzzle.solution])h.$('lineBoard').querySelectorAll('[data-line-node]')[node].click();
    if(level<3)h.$('extraNext').click();
  }
  assert.equal(h.storage.get('playdot:v1:line:easy'),'4');
  begin(h,'pulse');const timing=h.api.extras.state().timing;
  for(let i=0;i<timing.beats;i++){
    h.advance(h.api.extras.state().started+timing.lead+i*timing.interval-h.clock());
    h.$('pulseTap').emit('pointerdown');h.$('pulseTap').click();
    assert.equal(h.api.extras.state().hits,i+1,'Pointer + synthetic click must count once');
  }
  h.advance(timing.window+40);assert.equal(h.storage.get('playdot:v1:pulse:easy'),'1200');
  begin(h,'sort');for(let level=0;level<3;level++){
    for(const [from,to] of [...h.api.extras.state().initial.solution]){
      if(h.api.extras.state().phase!=='playing')break;
      h.$('extraBoard').querySelectorAll('[data-tube]')[from].click();h.$('extraBoard').querySelectorAll('[data-tube]')[to].click();
    }
    if(level<2)h.$('extraNext').click();
  }
  assert.equal(h.storage.get('playdot:v1:sort:easy'),'3');
  begin(h,'maze');const maze=h.api.extras.state().puzzle;
  for(let i=1;i<maze.solution.length;i++){
    const a=maze.solution[i-1],b=maze.solution[i],dir=b-a===1?1:b-a===-1?3:b>a?2:0;
    h.$('extraBoard').querySelectorAll('[data-maze-dir]').find(button=>Number(button.dataset.mazeDir)===dir).click();
  }
  assert.equal(h.storage.get('playdot:v1:maze:easy'),'1000');
  h.api.showLobby();h.advance(0);assert.equal(h.tasks.size,0);
  const reload=lobbyHarness({seed:Object.fromEntries(h.storage)}),records=reload.$('recordsList').textContent;
  for(const name of ['找出不同','一笔连线','节奏点击','颜色分类','迷你迷宫','双轴'])assert.ok(records.includes(name));
  assert.ok(records.includes('最佳绕路 +'),'颜色分类路线纪录 must appear in the lobby');
  assert.equal(reload.$('recentList').children.length,4);assert.equal(h.storage.get('dualAxisBest'),'31.25');
  reload.win.emit('load');assert.equal(reload.registered[0][0],'./sw.js');
}

// Reproduce the lifecycle holes: result/early reaction phases used to keep their
// next-round callbacks, and pagehide used to leave the old dialog empty.
for(const phase of ['early','result']){
  const h=lobbyHarness();begin(h,'reaction');
  if(phase==='result')h.advance(3300);h.$('reactionPad').click();assert.equal(h.api.state().reaction.phase,phase);
  const stale=[...h.tasks.values()].map(task=>task.fn);h.doc.hidden=true;h.doc.emit('visibilitychange');
  for(const fn of stale)fn();assert.equal(h.api.state().reaction,null);assert.equal(h.tasks.size,0);assert.ok(h.$('reactionStart'));
}
for(const name of ['reaction','aim','memory']){
  const h=lobbyHarness();begin(h,name);h.win.emit('pagehide');h.win.emit('pageshow');
  assert.ok(h.$(starts[name]),'History navigation must restore a usable intro');assert.equal(h.tasks.size,0);
}
{
  const h=lobbyHarness();h.api.openGame('memory');h.api.showLobby();h.api.openGame('maze');h.advance(0);
  assert.equal(h.$('gameDialog').open,true);assert.equal(h.api.state().currentGame,'maze','Queued close must not close a newer dialog');
}
{
  const h=lobbyHarness();begin(h,'line');
  const first=h.$('lineBoard').querySelectorAll('[data-line-node]')[0];first.focus();first.click();
  assert.equal(h.doc.activeElement,first);assert.equal(h.$('lineBoard').querySelectorAll('[data-line-node]')[0],first);
  h.$('extraHint').click();const hinted=h.api.extras.state().hint;
  assert.equal(h.doc.activeElement,h.$('lineBoard').querySelectorAll('[data-line-node]')[hinted]);
  assert.equal(h.api.extras.state().path.length,1,'Hints must never play the move for the player');
}
for(const blocked of [false,true]){
  const h=lobbyHarness({blocked,seed:{'playdot:v1:mode':'constructor','playdot:v1:recent':'not json'}});
  assert.equal(h.api.state().mode,'easy');for(const name of names){begin(h,name);h.api.showLobby();h.advance(0)}
}
{
  const h=lobbyHarness();begin(h,'sort');
  const [from,to]=h.api.extras.state().initial.solution[0],buttons=h.$('extraBoard').querySelectorAll('[data-tube]');
  buttons[from].focus();buttons[from].click();
  assert.equal(h.doc.activeElement,buttons[from]);assert.equal(buttons[from].getAttribute('aria-pressed'),'true');
  buttons[to].focus();buttons[to].click();
  assert.equal(h.doc.activeElement,buttons[to]);assert.equal(h.$('extraBoard').querySelectorAll('[data-tube]')[to],buttons[to]);
  assert.equal(buttons[to].querySelectorAll('.sort-piece').length,3);assert.equal(buttons[to].getAttribute('aria-pressed'),'false');
  h.api.extras.sortUndo();assert.equal(h.doc.activeElement,buttons[to]);
}
{
  const h=lobbyHarness();begin(h,'odd');
  for(let round=0;round<10;round++){
    const target=h.$('extraBoard').querySelectorAll('[data-odd]')[h.api.extras.state().board.target];
    target.focus();target.emit('click',{detail:0});h.advance(420);
    assert.equal(h.doc.activeElement,round===9?h.$('extraStart'):h.$('extraBoard').querySelectorAll('[data-odd]')[0]);
  }
}

// Cache inventory references real files, and every published entry has a return.
{
  const h=lobbyHarness();begin(h,'maze');h.$('extraHint').click();
  assert.equal(h.api.extras.state().moves,0);assert.ok(h.doc.activeElement.dataset.mazeDir!==undefined);
  h.doc.activeElement.click();assert.equal(h.api.extras.state().moves,1);assert.equal(h.api.extras.state().hint,null);
}
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const core=runInNewContext(sw.split('self.addEventListener')[0]+'\nCORE');
for(const asset of core){const relative=asset.endsWith('/')?asset+'index.html':asset;assert.ok(fs.existsSync(new URL('../'+relative,import.meta.url)),asset)}
const dodge=fs.readFileSync(new URL('../games/dual-axis-dodge/index.html',import.meta.url),'utf8');assert.equal((dodge.match(/class="lobby-return" href="\.\.\/\.\.\/"/g)||[]).length,4);
console.log('Platform integration passed: all nine lobby games, both modes, real control events, persistent records, categories, lifecycle, cache inventory and Dodge returns');
