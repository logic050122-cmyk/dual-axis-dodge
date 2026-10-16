import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
const {rules}=extraHarness().module;
for(const mode of ['easy','challenge']){
  const timing=rules.pulseTiming(mode);assert.ok(timing.window>=200);assert.equal(timing.targets.length,timing.beats);
  const gaps=timing.targets.slice(1).map((target,i)=>target-timing.targets[i]);
  assert.ok(gaps.every(gap=>gap>timing.window*2),'Judgment windows must not overlap');
  for(let i=0;i<timing.beats;i++){
    const target=rules.pulseTarget(timing,i);
    for(const error of [-timing.window,0,timing.window])assert.equal(rules.pulseJudge(target+error,timing).index,i);
    assert.equal(rules.pulseJudge(target-timing.window-1,timing),null);
    assert.equal(rules.pulseJudge(target+timing.window+1,timing),null);
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
  const h=extraHarness();h.mode('challenge');h.api.start('pulse');
  assert.match(h.$('pulseSignal').textContent,/第 1 乐句/);assert.match(h.$('pulseBeats').innerHTML,/第 2 乐句第 1 拍/);
  h.advance(rules.pulseTarget(challenge,4));assert.ok(Math.abs(parseFloat(h.$('pulseWindow').style.width)-35)<1,'A 1200ms rest keeps the ±210ms window visually honest');
  h.advance(rules.pulseTarget(challenge,6)-h.clock());assert.ok(Math.abs(parseFloat(h.$('pulseWindow').style.width)-70)<1,'A 600ms short beat keeps the ±210ms window visually honest');
  h.api.pause();h.api.resume();
  const next=h.api.state().judged.findIndex(value=>!value);
  assert.equal(h.api.state().started+rules.pulseTarget(challenge,next)-h.clock(),1000,'Irregular phrases resume one second before the next unjudged beat');
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
console.log('Pulse game regression passed: fixed phrases, phrase feedback/practice, non-overlapping boundaries, perfect runs, double taps, keyboard, pause preparation and renderer stalls');
