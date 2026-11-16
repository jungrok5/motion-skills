// scanned-realm · 47_models — scanned models (Poly Haven glTF, fetched by fetch-assets.mjs).
// A model's maps become one material layer and its triangles are written into batches of the world (one per 48 m cell),
// so light, weather, the bounce and the walker treat a scanned barrel exactly like a generated one.
//   await LR.models.load(['wine_barrel_01', 'rock_moss_set_01'])     in LR.start({ materials }) — before the bake
//   LR.models.place('wine_barrel_01', x, z, { h | scale, yaw, sink, tint, lie, solid })   in build → false if it cannot
//   LR.models.place('rock_moss_set_01#3', …)        one object out of a set (its fourth root node), centred on itself
//   LR.models.stand('rock', ['rock_moss_set_01#0', …], { min: 0.5 })   P.rock / P.barrel / P.crate / P.stump draw the scan
//   (pass { generated: true } to one of those props to keep that copy generated, { hero: true } to give it the whole budget)
// LR.models.look = { '<id>': { gain, tint, rough, normal } } before load tunes a model's maps like LR.mat.photo's options.
// The model's own origin is the ground (a scanned rock comes part buried).  Opaque models only: cut-out and glass
// materials are skipped.  Every copy is real triangles — LR.models.budget of them in all, then the generated prop is used.
// A scan is drawn once, into the G-buffer: its shadow and its place in the rain map come from an eight-sided hull
// (48 triangles), so a ten-thousand-triangle barrel is not drawn again in each of three shadow cascades.
{
  const T = THREE, MD = (LR.models = { defs: {}, stands: {}, used: 0, placed: 0, over: 0, lost: [], failed: [], by: {}, share: 0.7 });   // share: stand-ins stop at this part of the budget, so the objects a realm places by name still fit
  const budget = () => MD.budget || (MD.budget = { low: 6e5, medium: 1.2e6, high: 2e6, ultra: 3e6 }[(LR.gpu && LR.gpu.tierName) || 'high'] || 9e5);   // set LR.models.budget to change it
  const xhr = (url, type) => new Promise((res, rej) => { const r = new XMLHttpRequest(); r.open('GET', url); r.responseType = type; r.timeout = LR.qn('scanwait', 40) * 1000; r.onload = () => ((r.status === 200 || r.status === 0) && r.response ? res(r.response) : rej(new Error(url + ' → ' + r.status))); r.onerror = r.ontimeout = () => rej(new Error('cannot read ' + url)); r.send(); });
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, RD = { 5126: 'getFloat32', 5123: 'getUint16', 5125: 'getUint32', 5121: 'getUint8', 5122: 'getInt16', 5120: 'getInt8' };
  MD.has = (id) => !!MD.defs[id];
  // scans are batched by 48 m cell like the props, in meshes of their own: the scan itself (G-buffer only) and its hulls (shadow and rain map only)
  const cells = new Map(), cell = (x, z) => { const k = Math.floor(x / LR.props.CELL) + ':' + Math.floor(z / LR.props.CELL); let c = cells.get(k); if (!c) cells.set(k, (c = { detail: new LR.Geo(8192), proxy: new LR.Geo(512) })); return c; };
  LR.on('built', () => { const W = LR.world; for (const c of cells.values()) { W.add(c.detail, { name: 'scans', double: true, shadow: false, topo: false }); if (!c.proxy.n) continue;
      const pg = c.proxy.geometry(), sh = new T.Mesh(pg, LR.render.matShadow({ back: true })), tp = new T.Mesh(pg, LR.render.matTopo()); sh.matrixAutoUpdate = tp.matrixAutoUpdate = false; W.shadowScene.add(sh); W.topoScene.add(tp); } cells.clear(); }, 11);
  MD.load = async (ids) => { budget(); if (LR.q('scan') === '0' || !LR.ASSETS) return;                 // no scans fetched yet (or ?scan=0): the generated props, without complaint
    await Promise.all([].concat(ids).map((id) => loadOne(id).catch((e) => { MD.failed.push(id); console.warn(`scanned model "${id}" not loaded (${e.message}) — the generated prop is drawn instead`); }))); };
  const view = (prims) => { const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]; let tris = 0; for (const p of prims) { tris += p.idx.length / 3; for (let k = 0; k < p.pos.length; k += 3) for (let c = 0; c < 3; c++) { const q = p.pos[k + c]; if (q < min[c]) min[c] = q; if (q > max[c]) max[c] = q; } }
    return { prims, min, max, tris, h: max[1], r: Math.max(max[0] - min[0], max[2] - min[2]) / 2, cx: (min[0] + max[0]) / 2, cy: (min[1] + max[1]) / 2, cz: (min[2] + max[2]) / 2 }; };
  const loadOne = async (id) => {
    const a = LR.ASSETS && LR.ASSETS.models && LR.ASSETS.models[id]; if (!a) throw new Error('not in assets/manifest.json: name it in assets.json and run fetch-assets.mjs');
    const base = a.file.slice(0, a.file.lastIndexOf('/') + 1), at = (u) => (a.inc && a.inc[u]) || base + u;                 // on the far server a model's files do not sit beside it
    const j = JSON.parse(await xhr(a.file, 'text')), bufs = await Promise.all((j.buffers || []).map((b) => xhr(at(b.uri), 'arraybuffer')));
    const acc = (i) => { const A = j.accessors[i], bv = j.bufferViews[A.bufferView], C = COMP[A.componentType], n = NUM[A.type], off = (bv.byteOffset || 0) + (A.byteOffset || 0), stride = bv.byteStride || 0, out = { n, count: A.count, norm: !!A.normalized, C };
      if (!stride || stride === C.BYTES_PER_ELEMENT * n) { out.a = new C(bufs[bv.buffer].slice(off, off + A.count * n * C.BYTES_PER_ELEMENT)); return out; }
      out.a = new C(A.count * n); const dv = new DataView(bufs[bv.buffer]), rd = RD[A.componentType]; for (let k = 0; k < A.count; k++) for (let c = 0; c < n; c++) out.a[k * n + c] = dv[rd](off + k * stride + c * C.BYTES_PER_ELEMENT, true); return out; };
    const uri = (ti) => { if (!ti) return null; const t = j.textures[ti.index], im = j.images[t.source]; return im && im.uri ? at(im.uri) : null; };
    const layers = (j.materials || []).map((m, mi) => { const p = m.pbrMetallicRoughness || {}, diff = uri(p.baseColorTexture); if (!diff || m.alphaMode === 'BLEND' || m.alphaMode === 'MASK') return null; const name = `model:${id}:${mi}`;
      if (LR.mat.defs.length >= 47 && !(name in LR.mat.id)) return null;                                                        // the material array holds 48 layers
      const arm = uri(p.metallicRoughnessTexture), packed = arm && /_arm_/.test(arm);                                             // glTF promises roughness in G and metal in B; occlusion in R only when the file is an 'arm' map
      LR.mat.define(name, Object.assign({ tile: 1, por: 0.5, pud: 0, stick: 1, moss: 0, pom: 0, aoK: packed ? 1 : 0, photo: { id: name, diff, nor: uri(m.normalTexture), arm } }, (LR.models.look && LR.models.look[id]) || {})); return name; });
    const roots = [];
    const walk = (ni, pm, prims) => { const n = j.nodes[ni], m = new T.Matrix4(); if (n.matrix) m.fromArray(n.matrix); else m.compose(new T.Vector3(...(n.translation || [0, 0, 0])), new T.Quaternion(...(n.rotation || [0, 0, 0, 1])), new T.Vector3(...(n.scale || [1, 1, 1]))); m.premultiply(pm);
      if (n.mesh !== undefined) for (const pr of j.meshes[n.mesh].primitives) { if ((pr.mode === undefined ? 4 : pr.mode) !== 4 || pr.attributes.POSITION === undefined) continue; const layer = layers[pr.material || 0]; if (!layer) continue;
        const P = acc(pr.attributes.POSITION), N = pr.attributes.NORMAL !== undefined ? acc(pr.attributes.NORMAL) : null, U = pr.attributes.TEXCOORD_0 !== undefined ? acc(pr.attributes.TEXCOORD_0) : null, I = pr.indices !== undefined ? acc(pr.indices).a : null;
        const nm = new T.Matrix3().getNormalMatrix(m), pos = new Float32Array(P.count * 3), nor = new Float32Array(P.count * 3), uv = new Float32Array(P.count * 2), v = new T.Vector3(), us = U && U.norm ? 1 / (U.C === Uint16Array ? 65535 : 255) : 1;
        for (let k = 0; k < P.count; k++) { v.set(P.a[k * 3], P.a[k * 3 + 1], P.a[k * 3 + 2]).applyMatrix4(m); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
          if (N) { v.set(N.a[k * 3], N.a[k * 3 + 1], N.a[k * 3 + 2]).applyMatrix3(nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z; } else nor[k * 3 + 1] = 1;
          if (U) { uv[k * 2] = U.a[k * 2] * us; uv[k * 2 + 1] = 1 - U.a[k * 2 + 1] * us; } }                                 // the maps are loaded flipped: v runs up
        prims.push({ layer, pos, nor, uv, idx: I || Uint32Array.from({ length: P.count }, (_, k) => k) }); }
      for (const c of n.children || []) walk(c, m, prims); };
    for (const r of j.scenes[j.scene || 0].nodes) { const prims = []; walk(r, new T.Matrix4(), prims); if (prims.length) roots.push(prims); }
    if (!roots.length) throw new Error('no opaque textured triangles in it');
    MD.defs[id] = view(roots.flat()); MD.defs[id].roots = roots.length;
    roots.forEach((prims, k) => { const d = view(prims); d.own = true; MD.defs[id + '#' + k] = d; });                        // one object of a set: placed about its own centre
  };
  // o: { h: height above the ground in metres | scale, yaw, pitch, roll, sink: metres further into the ground, y: ground height,
  //      tint, lie: on its side, solid: false | factor of its radius | 'box' (its footprint, for a long thing) }
  MD.place = (id, x, z, o = {}) => { const d = MD.defs[id]; if (!d) return false; if (MD.used + d.tris > budget() * (o.standIn ? MD.share : 1)) { if (o.standIn) MD.over++; else MD.lost.push(id); return false; } MD.used += d.tris; MD.placed++; { const k = id.replace(/[#~].*$/, ''), b = MD.by[k] || (MD.by[k] = [0, 0]); b[0]++; b[1] += d.tris; }
    const s = o.scale || (o.h ? o.h / d.h : 1), c = cell(x, z), g = c.detail, y0 = o.y !== undefined ? o.y : LR.land.h(x, z), lie = !!o.lie, rad = Math.max(d.max[0] - d.min[0], d.max[2] - d.min[2]) / 2;
    const put = (q) => { q.at(x, y0 - (o.sink || 0) + (lie ? rad * s : 0), z, o.yaw || 0, o.pitch || 0, (o.roll || 0) + (lie ? Math.PI / 2 : 0)); q.push(new T.Matrix4().makeScale(s, s, s)); q.push(new T.Matrix4().makeTranslation(-d.cx, lie ? -d.cy : 0, -d.cz)); }, out = (q) => { q.pop(); q.pop(); q.pop(); };
    put(g);
    const ao = g.aoFn, base = y0, top = Math.max(0.3, d.h * s); g.aoFn = (px, py, pz, wx, wy) => 0.6 + 0.4 * LR.sm(0, Math.min(0.4, top * 0.6), wy - base);        // darker where it meets the ground
    for (const p of d.prims) { g.mat(p.layer, { tint: o.tint }); const n = p.pos.length / 3, b = g.n; for (let k = 0; k < n; k++) g.vert(p.pos[k * 3], p.pos[k * 3 + 1], p.pos[k * 3 + 2], p.nor[k * 3], p.nor[k * 3 + 1], p.nor[k * 3 + 2], p.uv[k * 2], p.uv[k * 2 + 1], 1);
      for (let k = 0; k < p.idx.length; k += 3) g.idx(b + p.idx[k], b + p.idx[k + 1], b + p.idx[k + 2]); }
    g.aoFn = ao; out(g);
    // the hull that throws its shadow and keeps the rain off what is under it: a prism a little inside the scan's own box
    { const q = c.proxy, hx = ((d.max[0] - d.min[0]) / 2) * 0.9, hz = ((d.max[2] - d.min[2]) / 2) * 0.9; put(q); q.push(new T.Matrix4().makeTranslation(d.cx, d.min[1], d.cz)); q.push(new T.Matrix4().makeScale(hx, 1, hz));
      q.mat(d.prims[0].layer); q.cyl(0, 0, 0, 1, 1, (d.max[1] - d.min[1]) * 0.96, { sides: 8 }); q.pop(); q.pop(); out(q); }
    if (o.solid === 'box') LR.world.solidBox(x, z, ((d.max[0] - d.min[0]) / 2) * s * 0.9, ((d.max[2] - d.min[2]) / 2) * s * 0.8, o.yaw || 0); else if (o.solid !== false) LR.world.solidCircle(x, z, d.r * s * (o.solid || 0.8)); return true; };
  // ── stand-ins: the generated props of 45_props draw a scan when one is loaded ──
  // o: { min: only props at least this big (rocks), full: rocks under this size (1.1) use the lightest third of the scans given,
  //      max: copies at most, h: height of the scan for a prop of size 1 }.   A prop called with { hero: true } is placed from the whole budget.
  MD.stand = (prop, ids, o = {}) => { MD.stands[prop] = { ids: [].concat(ids), o, n: 0 }; };
  const P = LR.props, pick = (s, x, z, small) => { let ids = s.ids.filter((i) => MD.defs[i]); if (!ids.length || (s.o.max && s.n >= s.o.max)) return null; if (small) ids = ids.slice().sort((a, b) => MD.defs[a].tris - MD.defs[b].tris).slice(0, Math.max(1, Math.ceil(ids.length / 3)));
    return ids[LR.rng('md:' + Math.round(x * 10) + ':' + Math.round(z * 10)).int(ids.length)]; };
  const wrap = (prop, fn, small) => { const gen = P[prop]; P[prop] = (x, z, o = {}) => { const s = MD.stands[prop]; if (s && !o.generated) { const id = pick(s, x, z, small && small(x, z, o, s)); if (id && fn(id, x, z, o, s)) { s.n++; return; } } return gen(x, z, o); }; };
  const R = (x, z) => LR.rng('mr:' + Math.round(x * 10) + ':' + Math.round(z * 10));
  wrap('barrel', (id, x, z, o, s) => MD.place(id, x, z, { standIn: !o.hero, h: (s.o.h || 0.9) * (o.scale || 1), yaw: o.yaw !== undefined ? o.yaw : R(x, z)() * 6.28, y: o.y, lie: o.lying, solid: o.solid === false ? false : 0.95 }));
  wrap('crate', (id, x, z, o, s) => MD.place(id, x, z, { standIn: !o.hero, h: (o.size || 0.62) * (o.scale || 1) * (s.o.h || 0.8), yaw: o.yaw || 0, y: o.y, solid: o.solid === false ? false : 0.7 }));
  wrap('stump', (id, x, z, o, s) => MD.place(id, x, z, { standIn: !o.hero, scale: ((o.r || 0.4) / 0.4) * (s.o.scale || 0.8) * (o.scale || 1), yaw: R(x, z)() * 6.28, y: o.y, solid: 0.55 }));
  // rocks: the small ones are drawn from the lightest third of the scans given, and under { min } stay generated
  const rsize = (x, z, o) => o.size || 0.8 + R(x, z)() * 0.9;
  wrap('rock', (id, x, z, o, s) => { const r = R(x, z), size = o.size || 0.8 + r() * 0.9; if (size < (s.o.min || 0.5)) return false; const d = MD.defs[id];
    return MD.place(id, x, z, { standIn: !o.hero, scale: (size * 1.25) / d.r, yaw: r() * 6.28, pitch: (r() - 0.5) * 0.16, roll: (r() - 0.5) * 0.16, y: o.y, sink: size * (o.sink === undefined ? 0.14 : 0.06 + o.sink * 0.4) /* sunk past its earth-coloured foot */, solid: o.solid === false ? false : 0.7 }); },
    (x, z, o, s) => !o.hero && rsize(x, z, o) < (s.o.full || 1.1));
}
