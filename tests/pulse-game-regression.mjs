import assert from 'node:assert/strict';
import {extraHarness} from './helpers/extra-harness.mjs';
const {rules}=extraHarness().module;
for(const mode of ['easy','challenge']){
  const timing=rules.pulseTiming(mode);assert.ok(timing.window>=200);assert.ok(timing.interval>timing.window*2);
  for(let i=0;i<timing.beats;i++){
    const target=timing.lead+i*timing.interval;
    for(const error of [-timing.window,0,timing.window])assert.equal(rules.pulseJudge(target+error,timing).index,i);
    assert.equal(rules.pulseJudge(target-timing.window-1,timing),null);
    assert.equal(rules.pulseJudge(target+timing.window+1,timing),null);
  }
  const h=extraHarness();h.mode(mode);h.api.start('pulse');
  for(let i=0;i<timing.beats;i++){
    const target=h.api.state().started+timing.lead+i*timing.interval;
    h.advance(target-h.clock());h.api.tapPulse();h.api.tapPulse();
    assert.equal(h.api.state().hits,i+1,'Double activation must not consume another beat');
  }
  h.advance(timing.window+40);assert.equal(h.api.state().phase,'over');assert.equal(h.api.best('pulse'),timing.beats*100);
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
console.log('Pulse game regression passed: judgment boundaries, perfect runs, double taps, keyboard, pause preparation and renderer stalls');
