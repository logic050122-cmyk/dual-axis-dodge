import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const extras=fs.readFileSync(new URL('../../arcade-games.js',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Structural DOM and event model for the REAL two-script integration. Deliberately
// does not model rendering, touch hardware, layout, accessibility trees or audio.
export function lobbyHarness({seed={},blocked=false,writeBlocked=false,extensionsLoaded=true}={}){
  const registry=new Map(),tasks=new Map(),storage=new Map(Object.entries(seed));let clock=0,nextId=0,doc;
  const schedule=(fn,ms,period=0)=>{const id=++nextId;tasks.set(id,{fn,at:clock+ms,period});return id};
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.listeners={};this._text='';this.open=false;this.disabled=false;this.hidden=false;this.style={setProperty:(key,value)=>this.style[key]=value};this.classes=new Set();
      this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};
    }
    get id(){return this.attrs.id||''}set id(value){this.setAttribute('id',value)}
    get className(){return [...this.classes].join(' ')}set className(value){this.classes=new Set(value.split(/\s+/))}
    setAttribute(key,value){this.attrs[key]=String(value);if(key==='id')registry.set(String(value),this);if(key==='class')this.className=value;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=String(value)}
    getAttribute(key){return this.attrs[key]??null}
    clean(){const remove=el=>{if(el.id&&registry.get(el.id)===el)registry.delete(el.id);el.children.forEach(remove)};this.children.forEach(remove);this.children=[];this._text=''}
    get textContent(){return this._text+this.children.map(el=>el.textContent).join('')}
    set textContent(value){this.clean();this._text=String(value)}
    set innerHTML(value){
      this.clean();const stack=[this];
      for(const match of value.matchAll(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi)){
        const token=match[0];if(token.startsWith('<!--'))continue;
        if(token.startsWith('</')){const name=token.match(/^<\/([\w-]+)/)[1].toUpperCase();let found=stack.length-1;while(found>0&&stack[found].tagName!==name)found--;if(found>0)stack.length=found;continue}
        if(token.startsWith('<')){
          const [,tag,attrs]=token.match(/^<([\w-]+)([\s\S]*?)\/?>(?:$)/),el=new Element(tag);
          for(const a of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){if(a[1]==='/')continue;el.setAttribute(a[1],a[2]??'')}
          el.disabled='disabled' in el.attrs;el.hidden='hidden' in el.attrs;stack.at(-1).append(el);
          if(!token.endsWith('/>')&&!['BR','META','LINK','INPUT','HR','IMG'].includes(el.tagName))stack.push(el);
        }else stack.at(-1)._text+=token;
      }
    }
    get innerHTML(){return this.textContent}
    append(...els){for(const el of els){el.parent=this;this.children.push(el)}}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);this.clean();if(this.id)registry.delete(this.id)}
    matches(selector){
      const data=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      if(data)return data[1] in this.attrs&&(data[2]===undefined||this.attrs[data[1]]===data[2]);
      if(selector.startsWith('.'))return this.classes.has(selector.slice(1));
      if(selector.startsWith('#'))return this.id===selector.slice(1);
      return this.tagName===selector.toUpperCase();
    }
    querySelectorAll(selector){
      const parts=selector.split(/\s+/),matches=el=>{if(!el.matches(parts.at(-1)))return false;let ancestor=el.parent;for(let i=parts.length-2;i>=0;i--){while(ancestor&&!ancestor.matches(parts[i]))ancestor=ancestor.parent;if(!ancestor)return false;ancestor=ancestor.parent}return true};
      const all=el=>el.children.flatMap(child=>[...(matches(child)?[child]:[]),...all(child)]);return all(this);
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null}
    closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
    emit(type,properties={}){
      if(type==='click'&&this.disabled)return;
      const event={target:this,detail:1,button:0,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},...properties};
      let el=this;while(el){for(const fn of el.listeners[type]||[])fn(event);if(event.stopped||!['click','pointerdown','pointermove'].includes(type))break;el=el.parent}
      return event;
    }
    click(){this.emit('click')}
    showModal(){this.open=true}
    close(){this.open=false;schedule(()=>this.emit('close'),0)}
    focus(){doc.activeElement=this}
    get clientWidth(){return 340}get clientHeight(){return 270}
    getBoundingClientRect(){return {left:0,top:0,width:340,height:340}}
    setPointerCapture(id){this.pointer=id}releasePointerCapture(){this.pointer=null}hasPointerCapture(id){return this.pointer===id}
  }
  const root=new Element('body');root.innerHTML=html.split('<body>')[1].split('<script src=')[0];
  function eventTarget(){return {listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},emit(type,event={}){for(const fn of this.listeners[type]||[])fn({preventDefault(){},target:root,...event})}}}
  doc=Object.assign(eventTarget(),{hidden:false,activeElement:root,getElementById:id=>registry.get(id),querySelectorAll:selector=>root.querySelectorAll(selector),createElement:tag=>new Element(tag)});
  const win=eventTarget(),registered=[];let reloads=0;win.location={reload(){reloads++}};
  const api=runInNewContext((extensionsLoaded?extras:'')+'\n'+script+'\n({openGame,showLobby,setMode,extras,aimArcade,reactionTap,sequenceTap,state:()=>({currentGame,mode,sequence,reaction,aim,memory})})',{
    document:doc,window:win,navigator:{serviceWorker:{register:(...args)=>{registered.push(args);return Promise.resolve({})}}},performance:{now:()=>clock},
    localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)??null},setItem:(key,value)=>{if(blocked||writeBlocked)throw Error('blocked');storage.set(key,String(value))}},
    setTimeout:(fn,ms)=>schedule(fn,ms),setInterval:(fn,ms)=>schedule(fn,ms,ms),clearTimeout:id=>tasks.delete(id),clearInterval:id=>tasks.delete(id)
  });
  function advance(ms){
    const end=clock+ms;
    for(let guard=0;guard<20000;guard++){
      const next=[...tasks.entries()].filter(([,task])=>task.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next){clock=end;return}
      const [id,task]=next;clock=Math.max(clock,task.at);if(task.period)tasks.set(id,{...task,at:clock+task.period});else tasks.delete(id);task.fn();
    }
    throw Error('Runaway integrated timers');
  }
  return {api,doc,win,root,$:id=>registry.get(id),storage,tasks,advance,jump:ms=>clock+=ms,clock:()=>clock,registered,reloads:()=>reloads};
}
