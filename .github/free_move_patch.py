from pathlib import Path
import re

path = Path('index.html')
text = path.read_text()


def replace_once(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'missing replacement anchor: {label}')
    text = text.replace(old, new, 1)


def sub_once(pattern, replacement, label, flags=0):
    global text
    text2, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'expected one regex match for {label}, got {count}')
    text = text2


layout_row = '<div class="mode-row"><button class="modebtn" id="normalModeBtn" type="button" aria-pressed="true">左横 · 右纵</button><button class="modebtn" id="swappedModeBtn" type="button" aria-pressed="false">左纵 · 右横</button></div>'
movement_row = '<div class="mode-row"><button class="modebtn" id="axisMoveBtn" type="button" aria-pressed="true">轴向锁定 · 经典</button><button class="modebtn" id="freeMoveBtn" type="button" aria-pressed="false">自由移动</button></div>'
replace_once(layout_row, layout_row + movement_row, 'start movement mode buttons')

pause_head = '<div class="setup pause-setup"><div class="setup-head"><span>TRACK POSITION</span><span>暂停可调</span></div>'
pause_move_row = '<div class="mode-row"><button class="modebtn" id="pauseAxisMoveBtn" type="button" aria-pressed="true">轴向锁定 · 经典</button><button class="modebtn" id="pauseFreeMoveBtn" type="button" aria-pressed="false">自由移动</button></div>'
replace_once(pause_head, pause_head + pause_move_row, 'pause movement mode buttons')
replace_once('位置和起始档位都会自动记住。纵向角色按“离中线距离”设置，左右互换时保持镜像对称。', '位置、起始档位和控制方式都会自动记住。轴向锁定保持经典单轴玩法；自由移动时两个角色都可在各自半屏任意拖动。', 'setup mode note')
replace_once('时间、角色和障碍都已冻结。可在这里重新校准两条固定轨道；障碍保持原位，恢复后仍会先进行倒计时。', '时间、角色和障碍都已冻结。可在这里切换轴向锁定/自由移动并重新校准起始位置；障碍保持原位，恢复后仍会先进行倒计时。', 'pause mode note')

replace_once("normalModeBtn=$('normalModeBtn'),swappedModeBtn=$('swappedModeBtn'),horizontalYInput", "normalModeBtn=$('normalModeBtn'),swappedModeBtn=$('swappedModeBtn'),axisMoveBtn=$('axisMoveBtn'),freeMoveBtn=$('freeMoveBtn'),pauseAxisMoveBtn=$('pauseAxisMoveBtn'),pauseFreeMoveBtn=$('pauseFreeMoveBtn'),horizontalYInput", 'mode dom refs')
replace_once("let swapped=storage.get('dualAxisSwapped','off')==='on';", "let swapped=storage.get('dualAxisSwapped','off')==='on';\n  let freeMove=storage.get('dualAxisMoveMode','axis')==='free';", 'movement state')
replace_once("const leftP={x:0,y:0,r:13,targetX:0},rightP={x:0,y:0,r:13,targetY:0};", "const leftP={x:0,y:0,r:13,targetX:0,targetY:0},rightP={x:0,y:0,r:13,targetX:0,targetY:0};", 'player target vectors')

