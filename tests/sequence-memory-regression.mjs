import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
assert.match(html,/data-open="sequence"/);
assert.match(html,/cover-sequence/);

// Minimal DOM + controllable clock. This runs the complete production script,
// including listeners and timer cleanup; it is not a browser/layout simulator.
function harness({blocked=false,seed={}}={}){
  const nodes=new Map(),tasks=new Map(),documentEvents={},windowEvents={};
  const storage=new Map(Object.entries(seed));let now=0,nextId=0;
  class Element{
    constructor(id=''){
      this.id=id;this.dataset={};this.disabled=false;this.hidden=false;this.listeners={};
      this.attributes={};this.textContent='';this.children=[];this.classes=new Set();
      this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};
      if(id)nodes.set(id,this);
    }
    set innerHTML(value){
      for(const el of this.children)if(el.id)nodes.delete(el.id);
      this.children=[];this.content=value;
      for(const match of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
        const attrs=match[2],id=attrs.match(/\bid="([^"]+)"/)?.[1];
        const pad=attrs.match(/data-sequence-pad="(\d)"/)?.[1];
        if(!id&&pad===undefined)continue;
        const el=new Element(id);el.disabled=/\bdisabled\b/.test(attrs);el.hidden=/\bhidden\b/.test(attrs);
        if(pad!==undefined)el.dataset.sequencePad=pad;
        this.children.push(el);
      }
    }
    get innerHTML(){return this.content||''}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
    click(){if(!this.disabled)for(const fn of this.listeners.click||[])fn({target:this,stopPropagation(){}})}
    setAttribute(name,value){this.attributes[name]=String(value)}
    append(el){this.children.push(el)}
    querySelectorAll(selector){return selector==='[data-sequence-pad]'?this.children.filter(el=>el.dataset.sequencePad!==undefined):[]}
    showModal(){this.open=true}
    close(){this.open=false}
  }
  for(const id of ['gameDialog','gameScene','dialogTitle','dialogDescription','dialogCategory','recordsList','closeDialog','backLobby'])new Element(id);
  const doc={hidden:false,getElementById:id=>nodes.get(id),querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener:(type,fn)=>{const previous=documentEvents[type];documentEvents[type]=event=>{previous?.(event);fn(event)}}};
  const win={addEventListener:(type,fn)=>{windowEvents[type]=fn}};
  const schedule=(fn,delay)=>{const id=++nextId;tasks.set(id,{fn,at:now+delay});return id};
  const api=runInNewContext(source+`\n({openGame,setMode,startSequence,playSequence,sequenceTap,pauseSequence,finishSequence,showLobby,readSequenceBest,extendSequence,MODES,unlockSequenceAudio,sequenceTone,stopSequenceAudio,state:()=>sequence,sound:()=>sequenceSound})`,{
    document:doc,window:win,navigator:{},performance:{now:()=>now},
    localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)??null},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value)}},
    setTimeout:schedule,clearTimeout:id=>tasks.delete(id),setInterval:schedule,clearInterval:id=>tasks.delete(id)
  });
  function advance(ms){
    const target=now+ms;
    for(let guard=0;guard<1000;guard++){
      const next=[...tasks.entries()].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next){now=target;return}
      tasks.delete(next[0]);now=next[1].at;next[1].fn();
    }
    throw Error('Runaway timers');
  }
  // The slower mode is an upper bound for either mode; input itself has no timer.
  function ready(){advance(600+api.state().items.length*(api.MODES.easy.sequenceOn+api.MODES.easy.sequenceGap)+1000);assert.equal(api.state().phase,'input')}
  function answer(){for(const index of [...api.state().items]){api.sequenceTap(index);advance(220)}}
  api.openGame('sequence');
  return {api,doc,win,nodes,tasks,storage,advance,ready,answer,documentEvents,windowEvents};
}

// Generation is bounded, immutable, preserves the prefix and allows deliberate
// consecutive repeats. Cover every RNG bin and both boundary values.
{
  const {api}=harness();const prefix=[0,2,1];
  for(const [rng,want] of [[0,0],[.249,0],[.25,1],[.5,2],[.75,3],[1,3]]){
    const next=api.extendSequence(prefix,()=>rng);
    assert.deepEqual([...next],[0,2,1,want]);assert.deepEqual(prefix,[0,2,1]);
  }
  let value=1,seq=[];const counts=[0,0,0,0];
  for(let i=0;i<5000;i++){
    value=(Math.imul(value,1664525)+1013904223)>>>0;
    seq=api.extendSequence(seq,()=>value/2**32);counts[seq.at(-1)]++;
  }
  assert.ok(counts.every(n=>n>1050&&n<1450),'All four signals must remain reachable');
  assert.ok(api.MODES.easy.sequenceOn>api.MODES.challenge.sequenceOn);
}

