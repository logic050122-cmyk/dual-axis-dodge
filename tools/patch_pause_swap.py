from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'missing patch target: {label}')
    s = s.replace(old, new, 1)


replace_once(
    ".controls{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:flex;gap:8px;pointer-events:auto}",
    ".controls{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:flex;gap:8px;pointer-events:auto;z-index:10}",
    'controls z-index',
)
replace_once(
    ".iconbtn{width:42px;height:42px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(8,14,31,.68);color:#cfeaf2;font-size:17px;backdrop-filter:blur(10px);touch-action:manipulation}",
    ".iconbtn{width:42px;height:42px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(8,14,31,.68);color:#cfeaf2;font-size:17px;backdrop-filter:blur(10px);touch-action:manipulation}.iconbtn:disabled{opacity:.3;filter:saturate(.35)}",
    'disabled control style',
)
replace_once(".zone-label.right{right:112px}", ".zone-label.right{right:214px}", 'right zone spacing')
replace_once(".zone-label.right{right:100px}", ".zone-label.right{right:194px}", 'small right zone spacing')

replace_once(
    '<div class="zone-label left">LEFT HAND // HORIZONTAL</div><div class="zone-label right">RIGHT HAND // VERTICAL</div>\n    <div class="controls"><button class="iconbtn" id="fullscreenBtn" type="button" aria-label="全屏">⛶</button><button class="iconbtn" id="audioBtn" type="button" aria-label="切换音乐">♫</button></div>',
    '<div class="zone-label left" id="leftZoneLabel">LEFT HAND // HORIZONTAL</div><div class="zone-label right" id="rightZoneLabel">RIGHT HAND // VERTICAL</div>\n    <div class="controls"><button class="iconbtn" id="swapBtn" type="button" aria-label="左右半屏互换" aria-pressed="false">⇄</button><button class="iconbtn" id="pauseBtn" type="button" aria-label="暂停" disabled>Ⅱ</button><button class="iconbtn" id="fullscreenBtn" type="button" aria-label="全屏">⛶</button><button class="iconbtn" id="audioBtn" type="button" aria-label="切换音乐">♫</button></div>',
    'hud controls',
)
replace_once(
    '<p class="subtitle">同一个人双手同时操作。左手只控制左右，右手只控制上下。任何一边碰到方块，立即结束。</p>\n      <div class="rulegrid"><div class="rule"><b><span class="cyan">LEFT</span> / 左手</b>按住左半屏拖动，角色仅左右移动<br>障碍从上向下</div><div class="rule"><b><span class="pink">RIGHT</span> / 右手</b>按住右半屏拖动，角色仅上下移动<br>障碍从左向右</div></div>',
    '<p class="subtitle">同一个人双手同时操作。两个半屏可以互换：横向模式只左右移动，纵向模式只上下移动。任何一边碰到方块，立即结束。</p>\n      <div class="rulegrid"><div class="rule" id="leftRule"><b><span class="cyan">LEFT</span> / 左手</b>按住左半屏拖动，角色仅左右移动<br>障碍从上向下</div><div class="rule" id="rightRule"><b><span class="pink">RIGHT</span> / 右手</b>按住右半屏拖动，角色仅上下移动<br>障碍从左向右</div></div>',
    'dynamic rules',
)
replace_once(
    '  <div class="rotate"><div><strong>↻ 请横屏游戏</strong><span>横屏才能同时使用左右手控制两个角色；旋回横屏后会从原进度继续。</span></div></div>',
    '  <div class="overlay" id="pauseOverlay" style="display:none"><div class="panel"><div class="eyebrow">SYNC HOLD</div><div class="title">PAUSED</div><p class="subtitle">时间、角色和障碍都已冻结。恢复后会先进行 3 · 2 · 1 倒计时。</p><button class="start" id="resumeBtn" type="button">RESUME</button><div class="hint">也可以点击右下角 ▶ 继续</div></div></div>\n\n  <div class="rotate"><div><strong>↻ 请横屏游戏</strong><span>横屏才能同时使用左右手控制两个角色；旋回横屏后会从原进度继续。</span></div></div>',
    'pause overlay',
)