replace_once("function bestForLevel(level=startLevel){const v=Number(levelBests[String(level)]);return Number.isFinite(v)&&v>=0?v:0}\n  function saveBestForLevel(level,score){levelBests[String(level)]=score;storage.set('dualAxisLevelBests',JSON.stringify(levelBests));if(level===1){best=score;storage.set('dualAxisBest',best.toFixed(3))}}", "function levelBestKey(level=startLevel){return freeMove?`free:${level}`:String(level)}\n  function bestForLevel(level=startLevel){const v=Number(levelBests[levelBestKey(level)]);return Number.isFinite(v)&&v>=0?v:0}\n  function saveBestForLevel(level,score){levelBests[levelBestKey(level)]=score;storage.set('dualAxisLevelBests',JSON.stringify(levelBests));if(!freeMove&&level===1){best=score;storage.set('dualAxisBest',best.toFixed(3))}}", 'separate mode bests')
replace_once("const run={score:Number(elapsed.toFixed(2)),level:lastStage,startLevel,nearMisses,axis:cause==='left'?'horizontal':'vertical',physicalSide:cause==='left'?(swapped?'right':'left'):(swapped?'left':'right'),swapped,at:Date.now()};", "const run={score:Number(elapsed.toFixed(2)),level:lastStage,startLevel,moveMode:freeMove?'free':'axis',nearMisses,axis:cause==='left'?'horizontal':'vertical',physicalSide:cause==='left'?(swapped?'right':'left'):(swapped?'left':'right'),swapped,at:Date.now()};", 'run movement mode')
replace_once("const runs=recentRuns.filter(r=>(Number(r.startLevel)||1)===startLevel).slice(-limit)", "const runs=recentRuns.filter(r=>(Number(r.startLevel)||1)===startLevel&&(r.moveMode||'axis')===(freeMove?'free':'axis')).slice(-limit)", 'balance mode filter 1')
replace_once("const runs=recentRuns.filter(r=>(Number(r.startLevel)||1)===startLevel).slice(-limit)", "const runs=recentRuns.filter(r=>(Number(r.startLevel)||1)===startLevel&&(r.moveMode||'axis')===(freeMove?'free':'axis')).slice(-limit)", 'balance mode filter 2')
replace_once("bestLabel.textContent=startLevel===1?'PERSONAL BEST':`LEVEL ${startLevel} BEST`", "bestLabel.textContent=freeMove?(startLevel===1?'FREE BEST':`FREE L${startLevel} BEST`):(startLevel===1?'PERSONAL BEST':`LEVEL ${startLevel} BEST`)", 'best label by movement mode')
replace_once("const bestName=startLevel===1?'PERSONAL BEST':`LEVEL ${startLevel} BEST`;", "const bestName=freeMove?(startLevel===1?'FREE BEST':`FREE L${startLevel} BEST`):(startLevel===1?'PERSONAL BEST':`LEVEL ${startLevel} BEST`);", 'game over best label')

sub_once(
    r"  function horizontalBounds\(pad=16\)\{.*?\n  function refreshFixedTracks\(\)\{.*?\}\n",
    """  function horizontalBounds(pad=16){return swapped?[split+leftP.r+pad,W-leftP.r-pad]:[leftP.r+pad,split-leftP.r-pad]}
  function verticalBounds(pad=16){return swapped?[rightP.r+pad,split-rightP.r-pad]:[split+rightP.r+pad,W-rightP.r-pad]}
  function roleYBounds(p,pad=18){return [64+p.r,H-p.r-pad]}
  function horizontalRoleY(){return clamp(H*horizontalTrackY,64+leftP.r,H-leftP.r-18)}
  function verticalRoleX(){const pad=rightP.r+18,offset=split*verticalTrackX;return swapped?clamp(split-offset,pad,split-pad):clamp(split+offset,split+pad,W-pad)}
  function syncSetupUI(){const hy=Math.round(horizontalTrackY*100),vx=Math.round(verticalTrackX*100);for(const el of [horizontalYInput,pauseHorizontalYInput])el.value=String(hy);for(const el of [verticalXInput,pauseVerticalXInput])el.value=String(vx);for(const el of [horizontalYValue,pauseHorizontalYValue])el.textContent=`${hy}%`;for(const el of [verticalXValue,pauseVerticalXValue])el.textContent=`${vx}%`;normalModeBtn.classList.toggle('active',!swapped);swappedModeBtn.classList.toggle('active',swapped);normalModeBtn.setAttribute('aria-pressed',String(!swapped));swappedModeBtn.setAttribute('aria-pressed',String(swapped));for(const el of [axisMoveBtn,pauseAxisMoveBtn]){el.classList.toggle('active',!freeMove);el.setAttribute('aria-pressed',String(!freeMove))}for(const el of [freeMoveBtn,pauseFreeMoveBtn]){el.classList.toggle('active',freeMove);el.setAttribute('aria-pressed',String(freeMove))}}
  function refreshFixedTracks(){if(freeMove)return;leftP.y=horizontalRoleY();leftP.targetY=leftP.y;rightP.x=verticalRoleX();rightP.targetX=rightP.x}
""",
    'setup helpers',
    flags=re.S,
)

