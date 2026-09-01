from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = "if(state==='idle'||state==='countdown'||state==='over')"
new = "if(state==='idle'||state==='over')"
if old not in s:
    raise SystemExit('countdown resize branch not found')
s = s.replace(old, new, 1)

needle = "    lastTime=performance.now();\n  }\n  window.addEventListener('resize',resize,{passive:true});"
replacement = "    if(!playable())interruptGame();\n    lastTime=performance.now();\n  }\n  window.addEventListener('resize',resize,{passive:true});"
if needle not in s:
    raise SystemExit('resize tail not found')
s = s.replace(needle, replacement, 1)

marker = "  function startCountdown(){runCountdown(true)}\n"
helper = "  function interruptGame(){\n    if(state!=='running'&&state!=='countdown')return false;\n    ++countdownToken;state='paused';activePointers.clear();releaseWakeLock();pauseOverlay.style.display='grid';syncControlState();lastTime=performance.now();return true;\n  }\n"
if marker not in s:
    raise SystemExit('countdown marker not found')
s = s.replace(marker, helper + marker, 1)

pattern = re.compile(r"  document\.addEventListener\('visibilitychange',\(\)=>\{\n    lastTime=performance\.now\(\);\n    if\(document\.hidden\)\{\n      if\(state==='running'\|\|state==='countdown'\)\{\n        \+\+countdownToken;state='paused';activePointers\.clear\(\);releaseWakeLock\(\);pauseOverlay\.style\.display='grid';syncControlState\(\);\n      \}else releaseWakeLock\(\);\n    \}else if\(state==='running'\|\|state==='countdown'\)acquireWakeLock\(\);\n  \},\{passive:true\}\);")
replacement_vis = "  document.addEventListener('visibilitychange',()=>{\n    lastTime=performance.now();\n    if(document.hidden){\n      if(!interruptGame())releaseWakeLock();\n    }else if(state==='running'||state==='countdown')acquireWakeLock();\n  },{passive:true});"
s, count = pattern.subn(replacement_vis, s, count=1)
if count != 1:
    raise SystemExit('visibility block not found')

health_old = "nearMisses,swapped,audioAvailable"
health_new = "nearMisses,swapped,orientationSafe:playable()||!(state==='running'||state==='countdown'),audioAvailable"
if health_old not in s:
    raise SystemExit('health marker not found')
s = s.replace(health_old, health_new, 1)

p.write_text(s, encoding='utf-8')
