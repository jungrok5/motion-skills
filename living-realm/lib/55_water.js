// living-realm · 55_water — still and running water drawn after the lit world: it bends what is under it, takes the
// colour of its depth, mirrors the sky, glints in the sun, rings in the rain and freezes over in winter.
// LR.water.pond(level, [x0, z0, x1, z1]) · LR.water.stream([[x, z, y], …], width) · LR.water.disc(x, y, z, r)
{
  const T = THREE;
  const WA = (LR.water = { parts: [], tris: 0, color: [0.010, 0.030, 0.026], clarity: 1.5 });
  const put = (P, F, I, pts, flow) => { const b = P.length / 3; for (const p of pts) { P.push(p[0], p[1], p[2]); F.push(flow ? p[3] : 0, flow ? p[4] : 0, flow ? 1 : 0); } return b; };
  WA.pond = (level, rect) => { const [x0, z0, x1, z1] = rect; WA.parts.push({ kind: 'pond', level, rect }); return level; };
  // a ribbon following the stream: water level given per point; u across (−1..1), v metres along
  WA.stream = (pts, width, o = {}) => { WA.parts.push({ kind: 'stream', pts, width, speed: o.speed || 1.1 }); LR.world.sounds.push(...pts.filter((p, i) => i % (o.soundEvery || 4) === 1).map((p) => ({ x: p[0], y: p[2], z: p[1], kind: 'stream', r: 24, gain: 0.8 }))); };
  WA.disc = (x, y, z, r) => { WA.parts.push({ kind: 'disc', x, y, z, r }); };
  // water level at a point (for the walker and for sounds): the highest water surface above the bed there, or −∞
  WA.levelAt = (x, z) => { let best = -1e9; for (const p of WA.parts) { if (p.kind === 'pond') { const [x0, z0, x1, z1] = p.rect; if (x >= x0 && x <= x1 && z >= z0 && z <= z1) best = Math.max(best, p.level); } else if (p.kind === 'stream') { for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], b = p.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = LR.sat(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < p.width * 0.75) best = Math.max(best, a[2] + (b[2] - a[2]) * t); } } } return best; };

  const VS = `//#include head
in vec3 position; in vec3 flow; uniform mat4 projectionMatrix, viewMatrix; out vec3 vWorld; out vec3 vFlow;
void main(){ vWorld = position; vFlow = flow; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`;
  const FS = `//#include head
//#include hash
//#include pack
//#include frame
//#include shadow
//#include shadowfast
//#include air
//#include sky
in vec3 vWorld; in vec3 vFlow; out vec4 o;
uniform sampler2D tDepth, tCopy; uniform mediump sampler2DArray uMatB; uniform float uEnvMips; uniform vec3 uWaterCol; uniform float uClarity;
uniform sampler2D uTopo; uniform vec4 uTopoRect;
vec2 wn(vec2 uv){ return texture(uMatB, vec3(uv, float(WAVES_LAYER))).xy * 2.0 - 1.0; }
vec2 rippleLayer(vec2 p, float t){ vec2 ip = floor(p), fp = fract(p), acc = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 oo = vec2(float(i), float(j)); vec3 r = hash32(ip + oo); vec2 c = oo + r.xy - fp; float d = length(c), tt = fract(t * (0.7 + r.z * 0.6) + r.z * 7.0);
    float ring = sin(46.0 * (d - tt * 0.8)) * smoothstep(0.0, 0.08, tt) * (1.0 - tt) * (1.0 - tt) * smoothstep(0.11, 0.0, abs(d - tt * 0.8)); acc += c / max(d, 1e-4) * ring; }
  return acc; }
void main(){
  vec2 suv = gl_FragCoord.xy * uRes.zw; float dS = textureLod(tDepth, suv, 0.0).r; if (gl_FragCoord.z > dS) discard;
  float zS = viewZ(dS), zW = viewZ(gl_FragCoord.z), thick = max(zS - zW, 0.0);
  vec3 Vv = uCamPos - vWorld; float dist = length(Vv); vec3 V = Vv / dist;
  // waves: two layers crossing; a stream's layers run with its current
  vec2 n2;
  if (vFlow.z > 0.5) { float sp = uTime * 0.12; vec2 uv = vec2(vFlow.x * 1.3, vFlow.y * 0.22); n2 = wn(uv + vec2(0.03 * sin(uTime * 0.7), -sp * 1.7)) * 0.9 + wn(uv * 2.3 + vec2(0.4, -sp * 3.1)) * 0.7; n2 = n2.x * vec2(1.0, 0.0) + n2.y * vec2(0.0, 1.0); }
  else { float w = 0.4 + uWind.z; n2 = (wn(vWorld.xz * 0.17 + uWind.xy * uTime * 0.035 * w) + wn(vWorld.xz * 0.43 - uWind.yx * uTime * 0.05 * w + 0.3) * 0.7) * (0.25 + 0.6 * uWind.z); }
  float open = 1.0; { vec2 tuv = (vWorld.xz - uTopoRect.xy) * uTopoRect.zw; float th = textureLod(uTopo, tuv, 0.0).r; open = smoothstep(1.1, 0.25, th - vWorld.y); }
  if (uWx2.x > 0.02) n2 += (rippleLayer(vWorld.xz * 2.6, uTime * 1.1) + rippleLayer(vWorld.xz * 4.7 + 5.0, uTime * 1.4)) * 0.5 * uWx2.x * open;
  float ice = smoothstep(0.62, 0.92, uWx.w) * (vFlow.z > 0.5 ? 0.55 : 1.0);
  n2 *= 1.0 - ice * 0.93;
  vec3 N = normalize(vec3(n2.x * 0.35, 1.0, n2.y * 0.35));
  float NoV = max(dot(N, V), 0.02);
  // what is under it, bent
  vec2 off = N.xz * 0.045 * sat(thick * 1.5) / max(zW * 0.12, 0.5);
  float dR = textureLod(tDepth, suv + off, 0.0).r; if (viewZ(dR) < zW) off = vec2(0.0); else thick = max(viewZ(dR) - zW, 0.0);
  vec3 under = textureLod(tCopy, suv + off, 0.0).rgb;
  float sh = shadowFast(vWorld + vec3(0.0, 0.05, 0.0)) * cloudShadow(vWorld);
  vec3 skyUp = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0);
  vec3 body = uWaterCol * (uSunCol * (0.25 + 0.75 * sh) * max(uSunDir.y, 0.1) + skyUp * 1.6);
  float path = thick / max(NoV, 0.25);
  vec3 ext = exp(-path * vec3(0.95, 0.40, 0.46) / max(uClarity * (vFlow.z > 0.5 ? 1.0 : 0.36), 0.05));      // still water is murkier than a running brook
  vec3 col = under * ext + body * (1.0 - ext);
  // the sky in it, and the sun
  vec3 Rr = reflect(-V, N); Rr.y = abs(Rr.y);
  vec3 refl = envAt(Rr, 0.6);
#if SSR_STEPS > 0
  { // what stands over the water, mirrored: the reflected ray marched through the depth buffer (trees, houses, the bridge);
    // steps grow with distance, a per-pixel offset turns the banding into grain the temporal resolve removes
    vec3 rd = normalize(vec3(Rr.x, max(Rr.y, 0.03), Rr.z)); float jit = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0);
    float t = (0.22 + 0.02 * dist) * (1.0 + 0.35 * jit), tp = 0.0, hit = 0.0; vec3 q = vec3(0.0);
    for (int i = 0; i < SSR_STEPS; i++) {
      vec4 c = uViewProj * vec4(vWorld + rd * t, 1.0); if (c.w <= 0.0) break;
      q = c.xyz / c.w * 0.5 + 0.5; if (q.x <= 0.0 || q.x >= 1.0 || q.y <= 0.0 || q.y >= 1.0 || q.z >= 1.0) break;
      float zs = viewZ(textureLod(tDepth, q.xy, 0.0).r), zr = viewZ(q.z);
      if (zr > zs && zr - zs < 0.8 + 0.55 * t) { hit = 1.0; break; }
      tp = t; t *= SSR_GROW;
    }
    if (hit > 0.0) {
      float a = tp, b = t;
      for (int j = 0; j < 5; j++) { float m = 0.5 * (a + b); vec4 c = uViewProj * vec4(vWorld + rd * m, 1.0); vec3 q2 = c.xyz / c.w * 0.5 + 0.5; if (viewZ(q2.z) > viewZ(textureLod(tDepth, q2.xy, 0.0).r)) { b = m; q = q2; } else a = m; }
      vec2 e = min(q.xy, 1.0 - q.xy); float k = smoothstep(0.0, 0.07, min(e.x, e.y)) * (1.0 - ice * 0.75);
      refl = mix(refl, min(textureLod(tCopy, q.xy, 0.0).rgb, vec3(24.0)), k);
    }
  }
#endif
  float fr = 0.02 + 0.98 * pow(1.0 - NoV, 5.0);
  vec3 H = normalize(uSunDir + V); float nh = sat(dot(N, H)), a2 = 0.0016 + 0.02 * uWx2.x, dd = nh * nh * (a2 - 1.0) + 1.0;
  vec3 glint = uSunCol * min(a2 / (dd * dd), 900.0) * 0.02 * sh * fr * 8.0;
  col = mix(col, refl, fr) + glint;
  // foam where it is shallow and where it runs
  float fn = texture(uNoise, vWorld.xz * 0.9 + uTime * 0.03).r, shore = smoothstep(vFlow.z > 0.5 ? 0.14 : 0.05, 0.0, thick - fn * 0.05) ;
  float foam = shore * (0.35 + 0.65 * fn) * (vFlow.z > 0.5 ? 0.9 : 0.22);
  if (vFlow.z > 0.5) foam += smoothstep(0.62, 0.9, texture(uNoise, vec2(vFlow.x * 0.6, vFlow.y * 0.08 - uTime * 0.11)).g) * 0.25 * (1.0 - abs(vFlow.x));
  col = mix(col, (uSunCol * (0.3 + 0.7 * sh) * 0.3 + skyUp * 0.9), sat(foam) * 0.8 * (1.0 - ice));
  // ice: a pale sheet with cracks, snow lying on it
  if (ice > 0.0) {
    float crack = smoothstep(0.03, 0.0, abs(texture(uNoise, vWorld.xz * 0.11).r - 0.5)) + smoothstep(0.02, 0.0, abs(texture(uNoise, vWorld.xz * 0.37 + 0.2).g - 0.5)) * 0.6;
    vec3 ia = mix(vec3(0.42, 0.55, 0.60), vec3(0.78, 0.86, 0.90), texture(uNoise, vWorld.xz * 0.06).b) ; ia = mix(ia, vec3(0.9, 0.95, 1.0), sat(crack) * 0.6);
    float snowOn = smoothstep(0.3, 0.8, uWx.z * open + texture(uNoise, vWorld.xz * 0.23).a * 0.4 - 0.2);
    ia = mix(ia, vec3(0.90, 0.93, 0.97), snowOn);
    vec3 lit = ia * (uSunCol * sat(uSunDir.y) * sh + skyUp * 1.5);
    vec3 icecol = mix(col * 0.55 + lit * 0.45, lit, 0.35 + 0.65 * snowOn) + refl * fr * (1.0 - snowOn) * 0.6 + glint * 0.3 * (1.0 - snowOn);
    col = mix(col, icecol, ice);
  }
  // air between the eye and the water
  float od = fogDepth(uCamPos, -V, dist), Tf = exp(-od); col = col * Tf + envAt(normalize(vec3(-V.x, 0.1, -V.z)), 2.5) * (1.0 - Tf);
  col += uWx2.w * vec3(0.5, 0.6, 0.9) * 1.5 * fr;
  o = vec4(max(col, vec3(0.0)), 1.0);
}`;
  WA.build = () => {
    if (!WA.parts.length || LR.off.has('water')) return;
    const P = [], F = [], I = [], L = LR.land;
    for (const p of WA.parts) {
      if (p.kind === 'pond') { const [x0, z0, x1, z1] = p.rect, n = 10; const b = P.length / 3; for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { P.push(x0 + (x1 - x0) * i / n, p.level, z0 + (z1 - z0) * j / n); F.push(0, 0, 0); } for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = b + j * (n + 1) + i; I.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2); } }
      else if (p.kind === 'disc') { const n = 20, b = P.length / 3; P.push(p.x, p.y, p.z); F.push(0, 0, 0); for (let i = 0; i <= n; i++) { const a = (i / n) * LR.TAU; P.push(p.x + Math.cos(a) * p.r, p.y, p.z + Math.sin(a) * p.r); F.push(0, 0, 0); } for (let i = 0; i < n; i++) I.push(b, b + i + 2, b + i + 1); }
      else { // resample the stream finely so the ribbon follows its bends
        const fine = []; for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], c = p.pts[i + 1], A0 = p.pts[Math.max(i - 1, 0)], D = p.pts[Math.min(i + 2, p.pts.length - 1)], n = Math.max(2, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 2)); for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; const cr = (q) => 0.5 * (2 * a[q] + (-A0[q] + c[q]) * t + (2 * A0[q] - 5 * a[q] + 4 * c[q] - D[q]) * t2 + (-A0[q] + 3 * a[q] - 3 * c[q] + D[q]) * t3); fine.push([cr(0), cr(1), a[2] + (c[2] - a[2]) * t]); } } fine.push(p.pts[p.pts.length - 1]);
        const b = P.length / 3; let dist = 0; const hw = p.width / 2 + 1.2, cols = 4;
        for (let i = 0; i < fine.length; i++) { const q = fine[i], nx = fine[Math.min(i + 1, fine.length - 1)], pv = fine[Math.max(i - 1, 0)]; let tx = nx[0] - pv[0], tz = nx[1] - pv[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl; if (i > 0) dist += Math.hypot(q[0] - fine[i - 1][0], q[1] - fine[i - 1][1]);
          for (let k = 0; k <= cols; k++) { const u = (k / cols) * 2 - 1; P.push(q[0] - tz * u * hw, q[2], q[1] + tx * u * hw); F.push(u, dist, 1); } }
        for (let i = 0; i < fine.length - 1; i++) for (let k = 0; k < cols; k++) { const a = b + i * (cols + 1) + k; I.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1); }
      }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('flow', new T.BufferAttribute(new Float32Array(F), 3)); g.setIndex(I); g.computeBoundingSphere();
    const R = LR.render, mat = LR.material({ vertexShader: VS, fragmentShader: FS, side: T.DoubleSide, depthTest: false, depthWrite: false, defines: { WAVES_LAYER: LR.mat.L('waves'), SSR_STEPS: LR.off.has('ssr') ? 0 : LR.gpu.tier.ssr | 0, SSR_GROW: (1 + 5.8 / Math.max(LR.gpu.tier.ssr, 6)).toFixed(3) },
      uniforms: Object.assign(LR.uni(R.FRAME + ' uFogCol uFog uSunDir uSunCol uSkyAmb uGroundAmb uCloud uCloudOff uShadowMap uShadowMat uShadowInfo uShadowTexel uMatB uTopo uTopoRect'), LR.sky.U, { tDepth: R.U.tDepth, tCopy: R.U.tCopy, uEnvMips: R.U.uEnvMips, uWaterCol: { value: new T.Vector3(...WA.color) }, uClarity: { value: WA.clarity } }) });
    const m = new T.Mesh(g, mat); m.matrixAutoUpdate = false; m.frustumCulled = true; m.renderOrder = -10; m.name = 'water'; LR.world.forward.add(m); WA.mesh = m; WA.tris = I.length / 3;
  };
  LR.on('built', () => WA.build(), 20);
}
