// scanned-realm · 47_models — scanned objects and plants (Poly Haven glTF, fetched by fetch-assets.mjs), drawn instanced.
// A model keeps its own maps (re-baked into two textures in the engine's encoding, at a size that suits how big the
// thing is), gets real levels of detail when the page loads (meshoptimizer for solid things, thinning for plants), and
// every copy is one instance: culled and given its level of detail on the CPU each frame, drawn in one call per level.
// The G-buffer shader is the engine's own surface law — the shared weather, moss, contact darkening, the lighting pass —
// so a scanned barrel is lit, rained on and snowed on like a generated one, and a scanned fern is lit through its leaves.
//
//   await LR.models.load(['wine_barrel_01', { id: 'fern_02', plant: true }, { id: 'rock_face_01', res: '2k', moss: 0.8 }])
//         in LR.start({ materials })                     options per model: plant, wind, trans, shadow ('hull' | 'mesh' | 'none'),
//                                                        detail: 'rock' (a material of the engine laid over a big scan near the eye), lodK,
//                                                        far, lod: [d0, d1], px, gain, tint: [r, g, b], rough, normal, moss, turn
//   LR.models.place('wine_barrel_01', x, z, { h | scale, yaw, pitch, roll, sink, y, tint, lie, solid })   → false if not loaded
//   LR.models.place('fern_02#3', …)                      one object out of a set (its fourth root node), centred on itself
//   LR.models.scatter({ ids, density(x, z), spacing, area, seed, scale: [lo, hi], sink, tilt, avoid(x, z) })   plants by a rule
//   LR.models.stand('barrel' | 'crate' | 'stump' | 'rock', ids, { min, h, max })   the kit's prop of that name draws the scan
//   (a prop called with { generated: true } stays generated)
// The model's own origin is the ground.  Blended (glass) materials are skipped.  When a model is not there — no scans
// fetched, ?scan=0, a file that did not arrive — place() returns false and the caller draws its generated twin.
{
  const T = THREE, U = LR.U;
  const MD = (LR.models = { defs: {}, mats: {}, opt: {}, stands: {}, kit: {}, placed: 0, failed: [], by: {}, live: [], look: {}, info: { inst: 0, tris: 0, calls: 0, shadowTris: 0 },
    stream: !LR.RENDER && LR.q('stream') !== '0', due: 0, arrived: 0, built: false });      // stream: models are placed from their boxes and drawn when they arrive (the live page; stills wait for them)
  // LR.models.kit.<name> = [{ id, s: [lo, hi] }, …]: named sets of scans the builders draw from (weeds: the foot of walls — A.dress)
  MD.set = (name, list) => { MD.kit[name] = list.map((e) => (typeof e === 'string' ? { id: e, s: [1, 1] } : e)).filter((e) => MD.defs[e.id]); };
  const MS = typeof MeshoptSimplifier !== 'undefined' && MeshoptSimplifier.supported ? MeshoptSimplifier : null;
  const wait = () => LR.qn('scanwait', 40) * 1000, hash1 = (x) => { const v = Math.sin(x * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const xhr = (url, type) => new Promise((res, rej) => { const r = new XMLHttpRequest(); r.open('GET', url); r.responseType = type; r.timeout = wait();
    r.onload = () => ((r.status === 200 || r.status === 0) && r.response ? res(r.response) : rej(new Error(url + ' → ' + r.status))); r.onerror = r.ontimeout = () => rej(new Error('cannot read ' + url)); r.send(); });
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const RD = { 5126: 'getFloat32', 5123: 'getUint16', 5125: 'getUint32', 5121: 'getUint8', 5122: 'getInt16', 5120: 'getInt8' };
  MD.has = (id) => !!MD.defs[id];
  MD.count = (id) => (MD.defs[id] ? MD.defs[id].roots || 1 : 0);

  // ── maps: a model's colour, normal and occlusion-roughness photographs → two textures in the engine's own encoding ──
  // A: rgb albedo (gamma 2), a 1 · B: normal xy, roughness, occlusion.  Sized to the thing: a bucket does not need a 1k map.
  let passA = null, passB = null;
  const passes = () => { if (passA) return;
    passA = LR.pass(`//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tDiff, tAlpha; uniform vec4 uTint; uniform float uCut;
void main(){ vec3 d = texture(tDiff, vUv).rgb; o = vec4(sqrt(sat(pow(d, vec3(2.2)) * uTint.rgb * uTint.a)), uCut > 0.5 ? texture(tAlpha, vUv).r : 1.0); }`, { tDiff: { value: null }, tAlpha: { value: null }, uTint: { value: new T.Vector4(1, 1, 1, 1) }, uCut: { value: 0 } });
    passB = LR.pass(`//#include head
in vec2 vUv; out vec4 o; uniform sampler2D tNor, tArm; uniform vec4 uK;                  // has normal, has arm, normal strength, roughness offset
uniform vec2 uAo;                                                                        // how much of the occlusion channel is kept, spare
void main(){ vec3 n = vec3(0.0, 0.0, 1.0); if (uK.x > 0.5) { n = texture(tNor, vUv).xyz * 2.0 - 1.0; n.xy *= uK.z; n = normalize(n); }
  vec3 arm = uK.y > 0.5 ? texture(tArm, vUv).rgb : vec3(1.0, 0.82, 0.0);
  o = vec4(n.xy * 0.5 + 0.5, clamp(arm.g + uK.w, 0.04, 1.0), mix(1.0, arm.r, uAo.x)); }`, { tNor: { value: null }, tArm: { value: null }, uK: { value: new T.Vector4() }, uAo: { value: new T.Vector2(1, 0) } });
  };
  const loader = new T.TextureLoader();
  const image = (url) => (!url ? Promise.resolve(null) : new Promise((res) => { let done = false; const end = (t) => { if (done) { if (t) t.dispose(); return; } done = true; res(t); }; setTimeout(() => end(null), wait());
    loader.load(url, (t) => { t.colorSpace = T.NoColorSpace; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = true; end(t); }, undefined, () => end(null)); }));
  const bakeMaps = async (maps, o, px) => {
    const want = o.maps || 'dna', [td, tn, ta, tc] = await Promise.all([image(maps.diff), image(want.includes('n') ? maps.nor : null), image(want.includes('a') ? maps.arm : null), image(maps.alpha)]);
    if (!td || (maps.alpha && !tc)) { for (const t of [td, tn, ta, tc]) if (t) t.dispose(); throw new Error('its colour or cut-out map did not arrive'); }
    passes(); const G = LR.gpu, size = Math.max(64, Math.min(px, td.image.width || px));
    const mk = () => { const rt = LR.rt(size, size, { mips: true, min: T.LinearMipmapLinearFilter, filter: T.LinearFilter }); rt.texture.anisotropy = G.tier.aniso; return rt; };
    const A = mk(), B = mk(), tint = o.tint || [1, 1, 1];
    passA.uniforms.tDiff.value = td; passA.uniforms.tAlpha.value = tc || td; passA.uniforms.uCut.value = tc ? 1 : 0; passA.uniforms.uTint.value.set(tint[0], tint[1], tint[2], o.gain === undefined ? 1 : o.gain); LR.blit(passA, A);
    passB.uniforms.tNor.value = tn || td; passB.uniforms.tArm.value = ta || td; passB.uniforms.uK.value.set(tn ? 1 : 0, ta ? 1 : 0, o.normal === undefined ? 1 : o.normal, o.rough || 0);
    passB.uniforms.uAo.value.set(ta && maps.packed ? (o.aoK === undefined ? 1 : o.aoK) : 0, 0); LR.blit(passB, B);
    G.renderer.setRenderTarget(null); LR.settle(() => { for (const t of [td, tn, ta, tc]) if (t) t.dispose(); });
    return { A: A.texture, B: B.texture, size, cut: !!tc };
  };

  // ── the surface: the engine's law, with the model's own two maps ───────────────────────────────────────────────
  const objVS = `//#include head
//#include frame
//#include wind
in vec3 position; in vec3 normal; in vec2 uv; in vec4 iA; in vec4 iQ; in vec4 iC; in vec4 iD;
uniform mat4 projectionMatrix, viewMatrix; uniform vec4 uObj;                              // wind weight, 1 / height, spare, spare
#ifndef DEPTH
out vec3 vWorld; out vec3 vN; out vec2 vUv; out vec3 vCol; out vec3 vAux;                  // vAux: height above its ground, fade, seed
#elif defined(CUT)
out vec2 vUv;
#endif
vec3 qrot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
  vec3 lp = position * iA.w, wp = iA.xyz + qrot(iQ, lp);
#ifdef PLANT
  float hgt = sat(position.y * uObj.y), w = uObj.x * hgt * hgt * iA.w, g = gustAt(iA.xz, uTime), ph = iC.w * 6.283 + dot(iA.xz, vec2(0.7, 1.3));
  wp.xz += uWind.xy * (g * 0.5 + sin(uTime * 2.4 + ph + lp.y * 3.0) * 0.06 * (0.5 + uWind.z)) * w;
  wp.xz += vec2(sin(uTime * 5.1 + ph * 3.0 + lp.x * 9.0), cos(uTime * 4.3 + ph * 2.0 + lp.z * 9.0)) * 0.010 * w * (0.4 + uWind.z);
  wp.y -= g * 0.07 * w;
  float low = smoothstep(0.86, 1.0, uWx.w + (iC.w - 0.5) * 0.1); wp.y = mix(wp.y, iD.x + (wp.y - iD.x) * 0.35, low);     // deep winter: what is left lies down
#endif
#ifndef DEPTH
  vWorld = wp; vN = qrot(iQ, normal); vUv = uv; vCol = iC.rgb; vAux = vec3(wp.y - iD.x, iD.y, iC.w);
#elif defined(CUT)
  vUv = uv;
#endif
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
  const objFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include mats
//#include weather
//#include gout
in vec3 vWorld; in vec3 vN; in vec2 vUv; in vec3 vCol; in vec3 vAux;
uniform sampler2D tA, tB; uniform float uCutSize; uniform vec4 uP, uQ, uDet;      // uP: porosity, snow hold, translucency, height of the contact shade · uQ: metal, moss, autumn turn, spare
void main(){
  if (vAux.y > 0.0 && ign(gl_FragCoord.xy + mod(uFrame, 16.0) * vec2(2.17, 5.31)) < vAux.y) discard;      // the far end of its range: thinned out, not popped
  vec4 a = texture(tA, vUv), b = texture(tB, vUv);
#ifdef CUT
  { float lod = max(0.0, 0.5 * log2(max(dot(dFdx(vUv), dFdx(vUv)), dot(dFdy(vUv), dFdy(vUv))) * uCutSize * uCutSize));      // small mips lose coverage: give it back
    if (a.a * (1.0 + 0.3 * lod) < 0.5 + (ign(gl_FragCoord.xy + mod(uFrame, 16.0) * vec2(3.17, 5.91)) - 0.5) * 0.3) discard; }
#endif
  vec3 Ng = normalize(vN); if (!gl_FrontFacing) Ng = -Ng;
  mat3 tbn = cotFrame(Ng, vWorld, vUv);
  vec3 albedo = a.rgb * a.rgb * vCol, N = normalize(tbn * nrmDec(b.xy)); float rough = b.z, ao = b.w, dist = distance(uCamPos, vWorld);
  ao *= mix(0.58, 1.0, smoothstep(0.0, uP.w, vAux.x));                                                    // darker where it meets the ground
  { float near = smoothstep(7.0, 1.4, dist); if (near > 0.0) { vec4 d1 = texture(uNoise, vUv * 23.0), d2 = texture(uNoise, vUv * 71.0 + 0.31);
      vec2 dg = vec2(d1.r - d1.g + (d2.b - d2.a) * 0.7, d1.b - d1.a + (d2.r - d2.g) * 0.7) * 0.35 * near;
      N = normalize(N + tbn[0] * dg.x + tbn[1] * dg.y); albedo *= 1.0 + (d2.r - 0.5) * 0.12 * near; } }
#ifdef DETAIL
  // a scan metres across has a few hundred texels a metre: near the eye a tiling surface of the engine (triplanar) gives
  // it grain — its light and dark over the scan's colour, its normal over the scan's.  uDet: 1 / tile, reach, colour, relief
  { float dk = smoothstep(uDet.y, uDet.y * 0.3, dist);
    if (dk > 0.003) { vec3 w3 = abs(Ng); w3 *= w3; w3 *= w3; w3 /= w3.x + w3.y + w3.z; vec3 q = vWorld * uDet.x; float L = float(DETAIL);
      vec4 dA = texture(uMatA, vec3(q.zy, L)) * w3.x + texture(uMatA, vec3(q.xz, L)) * w3.y + texture(uMatA, vec3(q.xy, L)) * w3.z;
      vec2 nx = nrmDec(texture(uMatB, vec3(q.zy, L)).xy).xy, ny = nrmDec(texture(uMatB, vec3(q.xz, L)).xy).xy, nz = nrmDec(texture(uMatB, vec3(q.xy, L)).xy).xy;
      vec3 mean = textureLod(uMatA, vec3(0.5, 0.5, L), 12.0).rgb;
      float kk = dot(dA.rgb * dA.rgb, vec3(0.3, 0.6, 0.1)) / max(0.02, dot(mean * mean, vec3(0.3, 0.6, 0.1)));
      albedo *= mix(1.0, clamp(kk, 0.5, 1.7), dk * uDet.z);
      N = normalize(N + (vec3(0.0, nx.y, nx.x) * w3.x + vec3(ny.x, 0.0, ny.y) * w3.y + vec3(nz.x, nz.y, 0.0) * w3.z) * dk * uDet.w); } }
#endif
#ifdef PLANT
  { float turn = smoothstep(0.3, 0.62, uWx.w + (vAux.z - 0.5) * 0.22) * uQ.z, lum = dot(albedo, vec3(0.3, 0.6, 0.1));       // the year: green, yellow, brown
    albedo = mix(albedo, vec3(0.42, 0.30, 0.09) * clamp(lum / 0.09, 0.5, 1.9), turn * 0.85);
    albedo = mix(albedo, vec3(0.16, 0.11, 0.06) * clamp(lum / 0.09, 0.5, 1.6), smoothstep(0.6, 0.85, uWx.w + (vAux.z - 0.5) * 0.22) * uQ.z);
    albedo *= 0.8 + 0.4 * texture(uNoise, vWorld.xz * 0.19).g; }                                           // light and dark from plant to plant
#else
  if (uQ.y > 0.0) {                                                                                       // moss and damp where it faces north, sits low or holds water
    vec4 nz = texture(uNoise, vWorld.xz * 0.13 + vWorld.y * 0.09), nz2 = texture(uNoise, vWorld.xz * 0.021 + vWorld.y * 0.013 + 0.4);
    float shade = sat(0.5 - Ng.z * 0.5) * 0.5 + sat(Ng.y) * 0.3;
    float m = uQ.y * (nz2.r * 1.1 + shade * 0.55 - 1.0) + (nz.g - 0.5) * 0.5 + (1.0 - b.w) * 0.6 + uWx.x * 0.08;
    m = smoothstep(0.0, 0.2, m) * (1.0 - uWx.w * 0.5);
    if (m > 0.0) { vec4 ma = texture(uMatA, vec3(vWorld.xz * 0.9 + vWorld.y * 0.7, float(MOSS_LAYER))); albedo = mix(albedo, ma.rgb * ma.rgb * 0.7, m * 0.8); rough = mix(rough, 0.95, m); }
  }
#endif
  float snow = applyWeather(albedo, N, rough, ao, 0.6, vWorld, Ng, uP.x, 0.0, uP.y);
  writeG(albedo, ao, N, rough, uQ.x, uP.z, 0.0, snow);
}`;
  const depthFS = `precision highp float; out vec4 o;
#ifdef CUT
uniform sampler2D tA; in vec2 vUv;
#endif
void main(){
#ifdef CUT
  if (texture(tA, vUv, -1.0).a < 0.4) discard;
#endif
  ${LR.SHADOW_OUT} }`;
  const FRAME = () => LR.render.FRAME + ' uMatA uMatB uTopo uTopoRect';
  const material = (key, tex, o, plant) => {
    if (MD.mats[key]) return MD.mats[key];
    const uObj = { value: new T.Vector4(plant ? (o.wind === undefined ? 0.5 : o.wind) : 0, 0, 0, 0) }, cut = tex.cut ? { CUT: 1 } : {}, det = !plant && o.detail && o.detail in LR.mat.id ? { DETAIL: LR.mat.L(o.detail) } : {}, defs = Object.assign({ MOSS_LAYER: LR.mat.L('moss'), SNOW_LAYER: LR.mat.L('snow') }, plant ? { PLANT: 1 } : {}, cut, det);
    const m = { key, tex, uObj, plant,
      g: LR.material({ vertexShader: objVS, fragmentShader: objFS, defines: defs, side: T.DoubleSide,
        uniforms: Object.assign(LR.uni(FRAME()), { tA: { value: tex.A }, tB: { value: tex.B }, uCutSize: { value: tex.size }, uObj,
          uP: { value: new T.Vector4(o.por === undefined ? 0.5 : o.por, o.stick === undefined ? 1 : o.stick, plant ? (o.trans === undefined ? 0.55 : o.trans) : 0, 0.35) },
          uQ: { value: new T.Vector4(o.metal || 0, plant ? 0 : o.moss || 0, o.turn === undefined ? 1 : o.turn, 0) },
          uDet: { value: new T.Vector4(1 / (o.detailTile || 1.6), o.detailReach || 14, o.detailColor === undefined ? 0.75 : o.detailColor, o.detailRelief === undefined ? 0.8 : o.detailRelief) } }) }) };
    const depth = (side) => LR.material({ vertexShader: objVS, fragmentShader: depthFS, defines: Object.assign({ DEPTH: 1 }, plant ? { PLANT: 1 } : {}, cut), side, polygonOffset: true, polygonOffsetFactor: 1.6, polygonOffsetUnits: 2.5, uniforms: Object.assign(LR.uni(LR.render.FRAME), { uObj, tA: { value: tex.A } }) });
    m.sh = depth(T.DoubleSide); m.hull = depth(T.BackSide);
    return (MD.mats[key] = m);
  };

  // ── reading a model ─────────────────────────────────────────────────────────────────────────────────────────────
  MD.load = async (list) => {
    if (LR.q('scan') === '0' || !LR.ASSETS) return;                                  // no scans fetched yet (or ?scan=0): the generated props, without complaint
    if (MS) await MS.ready;
    const items = [].concat(list).map((e) => (typeof e === 'string' ? { id: e } : e)), now = [], later = [];
    const run = (it, late) => loadOne(it).catch((e) => { MD.failed.push(it.id); console.warn(`scanned model "${it.id}" not loaded (${e.message}) — ${late ? 'where it was placed there is nothing' : 'its generated twin is drawn instead'}`); });
    for (const it of items) { const a = LR.ASSETS.models && LR.ASSETS.models[it.id]; if (MD.stream && a && a.roots && a.roots.length) { early(it, a); later.push(it); } else now.push(run(it)); }
    await Promise.all(now);
    if (later.length) { MD.due += later.length; let k = 0; const worker = async () => { while (k < later.length) { const it = later[k++]; await run(it, true); MD.arrived++; LR.emit('scan', it.id); await LR.breath(); } };
      MD.arriving = Promise.all([worker(), worker(), worker()]); }
  };
  const shape = (id, prims, min, max, tris) => ({ id, prims, min, max, tris, h: max[1], base: -min[1] > 0.15 * (max[1] - min[1]) ? -min[1] : 0, r: Math.max(max[0] - min[0], max[2] - min[2]) / 2, cx: (min[0] + max[0]) / 2, cy: (min[1] + max[1]) / 2, cz: (min[2] + max[2]) / 2, inst: [], n: 0 });
  const view = (prims, id) => { const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]; let tris = 0;
    for (const p of prims) { tris += p.idx.length / 3; for (let k = 0; k < p.pos.length; k += 3) for (let c = 0; c < 3; c++) { const q = p.pos[k + c]; if (q < min[c]) min[c] = q; if (q > max[c]) max[c] = q; } }
    return shape(id, prims, min, max, tris); };
  const reg = (d, id, o) => { d.o = o; d.plant = !!o.plant; d.model = id; MD.defs[d.id] = d; return d; };
  // streaming: the manifest carries every object's box (fetch-assets measures it), so a model is known — placed, bumped
  // into, stood in for a prop — before its triangles and maps have arrived; it is drawn from the frame they do
  const early = (it, a) => { const id = it.id, o = (MD.opt[id] = Object.assign({ maps: a.maps || 'dna' }, MD.look[id] || {}, it)), min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]; let tris = 0;
    a.roots.forEach((b, k) => { tris += b.tris; for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], b.min[c]); max[c] = Math.max(max[c], b.max[c]); } const d = reg(shape(id + '#' + k, null, b.min, b.max, b.tris), id, o); d.own = true; d.pending = true; });
    const w = reg(shape(id, null, min, max, tris), id, o); w.roots = a.roots.length; w.pending = true; };
  const loadOne = async (it) => {
    const id = it.id, a = LR.ASSETS && LR.ASSETS.models && LR.ASSETS.models[id]; if (!a) throw new Error('not in assets/manifest.json: name it in assets.json and run fetch-assets.mjs');
    const o = MD.defs[id] && MD.defs[id].pending ? MD.opt[id] : (MD.opt[id] = Object.assign({ maps: a.maps || 'dna' }, MD.look[id] || {}, it)), plant = !!o.plant;
    const base = a.file.slice(0, a.file.lastIndexOf('/') + 1), at = (u) => (a.inc && a.inc[u]) || base + u;                 // on the far server a model's files do not sit beside it
    const j = JSON.parse(await xhr(a.file, 'text')), bufs = await Promise.all((j.buffers || []).map((b) => xhr(at(b.uri), 'arraybuffer')));
    const acc = (i) => { const A = j.accessors[i], bv = j.bufferViews[A.bufferView], C = COMP[A.componentType], n = NUM[A.type], off = (bv.byteOffset || 0) + (A.byteOffset || 0), stride = bv.byteStride || 0, out = { n, count: A.count, norm: !!A.normalized, C };
      if (!stride || stride === C.BYTES_PER_ELEMENT * n) { out.a = new C(bufs[bv.buffer].slice(off, off + A.count * n * C.BYTES_PER_ELEMENT)); return out; }
      out.a = new C(A.count * n); const dv = new DataView(bufs[bv.buffer]), rd = RD[A.componentType]; for (let k = 0; k < A.count; k++) for (let c = 0; c < n; c++) out.a[k * n + c] = dv[rd](off + k * stride + c * C.BYTES_PER_ELEMENT, true); return out; };
    const uri = (ti) => { if (!ti) return null; const t = j.textures[ti.index], im = j.images[t.source]; return im && im.uri ? at(im.uri) : null; };
    const roots = [], used = new Set(); let seen = 0;
    const walk = (ni, pm, prims) => { const n = j.nodes[ni], m = new T.Matrix4(); if (n.matrix) m.fromArray(n.matrix); else m.compose(new T.Vector3(...(n.translation || [0, 0, 0])), new T.Quaternion(...(n.rotation || [0, 0, 0, 1])), new T.Vector3(...(n.scale || [1, 1, 1]))); m.premultiply(pm);
      if (n.mesh !== undefined) for (const pr of j.meshes[n.mesh].primitives) { if ((pr.mode === undefined ? 4 : pr.mode) !== 4 || pr.attributes.POSITION === undefined) continue; seen++;
        const mi = pr.material || 0, gm = (j.materials || [])[mi] || {}; if ((gm.alphaMode === 'BLEND' && !(a.alpha && o.cut !== false)) || !uri((gm.pbrMetallicRoughness || {}).baseColorTexture)) continue; used.add(mi);
        const P = acc(pr.attributes.POSITION), N = pr.attributes.NORMAL !== undefined ? acc(pr.attributes.NORMAL) : null, UV = pr.attributes.TEXCOORD_0 !== undefined ? acc(pr.attributes.TEXCOORD_0) : null, I = pr.indices !== undefined ? acc(pr.indices).a : null;
        const nm = new T.Matrix3().getNormalMatrix(m), pos = new Float32Array(P.count * 3), nor = new Float32Array(P.count * 3), uv = new Float32Array(P.count * 2), v = new T.Vector3(), us = UV && UV.norm ? 1 / (UV.C === Uint16Array ? 65535 : 255) : 1;
        for (let k = 0; k < P.count; k++) { v.set(P.a[k * 3], P.a[k * 3 + 1], P.a[k * 3 + 2]).applyMatrix4(m); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
          if (N) { v.set(N.a[k * 3], N.a[k * 3 + 1], N.a[k * 3 + 2]).applyMatrix3(nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z; } else nor[k * 3 + 1] = 1;
          if (UV) { uv[k * 2] = UV.a[k * 2] * us; uv[k * 2 + 1] = 1 - UV.a[k * 2 + 1] * us; } }                               // the maps are loaded flipped: v runs up
        prims.push({ mi, pos, nor, uv, idx: I ? Uint32Array.from(I) : Uint32Array.from({ length: P.count }, (_, k) => k) }); }
      for (const c of n.children || []) walk(c, m, prims); };
    for (const r of j.scenes[j.scene || 0].nodes) { const prims = [], s0 = seen; walk(r, new T.Matrix4(), prims); if (seen > s0) roots.push(prims); }      // an object none of whose triangles can be drawn keeps its number
    if (!roots.some((p) => p.length)) throw new Error('no opaque textured triangles in it');
    const whole = view(roots.flat(), id); whole.roots = roots.length;
    // its maps: sized by how big the thing is (about 600 texels a metre, within the tier's cap and the files' own size)
    const G = LR.gpu, cap = { low: 512, medium: 1024, high: 2048, ultra: 2048 }[G.tierName] || 1024, span = Math.max(whole.max[0] - whole.min[0], whole.max[1] - whole.min[1], whole.max[2] - whole.min[2]);
    const px = o.px || Math.min(cap, Math.pow(2, Math.round(Math.log2(LR.clamp(span * 600, 128, 4096)))));
    for (const mi of used) { const gm = j.materials[mi], pb = gm.pbrMetallicRoughness || {}, arm = uri(pb.metallicRoughnessTexture);
      const tex = await bakeMaps({ diff: uri(pb.baseColorTexture), nor: uri(gm.normalTexture), arm, packed: !!arm && /_arm_/.test(arm), alpha: a.alpha && o.cut !== false ? a.alpha : null }, o, px);
      material(id + ':' + mi, tex, o, plant); }
    const put = (v) => { const d = MD.defs[v.id]; if (d && d.pending) { d.prims = v.prims; d.pending = false; return d; } return reg(v, id, o); };                // made early from its box: now it has its triangles
    const ds = [put(whole)]; roots.forEach((prims, k) => { if (!prims.length) return; const v = view(prims, id + '#' + k); v.own = true; ds.push(put(v)); });      // one object of a set: placed about its own centre
    // arrived after the walk began: its programs are prepared before its first frame (it stays unseen until they are)
    if (MD.built) for (const d of ds) if (d.n && !d.cells) { realise(d); d.warming = true; LR.warmMeshes([].concat(...d.mesh, d.smesh || [])).then(() => { d.warming = false; }); }
  };

  // ── levels of detail ────────────────────────────────────────────────────────────────────────────────────────────
  // solid things: meshoptimizer's edge collapse (it keeps the seams of the texture together) to about a quarter and a
  // fifteenth of the triangles.  plants: a plant is hundreds of separate leaves — leaves are dropped, stems kept.
  const comps = (p) => { const nv = p.pos.length / 3, key = new Map(), weld = new Int32Array(nv), par = [];
    for (let i = 0; i < nv; i++) { const k = Math.round(p.pos[i * 3] * 2e3) + ':' + Math.round(p.pos[i * 3 + 1] * 2e3) + ':' + Math.round(p.pos[i * 3 + 2] * 2e3); let w = key.get(k); if (w === undefined) { w = par.length; key.set(k, w); par.push(w); } weld[i] = w; }
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let t = 0; t < p.idx.length; t += 3) { const a = find(weld[p.idx[t]]), b = find(weld[p.idx[t + 1]]), c = find(weld[p.idx[t + 2]]); par[b] = a; par[find(c)] = a; }
    const nt = p.idx.length / 3, tc = new Int32Array(nt), size = new Map(); for (let t = 0; t < nt; t++) { const c = find(weld[p.idx[t * 3]]); tc[t] = c; size.set(c, (size.get(c) || 0) + 1); }
    return { tc, size }; };
  const lodsFor = (p, plant) => { const full = p.idx, out = [full]; if (full.length < 300 * 3) return out;
    // A scan unwrapped into thousands of small islands (a photogrammetry boulder: two vertices to every position) is all
    // seam, and a simplifier that keeps seams stops at four fifths of it.  Then collapses are let across seams, with the
    // texture coordinates weighing in the error so that few triangles end up spanning islands (4 % at a quarter of the
    // triangles, 16 % at a fifteenth — where they are a few pixels of rock among rock).
    const simp = (idx, ratio, err) => { if (!MS) return idx; const target = Math.max(24 * 3, Math.floor((full.length * ratio) / 3) * 3); if (idx.length <= target) return idx;
      try { let r = MS.simplify(idx, p.pos, 3, target, err, [])[0];
        if (r.length > target * 1.3 && !plant && MS.simplifyWithAttributes) { const q = MS.simplifyWithAttributes(idx, p.pos, 3, p.uv, 2, [0.8, 0.8], null, target, Math.max(err, 0.1), ['Permissive'])[0]; if (q.length < r.length) r = q; }
        return Uint32Array.from(r); } catch (e) { return idx; } };
    const push = (idx) => { if (idx.length >= 18 && idx.length < out[out.length - 1].length * 0.8) out.push(idx); };
    if (plant) {                                                                   // leaves and stems are cards: first fewer triangles a card, then fewer cards (the stems stay)
      const { tc, size } = comps(p), nt = full.length / 3, big = Math.max(24, nt * 0.03), kept = [];
      for (let t = 0; t < nt; t++) { const c = tc[t]; if (size.get(c) >= big || hash1(c * 0.731 + 7.1) < 0.55) kept.push(full[t * 3], full[t * 3 + 1], full[t * 3 + 2]); }
      push(simp(full, 0.34, 0.03)); push(simp(Uint32Array.from(kept), 0.12, 0.09)); return out; }
    push(simp(full, 0.26, 0.012)); push(simp(full, 0.065, 0.05)); if (full.length > 12000 * 3) push(simp(full, 0.016, 0.12)); return out; };
  // the hull: an eight-sided prism a little inside the thing's own box — what throws the shadow of a small solid thing
  const hullGeo = (d) => { const hx = ((d.max[0] - d.min[0]) / 2) * 0.9, hz = ((d.max[2] - d.min[2]) / 2) * 0.9, y0 = d.min[1], y1 = d.min[1] + (d.max[1] - d.min[1]) * 0.96, P = [], I = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * LR.TAU; P.push(d.cx + Math.cos(a) * hx, y0, d.cz + Math.sin(a) * hz, d.cx + Math.cos(a) * hx, y1, d.cz + Math.sin(a) * hz); }
    for (let k = 0; k < 8; k++) { const a = k * 2, b = ((k + 1) % 8) * 2; I.push(a, a + 1, b, b, a + 1, b + 1); if (k > 0 && k < 7) I.push(0, k * 2, (k + 1) * 2, 1, (k + 1) * 2 + 1, k * 2 + 1); }
    const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.BufferAttribute(Float32Array.from(P), 3)); g.setIndex(I); return g; };

  // ── instances ───────────────────────────────────────────────────────────────────────────────────────────────────
  // 16 numbers a copy: position, scale · rotation (a quaternion) · tint, seed · its ground height, fade, spare, spare
  const eul = new T.Euler(), quat = new T.Quaternion(), v3 = new T.Vector3();
  const add = (d, x, y, z, s, q, tint, seed, ground) => { d.inst.push(x, y, z, s, q.x, q.y, q.z, q.w, tint[0], tint[1], tint[2], seed, ground, 0, 0, 0); d.n++; MD.placed++; const b = MD.by[d.model] || (MD.by[d.model] = [0, 0]); b[0]++; b[1] += d.tris; };
  const WHITE = [1, 1, 1];
  // o: { h: height above the ground in metres | scale, yaw, pitch, roll, sink: metres further into the ground, y: ground height,
  //      tint: [r, g, b] multipliers, lie: on its side, solid: false | factor of its radius | 'box' (its footprint, for a long thing) }
  MD.place = (id, x, z, o = {}) => { const d = MD.defs[id]; if (!d) return false;
    const s = o.scale || (o.h ? o.h / (d.h + d.base) : 1), y0 = o.y !== undefined ? o.y : LR.land.h(x, z), lie = !!o.lie, rad = Math.max(d.max[0] - d.min[0], d.max[2] - d.min[2]) / 2;
    quat.setFromEuler(eul.set(o.pitch || 0, o.yaw || 0, (o.roll || 0) + (lie ? Math.PI / 2 : 0), 'YXZ'));
    v3.set(-d.cx * s, lie ? -d.cy * s : 0, -d.cz * s).applyQuaternion(quat);
    add(d, x + v3.x, y0 - (o.sink || 0) + (lie ? rad * s : d.base * s) + v3.y, z + v3.z, s, quat, Array.isArray(o.tint) ? o.tint : WHITE, hash1(x * 12.9898 + z * 78.233), y0);
    if (o.solid === 'box') LR.world.solidBox(x, z, ((d.max[0] - d.min[0]) / 2) * s * 0.9, ((d.max[2] - d.min[2]) / 2) * s * 0.8, o.yaw || 0); else if (o.solid !== false && !d.plant) LR.world.solidCircle(x, z, d.r * s * (o.solid || 0.8));
    return true; };
  // plants by a rule: a jittered grid over an area; density(x, z) is the chance (0..1) that a grid point grows one
  MD.scatter = (o) => { const ids = [].concat(o.ids).filter((i) => MD.defs[i]); if (!ids.length) return 0; for (const i of ids) MD.defs[i].strewn = true;
    const sp = o.spacing || 1.5, r = LR.rng(o.seed || 'scatter'), a = o.area || [-LR.land.half, -LR.land.half, LR.land.half, LR.land.half], sc = o.scale || [0.85, 1.25], tv = o.tintVar === undefined ? 0.16 : o.tintVar; let n = 0;
    for (let z = a[1]; z < a[3]; z += sp) for (let x = a[0]; x < a[2]; x += sp) { const px = x + r() * sp, pz = z + r() * sp, pick = r(), roll = r(), s = sc[0] + (sc[1] - sc[0]) * r(), yaw = r() * LR.TAU, t1 = r(), t2 = r();
      if (roll >= (o.density ? o.density(px, pz) : 1) || (o.avoid && o.avoid(px, pz))) continue;
      const d = MD.defs[ids[Math.floor(pick * ids.length)]], y0 = LR.land.h(px, pz), k = 1 + (t1 - 0.5) * 2 * tv;
      quat.setFromEuler(eul.set((t1 - 0.5) * (o.tilt || 0.12), yaw, (t2 - 0.5) * (o.tilt || 0.12), 'YXZ')); v3.set(-d.cx * s, 0, -d.cz * s).applyQuaternion(quat);
      add(d, px + v3.x, y0 - (o.sink || 0.01) * s + v3.y, pz + v3.z, s, quat, [k * (1 + (t2 - 0.5) * tv), k, k * (1 - (t2 - 0.5) * tv)], t1, y0); n++; }
    return n; };

  // ── after the realm is built: every model that has copies gets its geometry, its levels of detail and its buffers ──
  const CELL = (d) => (d.plant ? 16 : 32);
  const realise = (d) => { const W = LR.world, n = d.n, src = (d.inst = Float32Array.from(d.inst)), o = d.o, cs = CELL(d), cells = new Map();
    for (let i = 0; i < n; i++) { const k = Math.floor(src[i * 16] / cs) + ':' + Math.floor(src[i * 16 + 2] / cs); let c = cells.get(k); if (!c) cells.set(k, (c = { ids: [], x: 0, y: 0, z: 0, r: 0, d: 0 })); c.ids.push(i); }
    d.cells = [...cells.values()]; let smax = 0;
    for (const c of d.cells) { for (const i of c.ids) { c.x += src[i * 16]; c.y += src[i * 16 + 1]; c.z += src[i * 16 + 2]; } c.x /= c.ids.length; c.y /= c.ids.length; c.z /= c.ids.length;
      for (const i of c.ids) { c.r = Math.max(c.r, Math.hypot(src[i * 16] - c.x, src[i * 16 + 1] - c.y, src[i * 16 + 2] - c.z)); smax = Math.max(smax, src[i * 16 + 3]); } c.ids = Int32Array.from(c.ids); }
    const size = Math.hypot(d.max[0] - d.min[0], d.max[1] - d.min[1], d.max[2] - d.min[2]) * smax; d.rad = size / 2; for (const c of d.cells) c.r += d.rad;
    // how far each level reaches: by the thing's size (a barrel changes at 9 m and 26 m, a cliff face at 60 m and 170 m)
    d.far = o.far || (d.plant ? LR.clamp(size * 30, 16, 45) : d.strewn ? LR.clamp(size * 40, 24, 70) : Math.max(30, size * 320));       // what a rule strews over the ground (twigs, stones) is not a landmark                                    // an apple is gone at 45 m, a barrel at 300
    const shadow = o.shadow || (d.plant ? (size > 0.9 ? 'mesh' : 'none') : d.strewn && size < 1.6 ? 'none' : size < 2.2 ? 'hull' : 'mesh'); d.shadowFar = d.plant ? 26 : d.strewn ? 40 : 1e9;
    d.cap = d.plant ? Math.min(n, 6000) : n; d.buf = []; d.mesh = []; d.tri = [];
    const ibuf = (cap) => { const b = new T.InstancedInterleavedBuffer(new Float32Array(cap * 16), 16); b.setUsage(T.DynamicDrawUsage); return b; };
    const withInst = (g, b) => { g.setAttribute('iA', new T.InterleavedBufferAttribute(b, 4, 0)); g.setAttribute('iQ', new T.InterleavedBufferAttribute(b, 4, 4)); g.setAttribute('iC', new T.InterleavedBufferAttribute(b, 4, 8)); g.setAttribute('iD', new T.InterleavedBufferAttribute(b, 4, 12)); g.instanceCount = 0; return g; };
    const parts = d.prims.map((p) => ({ p, mat: MD.mats[d.model + ':' + p.mi], lods: lodsFor(p, d.plant), pos: new T.BufferAttribute(p.pos, 3), nor: new T.BufferAttribute(p.nor, 3), uv: new T.BufferAttribute(p.uv, 2) })).filter((q) => q.mat);
    d.nl = Math.max(...parts.map((q) => q.lods.length)); const hInv = 1 / Math.max(0.05, d.max[1]);
    // how far each level reaches.  A solid thing: while its triangles are about two pixels wide on a 1080-line screen
    // (584 × size / √triangles metres) — a 66 000-triangle boulder is whole only within 5 m, a 950-triangle table always.
    // A plant the same way but sooner (350 ×: its far levels drop whole leaves, and it is one of hundreds); gone at 16–45 m.
    { const tl = (l) => parts.reduce((a, q) => a + q.lods[Math.min(l, q.lods.length - 1)].length / 3, 0); d.lod = [];
      for (let l = 0; l < d.nl - 1; l++) d.lod.push(o.lod && o.lod[l] !== undefined ? o.lod[l] : d.plant ? Math.max(l ? 9 : 3.5, ((o.lodK || 1) * 350 * size) / Math.sqrt(tl(l))) : Math.max(l ? 2.6 : 1.3, ((o.lodK || 1) * 584 * size) / Math.sqrt(tl(l)))); }
    for (let l = 0; l < d.nl; l++) { const b = ibuf(d.cap), ms = []; let tri = 0;
      for (const q of parts) { const idx = q.lods[Math.min(l, q.lods.length - 1)], g = new T.InstancedBufferGeometry(); g.setAttribute('position', q.pos); g.setAttribute('normal', q.nor); g.setAttribute('uv', q.uv); g.setIndex(new T.BufferAttribute(idx, 1)); withInst(g, b);
        q.mat.uObj.value.y = q.mat.uObj.value.y ? Math.min(q.mat.uObj.value.y, hInv) : hInv;
        const m = new T.Mesh(g, q.mat.g); m.frustumCulled = false; m.matrixAutoUpdate = false; m.visible = false; m.name = 'scan:' + d.id + ':' + l; W.scene.add(m); ms.push(m); tri += idx.length / 3; }
      d.buf.push(b); d.mesh.push(ms); d.tri.push(tri); }
    if (shadow !== 'none') { const b = ibuf(d.cap), ms = []; let tri = 0;
      if (shadow === 'hull') { const g = withInst(hullGeo(d), b), m = new T.Mesh(g, parts[0].mat.hull); m.frustumCulled = false; m.matrixAutoUpdate = false; m.visible = false; W.shadowScene.add(m); ms.push(m); tri = 28; }
      else for (const q of parts) { const idx = q.lods[q.lods.length - 1], g = new T.InstancedBufferGeometry(); g.setAttribute('position', q.pos); g.setAttribute('uv', q.uv); g.setIndex(new T.BufferAttribute(idx, 1)); withInst(g, b);
        const m = new T.Mesh(g, q.mat.sh); m.frustumCulled = false; m.matrixAutoUpdate = false; m.visible = false; W.shadowScene.add(m); ms.push(m); tri += idx.length / 3; }
      d.sbuf = b; d.smesh = ms; d.stri = tri; }
    d.inst = src; MD.live.push(d); };
  LR.on('built', () => { MD.built = true; for (const id in MD.defs) { const d = MD.defs[id]; if (d.n && !d.cells && d.prims) realise(d); } }, 11);

  // ── each frame: which copies are in view, at which level; which are near enough to throw a shadow ──────────────────
  const frustum = new T.Frustum(), VP = new T.Matrix4(), sph = new T.Sphere(), order = [];
  MD.reach = () => ({ low: 0.6, medium: 0.8, high: 1, ultra: 1.3 }[LR.gpu.tierName] || 1);
  MD.update = (cam) => {
    const I = MD.info; I.inst = 0; I.tris = 0; I.calls = 0; I.shadowTris = 0; if (!MD.live.length) return;
    VP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(VP);
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z, k = MD.reach(), sd = LR.gpu.tier.shadowDist * 0.75, shadows = !LR.off.has('shadow');
    for (const d of MD.live) {
      if (d.warming) continue;
      const src = d.inst, far = d.far * k, L = d.lod, nl = d.nl, cap = d.cap, B = d.buf, S = d.sbuf && shadows ? d.sbuf.array : null, sfar = Math.min(sd, d.shadowFar * k);
      const cnt = [0, 0, 0, 0]; let ns = 0; order.length = 0;
      for (const c of d.cells) { const dist = Math.hypot(c.x - cx, c.y - cy, c.z - cz) - c.r; if (dist > far) continue; sph.center.set(c.x, c.y, c.z); sph.radius = c.r; c.vis = frustum.intersectsSphere(sph); if (!c.vis && (!S || dist > sfar)) continue; c.d = dist; order.push(c); }
      if (d.plant && order.length > 1) order.sort((a, b) => a.d - b.d);                                    // nearest first, so a full buffer drops the far ones
      for (const c of order) { const ids = c.ids, vis = c.vis;
        for (let q = 0; q < ids.length; q++) { const o = ids[q] * 16, ex = src[o] - cx, ey = src[o + 1] - cy, ez = src[o + 2] - cz, dd = Math.sqrt(ex * ex + ey * ey + ez * ez); if (dd > far) continue;
          if (vis) { let l = 0; while (l < nl - 1 && dd > L[l] * k) l++; if (cnt[l] < cap) { const arr = B[l].array, t = cnt[l]++ * 16; for (let e = 0; e < 16; e++) arr[t + e] = src[o + e]; arr[t + 13] = dd > far * 0.8 ? (dd - far * 0.8) / (far * 0.2) : 0; } }
          if (S && dd < sfar && ns < cap) { const t = ns++ * 16; for (let e = 0; e < 16; e++) S[t + e] = src[o + e]; } } }
      for (let l = 0; l < nl; l++) { const n = cnt[l], b = B[l]; for (const m of d.mesh[l]) { m.visible = n > 0; m.geometry.instanceCount = n; }
        if (n) { b.clearUpdateRanges(); b.addUpdateRange(0, n * 16); b.needsUpdate = true; I.inst += n; I.tris += n * d.tri[l]; I.calls += d.mesh[l].length; } }
      if (d.sbuf) { for (const m of d.smesh) { m.visible = ns > 0 && shadows; m.geometry.instanceCount = ns; } if (ns && shadows) { d.sbuf.clearUpdateRanges(); d.sbuf.addUpdateRange(0, ns * 16); d.sbuf.needsUpdate = true; I.shadowTris += ns * d.stri; } }
    }
    LR.render.info.scans = I;
  };
  LR.on('frame', (time, dt, cam) => MD.update(cam || LR.cam), 60);

  // ── stand-ins: the generated props of 45_props draw a scan when one is loaded ──────────────────────────────────────
  // o: { min: only rocks at least this big, max: copies at most, h: height of the scan for a prop of size 1 }
  MD.stand = (prop, ids, o = {}) => { MD.stands[prop] = { ids: [].concat(ids), o, n: 0 }; };
  const P = LR.props, R = (x, z) => LR.rng('mr:' + Math.round(x * 10) + ':' + Math.round(z * 10));
  const pick = (s, x, z) => { const ids = s.ids.filter((i) => MD.defs[i]); if (!ids.length || (s.o.max && s.n >= s.o.max)) return null; return ids[LR.rng('md:' + Math.round(x * 10) + ':' + Math.round(z * 10)).int(ids.length)]; };
  const wrap = (prop, fn) => { const gen = P[prop]; P[prop] = (x, z, o = {}) => { const s = MD.stands[prop]; if (s && !o.generated) { const id = pick(s, x, z); if (id && fn(id, x, z, o, s)) { s.n++; return; } } return gen(x, z, o); }; };
  wrap('barrel', (id, x, z, o, s) => MD.place(id, x, z, { h: (s.o.h || 0.9) * (o.scale || 1), yaw: o.yaw !== undefined ? o.yaw : R(x, z)() * 6.28, y: o.y, lie: o.lying, solid: o.solid === false ? false : 0.95 }));
  wrap('crate', (id, x, z, o, s) => MD.place(id, x, z, { h: (o.size || 0.62) * (o.scale || 1) * (s.o.h || 0.8), yaw: o.yaw || 0, y: o.y, solid: o.solid === false ? false : 0.7 }));
  wrap('stump', (id, x, z, o, s) => MD.place(id, x, z, { scale: ((o.r || 0.4) / 0.4) * (s.o.scale || 0.8) * (o.scale || 1), yaw: R(x, z)() * 6.28, y: o.y, solid: 0.55 }));
  wrap('rock', (id, x, z, o, s) => { const r = R(x, z), size = o.size || 0.8 + r() * 0.9; if (size < (s.o.min || 0.5)) return false; const d = MD.defs[id];
    return MD.place(id, x, z, { scale: (size * 1.25) / d.r, yaw: r() * 6.28, pitch: (r() - 0.5) * 0.16, roll: (r() - 0.5) * 0.16, y: o.y, sink: size * (o.sink === undefined ? 0.14 : 0.06 + o.sink * 0.4), solid: o.solid === false ? false : 0.7 }); });
}
