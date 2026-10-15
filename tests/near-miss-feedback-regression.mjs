import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../games/dual-axis-dodge/index.html',import.meta.url),'utf8');
function sourceOf(name){
  const start=html.indexOf('  function '+name+'(');
  assert.ok(start>=0,'Missing '+name);
  const open=html.indexOf('{',start);
  let depth=0;
  for(let i=open;i<html.length;i++){
    if(html[i]==='{')depth++;
    if(html[i]==='}'){depth--;if(depth===0)return html.slice(start,i+1)}
  }
  throw Error('Unclosed '+name);
}
const arcs=[];
const ctx={
  NEAR_PULSE_DURATION:.42,nearPulse:{life:0,x:0,y:0,r:0,color:''},
  nearMisses:0,nearCountEl:{textContent:''},nearMissEl:{},
  leftP:{x:140,y:250,r:13},rightP:{x:600,y:180,r:13},
  reducedMotion:false,retrigger(){},playTick(){},vibrate(){},
  ctx:{save(){},restore(){},beginPath(){},stroke(){},arc(...a){arcs.push(a)}}
};
runInNewContext(sourceOf('showNearMiss')+'\n'+sourceOf('drawNearMissPulse')+'\nthis.fire=showNearMiss;this.draw=drawNearMissPulse;',ctx);
ctx.fire('left');ctx.draw();
assert.equal(ctx.nearMisses,1);
assert.equal(ctx.nearCountEl.textContent,'1');
assert.deepEqual([ctx.nearPulse.x,ctx.nearPulse.y,ctx.nearPulse.color],[140,250,'#38e8ff']);
assert.deepEqual(arcs[0].slice(0,2),[140,250]);
ctx.nearPulse.life=0;ctx.draw();
assert.equal(arcs.length,1,'Expired pulse must not draw');
ctx.leftP.x=600;ctx.rightP.x=130;
ctx.reducedMotion=true;ctx.fire('right');ctx.draw();
assert.equal(ctx.nearMisses,2);
assert.deepEqual([ctx.nearPulse.x,ctx.nearPulse.y,ctx.nearPulse.color],[130,180,'#ff3da6']);
assert.equal(arcs[1][2],21,'Reduced motion must not expand pulse');
assert.match(html,/nearMissCooldown=\.22;showNearMiss\(o\.type\)/);
assert.match(html,/nearPulse\.life=Math\.max\(0,nearPulse\.life-dt\)/);
assert.match(html,/nearMisses=0;nearPulse\.life=0;/);
assert.match(html,/state='paused';nearPulse\.life=0;/);
assert.match(html,/state='over';nearPulse\.life=0;/);
console.log('Near miss feedback regression: passed');