replace_once(
    "  const canvas=$('game'),ctx=canvas.getContext('2d'),scoreEl=$('score'),bestEl=$('best'),finalScoreEl=$('finalScore'),recordText=$('recordText'),sessionText=$('sessionText'),startOverlay=$('startOverlay'),gameover=$('gameover'),stageFlash=$('stageFlash'),nearMissEl=$('nearMiss'),countdownEl=$('countdown'),levelEl=$('level'),nearCountEl=$('nearCount'),audioBtn=$('audioBtn'),fullscreenBtn=$('fullscreenBtn');",
    "  const canvas=$('game'),ctx=canvas.getContext('2d'),scoreEl=$('score'),bestEl=$('best'),finalScoreEl=$('finalScore'),recordText=$('recordText'),sessionText=$('sessionText'),startOverlay=$('startOverlay'),gameover=$('gameover'),pauseOverlay=$('pauseOverlay'),stageFlash=$('stageFlash'),nearMissEl=$('nearMiss'),countdownEl=$('countdown'),levelEl=$('level'),nearCountEl=$('nearCount'),audioBtn=$('audioBtn'),fullscreenBtn=$('fullscreenBtn'),pauseBtn=$('pauseBtn'),swapBtn=$('swapBtn'),leftZoneLabel=$('leftZoneLabel'),rightZoneLabel=$('rightZoneLabel'),leftRule=$('leftRule'),rightRule=$('rightRule');",
    'dom refs',
)
replace_once(
    "  let best=Number(storage.get('dualAxisBest','0'));if(!Number.isFinite(best)||best<0)best=0;",
    "  let best=Number(storage.get('dualAxisBest','0'));if(!Number.isFinite(best)||best<0)best=0;\n  let swapped=storage.get('dualAxisSwapped','off')==='on';",
    'swapped setting',
)

replace_once(
    "  function playable(){return W>=H||W>900}",
    """  function horizontalBounds(pad=16){return swapped?[split+leftP.r+pad,W-leftP.r-pad]:[leftP.r+pad,split-leftP.r-pad]}
  function syncSideUI(){
    leftZoneLabel.textContent=swapped?'LEFT HAND // VERTICAL':'LEFT HAND // HORIZONTAL';rightZoneLabel.textContent=swapped?'RIGHT HAND // HORIZONTAL':'RIGHT HAND // VERTICAL';
    if(swapped){leftRule.innerHTML='<b><span class=\"pink\">LEFT</span> / 左手</b>按住左半屏拖动，角色仅上下移动<br>障碍从左向右';rightRule.innerHTML='<b><span class=\"cyan\">RIGHT</span> / 右手</b>按住右半屏拖动，角色仅左右移动<br>障碍从上向下'}else{leftRule.innerHTML='<b><span class=\"cyan\">LEFT</span> / 左手</b>按住左半屏拖动，角色仅左右移动<br>障碍从上向下';rightRule.innerHTML='<b><span class=\"pink\">RIGHT</span> / 右手</b>按住右半屏拖动，角色仅上下移动<br>障碍从左向右'}
    swapBtn.setAttribute('aria-pressed',String(swapped));swapBtn.title=swapped?'当前：左纵向 / 右横向':'当前：左横向 / 右纵向';
  }
  function syncControlState(){const canPause=state==='running'||state==='paused';pauseBtn.disabled=!canPause;pauseBtn.textContent=state==='paused'?'▶':'Ⅱ';pauseBtn.setAttribute('aria-label',state==='paused'?'继续':'暂停');swapBtn.disabled=!(state==='idle'||state==='over')}
  function setModePositions(){leftP.y=H*.76;rightP.x=swapped?W*.12:W*.88;leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}

  function playable(){return W>=H||W>900}""",
    'mode helpers',
)

