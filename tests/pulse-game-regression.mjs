import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
const {rules}=extraHarness().module;
for(const mode of ['easy','challenge']){
  const timing=rules.pulseTiming(mode);assert.ok(timing.window>=190);assert.equal(timing.targets.length,timing.beats);
  const gaps=timing.targets.slice(1).map((target,i)=>target-timing.targets[i]);
  assert.ok(gaps.every((gap,i)=>gap>rules.pulseBeatProfile(timing,i).window+rules.pulseBeatProfile(timing,i+1).window),'Adjacent circular hit windows must not overlap');
  for(let i=0;i<timing.beats;i++){
    const target=rules.pulseTarget(timing,i),window=rules.pulseBeatProfile(timing,i).window;
    for(const error of [-window,0,window])assert.equal(rules.pulseJudge(target+error,timing).index,i);
    assert.equal(rules.pulseJudge(target-window-1,timing),null);
    assert.equal(rules.pulseJudge(target+window+1,timing),null);
  }
  const h=extraHarness();h.mode(mode);h.api.start('pulse');
  for(let i=0;i<timing.beats;i++){
    const target=h.api.state().started+rules.pulseTarget(timing,i);
    h.advance(target-h.clock());h.api.tapPulse();h.api.tapPulse();
    assert.equal(h.api.state().hits,i+1,'Double activation must not consume another beat');
  }
  h.advance(timing.window+40);assert.equal(h.api.state().phase,'over');assert.equal(h.api.best('pulse'),timing.beats*100);
}
{
  const easy=rules.pulseTiming('easy'),challenge=rules.pulseTiming('challenge');
  assert.deepEqual(Array.from(easy.targets.slice(1),((target,i)=>target-easy.targets[i])),Array(11).fill(1000),'Easy mode keeps the child-friendly even beat');
  const gaps=Array.from(challenge.targets.slice(1),((target,i)=>target-challenge.targets[i]));
  assert.deepEqual(gaps.slice(0,3),[800,800,800],'Challenge opens with a readable reference phrase');
  assert.ok(gaps.includes(600)&&gaps.includes(1200),'Challenge adds both short beats and rests');
  assert.deepEqual(Array.from(rules.pulseTiming('challenge').targets),Array.from(challenge.targets),'The same phrase is available for deliberate replay');
  const easyTiers=[0,4,8].map(index=>rules.pulseBeatProfile(easy,index));
  const challengeTiers=[0,4,8,12].map(index=>rules.pulseBeatProfile(challenge,index));
  for(const tiers of [easyTiers,challengeTiers]){
    assert.ok(tiers.every((tier,i)=>i===0||(tier.speed>tiers[i-1].speed&&tier.radius<tiers[i-1].radius&&tier.window<tiers[i-1].window)),'Each phrase must speed up and shrink the circular hit zone');
  }
  assert.deepEqual(challengeTiers.map(tier=>tier.radius),[42,36,30,24]);
  assert.deepEqual(challengeTiers.map(tier=>tier.speed),[150,185,220,255]);
  const directions=Array.from({length:8},(_,i)=>rules.pulseDirection(challenge,i));
  assert.equal(new Set(directions.map(direction=>direction.index)).size,8,'The authored direction cycle must cover all eight approach directions');
  assert.equal(rules.pulseDirection(challenge,8).source,rules.pulseDirection(rules.pulsePhraseTiming(challenge,1),0).source,'Focused practice must replay the original phrase direction');
  const target=rules.pulseTarget(challenge,0),point=rules.pulsePoint(challenge,0,target,340,340),approach=rules.pulsePoint(challenge,0,target-200,340,340),far=rules.pulsePoint(challenge,0,target-1000,340,340);
  assert.deepEqual([point.x,point.y,point.visible],[170,170,true],'The ball crosses the circle center exactly on the beat');
  assert.ok(approach.visible&&Math.abs(approach.distance)>0,'The ball approaches from outside before entering the circle');
  assert.equal(far.visible,false,'The ball waits off-stage until its approach window begins');
  const h=extraHarness();h.mode('challenge');h.api.start('pulse');
  assert.match(h.$('pulseSignal').textContent,/第 1 乐句/);assert.match(h.$('pulseBeats').innerHTML,/第 2 乐句第 1 拍/);
  assert.equal(h.$('pulseRing').style.width,'84px','First challenge phrase starts with a generous circular target');
  assert.match(h.$('pulseDifficulty').textContent,/阶段 1\/4/);
  for(const [index,diameter,stage] of [[4,'72px','阶段 2/4'],[8,'60px','阶段 3/4'],[12,'48px','阶段 4/4']]){
    h.advance(rules.pulseTarget(challenge,index)-h.clock()+32);
    assert.equal(h.$('pulseRing').style.width,diameter,'Circular hit zone shrinks by phrase');
    assert.match(h.$('pulseDifficulty').textContent,new RegExp(stage));
  }
  h.api.pause();h.api.resume();
  const next=h.api.state().judged.findIndex(value=>!value);
  assert.equal(h.api.state().started+rules.pulseTarget(h.api.state().timing,next)-h.clock(),1000,'Irregular phrases resume one second before the next unjudged beat');
}
{
  const timing=rules.pulseTiming('challenge'),practice=rules.pulsePhraseTiming(timing,2);
  assert.deepEqual(Array.from(practice.targets),[0,600,1600,2400],'Focused practice preserves the third phrase timing and normalizes its start');
  assert.equal(practice.phraseOffset,2);assert.equal(practice.beats,4);
  const stats=rules.pulsePhraseStats(['hit','hit','hit','hit','hit','miss','miss','hit'],[-80,-60,-40,-20,90,null,null,110],4);
  assert.deepEqual(JSON.parse(JSON.stringify(stats)),[{hits:4,total:4,meanError:-50},{hits:2,total:4,meanError:100}]);
  assert.equal(rules.pulseWeakestPhrase(stats),1,'Lowest accuracy phrase becomes the practice target');
  assert.equal(rules.pulseWeakestPhrase([{hits:4,total:4,meanError:10}]),null,'A clean phrase does not manufacture a weakness');
}
{
  const h=extraHarness();h.mode('challenge');h.api.start('pulse');const timing=h.api.state().timing;
  for(let i=0;i<timing.beats;i++){
    const target=h.api.state().started+rules.pulseTarget(timing,i);
    h.advance(target-h.clock());
    if(![5,6].includes(i))h.api.tapPulse();
  }
  h.advance(timing.window+40);
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.state().weakestPhrase,1);
  assert.match(h.$('extraResult').innerHTML,/第 2 段 2\/4/);assert.ok(h.$('pulsePractice'));
  h.$('pulsePractice').click();
  assert.equal(h.api.state().practicePhrase,1);assert.equal(h.api.state().timing.beats,4);
  const recordsBefore=h.records();
  h.advance(rules.pulseTarget(h.api.state().timing,3)+h.api.state().timing.window+40);
  assert.equal(h.api.state().phase,'over');assert.equal((h.$('pulseBeats').innerHTML.match(/class="miss"/g)||[]).length,4,'The final automatic miss must be rendered before results');
  assert.match(h.$('extraResult').innerHTML,/完成第 2 段专项/);assert.doesNotMatch(h.$('extraResult').innerHTML,/完成 4 段固定乐句/);
  h.$('extraStart').click();assert.equal(h.api.state().practicePhrase,1);
  for(let i=0;i<4;i++){
    const target=h.api.state().started+rules.pulseTarget(h.api.state().timing,i);
    h.advance(target-h.clock());h.api.tapPulse();
  }
  h.advance(h.api.state().timing.window+40);
  assert.equal(h.api.state().phase,'over');assert.equal(h.$('extraStart').textContent,'再练本段');
  assert.match(h.$('extraResult').innerHTML,/练习不计入纪录/);assert.ok(h.$('pulseFull'));
  assert.equal(h.records(),recordsBefore,'Focused practice must not refresh or write official records');
  h.$('pulseFull').click();assert.equal(h.api.state().practicePhrase,null);assert.equal(h.api.state().timing.beats,16);
}
{
  const h=extraHarness();h.api.start('pulse');h.api.tapPulse();assert.equal(h.api.state().strays,1);
  h.api.pause();const stale=[...h.tasks.values()].map(task=>task.fn);for(const fn of stale)fn();
  h.advance(300000);assert.equal(h.api.state().phase,'paused');h.api.resume();
  const target=h.api.state().started+h.api.state().timing.lead;
  assert.equal(target-h.clock(),1000,'Resume must give preparation time');
  h.advance(1000);h.api.key({code:'Space',repeat:true,preventDefault(){}});assert.equal(h.api.state().hits,0);
  h.api.key({code:'Space',repeat:false,preventDefault(){}});assert.equal(h.api.state().hits,1);
  assert.equal(h.api.key({code:'Space',target:{tagName:'BUTTON',id:'extraPause'},preventDefault(){throw Error('Do not hijack pause button')}}),false);
  h.jump(1000);h.advance(32);assert.equal(h.api.state().phase,'paused','Rendering stall must not punish player with missed beats');
  assert.equal(h.api.state().hits,1);
}
{
  const h=extraHarness();h.api.start('pulse');h.advance(600);const stale=[...h.tasks.values()].map(task=>task.fn);
  h.api.start('odd');for(const fn of stale)fn();assert.equal(h.api.state().name,'odd');assert.equal(h.api.state().correct,0);
}
console.log('Pulse game regression passed: radial directions, progressive speed/radius, circular hit windows, fixed phrases, practice replay, perfect runs, double taps, keyboard, pause preparation and renderer stalls');
