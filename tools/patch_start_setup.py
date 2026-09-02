from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "    .rulegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 18px}.rule{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px;background:rgba(255,255,255,.025);font-size:12px;color:#9fb5c5}.rule b{display:block;color:#edfaff;font-size:14px;margin-bottom:4px}.cyan{color:var(--cyan)}.pink{color:var(--pink)}\n",
    "    .rulegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 12px}.rule{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px;background:rgba(255,255,255,.025);font-size:12px;color:#9fb5c5}.rule b{display:block;color:#edfaff;font-size:14px;margin-bottom:4px}.cyan{color:var(--cyan)}.pink{color:var(--pink)}\n"
    "    #startOverlay{z-index:12}.start-panel{max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain}.setup{margin:0 0 14px;padding:11px 12px 12px;border:1px solid rgba(111,232,255,.13);border-radius:15px;background:rgba(3,9,23,.38);text-align:left}.setup-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:9px;letter-spacing:.18em;color:#6f879b;font-weight:900}.mode-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.modebtn{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 7px;background:rgba(255,255,255,.025);color:#8fa5b9;font-size:10px;font-weight:850;letter-spacing:.06em;touch-action:manipulation}.modebtn.active{border-color:rgba(56,232,255,.48);background:rgba(56,232,255,.09);color:#e9fbff;box-shadow:inset 0 0 18px rgba(56,232,255,.05)}.adjust-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.adjust{display:block;min-width:0}.adjust-line{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:#a9bbc9}.adjust-line b{font-size:10px}.adjust-line em{font-style:normal;color:#eaf7ff;font-variant-numeric:tabular-nums}.adjust input{display:block;width:100%;height:24px;margin:3px 0 0;accent-color:#59dff1;touch-action:none}.adjust small{display:block;color:#62778a;font-size:8px;letter-spacing:.04em}.setup-note{margin-top:7px;color:#61768b;font-size:8px;line-height:1.35}\n",
    'setup css'
)

replace_once(
    "    @media (orientation:landscape) and (max-height:430px){.overlay{padding:8px}.panel{padding:12px 18px;border-radius:18px}.eyebrow{font-size:9px}.title{font-size:34px;margin:4px 0}.subtitle{font-size:11px;line-height:1.35;margin-bottom:7px}.rulegrid{margin:7px 0 9px;gap:7px}.rule{padding:7px;font-size:10px}.rule b{font-size:12px}.start{padding:10px 22px;min-width:180px}.hint{margin-top:6px;font-size:8px}.brand,.zone-label{font-size:8px}.iconbtn{width:36px;height:36px}.status{top:52px;font-size:8px}.zone-label.right{right:194px}}\n",
    "    @media (orientation:landscape) and (max-height:430px){.overlay{padding:8px}.panel{padding:12px 18px;border-radius:18px}.eyebrow{font-size:9px}.title{font-size:34px;margin:4px 0}.subtitle{font-size:11px;line-height:1.35;margin-bottom:7px}.start-panel .subtitle{display:none}.rulegrid{margin:7px 0 8px;gap:7px}.rule{padding:7px;font-size:10px}.rule b{font-size:12px}.setup{padding:7px 9px 8px;margin-bottom:8px}.setup-head{margin-bottom:5px}.mode-row{margin-bottom:5px}.modebtn{padding:6px}.adjust-grid{gap:9px}.adjust input{height:20px;margin:0}.adjust small,.setup-note{display:none}.start{padding:10px 22px;min-width:180px}.hint{margin-top:6px;font-size:8px}.brand,.zone-label{font-size:8px}.iconbtn{width:36px;height:36px}.status{top:52px;font-size:8px}.zone-label.right{right:194px}}\n",
    'compact css'
)

replace_once(
    "  <div class=\"overlay\" id=\"startOverlay\">\n    <div class=\"panel\">\n",
    "  <div class=\"overlay\" id=\"startOverlay\">\n    <div class=\"panel start-panel\">\n",
    'start panel class'
)

