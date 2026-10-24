/* Bespoke layered rig: indexed GPU mesh, analytic face, articulated arms,
 * and deterministic damped secondary motion. No imported rig/runtime. */
(()=>{'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},lerp=(a,b,t)=>a+(b-a)*t;
window.M={clamp,smooth,lerp};
class Mesh {
 constructor(){
  this.canvas=document.createElement('canvas');this.canvas.width=768;this.canvas.height=1200;
  const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:true});
  if(!gl)throw Error('WebGL을 사용할 수 없습니다. Chrome 또는 Safari에서 다시 열어 주세요.');
  const sh=(type,s)=>{const h=gl.createShader(type);gl.shaderSource(h,s);gl.compileShader(h);if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(h));return h};
  const p=this.program=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(p.x/384.0-1.0,1.0-p.y/600.0,0.,1.);}'));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,v);}'));gl.linkProgram(p);gl.useProgram(p);
  this.pos=gl.getAttribLocation(p,'p');this.uv=gl.getAttribLocation(p,'uv');this.buf=gl.createBuffer();this.idx=gl.createBuffer();
  const indices=[];this.n=24;for(let j=0;j<this.n;j++)for(let i=0;i<this.n;i++){let a=j*(this.n+1)+i;indices.push(a,a+1,a+this.n+1,a+1,a+this.n+2,a+this.n+1)}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);this.count=indices.length;this.vertices=new Float32Array((this.n+1)**2*4);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 }
 load(img){const g=this.gl;this.img=img;this.tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.tex);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}
 draw(ctx,src,rect,warp){const g=this.gl,n=this.n,a=this.vertices;let k=0;
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const u=i/n,v=j/n,x=rect[0]+u*rect[2],y=rect[1]+v*rect[3],q=warp(x,y,u,v);a[k++]=q[0]+384;a[k++]=q[1]+30;a[k++]=(src[0]+u*src[2])/this.img.width;a[k++]=(src[1]+v*src[3])/this.img.height;}
  g.viewport(0,0,768,1200);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.bindBuffer(g.ARRAY_BUFFER,this.buf);g.bufferData(g.ARRAY_BUFFER,a,g.DYNAMIC_DRAW);g.enableVertexAttribArray(this.pos);g.vertexAttribPointer(this.pos,2,g.FLOAT,false,16,0);g.enableVertexAttribArray(this.uv);g.vertexAttribPointer(this.uv,2,g.FLOAT,false,16,8);g.drawElements(g.TRIANGLES,this.count,g.UNSIGNED_SHORT,0);ctx.drawImage(this.canvas,-384,-30);
 }
}
function state(t){const keys=STORY.performance;let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],f=smooth((t-a[0])/(b[0]-a[0]));const v=a.slice(1).map((x,k)=>lerp(x,b[k+1],f));let blink=0;for(const [at,d]of STORY.blinks){let p=(t-at)/d;if(p>=0&&p<=1)blink=Math.max(blink,Math.sin(p*Math.PI)**.7)}
 return {yaw:v[0],pitch:v[1],roll:v[2],gaze:v[3],shift:v[4],hand:v[5],smile:v[6],blink,breath:Math.sin(t*2.1)*1.5,wind:(smooth((t-13.5)/1.4)*(1-smooth((t-19)/2)))*1.8+.15*Math.sin(t*.8)};
}
// Preintegrate at fixed dt. Seeking and export produce identical secondary poses.
const sim=[];let q=0,vel=0,prev=state(0).yaw;for(let i=0;i<=STORY.duration*120;i++){let t=i/120,s=state(t),force=s.wind*36-(s.yaw-prev)*120*4;prev=s.yaw;vel+=(force-q*23-vel*6)/120;q+=vel/120;sim.push(q)}
const spring=t=>{const p=clamp(t,0,STORY.duration)*120,i=Math.floor(p);return lerp(sim[i],sim[Math.min(i+1,sim.length-1)],p-i)};
function path(c,d,fill,stroke='#513a36',lw=1){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p)}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';c.stroke(p)}}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
window.Draw={path,ellipse};
function eye(c,x,y,side,s){
 c.save();c.translate(x,y);c.scale(side,1);const open=(1-s.blink)*(1-s.pitch*.6-s.smile*.08),tilt=s.smile*3;const d=`M -31 0 Q -10 ${-18*open+tilt} 10 ${-15*open+tilt} Q 25 ${-12*open} 31 0 Q 18 ${20*open} -6 ${17*open} Q -24 ${12*open} -31 0 Z`;
 if(open>.08){path(c,d,'#fff8e8',null);c.save();c.clip(new Path2D(d));const gx=s.gaze*7*side;
  const gr=c.createLinearGradient(0,-17,0,19);gr.addColorStop(0,'#182e35');gr.addColorStop(.5,'#32656b');gr.addColorStop(1,'#98c3ac');ellipse(c,gx,1,13.2,18,gr);ellipse(c,gx,-1,5.5,10,'#172c34');
  c.strokeStyle='#c4d4ad';c.lineWidth=.9;for(let a=.12;a<Math.PI-.1;a+=.24){c.beginPath();c.moveTo(gx+Math.cos(a)*9,2+Math.sin(a)*11);c.lineTo(gx+Math.cos(a)*11.5,2+Math.sin(a)*15);c.stroke()}
  ellipse(c,gx-5,-7,4.5,3,'#fffcf2');ellipse(c,gx+6,9,2.5,1.9,'#e2f8eb');c.fillStyle='rgba(55,31,30,.16)';c.fillRect(-35,-25,70,20);c.restore();
 }
 path(c,`M -32 0 Q -11 ${-19*open+tilt} 10 ${-16*open+tilt} Q 26 ${-11*open} 32 -1 L 37 -6 M 29 -2 L 33 -8`,null,'#3b292d',2.5);
 path(c,`M -26 ${4*open} Q 0 ${26*open} 26 ${5*open}`,null,'#a27068',.9);
 path(c,`M -31 -7 Q -6 ${-24*open} 19 ${-16*open}`,null,'#b3897e',.8);
 c.restore();
}
function face(c,s){
 const y=168+s.pitch*11,spread=55*(1-Math.abs(s.yaw)*.09);c.save();c.translate(s.yaw*36,s.pitch*14);c.scale(1-Math.abs(s.yaw)*.14,1);
 const bl=c.createRadialGradient(-73,205,0,-73,205,27);bl.addColorStop(0,'rgba(219,120,112,.18)');bl.addColorStop(1,'rgba(219,120,112,0)');ellipse(c,-73,205,28,17,bl);
 eye(c,-spread,y,-1,s);eye(c,spread,y+Math.abs(s.yaw)*1.5,1,s);
 path(c,`M -88 ${y-29} Q -62 ${y-39-s.pitch*14} -29 ${y-29-s.pitch*24}`,null,'#60433b',2.4);path(c,`M 27 ${y-30-s.pitch*24} Q 60 ${y-39-s.pitch*14} 86 ${y-30}`,null,'#60433b',2.1);
 path(c,`M ${s.yaw*12+1} 199 Q ${s.yaw*18-5} 211 ${s.yaw*18+2} 216`,null,'#ba8b7d',1);path(c,`M ${s.yaw*18+2} 216 l 4 -1`,null,'#966c61',.8);
 const smile=s.smile;path(c,`M -17 ${241-smile*3} Q 0 ${243+smile*11-s.pitch*17} 18 ${240-smile*3}`,null,'#8e5955',1.5);if(smile>.4)path(c,`M -12 242 Q 0 ${245+smile*7} 12 241 Q 0 247 -12 242`,'#ffeadf',null);
 path(c,'M -6 253 Q 0 255 7 252',null,'rgba(190,122,116,.4)',.8);
 c.restore();
}
function limb(c,a,b,width){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);c.save();c.translate(...a);c.rotate(Math.atan2(dy,dx)-Math.PI/2);path(c,`M ${-width/2} 0 Q ${-width*.48} ${len*.6} ${-width*.31} ${len} Q 0 ${len+4} ${width*.32} ${len} Q ${width*.48} ${len*.6} ${width/2} 0 Z`,'#f3d4bc','#9f7864',.8);c.restore()}
function arm(c,a,e,w){
 const normal=(p,q)=>{let x=q[0]-p[0],y=q[1]-p[1],l=Math.hypot(x,y);return[-y/l,x/l]};
 const n=normal(a,e),m=normal(e,w),b=[(n[0]+m[0])*.5,(n[1]+m[1])*.5],bl=Math.hypot(...b);b[0]/=bl;b[1]/=bl;
 const off=(p,n,r)=>[p[0]+n[0]*r,p[1]+n[1]*r],ap=off(a,n,22),am=off(a,n,-22),ep=off(e,b,15),em=off(e,b,-15),wp=off(w,m,10),wm=off(w,m,-10);
 const mix=(p,q,t)=>[lerp(p[0],q[0],t),lerp(p[1],q[1],t)],cp=mix(ap,ep,.6),cm=mix(am,em,.6),dp=mix(ep,wp,.35),dm=mix(em,wm,.35);
 let g=c.createLinearGradient(a[0]-23,a[1],a[0]+32,a[1]+90);g.addColorStop(0,'#e3b69c');g.addColorStop(.4,'#f4d2b8');g.addColorStop(1,'#fce0c7');
 path(c,`M ${ap} L ${mix(ap,ep,.85)} Q ${ep} ${mix(ep,wp,.18)} L ${wp} Q ${w[0]} ${w[1]+3} ${wm} L ${mix(wm,em,.85)} Q ${em} ${mix(em,am,.18)} L ${am} Z`,g,'#a47b67',.9);
}
function hand(c,x,y,angle,raised){c.save();c.translate(x,y);c.rotate(angle);path(c,'M -12 0 Q -14 13 -11 25 L -4 39 Q 0 43 2 38 L 0 22 L 5 39 Q 9 43 11 37 L 7 19 L 13 33 Q 17 35 17 30 L 11 12 L 20 20 Q 25 21 23 16 L 12 -2 Z','#f8d5bb','#936c5b',1);path(c,'M -7 11 L 1 22 M 1 8 L 7 19',null,'#c28d78',.7);c.restore()}
class Puppet{
 constructor(img){this.mesh=new Mesh();this.mesh.load(img);this.src={face:[140,50,380,460],fringe:[665,25,470,560],body:[100,610,460,590],back:[645,625,540,565]};}
 draw(c,t,x,y,scale,{study=false}={}){
  const s=state(t),lag=spring(t),bodyTilt=s.shift*.0008;c.save();c.translate(x+s.shift*scale,y);c.scale(scale,scale);c.rotate(bodyTilt);c.translate(0,s.breath);
  // Legs and skirt are articulated code contours, not a scaled portrait.
  const step=Math.sin(t*.8)*2;
  limb(c,[-62,870],[-65+step,1120],43);limb(c,[61,870],[70-step,1110],41);path(c,'M -89 1100 L -38 1100 L -30 1143 Q -65 1161 -106 1144 Z','#34404f','#273444',1);path(c,'M 45 1092 L 92 1092 L 108 1138 Q 71 1155 41 1134 Z','#34404f','#273444',1);
  const headTransform=(xx,yy)=>{const lean=s.yaw*26*(1-clamp((yy-20)/320));const nx=xx*Math.cos(s.yaw*.75)+lean;const ny=yy+s.pitch*(yy-150)*.07;const a=s.roll;return[nx*Math.cos(a)-(ny-285)*Math.sin(a),285+nx*Math.sin(a)+(ny-285)*Math.cos(a)]};
  const hairWarp=(xx,yy,u,v)=>{const q=headTransform(xx,yy);const f=smooth((yy-80)/250);q[0]+=lag*f*6+Math.sin(t*3.5+v*6)*s.wind*f*3;q[1]+=Math.sin(t*2.4+u*5)*f*s.wind*1.7;return q};
  this.mesh.draw(c,this.src.back,[-160,0,324,342],hairWarp);
  // Arms: shoulder -> elbow -> wrist; hand follows the forearm orientation.
  const h=smooth(s.hand),rightW=[lerp(163,153,h),lerp(643,166,h)];
  const dx=rightW[0]-158,dy=rightW[1]-370,dist=Math.hypot(dx,dy),along=(145*145-155*155+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,145*145-along*along));
  const rightEl=[158+dx/dist*along-dy/dist*height,370+dy/dist*along+dx/dist*height];
  arm(c,[-159,370],[-193+s.shift*.2,492],[-166,645]);hand(c,-166,645,.03,0);
  arm(c,[158,370],rightEl,rightW);
  this.mesh.draw(c,this.src.body,[-185,253,370,475],(xx,yy,u,v)=>{const skirt=smooth((yy-617)/111);return [xx*(1+s.breath*.0007+skirt*.05)+lag*skirt*2,yy+Math.max(0,yy-617)*1.55+s.breath*(1-v)*.5]});
  this.mesh.draw(c,this.src.face,[-116,20,232,281],headTransform);
  c.save();c.translate(0,285);c.rotate(s.roll);c.translate(0,-285);face(c,s);c.restore();
  this.mesh.draw(c,this.src.fringe,[-143,-7,287,342],(xx,yy,u,v)=>{const q=headTransform(xx,yy);const f=smooth((yy-95)/230);q[0]+=lag*f*3.8+Math.sin(t*4+v*4)*f*s.wind;q[1]+=Math.sin(t*3+u*7)*f*s.wind;return q});
  const a=Math.atan2(rightW[1]-rightEl[1],rightW[0]-rightEl[0])-Math.PI/2;hand(c,...rightW,a,h);
  c.restore();
 }
}
window.Puppet=Puppet;window.poseAt=state;
})();
