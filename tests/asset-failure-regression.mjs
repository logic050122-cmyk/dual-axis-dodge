import assert from 'node:assert/strict';
import {lobbyHarness} from './helpers/lobby-harness.mjs';
const seed={'playdot:v1:recent':'["odd","maze","memory","constructor"]','playdot:v1:reaction:easy':'210'};
const missing=lobbyHarness({extensionsLoaded:false,seed});
assert.ok(missing.$('assetNotice')&&!missing.$('assetNotice').hidden,'Missing game bundle must have a visible recovery path');
for(const name of ['odd','line','pulse','sort','maze']){
  const button=missing.root.querySelectorAll('[data-open]').find(button=>button.dataset.open===name);
  assert.equal(button.disabled,true);assert.ok(button.textContent.includes('未加载'));
}
for(const name of ['reaction','aim','memory','sequence']){
  const h=name==='reaction'?missing:lobbyHarness({extensionsLoaded:false});
  const button=h.root.querySelectorAll('[data-open]').find(button=>button.dataset.open===name);
  assert.equal(button.disabled,false);button.click();assert.equal(h.api.state().currentGame,name);
  h.api.showLobby();h.advance(0);
}
assert.ok(missing.$('recentList').textContent.includes('找出不同'),'A missing bundle cannot erase recent game identity');
assert.ok(JSON.parse(missing.storage.get('playdot:v1:recent')).includes('odd'));
assert.equal(missing.storage.get('playdot:v1:reaction:easy'),'210');
missing.$('retryAssets').click();assert.equal(missing.reloads(),1);
const healthy=lobbyHarness({seed:Object.fromEntries(missing.storage)});
assert.equal(healthy.$('assetNotice').hidden,true);
assert.equal(healthy.root.querySelectorAll('[data-open]').filter(button=>button.disabled).length,0);
const recentOdd=healthy.$('recentList').children.find(button=>button.textContent.includes('找出不同'));
assert.ok(recentOdd);assert.equal(recentOdd.disabled,false);recentOdd.click();assert.equal(healthy.api.state().currentGame,'odd');
console.log('Asset failure regression passed: visible retry, playable fallback, preserved history and healthy reload');