sub_once(
    r"  function syncSideUI\(\)\{.*?\n  \}\n  function syncControlState",
    """  function syncSideUI(){
    leftZoneLabel.textContent=swapped?'LEFT HAND // VERTICAL':'LEFT HAND // HORIZONTAL';rightZoneLabel.textContent=swapped?'RIGHT HAND // HORIZONTAL':'RIGHT HAND // VERTICAL';
    const hMove=freeMove?'角色可自由移动':'角色仅左右移动',vMove=freeMove?'角色可自由移动':'角色仅上下移动';
    if(swapped){leftRule.innerHTML=`<b><span class="pink">LEFT</span> / 左手</b>按住左半屏拖动，${vMove}<br>障碍从中线向左`;rightRule.innerHTML=`<b><span class="cyan">RIGHT</span> / 右手</b>按住右半屏拖动，${hMove}<br>障碍从上向下`}else{leftRule.innerHTML=`<b><span class="cyan">LEFT</span> / 左手</b>按住左半屏拖动，${hMove}<br>障碍从上向下`;rightRule.innerHTML=`<b><span class="pink">RIGHT</span> / 右手</b>按住右半屏拖动，${vMove}<br>障碍从左向右`}
    swapBtn.setAttribute('aria-pressed',String(swapped));swapBtn.title=(swapped?'当前：左纵向 / 右横向':'当前：左横向 / 右纵向')+' · 点击互换（游戏中会暂停）';syncSetupUI();
  }
  function syncControlState""",
    'side ui',
    flags=re.S,
)

replace_once("function setModePositions(){refreshFixedTracks();leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}", "function setModePositions(){leftP.x=swapped?W*.75:W*.25;leftP.y=horizontalRoleY();leftP.targetX=leftP.x;leftP.targetY=leftP.y;rightP.x=verticalRoleX();rightP.y=H*.74;rightP.targetX=rightP.x;rightP.targetY=rightP.y}", 'initial positions')

sub_once(
    r"  function resize\(\)\{\n.*?\n  \}\n  window.addEventListener\('resize'",
    """  function resize(){
    const r=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);W=Math.max(1,r.width);H=Math.max(1,r.height);split=W/2;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    if(state==='idle'||state==='over')setModePositions();
    else{
      const [hx0,hx1]=horizontalBounds(10),[vx0,vx1]=verticalBounds(10),[ly0,ly1]=roleYBounds(leftP,14),[ry0,ry1]=roleYBounds(rightP,14);
      leftP.x=clamp(leftP.x,hx0,hx1);leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.y=clamp(rightP.y,ry0,ry1);rightP.targetY=clamp(rightP.targetY,ry0,ry1);
      if(freeMove){leftP.y=clamp(leftP.y,ly0,ly1);leftP.targetY=clamp(leftP.targetY,ly0,ly1);rightP.x=clamp(rightP.x,vx0,vx1);rightP.targetX=clamp(rightP.targetX,vx0,vx1)}else refreshFixedTracks();
    }
    if(!playable())interruptGame();
    lastTime=performance.now();
  }
  window.addEventListener('resize'""",
    'resize free movement',
    flags=re.S,
)

sub_once(
    r"  function mirrorLayout\(next\)\{.*?\}\n  function setSwap",
    """  function mirrorLayout(next){
    if(freeMove){leftP.x=W-leftP.x;leftP.targetX=W-leftP.targetX;rightP.x=W-rightP.x;rightP.targetX=W-rightP.targetX}else{const delta=next?split:-split;leftP.x+=delta;leftP.targetX+=delta}
    for(const o of obstacles){if(o.type==='left')o.x+=next?split:-split;else o.x=W-o.x-o.w}
    refreshFixedTracks();const [hx0,hx1]=horizontalBounds(),[vx0,vx1]=verticalBounds(),[ly0,ly1]=roleYBounds(leftP),[ry0,ry1]=roleYBounds(rightP);
    leftP.x=clamp(leftP.x,hx0,hx1);leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.y=clamp(rightP.y,ry0,ry1);rightP.targetY=clamp(rightP.targetY,ry0,ry1);
    if(freeMove){leftP.y=clamp(leftP.y,ly0,ly1);leftP.targetY=clamp(leftP.targetY,ly0,ly1);rightP.x=clamp(rightP.x,vx0,vx1);rightP.targetX=clamp(rightP.targetX,vx0,vx1)}
  }
  function setSwap""",
    'mirror free players',
    flags=re.S,
)