replace_once(
    """    leftP.y=H*.76;rightP.x=W*.88;
    if(state==='idle'||state==='countdown'||state==='over'){leftP.x=W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}
    else{leftP.x=clamp(leftP.x,leftP.r+10,split-leftP.r-10);leftP.targetX=clamp(leftP.targetX,leftP.r+10,split-leftP.r-10);rightP.y=clamp(rightP.y,64+rightP.r,H-rightP.r-14);rightP.targetY=clamp(rightP.targetY,64+rightP.r,H-rightP.r-14)}""",
    """    leftP.y=H*.76;rightP.x=swapped?W*.12:W*.88;const [hx0,hx1]=horizontalBounds(10);
    if(state==='idle'||state==='countdown'||state==='over'){leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}
    else{leftP.x=clamp(leftP.x,hx0,hx1);leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.y=clamp(rightP.y,64+rightP.r,H-rightP.r-14);rightP.targetY=clamp(rightP.targetY,64+rightP.r,H-rightP.r-14)}""",
    'resize mode positions',
)
replace_once(
    "  resize();",
    "  resize();syncSideUI();syncControlState();",
    'initial ui sync',
)

replace_once(
    "    leftP.x=W*.25;leftP.targetX=leftP.x;leftP.y=H*.76;rightP.x=W*.88;rightP.y=H*.74;rightP.targetY=rightP.y;",
    "    setModePositions();lastLeftSpawn=-999;lastRightSpawn=-999;",
    'round positions',
)

replace_once(
    """  function startCountdown(){
    resetRound();startOverlay.style.display='none';gameover.style.display='none';state='countdown';ensureAudio();acquireWakeLock();const token=++countdownToken;
    const seq=['3','2','1','GO'];let i=0;
    const tick=()=>{if(token!==countdownToken||state!=='countdown')return;countdownEl.textContent=seq[i];retrigger(countdownEl,'show');if(seq[i]!=='GO'){playTick(520+i*130,.055,.045);vibrate(12)}else{playTick(1040,.08,.055);vibrate([18,24,18])}i++;if(i<seq.length)setTimeout(tick,560);else setTimeout(()=>{if(token===countdownToken&&state==='countdown'){state='running';lastTime=performance.now()}},430)};
    tick();
  }
  $('startBtn').addEventListener('click',startCountdown);$('restartBtn').addEventListener('click',startCountdown);""",
    """  function runCountdown(reset){
    if(reset)resetRound();startOverlay.style.display='none';gameover.style.display='none';pauseOverlay.style.display='none';state='countdown';syncControlState();ensureAudio();acquireWakeLock();const token=++countdownToken;
    const seq=['3','2','1','GO'];let i=0;
    const tick=()=>{if(token!==countdownToken||state!=='countdown')return;countdownEl.textContent=seq[i];retrigger(countdownEl,'show');if(seq[i]!=='GO'){playTick(520+i*130,.055,.045);vibrate(12)}else{playTick(1040,.08,.055);vibrate([18,24,18])}i++;if(i<seq.length)setTimeout(tick,560);else setTimeout(()=>{if(token===countdownToken&&state==='countdown'){state='running';lastTime=performance.now();syncControlState()}},430)};
    tick();
  }
  function startCountdown(){runCountdown(true)}
  function pauseGame(){if(state!=='running')return;state='paused';activePointers.clear();releaseWakeLock();pauseOverlay.style.display='grid';syncControlState();playTick(330,.06,.035);vibrate(12)}
  function resumeCountdown(){if(state!=='paused')return;runCountdown(false)}
  function toggleSwap(){if(state!=='idle'&&state!=='over')return;swapped=!swapped;storage.set('dualAxisSwapped',swapped?'on':'off');obstacles=[];setModePositions();syncSideUI();syncControlState();draw();vibrate(15);playTick(swapped?720:560,.055,.035)}
  $('startBtn').addEventListener('click',startCountdown);$('restartBtn').addEventListener('click',startCountdown);$('resumeBtn').addEventListener('click',resumeCountdown);
  pauseBtn.addEventListener('click',e=>{e.stopPropagation();if(state==='running')pauseGame();else if(state==='paused')resumeCountdown()});swapBtn.addEventListener('click',e=>{e.stopPropagation();toggleSwap()});""",
    'pause and countdown state machine',
)

