from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = "function recentBalance(limit=20){const runs=recentRuns.slice(-limit),hr=runs.filter(r=>r.axis==='horizontal'),vr=runs.filter(r=>r.axis==='vertical'),avg=xs=>xs.length?xs.reduce((sum,r)=>sum+r.score,0)/xs.length:null;return{runs:runs.length,horizontal:hr.length,vertical:vr.length,horizontalAvg:avg(hr),verticalAvg:avg(vr)}}"
new = "function recentBalance(limit=20){const runs=recentRuns.slice(-limit),hr=runs.filter(r=>r.axis==='horizontal'),vr=runs.filter(r=>r.axis==='vertical'),avg=xs=>xs.length?xs.reduce((sum,r)=>sum+r.score,0)/xs.length:null,horizontalAvg=avg(hr),verticalAvg=avg(vr),minRuns=12,minPerAxis=5,ready=runs.length>=minRuns&&hr.length>=minPerAxis&&vr.length>=minPerAxis;let trend='collecting';if(ready&&horizontalAvg!==null&&verticalAvg!==null){const gap=Math.abs(horizontalAvg-verticalAvg),base=Math.max(1,(horizontalAvg+verticalAvg)/2),meaningful=gap>=2&&gap/base>=.15;trend=meaningful?(horizontalAvg<verticalAvg?'horizontal':'vertical'):'even'}return{runs:runs.length,horizontal:hr.length,vertical:vr.length,horizontalAvg,verticalAvg,minRuns,minPerAxis,ready,trend}}"
if old not in s:
    raise SystemExit('recentBalance insertion point missing')
s = s.replace(old, new, 1)

pattern = re.compile(r"sessionText\.textContent=`LEVEL \$\{lastStage\} · NEAR MISS \$\{nearMisses\} · HIT \$\{run\.axis\.toUpperCase\(\)\} · LAST 20: H \$\{balance\.horizontal\} / V \$\{balance\.vertical\} · AVG H \$\{formatAvg\(balance\.horizontalAvg\)\} / V \$\{formatAvg\(balance\.verticalAvg\)\}`;")
replacement = "const balanceStatus=balance.ready?(balance.trend==='even'?'TREND EVEN':`TREND ${balance.trend==='horizontal'?'H':'V'} HARDER`):`SAMPLE ${balance.runs}/${balance.minRuns} · NEED H${Math.max(0,balance.minPerAxis-balance.horizontal)} V${Math.max(0,balance.minPerAxis-balance.vertical)}`;sessionText.textContent=`LEVEL ${lastStage} · NEAR MISS ${nearMisses} · HIT ${run.axis.toUpperCase()} · LAST 20: H ${balance.horizontal} / V ${balance.vertical} · AVG H ${formatAvg(balance.horizontalAvg)} / V ${formatAvg(balance.verticalAvg)} · ${balanceStatus}`;"
s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f'session telemetry insertion point missing: {n}')
s = s2

health_pattern = re.compile(r"window\.__dualAxisHealth=\(\)=>\(\{([^}]*)\}\);")
m = health_pattern.search(s)
if not m:
    raise SystemExit('health object missing')
if 'balanceReady:' not in m.group(0):
    balance_health = "balanceReady:recentBalance().ready,balanceTrend:recentBalance().trend,"
    s = s[:m.start()] + m.group(0).replace('audioAvailable:', balance_health + 'audioAvailable:', 1) + s[m.end():]

p.write_text(s, encoding='utf-8')
