import assert from 'node:assert/strict';
import {lobbyHarness} from './helpers/lobby-harness.mjs';
for(const mode of ['easy','challenge'])for(const target of ['aimTarget','aimBoard']){
  const h=lobbyHarness();h.api.setMode(mode);h.api.openGame('aim');h.$('aimStart').click();
  h.advance((mode==='easy'?40000:30000)-1);h.jump(2);h.$(target).click();
  assert.equal(h.api.state().aim.hits,0,'A click after the deadline cannot score before the next timer tick');
  assert.equal(h.api.state().aim.attempts,0,'A click after the deadline cannot create a miss either');
  assert.equal(h.api.state().aim.finished,true);assert.equal(h.api.state().aim.seconds,0);
}
function finishReaction(h){
  h.api.openGame('reaction');h.$('reactionStart').click();
  for(let i=0;i<4;i++){
    while(h.api.state().reaction.phase!=='go')h.advance(10);
    h.advance(10);h.$('reactionPad').click();if(i<3)h.advance(1050);
  }
  return Math.round(h.api.state().reaction.values.sort((a,b)=>a-b).slice(1,3).reduce((a,b)=>a+b,0)/2);
}
for(const bad of ['NaN','Infinity','-5','','not a score','<img src=x onerror=alert(1)>']){
  const h=lobbyHarness({seed:{'playdot:v1:reaction:easy':bad,'playdot:v1:memory:easy':bad,'playdot:v1:aim:easy':bad}});
  assert.equal(h.$('recordsList').children.length,1,'Corrupt records should show the empty state');
  h.api.openGame('reaction');assert.equal(h.$('gameScene').querySelectorAll('img').length,0,'Stored text cannot become markup');
  const result=finishReaction(h);assert.equal(Number(h.storage.get('playdot:v1:reaction:easy')),result);
  h.api.openGame('aim');h.$('aimStart').click();for(let i=0;i<10;i++){h.advance(100);h.$('aimTarget').click()}
  assert.ok(Number(h.storage.get('playdot:v1:aim:easy'))>0);
  h.api.openGame('memory');h.$('memoryStart').click();const pairs=new Map();
  h.api.state().memory.deck.forEach((card,index)=>{if(!pairs.has(card.pair))pairs.set(card.pair,[]);pairs.get(card.pair).push(index)});
  for(const pair of pairs.values())for(const index of pair)h.$('memoryBoard').children[index].click();
  assert.equal(h.storage.get('playdot:v1:memory:easy'),'6');
}
for(const options of [{blocked:true},{writeBlocked:true,seed:{'playdot:v1:reaction:easy':'200'}}]){
  const h=lobbyHarness(options),score=finishReaction(h);h.api.showLobby();h.advance(0);
  assert.ok(h.$('recordsList').textContent.includes(`${score} ms`),'Current-session best must survive storage write failure');
  assert.ok(h.$('storageNote').textContent.includes('暂存'));
  if(options.writeBlocked)assert.equal(h.storage.get('playdot:v1:reaction:easy'),'200','Do not destroy existing persistent record');
  h.api.openGame('reaction');assert.ok(h.$('gameScene').textContent.includes(`${score} ms`));
}
{
  const h=lobbyHarness({seed:{dualAxisBest:'42',dualAxisLevelBests:'{"1":"NaN","free:1":10}'}});
  assert.ok(h.$('recordsList').textContent.includes('42.0 秒'),'Valid old Dodge best must survive a corrupt level-one entry');
  assert.equal(h.storage.get('dualAxisBest'),'42');
}
{
  const h=lobbyHarness();h.api.openGame('aim');h.$('aimStart').click();
  h.advance(39999);h.$('aimTarget').click();assert.equal(h.api.state().aim.hits,1);
  h.jump(2);h.$('aimTarget').click();assert.equal(h.api.state().aim.hits,1);assert.equal(h.api.state().aim.finished,true);
}
console.log('Records/timing regression passed: exact deadline, bad-record recovery, safe rendering, session fallback and preserved Dodge keys');
