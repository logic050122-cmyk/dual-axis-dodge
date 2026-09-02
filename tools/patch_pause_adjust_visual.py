from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    text = text.replace(old, new, 1)

replace_once(
"    .rulegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 12px}.rule{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px;background:rgba(255,255,255,.025);font-size:12px;color:#9fb5c5}.rule b{display:block;color:#edfaff;font-size:14px;margin-bottom:4px}.cyan{color:var(--cyan)}.pink{color:var(--pink)}\n",
"    .rulegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 12px}.rule{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px;background:rgba(255,255,255,.025);font-size:12px;color:#9fb5c5}.rule b{display:block;color:#edfaff;font-size:14px;margin-bottom:4px}.cyan{color:var(--cyan)}.pink{color:var(--pink)}\n    .adjust input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:34px;margin:0;background:transparent;touch-action:none}.adjust input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:99px;background:rgba(116,146,167,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}.adjust input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:26px;height:26px;margin-top:-9px;border-radius:50%;border:3px solid #eefcff;background:#0a1428;box-shadow:0 0 0 4px rgba(255,255,255,.08),0 0 20px currentColor}.adjust input[type=range]::-moz-range-track{height:8px;border:0;border-radius:99px;background:rgba(116,146,167,.28)}.adjust input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;border:3px solid #eefcff;background:#0a1428;box-shadow:0 0 0 4px rgba(255,255,255,.08),0 0 20px currentColor}#horizontalYInput,#pauseHorizontalYInput{color:var(--cyan);accent-color:var(--cyan)}#verticalXInput,#pauseVerticalXInput{color:var(--pink);accent-color:var(--pink)}#horizontalYInput::-webkit-slider-runnable-track,#pauseHorizontalYInput::-webkit-slider-runnable-track{background:linear-gradient(90deg,rgba(56,232,255,.22),rgba(56,232,255,.72))}#verticalXInput::-webkit-slider-runnable-track,#pauseVerticalXInput::-webkit-slider-runnable-track{background:linear-gradient(90deg,rgba(255,61,166,.22),rgba(255,61,166,.72))}\n",
'large range controls')

replace_once(
"    #startOverlay{z-index:12}.start-panel{max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain}.setup{margin:0 0 14px;padding:11px 12px 12px;border:1px solid rgba(111,232,255,.13);border-radius:15px;background:rgba(3,9,23,.38);text-align:left}.setup-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:9px;letter-spacing:.18em;color:#6f879b;font-weight:900}.mode-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.modebtn{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 7px;background:rgba(255,255,255,.025);color:#8fa5b9;font-size:10px;font-weight:850;letter-spacing:.06em;touch-action:manipulation}.modebtn.active{border-color:rgba(56,232,255,.48);background:rgba(56,232,255,.09);color:#e9fbff;box-shadow:inset 0 0 18px rgba(56,232,255,.05)}.adjust-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.adjust{display:block;min-width:0}.adjust-line{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:#a9bbc9}.adjust-line b{font-size:10px}.adjust-line em{font-style:normal;color:#eaf7ff;font-variant-numeric:tabular-nums}.adjust input{display:block;width:100%;height:24px;margin:3px 0 0;accent-color:#59dff1;touch-action:none}.adjust small{display:block;color:#62778a;font-size:8px;letter-spacing:.04em}.setup-note{margin-top:7px;color:#61768b;font-size:8px;line-height:1.35}\n",
"    #startOverlay{z-index:12}.start-panel{max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain}.setup{margin:0 0 14px;padding:11px 12px 12px;border:1px solid rgba(111,232,255,.13);border-radius:15px;background:rgba(3,9,23,.38);text-align:left}.setup-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:9px;letter-spacing:.18em;color:#6f879b;font-weight:900}.mode-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.modebtn{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 7px;background:rgba(255,255,255,.025);color:#8fa5b9;font-size:10px;font-weight:850;letter-spacing:.06em;touch-action:manipulation}.modebtn.active{border-color:rgba(56,232,255,.48);background:rgba(56,232,255,.09);color:#e9fbff;box-shadow:inset 0 0 18px rgba(56,232,255,.05)}.adjust-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.adjust{display:block;min-width:0}.adjust-line{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:#a9bbc9}.adjust-line b{font-size:10px}.adjust-line em{font-style:normal;color:#eaf7ff;font-variant-numeric:tabular-nums}.adjust small{display:block;color:#62778a;font-size:8px;letter-spacing:.04em}.setup-note{margin-top:7px;color:#61768b;font-size:8px;line-height:1.35}.pause-panel{width:min(620px,94vw);max-height:calc(100vh - 20px);overflow:auto;overscroll-behavior:contain}.pause-setup{margin:12px 0 10px}.pause-setup .setup-head span:last-child{color:#9defff}.pause-note{margin:0 0 12px;color:#6d8598;font-size:9px;line-height:1.4}#pauseOverlay.adjusting{background:rgba(2,5,15,.34);backdrop-filter:none}.adjust-hud{display:none;position:absolute;z-index:16;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);padding:8px 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(2,8,20,.9);font-size:11px;font-weight:950;letter-spacing:.12em;color:#f4fdff;box-shadow:0 0 28px rgba(56,232,255,.2);white-space:nowrap}.adjusting-position .adjust-hud{display:block}\n",
'pause setup css')