// Start with one signal, block input during playback, score only full rounds,
// append exactly one signal, and leave input untimed.
{
  const h=harness();h.nodes.get('sequenceStart').click();
  assert.equal(h.api.state().items.length,1);h.api.sequenceTap(0);assert.equal(h.api.state().completed,0);
  h.ready();h.advance(300000);assert.equal(h.api.state().phase,'input');
  h.answer();assert.equal(h.api.state().completed,1);assert.equal(h.api.state().items.length,2);
  assert.equal(h.storage.get('playdot:v1:sequence:easy'),'1');
  h.ready();h.answer();assert.equal(h.api.state().completed,2);assert.equal(h.api.state().items.length,3);
  h.nodes.get('sequenceEnd').click();assert.equal(h.api.state().phase,'over');
  assert.match(h.nodes.get('sequenceResult').innerHTML,/完成 2 轮/);
  h.nodes.get('sequenceStart').click();assert.equal(h.api.state().completed,0);assert.equal(h.api.readSequenceBest(),2);
}

// Easy-mode mistakes do not score or lose completed rounds. Replay restarts the
// SAME sequence; during feedback repeated activation cannot consume two steps.
{
  const h=harness();h.api.startSequence();h.ready();h.answer();h.ready();
  const items=[...h.api.state().items];h.api.sequenceTap((items[0]+1)%4);
  assert.equal(h.api.state().phase,'retry');assert.equal(h.api.state().completed,1);
  h.nodes.get('sequenceReplay').click();assert.deepEqual([...h.api.state().items],items);
  h.ready();h.api.state().items=[2,2];
  h.api.sequenceTap(2);h.api.sequenceTap(2);
  assert.equal(h.api.state().position,1);assert.equal(h.api.state().completed,1);
  h.advance(220);h.api.sequenceTap(2);assert.equal(h.api.state().completed,2);
}

// Challenge has a separate best, no replay, and a wrong first tap is zero rounds.
{
  const h=harness({seed:{'playdot:v1:sequence:easy':'7','playdot:v1:reaction:easy':'210','dualAxisBest':'42'}});
  h.api.setMode('challenge');h.api.startSequence();h.ready();
  assert.equal(h.nodes.get('sequenceReplay').hidden,true);
  h.api.sequenceTap((h.api.state().items[0]+1)%4);
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.state().completed,0);
  assert.equal(h.storage.has('playdot:v1:sequence:challenge'),false);
  h.api.startSequence();h.ready();h.answer();h.ready();
  h.api.sequenceTap(h.api.state().items[0]);h.advance(220);
  h.api.sequenceTap((h.api.state().items[1]+1)%4);
  assert.equal(h.api.state().phase,'over');assert.equal(h.api.state().completed,1);
  assert.equal(h.storage.get('playdot:v1:sequence:challenge'),'1');
  assert.equal(h.storage.get('playdot:v1:sequence:easy'),'7');
  assert.equal(h.storage.get('playdot:v1:reaction:easy'),'210');
  assert.equal(h.storage.get('dualAxisBest'),'42');
}

// Interrupt input acknowledgment and next-round transition, not only playback.
// Completed rounds survive pause, partially entered answers never do.
for(const phase of ['between','tap','retry']){
  const h=harness();h.api.startSequence();h.ready();h.answer();
  if(phase!=='between'){
    h.ready();
    h.api.sequenceTap(phase==='tap'?h.api.state().items[0]:(h.api.state().items[0]+1)%4);
  }
  assert.equal(h.api.state().phase,phase);
  const stale=[...h.tasks.values()].map(t=>t.fn),items=[...h.api.state().items];
  h.api.pauseSequence();for(const fn of stale)fn();
  assert.equal(h.api.state().phase,'paused');assert.equal(h.api.state().completed,1);
  h.nodes.get('sequencePause').click();h.ready();
  assert.deepEqual([...h.api.state().items],items);assert.equal(h.api.state().position,0);
}

