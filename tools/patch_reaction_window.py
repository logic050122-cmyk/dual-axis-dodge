from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = """  const difficulty=()=>1+Math.min(elapsed/42,2.25);\n  const leftSpeed=()=>Math.min(1350,(150+elapsed*5.8)*Math.min(1.8,difficulty())*Math.pow(clamp(H/390,.75,1.8),.35));\n  const rightSpeed=()=>Math.min(1450,(160+elapsed*6.0)*Math.min(1.8,difficulty())*Math.pow(clamp(split/422,.75,2.0),.3));\n  const spawnGap=()=>Math.max(.29,.86-elapsed*.0105);\n"""
new = """  const difficulty=()=>1+Math.min(elapsed/42,2.25);\n  const reactionWindow=()=>Math.max(.42,.62-elapsed*.0025);\n  const leftTravelDistance=()=>Math.max(120,leftP.y-leftP.r-31);\n  const rightTravelDistance=()=>Math.max(120,swapped?rightP.x-rightP.r-31:rightP.x-split-rightP.r-31);\n  const leftSpeed=()=>Math.min(1350,leftTravelDistance()/reactionWindow(),(150+elapsed*5.8)*Math.min(1.8,difficulty())*Math.pow(clamp(H/390,.75,1.8),.35));\n  const rightSpeed=()=>Math.min(1450,rightTravelDistance()/reactionWindow(),(160+elapsed*6.0)*Math.min(1.8,difficulty())*Math.pow(clamp(split/422,.75,2.0),.3));\n  const spawnGap=()=>Math.max(.29,.86-elapsed*.0105);\n"""
if old not in s:
    raise SystemExit('difficulty/speed block not found')
s = s.replace(old, new, 1)

old_health = """  window.__dualAxisHealth=()=>({state,elapsed:Number(elapsed.toFixed(2)),obstacles:obstacles.length,leftX:Number(leftP.x.toFixed(1)),rightY:Number(rightP.y.toFixed(1)),leftTarget:Number(leftP.targetX.toFixed(1)),rightTarget:Number(rightP.targetY.toFixed(1)),level:lastStage,nearMisses,swapped,orientationSafe:playable()||!(state==='running'||state==='countdown'),audioAvailable:!!(window.AudioContext||window.webkitAudioContext),playable:playable(),standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true});\n"""
new_health = """  window.__dualAxisHealth=()=>({state,elapsed:Number(elapsed.toFixed(2)),obstacles:obstacles.length,leftX:Number(leftP.x.toFixed(1)),rightY:Number(rightP.y.toFixed(1)),leftTarget:Number(leftP.targetX.toFixed(1)),rightTarget:Number(rightP.targetY.toFixed(1)),level:lastStage,nearMisses,swapped,reactionWindow:Number(reactionWindow().toFixed(3)),leftSpeed:Number(leftSpeed().toFixed(1)),rightSpeed:Number(rightSpeed().toFixed(1)),orientationSafe:playable()||!(state==='running'||state==='countdown'),audioAvailable:!!(window.AudioContext||window.webkitAudioContext),playable:playable(),standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true});\n"""
if old_health not in s:
    raise SystemExit('health block not found')
s = s.replace(old_health, new_health, 1)

p.write_text(s, encoding='utf-8')
