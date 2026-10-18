import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {lobbyHarness} from './helpers/lobby-harness.mjs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
const rules=runInNewContext(script.split('const $=id=>')[0]+'\n({reactionChoices,median})');
function pointerTap(element){element.emit('pointerdown',{button:0,isPrimary:true});element.emit('click',{detail:1})}

for(let seed=0;seed<5000;seed++){
  let value=(seed+.5)/5000;
  const directions=rules.reactionChoices(5,()=>{value=(value*16807)%1;return value});
  assert.equal(directions.length,5);assert.ok(directions.every(side=>side==='left'||side==='right'));
  const left=directions.filter(side=>side==='left').length;
  assert.ok(left===2||left===3,'Each hand must receive two or three valid signals');
  assert.ok(!directions.some((side,index)=>index>1&&side===directions[index-1]&&side===directions[index-2]),'Never repeat one side three times');
}

{
  const h=lobbyHarness();h.api.setMode('challenge');h.api.openGame('reaction');h.$('reactionStart').click();
  const state=h.api.state().reaction,buttons=h.$('reactionPad').querySelectorAll('[data-reaction-choice]');
  assert.equal(buttons.length,2);assert.ok(buttons.every(button=>!button.disabled));assert.equal(state.directions.length,5);
  buttons[0].emit('pointerdown',{button:0,isPrimary:false});assert.equal(state.falseStarts,0,'Secondary pointers must not submit an input');

  pointerTap(buttons[0]);assert.equal(state.falseStarts,1);assert.equal(state.phase,'early');
  h.advance(900);h.advance(3300);assert.equal(state.phase,'go');
  const wrong=state.direction==='left'?'right':'left';
  pointerTap(buttons.find(button=>button.dataset.reactionChoice===wrong));
  assert.equal(state.wrongChoices,1);assert.equal(state.values.length,0);assert.equal(state.phase,'wrong');
  assert.ok(h.$('gameMessage').textContent.includes('应该按'));

  h.advance(900);
  for(let round=0;round<5;round++){
    while(state.phase!=='go')h.advance(10);
    h.advance(200+round*10);
    pointerTap(buttons.find(button=>button.dataset.reactionChoice===state.direction));
    if(round<4)h.advance(1050);
  }
  assert.equal(state.values.length,5);assert.equal(state.wrongChoices,1);assert.equal(state.falseStarts,1);
  assert.equal(h.storage.get('playdot:v1:reaction:challenge'),String(Math.round(rules.median(state.values))));
  const result=h.$('gameScene').querySelector('.result-card').textContent;
  assert.ok(result.includes('方向失误 1 次'));assert.ok(result.includes('抢跑 1 次'));
  h.$('reactionAgain').click();assert.equal(h.api.state().reaction.wrongChoices,0);assert.equal(h.api.state().reaction.values.length,0);
}

{
  const h=lobbyHarness();h.api.openGame('reaction');h.$('reactionStart').click();
  const state=h.api.state().reaction;while(state.phase!=='go')h.advance(10);
  h.jump(123-(h.clock()-state.readyAt));pointerTap(h.$('reactionPad'));
  assert.equal(state.values[0],123,'Pointer-down time, not the later release click, determines the reaction score');
  assert.equal(state.values.length,1,'The synthetic click following pointer-down must not count twice');
}
{
  const h=lobbyHarness();h.api.openGame('reaction');h.$('reactionStart').click();
  const state=h.api.state().reaction;while(state.phase!=='go')h.advance(10);
  h.jump(80-(h.clock()-state.readyAt));h.$('reactionPad').emit('click',{detail:0});
  assert.equal(state.values[0],80,'Keyboard and assistive-technology click activation remains supported');
}
{
  const h=lobbyHarness({pointerEvents:false});h.api.openGame('reaction');h.$('reactionStart').click();
  const state=h.api.state().reaction;while(state.phase!=='go')h.advance(10);
  h.$('reactionPad').click();assert.equal(state.values.length,1,'Browsers without Pointer Events retain click fallback');
}
{
  const h=lobbyHarness();h.api.openGame('reaction');h.$('reactionStart').click();
  assert.equal(h.$('reactionPad').tagName,'BUTTON');assert.equal(h.api.state().reaction.directions.length,0);
  h.advance(3300);h.advance(180);pointerTap(h.$('reactionPad'));
  assert.equal(h.api.state().reaction.values.length,1,'Easy mode keeps the original single-button response');
}

{
  const h=lobbyHarness();h.api.setMode('challenge');h.api.openGame('reaction');h.$('reactionStart').click();
  h.doc.hidden=true;h.doc.emit('visibilitychange');
  assert.equal(h.api.state().reaction,null);assert.equal(h.tasks.size,0);assert.ok(h.$('reactionStart'));
}

console.log('Reaction choice regression passed: fair directions, pointer-down timing, keyboard fallback, false starts, wrong/correct feedback, replay and lifecycle');
