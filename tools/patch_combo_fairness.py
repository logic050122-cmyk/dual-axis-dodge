from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="""  function chooseSeparated(min,max,last,avoid){
    if(max<=min)return min;let candidate=min+Math.random()*(max-min);
    for(let i=0;i<6;i++){candidate=min+Math.random()*(max-min);if(Math.abs(candidate-last)>avoid)break}
    return candidate;
  }
  let lastLeftSpawn=-999,lastRightSpawn=-999;
"""
new="""  function chooseSeparated(min,max,last,avoid){
    if(max<=min)return min;let candidate=min+Math.random()*(max-min);
    for(let i=0;i<6;i++){candidate=min+Math.random()*(max-min);if(Math.abs(candidate-last)>avoid)break}
    return candidate;
  }
  function comboSafePosition(min,max,last,lastAt,avoid){
    let candidate=chooseSeparated(min,max,last,avoid);
    if(last<-900||lastAt<0)return candidate;
    const gap=Math.max(0,elapsed-lastAt),span=Math.max(1,max-min);
    if(gap<.52){
      const t=clamp(gap/.52,0,1),maxShift=span*(.34+.30*t);
      candidate=clamp(candidate,last-maxShift,last+maxShift);
    }
    return candidate;
  }
  let lastLeftSpawn=-999,lastRightSpawn=-999,lastLeftSpawnAt=-1,lastRightSpawnAt=-1;
"""
if old not in s: raise SystemExit('generator anchor missing')
s=s.replace(old,new,1)
s=s.replace("setModePositions();lastLeftSpawn=-999;lastRightSpawn=-999;","setModePositions();lastLeftSpawn=-999;lastRightSpawn=-999;lastLeftSpawnAt=-1;lastRightSpawnAt=-1;",1)
oldleft="const margin=28,minX=swapped?split+margin:margin,maxX=Math.max(minX,swapped?W-margin-size:split-margin-size),x=chooseSeparated(minX,maxX,lastLeftSpawn,Math.max(42,size*1.8));lastLeftSpawn=x;"
newleft="const margin=28,minX=swapped?split+margin:margin,maxX=Math.max(minX,swapped?W-margin-size:split-margin-size),x=comboSafePosition(minX,maxX,lastLeftSpawn,lastLeftSpawnAt,Math.max(42,size*1.8));lastLeftSpawn=x;lastLeftSpawnAt=elapsed;"
if oldleft not in s: raise SystemExit('left spawn anchor missing')
s=s.replace(oldleft,newleft,1)
oldright="const minY=Math.min(72,H*.25),maxY=Math.max(minY,H-40-size),y=chooseSeparated(minY,maxY,lastRightSpawn,Math.max(42,size*1.8));lastRightSpawn=y;"
newright="const minY=Math.min(72,H*.25),maxY=Math.max(minY,H-40-size),y=comboSafePosition(minY,maxY,lastRightSpawn,lastRightSpawnAt,Math.max(42,size*1.8));lastRightSpawn=y;lastRightSpawnAt=elapsed;"
if oldright not in s: raise SystemExit('right spawn anchor missing')
s=s.replace(oldright,newright,1)
p.write_text(s,encoding='utf-8')
