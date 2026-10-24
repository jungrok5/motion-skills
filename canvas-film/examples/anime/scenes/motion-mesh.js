/* One indexed GPU draw per layer. Shared triangle edges are rasterized once;
   premultiplied alpha avoids the dark/double-opacity seams of Canvas clip triangles. */
const MotionMesh = (() => {
  const surface=document.createElement('canvas');
  const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
  if(!gl) return null;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 tex;void main(){tex=uv;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D image;varying vec2 tex;void main(){gl_FragColor=texture2D(image,tex);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const vb=gl.createBuffer(),ib=gl.createBuffer(),textures=new WeakMap();let batch=null;
  const attr=n=>gl.getAttribLocation(program,n),p=attr('position'),uv=attr('uv');
  function start(ctx){
    if(surface.width!==ctx.canvas.width||surface.height!==ctx.canvas.height){surface.width=ctx.canvas.width;surface.height=ctx.canvas.height;}
    gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(p,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  }
  function finish(ctx){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(surface,0,0);ctx.restore();}
  function draw(ctx,img,verts,indices){
    if(!batch)start(ctx);
    let tex=textures.get(img);if(!tex){tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);textures.set(img,tex);}else gl.bindTexture(gl.TEXTURE_2D,tex);
    const T=ctx.getTransform(),v=new Float32Array(verts.length*4),W=surface.width,H=surface.height;
    verts.forEach((a,i)=>{v[i*4]=(T.a*a[0]+T.c*a[1]+T.e)/W*2-1;v[i*4+1]=1-(T.b*a[0]+T.d*a[1]+T.f)/H*2;v[i*4+2]=a[2];v[i*4+3]=a[3];});
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.STREAM_DRAW);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STREAM_DRAW);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    if(!batch)finish(ctx);
  }
  function warp(ctx,img,x,y,w,h,field,o={}){
    const nx=o.nx||24,ny=o.ny||32,u0=o.u0??0,v0=o.v0??0,u1=o.u1??1,v1=o.v1??1,V=[],I=[];
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=u0+(u1-u0)*i/nx,v=v0+(v1-v0)*j/ny,d=field(u,v);V.push([x+u*w+d[0],y+v*h+d[1],u,v]);}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;I.push(a,b,c,b,d,c);}
    draw(ctx,img,V,I);
  }
  return {draw,warp,begin(ctx){if(batch)throw Error('Nested mesh batch');start(ctx);batch=ctx;},end(){const c=batch;batch=null;if(c)finish(c);},backend:'webgl'};
})();
