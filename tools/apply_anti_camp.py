from pathlib import Path

p=Path('index.html')
s=p.read_text()
if 'SPAWN_ZONE_COUNT=5' in s:
    raise SystemExit('anti-camp spawn logic already exists')
old='''  function sideCount(type){let n=0;for(const o of obstacles)if(o.type===type)n++;return n}\n  function chooseSeparated(min,max,last,avoid){\n    if(max<=min)return min;let candidate=min+Math.random()*(max-min);\n    for(let i=0;i<6;i++){candidate=min+Math.random()*(max-min);if(Math.abs(candidate-last)>avoid)break}\n    return candidate;\n  }\n  function comboSafePosition(min,max,last,lastAt,avoid){\n    let candidate=chooseSeparated(min,max,last,avoid);\n    if(last<-900||lastAt<0)return candidate;\n    const gap=Math.max(0,elapsed-lastAt),span=Math.max(1,max-min);\n    if(gap<.52){\n      const t=clamp(gap/.52,0,1),maxShift=span*(.34+.30*t);\n      candidate=clamp(candidate,last-maxShift,last+maxShift);\n    }\n    return candidate;\n  }'''
new='''  const SPAWN_ZONE_COUNT=5,MAX_ZONE_DEBT=8,CAMP_THRESHOLD=1.6,CAMP_RAMP=1.4,CAMP_MAX_BONUS=1.2;\n  const spawnCoverage={left:Array(SPAWN_ZONE_COUNT).fill(0),right:Array(SPAWN_ZONE_COUNT).fill(0)},campBias={left:{zone:-1,time:0},right:{zone:-1,time:0}};\n  function resetSpawnBias(){for(const type of ['left','right']){spawnCoverage[type].fill(0);campBias[type].zone=-1;campBias[type].time=0}}\n  function zoneIndexFor(pos,min,max){if(max<=min)return Math.floor(SPAWN_ZONE_COUNT/2);return clamp(Math.floor((pos-min)/(max-min)*SPAWN_ZONE_COUNT),0,SPAWN_ZONE_COUNT-1)}\n  function playerSpawnZone(type){if(type==='left'){const [min,max]=horizontalBounds(0);return zoneIndexFor(leftP.x,min,max)}const [min,max]=roleYBounds(rightP);return zoneIndexFor(rightP.y,min,max)}\n  function updateCampBias(dt){for(const type of ['left','right']){const camp=campBias[type],zone=playerSpawnZone(type),edge=zone===0||zone===SPAWN_ZONE_COUNT-1;if(edge){if(camp.zone===zone)camp.time=Math.min(CAMP_THRESHOLD+CAMP_RAMP,camp.time+dt);else{camp.zone=zone;camp.time=dt}}else{camp.time=Math.max(0,camp.time-dt*1.5);if(camp.time===0)camp.zone=-1}}}\n  function spawnZoneWeights(type){const weights=spawnCoverage[type].map(debt=>1+Math.min(MAX_ZONE_DEBT,debt)*.12),camp=campBias[type];if((camp.zone===0||camp.zone===SPAWN_ZONE_COUNT-1)&&camp.time>CAMP_THRESHOLD){const t=clamp((camp.time-CAMP_THRESHOLD)/CAMP_RAMP,0,1);weights[camp.zone]+=CAMP_MAX_BONUS*t}return weights}\n  function pickWeightedZone(weights){let total=0;for(const w of weights)total+=w;let roll=Math.random()*total;for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<=0)return i}return weights.length-1}\n  function markSpawnCoverage(type,pos,min,max){const hit=zoneIndexFor(pos,min,max),debt=spawnCoverage[type];for(let i=0;i<debt.length;i++)debt[i]=i===hit?0:Math.min(MAX_ZONE_DEBT,debt[i]+1)}\n  function sideCount(type){let n=0;for(const o of obstacles)if(o.type===type)n++;return n}\n  function chooseSeparated(min,max,last,avoid){\n    if(max<=min)return min;let candidate=min+Math.random()*(max-min);\n    for(let i=0;i<6;i++){candidate=min+Math.random()*(max-min);if(Math.abs(candidate-last)>avoid)break}\n    return candidate;\n  }\n  function weightedZoneCandidate(type,min,max,last,avoid){if(max<=min)return min;const zone=pickWeightedZone(spawnZoneWeights(type)),span=(max-min)/SPAWN_ZONE_COUNT,zMin=min+span*zone,zMax=zone===SPAWN_ZONE_COUNT-1?max:min+span*(zone+1);return chooseSeparated(zMin,zMax,last,avoid)}\n  function comboSafePosition(type,min,max,last,lastAt,avoid){\n    let candidate=weightedZoneCandidate(type,min,max,last,avoid);\n    if(last>=-900&&lastAt>=0){const gap=Math.max(0,elapsed-lastAt),span=Math.max(1,max-min);if(gap<.52){const t=clamp(gap/.52,0,1),maxShift=span*(.34+.30*t);candidate=clamp(candidate,last-maxShift,last+maxShift)}}\n    markSpawnCoverage(type,candidate,min,max);return candidate;\n  }'''
if old not in s: raise SystemExit('spawn helper anchor not found')
s=s.replace(old,new,1)
old_reset='setModePositions();lastLeftSpawn=-999;lastRightSpawn=-999;lastLeftSpawnAt=-1;lastRightSpawnAt=-1;'
if old_reset not in s: raise SystemExit('reset anchor missing')
s=s.replace(old_reset,'setModePositions();resetSpawnBias();lastLeftSpawn=-999;lastRightSpawn=-999;lastLeftSpawnAt=-1;lastRightSpawnAt=-1;',1)
left='x=comboSafePosition(minX,maxX,lastLeftSpawn,lastLeftSpawnAt,Math.max(42,size*1.8))'
right='y=comboSafePosition(minY,maxY,lastRightSpawn,lastRightSpawnAt,Math.max(42,size*1.8))'
if left not in s or right not in s: raise SystemExit('spawn call anchor missing')
s=s.replace(left,'x=comboSafePosition(type,minX,maxX,lastLeftSpawn,lastLeftSpawnAt,Math.max(42,size*1.8))',1)
s=s.replace(right,'y=comboSafePosition(type,minY,maxY,lastRightSpawn,lastRightSpawnAt,Math.max(42,size*1.8))',1)
update='elapsed+=dt;scoreEl.textContent=elapsed.toFixed(1);'
if update not in s: raise SystemExit('update anchor missing')
s=s.replace(update,'elapsed+=dt;updateCampBias(dt);scoreEl.textContent=elapsed.toFixed(1);',1)
p.write_text(s)