replace_once("function toggleSwap(){if(state==='running'||state==='countdown')interruptGame();setSwap(!swapped)}", "function toggleSwap(){if(state==='running'||state==='countdown')interruptGame();setSwap(!swapped)}\n  function setMoveMode(nextFree){if(state!=='idle'&&state!=='over'&&state!=='paused')return false;nextFree=!!nextFree;if(freeMove===nextFree){syncSideUI();return true}freeMove=nextFree;storage.set('dualAxisMoveMode',freeMove?'free':'axis');clearPointers();if(freeMove){leftP.targetX=leftP.x;leftP.targetY=leftP.y;rightP.targetX=rightP.x;rightP.targetY=rightP.y}else refreshFixedTracks();syncStartLevelUI();syncSideUI();draw();vibrate(12);playTick(freeMove?820:620,.05,.032);return true}", 'movement mode setter')
replace_once("function applySetupPosition(kind,value){if(state!=='idle'&&state!=='over'&&state!=='paused')return;const ratio=Number(value)/100;if(!Number.isFinite(ratio))return;if(kind==='horizontal'){horizontalTrackY=clamp(ratio,.55,.88);storage.set('dualAxisHorizontalY',horizontalTrackY.toFixed(3))}else{verticalTrackX=clamp(ratio,.30,.90);storage.set('dualAxisVerticalX',verticalTrackX.toFixed(3))}if(state==='paused')refreshFixedTracks();else setModePositions();syncSetupUI();showAdjustPreview(kind)}", "function applySetupPosition(kind,value){if(state!=='idle'&&state!=='over'&&state!=='paused')return;const ratio=Number(value)/100;if(!Number.isFinite(ratio))return;if(kind==='horizontal'){horizontalTrackY=clamp(ratio,.55,.88);storage.set('dualAxisHorizontalY',horizontalTrackY.toFixed(3))}else{verticalTrackX=clamp(ratio,.30,.90);storage.set('dualAxisVerticalX',verticalTrackX.toFixed(3))}if(state==='paused'){if(freeMove){if(kind==='horizontal'){leftP.y=horizontalRoleY();leftP.targetY=leftP.y}else{rightP.x=verticalRoleX();rightP.targetX=rightP.x}}else refreshFixedTracks()}else setModePositions();syncSetupUI();showAdjustPreview(kind)}", 'setup position in free mode')
replace_once("normalModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(false)});swappedModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(true)});startLevelSelect.addEventListener", "normalModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(false)});swappedModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(true)});for(const [btn,free] of [[axisMoveBtn,false],[freeMoveBtn,true],[pauseAxisMoveBtn,false],[pauseFreeMoveBtn,true]])btn.addEventListener('click',e=>{e.stopPropagation();setMoveMode(free)});startLevelSelect.addEventListener", 'movement button events')

