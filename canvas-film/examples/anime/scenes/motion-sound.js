/* Small original procedural score and ambience. No network or media download.
   The buffer is a pure function of sample index; a new source starts at each seek. */
function MotionSound(duration){
 let ac,buffer,source;const sr=22050,TAU=Math.PI*2;
 const clamp=x=>Math.max(0,Math.min(1,x)),ss=x=>{x=clamp(x);return x*x*(3-2*x);};
 function build(){
  buffer=ac.createBuffer(2,Math.ceil(duration*sr),sr);const L=buffer.getChannelData(0),R=buffer.getChannelData(1);
  let seed=9231,low=0;const notes=[[.6,261.63],[2.2,392],[4.2,440],[7.2,329.63],[9.2,392],[11,523.25],[20.7,440],[22,392],[24,329.63],[26.5,261.63],[28.4,392],[30,523.25]];
  for(let i=0;i<L.length;i++){
   const t=i/sr;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;low+=.025*(n-low);
   const train=ss((t-14.7)/1.0)*(1-ss((t-19)/1.5));
   const ambient=(n*.012+low*.12)*(1+.25*Math.sin(t*.6));
   const cicada=Math.sin(TAU*3150*t)*(.5+.5*Math.sin(TAU*37*t))*.008*(1-train*.7)*(1-ss((t-25)/5));
   const bellTime=(t-7)% .9;const bell=t>=7&&t<20.3?(Math.sin(TAU*880*bellTime)+.4*Math.sin(TAU*1760*bellTime))*Math.exp(-bellTime*8)*.032:0;
   let music=0;for(const [at,f] of notes){const u=t-at;if(u>=0&&u<5)music+=(Math.sin(TAU*f*u)+.32*Math.sin(TAU*f*2.002*u)+.1*Math.sin(TAU*f*3*u))*Math.min(1,u*45)*Math.exp(-u*1.15)*.032;}
   const wheels=(low*.65+n*.04+Math.sin(TAU*65*t)*.045*(.4+.6*Math.sin(TAU*5.3*t)**12))*train;
   const fade=ss(t)*(1-ss((t-30.9)/1.5));const v=(ambient+cicada+bell+music+wheels)*fade;
   L[i]=Math.tanh(v*(1-train*.1));R[i]=Math.tanh(v*(1+train*.1));
  }
 }
 function stop(){if(source){try{source.stop()}catch(e){}source.disconnect();source=null;}}
 return {async unlock(){ac ||=new (window.AudioContext||window.webkitAudioContext)();await ac.resume();if(!buffer)build();},stop,play(t){if(!ac||!buffer)return;stop();source=ac.createBufferSource();source.buffer=buffer;source.connect(ac.destination);source.start(0,Math.min(t,duration-.001));}};
}
