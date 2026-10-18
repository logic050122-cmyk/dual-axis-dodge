import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const game=fs.readFileSync(new URL('games/dual-axis-dodge/index.html',root),'utf8');
const sw=fs.readFileSync(new URL('sw.js',root),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Missing arcade gameplay script');
new Script(script,{filename:'arcade-inline.js'});
assert.match(html,/href="\.\/games\/dual-axis-dodge\/"/);
for(const label of ['反应力测试','精准点击','记忆翻牌','双轴闪避','节奏记忆','开始游戏'])assert.ok(html.includes(label),'Missing UI: '+label);
assert.doesNotMatch(html,/轻松玩|挑战一下|data-mode=/,'Global mode selector must be absent');
const logic=runInNewContext(script.split('const $=id=>')[0]+'\n({MODES,median,accuracy,memoryDeck,targetPosition})');
assert.equal(logic.median([120,180,210,250]),195);
assert.equal(logic.accuracy(3,4),75);
assert.ok(logic.MODES.easy.aimSize>logic.MODES.challenge.aimSize);
assert.equal(logic.MODES.easy.memoryPreview,3000,'The default memory game must reveal all cards for three seconds');
for(const n of [6,8]){
  const cards=logic.memoryDeck(n);assert.equal(cards.length,n*2);
  const counts=new Map();for(const c of cards)counts.set(c.pair,(counts.get(c.pair)||0)+1);
  assert.ok([...counts.values()].every(v=>v===2));
}
for(const [w,h] of [[568,320],[390,844],[844,390]]){
  const p=logic.targetPosition(w,h,44,()=>1);
  assert.ok(p.x>=0&&p.x+44<=w&&p.y>=0&&p.y+44<=h);
}
assert.match(game,/navigator\.serviceWorker\.register\('\.\.\/\.\.\/sw\.js'/);
assert.match(game,/function spawn\(type\)/);
assert.match(game,/function update\(dt\)/);
assert.match(sw,/DODGE_PAGE/);
new Script(sw);
assert.match(fs.readFileSync(new URL('manifest.webmanifest',root),'utf8'),/PLAYDOT/);
console.log('PLAYDOT arcade migration regression passed');
