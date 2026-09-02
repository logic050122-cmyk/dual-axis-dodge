import fs from 'node:fs';
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
