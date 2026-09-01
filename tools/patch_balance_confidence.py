from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = "function recentBalance(limit=20){const runs=recentRuns.slice(-limit),hr=runs.filter(r=>r.axis==='horizontal'),vr=runs.filter(r=>r.axis==='vertical'),avg=xs=>xs.length?xs.reduce((sum,r)=>sum+r.score,0)/xs.length:null;return{runs:runs.length,horizontal:hr.length,vertical:vr.length,horizontalAvg:avg(hr),verticalAvg:avg(vr)}}"
new = "function recentBalance(limit=20){const runs=recentRuns.slice(-limit),hr=runs.filter(r=>r.axis==='horizontal'),vr=runs.filter(r=>r.axis==='vertical'),avg=xs=>xs.length?xs.reduce((sum,r)=>sum+r.score,0)/xs.length:null,horizontalAvg=avg(hr),verticalAvg=avg(vr),minRuns=12,minPerAxis=5,ready=runs.length>=minRuns&&hr.length>=minPerAxis&&vr.length>=minPerAxis;let trend='collecting';if(ready&&horizontalAvg!==null&&verticalAvg!==null){const gap=Math.abs(horizontalAvg-verticalAvg),base=Math.max(1,(horizontalAvg+verticalAvg)/2),meaningful=gap>=2&&gap/base>=.15;trend=meaningful?(horizontalAvg<verticalAvg?'horizontal':'vertical'):'even'}return{runs:runs.length,horizontal:hr.length,vertical:vr.length,horizontalAvg,verticalAvg,minRuns,minPerAxis,ready,trend}}"
if old not in s:
    raise SystemExit('recentBalance insertion point missing')
s = s.replace(old, new, 1)

old_session = "finalScoreEl.textContent=score.toFixed(1);recordText.textContent=score>oldBest?`NEW PERSONAL BEST ${best.toFixed(1)} s`:`PERSONAL BEST ${best.toFixed(1)} s`;const avgH=balance.horizontalAvg===null?'—':balance.horizontalAvg.toFixed(1),avgV=balance.verticalAvg===null?'—':balance.verticalAvg.toFixed(1);sessionText.textContent=`HIT ${run.axis.toUpperCase()} · LEVEL ${lastStage} · NEAR MISS ${nearMisses} · LAST ${balance.runs}: H ${balance.horizontal} / V ${balance.vertical} · AVG H ${avgH}s / V ${avgV}s`;"
new_session = "finalScoreEl.textContent=score.toFixed(1);recordText.textContent=score>oldBest?`NEW PERSONAL BEST ${best.toFixed(1)} s`:`PERSONAL BEST ${best.toFixed(1)} s`;const avgH=balance.horizontalAvg===null?'—':balance.horizontalAvg.toFixed(1),avgV=balance.verticalAvg===null?'—':balance.verticalAvg.toFixed(1),balanceStatus=balance.ready?(balance.trend==='even'?'TREND EVEN':`TREND ${balance.trend==='horizontal'?'H':'V'} HARDER`):`SAMPLE ${balance.runs}/${balance.minRuns} · NEED H${Math.max(0,balance.minPerAxis-balance.horizontal)} V${Math.max(0,balance.minPerAxis-balance.vertical)}`;sessionText.textContent=`HIT ${run.axis.toUpperCase()} · LEVEL ${lastStage} · NEAR MISS ${nearMisses} · LAST ${balance.runs}: H ${balance.horizontal} / V ${balance.vertical} · AVG H ${avgH}s / V ${avgV}s · ${balanceStatus}`;"
if old_session not in s:
    raise SystemExit('session telemetry insertion point missing')
s = s.replace(old_session, new_session, 1)

old_health = "audioAvailable:!!(window.AudioContext||window.webkitAudioContext)"
if 'balanceReady:' not in s:
    if old_health not in s:
        raise SystemExit('health insertion point missing')
    s = s.replace(old_health, "balanceReady:recentBalance().ready,balanceTrend:recentBalance().trend," + old_health, 1)

p.write_text(s, encoding='utf-8')