Path('tests/spawn-fairness-regression.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const needle of ['SPAWN_ZONE_COUNT=5','CAMP_THRESHOLD=1.6','CAMP_MAX_BONUS=1.2','updateCampBias(dt)','weightedZoneCandidate(type,min,max,last,avoid)','markSpawnCoverage(type,candidate,min,max)','comboSafePosition(type,minX,maxX','comboSafePosition(type,minY,maxY','const spawnGap=()=>Math.max(.29,.86-difficultyElapsed()*.0105);','if(gap<.52)']) assert.ok(source.includes(needle),`missing source guard: ${needle}`);
const ZONES=5,MAX_DEBT=8,THRESHOLD=1.6,RAMP=1.4,MAX_BONUS=1.2;
function weights(debt,campZone=-1,campTime=0){const out=debt.map(d=>1+Math.min(MAX_DEBT,d)*.12);if((campZone===0||campZone===ZONES-1)&&campTime>THRESHOLD){const t=Math.max(0,Math.min(1,(campTime-THRESHOLD)/RAMP));out[campZone]+=MAX_BONUS*t}return out}
const probability=(ws,i)=>ws[i]/ws.reduce((a,b)=>a+b,0);
assert.equal(probability(weights([0,0,0,0,0]),0),.2);
const starved=probability(weights([6,0,0,0,0]),0);assert.ok(starved>.29&&starved<.32);
const campFresh=probability(weights([0,0,0,0,0],0,3),0);assert.ok(campFresh>.35&&campFresh<.37);
assert.equal(probability(weights([0,0,0,0,0],2,3),2),.2);
const worst=probability(weights([8,0,0,0,0],0,3),0);assert.ok(worst<.55);
const debt=[8,6,4,2,1],hit=0,next=debt.map((d,i)=>i===hit?0:Math.min(MAX_DEBT,d+1));assert.deepEqual(next,[0,7,5,3,2]);
console.log('spawn fairness regression checks passed');
''')
