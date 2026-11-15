#!/usr/bin/env node
'use strict';
// Local invariant checks with a mocked browser. This does not test pixels or WebGL drivers.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const nodePath=require('node:path');

function verify(path){
 const html=fs.readFileSync(path,'utf8'),source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert(source,'Expected the inline blueprint runtime');
 const evidence=JSON.parse(html.match(/<script id="evidence" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert(evidence.sources.length&&evidence.claims.length,'Evidence ledger missing');
 let clock=0,serial=0,groundDraws=0,queued=new Map();
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,isContextLost:()=>false},{get:(t,k)=>k in t?t[k]:(()=>{})});
 const ctx=()=>new Proxy({measureText:text=>({width:String(text).length*8})},{get:(t,k)=>k in t?t[k]:(()=>{})});
 const elements={};
 function element(id){return elements[id]??={dataset:{},attrs:{},events:{},textContent:'',hidden:true,
  getContext:type=>type==='2d'?new Proxy(ctx(),{get(t,k){if(k==='clearRect'&&id==='ground')return ()=>groundDraws++;return t[k];}}):gl,
  setAttribute(k,v){this.attrs[k]=v;},getBoundingClientRect:()=>({width:1920,height:900,left:0,top:0}),
  setPointerCapture(){},addEventListener(k,f){this.events[k]=f;}};}
 const doc={events:{},getElementById:element,querySelector:element,addEventListener(k,f){this.events[k]=f;}};
 const env={document:doc,window:{devicePixelRatio:1,addEventListener(){}},ResizeObserver:class{observe(){}},
  requestAnimationFrame:cb=>{queued.set(++serial,cb);return serial;},cancelAnimationFrame:id=>queued.delete(id),performance:{now:()=>clock},console,location:{reload(){}}};
 vm.createContext(env);
 const exportCode=`globalThis.qa={nodes,transforms,point,iso,envelope,pose,render,root,scene,parts,toggle,setOrbit,resetView,DURATION,
  getBasis:()=>[cameraRight,cameraUp,cameraDepth],getState:()=>({phase,busy,opened,zoom,origin,yaw,pitch}),getMesh:()=>Array.from(triData)};})();`;
 vm.runInContext(source.replace(/\}\)\(\);\s*$/,exportCode),env,{timeout:30000});
 const q=env.qa,close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`),camera=()=>JSON.stringify([q.getState().zoom,q.getState().origin]);
 assert(q.nodes.length&&q.getMesh().length,'Empty model');
 // Every callout must be drawable with the embedded label face (locale packs with a labelFont).
 const meta=JSON.parse(html.match(/const META=(\{.*?\});\n/)[1]);
 if(meta.labelCoverage){
  const cover=new Set(JSON.parse(fs.readFileSync(nodePath.join(__dirname,'..','assets','fonts',meta.labelCoverage),'utf8')));
  const texts=q.parts.map(p=>p.label??p.zh).concat(q.scene.dimension?[q.scene.dimension.label??q.scene.dimension.zh]:[]);
  const missing=[...new Set(texts.join(''))].filter(c=>c.trim()&&!cover.has(c.codePointAt(0)));
  assert(!missing.length,'Callout glyphs missing from the embedded label face: '+missing.join(''));
 }
 assert(q.parts.every(p=>typeof (p.label??p.zh)==='string'&&typeof p.text==='string'),'Every part needs a local label (label or zh) and an English text');
 assert(q.getMesh().every(Number.isFinite),'Non-finite geometry');
 const initial=q.getMesh(),originalCamera=camera(),groundBefore=groundDraws;
 let violation=0;
 for(let i=0;i<=240;i++){
  q.transforms(i/240);
  for(const n of q.nodes){assert(n.world.every(Number.isFinite));for(const v of n.bounds||[]){const [x,y]=q.iso(q.point(n.world,v)),e=q.envelope;violation=Math.max(violation,e.minX-x,x-e.maxX,e.minY-y,y-e.maxY);}}
 }
 assert(violation<1e-6,'Timeline leaves the fitted envelope');q.render(0);
 function tick(t){clock=t;const callbacks=[...queued.values()];queued.clear();callbacks.forEach(f=>f(t));assert.equal(camera(),originalCamera,'Animation refitted or moved camera');}
 q.toggle();q.toggle();assert.equal(queued.size,1,'Repeat trigger restarted animation');
 for(let t=0;t<q.DURATION;t+=q.DURATION/30)tick(t);tick(q.DURATION);
 assert.equal(q.getState().phase,1);assert.equal(q.getState().busy,false);assert.equal(queued.size,0);
 clock=q.DURATION+100;q.toggle();const start=clock;
 for(let t=start;t<start+q.DURATION;t+=q.DURATION/30)tick(t);tick(start+q.DURATION);
 assert.equal(q.getState().phase,0);assert.equal(q.getState().busy,false);assert.equal(queued.size,0);
 assert.deepEqual(q.getMesh(),initial,'Assembly did not return to identical geometry');
 assert.equal(groundDraws,groundBefore,'Animation redrew the ground');
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 for(const degrees of [-80,0,35,85])for(let a=0;a<8;a++){
  q.setOrbit(a*Math.PI/4,degrees*Math.PI/180);
  const basis=q.getBasis();for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(dot(basis[i],basis[j]),i===j?1:0);
  for(const t of [0,.5,1]){q.render(t);for(const n of q.nodes){assert(n.dynamicLines.every(Number.isFinite),'Invalid contour at orbit angle');for(const v of n.bounds||[]){const [x,y]=q.iso(q.point(n.world,v)),e=q.envelope;violation=Math.max(violation,e.minX-x,x-e.maxX,e.minY-y,y-e.maxY);}}}
  assert.equal(camera(),originalCamera,'Orbit refitted or moved camera');
 }
 assert(violation<1e-6,'Orbit leaves the fitted envelope');q.render(0);q.resetView();
 const model=elements.model,reset=elements['reset-view'];
 const pointer=(type,id,x,y,kind='mouse')=>model.events[type]({type,pointerId:id,clientX:x,clientY:y,pointerType:kind,button:0});
 elements['pan-mode'].events.click();const initialOrigin=Array.from(q.getState().origin),initialZoom=q.getState().zoom;
 pointer('pointerdown',1,300,400);pointer('pointermove',1,380,350);pointer('pointerup',1,380,350);model.events.click({clientX:380,clientY:350});
 assert.equal(q.getState().busy,false,'Dragging triggered animation');close(q.getState().origin[0],initialOrigin[0]+80);close(q.getState().origin[1],initialOrigin[1]-50);
 const before=q.getState(),anchor=[380,350],world=anchor.map((v,i)=>(v-before.origin[i])/before.zoom);
 model.events.wheel({clientX:380,clientY:350,deltaY:-240,deltaMode:0,preventDefault(){}});
 assert(q.getState().zoom>initialZoom);anchor.forEach((v,i)=>close((v-q.getState().origin[i])/q.getState().zoom,world[i]));
 reset.events.click();assert.equal(camera(),originalCamera);
 elements['rotate-mode'].events.click();const beforeOrbit=q.getState();
 pointer('pointerdown',2,300,400);pointer('pointermove',2,420,470);pointer('pointerup',2,420,470);model.events.click({clientX:420,clientY:470});
 assert.equal(q.getState().busy,false);assert.notEqual(q.getState().yaw,beforeOrbit.yaw);assert.notEqual(q.getState().pitch,beforeOrbit.pitch);assert.equal(camera(),originalCamera);assert.deepEqual(q.getMesh(),initial);
 reset.events.click();
 pointer('pointerdown',3,300,300,'touch');pointer('pointerdown',4,400,300,'touch');pointer('pointermove',3,275,300,'touch');pointer('pointermove',4,425,300,'touch');
 close(q.getState().zoom/initialZoom,1.5);const pinch=q.getState();
 pointer('pointerup',3,275,300,'touch');pointer('pointermove',4,445,320,'touch');
 close(q.getState().origin[0],pinch.origin[0]+20);close(q.getState().origin[1],pinch.origin[1]+20);close(q.getState().yaw,pinch.yaw);
 pointer('pointerup',4,445,320,'touch');reset.events.click();assert.equal(camera(),originalCamera);assert.equal(groundDraws,groundBefore);
 const result={pass:true,environment:'Node VM with mocked WebGL; browser visual checks still required',nodes:q.nodes.length,parts:q.parts.length,triangles:initial.length/18,durationMs:q.DURATION,timelineAndOrbitEnvelopeViolation:violation,exactAssemblyRestoration:true,stableAutomaticCameraAndGround:true,repeatTriggersIgnored:true,orbitPanZoomReset:true,simulatedPinchContinuation:true,fontDataEmbedded:html.includes('data:font/woff2;base64,')};
 return {result,qa:q};
}

module.exports=verify;
if(require.main===module){
 if(!process.argv[2]){console.error('Usage: node verify.cjs output.html');process.exitCode=2;}
 else{try{console.log(JSON.stringify(verify(process.argv[2]).result,null,2));}catch(error){console.error(error.stack);process.exitCode=1;}}
}