sub_once(
    r"  function update\(dt\)\{\n.*?\n  \}\n\n  function line",
    """  function update(dt){
    if(state!=='running'||document.hidden||!playable())return;
    elapsed+=dt;scoreEl.textContent=elapsed.toFixed(1);const stage=startLevel+Math.floor(elapsed/10);if(stage>lastStage){lastStage=stage;flashStage(stage)}
    const [hx0,hx1]=horizontalBounds(),[vx0,vx1]=verticalBounds(),[ly0,ly1]=roleYBounds(leftP),[ry0,ry1]=roleYBounds(rightP);
    leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.targetY=clamp(rightP.targetY,ry0,ry1);
    if(freeMove){leftP.targetY=clamp(leftP.targetY,ly0,ly1);rightP.targetX=clamp(rightP.targetX,vx0,vx1)}else refreshFixedTracks();
    const prevLX=leftP.x,prevLY=leftP.y,prevRX=rightP.x,prevRY=rightP.y,follow=followAlpha(dt);
    let nextLX=prevLX+(leftP.targetX-prevLX)*follow,nextLY=freeMove?prevLY+(leftP.targetY-prevLY)*follow:prevLY,nextRX=freeMove?prevRX+(rightP.targetX-prevRX)*follow:prevRX,nextRY=prevRY+(rightP.targetY-prevRY)*follow;
    if(freeMove){
      const wasdX=keyAxis('KeyA','KeyD'),wasdY=keyAxis('KeyW','KeyS'),arrowX=keyAxis('ArrowLeft','ArrowRight'),arrowY=keyAxis('ArrowUp','ArrowDown');
      const cyanX=swapped?arrowX:wasdX,cyanY=swapped?arrowY:wasdY,pinkX=swapped?wasdX:arrowX,pinkY=swapped?wasdY:arrowY;
      if(cyanX){nextLX=clamp(prevLX+cyanX*keyboardHorizontalSpeed()*dt,hx0,hx1);leftP.targetX=nextLX}if(cyanY){nextLY=clamp(prevLY+cyanY*keyboardVerticalSpeed()*dt,ly0,ly1);leftP.targetY=nextLY}
      if(pinkX){nextRX=clamp(prevRX+pinkX*keyboardHorizontalSpeed()*dt,vx0,vx1);rightP.targetX=nextRX}if(pinkY){nextRY=clamp(prevRY+pinkY*keyboardVerticalSpeed()*dt,ry0,ry1);rightP.targetY=nextRY}
    }else{
      const hKey=keyboardAxis('KeyA','ArrowLeft','KeyD','ArrowRight'),vKey=keyboardAxis('KeyW','ArrowUp','KeyS','ArrowDown');
      if(hKey){nextLX=clamp(prevLX+hKey*keyboardHorizontalSpeed()*dt,hx0,hx1);leftP.targetX=nextLX}if(vKey){nextRY=clamp(prevRY+vKey*keyboardVerticalSpeed()*dt,ry0,ry1);rightP.targetY=nextRY}
    }
    spawnLeft-=dt;spawnRight-=dt;if(spawnLeft<=0){spawn('left');spawnLeft=spawnGap()*(.78+Math.random()*.58)}if(spawnRight<=0){spawn('right');spawnRight=spawnGap()*(.82+Math.random()*.62)}
    nearMissCooldown=Math.max(0,nearMissCooldown-dt);
    const maxObstacleMove=Math.max(leftSpeed(),rightSpeed())*dt,maxPlayerMove=Math.max(Math.hypot(nextLX-prevLX,nextLY-prevLY),Math.hypot(nextRX-prevRX,nextRY-prevRY));
    const steps=Math.max(1,Math.ceil(Math.max(maxObstacleMove,maxPlayerMove)/7)),stepDt=dt/steps;
    for(let s=1;s<=steps;s++){
      const t=s/steps;leftP.x=prevLX+(nextLX-prevLX)*t;leftP.y=prevLY+(nextLY-prevLY)*t;rightP.x=prevRX+(nextRX-prevRX)*t;rightP.y=prevRY+(nextRY-prevRY)*t;
      const ls=leftSpeed(),rs=rightSpeed();
      for(let i=obstacles.length-1;i>=0;i--){
        const o=obstacles[i];if(o.type==='left')o.y+=ls*stepDt;else o.x+=(swapped?-rs:rs)*stepDt;const p=o.type==='left'?leftP:rightP;
        if(hitCircleRect(p,o)){gameOver(o.type);return}
        if(!o.near&&nearMissCooldown<=0&&nearCircleRect(p,o)){o.near=true;nearMissCooldown=.22;showNearMiss()}
        if((o.type==='left'&&o.y>H+50)||(o.type==='right'&&(swapped?o.x+o.w<-50:o.x>W+50)))obstacles.splice(i,1);
      }
    }
    bgPhase+=dt*(15+difficulty()*9);
  }

  function line""",
    'free movement update',
    flags=re.S,
)

