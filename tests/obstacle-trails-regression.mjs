import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../games/dual-axis-dodge/index.html',import.meta.url),'utf8');
const start=html.indexOf('  function drawObstacleTrail(o){');
assert.ok(start>=0,'Obstacle trail rendering is missing');
const end=html.indexOf('\n  function drawObstacle(o){',start);
assert.ok(end>start,'Obstacle trail must be separate from physics');
const code=html.slice(start,end);
const rectangles=[];
let style='';
const canvas={
  save(){}, restore(){}, set fillStyle(value){style=value;},
  fillRect(x,y,w,h){rectangles.push({x,y,w,h,color:style})}
};
const world={reducedMotion:false,swapped:false,split:420,ctx:canvas,leftSpeed:()=>450,rightSpeed:()=>700};
runInNewContext(code+'\nthis.renderTrail=drawObstacleTrail;',world);
function trail(o){rectangles.length=0;const previous=JSON.stringify(o);world.renderTrail(o);assert.equal(JSON.stringify(o),previous,'Rendering must never mutate physics');return rectangles.slice()}
const cyan=trail({type:'left',x:200,y:130,w:20,h:20});
assert.equal(cyan.length,2);
for(const r of cyan){assert.ok(r.y>=0&&r.y+r.h<=130,'Cyan trail above falling obstacle');assert.ok(r.x>=200&&r.x+r.w<=220)}
assert.match(cyan[0].color,/53,223,245/);
const pink=trail({type:'right',x:515,y:170,w:20,h:20});
assert.equal(pink.length,2);
for(const r of pink){assert.ok(r.x>=420&&r.x+r.w<=515,'Right-going pink trail behind and within its half');assert.ok(r.y>=170&&r.y+r.h<=190)}
assert.match(pink[0].color,/255,74,171/);
world.swapped=true;
const mirror=trail({type:'right',x:275,y:170,w:20,h:20});
assert.equal(mirror.length,2);
for(const r of mirror)assert.ok(r.x>=295&&r.x+r.w<=420,'Mirrored pink trail must go rightward');
assert.equal(trail({type:'right',x:425,y:100,w:20,h:20}).length,0,'No trail across midline during mirror spawn');
world.swapped=false;
assert.equal(trail({type:'right',x:395,y:100,w:20,h:20}).length,0,'No trail across midline during normal spawn');
assert.equal(trail({type:'left',x:200,y:-5,w:20,h:20}).length,0,'Offscreen top trail must remain offscreen');
world.reducedMotion=true;
assert.equal(trail({type:'left',x:200,y:130,w:20,h:20}).length,0,'Reduced motion disables cyan trails');
assert.equal(trail({type:'right',x:515,y:170,w:20,h:20}).length,0,'Reduced motion disables pink trails');
assert.match(html,/function drawObstacle\(o\)\{\s*drawObstacleTrail\(o\);\s*const color=/,'Trail draws behind solid hitbox');
console.log('Obstacle visual trails regression: passed');