// Background, pagehide, pause, restart, mode change and exit cancel ALL old
// callbacks. Invoke a captured callback even after clearTimeout to test its token.
for(const interrupt of ['hidden','pagehide','pause','restart','mode','exit']){
  const h=harness();h.api.startSequence();h.advance(600);
  const stale=[...h.tasks.values()].map(t=>t.fn);
  if(interrupt==='hidden'){h.doc.hidden=true;h.documentEvents.visibilitychange()}
  if(interrupt==='pagehide')h.windowEvents.pagehide();
  if(interrupt==='pause')h.nodes.get('sequencePause').click();
  if(interrupt==='restart')h.api.startSequence();
  if(interrupt==='mode')h.api.setMode('challenge');
  if(interrupt==='exit')h.api.showLobby();
  for(const fn of stale)fn();
  if(['hidden','pagehide','pause'].includes(interrupt)){
    assert.equal(h.api.state().phase,'paused');assert.equal(h.tasks.size,0);
    h.advance(60000);assert.equal(h.api.state().phase,'paused');
    h.doc.hidden=false;h.nodes.get('sequencePause').click();
    assert.equal(h.api.state().phase,'watching');assert.equal(h.api.state().position,0);
    h.ready();assert.equal(h.api.state().phase,'input');
  }else if(interrupt==='restart')assert.equal(h.api.state().phase,'watching');
  else{assert.equal(h.api.state(),null);assert.equal(h.tasks.size,0)}
}

// When timers run late, only one signal is displayed; the following signal is
// scheduled by that callback, not by a fixed set of absolute deadlines.
{
  const h=harness();h.api.startSequence();h.api.state().items=[0,1,2];
  assert.equal(h.tasks.size,1);h.advance(600);assert.equal(h.tasks.size,1);
  const pads=h.nodes.get('gameScene').querySelectorAll('[data-sequence-pad]');
  assert.equal(pads.filter(p=>p.classList.contains('lit')).length,1);
  h.api.pauseSequence();assert.ok(pads.every(p=>!p.classList.contains('lit')));
}

// Normal keyboard input and repeat guard use the installed production listener.
{
  const h=harness();h.api.startSequence();h.ready();
  const key=String(h.api.state().items[0]+1);
  h.documentEvents.keydown({key,repeat:true,preventDefault(){}});assert.equal(h.api.state().completed,0);
  h.documentEvents.keydown({key,repeat:false,preventDefault(){}});assert.equal(h.api.state().completed,1);
}

// Storage and audio capability failures are nonfatal; session best remains useful.
for(const seed of [{},{'playdot:v1:sequence:easy':'NaN'},{'playdot:v1:sequence:easy':'-3'},{'playdot:v1:sequence:easy':'Infinity'}]){
  const h=harness({seed});assert.equal(h.api.readSequenceBest(),0);
}
{
  const h=harness({blocked:true});h.api.startSequence();h.ready();h.answer();
  h.api.finishSequence(false);assert.equal(h.api.readSequenceBest(),1);
  h.nodes.get('sequenceSound').click();assert.equal(h.api.sound(),false);
  assert.equal(h.nodes.get('sequenceSound').attributes['aria-pressed'],'false');
}

// Optional sound: failed/delayed resume cannot produce stale notes after mute,
// closing the game stops voices, and silence never prevents a complete round.
{
  const h=harness();let resolve,starts=0,stops=0;
  const context={state:'suspended',currentTime:0,destination:{},
    resume:()=>new Promise(r=>{resolve=r}),
    createOscillator:()=>({frequency:{},connect(){},disconnect(){},start(){starts++},stop(){stops++}}),
    createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}})};
  h.win.AudioContext=function(){return context};
  h.nodes.get('sequenceSound').click();h.api.startSequence();h.advance(600);
  assert.equal(starts,0);h.nodes.get('sequenceSound').click();context.state='running';resolve();
  await Promise.resolve();assert.equal(starts,0,'Late resume must not enqueue sound');
  h.nodes.get('sequenceSound').click();h.api.sequenceTone(0);assert.equal(starts,1);
  h.api.showLobby();assert.ok(stops>=2,'Exit must stop active voices as well as scheduled note endings');
}
{
  const h=harness();
  h.win.webkitAudioContext=function(){return {state:'suspended',resume:()=>Promise.reject(Error('autoplay denied'))}};
  h.nodes.get('sequenceSound').click();h.api.startSequence();
  await Promise.resolve();await Promise.resolve();h.ready();h.answer();
  assert.equal(h.api.state().completed,1,'Rejected Safari audio unlock must not block play');
}

console.log('Sequence memory regression passed: generation, real session/timer/input/scoring code, modes, lifecycle, storage and optional audio');
