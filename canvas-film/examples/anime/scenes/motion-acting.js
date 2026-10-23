/* Deterministic acting and secondary motion: fixed-step spring tables are built
   once, so random seek, playback and offline rendering produce identical poses. */
const Acting=(()=>{
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 function track(keys,t){let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],v=smooth((t-a.t)/(b.t-a.t)),o={};for(const k in a)if(k!=='t')o[k]=a[k]+(b[k]-a[k])*v;return o;}
 const tables={};
 function spring(name,force,k=48,damp=8){
  const dt=1/120,A=new Float32Array(Math.ceil(FILM_SPEC.duration/dt)+2);let x=0,v=0;
  for(let i=1;i<A.length;i++){v+=(force(i*dt)-k*x-damp*v)*dt;x+=v*dt;A[i]=x;}tables[name]=A;
 }
 const pulse=(t,a,b)=>smooth((t-a)/.7)*(1-smooth((t-b)/1.2));
 const wind=t=>.25*Math.sin(t*1.65)+.10*Math.sin(t*3.6)-1.6*pulse(t,14.7,18.9);
 function pose(u){return track(FILM_SPEC.acting,clamp(u,0,5.4));}
 const yaw=t=>t<20.6?0:pose(t-20.6).yaw;
 for(const [name,k,d,scale,lag] of [['backhair',32,6,.9,.12],['bangs',75,10,.22,0],['lockL',43,7,.65,.06]]){
  spring(name,t=>wind(t-lag)*scale*6 - (yaw(t+.016)-yaw(t-.016))/.032*scale*2.8,k,d);
 }
 spring('back',t=>wind(t)*4,42,8);
 const sample=(name,t)=>{const A=tables[name],p=clamp(t,0,FILM_SPEC.duration)*120,i=Math.floor(p);return A[i]+(A[i+1]-A[i])*(p-i);};
 function params(t){const u=t-20.6,p=pose(u);let blink=0;for(const b of FILM_SPEC.blinks){const v=(u-b.t)/b.dur;if(v>=0&&v<1)blink=Math.sin(Math.PI*v)**.7;}
  const hair={};for(const name of ['backhair','bangs','lockL'])hair[name]=sample(name,t);
  return {angX:p.yaw,angY:p.pitch,angZ:p.roll,body:[p.bodyX,p.bodyY],breath:.5+.5*Math.sin(t*2.1),gaze:[p.gazeX,p.gazeY],blink,expr:blink>.78?(u>=FILM_SPEC.smileAt?'sadblink':'blink'):u>=FILM_SPEC.smileAt?'sad':'',hair,time:t};
 }
 return {params,sample,wind,track};
})();