replace_once(
"    <div class=\"controls\"><button class=\"iconbtn\" id=\"swapBtn\" type=\"button\" aria-label=\"左右半屏互换\" aria-pressed=\"false\">⇄</button><button class=\"iconbtn\" id=\"pauseBtn\" type=\"button\" aria-label=\"暂停\" disabled>Ⅱ</button><button class=\"iconbtn\" id=\"fullscreenBtn\" type=\"button\" aria-label=\"全屏\">⛶</button><button class=\"iconbtn\" id=\"audioBtn\" type=\"button\" aria-label=\"切换音乐\">♫</button></div>\n",
"    <div class=\"controls\"><button class=\"iconbtn\" id=\"swapBtn\" type=\"button\" aria-label=\"左右半屏互换\" aria-pressed=\"false\">⇄</button><button class=\"iconbtn\" id=\"pauseBtn\" type=\"button\" aria-label=\"暂停\" disabled>Ⅱ</button><button class=\"iconbtn\" id=\"fullscreenBtn\" type=\"button\" aria-label=\"全屏\">⛶</button><button class=\"iconbtn\" id=\"audioBtn\" type=\"button\" aria-label=\"切换音乐\">♫</button></div>\n    <div class=\"adjust-hud\" id=\"adjustHud\">POSITION PREVIEW</div>\n",
'adjust hud')

replace_once(
"  <div class=\"overlay\" id=\"pauseOverlay\" style=\"display:none\"><div class=\"panel\"><div class=\"eyebrow\">SYNC HOLD</div><div class=\"title\">PAUSED</div><p class=\"subtitle\">时间、角色和障碍都已冻结。恢复后会先进行 3 · 2 · 1 倒计时。</p><button class=\"start\" id=\"resumeBtn\" type=\"button\">RESUME</button><div class=\"hint\">也可以点击右下角 ▶ 继续</div></div></div>\n",
"  <div class=\"overlay\" id=\"pauseOverlay\" style=\"display:none\"><div class=\"panel pause-panel\"><div class=\"eyebrow\">SYNC HOLD</div><div class=\"title\">PAUSED</div><p class=\"pause-note\">时间、角色和障碍都已冻结。可在这里重新校准两条固定轨道；障碍保持原位，恢复后仍会先进行倒计时。</p><div class=\"setup pause-setup\"><div class=\"setup-head\"><span>TRACK POSITION</span><span>暂停可调</span></div><div class=\"adjust-grid\"><label class=\"adjust\" for=\"pauseHorizontalYInput\"><span class=\"adjust-line\"><b class=\"cyan\">横向角色高度</b><em id=\"pauseHorizontalYValue\">76%</em></span><input id=\"pauseHorizontalYInput\" type=\"range\" min=\"55\" max=\"88\" step=\"1\" value=\"76\"><small>拖动时画面会高亮横向轨道</small></label><label class=\"adjust\" for=\"pauseVerticalXInput\"><span class=\"adjust-line\"><b class=\"pink\">纵向角色横位</b><em id=\"pauseVerticalXValue\">76%</em></span><input id=\"pauseVerticalXInput\" type=\"range\" min=\"30\" max=\"90\" step=\"1\" value=\"76\"><small>拖动时画面会高亮纵向轨道</small></label></div><div class=\"setup-note\">左右模式只在开局/结算切换，避免暂停时把已有障碍翻到另一侧。</div></div><button class=\"start\" id=\"resumeBtn\" type=\"button\">RESUME</button><div class=\"hint\">调完后恢复，会进行 3 · 2 · 1 同步倒计时</div></div></div>\n",
'pause overlay controls')

replace_once(
"leftRule=$('leftRule'),rightRule=$('rightRule'),normalModeBtn=$('normalModeBtn'),swappedModeBtn=$('swappedModeBtn'),horizontalYInput=$('horizontalYInput'),verticalXInput=$('verticalXInput'),horizontalYValue=$('horizontalYValue'),verticalXValue=$('verticalXValue');",
"leftRule=$('leftRule'),rightRule=$('rightRule'),normalModeBtn=$('normalModeBtn'),swappedModeBtn=$('swappedModeBtn'),horizontalYInput=$('horizontalYInput'),verticalXInput=$('verticalXInput'),horizontalYValue=$('horizontalYValue'),verticalXValue=$('verticalXValue'),pauseHorizontalYInput=$('pauseHorizontalYInput'),pauseVerticalXInput=$('pauseVerticalXInput'),pauseHorizontalYValue=$('pauseHorizontalYValue'),pauseVerticalXValue=$('pauseVerticalXValue'),adjustHud=$('adjustHud');",
'pause setup dom refs')