replace_once(
    "      <div class=\"rulegrid\"><div class=\"rule\" id=\"leftRule\"><b><span class=\"cyan\">LEFT</span> / 左手</b>按住左半屏拖动，角色仅左右移动<br>障碍从上向下</div><div class=\"rule\" id=\"rightRule\"><b><span class=\"pink\">RIGHT</span> / 右手</b>按住右半屏拖动，角色仅上下移动<br>障碍从左向右</div></div>\n      <button class=\"start\" id=\"startBtn\" type=\"button\">START SYNC</button><div class=\"hint\">手机横屏 · 支持双指同时触控 · 难度每 10 秒提升</div>\n",
    "      <div class=\"rulegrid\"><div class=\"rule\" id=\"leftRule\"><b><span class=\"cyan\">LEFT</span> / 左手</b>按住左半屏拖动，角色仅左右移动<br>障碍从上向下</div><div class=\"rule\" id=\"rightRule\"><b><span class=\"pink\">RIGHT</span> / 右手</b>按住右半屏拖动，角色仅上下移动<br>障碍从左向右</div></div>\n"
    "      <div class=\"setup\" id=\"setupPanel\"><div class=\"setup-head\"><span>START POSITION</span><span>开始前可调</span></div><div class=\"mode-row\"><button class=\"modebtn\" id=\"normalModeBtn\" type=\"button\" aria-pressed=\"true\">左横 · 右纵</button><button class=\"modebtn\" id=\"swappedModeBtn\" type=\"button\" aria-pressed=\"false\">左纵 · 右横</button></div><div class=\"adjust-grid\"><label class=\"adjust\" for=\"horizontalYInput\"><span class=\"adjust-line\"><b class=\"cyan\">横向角色高度</b><em id=\"horizontalYValue\">76%</em></span><input id=\"horizontalYInput\" type=\"range\" min=\"55\" max=\"88\" step=\"1\" value=\"76\"><small>上下调节固定横向轨道</small></label><label class=\"adjust\" for=\"verticalXInput\"><span class=\"adjust-line\"><b class=\"pink\">纵向角色横位</b><em id=\"verticalXValue\">76%</em></span><input id=\"verticalXInput\" type=\"range\" min=\"30\" max=\"90\" step=\"1\" value=\"76\"><small>左右调节所在半屏的位置</small></label></div><div class=\"setup-note\">位置会自动记住。横位百分比按当前角色所在半屏、从障碍进入方向计算。</div></div>\n"
    "      <button class=\"start\" id=\"startBtn\" type=\"button\">START SYNC</button><div class=\"hint\">先调布局与轨道位置 · 手机横屏 · 支持双指同时触控</div>\n",
    'setup html'
)

replace_once(
    "audioBtn=$('audioBtn'),fullscreenBtn=$('fullscreenBtn'),pauseBtn=$('pauseBtn'),swapBtn=$('swapBtn'),leftZoneLabel=$('leftZoneLabel'),rightZoneLabel=$('rightZoneLabel'),leftRule=$('leftRule'),rightRule=$('rightRule');",
    "audioBtn=$('audioBtn'),fullscreenBtn=$('fullscreenBtn'),pauseBtn=$('pauseBtn'),swapBtn=$('swapBtn'),leftZoneLabel=$('leftZoneLabel'),rightZoneLabel=$('rightZoneLabel'),leftRule=$('leftRule'),rightRule=$('rightRule'),normalModeBtn=$('normalModeBtn'),swappedModeBtn=$('swappedModeBtn'),horizontalYInput=$('horizontalYInput'),verticalXInput=$('verticalXInput'),horizontalYValue=$('horizontalYValue'),verticalXValue=$('verticalXValue');",
    'element refs'
)

replace_once(
    "  let swapped=storage.get('dualAxisSwapped','off')==='on';\n",
    "  let swapped=storage.get('dualAxisSwapped','off')==='on';\n  const readSetupRatio=(key,fallback,min,max)=>{const value=Number(storage.get(key,String(fallback)));return Number.isFinite(value)?clamp(value,min,max):fallback};\n  let horizontalTrackY=readSetupRatio('dualAxisHorizontalY',.76,.55,.88),verticalTrackX=readSetupRatio('dualAxisVerticalX',.76,.30,.90);\n",
    'setup state'
)

replace_once(
    "  function horizontalBounds(pad=16){return swapped?[split+leftP.r+pad,W-leftP.r-pad]:[leftP.r+pad,split-leftP.r-pad]}\n  function syncSideUI(){\n",
    "  function horizontalBounds(pad=16){return swapped?[split+leftP.r+pad,W-leftP.r-pad]:[leftP.r+pad,split-leftP.r-pad]}\n  function horizontalRoleY(){return clamp(H*horizontalTrackY,64+leftP.r,H-leftP.r-18)}\n  function verticalRoleX(){const pad=rightP.r+18,local=split*verticalTrackX;return swapped?clamp(local,pad,split-pad):clamp(split+local,split+pad,W-pad)}\n  function syncSetupUI(){const hy=Math.round(horizontalTrackY*100),vx=Math.round(verticalTrackX*100);horizontalYInput.value=String(hy);verticalXInput.value=String(vx);horizontalYValue.textContent=`${hy}%`;verticalXValue.textContent=`${vx}%`;normalModeBtn.classList.toggle('active',!swapped);swappedModeBtn.classList.toggle('active',swapped);normalModeBtn.setAttribute('aria-pressed',String(!swapped));swappedModeBtn.setAttribute('aria-pressed',String(swapped))}\n  function syncSideUI(){\n",
    'position helpers'
)

