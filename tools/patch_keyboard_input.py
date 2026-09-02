from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old_update = """    const [hx0,hx1]=horizontalBounds();leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.targetY=clamp(rightP.targetY,64+rightP.r,H-rightP.r-18);\n    const prevLX=leftP.x,prevRY=rightP.y;\n    const follow=followAlpha(dt),nextLX=prevLX+(leftP.targetX-prevLX)*follow,nextRY=prevRY+(rightP.targetY-prevRY)*follow;\n"""
new_update = """    const [hx0,hx1]=horizontalBounds(),vy0=64+rightP.r,vy1=H-rightP.r-18;leftP.targetX=clamp(leftP.targetX,hx0,hx1);rightP.targetY=clamp(rightP.targetY,vy0,vy1);\n    const prevLX=leftP.x,prevRY=rightP.y,follow=followAlpha(dt);\n    let nextLX=prevLX+(leftP.targetX-prevLX)*follow,nextRY=prevRY+(rightP.targetY-prevRY)*follow;\n    const hKey=keyboardAxis('KeyA','ArrowLeft','KeyD','ArrowRight'),vKey=keyboardAxis('KeyW','ArrowUp','KeyS','ArrowDown');\n    if(hKey){nextLX=clamp(prevLX+hKey*keyboardHorizontalSpeed()*dt,hx0,hx1);leftP.targetX=nextLX}\n    if(vKey){nextRY=clamp(prevRY+vKey*keyboardVerticalSpeed()*dt,vy0,vy1);rightP.targetY=nextRY}\n"""
if old_update not in text:
    raise SystemExit('update anchor not found')
text = text.replace(old_update, new_update, 1)

old_input = """  const sideOwners={left:null,right:null},pointerCandidates=new Map(),pointerPositions=new Map();\n  function clearPointers(){activePointers.clear();pointerCandidates.clear();pointerPositions.clear();sideOwners.left=null;sideOwners.right=null}\n"""
new_input = """  const sideOwners={left:null,right:null},pointerCandidates=new Map(),pointerPositions=new Map();\n  const keyboardHeld=new Set(),keyboardCodes=new Set(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);\n  const keyboardAxis=(negA,negB,posA,posB)=>(keyboardHeld.has(posA)||keyboardHeld.has(posB)?1:0)-(keyboardHeld.has(negA)||keyboardHeld.has(negB)?1:0);\n  const keyboardHorizontalSpeed=()=>clamp((split-60)/.55,650,1400),keyboardVerticalSpeed=()=>clamp((H-100)/.55,520,1100);\n  function clearPointers(){activePointers.clear();pointerCandidates.clear();pointerPositions.clear();sideOwners.left=null;sideOwners.right=null;keyboardHeld.clear()}\n"""
if old_input not in text:
    raise SystemExit('input anchor not found')
text = text.replace(old_input, new_input, 1)

old_keyboard = """  canvas.addEventListener('contextmenu',e=>e.preventDefault());\n  window.addEventListener('keydown',e=>{if(state!=='running')return;const step=35,keys=['a','d','w','s','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];if(keys.includes(e.key))e.preventDefault();if(e.key==='a'||e.key==='ArrowLeft')leftP.targetX-=step;if(e.key==='d'||e.key==='ArrowRight')leftP.targetX+=step;if(e.key==='w'||e.key==='ArrowUp')rightP.targetY-=step;if(e.key==='s'||e.key==='ArrowDown')rightP.targetY+=step},{passive:false});\n\n  document.addEventListener('visibilitychange',()=>{\n"""
new_keyboard = """  canvas.addEventListener('contextmenu',e=>e.preventDefault());\n  window.addEventListener('keydown',e=>{if(!keyboardCodes.has(e.code))return;if(state==='running'||state==='countdown')e.preventDefault();keyboardHeld.add(e.code)},{passive:false});\n  window.addEventListener('keyup',e=>{if(!keyboardCodes.has(e.code))return;if(state==='running'||state==='countdown')e.preventDefault();keyboardHeld.delete(e.code)},{passive:false});\n  window.addEventListener('blur',()=>keyboardHeld.clear(),{passive:true});\n\n  document.addEventListener('visibilitychange',()=>{\n"""
if old_keyboard not in text:
    raise SystemExit('keyboard anchor not found')
text = text.replace(old_keyboard, new_keyboard, 1)

old_health = """adjustingKind,activePointers:activePointers.size,touchCandidates:pointerCandidates.size,leftPointerOwned:sideOwners.left!==null,rightPointerOwned:sideOwners.right!==null,recentBalance"""
new_health = """adjustingKind,keyboardHeld:[...keyboardHeld],activePointers:activePointers.size,touchCandidates:pointerCandidates.size,leftPointerOwned:sideOwners.left!==null,rightPointerOwned:sideOwners.right!==null,recentBalance"""
if old_health not in text:
    raise SystemExit('health anchor not found')
text = text.replace(old_health, new_health, 1)

path.write_text(text, encoding='utf-8')
