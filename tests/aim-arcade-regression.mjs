import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
import {lobbyHarness} from './helpers/lobby-harness.mjs';
const {aimWave,aimRun,aimAdvance,aimTap,aimUpgrade}=extraHarness().module.rules;
const seeded=start=>{let seed=start;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}};

for(const mode of ['easy','challenge'])for(let wave=0;wave<5;wave++){
  const rules=aimWave(mode,wave);
  assert.ok(rules.limit<=3&&rules.lifetime>=1900&&rules.interval>=700);
  assert.ok(rules.queue.includes('normal'));
  assert.equal(rules.queue.includes('avoid'),wave>=2);
  assert.equal(rules.queue.includes('shield'),wave>=1);
}
let simulations=0;
for(const mode of ['easy','challenge'])for(const seed of [0,1,...Array.from({length:100},(_,i)=>i+2)]){
  const run=aimRun(mode,seed<2?()=>seed:seeded(seed));let guard=0,shield=false,bomb=false;
  while(run.phase!=='over'&&guard++<10000){
    if(run.phase==='between'){assert.equal(aimUpgrade(run,'bonus'),true);continue}
    aimAdvance(run,50);
    assert.ok(run.slots.filter(Boolean).length<=run.waveRules.limit,'Never exceed simultaneous-target cap');
    for(const [slot,target] of run.slots.entries()){
      if(!target)continue;
      assert.ok(target.deadline>run.clock,'Expired targets cannot remain hittable');
      if(target.kind==='avoid'){bomb=true;continue}
      if(target.kind==='shield')shield=true;
      if(run.clock-target.lastTap>=150)aimTap(run,slot);
    }
  }
  assert.ok(guard<10000);assert.equal(run.cleared,5);assert.equal(run.lives,3);
  assert.ok(run.score>10000&&run.maxCombo>30&&shield&&bomb);simulations++;
}
// Independent fixed-rate policy: enough time for deliberate mobile input,
// while slower processing creates pressure in the later challenge waves.
function pacedRun(mode,cadence){
  const run=aimRun(mode,seeded(77));let nextTap=350,maxActive=0;
  for(let guard=0;guard<10000&&run.phase!=='over';guard++){
    if(run.phase==='between'){aimUpgrade(run,run.lives<3?'heal':'bonus');nextTap=run.clock+350}
    aimAdvance(run,50);maxActive=Math.max(maxActive,run.slots.filter(Boolean).length);
    if(run.clock>=nextTap){
      const targets=run.slots.map((target,index)=>({target,index})).filter(x=>x.target&&x.target.kind!=='avoid').sort((a,b)=>a.target.deadline-b.target.deadline);
      if(targets.length)aimTap(run,targets[0].index);nextTap=run.clock+cadence;
    }
  }
  return {run,maxActive};
}
for(const mode of ['easy','challenge']){
  const {run,maxActive}=pacedRun(mode,350);assert.equal(run.cleared,5);assert.equal(run.expired,0);assert.equal(maxActive,3);
}
assert.equal(pacedRun('easy',900).run.cleared,5);
assert.ok(pacedRun('challenge',900).run.cleared<5);
{
  const run=aimRun('easy',()=>0);aimAdvance(run,0);const slot=run.slots.findIndex(Boolean);
  aimTap(run,slot);const score=run.score;aimTap(run,slot);
  assert.equal(run.strays,0,'Normal-target double click is absorbed by the empty-cell cooldown');
  assert.equal(run.combo,1);assert.equal(run.score,score);
  aimAdvance(run,301);aimTap(run,slot);assert.equal(run.combo,0);assert.equal(run.strays,1);assert.equal(run.lives,3);
}
{
  const run=aimRun();aimAdvance(run,0);const slot=run.slots.findIndex(Boolean);
  run.slots[slot].kind='shield';run.slots[slot].hp=2;
  aimTap(run,slot);aimTap(run,slot);assert.equal(run.slots[slot].hp,1);assert.equal(run.hits,0);
  aimAdvance(run,120);aimTap(run,slot);assert.equal(run.hits,1);assert.equal(run.goodTaps,2);
}
for(const offset of [-1,0,1]){
  const run=aimRun();aimAdvance(run,0);const slot=run.slots.findIndex(Boolean),deadline=run.slots[slot].deadline;
  aimAdvance(run,deadline+offset);aimTap(run,slot);
  assert.equal(run.hits,offset<0?1:0,'Exact deadline is expired, not a last free hit');
}
{
  const run=aimRun();run.phase='between';assert.equal(aimUpgrade(run,'heal'),false);
  run.lives=1;assert.equal(aimUpgrade(run,'heal'),true);assert.equal(run.lives,2);assert.equal(run.bonus,0);
  assert.equal(aimUpgrade(run,'bonus'),false,'A repeated upgrade cannot advance twice');
  run.phase='between';aimUpgrade(run,'bonus');assert.equal(run.bonus,1);assert.equal(run.lives,2);
}
{
  const run=aimRun();aimAdvance(run,100000);assert.equal(run.phase,'over');assert.equal(run.lives,0);assert.equal(run.score,0);
}
{
  const run=aimRun();aimAdvance(run,0);const slot=run.slots.findIndex(Boolean);
  run.slots[slot].kind='avoid';run.combo=7;aimTap(run,slot);
  assert.equal(run.lives,2);assert.equal(run.combo,0);assert.equal(run.bombs,1);assert.equal(run.score,0);
  const ignored=aimRun();aimAdvance(ignored,0);const target=ignored.slots.find(Boolean);target.kind='avoid';
  aimAdvance(ignored,target.deadline);assert.equal(ignored.lives,3,'A correctly ignored cross expires without a penalty');
}

