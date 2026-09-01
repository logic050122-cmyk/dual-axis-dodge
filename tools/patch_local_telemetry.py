from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'{label} missing')
    s = s.replace(old, new, 1)

replace_once(
"  let best=Number(storage.get('dualAxisBest','0'));if(!Number.isFinite(best)||best<0)best=0;\n  let swapped=storage.get('dualAxisSwapped','off')==='on';",
"  let best=Number(storage.get('dualAxisBest','0'));if(!Number.isFinite(best)||best<0)best=0;\n  let swapped=storage.get('dualAxisSwapped','off')==='on';\n  function loadRuns(){try{const v=JSON.parse(storage.get('dualAxisRuns','[]'));return Array.isArray(v)?v.slice(-30):[]}catch{return []}}\n  let recentRuns=loadRuns();\n  function recordRun(cause){\n    const run={score:Number(elapsed.toFixed(2)),level:lastStage,nearMisses,axis:cause==='left'?'horizontal':'vertical',physicalSide:cause==='left'?(swapped?'right':'left'):(swapped?'left':'right'),swapped,at:Date.now()};\n    recentRuns.push(run);recentRuns=recentRuns.slice(-30);storage.set('dualAxisRuns',JSON.stringify(recentRuns));return run;\n  }\n  function recentBalance(limit=20){const runs=recentRuns.slice(-limit),h=runs.filter(r=>r.axis==='horizontal').length,v=runs.filter(r=>r.axis==='vertical').length;return{runs:runs.length,horizontal:h,vertical:v}}",
'local telemetry insertion')

replace_once(
"  function gameOver(){\n    if(state!=='running')return;state='over';activePointers.clear();releaseWakeLock();syncControlState();const score=elapsed,oldBest=best;",
"  function gameOver(cause){\n    if(state!=='running')return;state='over';activePointers.clear();releaseWakeLock();syncControlState();const score=elapsed,oldBest=best,run=recordRun(cause),balance=recentBalance();",
'game over signature')

replace_once(
"    finalScoreEl.textContent=score.toFixed(1);recordText.textContent=score>oldBest?`NEW PERSONAL BEST ${best.toFixed(1)} s`:`PERSONAL BEST ${best.toFixed(1)} s`;sessionText.textContent=`LEVEL ${lastStage} · NEAR MISS ${nearMisses}`;",
"    finalScoreEl.textContent=score.toFixed(1);recordText.textContent=score>oldBest?`NEW PERSONAL BEST ${best.toFixed(1)} s`:`PERSONAL BEST ${best.toFixed(1)} s`;sessionText.textContent=`HIT ${run.axis.toUpperCase()} · LEVEL ${lastStage} · NEAR MISS ${nearMisses} · LAST ${balance.runs}: H ${balance.horizontal} / V ${balance.vertical}`;",
'game over summary')

replace_once(
"        if(hitCircleRect(p,o)){gameOver();return}",
"        if(hitCircleRect(p,o)){gameOver(o.type);return}",
'collision cause')

replace_once(
"  window.__dualAxisHealth=()=>({state,elapsed:Number(elapsed.toFixed(2)),obstacles:obstacles.length,leftX:Number(leftP.x.toFixed(1)),rightY:Number(rightP.y.toFixed(1)),leftTarget:Number(leftP.targetX.toFixed(1)),rightTarget:Number(rightP.targetY.toFixed(1)),level:lastStage,nearMisses,swapped,reactionWindow:Number(reactionWindow().toFixed(3)),leftSpeed:Number(leftSpeed().toFixed(1)),rightSpeed:Number(rightSpeed().toFixed(1)),orientationSafe:playable()||!(state==='running'||state==='countdown'),audioAvailable:!!(window.AudioContext||window.webkitAudioContext),playable:playable(),standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true});",
"  window.__dualAxisHealth=()=>({state,elapsed:Number(elapsed.toFixed(2)),obstacles:obstacles.length,leftX:Number(leftP.x.toFixed(1)),rightY:Number(rightP.y.toFixed(1)),leftTarget:Number(leftP.targetX.toFixed(1)),rightTarget:Number(rightP.targetY.toFixed(1)),level:lastStage,nearMisses,swapped,recentBalance:recentBalance(),reactionWindow:Number(reactionWindow().toFixed(3)),leftSpeed:Number(leftSpeed().toFixed(1)),rightSpeed:Number(rightSpeed().toFixed(1)),orientationSafe:playable()||!(state==='running'||state==='countdown'),audioAvailable:!!(window.AudioContext||window.webkitAudioContext),playable:playable(),standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true});",
'health telemetry')

p.write_text(s, encoding='utf-8')