replace_once(
    "    swapBtn.setAttribute('aria-pressed',String(swapped));swapBtn.title=swapped?'当前：左纵向 / 右横向':'当前：左横向 / 右纵向';\n  }\n",
    "    swapBtn.setAttribute('aria-pressed',String(swapped));swapBtn.title=swapped?'当前：左纵向 / 右横向':'当前：左横向 / 右纵向';syncSetupUI();\n  }\n",
    'sync setup ui'
)

replace_once(
    "  function setModePositions(){leftP.y=H*.76;rightP.x=swapped?W*.12:W*.88;leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}\n",
    "  function setModePositions(){leftP.y=horizontalRoleY();rightP.x=verticalRoleX();leftP.x=swapped?W*.75:W*.25;leftP.targetX=leftP.x;rightP.y=H*.74;rightP.targetY=rightP.y}\n",
    'mode positions'
)

replace_once(
    "    leftP.y=H*.76;rightP.x=swapped?W*.12:W*.88;const [hx0,hx1]=horizontalBounds(10);\n",
    "    leftP.y=horizontalRoleY();rightP.x=verticalRoleX();const [hx0,hx1]=horizontalBounds(10);\n",
    'resize fixed axes'
)

replace_once(
    "  function toggleSwap(){if(state!=='idle'&&state!=='over')return;swapped=!swapped;storage.set('dualAxisSwapped',swapped?'on':'off');obstacles=[];setModePositions();syncSideUI();syncControlState();draw();vibrate(15);playTick(swapped?720:560,.055,.035)}\n",
    "  function setSwap(next){if(state!=='idle'&&state!=='over')return false;next=!!next;if(swapped===next){syncSideUI();return true}swapped=next;storage.set('dualAxisSwapped',swapped?'on':'off');obstacles=[];setModePositions();syncSideUI();syncControlState();draw();vibrate(15);playTick(swapped?720:560,.055,.035);return true}\n  function toggleSwap(){setSwap(!swapped)}\n  function applySetupPosition(kind,value){if(state!=='idle'&&state!=='over')return;const ratio=Number(value)/100;if(!Number.isFinite(ratio))return;if(kind==='horizontal'){horizontalTrackY=clamp(ratio,.55,.88);storage.set('dualAxisHorizontalY',horizontalTrackY.toFixed(3))}else{verticalTrackX=clamp(ratio,.30,.90);storage.set('dualAxisVerticalX',verticalTrackX.toFixed(3))}setModePositions();syncSetupUI();draw()}\n",
    'swap and setup functions'
)

replace_once(
    "  pauseBtn.addEventListener('click',e=>{e.stopPropagation();if(state==='running')pauseGame();else if(state==='paused')resumeCountdown()});swapBtn.addEventListener('click',e=>{e.stopPropagation();toggleSwap()});\n",
    "  pauseBtn.addEventListener('click',e=>{e.stopPropagation();if(state==='running')pauseGame();else if(state==='paused')resumeCountdown()});swapBtn.addEventListener('click',e=>{e.stopPropagation();toggleSwap()});\n  normalModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(false)});swappedModeBtn.addEventListener('click',e=>{e.stopPropagation();setSwap(true)});horizontalYInput.addEventListener('input',e=>applySetupPosition('horizontal',e.currentTarget.value));verticalXInput.addEventListener('input',e=>applySetupPosition('vertical',e.currentTarget.value));\n",
    'setup listeners'
)

replace_once(
    "swapped,activePointers:activePointers.size",
    "swapped,horizontalTrackY:Number(horizontalTrackY.toFixed(3)),verticalTrackX:Number(verticalTrackX.toFixed(3)),horizontalFixedY:Number(leftP.y.toFixed(1)),verticalFixedX:Number(rightP.x.toFixed(1)),activePointers:activePointers.size",
    'health setup data'
)

path.write_text(text, encoding='utf-8')

# Static feature checks so a partial replacement cannot silently ship.
required = [
    'id="normalModeBtn"', 'id="swappedModeBtn"', 'id="horizontalYInput"',
    'id="verticalXInput"', 'function verticalRoleX()', 'function applySetupPosition(',
    "dualAxisHorizontalY", "dualAxisVerticalX", 'setSwap(true)', 'setSwap(false)',
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing required token: {token}')
if "rightP.x=swapped?W*.12:W*.88" in text:
    raise SystemExit('legacy asymmetric swapped vertical position still present')
print('start setup patch applied')
