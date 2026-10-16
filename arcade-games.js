/* Small independent additions. The original games keep their existing runtime. */
globalThis.PlaydotExtras=(()=>{
  'use strict';
  const clampRandom=rng=>Math.min(.999999999,Math.max(0,rng()));
  const pick=(n,rng=Math.random)=>Math.floor(clampRandom(rng)*n);
  const SHAPES={
    circle:'<circle cx="32" cy="32" r="22"/>',square:'<rect x="11" y="11" width="42" height="42" rx="3"/>',
    up:'<path d="M32 8 57 54H7Z"/>',down:'<path d="M7 10H57L32 56Z"/>',
    diamond:'<path d="M32 5 59 32 32 59 5 32Z"/>',
    pentagon:'<path d="M32 7 56 25 47 54H17L8 25Z"/>',
    hexagon:'<path d="M19 9H45L58 32 45 55H19L6 32Z"/>',
    star:'<path d="m32 5 8 18 20 2-15 14 4 20-17-10-17 10 4-20L4 25l20-2Z"/>'
  };
  const ODD_RULES={
    shape:{goal:'看轮廓',prompt:'先只比较形状，找到唯一不同的一格。',wrong:'这格和大多数形状相同，再比较轮廓。'},
    distract:{goal:'忽略颜色',prompt:'颜色会分散注意力；只比较形状。',wrong:'颜色是干扰，这格的形状仍和大多数相同。'},
    combo:{goal:'找组合',prompt:'单看形状或圆点都不够，找到唯一的形状＋圆点组合。',wrong:'这个形状或圆点都出现过，再比较它们的组合。'}
  };
  function oddRule(round,mode='easy'){
    if(mode!=='challenge')return 'shape';
    return round<=2?'shape':round<=5?'distract':'combo';
  }
  function oddBoard(round,mode='easy',rng=Math.random){
    const pairs=[['circle','square'],['up','circle'],['square','diamond'],['up','down'],['pentagon','hexagon']];
    const tier=Math.min(4,Math.floor(Math.max(0,round-1)/3)+(mode==='challenge'?1:0));
    let [normal,odd]=pairs[tier];if(pick(2,rng)) [normal,odd]=[odd,normal];
    const side=round<4?3:4,target=pick(side*side,rng),rule=oddRule(round,mode),offset=pick(2,rng);
    let cells;
    if(rule==='combo'){
      const targetVariant=pick(2,rng);
      cells=Array.from({length:side*side},(_,i)=>{
        if(i===target)return targetVariant?{shape:odd,mark:'plain',color:'#73d9b3'}:{shape:normal,mark:'dot',color:'#73d9b3'};
        return (i+offset)%2?{shape:normal,mark:'plain',color:'#73d9b3'}:{shape:odd,mark:'dot',color:'#73d9b3'};
      });
    }else{
      cells=Array.from({length:side*side},(_,i)=>({
        shape:i===target?odd:normal,mark:'plain',
        color:mode==='easy'&&tier<2&&i===target?'#80c7f7':rule==='distract'?((i+offset)%2?'#80c7f7':'#73d9b3'):'#73d9b3'
      }));
    }
    return {side,target,rule,goal:ODD_RULES[rule].goal,prompt:ODD_RULES[rule].prompt,cells};
  }
  function shapeSVG(shape,color,mark='plain'){return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="${color}" stroke="#202124" stroke-width="2.5" stroke-linejoin="round">${SHAPES[shape]}${mark==='dot'?'<circle cx="32" cy="32" r="6" fill="#fff" stroke="#202124" stroke-width="3"/>':''}</svg>`}
  const LINE_LEVELS=[
    {nodes:[[20,80],[50,20],[80,80]],trail:[0,1,2,0]},
    {nodes:[[20,20],[80,20],[80,80],[20,80]],trail:[0,1,2,3,0]},
    {nodes:[[20,80],[20,20],[80,20],[80,80],[50,50]],trail:[0,1,2,3,0,4,2]},
    {nodes:[[12,80],[12,20],[50,50],[88,20],[88,80]],trail:[2,0,1,2,3,4,2]},
    {nodes:[[20,82],[20,40],[50,12],[80,40],[80,82],[50,61]],trail:[0,1,2,3,1,5,4,3,5,0,4]},
    {nodes:[[15,15],[50,15],[85,15],[85,50],[85,85],[50,85],[15,85],[15,50],[50,50]],trail:[0,1,2,3,4,5,6,7,0,8,4]}
  ];
  const LINE_LEVEL_NAMES=['三角起步','方形回路','双环分支','双翼回路','多分支路线','九点路线'];
  const edgeKey=(a,b)=>[a,b].sort((x,y)=>x-y).join(':');
  function linePuzzle(index){
    const level=LINE_LEVELS[Math.max(0,Math.min(LINE_LEVELS.length-1,index))];
    return {nodes:level.nodes.map(point=>[...point]),solution:[...level.trail],edges:level.trail.slice(1).map((b,i)=>[level.trail[i],b])};
  }
  function lineAllowed(puzzle,path,next){
    if(!Number.isInteger(next)||!puzzle.nodes[next])return false;
    if(!path.length)return next===puzzle.solution[0];
    const edge=edgeKey(path.at(-1),next);
    return puzzle.edges.some(([a,b])=>edgeKey(a,b)===edge)&&!path.slice(1).some((b,i)=>edgeKey(path[i],b)===edge);
  }
  function lineContinuation(puzzle,path){
    const keys=puzzle.edges.map(([a,b])=>edgeKey(a,b));let used=0;
    for(let i=1;i<path.length;i++){
      const edge=keys.indexOf(edgeKey(path[i-1],path[i]));
      if(edge<0||(used&(1<<edge)))return null;used|=1<<edge;
    }
    const all=(1<<keys.length)-1,failed=new Set();
    function walk(node,mask){
      if(mask===all)return [];
      const key=node+':'+mask;if(failed.has(key))return null;
      for(let i=0;i<puzzle.edges.length;i++){
        if(mask&(1<<i))continue;const [a,b]=puzzle.edges[i];
        if(a!==node&&b!==node)continue;const next=a===node?b:a;
        const tail=walk(next,mask|(1<<i));if(tail)return [next,...tail];
      }
      failed.add(key);return null;
    }
    const next=walk(path.at(-1)??puzzle.solution[0],used);
    return next&&(!path.length?[puzzle.solution[0],...next]:next);
  }
  function segmentEntry(from,to,center,radius=24){
    const dx=to[0]-from[0],dy=to[1]-from[1],fx=from[0]-center[0],fy=from[1]-center[1];
    const c=fx*fx+fy*fy-radius*radius;if(c<=0)return 0;
    const a=dx*dx+dy*dy;if(!a)return null;
    const b=2*(fx*dx+fy*dy),disc=b*b-4*a*c;if(disc<0)return null;
    const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
  }
  const PULSE_PATTERNS={
    easy:[0,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000,11000],
    // Four authored phrases: first establish the beat, then repeat readable
    // short/long relationships. Gaps stay wider than two judgment windows.
    challenge:[0,800,1600,2400,3600,4400,5000,6000,7200,7800,8800,9600,10800,11600,12200,13200]
  };
  function pulseTiming(mode){
    const challenge=mode==='challenge',targets=[...PULSE_PATTERNS[challenge?'challenge':'easy']];
    return {interval:challenge?800:1000,window:challenge?210:280,beats:targets.length,lead:1600,targets,phraseSize:4};
  }
  function pulseTarget(timing,index){return timing.lead+timing.targets[index]}
  function pulseJudge(elapsed,timing){
    let nearest=null;
    for(let index=0;index<timing.beats;index++){
      const error=elapsed-pulseTarget(timing,index),distance=Math.abs(error);
      if(distance<=timing.window&&(!nearest||distance<Math.abs(nearest.error)))nearest={index,error};
    }
    return nearest;
  }
  function sortSolved(tubes,capacity){return tubes.every(tube=>tube.length===0||(tube.length===capacity&&tube.every(color=>color===tube[0])))}
  function sortAllowed(tubes,from,to,capacity){
    return Number.isInteger(from)&&Number.isInteger(to)&&from!==to&&!!tubes[from]?.length&&!!tubes[to]&&tubes[to].length<capacity&&(!tubes[to].length||tubes[to].at(-1)===tubes[from].at(-1));
  }
  function sortRoute(tubes,capacity){
    const copy=tubes=>tubes.map(tube=>[...tube]),key=tubes=>tubes.map(tube=>tube.join('')).join('|');
    const first=copy(tubes);if(sortSolved(first,capacity))return [];
    const queue=[first],firstKey=key(first),parents=new Map([[firstKey,null]]),moves=new Map();
    for(let cursor=0;cursor<queue.length;cursor++){
      const current=queue[cursor],currentKey=key(current);
      for(let from=0;from<current.length;from++)for(let to=0;to<current.length;to++)if(sortAllowed(current,from,to,capacity)){
        const next=copy(current);next[to].push(next[from].pop());const nextKey=key(next);if(parents.has(nextKey))continue;
        parents.set(nextKey,currentKey);moves.set(nextKey,[from,to]);
        if(sortSolved(next,capacity)){
          const route=[];let stepKey=nextKey;
          while(parents.get(stepKey)!==null){route.push(moves.get(stepKey));stepKey=parents.get(stepKey)}
          return route.reverse();
        }
        queue.push(next);
      }
    }
    return null;
  }
  function sortPuzzle(mode='easy',rng=Math.random){
    const colors=mode==='challenge'?4:3,capacity=3;
    const solved=()=>Array.from({length:colors+2},(_,i)=>i<colors?Array(capacity).fill(i):[]);
    let tubes=solved(),reverse=[];
    // A reverse move may mix colors, but its source must expose the SAME color
    // (or become empty). Therefore undoing every generated move is always legal.
    for(let step=0;step<(mode==='challenge'?32:22);step++){
      const options=[];
      for(let from=0;from<tubes.length;from++)if(tubes[from].length&&(tubes[from].length===1||tubes[from].at(-2)===tubes[from].at(-1))){
        for(let to=0;to<tubes.length;to++)if(to!==from&&tubes[to].length<capacity)options.push([from,to]);
      }
      if(!options.length)break;
      const [from,to]=options[pick(options.length,rng)];tubes[to].push(tubes[from].pop());reverse.push([to,from]);
    }
    if(sortSolved(tubes,capacity)){
      tubes=solved();reverse=[];
      for(const [from,to] of [[0,colors],[1,0],[colors,1]]){tubes[to].push(tubes[from].pop());reverse.push([to,from])}
    }
    return {tubes,capacity,solution:reverse.reverse()};
  }
  const MAZE_DIRS=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
  function mazeMove(puzzle,position,direction){
    const dir=MAZE_DIRS[direction];if(!dir||!Number.isInteger(position)||position<0||position>=puzzle.cells.length)return position;
    const [dx,dy,wall]=dir,x=position%puzzle.size+dx,y=Math.floor(position/puzzle.size)+dy;
    if(x<0||y<0||x>=puzzle.size||y>=puzzle.size||(puzzle.cells[position]&wall))return position;
    return y*puzzle.size+x;
  }
  function mazePath(puzzle,start=puzzle.start){
    const queue=[start],parents=new Map([[start,null]]);
    for(let q=0;q<queue.length;q++){
      const cell=queue[q];if(cell===puzzle.end)break;
      for(let dir=0;dir<4;dir++){const next=mazeMove(puzzle,cell,dir);if(!parents.has(next)){parents.set(next,cell);queue.push(next)}}
    }
    if(!parents.has(puzzle.end))return [];
    const path=[];for(let cell=puzzle.end;cell!==null;cell=parents.get(cell))path.push(cell);
    return path.reverse();
  }
  function mazePuzzle(mode='easy',rng=Math.random){
    const size=mode==='challenge'?7:5,cells=Array(size*size).fill(15),visited=new Set([0]),stack=[0];
    while(stack.length){
      const cell=stack.at(-1),options=[];
      for(let dir=0;dir<4;dir++){
        const [dx,dy]=MAZE_DIRS[dir],x=cell%size+dx,y=Math.floor(cell/size)+dy,next=y*size+x;
        if(x>=0&&y>=0&&x<size&&y<size&&!visited.has(next))options.push({next,dir});
      }
      if(!options.length){stack.pop();continue}
      const {next,dir}=options[pick(options.length,rng)];
      cells[cell]&=~MAZE_DIRS[dir][2];cells[next]&=~MAZE_DIRS[dir][3];visited.add(next);stack.push(next);
    }
    const puzzle={size,cells,start:0,end:size*size-1};puzzle.solution=mazePath(puzzle);return puzzle;
  }
  // Five authored waves: pressure comes from target priority and recognition,
  // not tiny hit boxes or an unbounded speed increase.
  function aimWave(mode='easy',index=0){
    const wave=Math.max(0,Math.min(4,index)),challenge=mode==='challenge';
    const total=[8,10,12,14,16][wave];
    const queue=Array.from({length:total},(_,i)=>{
      if(wave>=2&&i%5===4)return 'avoid';
      if(wave>=1&&i>1&&i%(wave===4?3:5)===2)return 'shield';
      return 'normal';
    });
    return {queue,limit:wave===0?2:3,batch:[1,2,3,3,3][wave],interval:(challenge?[950,1500,1550,1400,1250]:[1100,1850,1950,1800,1650])[wave],lifetime:(challenge?[2500,2300,2100,2000,1900]:[3000,2800,2600,2400,2200])[wave]};
  }
  function aimRun(mode='easy',rng=Math.random){
    return {mode,rng,phase:'playing',wave:0,cleared:0,clock:0,nextSpawn:0,spawned:0,slots:Array(9).fill(null),available:Array(9).fill(0),feedback:Array(9).fill(null),lastSlot:-1,lives:3,score:0,combo:0,maxCombo:0,bonus:0,hits:0,goodTaps:0,strays:0,expired:0,bombs:0,serial:0,event:'',waveRules:aimWave(mode,0)};
  }
  function aimEvent(run,message){run.event=message;run.serial++}
  function aimProgress(run){
    if(run.lives<=0){run.phase='over';aimEvent(run,'生命用完了。这次的分数已保留。');return}
    if(run.spawned===run.waveRules.queue.length&&run.slots.every(target=>!target)){
      run.cleared++;run.phase=run.cleared===5?'over':'between';
      aimEvent(run,run.cleared===5?'五关全部守住了！':`第 ${run.wave+1} 关守住了。选择补给后再继续。`);
    }
  }
  function aimAdvance(run,ms){
    if(run.phase!=='playing'||!Number.isFinite(ms)||ms<0)return;
    const end=run.clock+ms;
    for(let guard=0;guard<10000&&run.phase==='playing';guard++){
      const expiry=Math.min(...run.slots.filter(Boolean).map(target=>target.deadline));
      const spawn=run.spawned<run.waveRules.queue.length?run.nextSpawn:Infinity;
      const next=Math.min(expiry,spawn);
      if(next>end){run.clock=end;return}
      run.clock=next;
      for(let i=0;i<9;i++){
        const target=run.slots[i];if(!target||target.deadline>next)continue;
        run.slots[i]=null;run.available[i]=next+300;
        if(target.kind!=='avoid'){run.lives--;run.combo=0;run.expired++;run.feedback[i]={symbol:'!',text:'漏靶 −1',until:next+300};aimEvent(run,'漏掉一个靶，生命 −1，连击中断。')}
        if(run.lives<=0)break;
      }
      aimProgress(run);if(run.phase!=='playing')return;
      if(spawn===next){
        let spawned=0;const batch=run.wave===0&&run.spawned>=4?2:run.waveRules.batch;
        for(let n=0;n<batch&&run.spawned<run.waveRules.queue.length;n++){
          if(run.slots.filter(Boolean).length>=run.waveRules.limit)break;
          const free=run.slots.map((target,i)=>!target&&run.available[i]<=next?i:-1).filter(i=>i>=0);
          const choices=free.filter(i=>i!==run.lastSlot),pool=choices.length?choices:free;
          if(!pool.length)break;
          const slot=pool[pick(pool.length,run.rng)],kind=run.waveRules.queue[run.spawned++];
          const lifetime=run.waveRules.lifetime+n*200+(kind==='shield'?300:0);
          run.slots[slot]={kind,hp:kind==='shield'?2:1,deadline:next+lifetime,lifetime,lastTap:-Infinity};run.lastSlot=slot;spawned++;
        }
        run.nextSpawn=next+(spawned?run.waveRules.interval:100);
      }
    }
  }
  function aimTap(run,index){
    if(run.phase!=='playing'||!Number.isInteger(index)||index<0||index>8)return false;
    const target=run.slots[index];
    if(!target&&run.available[index]>run.clock)return false;
    if(!target){run.strays++;run.combo=0;aimEvent(run,'点空了，连击中断；生命不扣。');return false}
    if(run.clock-target.lastTap<120)return false;
    target.lastTap=run.clock;
    if(target.kind==='avoid'){
      run.bombs++;run.lives--;run.combo=0;run.feedback[index]={symbol:'!',text:'碰叉 −1',until:run.clock+300};aimEvent(run,'叉号要避开！生命 −1。');
    }else{
      run.goodTaps++;target.hp--;
      if(target.hp){aimEvent(run,'护盾打开了，再点一下！');return true}
      run.hits++;run.combo++;run.maxCombo=Math.max(run.maxCombo,run.combo);
      const multiplier=Math.min(3,1+Math.floor(run.combo/5));
      const points=100*multiplier+run.bonus*25;run.score+=points;
      run.feedback[index]={symbol:'✓',text:`+${points}`,until:run.clock+300};
      aimEvent(run,`命中 +${points} · ${run.combo} 连击${multiplier>1?` · ×${multiplier}`:''}`);
    }
    run.slots[index]=null;run.available[index]=run.clock+300;aimProgress(run);return true;
  }
  function aimUpgrade(run,choice){
    if(run.phase!=='between'||!['heal','bonus'].includes(choice)||choice==='heal'&&run.lives===3)return false;
    if(choice==='heal')run.lives++;else run.bonus++;
    run.wave++;run.waveRules=aimWave(run.mode,run.wave);run.spawned=0;run.nextSpawn=run.clock;run.phase='playing';
    aimEvent(run,`第 ${run.wave+1} 关开始。`);aimAdvance(run,0);return true;
  }
  const definitions={
    odd:{title:'找出不同',description:'轻松档找唯一形状；挑战档会依次练习看轮廓、忽略颜色和辨认形状＋圆点组合。',category:'观察力',unit:'分'},
    line:{title:'一笔连线',description:'从「起」开始，把每条线走一次。通关后可直接练习已解锁关卡，走错可撤销。',category:'逻辑',unit:'关'},
    pulse:{title:'节奏点击',description:'圆点走进中间的框时点一下。轻松档是等拍；挑战档有四段固定长短乐句，可以反复练熟。',category:'反应力',unit:'分'},
    sort:{title:'颜色分类',description:'先点一个盒子，再点目标盒，移动最上面一块。对照最短步数规划路线，需要时可提示一步。',category:'逻辑',unit:'关'},
    maze:{title:'迷你迷宫',description:'用方向按钮、方向键或在迷宫上滑动，让 ● 找到 ★。不限时，慢慢找路。',category:'休闲',unit:'分'}
  };
  function create(host){
    const {$,scene,stat,label,mode,get,set,timeout,interval,clear,invalidate,reset,now}=host;
    let session=null;const bests={},sortRouteBests={};
    const recordKey=(name,choice=mode())=>`${name}:${choice}`;
    function best(name,choice=mode()){
      const key=recordKey(name,choice),n=Number(get(key));
      return Math.max(Number.isSafeInteger(n)&&n>=0?n:0,bests[key]||0);
    }
    function save(score){
      const key=recordKey(session.name);
      if(score>best(session.name)){bests[key]=score;set(key,score)}
    }
    function bestSortRoute(choice=mode()){
      const key=`sortRoute:${choice}`,raw=get(key),saved=Number(raw),values=[];
      if(raw!==null&&String(raw).trim()!==''&&Number.isSafeInteger(saved)&&saved>=0)values.push(saved);
      if(Number.isSafeInteger(sortRouteBests[key]))values.push(sortRouteBests[key]);
      return values.length?Math.min(...values):null;
    }
    function saveSortRoute(extra){
      const key=`sortRoute:${mode()}`,prior=bestSortRoute();
      if(prior===null||extra<prior){sortRouteBests[key]=extra;set(key,extra)}
    }
    function lineTotal(choice=mode()){return choice==='easy'?4:6}
    function lineStartLimit(choice=mode()){return Math.min(lineTotal(choice),Math.max(1,best('line',choice)+1))}
    function refreshLineStart(selected=1){
      const picker=$('lineStartLevel');if(!picker)return;
      const limit=lineStartLimit(),value=Math.max(1,Math.min(limit,Number(selected)||1));
      picker.innerHTML=Array.from({length:limit},(_,i)=>`<option value="${i+1}">第 ${i+1} 关 · ${LINE_LEVEL_NAMES[i]}</option>`).join('');
      picker.value=String(value);
      const note=$('lineUnlockNote');if(note)note.textContent=limit===lineTotal()?`已解锁全部 ${limit} 关`:`已解锁 ${limit} / ${lineTotal()} 关 · 解完当前最高关可继续解锁`;
    }
    function later(fn,delay){const captured=session,generation=host.generation();return timeout(()=>{if(session===captured&&host.generation()===generation)fn()},delay)}
    function controls(){
      if(!session)return;
      $('extraPause').textContent=session.phase==='paused'?'继续游戏':'暂停';
      $('extraPause').hidden=session.phase==='over';
      $('extraUndo').disabled=['paused','over'].includes(session.phase);
      $('extraReset').disabled=['paused','over'].includes(session.phase);
      $('extraNext').disabled=session.phase!=='complete';
      $('extraHint').disabled=session.phase!=='playing';
    }
    function render(name){
      if(!definitions[name])return;
      const lineStart=name==='line'?'<div class="line-start"><label for="lineStartLevel">练习起点</label><select id="lineStartLevel" aria-describedby="lineUnlockNote"></select><small id="lineUnlockNote"></small></div>':'';
      scene.innerHTML=`<div class="game-stats" id="extraStats">${stat('本机最佳',`${best(name)} ${definitions[name].unit}`)}</div><p class="intro-line centered">${definitions[name].description}</p>${lineStart}<div id="extraBoard" class="extra-board"></div><p id="gameMessage" class="game-message" role="status">准备好就开始吧。</p><div id="extraResult"></div><div class="action-wrap"><button type="button" class="primary-action" id="extraStart">开始游戏</button></div><div class="extra-tools"><button type="button" id="extraPause" hidden>暂停</button><button type="button" id="extraHint" hidden>提示一步</button><button type="button" id="extraUndo" hidden>撤销一步</button><button type="button" id="extraReset" hidden>重置本关</button><button type="button" id="extraNext" hidden>下一关</button></div>`;
      if(name==='line')refreshLineStart();
      $('extraBoard').dataset.game=name;
      $('extraStart').addEventListener('click',()=>start(name));
      $('extraPause').addEventListener('click',()=>session?.phase==='paused'?resume():pause());
      $('extraUndo').addEventListener('click',()=>session?.name==='sort'?sortUndo():lineUndo());
      $('extraReset').addEventListener('click',resetLevel);
      $('extraHint').addEventListener('click',()=>session?.name==='maze'?hintMaze():session?.name==='sort'?hintSort():hintLine());
      $('extraNext').addEventListener('click',()=>{
        if(session?.phase!=='complete')return;
        if(session.name==='sort')accountSortLevel();
        session.level++;if(session.name==='line')setupLine();if(session.name==='sort')setupSort();
      });
    }
    function start(name){
      const requestedLineStart=name==='line'?Number($('lineStartLevel')?.value):1;
      reset();render(name);
      session={name,phase:'playing',score:0};
      $('extraStart').textContent='重新开始';$('extraPause').hidden=false;
      if(name==='odd'){
        Object.assign(session,{correct:0,mistakes:0,remaining:45000,deadline:now()+45000});
        nextOdd();runOddClock();
      }
      if(name==='line'){
        const level=Math.max(0,Math.min(lineStartLimit()-1,requestedLineStart-1||0));
        Object.assign(session,{level,startLevel:level,path:[],owner:null});refreshLineStart(level+1);setupLine();
      }
      if(name==='sort'){session.level=0;setupSort()}
      if(name==='maze')setupMaze();
      if(name==='pulse'){
        const timing=pulseTiming(mode());
        Object.assign(session,{timing,judged:Array(timing.beats).fill(null),hits:0,strays:0,started:now(),lastTick:now(),lastTap:-Infinity});
        setupPulse();runPulseClock();pulseTick();
      }
    }
    function finish(score,detail){
      if(!session||session.phase==='over')return;
      invalidate();clear();session.phase='over';session.score=Math.max(0,Math.round(score));save(session.score);controls();
      $('extraBoard').querySelectorAll('button').forEach(button=>button.disabled=true);
      $('extraResult').innerHTML=`<div class="result-card"><h3>${session.score} ${definitions[session.name].unit}</h3><p>${detail}<br>本机最佳 ${best(session.name)} ${definitions[session.name].unit}</p></div>`;
      $('extraStart').textContent='重新挑战';label('完成啦！可以再来一局，或返回大厅。');host.records();
      if(session.name==='odd'&&session.keyboard)$('extraStart').focus?.();
      $('extraUndo').hidden=true;$('extraNext').hidden=true;$('extraReset').hidden=true;$('extraHint').hidden=true;
    }
    function oddStats(){
      $('extraStats').innerHTML=stat('找对',`${session.correct} 处`)+stat('误触',`${session.mistakes} 次`)+stat(mode()==='easy'?'进度':'剩余',mode()==='easy'?`${session.correct} / 10`:`${Math.ceil(Math.max(0,session.deadline-now())/1000)} 秒`)+(mode()==='challenge'?stat('观察',session.board.goal):'');
    }
    function oddDetail(){return `找对 ${session.correct} 处 · 误触 ${session.mistakes} 次${mode()==='challenge'?` · 到达「${session.board.goal}」`:''}`}
    function nextOdd(){
      session.phase='playing';session.feedbackResult=null;session.board=oddBoard(session.correct+1,mode());
      const {side,cells}=session.board;
      $('extraBoard').innerHTML=`<div class="odd-grid" style="--cols:${side}" role="group" aria-label="${session.board.prompt}">${cells.map((cell,i)=>`<button class="odd-cell" type="button" data-odd="${i}" aria-label="第 ${i+1} 个图形，${({circle:'圆形',square:'方形',up:'正三角',down:'倒三角',diamond:'菱形',pentagon:'五边形',hexagon:'六边形',star:'星形'})[cell.shape]}${cell.mark==='dot'?'，中央有圆点':'，中央无圆点'}">${shapeSVG(cell.shape,cell.color,cell.mark)}</button>`).join('')}</div>`;
      for(const button of $('extraBoard').querySelectorAll('[data-odd]'))button.addEventListener('click',event=>tapOdd(Number(button.dataset.odd),event.detail===0));
      oddStats();label(`${session.board.goal}：${session.board.prompt}`);
      if(session.keyboard)$('extraBoard').querySelectorAll('[data-odd]')[0]?.focus?.();
    }
    function runOddClock(){if(mode()==='challenge')interval(()=>{
      if(session?.name!=='odd'||!['playing','feedback'].includes(session.phase))return;
      oddStats();if(now()>=session.deadline)finish(session.correct*100-session.mistakes*10,oddDetail());
    },100)}
    function tapOdd(index,keyboard=false){
      if(session?.name!=='odd'||session.phase!=='playing'||!Number.isInteger(index)||!session.board.cells[index])return;
      session.keyboard=keyboard;
      if(mode()==='challenge'&&now()>=session.deadline){finish(session.correct*100-session.mistakes*10,oddDetail());return}
      const button=$('extraBoard').querySelectorAll('[data-odd]')[index];
      session.phase='feedback';
      if(index!==session.board.target){
        session.feedbackResult='wrong';
        session.mistakes++;button.classList.add('wrong');label(ODD_RULES[session.board.rule].wrong);oddStats();
        later(()=>{button.classList.remove('wrong');session.feedbackResult=null;session.phase='playing'},250);return;
      }
      session.feedbackResult='correct';
      session.correct++;button.classList.add('correct');label(`✓ 找到了！完成「${session.board.goal}」`);oddStats();
      later(()=>{
        if(mode()==='easy'&&session.correct===10)finish(session.correct*100-session.mistakes*10,oddDetail());
        else nextOdd();
      },420);
    }
    function setupLine(){
      session.puzzle=linePuzzle(session.level);session.path=[];session.phase='playing';session.owner=null;session.hint=null;
      $('extraBoard').innerHTML='<div class="line-board" id="lineBoard" role="group" aria-label="从起点连接每条边一次"></div>';
      $('extraUndo').hidden=false;$('extraNext').hidden=true;$('extraReset').hidden=false;$('extraHint').hidden=false;
      const board=$('lineBoard');
      board.addEventListener('click',event=>{const node=event.target.closest('[data-line-node]');if(node)lineNode(Number(node.dataset.lineNode))});
      board.addEventListener('pointerdown',event=>{
        if(session?.name!=='line'||session.phase!=='playing'||session.owner!==null||event.button>0)return;
        const node=event.target.closest('[data-line-node]');if(!node)return;
        event.preventDefault();session.owner=event.pointerId;board.setPointerCapture(event.pointerId);
        const point=session.puzzle.nodes[Number(node.dataset.lineNode)],rect=board.getBoundingClientRect();
        session.lastPoint=[Number.isFinite(event.clientX)?event.clientX:rect.left+point[0]/100*rect.width,Number.isFinite(event.clientY)?event.clientY:rect.top+point[1]/100*rect.height];
        lineNode(Number(node.dataset.lineNode));
      });
      board.addEventListener('pointermove',event=>{
        if(session?.name!=='line'||session.owner!==event.pointerId||session.phase!=='playing')return;
        event.preventDefault();const rect=board.getBoundingClientRect();let samples=[];
        try{samples=Array.from(event.getCoalescedEvents?.()||[])}catch{}
        for(const sample of [...samples,event]){
          if(session?.name!=='line'||session.phase!=='playing'||session.owner!==event.pointerId)break;
          if(!Number.isFinite(sample.clientX)||!Number.isFinite(sample.clientY))continue;
          const to=[sample.clientX,sample.clientY],from=session.lastPoint||to,current=session.path.at(-1);
          const hits=session.puzzle.nodes.map(([x,y],i)=>({i,t:i===current?null:segmentEntry(from,to,[rect.left+x/100*rect.width,rect.top+y/100*rect.height])})).filter(hit=>hit.t!==null).sort((a,b)=>a.t-b.t);
          for(const hit of hits){if(session.phase!=='playing')break;lineNode(hit.i)}
          session.lastPoint=to;
        }
      });
      for(const event of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(event,event=>{if(session?.owner===event.pointerId)releaseLinePointer()});
      drawLine();controls();label('从「起」开始，每条边只走一次。节点可以重复经过。');
    }
    function releaseLinePointer(){
      if(session?.owner==null)return;
      const board=$(session.name==='maze'?'mazeBoard':'lineBoard'),owner=session.owner;session.owner=null;
      try{if(board?.hasPointerCapture(owner))board.releasePointerCapture(owner)}catch{}
    }
    function drawLine(){
      const {puzzle,path}=session,used=new Set(path.slice(1).map((b,i)=>edgeKey(path[i],b)));
      const start=puzzle.solution[0],board=$('lineBoard');
      if(!board.querySelectorAll('[data-line-node]').length){
        board.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true">${puzzle.edges.map(([a,b],i)=>`<line data-line-edge="${i}" x1="${puzzle.nodes[a][0]}" y1="${puzzle.nodes[a][1]}" x2="${puzzle.nodes[b][0]}" y2="${puzzle.nodes[b][1]}"/>`).join('')}</svg>${puzzle.nodes.map(([x,y],i)=>`<button type="button" class="line-node" data-line-node="${i}" style="left:${x}%;top:${y}%">${i===start?'起':i+1}</button>`).join('')}`;
      }
      for(const edge of board.querySelectorAll('[data-line-edge]')){const [a,b]=puzzle.edges[Number(edge.dataset.lineEdge)];edge.classList.toggle('used',used.has(edgeKey(a,b)))}
      for(const node of board.querySelectorAll('[data-line-node]')){
        const i=Number(node.dataset.lineNode),current=path.at(-1)===i;
        node.classList.toggle('current',current);node.classList.toggle('hinted',session.hint===i);
        node.setAttribute('aria-current',current?'true':'false');node.setAttribute('aria-label',`节点 ${i+1}${i===start?'，起点':''}${current?'，当前位置':''}${session.hint===i?'，建议下一步':''}`);
      }
      $('extraStats').innerHTML=stat('关卡',`${session.level+1} / ${mode()==='easy'?4:6}`)+stat('已连线',`${used.size} / ${puzzle.edges.length}`)+stat('本机最佳',`${best('line')} 关`);
    }
    function lineNode(next){
      if(session?.name!=='line'||session.phase!=='playing'||next===session.path.at(-1))return;
      if(!lineAllowed(session.puzzle,session.path,next)){label(session.path.length?'这条边不能再走，试试另一条，或撤销一步。':'请从标着「起」的节点开始。');return}
      session.hint=null;session.path.push(next);drawLine();
      if(session.path.length-1===session.puzzle.edges.length){
        releaseLinePointer();session.score=Math.max(session.score,session.level+1);save(session.score);refreshLineStart(session.level+1);
        if(session.level+1===lineTotal()){
          const detail=session.startLevel?`从第 ${session.startLevel+1} 关练到第 ${lineTotal()} 关`:'全部路线都连好啦！';
          finish(session.score,detail);return;
        }
        session.phase='complete';$('extraNext').hidden=false;controls();label('✓ 一笔完成！点「下一关」继续。');
      }else label('沿相连的边继续；走不通时可以撤销。');
    }
    function lineUndo(){
      if(session?.name!=='line'||!['playing','complete'].includes(session.phase)||!session.path.length)return;
      releaseLinePointer();session.hint=null;session.path.pop();session.phase='playing';$('extraNext').hidden=true;drawLine();controls();label('已撤销一步，可以换条路线。');
    }
    function hintLine(){
      if(session?.name!=='line'||session.phase!=='playing')return;
      const route=lineContinuation(session.puzzle,session.path);
      if(!route){session.hint=null;drawLine();label('这条走法暂时走不通。撤销一步，再试试其他路线。');return}
      session.hint=route[0];drawLine();
      $('lineBoard').querySelectorAll('[data-line-node]')[session.hint]?.focus?.();
      label(`下一步可以走到${session.hint===session.puzzle.solution[0]?'起点':'节点 '+(session.hint+1)}，试试看。`);
    }
    function setupPulse(){
      $('extraBoard').innerHTML=`<div class="pulse-rail" id="pulseRail" aria-hidden="true"><span class="pulse-window" id="pulseWindow" style="width:${session.timing.window*2/session.timing.interval*100}%"></span><span class="pulse-marker" id="pulseMarker"></span><span class="pulse-center">↓</span></div><p class="pulse-signal" id="pulseSignal">准备</p><button type="button" class="pulse-tap" id="pulseTap">点这里<span>或按空格键 · 每拍一次</span></button><div class="pulse-beats" id="pulseBeats" aria-label="每拍结果"></div>`;
      $('pulseTap').addEventListener('pointerdown',event=>{if(event.button>0)return;event.preventDefault();tapPulse()});
      $('pulseTap').addEventListener('click',event=>{if(!event.detail)tapPulse()});
      label(mode()==='challenge'?'挑战是固定四段乐句：先等拍，再听长停顿和短拍；看圆点进框就点。':'看圆点从左向右移动，进入中间的框时点一下。');
    }
    function pulseStats(){
      $('extraStats').innerHTML=stat('命中',`${session.hits} / ${session.timing.beats}`)+stat('误点',`${session.strays} 次`)+stat('本机最佳',`${best('pulse')} 分`);
      $('pulseBeats').innerHTML=session.judged.map((value,i)=>`<span class="${[value,i&&i%session.timing.phraseSize===0?'phrase-start':''].filter(Boolean).join(' ')}" aria-label="第 ${Math.floor(i/session.timing.phraseSize)+1} 乐句第 ${i%session.timing.phraseSize+1} 拍${value==='hit'?'命中':value==='miss'?'错过':'未到'}">${value==='hit'?'✓':value==='miss'?'·':i+1}</span>`).join('');
    }
    function runPulseClock(){interval(pulseTick,32)}
    function pulseTick(){
      if(session?.name!=='pulse'||session.phase!=='playing')return;
      if(now()-session.lastTick>400){pause();label('画面刚才中断了，已暂停。继续后会先给你准备时间。');return}
      session.lastTick=now();const elapsed=now()-session.started,t=session.timing;
      let changed=false;
      for(let i=0;i<t.beats;i++)if(!session.judged[i]&&elapsed>pulseTarget(t,i)+t.window){session.judged[i]='miss';changed=true}
      if(changed)label('刚才错过了一拍，没关系，跟上下一拍。');
      if(elapsed>pulseTarget(t,t.beats-1)+t.window){finish(session.hits*100-session.strays*20,`命中 ${session.hits} / ${t.beats} 拍 · 误点 ${session.strays} 次${mode()==='challenge'?' · 完成 4 段固定乐句':''}`);return}
      const pending=session.judged.findIndex(value=>!value);
      let nearest=0;
      for(let i=1;i<t.beats;i++)if(Math.abs(elapsed-pulseTarget(t,i))<Math.abs(elapsed-pulseTarget(t,nearest)))nearest=i;
      const index=Math.min(t.beats-1,Math.max(pending<0?t.beats-1:pending,nearest,0));
      const target=pulseTarget(t,index),previous=index?pulseTarget(t,index-1):target-t.interval,span=target-previous;
      const error=elapsed-target,ready=Math.abs(error)<=t.window&&!session.judged[index];
      $('pulseMarker').style.left=`${Math.max(0,Math.min(100,50+error/span*100))}%`;
      $('pulseWindow').style.width=`${t.window*2/span*100}%`;
      $('pulseRail').classList.toggle('ready',ready);
      const signal=mode()==='challenge'?`第 ${Math.floor(index/t.phraseSize)+1} 乐句 · ${index%t.phraseSize+1}/4 拍 · ${ready?'现在点！':'准备'}`:`第 ${index+1} 拍 · ${ready?'现在点！':'准备'}`;
      if($('pulseSignal').textContent!==signal)$('pulseSignal').textContent=signal;
      pulseStats();
    }
    function tapPulse(){
      if(session?.name!=='pulse'||session.phase!=='playing'||now()-session.lastTap<180)return;
      if(now()-session.lastTick>400){pause();label('画面中断，已暂停，继续后再跟拍。');return}
      session.lastTap=now();const hit=pulseJudge(now()-session.started,session.timing);
      if(!hit){session.strays++;label('这一拍还没到，等圆点进框再点。');pulseStats();return}
      if(session.judged[hit.index]){label('这一拍已点过，等下一拍。');return}
      session.judged[hit.index]='hit';session.hits++;label('✓ 命中！跟着下一拍。');pulseStats();
    }
    function key(event){
      if(session?.name==='pulse'&&event.code==='Space'){
        if(event.target?.tagName?.toLowerCase()==='button'&&event.target.id!=='pulseTap')return false;
        event.preventDefault();if(!event.repeat)tapPulse();return true;
      }
      if(session?.name==='maze'&&session.phase==='playing'){
        const directions={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3,w:0,d:1,s:2,a:3};
        if(Object.prototype.hasOwnProperty.call(directions,event.key)){event.preventDefault();mazeStep(directions[event.key]);return true}
      }
      return false;
    }
    const SORT_COLORS=['#ffad9d','#80c7f7','#73d9b3','#b9a3f5'],SORT_SYMBOLS=['●','▲','■','★'];
    function accountSortLevel(){
      if(!session.completedRoute)return;
      session.totalMoves+=session.completedRoute.moves;session.totalTarget+=session.target;session.totalHints+=session.completedRoute.hints;session.completedRoute=null;
    }
    function setupSort(){
      session.initial=sortPuzzle(mode());session.capacity=session.initial.capacity;
      session.tubes=session.initial.tubes.map(tube=>[...tube]);session.history=[];session.selected=null;session.hint=null;session.hints=0;session.completedRoute=null;session.phase='playing';
      const targetRoute=sortRoute(session.tubes,session.capacity);session.target=targetRoute?.length??session.initial.solution.length;
      if(session.totalMoves===undefined)Object.assign(session,{totalMoves:0,totalTarget:0,totalHints:0});
      $('extraUndo').hidden=false;$('extraReset').hidden=false;$('extraNext').hidden=true;$('extraHint').hidden=false;$('extraHint').textContent='提示路线';
      drawSort();controls();label(`本关最短 ${session.target} 步。先选一盒，再选目标盒。`);
    }
    function drawSort(){
      const board=$('extraBoard');
      if(!board.querySelectorAll('[data-tube]').length){
        board.innerHTML=`<div class="sort-trays" role="group" aria-label="颜色与图案分类盒">${session.tubes.map((_,i)=>`<button class="sort-tray" data-tube="${i}" type="button"></button>`).join('')}</div>`;
        for(const button of board.querySelectorAll('[data-tube]'))button.addEventListener('click',()=>sortTap(Number(button.dataset.tube)));
      }
      for(const button of board.querySelectorAll('[data-tube]')){
        const i=Number(button.dataset.tube),tube=session.tubes[i];
        button.classList.toggle('selected',session.selected===i);button.setAttribute('aria-pressed',String(session.selected===i));
        button.classList.toggle('hint-from',session.hint?.[0]===i);button.classList.toggle('hint-to',session.hint?.[1]===i);
        button.setAttribute('aria-label',`第 ${i+1} 盒，${tube.length?'从底到顶 '+tube.map(c=>`${c+1}号`).join('、'):'空盒'}${session.hint?.[0]===i?'，提示从这里移出':session.hint?.[1]===i?'，提示移到这里':''}`);
        button.innerHTML=`<span class="sort-stack">${Array.from({length:session.capacity},(_,slot)=>{const color=tube[session.capacity-1-slot];return `<span class="sort-piece ${color===undefined?'empty':''}" style="background:${color===undefined?'transparent':SORT_COLORS[color]}">${color===undefined?'':SORT_SYMBOLS[color]+' '+(color+1)}</span>`}).join('')}</span><small>${i+1} 号盒</small>`;
      }
      const routeBest=bestSortRoute();
      $('extraStats').innerHTML=stat('关卡',`${session.level+1} / ${mode()==='easy'?3:4}`)+stat('路线',`${session.history.length} / ${session.target} 步`)+stat('提示',`${session.hints} 次`)+stat('最佳绕路',routeBest===null?'—':`+${routeBest} 步`);
    }
    function sortTap(index){
      if(session?.name!=='sort'||session.phase!=='playing'||!session.tubes[index])return;
      if(session.selected===null){if(!session.tubes[index].length){label('先选一个有图块的盒子。');return}session.selected=index;drawSort();return}
      const from=session.selected;
      if(from===index){session.selected=null;drawSort();return}
      if(!sortAllowed(session.tubes,from,index,session.capacity)){label('只能移到空盒，或顶层图案相同且没满的盒子。');return}
      session.history.push(session.tubes.map(tube=>[...tube]));session.tubes[index].push(session.tubes[from].pop());session.selected=null;session.hint=null;drawSort();
      if(sortSolved(session.tubes,session.capacity)){
        const moves=session.history.length,extra=Math.max(0,moves-session.target);
        session.completedRoute={moves,hints:session.hints};
        session.score=Math.max(session.score,session.level+1);save(session.score);
        if(session.level+1===(mode()==='easy'?3:4)){
          accountSortLevel();
          const totalExtra=Math.max(0,session.totalMoves-session.totalTarget);saveSortRoute(totalExtra);
          finish(session.score,`总路线 ${session.totalMoves} 步 · 最短目标 ${session.totalTarget} 步 · 多走 ${totalExtra} 步 · 使用提示 ${session.totalHints} 次 · 最佳绕路 +${bestSortRoute()} 步`);return;
        }
        session.phase='complete';$('extraNext').hidden=false;controls();label(extra?`✓ 完成本关，比最短路线多 ${extra} 步。下一关试试更精炼。`:'✓ 最短路线完成！点「下一关」继续。');
      }else label('✓ 移动成功。慢慢想，随时可以撤销或重置本关。');
    }
    function sortUndo(){
      if(session?.name!=='sort'||!['playing','complete'].includes(session.phase)||!session.history.length)return;
      session.tubes=session.history.pop();session.selected=null;session.hint=null;session.completedRoute=null;session.phase='playing';$('extraNext').hidden=true;drawSort();controls();label('已撤销，换个思路试试。');
    }
    function hintSort(){
      if(session?.name!=='sort'||session.phase!=='playing')return;
      const route=sortRoute(session.tubes,session.capacity);
      if(!route?.length){session.hint=null;drawSort();label(route?'已经整理完成。':'当前路线没有可完成解，先撤销一步。');return}
      session.hint=route[0];session.hints++;drawSort();
      $('extraBoard').querySelectorAll('[data-tube]')[session.hint[0]]?.focus?.();
      label(`提示：从 ${session.hint[0]+1} 号盒移到 ${session.hint[1]+1} 号盒。只标路线，不会替你移动。`);
    }
    function resetLevel(){
      if(!session||['paused','over'].includes(session.phase))return;
      if(session.name==='line'){releaseLinePointer();setupLine()}
      if(session.name==='sort'){
        session.tubes=session.initial.tubes.map(tube=>[...tube]);session.history=[];session.selected=null;session.hint=null;session.hints=0;session.completedRoute=null;session.phase='playing';$('extraNext').hidden=true;drawSort();controls();label(`本关已重置，还是原来的题目；最短 ${session.target} 步。`);
      }
      if(session.name==='maze'){
        releaseLinePointer();session.position=session.puzzle.start;session.moves=0;session.hint=null;session.visited=new Set([session.position]);drawMaze();label('已回到入口，还是原来的迷宫。');
      }
    }
    function setupMaze(){
      Object.assign(session,{puzzle:mazePuzzle(mode()),position:0,moves:0,owner:null,visited:new Set([0]),hint:null,hints:0});
      $('extraBoard').innerHTML='<div class="maze-board" id="mazeBoard"></div><p class="maze-legend">● 是你 · ★ 是出口</p><div class="maze-controls" role="group" aria-label="移动角色"><button type="button" data-maze-dir="0" aria-label="向上">↑</button><button type="button" data-maze-dir="3" aria-label="向左">←</button><button type="button" data-maze-dir="2" aria-label="向下">↓</button><button type="button" data-maze-dir="1" aria-label="向右">→</button></div>';
      for(const button of $('extraBoard').querySelectorAll('[data-maze-dir]'))button.addEventListener('click',()=>mazeStep(Number(button.dataset.mazeDir)));
      const board=$('mazeBoard');
      board.addEventListener('pointerdown',event=>{
        if(session?.name!=='maze'||session.phase!=='playing'||session.owner!==null||event.button>0)return;
        event.preventDefault();session.owner=event.pointerId;session.gesture=[event.clientX,event.clientY];board.setPointerCapture(event.pointerId);
      });
      board.addEventListener('pointermove',event=>{
        if(session?.name!=='maze'||session.owner!==event.pointerId||session.phase!=='playing')return;
        event.preventDefault();const dx=event.clientX-session.gesture[0],dy=event.clientY-session.gesture[1];
        if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;
        mazeStep(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));session.gesture=[event.clientX,event.clientY];
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(type,event=>{if(session?.owner===event.pointerId)releaseLinePointer()});
      $('extraReset').hidden=false;$('extraHint').hidden=false;$('extraHint').textContent='提示方向';drawMaze();controls();label('找到通往右下角 ★ 的路，不着急。');
    }
    function drawMaze(){
      const {size,cells,end}=session.puzzle,lines=[];
      for(let cell=0;cell<cells.length;cell++){
        const x=cell%size*10,y=Math.floor(cell/size)*10,walls=cells[cell];
        if(walls&1)lines.push(`M${x} ${y}h10`);
        if(walls&8)lines.push(`M${x} ${y}v10`);
        if(cell%size===size-1&&(walls&2))lines.push(`M${x+10} ${y}v10`);
        if(Math.floor(cell/size)===size-1&&(walls&4))lines.push(`M${x} ${y+10}h10`);
      }
      const hint=session.hint===null?'':`<rect x="${session.hint%size*10+1.4}" y="${Math.floor(session.hint/size)*10+1.4}" width="7.2" height="7.2" rx="1" fill="none" stroke="#a43c2d" stroke-width=".6" stroke-dasharray="1 .8"/>`;
      $('mazeBoard').innerHTML=`<svg viewBox="0 0 ${size*10} ${size*10}" role="img" aria-label="你在第 ${Math.floor(session.position/size)+1} 行第 ${session.position%size+1} 列，出口在右下角${session.hint===null?'':`，建议下一格第 ${Math.floor(session.hint/size)+1} 行第 ${session.hint%size+1} 列`}">${[...session.visited].map(cell=>`<rect x="${cell%size*10+1}" y="${Math.floor(cell/size)*10+1}" width="8" height="8" rx="2" fill="#e0eef8"/>`).join('')}${hint}<path d="${lines.join(' ')}" fill="none" stroke="#202124" stroke-width=".65" stroke-linecap="round"/><text x="${end%size*10+5}" y="${Math.floor(end/size)*10+7.5}" text-anchor="middle" font-size="8" fill="#a43c2d">★</text><circle cx="${session.position%size*10+5}" cy="${Math.floor(session.position/size)*10+5}" r="2.6" fill="#202124"/></svg>`;
      $('extraStats').innerHTML=stat('迷宫',`${size} × ${size}`)+stat('已走',`${session.moves} 步`)+stat('本机最佳',`${best('maze')} 分`);
    }
    function mazeStep(direction){
      if(session?.name!=='maze'||session.phase!=='playing')return;
      const next=mazeMove(session.puzzle,session.position,direction);
      if(next===session.position){label('前面有墙，换个方向看看。');return}
      session.hint=null;session.position=next;session.moves++;session.visited.add(next);drawMaze();
      if(next===session.puzzle.end){
        releaseLinePointer();const shortest=session.puzzle.solution.length-1;
        finish(shortest/session.moves*1000,`找到出口！走了 ${session.moves} 步 · 最短路线 ${shortest} 步 · 使用提示 ${session.hints} 次`);
      }else label(`已走 ${session.moves} 步，继续寻找 ★。`);
    }
    function hintMaze(){
      if(session?.name!=='maze'||session.phase!=='playing')return;
      const route=mazePath(session.puzzle,session.position);if(route.length<2)return;
      session.hint=route[1];session.hints++;drawMaze();
      const delta=session.hint-session.position,dir=delta===1?1:delta===-1?3:delta>0?2:0;
      [...$('extraBoard').querySelectorAll('[data-maze-dir]')].find(button=>Number(button.dataset.mazeDir)===dir)?.focus?.();
      label(`下一步可以向${['上','右','下','左'][dir]}。虚线框标出了那一格，你来移动。`);
    }
    function pause(){
      if(!session||['paused','over'].includes(session.phase))return;
      if(session.name==='odd')session.remaining=Math.max(0,session.deadline-now());
      releaseLinePointer();session.resumePhase=session.phase==='complete'?'complete':'playing';session.phase='paused';invalidate();clear();controls();
      $('extraBoard').setAttribute('aria-disabled','true');label('已暂停。点「继续游戏」后再玩。');
    }
    function resume(){
      if(session?.phase!=='paused')return;
      session.phase=session.resumePhase;$('extraBoard').setAttribute('aria-disabled','false');controls();
      if(session.name==='odd'){
        session.deadline=now()+session.remaining;
        // Preserve an unanswered or wrongly answered board. Only a correct
        // answer whose feedback timer was interrupted should advance.
        if(session.feedbackResult==='correct'){
          if(mode()==='easy'&&session.correct>=10){finish(session.correct*100-session.mistakes*10,oddDetail());return}
          nextOdd();
        }else{
          session.feedbackResult=null;
          for(const button of $('extraBoard').querySelectorAll('.wrong'))button.classList.remove('wrong');
          oddStats();
        }
        runOddClock();
      }
      if(session.name==='pulse'){
        const next=session.judged.findIndex(value=>!value);
        if(next<0){finish(session.hits*100-session.strays*20,`命中 ${session.hits} 拍`);return}
        session.started=now()-(pulseTarget(session.timing,next)-1000);
        session.lastTick=now();session.lastTap=-Infinity;runPulseClock();pulseTick();
      }
      label('继续啦，慢慢来。');
    }
    function stop(){releaseLinePointer();session=null}
    return {render,start,pause,resume,stop,best,bestSortRoute,tapOdd,lineNode,lineUndo,hintLine,tapPulse,sortTap,sortUndo,hintSort,resetLevel,mazeStep,hintMaze,key,state:()=>session};
  }
  function createAimArcade(host){
    const {$,scene,stat,label,mode,get,set,now}=host;
    let run=null,lastTick=0,announced=-1,finished=false;
    const recordKey=(choice=mode())=>`aimArcade:${choice}`;
    function best(choice=mode()){
      const value=Number(get(recordKey(choice)));return Number.isSafeInteger(value)&&value>=0?value:0;
    }
    function render(){
      scene.innerHTML=`<div class="game-stats">${stat('目标','守住五关')}${stat('生命','3 格')}${stat('街机最佳',`${best()} 分`)}</div><div class="aim-arcade-intro"><strong>连击守关</strong><p>点圆靶 ◎，护盾靶 ◇ 点两次，叉号 × 别碰。<br>先救快消失的靶；5 连击 ×2，10 连击 ×3。</p><div class="aim-legend"><span>◎ 点 1 次</span><span>◇ 点 2 次</span><span>× 别碰</span></div><p>共五关，关间选恢复生命或加分。点空只断连击；漏靶或碰叉号扣一格生命。</p></div><p id="gameMessage" class="game-message" role="status">先从圆靶开始，后面逐关加入新规则。</p><div class="action-wrap aim-actions"><button type="button" class="primary-action" id="aimArcadeStart">开始守关</button><button type="button" class="aim-secondary" id="aimStart">经典练习</button></div>`;
      $('aimArcadeStart').addEventListener('click',start);$('aimStart').addEventListener('click',host.practice);
    }
    function shell(){
      scene.innerHTML=`<div id="aimArcadeStats" class="game-stats"></div><div class="aim-round-line"><strong id="aimWaveTitle"></strong><span id="aimWaveProgress"></span></div><div id="aimArcadeBoard" class="aim-arcade-board" role="group" aria-label="九宫格靶场；键盘数字 1 到 9 对应从左到右、从上到下的位置">${Array.from({length:9},(_,i)=>`<button type="button" class="aim-cell" data-aim-cell="${i}" aria-label="位置 ${i+1}，空位"><span class="aim-cell-symbol" aria-hidden="true">·</span><small class="aim-cell-detail" aria-hidden="true">${i+1}</small><span class="aim-cell-meter" aria-hidden="true"></span></button>`).join('')}</div><div class="aim-legend"><span>◎ 点一次</span><span>◇ 点两次</span><span>× 不要碰</span></div><p id="gameMessage" class="game-message" role="status"></p><div id="aimArcadeDecision" class="aim-decision" hidden></div><div id="aimArcadeResult"></div><div class="extra-tools"><button type="button" id="aimArcadePause">暂停</button><button type="button" id="aimArcadeEnd">结束并结算</button></div>`;
      for(const button of cells())button.addEventListener('click',()=>tap(Number(button.dataset.aimCell)));
      $('aimArcadePause').addEventListener('click',()=>run?.phase==='paused'?resume():pause());
      $('aimArcadeEnd').addEventListener('click',()=>{if(!run||run.phase==='over')return;run.phase='over';aimEvent(run,'已主动结算，可以再来一局。');finish()});
    }
    function cells(){return [...$('aimArcadeBoard').querySelectorAll('[data-aim-cell]')]}
    function start(){
      host.reset();run=aimRun(mode());announced=-1;finished=false;shell();aimAdvance(run,0);lastTick=now();
      aimEvent(run,'第一关：点中 ◎。下方短条和秒数表示靶还会停留多久。');draw();ticker();
    }
    function ticker(){host.interval(()=>tick(),50)}
    function tick(){
      if(!run||run.phase!=='playing')return false;
      const elapsed=now()-lastTick;
      if(elapsed>400){pause();label('画面中断了，已暂停保护生命。点继续后再玩。');return false}
      lastTick=now();aimAdvance(run,Math.max(0,elapsed));draw();
      if(run.phase==='over')finish();else if(run.phase==='between')decision();
      return run.phase==='playing';
    }
    function tap(index){
      if(!tick())return;
      aimTap(run,index);draw();
      if(run.phase==='over')finish();else if(run.phase==='between')decision();
    }
    function draw(){
      if(!run)return;
      $('aimArcadeStats').innerHTML=stat('得分',`${run.score}`)+stat('生命',`${'♥'.repeat(Math.max(0,run.lives))}${'♡'.repeat(3-Math.max(0,run.lives))}`)+stat('连击',`${run.combo} · ×${Math.min(3,1+Math.floor(run.combo/5))}`);
      $('aimWaveTitle').textContent=`第 ${run.wave+1} / 5 关`;
      const remaining=run.slots.filter(Boolean).length+run.waveRules.queue.length-run.spawned;
      $('aimWaveProgress').textContent=`本关剩余 ${remaining} 个 · 每靶额外 +${run.bonus*25}`;
      for(const [i,button] of cells().entries()){
        const target=run.slots[i],left=target?Math.max(0,target.deadline-run.clock):0,feedback=!target&&run.feedback[i]?.until>run.clock?run.feedback[i]:null;
        button.className='aim-cell'+(target?' '+target.kind:feedback?' aim-cell-feedback':'')+(target&&left<900?' urgent':'');button.disabled=run.phase!=='playing';
        const symbol=target?target.kind==='avoid'?'×':target.kind==='shield'?'◇':'◎':feedback?.symbol||'·';
        button.querySelector('.aim-cell-symbol').textContent=symbol;
        button.querySelector('.aim-cell-detail').textContent=target?target.kind==='avoid'?'别碰':`${target.hp} 次 · ${(left/1000).toFixed(1)}s`:feedback?.text||String(i+1);
        button.querySelector('.aim-cell-meter').style.width=`${target?left/target.lifetime*100:0}%`;
        const name=target?target.kind==='avoid'?'叉号，不要碰':target.kind==='shield'?`护盾靶，还需 ${target.hp} 次`:'圆靶，点一次':'空位';
        button.setAttribute('aria-label',`位置 ${i+1}，${name}`);
      }
      $('aimArcadePause').textContent=run.phase==='paused'?'继续游戏':run.phase==='ready'?'准备中…':'暂停';
      $('aimArcadePause').disabled=!['playing','paused'].includes(run.phase);
      if(run.serial!==announced){announced=run.serial;label(run.event)}
    }
    function decision(){
      host.clear();draw();const panel=$('aimArcadeDecision');panel.hidden=false;
      const next=run.wave+2,intro=next===2?'下一关加入 ◇ 护盾靶：分两次点开。':next===3?'下一关加入 × 叉号：等它自己消失。':'下一关目标会更密，先处理快消失的靶。';
      panel.innerHTML=`<h3>第 ${run.cleared} 关完成</h3><p>${intro}<br>选一项补给，准备好再继续。</p><div class="aim-upgrades"><button type="button" id="aimHeal"${run.lives===3?' disabled':''}>恢复 1 格生命<small>${run.lives===3?'生命已满':`${run.lives} → ${run.lives+1} 格`}</small></button><button type="button" id="aimBonus">每靶再加 25 分<small>更高得分，生命不恢复</small></button></div>`;
      $('aimHeal').addEventListener('click',()=>upgrade('heal'));$('aimBonus').addEventListener('click',()=>upgrade('bonus'));
      (run.lives<3?$('aimHeal'):$('aimBonus')).focus?.();
    }
    function upgrade(choice){
      if(!run||!aimUpgrade(run,choice))return;
      $('aimArcadeDecision').hidden=true;run.phase='paused';resume();
    }
    function pause(){
      if(!run||!['playing','ready'].includes(run.phase))return;
      host.invalidate();host.clear();run.phase='paused';draw();label('已暂停，靶与倒计时都停住了。');
    }
    function resume(){
      if(run?.phase!=='paused')return;
      run.phase='ready';draw();label('准备…靶场将在一秒后继续。');
      const captured=run,generation=host.generation();
      host.timeout(()=>{
        if(run!==captured||host.generation()!==generation||run.phase!=='ready')return;
        run.phase='playing';lastTick=now();draw();label('继续！先看清再点。');ticker();
      },1000);
    }
    function finish(){
      if(!run||finished)return;finished=true;host.invalidate();host.clear();run.phase='over';draw();
      if(run.score>best())set(recordKey(),run.score);
      $('aimArcadeDecision').hidden=true;$('aimArcadePause').hidden=true;$('aimArcadeEnd').hidden=true;
      const rate=Math.round(run.goodTaps/Math.max(1,run.goodTaps+run.strays+run.bombs)*100);
      $('aimArcadeResult').innerHTML=`<div class="result-card"><h3>${run.cleared===5?'五关全通！':`守住 ${run.cleared} 关`} · ${run.score} 分</h3><p>命中 ${run.hits} 靶 · 最高 ${run.maxCombo} 连击 · 准确率 ${rate}%<br>漏靶 ${run.expired} 次 · 碰叉号 ${run.bombs} 次<br>街机最佳 ${best()} 分</p><button type="button" class="primary-action" id="aimArcadeAgain">再守一次</button></div>`;
      $('aimArcadeAgain').addEventListener('click',start);label(run.event);host.records();
    }
    function key(event){
      if(!run||!/^[1-9]$/.test(event.key))return;
      event.preventDefault();if(!event.repeat)tap(Number(event.key)-1);
    }
    function stop(){run=null;finished=false}
    return {render,start,pause,resume,stop,key,best,state:()=>run};
  }
  return {definitions,create,createAimArcade,rules:{aimWave,aimRun,aimAdvance,aimTap,aimUpgrade,oddRule,oddBoard,linePuzzle,lineAllowed,lineContinuation,segmentEntry,edgeKey,pulseTiming,pulseTarget,pulseJudge,sortPuzzle,sortAllowed,sortSolved,sortRoute,mazePuzzle,mazeMove,mazePath}};
})();