replace_once(
    "      const margin=28,maxX=Math.max(margin,split-margin-size),x=chooseSeparated(margin,maxX,lastLeftSpawn,Math.max(42,size*1.8));lastLeftSpawn=x;",
    "      const margin=28,minX=swapped?split+margin:margin,maxX=Math.max(minX,swapped?W-margin-size:split-margin-size),x=chooseSeparated(minX,maxX,lastLeftSpawn,Math.max(42,size*1.8));lastLeftSpawn=x;",
    'horizontal spawn side',
)
replace_once(
    "      obstacles.push({type,x:split-size-5,y,w:size,h:size,near:false});",
    "      obstacles.push({type,x:swapped?-size:split-size-5,y,w:size,h:size,near:false});",
    'vertical spawn side',
)

replace_once(
    "    if(state!=='running')return;state='over';activePointers.clear();releaseWakeLock();const score=elapsed,oldBest=best;",
    "    if(state!=='running')return;state='over';activePointers.clear();releaseWakeLock();syncControlState();const score=elapsed,oldBest=best;",
    'game over controls',
)
replace_once(
    "    leftP.targetX=clamp(leftP.targetX,leftP.r+16,split-leftP.r-16);rightP.targetY=clamp(rightP.targetY,64+rightP.r,H-rightP.r-18);",
    "    const [hx0,hx1]=horizontalBounds();leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.targetY=clamp(rightP.targetY,64+rightP.r,H-rightP.r-18);",
    'horizontal movement bounds',
)
replace_once(
    "        if((o.type==='left'&&o.y>H+50)||(o.type==='right'&&o.x>W+50))obstacles.splice(i,1);",
    "        if((o.type==='left'&&o.y>H+50)||(o.type==='right'&&o.x>(swapped?split+50:W+50)))obstacles.splice(i,1);",
    'vertical obstacle cleanup',
)

replace_once(
    "ctx.fillStyle='rgba(56,232,255,.025)';ctx.fillRect(0,0,split,H);ctx.fillStyle='rgba(255,61,166,.018)';ctx.fillRect(split,0,split,H);",
    "ctx.fillStyle='rgba(56,232,255,.025)';ctx.fillRect(swapped?split:0,0,split,H);ctx.fillStyle='rgba(255,61,166,.018)';ctx.fillRect(swapped?0:split,0,split,H);",
    'swapped lane tint',
)
replace_once(
    "ctx.beginPath();ctx.moveTo(18,leftP.y);ctx.lineTo(split-18,leftP.y);ctx.stroke();ctx.strokeStyle='rgba(255,61,166,.18)';",
    "ctx.beginPath();ctx.moveTo(swapped?split+18:18,leftP.y);ctx.lineTo(swapped?W-18:split-18,leftP.y);ctx.stroke();ctx.strokeStyle='rgba(255,61,166,.18)';",
    'horizontal guide lane',
)
replace_once(
    "  function applyPointer(side,p){if(side==='left')leftP.targetX=p.x;else rightP.targetY=p.y}",
    "  function applyPointer(side,p){const horizontal=(side==='left')!==swapped;if(horizontal)leftP.targetX=p.x;else rightP.targetY=p.y}",
    'swapped touch mapping',
)
replace_once(
    "  window.__dualAxisHealth=()=>({state,elapsed:Number(elapsed.toFixed(2)),obstacles:obstacles.length,leftX:Number(leftP.x.toFixed(1)),rightY:Number(rightP.y.toFixed(1)),leftTarget:Number(leftP.targetX.toFixed(1)),rightTarget:Number(rightP.targetY.toFixed(1)),level:lastStage,nearMisses,audioAvailable:!!(window.AudioContext||window.webkitAudioContext),playable:playable(),standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true});",
    "  window.__dualAxisHealth=()=>({state,elapsed:Number(elapsed.toFixed(2)),obstacles:obstacles.length,leftX:Number(leftP.x.toFixed(1)),rightY:Number(rightP.y.toFixed(1)),leftTarget:Number(leftP.targetX.toFixed(1)),rightTarget:Number(rightP.targetY.toFixed(1)),level:lastStage,nearMisses,swapped,audioAvailable:!!(window.AudioContext||window.webkitAudioContext),playable:playable(),standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true});",
    'health swapped status',
)

p.write_text(s, encoding='utf-8')
print('pause + side swap patch applied')