replace_once(
"  let horizontalTrackY=readSetupRatio('dualAxisHorizontalY',.76,.55,.88),verticalTrackX=readSetupRatio('dualAxisVerticalX',.76,.30,.90);\n",
"  let horizontalTrackY=readSetupRatio('dualAxisHorizontalY',.76,.55,.88),verticalTrackX=readSetupRatio('dualAxisVerticalX',.76,.30,.90),adjustingKind=null,adjustPreviewTimer=0;\n",
'adjustment state')

replace_once(
"  function syncSetupUI(){const hy=Math.round(horizontalTrackY*100),vx=Math.round(verticalTrackX*100);horizontalYInput.value=String(hy);verticalXInput.value=String(vx);horizontalYValue.textContent=`${hy}%`;verticalXValue.textContent=`${vx}%`;normalModeBtn.classList.toggle('active',!swapped);swappedModeBtn.classList.toggle('active',swapped);normalModeBtn.setAttribute('aria-pressed',String(!swapped));swappedModeBtn.setAttribute('aria-pressed',String(swapped))}\n",
"  function syncSetupUI(){const hy=Math.round(horizontalTrackY*100),vx=Math.round(verticalTrackX*100);for(const el of [horizontalYInput,pauseHorizontalYInput])el.value=String(hy);for(const el of [verticalXInput,pauseVerticalXInput])el.value=String(vx);for(const el of [horizontalYValue,pauseHorizontalYValue])el.textContent=`${hy}%`;for(const el of [verticalXValue,pauseVerticalXValue])el.textContent=`${vx}%`;normalModeBtn.classList.toggle('active',!swapped);swappedModeBtn.classList.toggle('active',swapped);normalModeBtn.setAttribute('aria-pressed',String(!swapped));swappedModeBtn.setAttribute('aria-pressed',String(swapped))}\n  function refreshFixedTracks(){leftP.y=horizontalRoleY();rightP.x=verticalRoleX()}\n  function endAdjustPreview(){adjustingKind=null;clearTimeout(adjustPreviewTimer);adjustPreviewTimer=0;document.body.classList.remove('adjusting-position');pauseOverlay.classList.remove('adjusting')}\n  function showAdjustPreview(kind){adjustingKind=kind;document.body.classList.add('adjusting-position');pauseOverlay.classList.toggle('adjusting',state==='paused');const value=kind==='horizontal'?Math.round(horizontalTrackY*100):Math.round(verticalTrackX*100);adjustHud.textContent=kind==='horizontal'?`横向轨道高度 ${value}%`:`纵向轨道横位 ${value}%`;clearTimeout(adjustPreviewTimer);adjustPreviewTimer=setTimeout(endAdjustPreview,900);draw()}\n",
'sync setup and preview helpers')

replace_once(
"  function setModePositions(){leftP.y=horizontalRoleY();rightP.x=verticalRoleX();leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}\n",
"  function setModePositions(){refreshFixedTracks();leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}\n",
'set mode positions')

replace_once(
"    if(reset)resetRound();startOverlay.style.display='none';gameover.style.display='none';pauseOverlay.style.display='none';state='countdown';",
"    endAdjustPreview();if(reset)resetRound();startOverlay.style.display='none';gameover.style.display='none';pauseOverlay.style.display='none';state='countdown';",
'end preview on countdown')

replace_once(
"  function applySetupPosition(kind,value){if(state!=='idle'&&state!=='over')return;const ratio=Number(value)/100;if(!Number.isFinite(ratio))return;if(kind==='horizontal'){horizontalTrackY=clamp(ratio,.55,.88);storage.set('dualAxisHorizontalY',horizontalTrackY.toFixed(3))}else{verticalTrackX=clamp(ratio,.30,.90);storage.set('dualAxisVerticalX',verticalTrackX.toFixed(3))}setModePositions();syncSetupUI();draw()}\n",
"  function applySetupPosition(kind,value){if(state!=='idle'&&state!=='over'&&state!=='paused')return;const ratio=Number(value)/100;if(!Number.isFinite(ratio))return;if(kind==='horizontal'){horizontalTrackY=clamp(ratio,.55,.88);storage.set('dualAxisHorizontalY',horizontalTrackY.toFixed(3))}else{verticalTrackX=clamp(ratio,.30,.90);storage.set('dualAxisVerticalX',verticalTrackX.toFixed(3))}if(state==='paused')refreshFixedTracks();else setModePositions();syncSetupUI();showAdjustPreview(kind)}\n",
'allow paused adjustment')

