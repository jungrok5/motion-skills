/* A tiny original score and diegetic sounds, synthesized locally. */
(()=>{'use strict';class Soundtrack{
 constructor(){this.ctx=null;this.enabled=false;this.last=-1;this.nodes=[]}
 async init(){if(this.ctx){await this.ctx.resume();return}const a=this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=a.createGain();this.master.gain.value=.45;this.master.connect(a.destination);
  const b=a.createBuffer(1,a.sampleRate*3,a.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){last=(last+(Math.random()*2-1)*.02)/1.02;d[i]=last*8}let src=a.createBufferSource();src.buffer=b;src.loop=true;let f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=480;this.wind=a.createGain();this.wind.gain.value=0;src.connect(f).connect(this.wind).connect(this.master);src.start();
  this.delay=a.createDelay();this.delay.delayTime.value=.33;let fb=a.createGain();fb.gain.value=.22;this.delay.connect(fb).connect(this.delay);this.delay.connect(this.master);
 }
 tone(freq,dur,gain,type='sine'){if(!this.enabled)return;const a=this.ctx,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,a.currentTime);g.gain.linearRampToValueAtTime(gain,a.currentTime+.008);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);o.connect(g);g.connect(this.master);g.connect(this.delay);o.start();o.stop(a.currentTime+dur);this.nodes.push(o);o.onended=()=>{this.nodes=this.nodes.filter(n=>n!==o);o.disconnect();g.disconnect()}}
 tick(t,playing){if(!this.ctx)return;let active=this.enabled&&playing;this.wind.gain.setTargetAtTime(active?.08+poseAt(t).wind*.3:0,this.ctx.currentTime,.12);if(!active){this.last=t;return}
  const crossed=at=>this.last<at&&t>=at&&t-this.last<.15;
  const notes=[[.8,440],[2.1,659.25],[3.5,587.33],[5.2,493.88],[6.7,440],[8.2,329.63],[9.5,392],[20.5,329.63],[23,440],[25.5,493.88],[28.2,523.25],[29.5,659.25],[31,587.33],[33,440],[34.5,329.63],[36,220]];
  for(const [at,f]of notes)if(crossed(at)){this.tone(f,2.4,.14);this.tone(f*2,1,.025);this.tone(f/2,3.2,.07)}
  for(let a=5.2;a<19.8;a+=.47)if(crossed(a)){this.tone(880,.3,.04);this.tone(1320,.18,.015)}
  for(let a=14;a<19.6;a+=.23)if(crossed(a))this.tone(64+(a%1)*16,.15,.13,'triangle');
  this.last=t;
 }
 stop(){if(this.ctx){this.wind.gain.setTargetAtTime(0,this.ctx.currentTime,.02);for(const n of [...this.nodes])try{n.stop()}catch{}}}
}window.Soundtrack=Soundtrack})();
