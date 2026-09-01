from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = "  document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden)releaseWakeLock();else if(state==='running'||state==='countdown')acquireWakeLock()},{passive:true});"
new = "  document.addEventListener('visibilitychange',()=>{\n    lastTime=performance.now();\n    if(document.hidden){\n      if(state==='running'||state==='countdown'){\n        ++countdownToken;state='paused';activePointers.clear();releaseWakeLock();pauseOverlay.style.display='grid';syncControlState();\n      }else releaseWakeLock();\n    }else if(state==='running'||state==='countdown')acquireWakeLock();\n  },{passive:true});"
if old not in s:
    raise SystemExit('visibility handler insertion point missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
