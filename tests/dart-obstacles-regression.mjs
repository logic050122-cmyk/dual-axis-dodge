import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('  const DART_UNLOCK_TIME=8,DART_CHANCE=.14;');
const end=html.indexOf('\n  function hitCircleRect(',start);
assert.ok(start>=0&&end>start,'Dart variant must live in real spawn logic');
const code=html.slice(start,end);
function world({elapsed=12,swapped=false,W=844,H=390,random=0}={}){
  const split=W/2,obstacles=[];
  const math=Object.create(Math);math.random=()=>random;
  const scope={Math:math,elapsed,swapped,W,H,split,obstacles,
    lastLeftSpawn:-999,lastRightSpawn:-999,lastLeftSpawnAt:-1,lastRightSpawnAt:-1,
    sideCount:type=>obstacles.filter(o=>o.type===type).length,
    comboSafePosition:(_type,min,max)=>(min+max)/2};
  runInNewContext(code+'\nthis.spawnDart=spawn;',scope);
  return scope;
}
for(const W of [568,844]){
  for(const swapped of [false,true]){
    const a=world({W,H:W===568?320:390,swapped});
    a.spawnDart('left');a.spawnDart('right');
    const [cyan,pink]=a.obstacles;
    assert.equal(cyan.variant,'dart');assert.equal(pink.variant,'dart');
    assert.ok(Math.abs(cyan.h/cyan.w-1.45/.70)<.0001,'Cyan dart narrows across X');
    assert.ok(Math.abs(pink.w/pink.h-1.45/.70)<.0001,'Pink dart narrows across Y');
    assert.ok(cyan.y+cyan.h===0,'Cyan enters at same top leading edge');
    assert.ok(swapped?cyan.x>a.split&&cyan.x+cyan.w<W:cyan.x>=0&&cyan.x+cyan.w<a.split,'Cyan in assigned half');
    assert.ok(swapped?pink.x===a.split+5:Math.abs(pink.x+pink.w-(a.split-5))<1e-9,'Pink leading edge matches old spawn');
    assert.ok(cyan.w<a.split*.12&&pink.h<a.H*.12,'Narrow lane footprint on small screen');
    assert.ok(pink.y>=0&&pink.y+pink.h<a.H,'Pink within vertical play area');
    assert.ok(Math.max(cyan.w,pink.h)<=31,'No lateral footprint bigger than ordinary obstacles');
  }
}
const locked=world({elapsed:7.99});locked.spawnDart('left');locked.spawnDart('right');
assert.ok(locked.obstacles.every(o=>o.variant==='block'),'No special variants before 8 seconds');
const normal=world({random:.5});normal.spawnDart('left');normal.spawnDart('right');
assert.ok(normal.obstacles.every(o=>o.variant==='block'),'Most obstacles remain normal');
const capacity=world();for(let i=0;i<12;i++)capacity.spawnDart('left');
assert.equal(capacity.obstacles.length,9,'Per-side obstacle cap stays nine');
assert.match(html,/if\(o\.variant==='dart'\)/,'Darts have distinct visual stripes');
assert.match(html,/if\(hitCircleRect\(p,o\)\)/,'Darts retain ordinary collision');
assert.match(html,/const maxObstacleMove=Math\.max\(leftSpeed\(\),rightSpeed\(\)\)\*dt/,'Segmented collision remains');
console.log('Mobile dart obstacle regression: passed');