const begin=h=>{h.api.openGame('aim');h.$('aimArcadeStart').click()};
const active=h=>h.api.aimArcade.state();
function playRun(h,keyboard=false){
  for(let guard=0;guard<10000;guard++){
    const run=active(h);if(run.phase==='over')return run;
    if(run.phase==='between'){h.$('aimBonus').click();h.advance(1000);continue}
    h.advance(150);
    for(const [slot,target] of active(h).slots.entries())if(target&&target.kind!=='avoid'){
      if(keyboard)h.doc.emit('keydown',{key:String(slot+1),repeat:false});
      else h.$('aimArcadeBoard').querySelectorAll('[data-aim-cell]')[slot].click();
    }
  }
  throw Error('Arcade run failed to settle');
}
for(const mode of ['easy','challenge']){
  const h=lobbyHarness({seed:{'playdot:v1:aim:easy':'123',dualAxisBest:'42'}});h.api.setMode(mode);begin(h);
  const board=h.$('aimArcadeBoard'),buttons=board.querySelectorAll('[data-aim-cell]');
  assert.equal(buttons.length,9);buttons[0].focus();h.advance(200);
  assert.equal(board.querySelectorAll('[data-aim-cell]')[0],buttons[0],'Tick must not replace input nodes');
  assert.equal(h.doc.activeElement,buttons[0]);
  const run=playRun(h,true);assert.equal(run.cleared,5);assert.equal(run.lives,3);assert.equal(h.tasks.size,0);
  assert.ok(h.$('aimArcadeResult').textContent.includes('五关全通'));
  assert.equal(h.doc.activeElement,h.$('aimArcadeAgain'),'Keyboard focus should move from the disabled board to replay');
  assert.equal(Number(h.storage.get(`playdot:v1:aimArcade:${mode}`)),run.score);
  assert.equal(h.storage.get('playdot:v1:aim:easy'),'123');assert.equal(h.storage.get('dualAxisBest'),'42');
  h.$('backLobby').click();h.advance(0);assert.ok(h.$('recordsList').textContent.includes('连击守关'));
  h.api.openGame('aim');h.$('aimStart').click();assert.ok(h.$('aimTarget'),'Classic practice remains available');
}
for(const interrupt of ['visibilitychange','blur','pagehide','stall']){
  const h=lobbyHarness();begin(h);h.advance(500);const run=active(h),clock=run.clock,lives=run.lives;
  const stale=[...h.tasks.values()].map(task=>task.fn);
  if(interrupt==='visibilitychange'){h.doc.hidden=true;h.doc.emit(interrupt);h.doc.hidden=false}
  else if(interrupt==='stall'){h.jump(1000);h.$('aimArcadeBoard').querySelectorAll('[data-aim-cell]')[0].click()}
  else h.win.emit(interrupt);
  assert.equal(run.phase,'paused');h.advance(10000);for(const fn of stale)fn();
  assert.equal(run.clock,clock);assert.equal(run.lives,lives);
  h.$('aimArcadePause').click();assert.equal(run.phase,'ready');h.advance(999);assert.equal(run.phase,'ready');
  h.advance(1);assert.equal(run.phase,'playing');h.advance(100);assert.equal(run.clock,clock+100);
  h.api.showLobby();h.advance(0);assert.equal(h.tasks.size,0);assert.equal(active(h),null);
}
for(const action of ['restart','mode','close','practice']){
  const h=lobbyHarness();begin(h);h.$('aimArcadePause').click();h.$('aimArcadePause').click();
  const stale=[...h.tasks.values()].map(task=>task.fn);
  if(action==='restart')h.api.aimArcade.start();
  if(action==='mode')h.api.setMode('challenge');
  if(action==='close')h.api.showLobby();
  if(action==='practice'){h.api.showLobby();h.api.openGame('aim');h.$('aimStart').click()}
  for(const fn of stale)fn();
  if(action==='restart')assert.equal(active(h).phase,'playing');else assert.equal(active(h),null);
}
{
  const h=lobbyHarness();begin(h);const run=active(h),slot=run.slots.findIndex(Boolean);
  h.doc.emit('keydown',{key:String(slot+1),repeat:true});assert.equal(run.hits,0);
  h.doc.emit('keydown',{key:String(slot+1),repeat:false});assert.equal(run.hits,1);
  h.$('aimArcadeEnd').click();const score=run.score;
  h.$('aimArcadeBoard').querySelectorAll('[data-aim-cell]')[slot].click();assert.equal(run.score,score);
  assert.equal(h.tasks.size,0);h.$('aimArcadeAgain').click();assert.equal(active(h).score,0);
}
for(const options of [{blocked:true},{writeBlocked:true}]){
  const h=lobbyHarness(options);begin(h);const run=active(h),slot=run.slots.findIndex(Boolean);
  h.$('aimArcadeBoard').querySelectorAll('[data-aim-cell]')[slot].click();h.$('aimArcadeEnd').click();
  h.api.showLobby();h.advance(0);assert.ok(h.$('recordsList').textContent.includes('连击守关'));
  assert.ok(h.$('storageNote').textContent.includes('暂存'));
}
console.log(`Aim arcade passed: ${simulations} five-wave runs, bounded layouts/timing, shield/bomb/combo choices, cooldowns, storage, lifecycle and classic preservation`);
