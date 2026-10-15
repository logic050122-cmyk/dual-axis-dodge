import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {lobbyHarness} from './helpers/lobby-harness.mjs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
const rules=runInNewContext(script.split('const $=id=>')[0]+'\n({aimLane,targetPosition,aimScore})');
assert.equal(rules.aimLane('easy',0),null);
for(let hits=0;hits<16;hits++)assert.equal(rules.aimLane('challenge',hits),hits%2?'right':'left');
for(const width of [170,270,340,550,700])for(const size of [44,64])for(const rng of [()=>0,()=>.5,()=>1]){
  for(const lane of ['left','right',null]){
    const p=rules.targetPosition(width,270,size,rng,lane);
    assert.ok(p.x>=10&&p.x+size<=width-10,`Out-of-bounds target at ${width}/${size}/${lane}`);
    assert.ok(p.y>=10&&p.y+size<=260);
    if(lane==='left'&&width>=2*(size+20))assert.ok(p.x+size<=Math.floor(width/2)-10);
    if(lane==='right'&&width>=2*(size+20))assert.ok(p.x>=Math.ceil(width/2)+10);
  }
}

for(const choice of ['easy','challenge']){
  const h=lobbyHarness();h.api.setMode(choice);h.api.openGame('aim');h.$('aimStart').click();
  const stats=()=>h.$('gameScene').querySelectorAll('.stat strong');
  assert.equal(stats().length,4);
  assert.equal(h.api.state().aim.streak,0);
  for(let i=0;i<3;i++){
    const target=h.$('aimTarget'),left=parseFloat(target.style.left);
    if(choice==='challenge')assert.equal(left<170,i%2===0,`Round ${i} should alternate target lane`);
    if(choice==='challenge')assert.match(target.getAttribute('aria-label'),i%2===0?/左侧/:/右侧/);
    h.advance(300);target.click();
    assert.equal(h.api.state().aim.streak,i+1);
  }
  assert.equal(stats()[2].textContent,'3 次');
  assert.ok(h.$('gameMessage').textContent.includes('连续命中 3 次'));
  h.$('aimBoard').click();
  assert.equal(h.api.state().aim.streak,0,'Miss clears combo');
  assert.equal(h.api.state().aim.maxStreak,3,'The reached streak remains a session achievement');
  assert.equal(stats()[2].textContent,'0 次');
  assert.ok(h.$('gameMessage').textContent.includes('连击归零'));
  const total=choice==='easy'?10:16;
  for(let i=3;i<total;i++){h.advance(300);h.$('aimTarget').click()}
  assert.equal(h.api.state().aim.finished,true);
  assert.equal(h.api.state().aim.maxStreak,total-3);
  assert.ok(h.$('aimBoard').textContent.includes(`本局最长连中 ${total-3} 次`));
  const score=Number(h.storage.get(`playdot:v1:aim:${choice}`));
  assert.ok(score>0,'Legacy score key preserved');
  assert.equal(score,rules.aimScore(total,total+1,(total*.3)),'Combo must not change legacy scoring');
  assert.ok(h.$('gameScene').querySelector('.result-card'));
  h.$('aimAgain').click();assert.equal(h.api.state().aim.streak,0);
}

{
  const h=lobbyHarness();h.api.setMode('challenge');h.api.openGame('aim');h.$('aimStart').click();
  h.advance(29999);h.jump(2);h.$('aimTarget').click();
  assert.equal(h.api.state().aim.hits,0);
  assert.equal(h.api.state().aim.streak,0);
}
console.log('Aim challenge regression passed: alternating fair lanes, combo feedback/reset, legacy scoring, completion, restart and deadline');
