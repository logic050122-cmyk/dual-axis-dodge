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
  function oddBoard(round,mode='easy',rng=Math.random){
    const pairs=[['circle','square'],['up','circle'],['square','diamond'],['up','down'],['pentagon','hexagon']];
    const tier=Math.min(4,Math.floor(Math.max(0,round-1)/3)+(mode==='challenge'?1:0));
    let [normal,odd]=pairs[tier];if(pick(2,rng)) [normal,odd]=[odd,normal];
    const side=round<4?3:4,target=pick(side*side,rng);
    return {side,target,cells:Array.from({length:side*side},(_,i)=>({shape:i===target?odd:normal,color:tier<2&&i===target?'#80c7f7':'#73d9b3'}))};
  }
  function shapeSVG(shape,color){return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="${color}" stroke="#202124" stroke-width="2.5" stroke-linejoin="round">${SHAPES[shape]}</svg>`}
  const LINE_LEVELS=[
    {nodes:[[20,80],[50,20],[80,80]],trail:[0,1,2,0]},
    {nodes:[[20,20],[80,20],[80,80],[20,80]],trail:[0,1,2,3,0]},
    {nodes:[[20,80],[20,20],[80,20],[80,80],[50,50]],trail:[0,1,2,3,0,4,2]},
    {nodes:[[12,80],[12,20],[50,50],[88,20],[88,80]],trail:[2,0,1,2,3,4,2]},
    {nodes:[[20,82],[20,40],[50,12],[80,40],[80,82],[50,61]],trail:[0,1,2,3,1,5,4,3,5,0,4]},
    {nodes:[[15,15],[50,15],[85,15],[85,50],[85,85],[50,85],[15,85],[15,50],[50,50]],trail:[0,1,2,3,4,5,6,7,0,8,4]}
  ];
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
  function pulseTiming(mode){return mode==='challenge'?{interval:800,window:210,beats:16,lead:1600}:{interval:1000,window:280,beats:12,lead:1600}}
  function pulseJudge(elapsed,timing){
    const index=Math.round((elapsed-timing.lead)/timing.interval)+0;
    if(index<0||index>=timing.beats)return null;
    const error=elapsed-(timing.lead+index*timing.interval);
    return Math.abs(error)<=timing.window?{index,error}:null;
  }
  function sortSolved(tubes,capacity){return tubes.every(tube=>tube.length===0||(tube.length===capacity&&tube.every(color=>color===tube[0])))}
  function sortAllowed(tubes,from,to,capacity){
    return Number.isInteger(from)&&Number.isInteger(to)&&from!==to&&!!tubes[from]?.length&&!!tubes[to]&&tubes[to].length<capacity&&(!tubes[to].length||tubes[to].at(-1)===tubes[from].at(-1));
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
  const definitions={
    odd:{title:'找出不同',description:'找到唯一形状不同的那一个。轻松模式不限时；挑战模式 45 秒。',category:'观察力',unit:'分'},
    line:{title:'一笔连线',description:'从「起」开始，把每条线走一次。可以滑动或依次点节点，走错就撤销。',category:'逻辑',unit:'关'},
    pulse:{title:'节奏点击',description:'圆点走进中间的框时点一下，每拍一次。纯视觉节拍，静音也能玩。',category:'反应力',unit:'分'},
    sort:{title:'颜色分类',description:'先点一个盒子，再点空盒或顶层相同图案的盒子，移动最上面一块。每盒整理成同一类。',category:'逻辑',unit:'关'},
    maze:{title:'迷你迷宫',description:'用方向按钮、方向键或在迷宫上滑动，让 ● 找到 ★。不限时，慢慢找路。',category:'休闲',unit:'分'}
  };
  function create(host){
    const {$,scene,stat,label,mode,get,set,timeout,interval,clear,invalidate,reset,now}=host;
    let session=null;const bests={};
    const recordKey=(name,choice=mode())=>`${name}:${choice}`;
    function best(name,choice=mode()){
      const key=recordKey(name,choice),n=Number(get(key));
      return Math.max(Number.isSafeInteger(n)&&n>=0?n:0,bests[key]||0);
    }
    function save(score){
      const key=recordKey(session.name);
      if(score>best(session.name)){bests[key]=score;set(key,score)}
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
      scene.innerHTML=`<div class="game-stats" id="extraStats">${stat('本机最佳',`${best(name)} ${definitions[name].unit}`)}</div><p class="intro-line centered">${definitions[name].description}</p><div id="extraBoard" class="extra-board"></div><p id="gameMessage" class="game-message" role="status">准备好就开始吧。</p><div id="extraResult"></div><div class="action-wrap"><button type="button" class="primary-action" id="extraStart">开始游戏</button></div><div class="extra-tools"><button type="button" id="extraPause" hidden>暂停</button><button type="button" id="extraHint" hidden>提示一步</button><button type="button" id="extraUndo" hidden>撤销一步</button><button type="button" id="extraReset" hidden>重置本关</button><button type="button" id="extraNext" hidden>下一关</button></div>`;
      $('extraStart').addEventListener('click',()=>start(name));
      $('extraPause').addEventListener('click',()=>session?.phase==='paused'?resume():pause());
      $('extraUndo').addEventListener('click',()=>session?.name==='sort'?sortUndo():lineUndo());
      $('extraReset').addEventListener('click',resetLevel);
      $('extraHint').addEventListener('click',hintLine);
      $('extraNext').addEventListener('click',()=>{
        if(session?.phase!=='complete')return;
        session.level++;if(session.name==='line')setupLine();if(session.name==='sort')setupSort();
      });
    }
    function start(name){
      reset();render(name);
      session={name,phase:'playing',score:0};
      $('extraStart').textContent='重新开始';$('extraPause').hidden=false;
      if(name==='odd'){
        Object.assign(session,{correct:0,mistakes:0,remaining:45000,deadline:now()+45000});
        nextOdd();runOddClock();
      }
      if(name==='line'){Object.assign(session,{level:0,path:[],owner:null});setupLine()}
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
      $('extraUndo').hidden=true;$('extraNext').hidden=true;$('extraReset').hidden=true;$('extraHint').hidden=true;
    }
    function oddStats(){
      $('extraStats').innerHTML=stat('找对',`${session.correct} 处`)+stat('误触',`${session.mistakes} 次`)+stat(mode()==='easy'?'进度':'剩余',mode()==='easy'?`${session.correct} / 10`:`${Math.ceil(Math.max(0,session.deadline-now())/1000)} 秒`);
    }
    function nextOdd(){
      session.phase='playing';session.board=oddBoard(session.correct+1,mode());
      const {side,cells}=session.board;
      $('extraBoard').innerHTML=`<div class="odd-grid" style="--cols:${side}" role="group" aria-label="选择唯一形状不同的图形">${cells.map((cell,i)=>`<button class="odd-cell" type="button" data-odd="${i}" aria-label="第 ${i+1} 个图形，${({circle:'圆形',square:'方形',up:'正三角',down:'倒三角',diamond:'菱形',pentagon:'五边形',hexagon:'六边形',star:'星形'})[cell.shape]}">${shapeSVG(cell.shape,cell.color)}</button>`).join('')}</div>`;
      for(const button of $('extraBoard').querySelectorAll('[data-odd]'))button.addEventListener('click',()=>tapOdd(Number(button.dataset.odd)));
      oddStats();label('找到唯一形状不同的一个。');
    }
    function runOddClock(){if(mode()==='challenge')interval(()=>{
      if(session?.name!=='odd'||!['playing','feedback'].includes(session.phase))return;
      oddStats();if(now()>=session.deadline)finish(session.correct*100-session.mistakes*10,`找对 ${session.correct} 处 · 误触 ${session.mistakes} 次`);
    },100)}
    function tapOdd(index){
      if(session?.name!=='odd'||session.phase!=='playing'||!Number.isInteger(index)||!session.board.cells[index])return;
      if(mode()==='challenge'&&now()>=session.deadline){finish(session.correct*100-session.mistakes*10,`找对 ${session.correct} 处`);return}
      const button=$('extraBoard').querySelectorAll('[data-odd]')[index];
      session.phase='feedback';
      if(index!==session.board.target){
        session.mistakes++;button.classList.add('wrong');label('这个和大多数一样，再观察一下形状。');oddStats();
        later(()=>{button.classList.remove('wrong');session.phase='playing'},250);return;
      }
      session.correct++;button.classList.add('correct');label('✓ 找到了！');oddStats();
      later(()=>{
        if(mode()==='easy'&&session.correct===10)finish(session.correct*100-session.mistakes*10,`找对 10 处 · 误触 ${session.mistakes} 次`);
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
        releaseLinePointer();session.score=Math.max(session.score,session.level+1);save(session.score);
        if(session.level+1===(mode()==='easy'?4:6)){finish(session.score,'全部路线都连好啦！');return}
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
      $('extraBoard').innerHTML=`<div class="pulse-rail" id="pulseRail" aria-hidden="true"><span class="pulse-window" style="width:${session.timing.window*2/session.timing.interval*100}%"></span><span class="pulse-marker" id="pulseMarker"></span><span class="pulse-center">↓</span></div><p class="pulse-signal" id="pulseSignal">准备</p><button type="button" class="pulse-tap" id="pulseTap">点这里<span>或按空格键 · 每拍一次</span></button><div class="pulse-beats" id="pulseBeats" aria-label="每拍结果"></div>`;
      $('pulseTap').addEventListener('pointerdown',event=>{if(event.button>0)return;event.preventDefault();tapPulse()});
      $('pulseTap').addEventListener('click',event=>{if(!event.detail)tapPulse()});
      label('看圆点从左向右移动，进入中间的框时点一下。');
    }
    function pulseStats(){
      $('extraStats').innerHTML=stat('命中',`${session.hits} / ${session.timing.beats}`)+stat('误点',`${session.strays} 次`)+stat('本机最佳',`${best('pulse')} 分`);
      $('pulseBeats').innerHTML=session.judged.map((value,i)=>`<span class="${value||''}" aria-label="第 ${i+1} 拍${value==='hit'?'命中':value==='miss'?'错过':'未到'}">${value==='hit'?'✓':value==='miss'?'·':i+1}</span>`).join('');
    }
    function runPulseClock(){interval(pulseTick,32)}
    function pulseTick(){
      if(session?.name!=='pulse'||session.phase!=='playing')return;
      if(now()-session.lastTick>400){pause();label('画面刚才中断了，已暂停。继续后会先给你准备时间。');return}
      session.lastTick=now();const elapsed=now()-session.started,t=session.timing;
      let changed=false;
      for(let i=0;i<t.beats;i++)if(!session.judged[i]&&elapsed>t.lead+i*t.interval+t.window){session.judged[i]='miss';changed=true}
      if(changed)label('刚才错过了一拍，没关系，跟上下一拍。');
      if(elapsed>t.lead+(t.beats-1)*t.interval+t.window){finish(session.hits*100-session.strays*20,`命中 ${session.hits} / ${t.beats} 拍 · 误点 ${session.strays} 次`);return}
      const pending=session.judged.findIndex(value=>!value);
      const index=Math.min(t.beats-1,Math.max(pending<0?t.beats-1:pending,Math.round((elapsed-t.lead)/t.interval),0));
      const error=elapsed-(t.lead+index*t.interval),ready=Math.abs(error)<=t.window&&!session.judged[index];
      $('pulseMarker').style.left=`${Math.max(0,Math.min(100,50+error/t.interval*100))}%`;
      $('pulseRail').classList.toggle('ready',ready);
      const signal=`第 ${index+1} 拍 · ${ready?'现在点！':'准备'}`;
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
    function setupSort(){
      session.initial=sortPuzzle(mode());session.capacity=session.initial.capacity;
      session.tubes=session.initial.tubes.map(tube=>[...tube]);session.history=[];session.selected=null;session.phase='playing';
      $('extraUndo').hidden=false;$('extraReset').hidden=false;$('extraNext').hidden=true;
      drawSort();controls();label('先选一盒，再点空盒或顶层相同的盒子。只移动最上面一块。');
    }
    function drawSort(){
      $('extraBoard').innerHTML=`<div class="sort-trays" role="group" aria-label="颜色与图案分类盒">${session.tubes.map((tube,i)=>`<button class="sort-tray ${session.selected===i?'selected':''}" data-tube="${i}" type="button" aria-pressed="${session.selected===i}" aria-label="第 ${i+1} 盒，${tube.length?'从底到顶 '+tube.map(c=>`${c+1}号`).join('、'):'空盒'}"><span class="sort-stack">${Array.from({length:session.capacity},(_,slot)=>{const color=tube[session.capacity-1-slot];return `<span class="sort-piece ${color===undefined?'empty':''}" style="background:${color===undefined?'transparent':SORT_COLORS[color]}">${color===undefined?'':SORT_SYMBOLS[color]+' '+(color+1)}</span>`}).join('')}</span><small>${i+1} 号盒</small></button>`).join('')}</div>`;
      for(const button of $('extraBoard').querySelectorAll('[data-tube]'))button.addEventListener('click',()=>sortTap(Number(button.dataset.tube)));
      $('extraStats').innerHTML=stat('关卡',`${session.level+1} / ${mode()==='easy'?3:4}`)+stat('移动',`${session.history.length} 步`)+stat('本机最佳',`${best('sort')} 关`);
    }
    function sortTap(index){
      if(session?.name!=='sort'||session.phase!=='playing'||!session.tubes[index])return;
      if(session.selected===null){if(!session.tubes[index].length){label('先选一个有图块的盒子。');return}session.selected=index;drawSort();return}
      const from=session.selected;
      if(from===index){session.selected=null;drawSort();return}
      if(!sortAllowed(session.tubes,from,index,session.capacity)){label('只能移到空盒，或顶层图案相同且没满的盒子。');return}
      session.history.push(session.tubes.map(tube=>[...tube]));session.tubes[index].push(session.tubes[from].pop());session.selected=null;drawSort();
      if(sortSolved(session.tubes,session.capacity)){
        session.score=Math.max(session.score,session.level+1);save(session.score);
        if(session.level+1===(mode()==='easy'?3:4)){finish(session.score,'所有图块都分好类啦！');return}
        session.phase='complete';$('extraNext').hidden=false;controls();label('✓ 每盒都整理好了！可以继续下一关。');
      }else label('✓ 移动成功。慢慢想，随时可以撤销或重置本关。');
    }
    function sortUndo(){
      if(session?.name!=='sort'||!['playing','complete'].includes(session.phase)||!session.history.length)return;
      session.tubes=session.history.pop();session.selected=null;session.phase='playing';$('extraNext').hidden=true;drawSort();controls();label('已撤销，换个思路试试。');
    }
    function resetLevel(){
      if(!session||['paused','over'].includes(session.phase))return;
      if(session.name==='line'){releaseLinePointer();setupLine()}
      if(session.name==='sort'){
        session.tubes=session.initial.tubes.map(tube=>[...tube]);session.history=[];session.selected=null;session.phase='playing';$('extraNext').hidden=true;drawSort();controls();label('本关已重置，还是原来的题目。');
      }
      if(session.name==='maze'){
        releaseLinePointer();session.position=session.puzzle.start;session.moves=0;session.visited=new Set([session.position]);drawMaze();label('已回到入口，还是原来的迷宫。');
      }
    }
    function setupMaze(){
      Object.assign(session,{puzzle:mazePuzzle(mode()),position:0,moves:0,owner:null,visited:new Set([0])});
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
      $('extraReset').hidden=false;drawMaze();controls();label('找到通往右下角 ★ 的路，不着急。');
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
      $('mazeBoard').innerHTML=`<svg viewBox="0 0 ${size*10} ${size*10}" role="img" aria-label="你在第 ${Math.floor(session.position/size)+1} 行第 ${session.position%size+1} 列，出口在右下角">${[...session.visited].map(cell=>`<rect x="${cell%size*10+1}" y="${Math.floor(cell/size)*10+1}" width="8" height="8" rx="2" fill="#e0eef8"/>`).join('')}<path d="${lines.join(' ')}" fill="none" stroke="#202124" stroke-width=".65" stroke-linecap="round"/><text x="${end%size*10+5}" y="${Math.floor(end/size)*10+7.5}" text-anchor="middle" font-size="8" fill="#a43c2d">★</text><circle cx="${session.position%size*10+5}" cy="${Math.floor(session.position/size)*10+5}" r="2.6" fill="#202124"/></svg>`;
      $('extraStats').innerHTML=stat('迷宫',`${size} × ${size}`)+stat('已走',`${session.moves} 步`)+stat('本机最佳',`${best('maze')} 分`);
    }
    function mazeStep(direction){
      if(session?.name!=='maze'||session.phase!=='playing')return;
      const next=mazeMove(session.puzzle,session.position,direction);
      if(next===session.position){label('前面有墙，换个方向看看。');return}
      session.position=next;session.moves++;session.visited.add(next);drawMaze();
      if(next===session.puzzle.end){
        releaseLinePointer();const shortest=session.puzzle.solution.length-1;
        finish(shortest/session.moves*1000,`找到出口！走了 ${session.moves} 步 · 最短路线 ${shortest} 步`);
      }else label(`已走 ${session.moves} 步，继续寻找 ★。`);
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
        // A correct answer already counted before pause gets a fresh board.
        nextOdd();
        if(mode()==='easy'&&session.correct>=10){finish(session.correct*100-session.mistakes*10,`找对 10 处`);return}
        runOddClock();
      }
      if(session.name==='pulse'){
        const next=session.judged.findIndex(value=>!value);
        if(next<0){finish(session.hits*100-session.strays*20,`命中 ${session.hits} 拍`);return}
        session.started=now()-(session.timing.lead+next*session.timing.interval-1000);
        session.lastTick=now();session.lastTap=-Infinity;runPulseClock();pulseTick();
      }
      label('继续啦，慢慢来。');
    }
    function stop(){releaseLinePointer();session=null}
    return {render,start,pause,resume,stop,best,tapOdd,lineNode,lineUndo,hintLine,tapPulse,sortTap,sortUndo,resetLevel,mazeStep,key,state:()=>session};
  }
  return {definitions,create,rules:{oddBoard,linePuzzle,lineAllowed,lineContinuation,segmentEntry,edgeKey,pulseTiming,pulseJudge,sortPuzzle,sortAllowed,sortSolved,mazePuzzle,mazeMove,mazePath}};
})();
