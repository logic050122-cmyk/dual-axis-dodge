import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=fs.readFileSync(new URL('../../arcade-games.js',import.meta.url),'utf8');
export function extraHarness({blocked=false,seed={}}={}){
  const registry=new Map(),tasks=new Map(),cancelled=new Set(),storage=new Map(Object.entries(seed));
  let clock=0,id=0,generation=0,choice='easy',api,records=0;
  class Element{
    constructor(tag='div',attrs=''){
      this.tagName=tag;this.children=[];this.listeners={};this.dataset={};this.attributes={};this.style={setProperty:(key,value)=>this.style[key]=value};
      this.disabled=false;this.hidden=false;this.textContent='';this.classes=new Set();
      this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};
      for(const match of attrs.matchAll(/([\w-]+)="([^"]*)"/g))this.setAttribute(match[1],match[2]);
      this.disabled=/\bdisabled\b/.test(attrs);this.hidden=/\bhidden\b/.test(attrs);
    }
    setAttribute(key,value){
      this.attributes[key]=String(value);
      if(key==='id'){this.id=value;registry.set(value,this)}
      if(key==='class'){for(const x of value.split(' '))this.classes.add(x)}
      if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=value;
    }
    getAttribute(key){return this.attributes[key]}
    set innerHTML(value){
      const remove=el=>{if(el.id)registry.delete(el.id);el.children.forEach(remove)};this.children.forEach(remove);this.children=[];this.content=value;
      for(const match of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
        const el=new Element(match[1],match[2]);el.parent=this;this.children.push(el);
      }
    }
    get innerHTML(){return this.content||''}
    matches(selector){
      const data=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      if(data)return data[1] in this.attributes&&(data[2]===undefined||this.attributes[data[1]]===data[2]);
      return selector.startsWith('.')?this.classes.has(selector.slice(1)):this.tagName===selector;
    }
    querySelectorAll(selector){return this.children.flatMap(el=>[...(el.matches(selector)?[el]:[]),...el.querySelectorAll(selector)])}
    closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
    emit(type,event={}){if(type==='click'&&this.disabled)return;for(const fn of this.listeners[type]||[])fn({target:this,preventDefault(){},stopPropagation(){},...event})}
    click(){this.emit('click')}
    getBoundingClientRect(){return {left:0,top:0,width:340,height:340}}
    setPointerCapture(pointerId){this.pointerId=pointerId}
    releasePointerCapture(){this.pointerId=null}
    hasPointerCapture(pointerId){return this.pointerId===pointerId}
    focus(){}
  }
  const scene=new Element('div','id="scene"');new Element('div','id="gameMessage"');
  const $=key=>registry.get(key);
  const schedule=(fn,delay,period=0)=>{const n=++id;tasks.set(n,{fn,at:clock+delay,period});return n};
  const clear=()=>{for(const n of tasks.keys())cancelled.add(n);tasks.clear()};
  const module=runInNewContext(source+'\nPlaydotExtras',{console});
  api=module.create({$,scene,mode:()=>choice,stat:(a,b)=>`<small>${a}</small><strong>${b}</strong>`,label:text=>{if($('gameMessage'))$('gameMessage').textContent=text},
    get:key=>{if(blocked) return null;return storage.get(key)??null},set:(key,value)=>{if(!blocked)storage.set(key,String(value))},
    timeout:(fn,ms)=>schedule(fn,ms),interval:(fn,ms)=>schedule(fn,ms,ms),clear,invalidate:()=>++generation,
    generation:()=>generation,reset:()=>{generation++;clear();api.stop()},now:()=>clock,records:()=>records++});
  function advance(ms){
    const end=clock+ms;
    for(let guard=0;guard<10000;guard++){
      const next=[...tasks.entries()].filter(([,task])=>task.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next){clock=end;return}
      const [n,task]=next;clock=task.at;
      if(task.period)tasks.set(n,{...task,at:clock+task.period});else tasks.delete(n);
      task.fn();
    }
    throw Error('Runaway timers');
  }
  return {api,module,$,tasks,storage,advance,scene,mode:value=>choice=value,clock:()=>clock,jump:ms=>clock+=ms,records:()=>records};
}