replace_once(
"  normalModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(false)});swappedModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(true)});horizontalYInput.addEventListener('input',e=>applySetupPosition('horizontal',e.currentTarget.value));verticalXInput.addEventListener('input',e=>applySetupPosition('vertical',e.currentTarget.value));\n",
"  normalModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(false)});swappedModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(true)});for(const input of [horizontalYInput,pauseHorizontalYInput])input.addEventListener('input',e=>applySetupPosition('horizontal',e.currentTarget.value));for(const input of [verticalXInput,pauseVerticalXInput])input.addEventListener('input',e=>applySetupPosition('vertical',e.currentTarget.value));for(const [input,kind] of [[horizontalYInput,'horizontal'],[pauseHorizontalYInput,'horizontal'],[verticalXInput,'vertical'],[pauseVerticalXInput,'vertical']])input.addEventListener('pointerdown',()=>showAdjustPreview(kind),{passive:true});\n",
'bind both setup panels')

replace_once(
"  function draw(){drawBackground();for(const o of obstacles)drawObstacle(o);glowCircle(leftP,'#38e8ff');glowCircle(rightP,'#ff3da6');ctx.save();ctx.setLineDash([5,8]);ctx.lineWidth=1;ctx.strokeStyle='rgba(56,232,255,.18)';ctx.beginPath();ctx.moveTo(swapped?split+18:18,leftP.y);ctx.lineTo(swapped?W-18:split-18,leftP.y);ctx.stroke();ctx.strokeStyle='rgba(255,61,166,.18)';ctx.beginPath();ctx.moveTo(rightP.x,64);ctx.lineTo(rightP.x,H-18);ctx.stroke();ctx.restore()}\n",
"  function drawAdjustmentPreview(){if(!adjustingKind)return;ctx.save();ctx.lineCap='round';ctx.setLineDash([13,9]);if(adjustingKind==='horizontal'){const x0=swapped?split+20:20,x1=swapped?W-20:split-20;ctx.fillStyle='rgba(56,232,255,.09)';ctx.fillRect(x0,leftP.y-18,Math.max(0,x1-x0),36);ctx.shadowColor='#38e8ff';ctx.shadowBlur=22;ctx.strokeStyle='rgba(56,232,255,.98)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x0,leftP.y);ctx.lineTo(x1,leftP.y);ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=3;ctx.beginPath();ctx.arc(leftP.x,leftP.y,leftP.r+10,0,Math.PI*2);ctx.stroke()}else{const y0=62,y1=H-18;ctx.fillStyle='rgba(255,61,166,.08)';ctx.fillRect(rightP.x-18,y0,36,Math.max(0,y1-y0));ctx.shadowColor='#ff3da6';ctx.shadowBlur=22;ctx.strokeStyle='rgba(255,61,166,.98)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(rightP.x,y0);ctx.lineTo(rightP.x,y1);ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=3;ctx.beginPath();ctx.arc(rightP.x,rightP.y,rightP.r+10,0,Math.PI*2);ctx.stroke()}ctx.restore()}\n  function draw(){drawBackground();for(const o of obstacles)drawObstacle(o);glowCircle(leftP,'#38e8ff');glowCircle(rightP,'#ff3da6');ctx.save();ctx.setLineDash([5,8]);ctx.lineWidth=1;ctx.strokeStyle='rgba(56,232,255,.18)';ctx.beginPath();ctx.moveTo(swapped?split+18:18,leftP.y);ctx.lineTo(swapped?W-18:split-18,leftP.y);ctx.stroke();ctx.strokeStyle='rgba(255,61,166,.18)';ctx.beginPath();ctx.moveTo(rightP.x,64);ctx.lineTo(rightP.x,H-18);ctx.stroke();ctx.restore();drawAdjustmentPreview()}\n",
'canvas adjustment preview')

replace_once(
"horizontalFixedY:Number(leftP.y.toFixed(1)),verticalFixedX:Number(rightP.x.toFixed(1)),activePointers:",
"horizontalFixedY:Number(leftP.y.toFixed(1)),verticalFixedX:Number(rightP.x.toFixed(1)),adjustingKind,activePointers:",
'health adjustment state')

required = [
    "pauseHorizontalYInput",
    "pauseVerticalXInput",
    "state!=='paused'",
    "drawAdjustmentPreview",
    "adjusting-position",
    "refreshFixedTracks",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'validation marker missing: {marker}')

path.write_text(text, encoding='utf-8')
print('pause adjustment patch applied')