replace_once("function draw(){drawBackground();for(const o of obstacles)drawObstacle(o);glowCircle(leftP,'#38e8ff');glowCircle(rightP,'#ff3da6');ctx.save();ctx.setLineDash([5,8]);ctx.lineWidth=1;ctx.strokeStyle='rgba(56,232,255,.18)';ctx.beginPath();ctx.moveTo(swapped?split+18:18,leftP.y);ctx.lineTo(swapped?W-18:split-18,leftP.y);ctx.stroke();ctx.strokeStyle='rgba(255,61,166,.18)';ctx.beginPath();ctx.moveTo(rightP.x,64);ctx.lineTo(rightP.x,H-18);ctx.stroke();ctx.restore();drawAdjustmentPreview()}", "function draw(){drawBackground();for(const o of obstacles)drawObstacle(o);glowCircle(leftP,'#38e8ff');glowCircle(rightP,'#ff3da6');if(!freeMove){ctx.save();ctx.setLineDash([5,8]);ctx.lineWidth=1;ctx.strokeStyle='rgba(56,232,255,.18)';ctx.beginPath();ctx.moveTo(swapped?split+18:18,leftP.y);ctx.lineTo(swapped?W-18:split-18,leftP.y);ctx.stroke();ctx.strokeStyle='rgba(255,61,166,.18)';ctx.beginPath();ctx.moveTo(rightP.x,64);ctx.lineTo(rightP.x,H-18);ctx.stroke();ctx.restore()}drawAdjustmentPreview()}", 'hide fixed tracks in free mode')
replace_once("const keyboardAxis=(negA,negB,posA,posB)=>(keyboardHeld.has(posA)||keyboardHeld.has(posB)?1:0)-(keyboardHeld.has(negA)||keyboardHeld.has(negB)?1:0);", "const keyboardAxis=(negA,negB,posA,posB)=>(keyboardHeld.has(posA)||keyboardHeld.has(posB)?1:0)-(keyboardHeld.has(negA)||keyboardHeld.has(negB)?1:0);\n  const keyAxis=(neg,pos)=>(keyboardHeld.has(pos)?1:0)-(keyboardHeld.has(neg)?1:0);", 'free keyboard axes')

sub_once(
    r"  function applyPointer\(side,p\)\{\n.*?\n  \}\n  if\('PointerEvent'",
    """  function applyPointer(side,p){
    const horizontal=(side==='left')!==swapped;
    if(freeMove){if(horizontal){leftP.targetX=p.x;leftP.targetY=p.y}else{rightP.targetX=p.x;rightP.targetY=p.y};return}
    if(horizontal){const minX=side==='left'?0:split,maxX=side==='left'?split:W;leftP.targetX=clamp(p.x,minX,maxX)}else rightP.targetY=p.y;
  }
  if('PointerEvent'""",
    'free touch movement',
    flags=re.S,
)

replace_once("startLevel,difficultyElapsed:Number(difficultyElapsed().toFixed(2)),swapped,horizontalTrackY", "startLevel,difficultyElapsed:Number(difficultyElapsed().toFixed(2)),swapped,moveMode:freeMove?'free':'axis',leftY:Number(leftP.y.toFixed(1)),rightX:Number(rightP.x.toFixed(1)),leftTargetY:Number(leftP.targetY.toFixed(1)),rightTargetX:Number(rightP.targetX.toFixed(1)),horizontalTrackY", 'health movement mode')

path.write_text(text)

sw = Path('sw.js')
sw_text = sw.read_text()
if "dual-axis-dodge-v2" in sw_text:
    sw_text = sw_text.replace("dual-axis-dodge-v2", "dual-axis-dodge-v3", 1)
elif "dual-axis-dodge-v3" not in sw_text:
    raise SystemExit('unexpected service-worker cache version')
sw.write_text(sw_text)

scripts = re.findall(r'<script>(.*?)</script>', text, re.S)
if not scripts:
    raise SystemExit('no inline script found')
Path('/tmp/game.js').write_text(scripts[-1])
required = [
    'id="freeMoveBtn"',
    'dualAxisMoveMode',
    "moveMode:freeMove?'free':'axis'",
    'Math.hypot(nextLX-prevLX,nextLY-prevLY)',
    'const keyAxis=(neg,pos)',
    'if(freeMove){if(horizontal){leftP.targetX=p.x;leftP.targetY=p.y}',
    'leftP.x=W-leftP.x',
    'rightP.x=W-rightP.x',
    'if(!freeMove){ctx.save()',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit('missing movement invariants: ' + repr(missing))
print('patch/static checks ok')
