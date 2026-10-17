import assert from 'node:assert/strict';
import {lobbyHarness} from './helpers/lobby-harness.mjs';

function pairIndexes(memory){
  const pairs=new Map();
  memory.deck.forEach((card,index)=>{if(!pairs.has(card.pair))pairs.set(card.pair,[]);pairs.get(card.pair).push(index)});
  return [...pairs.values()];
}

{
  const h=lobbyHarness();h.api.setMode('challenge');h.api.openGame('memory');h.$('memoryStart').click();
  const state=h.api.state().memory,buttons=h.$('memoryBoard').children;
  assert.equal(state.previewing,true);assert.equal(state.busy,true);assert.equal(buttons.length,16);
  assert.ok(buttons.every(button=>button.disabled&&button.classList.contains('revealed')),'Preview must expose all cards while locking input');
  buttons[0].click();assert.equal(state.flipped.length,0,'Preview clicks must not enter recall play');
  h.advance(2999);assert.equal(state.previewing,true);
  h.advance(1);assert.equal(state.previewing,false);assert.equal(state.busy,false);
  assert.ok(buttons.every(button=>!button.disabled&&!button.classList.contains('revealed')),'All cards hide together when recall starts');
  assert.ok(h.$('gameMessage').textContent.includes('开始配对'));
  assert.equal(h.doc.activeElement,buttons[0],'Recall must move keyboard focus to the first playable card');

  const pairs=pairIndexes(state),[a,b]=pairs;
  buttons[a[0]].click();buttons[b[0]].click();
  assert.equal(state.moves,1);assert.equal(state.mismatches,1);assert.equal(state.streak,0);assert.equal(state.busy,true);
  assert.ok(h.$('gameMessage').textContent.includes('连对从头开始'));
  h.advance(820);
  for(const indexes of pairs)for(const index of indexes)buttons[index].click();
  assert.equal(state.finished,true);assert.equal(state.moves,9);assert.equal(state.mismatches,1);
  assert.equal(state.maxStreak,8);assert.equal(h.storage.get('playdot:v1:memory:challenge'),'9');
  const result=h.$('gameScene').querySelector('.result-card').textContent;
  assert.ok(result.includes('失配 1 次'));assert.ok(result.includes('最长连对 8 对'));assert.ok(result.includes('本盘第 1 次'));
  const firstDeck=state.deck.map(card=>card.id);
  h.$('memorySame').click();const replay=h.api.state().memory;
  assert.deepEqual(replay.deck.map(card=>card.id),firstDeck,'Same-board practice must preserve every card position');
  assert.equal(replay.attempt,2);assert.equal(replay.previous.moves,9);assert.equal(replay.previous.mismatches,1);
  assert.equal(replay.previewing,true);assert.equal(replay.moves,0);assert.ok(h.$('gameMessage').textContent.includes('同盘第 2 次'));
  h.advance(3000);for(const indexes of pairIndexes(replay))for(const index of indexes)h.$('memoryBoard').children[index].click();
  const comparison=h.$('gameScene').querySelector('.result-card').textContent;
  assert.ok(comparison.includes('步数 9→8'));assert.ok(comparison.includes('失配 1→0'));
  assert.equal(h.storage.get('playdot:v1:memory:challenge'),'9','Same-board practice must not improve the formal best after exposing the layout');
  h.$('memoryAgain').click();assert.equal(h.api.state().memory.attempt,1);assert.equal(h.api.state().memory.previous,null);
}

{
  const h=lobbyHarness();h.api.setMode('challenge');h.api.openGame('memory');h.$('memoryStart').click();
  h.doc.hidden=true;h.doc.emit('visibilitychange');
  assert.equal(h.api.state().memory,null);assert.equal(h.tasks.size,0);assert.ok(h.$('memoryStart'),'Backgrounding preview must return to a clean intro');
}

{
  const h=lobbyHarness();h.api.openGame('memory');h.$('memoryStart').click();
  assert.equal(h.api.state().memory.previewing,false);assert.equal(h.tasks.size,0,'Easy mode must remain immediately playable');
  assert.equal(h.doc.activeElement,h.$('memoryBoard').children[0],'Easy start must move keyboard focus into the board');
  h.$('memoryBoard').children[0].click();assert.equal(h.api.state().memory.flipped.length,1);
}

{
  const h=lobbyHarness();h.api.openGame('memory');h.$('memoryStart').click();
  const state=h.api.state().memory,buttons=h.$('memoryBoard').children,pairs=pairIndexes(state),first=pairs[0];
  buttons[first[0]].click();buttons[first[1]].focus();buttons[first[1]].click();
  assert.equal(buttons[first[1]].disabled,true);assert.notEqual(h.doc.activeElement,buttons[first[1]],'Matched disabled card must not retain focus');
  assert.equal(h.doc.activeElement.disabled,false,'Focus must advance to another playable card');
  for(const indexes of pairs.slice(1))for(const index of indexes)buttons[index].click();
  assert.equal(h.doc.activeElement,h.$('memorySame'),'Completion must focus the primary replay action');
}

{
  const h=lobbyHarness();h.api.openGame('memory');h.$('memoryStart').click();
  const first=h.api.state().memory,deck=first.deck.map(card=>card.id);
  for(const indexes of pairIndexes(first))for(const index of indexes)h.$('memoryBoard').children[index].click();
  h.$('memorySame').click();
  assert.equal(h.api.state().memory.previewing,false,'Easy same-board practice must remain immediately playable');
  assert.deepEqual(h.api.state().memory.deck.map(card=>card.id),deck);assert.equal(h.api.state().memory.attempt,2);
}

console.log('Memory challenge regression passed: preview lock/boundary, keyboard focus, recall, streak, mismatch review, same-board record isolation/comparison, new board, lifecycle and unchanged easy mode');
