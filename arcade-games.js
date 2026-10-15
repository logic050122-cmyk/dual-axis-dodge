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
  const definitions={
    odd:{title:'找出不同',description:'找到唯一形状不同的那一个。轻松模式不限时；挑战模式 45 秒。',category:'观察力',unit:'分'},
    line:{title:'一笔连线',description:'从「起」开始，把每条线走一次。可以滑动或依次点节点，走错就撤销。',category:'逻辑',unit:'关'}
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
      $('extraNext').disabled=session.phase!=='complete';
    }
    function render(name){
      if(!definitions[name])return;
      scene.innerHTML=`<div class="game-stats" id="extraStats">${stat('本机最佳',`${best(name)} ${definitions[name].unit}`)}</div><p class="intro-line centered">${definitions[name].description}</p><div id="extraBoard" class="extra-board"></div><p id="gameMessage" class="game-message" role="status">准备好就开始吧。</p><div id="extraResult"></div><div class="action-wrap"><button type="button" class="primary-action" id="extraStart">开始游戏</button></div><div class="extra-tools"><button type="button" id="extraPause" hidden>暂停</button><button type="button" id="extraUndo" hidden>撤销一步</button><button type="button" id="extraNext" hidden>下一关</button></div>`;
      $('extraStart').addEventListener('click',()=>start(name));
      $('extraPause').addEventListener('click',()=>session?.phase==='paused'?resume():pause());
      $('extraUndo').addEventListener('click',lineUndo);
      $('extraNext').addEventListener('click',()=>{if(session?.name==='line'&&session.phase==='complete'){session.level++;setupLine()}});
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
    }
    function finish(score,detail){
      if(!session||session.phase==='over')return;
      invalidate();clear();session.phase='over';session.score=Math.max(0,Math.round(score));save(session.score);controls();
      $('extraBoard').querySelectorAll('button').forEach(button=>button.disabled=true);
      $('extraResult').innerHTML=`<div class="result-card"><h3>${session.score} ${definitions[session.name].unit}</h3><p>${detail}<br>本机最佳 ${best(session.name)} ${definitions[session.name].unit}</p></div>`;
      $('extraStart').textContent='重新挑战';label('完成啦！可以再来一局，或返回大厅。');host.records();
      $('extraUndo').hidden=true;$('extraNext').hidden=true;
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
      session.puzzle=linePuzzle(session.level);session.path=[];session.phase='playing';session.owner=null;
      $('extraBoard').innerHTML='<div class="line-board" id="lineBoard" role="group" aria-label="从起点连接每条边一次"></div>';
      $('extraUndo').hidden=false;$('extraNext').hidden=true;
      const board=$('lineBoard');
      board.addEventListener('click',event=>{const node=event.target.closest('[data-line-node]');if(node)lineNode(Number(node.dataset.lineNode))});
      board.addEventListener('pointerdown',event=>{
        if(session?.name!=='line'||session.phase!=='playing'||session.owner!==null||event.button>0)return;
        const node=event.target.closest('[data-line-node]');if(!node)return;
        event.preventDefault();session.owner=event.pointerId;board.setPointerCapture(event.pointerId);lineNode(Number(node.dataset.lineNode));
      });
      board.addEventListener('pointermove',event=>{
        if(session?.name!=='line'||session.owner!==event.pointerId||session.phase!=='playing')return;
        event.preventDefault();const rect=board.getBoundingClientRect();
        for(let i=0;i<session.puzzle.nodes.length;i++){
          const [x,y]=session.puzzle.nodes[i];
          if(Math.hypot(event.clientX-rect.left-x/100*rect.width,event.clientY-rect.top-y/100*rect.height)<=24){lineNode(i);break}
        }
      });
      for(const event of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(event,event=>{if(session?.owner===event.pointerId)releaseLinePointer()});
      drawLine();controls();label('从「起」开始，每条边只走一次。节点可以重复经过。');
    }
    function releaseLinePointer(){
      if(session?.owner==null)return;
      const board=$('lineBoard'),owner=session.owner;session.owner=null;
      try{if(board?.hasPointerCapture(owner))board.releasePointerCapture(owner)}catch{}
    }
    function drawLine(){
      const {puzzle,path}=session,used=new Set(path.slice(1).map((b,i)=>edgeKey(path[i],b)));
      const start=puzzle.solution[0];
      $('lineBoard').innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true">${puzzle.edges.map(([a,b])=>`<line x1="${puzzle.nodes[a][0]}" y1="${puzzle.nodes[a][1]}" x2="${puzzle.nodes[b][0]}" y2="${puzzle.nodes[b][1]}" class="${used.has(edgeKey(a,b))?'used':''}"/>`).join('')}</svg>${puzzle.nodes.map(([x,y],i)=>`<button type="button" class="line-node ${path.at(-1)===i?'current':''}" data-line-node="${i}" style="left:${x}%;top:${y}%" aria-label="节点 ${i+1}${i===start?'，起点':''}">${i===start?'起':i+1}</button>`).join('')}`;
      $('extraStats').innerHTML=stat('关卡',`${session.level+1} / ${mode()==='easy'?4:6}`)+stat('已连线',`${used.size} / ${puzzle.edges.length}`)+stat('本机最佳',`${best('line')} 关`);
    }
    function lineNode(next){
      if(session?.name!=='line'||session.phase!=='playing'||next===session.path.at(-1))return;
      if(!lineAllowed(session.puzzle,session.path,next)){label(session.path.length?'这条边不能再走，试试另一条，或撤销一步。':'请从标着「起」的节点开始。');return}
      session.path.push(next);drawLine();
      if(session.path.length-1===session.puzzle.edges.length){
        releaseLinePointer();session.score=Math.max(session.score,session.level+1);save(session.score);
        if(session.level+1===(mode()==='easy'?4:6)){finish(session.score,'全部路线都连好啦！');return}
        session.phase='complete';$('extraNext').hidden=false;controls();label('✓ 一笔完成！点「下一关」继续。');
      }else label('沿相连的边继续；走不通时可以撤销。');
    }
    function lineUndo(){
      if(session?.name!=='line'||!['playing','complete'].includes(session.phase)||!session.path.length)return;
      releaseLinePointer();session.path.pop();session.phase='playing';$('extraNext').hidden=true;drawLine();controls();label('已撤销一步，可以换条路线。');
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
      label('继续啦，慢慢来。');
    }
    function stop(){releaseLinePointer();session=null}
    return {render,start,pause,resume,stop,best,tapOdd,lineNode,lineUndo,state:()=>session};
  }
  return {definitions,create,rules:{oddBoard,linePuzzle,lineAllowed,edgeKey}};
})();
