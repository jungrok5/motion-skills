/* Original camera / staging / effects. Canvas composes a GPU-deformed puppet. */
(()=>{'use strict';
const {clamp,smooth,lerp}=M,{path,ellipse}=Draw;
const fract=x=>x-Math.floor(x),rnd=n=>fract(Math.sin(n*127.1+43.7)*43758.5453);
class Film{
 constructor(canvas,bg,atlas){this.c=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.bg=bg;this.puppet=new Puppet(atlas);this.portrait=false;this.study=false;this.caption=true;
  this.grain=document.createElement('canvas');this.grain.width=256;this.grain.height=256;let g=this.grain.getContext('2d'),im=g.createImageData(256,256);for(let i=0;i<im.data.length;i+=4){im.data[i]=im.data[i+1]=im.data[i+2]=rnd(i)*255;im.data[i+3]=12}g.putImageData(im,0,0);
 }
 resize(portrait){this.portrait=portrait;this.c.width=portrait?900:1600;this.c.height=portrait?1600:900;this.render(this.time??0)}
 background(t,zoom=1,panX=0,panY=0,blur=0){let c=this.ctx,W=this.c.width,H=this.c.height,im=this.bg;const k=Math.max(W/im.width,H/im.height)*zoom,ww=im.width*k,hh=im.height*k;c.save();c.filter=blur?`blur(${blur}px)`:'none';c.drawImage(im,(W-ww)/2+panX,(H-hh)/2+panY,ww,hh);c.restore();
  c.save();c.globalCompositeOperation='screen';for(let i=0;i<22;i++){let x=(rnd(i*3)*W+t*3*(.2+rnd(i)))%W,y=H*(.50+rnd(i*7)*.045),v=(Math.sin(t*3+i*17)+1)*.2;c.fillStyle=`rgba(225,248,228,${v})`;c.fillRect(x,y,3+rnd(i)*7,.7)}c.restore();
 }
 signal(x,y,k,t,close=false){let c=this.ctx;c.save();c.translate(x,y);c.scale(k,k);
  const met=c.createLinearGradient(-13,0,13,0);met.addColorStop(0,'#202d38');met.addColorStop(.3,'#5b646b');met.addColorStop(.6,'#b4b5a7');met.addColorStop(1,'#283747');path(c,'M -12 -230 L 12 -230 L 15 580 L -15 580 Z',met,'#162c3a',2);
  for(let i=0;i<10;i++)path(c,`M -14 ${i*53} L 14 ${i*53+18} L 14 ${i*53+44} L -14 ${i*53+26} Z`,i%2?'#202a31':'#edbd52',null);
  for(const a of [-.7,.7]){c.save();c.translate(0,-235);c.rotate(a);path(c,'M -13 -98 L 13 -98 L 13 98 L -13 98 Z','#e4bd55','#2b3435',3);for(let j=-80;j<90;j+=48)path(c,`M -13 ${j} L 13 ${j} L 13 ${j+20} L -13 ${j+20} Z`,'#26343a',null);c.restore()}
  path(c,'M -95 -153 L 95 -153 L 95 -113 L -95 -113 Z','#2a3943','#112736',2);
  for(let i=-1;i<=1;i+=2){c.save();c.translate(i*64,-137);ellipse(c,0,0,45,44,'#24333d');path(c,'M -46 -2 Q -49 -55 0 -55 Q 49 -55 47 -2 Q 2 -23 -46 -2','#182c39','#0f2532',2);let on=(Math.floor(t*2.2)%2===0)===(i===-1);const grd=c.createRadialGradient(-6,-5,3,0,0,33);grd.addColorStop(0,on?'#fff0af':'#663830');grd.addColorStop(.25,on?'#ff7955':'#542b27');grd.addColorStop(1,on?'#c83125':'#362629');ellipse(c,0,2,31,31,grd);if(on){c.save();c.globalCompositeOperation='screen';const glow=c.createRadialGradient(0,2,15,0,2,75);glow.addColorStop(0,'rgba(255,86,43,.3)');glow.addColorStop(1,'rgba(255,70,30,0)');ellipse(c,0,2,75,75,glow);c.restore()}c.restore()}
  c.restore();
 }
 gate(t){const c=this.ctx,W=this.c.width,H=this.c.height;let angle=-.025-smooth((t-19.7)/4)*1.13;if(t<13.5)angle=-.025;const x=this.portrait?-80:130,y=H*.77;c.save();c.translate(x,y);c.rotate(angle);path(c,`M 0 -11 L ${W*.64} -11 L ${W*.64} 7 L 0 7 Z`,'#ead486','#554f3b',1);for(let i=0;i<W*.64;i+=65)path(c,`M ${i} -11 L ${i+29} -11 L ${i+18} 7 L ${i-11} 7 Z`,'#283747',null);c.restore();}
 distantPerson(t){const c=this.ctx,W=this.c.width,H=this.c.height;let x=W*.51,y=H*.664,s=this.portrait?1.2:.83;c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,0,14,4,'rgba(31,55,66,.22)');path(c,'M -8 -51 L -10 -30 L -8 -2 L -2 -2 L 0 -29 L 4 -2 L 10 -2 L 8 -30 L 8 -51 Z','#294458',null);path(c,'M -10 -73 L 9 -73 L 14 -45 L -12 -45 Z','#d2ddd5',null);ellipse(c,0,-82,8,10,'#bd9f84');path(c,'M -9 -83 Q -11 -95 1 -95 Q 12 -94 10 -82 L 2 -87 Z','#2b3443',null);path(c,`M -10 -69 L -17 -45 M 9 -68 L 17 -47`,null,'#a89e8b',4);c.restore()}
 train(t){const c=this.ctx,W=this.c.width,H=this.c.height;let u=t-13.5;if(u<0||u>6.5)return;let start=W+100-u*(W+3300)/5.15,car=710,yy=H*.39,hh=H*.385;
  c.save();c.translate(0,Math.sin(t*47)*1.2);c.shadowColor='rgba(17,38,49,.4)';c.shadowBlur=15;c.shadowOffsetY=15;
  for(let i=0;i<5;i++){let x=start+i*car;if(x>W+100||x+car< -100)continue;
   let g=c.createLinearGradient(0,yy,0,yy+hh);g.addColorStop(0,'#e7e2ce');g.addColorStop(.08,'#f5eed8');g.addColorStop(.15,'#acc1bc');g.addColorStop(.6,'#dde0ce');g.addColorStop(1,'#7e9d9d');path(c,`M ${x} ${yy+24} Q ${x} ${yy} ${x+36} ${yy} L ${x+car-27} ${yy} Q ${x+car-10} ${yy} ${x+car-10} ${yy+30} L ${x+car-10} ${yy+hh} L ${x} ${yy+hh} Z`,g,'#426573',2);c.shadowBlur=0;
   c.fillStyle='#316d75';c.fillRect(x,yy+hh*.7,car-10,hh*.11);c.fillStyle='#bdba83';c.fillRect(x,yy+hh*.83,car-10,5);
   for(let j=0;j<5;j++){let wx=x+26+j*134,wy=yy+hh*.16,ww=104,wh=hh*.38;let wg=c.createLinearGradient(0,wy,0,wy+wh);wg.addColorStop(0,'#244b61');wg.addColorStop(.55,'#487785');wg.addColorStop(1,'#99b8b7');path(c,`M ${wx} ${wy} h ${ww} v ${wh} h ${-ww} Z`,wg,'#678b91',5);c.save();c.beginPath();c.rect(wx,wy,ww,wh);c.clip();path(c,`M ${wx-40} ${wy+wh} L ${wx+70} ${wy} L ${wx+90} ${wy} L ${wx-15} ${wy+wh} Z`,'rgba(222,240,216,.2)',null);c.globalAlpha=.25;ellipse(c,wx+42,wy+wh*.46,9,13,'#162f41');path(c,`M ${wx+27} ${wy+wh} L ${wx+29} ${wy+wh*.62} Q ${wx+43} ${wy+wh*.48} ${wx+57} ${wy+wh*.65} L ${wx+65} ${wy+wh} Z`,'#183747',null);c.restore();}
   for(let j=1;j<4;j++){let dx=x+j*169;c.strokeStyle='#64868b';c.lineWidth=1;c.strokeRect(dx,yy+hh*.12,121,hh*.86);c.fillStyle='#d8e1ce';c.fillRect(dx+9,yy+hh*.62,5,18)}
   c.fillStyle='#294953';c.fillRect(x+15,yy+hh,car-42,12);for(let j=0;j<2;j++){ellipse(c,x+100+j*480,yy+hh+14,39,24,'#263e49');ellipse(c,x+100+j*480,yy+hh+14,14,13,'#526d74')}
   c.fillStyle='#d4d3be';c.fillRect(x+45,yy-12,car-90,13);
  }
  c.restore();
  c.save();c.globalCompositeOperation='screen';for(let i=0;i<9;i++){c.fillStyle=`rgba(214,234,221,${.03+rnd(i)*.08})`;c.fillRect(0,yy+hh*rnd(i*9),W,1+rnd(i)*4)}c.restore();
 }
 atmosphere(t,strong=0){let c=this.ctx,W=this.c.width,H=this.c.height;c.save();for(let i=0;i<33;i++){let speed=12+strong*110,x=((rnd(i)*W-t*speed*(.5+rnd(i+44)))%W+W)%W,y=H*(.12+rnd(i+77)*.82)+Math.sin(t+i)*8,sz=.6+rnd(i+31)*2;c.fillStyle=`rgba(255,246,208,${.12+rnd(i+3)*.3})`;ellipse(c,x,y,sz,sz*.7,c.fillStyle)}
  if(strong>.1){for(let i=0;i<7;i++){let x=((rnd(i+31)*W-t*450)%W+W)%W,y=H*(.33+rnd(i+20)*.55)+Math.sin(t*4+i)*20;c.save();c.translate(x,y);c.rotate(t*6+i);path(c,'M -9 0 Q -2 -6 10 0 Q 0 7 -9 0','#b8ba73',null);c.restore()}}
  c.restore();
 }
 foreground(t){let c=this.ctx,W=this.c.width,H=this.c.height;c.save();for(let i=0;i<28;i++){let x=rnd(i*5)*W,y=H+7,len=18+rnd(i+7)*55,bend=Math.sin(t*1.7+i)*6;c.strokeStyle=i%3?'#3b654d':'#899861';c.lineWidth=1.5+rnd(i)*2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+bend,y-len*.5,x+bend+8,y-len);c.stroke()}c.restore()}
 portraitScene(t,fixed=false){const c=this.ctx,W=this.c.width,H=this.c.height;if(fixed){const key=W+'x'+H;if(!this.studyBackdrop||this.studyBackdrop.key!==key){this.background(0,1.25,-W*.05,H*.055,8);const cache=document.createElement('canvas');cache.width=W;cache.height=H;cache.getContext('2d').drawImage(this.c,0,0);this.studyBackdrop={key,cache}}else c.drawImage(this.studyBackdrop.cache,0,0)}else this.background(t,1.34+(t-22.5)*.006,-W*.05,H*.055,8);if(t<20){c.save();c.filter='blur(5px)';this.train(t);c.restore()}let k=this.portrait?2.55:2.45+(fixed?0:smooth((t-24)/7)*.13),x=W*(this.portrait?.51:.60),y=this.portrait?H*.19:28;
  this.puppet.draw(c,t,x,y,k);if(!fixed)this.atmosphere(t);let light=c.createLinearGradient(0,0,W,H);light.addColorStop(0,'rgba(253,222,167,.08)');light.addColorStop(1,'rgba(12,38,58,.06)');c.fillStyle=light;c.fillRect(0,0,W,H);
 }
 render(time){this.time=clamp(time,0,38);const t=this.time,c=this.ctx,W=this.c.width,H=this.c.height;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.imageSmoothingQuality='high';let shot=STORY.shots.find(s=>t>=s.at&&t<s.end)||STORY.shots.at(-1);
  if(this.study)this.portraitScene(t,true);
  else if(shot.kind==='sky'){
   this.background(t,1.8,-W*.11,H*.38-t*H*.012);this.atmosphere(t);c.save();c.globalAlpha=smooth(t/1.5)*(1-smooth((t-3.5)/1.5));c.fillStyle='#fcf7e9';c.textAlign='center';c.font=`300 ${this.portrait?57:60}px EchoSerif`;c.fillText('여름의 잔향',W*.5,H*.43);c.font='14px EchoSans';c.letterSpacing='5px';c.fillText('A F T E R   T H E   L A S T   T R A I N',W*.5,H*.43+43);c.restore();
  }else if(shot.kind==='train'&&t>=16.3&&t<18.8){this.portraitScene(t);this.atmosphere(t,1.7);c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(70,111,131,.10)';for(let i=0;i<5;i++){let x=((t*730+i*390)%(W+600))-300;path(c,`M ${x} 0 L ${x+100} 0 L ${x+400} ${H} L ${x+250} ${H} Z`,c.fillStyle,null)}c.restore();
  }else if(['waiting','train','absence'].includes(shot.kind)){
   const local=t-shot.at;this.background(t,1.02+(shot.kind==='waiting'?local*.0015:0),0,0);if(shot.kind==='waiting'||shot.kind==='train'&&t<17.8)this.distantPerson(t);
   this.signal(this.portrait?W*.09:W*.12,H*.56,this.portrait?.78:.62,t);this.train(t);this.gate(t);
   if(shot.kind!=='absence'){const x=W*(this.portrait?.73:.76),y=H*(this.portrait?.27:.10),k=this.portrait?1.55:1.0;this.puppet.draw(c,t,x,y,k)}
   if(shot.kind==='absence'){c.fillStyle='rgba(45,91,106,.05)';c.fillRect(0,0,W,H);}
   this.foreground(t);this.atmosphere(t,shot.kind==='train'?poseAt(t).wind:0);
  }else if(shot.kind==='signal'){
   this.background(t,1.85,0,H*.24,4);this.signal(W*.51,H*.62,this.portrait?2.4:1.65,t,true);this.atmosphere(t);
  }else if(shot.kind==='portrait')this.portraitScene(t);
  else {
   let p=smooth((t-32)/6);this.background(t,1.35+p*.4,-W*.08,H*(.11+p*.29));c.save();c.globalCompositeOperation='multiply';let sunset=c.createLinearGradient(0,0,0,H);sunset.addColorStop(0,'#7584bc');sunset.addColorStop(.55,'#e8b5a5');sunset.addColorStop(1,'#e9bf90');c.fillStyle=sunset;c.globalAlpha=.72*p;c.fillRect(0,0,W,H);c.restore();c.save();c.globalCompositeOperation='screen';const sun=c.createRadialGradient(W*.73,H*.66,0,W*.73,H*.66,W*.5);sun.addColorStop(0,`rgba(255,180,124,${p*.38})`);sun.addColorStop(1,'rgba(255,130,90,0)');c.fillStyle=sun;c.fillRect(0,0,W,H);c.restore();
   for(let i=0;i<5;i++){let x=W*(.13+i*.055)+(t-32)*18,y=H*.35+i*13,flap=Math.sin(t*5+i)*5;c.save();c.translate(x,y);path(c,`M -10 ${flap} Q -3 -1 0 2 Q 4 -1 11 ${flap}`,null,'#4a566b',1.6);c.restore()}
   c.save();c.globalAlpha=smooth((t-34)/1.4)*(1-smooth((t-37.4)/.6));c.fillStyle='#fff3df';c.textAlign='center';c.font=`300 ${this.portrait?46:39}px EchoSerif`;c.fillText('여름은, 아직 여기 있었다.',W*.5,H*.57);c.font='13px EchoSans';c.fillText('夏 の 残 響',W*.5,H*.57+40);c.restore();
  }
  // Organic print grain and subtle lens falloff, no old effects reused.
  const vig=c.createRadialGradient(W*.5,H*.43,H*.15,W*.5,H*.45,Math.max(W,H)*.7);vig.addColorStop(0,'rgba(12,29,43,0)');vig.addColorStop(1,'rgba(12,29,43,.24)');c.fillStyle=vig;c.fillRect(0,0,W,H);c.save();c.globalAlpha=.26;c.fillStyle=c.createPattern(this.grain,'repeat');c.translate(Math.floor(t*12)%32,Math.floor(t*9)%32);c.fillRect(-32,-32,W+64,H+64);c.restore();
  if(this.caption&&!this.study){const cap=STORY.captions.find(a=>t>=a[0]&&t<a[1]);if(cap){let a=smooth((t-cap[0])/.3)*(1-smooth((t-cap[1]+.3)/.3));c.save();c.globalAlpha=a;c.textAlign='center';c.font=`400 ${this.portrait?29:23}px EchoSans`;c.shadowColor='rgba(0,20,30,.7)';c.shadowBlur=6;c.fillStyle='#fffaf0';c.fillText(cap[2],W/2,H*.93);c.restore()}}
  if(!this.study){let black=1-smooth(t/.8);black=Math.max(black,smooth((t-37.45)/.55));if(black>0){c.fillStyle=`rgba(10,18,27,${black})`;c.fillRect(0,0,W,H)}}
  return shot;
 }
}
window.Film=Film;
})();
