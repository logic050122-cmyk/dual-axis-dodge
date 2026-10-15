import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Arcade script must exist');
const {chooseVisibleGame}=runInNewContext(script.split('const $=id=>')[0]+'\n({chooseVisibleGame})');
const a={name:'reaction'},b={name:'dodge'},c={name:'maze'};
const cards=[
  {hidden:false,querySelector:()=>a},
  {hidden:true,querySelector:()=>({name:'hidden'})},
  {hidden:false,querySelector:()=>b},
  {hidden:false,querySelector:()=>c}
];
assert.equal(chooseVisibleGame(cards,()=>0),a,'First visible game is selectable');
assert.equal(chooseVisibleGame(cards,()=>.5),b,'Hidden cards are not counted');
assert.equal(chooseVisibleGame(cards,()=>1),c,'Upper RNG boundary is clamped');
assert.equal(chooseVisibleGame(cards.filter(card=>card.hidden),()=>0),null,'Empty filtered category is safe');
assert.equal(chooseVisibleGame([{hidden:false,querySelector:()=>null}],()=>0),null,'Nonplayable cards are skipped');
assert.match(html,/<button[^>]+id="surpriseGame"[^>]*>🎲 随机玩一款<\/button>/);
assert.match(script,/chooseVisibleGame\(document\.querySelectorAll\('\.game-card'\)\)/);
assert.match(script,/if\(game\)game\.click\(\)/,'Reuse existing game routing and recent-history handling');
assert.match(script,/\$\('surpriseGame'\)\?\.addEventListener/,'Partial-DOM and degraded markup remain safe');
console.log('Surprise-game regression passed: filtered discovery, RNG boundaries and existing entry routing');
