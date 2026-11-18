// machine-wilds · 48_mech_run — the machines in the page.  Each unit is one mesh a level of detail (and one in the
// shadow pass), moved rigidly by a row of the bone texture that is rewritten every frame from LR.mech.poseAt(unit, time):
// the same pure function the checks sample, so what is drawn is what was checked.  Also here: the lamps handed to the
// air and light passes, the feet the walker bumps into, the ground shake and the list of fresh footfalls (dust, sound),
// the head that turns to whoever comes near, and wrecks — a kind built once in a pose and left to the moss.
{
  const M = LR.mech, T = THREE, V = M.v, D2R = M.D2R, MAXB = 192, ROWS = 16;
  const skin = (data, o, f, g) => {      // rows of the matrix that takes the rest frame g to the frame f
    for (let i = 0; i < 3; i++) { const a = f.x[i], b = f.y[i], c = f.z[i], r0 = a * g.x[0] + b * g.y[0] + c * g.z[0], r1 = a * g.x[1] + b * g.y[1] + c * g.z[1], r2 = a * g.x[2] + b * g.y[2] + c * g.z[2];
      data[o + i * 4] = r0; data[o + i * 4 + 1] = r1; data[o + i * 4 + 2] = r2; data[o + i * 4 + 3] = f.p[i] - (r0 * g.p[0] + r1 * g.p[1] + r2 * g.p[2]); } };
  M.skin = skin;
  M.start = () => {
    if (!M.units.length || M.boneTex) return; if (!M.planned) M.plan();
    const W = LR.world, data = (M.boneData = new Float32Array(MAXB * 3 * 4 * ROWS)), tex = (M.boneTex = new T.DataTexture(data, MAXB * 3, ROWS, T.RGBAFormat, T.FloatType)); tex.minFilter = tex.magFilter = T.NearestFilter; tex.needsUpdate = true;
    if (M.units.length > ROWS) throw new Error(`more than ${ROWS} machines`);
    M.units.forEach((u, i) => { const K = u.K, kin = u.kin; if (kin.nb > MAXB) throw new Error(`machine ${u.kind}: ${kin.nb} bones (at most ${MAXB})`);
      u.row = i; u.uBone = { value: new T.Vector4(i, 1, 0, 0) }; const o = { tBones: { value: tex }, uBone: u.uBone }, mat = LR.render.matMech(o), smat = LR.render.matMechShadow(o); u.meshes = []; u.shadows = [];
      if (!K.rest) { const rest = kin.pose(kin.restCmd()).W; K.rest = kin.bones.map((b) => rest[b[0]]); const G0 = M.geometry(u.kind, 0); K.radius = Math.max(K.spec.ride * 1.2, Math.hypot(G0.max[0] - G0.min[0], G0.max[1] - G0.min[1], G0.max[2] - G0.min[2]) * 0.6); K.tris = [0, 1, 2].map((l) => M.geometry(u.kind, l).tris); }
      for (let lod = 0; lod < 3; lod++) { const G = M.geometry(u.kind, lod), m = new T.Mesh(G.geometry, mat); m.frustumCulled = false; m.matrixAutoUpdate = false; m.visible = false; m.name = 'mech'; W.scene.add(m); u.meshes.push(m);
        const s = new T.Mesh(G.geometry, smat); s.frustumCulled = false; s.matrixAutoUpdate = false; s.visible = false; W.shadowScene.add(s); u.shadows.push(s); }
      u.lampDefs = M.geometry(u.kind, 0).lamps; u.aware = { w: 0, yaw: 0, pitch: 0 }; u.solids = kin.limbs.map(() => { const s = { x: 0, z: 0, r: 0, mech: true }; W.solids.push(s); return s; }); });
    LR.on('frame', M.update, 20);
  };
  const frustum = new T.Frustum(), pm = new T.Matrix4(), sph = new T.Sphere(); let lastShake = [0, 0, 0], shaken = [NaN, NaN, NaN];
  M.impacts = []; M.lamps = [];
  M.update = (time, dt, cam) => {
    if (!M.boneTex) return; const data = M.boneData, R = LR.render, lamps = (M.lamps = []), imp = (M.impacts = []), q = LR.gpu.tier.name === 'low' ? 0.6 : LR.gpu.tier.name === 'medium' ? 0.8 : 1, live = !LR.RENDER || LR.q('aware') === '1';
    cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); let tris = 0;
    // (the shake of the last frame is taken off only if nobody has placed the eye since: the walker and a film place it every frame)
    if (cam.position.x === shaken[0] && cam.position.y === shaken[1] && cam.position.z === shaken[2]) { cam.position.x -= lastShake[0]; cam.position.y -= lastShake[1]; cam.position.z -= lastShake[2]; }
    for (const u of M.units) {
      const K = u.K, kin = u.kin, r = M.poseAt(u, time), Wd = r.W, c = r.cmd, B = Wd.body; u.pose = r;
      const o0 = u.row * MAXB * 12; for (let i = 0; i < kin.nb; i++) skin(data, o0 + i * 12, Wd[kin.bones[i][0]], K.rest[i]);
      const d = Math.hypot(B.p[0] - cam.position.x, B.p[1] - cam.position.y, B.p[2] - cam.position.z); sph.center.set(B.p[0], B.p[1] - K.spec.ride * 0.3, B.p[2]); sph.radius = K.radius; u.dist = d;
      const seen = d < 1500 && frustum.intersectsSphere(sph), lk = K.spec.lodK || 1, lod = d < K.radius * 4.5 * q * lk ? 0 : d < K.radius * 13 * q * lk ? 1 : 2; u.lod = seen ? lod : -1; if (seen) tris += K.tris[lod];
      for (let i = 0; i < 3; i++) { u.meshes[i].visible = seen && i === lod; u.shadows[i].visible = d < LR.gpu.tier.shadowDist + K.radius * 2 && i === Math.min(2, lod + 1); }
      // someone near: the head finds them and stays on them; it lets go slowly when they leave
      const A = u.aware, range = K.spec.aware === undefined ? K.spec.ride * 4 : K.spec.aware;
      if (live && Wd.head && range > 0) { const H = Wd.head.p, dx = cam.position.x - H[0], dz = cam.position.z - H[2], dh = Math.hypot(dx, dz), near = Math.hypot(dh, cam.position.y - H[1]) < range;
        const yawT = LR.clamp(LR.wrapPi(Math.atan2(dz, dx) - c.h) / D2R, -110, 110), pitchT = LR.clamp(Math.atan2(H[1] - cam.position.y, Math.max(1, dh)) / D2R, -10, 62);
        A.w = LR.damp(A.w, near ? 1 : 0, near ? 0.5 : 0.25, dt); if (near) { A.yaw = LR.damp(A.yaw, yawT, 0.9, dt); A.pitch = LR.damp(A.pitch, pitchT, 0.9, dt); } } else A.w = 0;
      u.uBone.value.y = c.light * (K.spec.lensGain === undefined ? 26 : K.spec.lensGain) * (1 + 0.5 * A.w);
      for (const L of u.lampDefs) { const f = Wd[kin.bones[L.bone][0]]; lamps.push({ p: M.apply(f, L.at), d: M.dir(f, L.dir), color: L.color, power: L.power * c.light * (1 + (L.beam ? 0.6 : 0.2) * A.w), cone: L.cone, range: L.range, beam: L.beam, unit: u }); }
      // feet: what the walker bumps into while a foot is down or low, and the footfalls of the last seconds
      kin.limbs.forEach((l, i) => { const F = Wd['foot_' + l.name].p, s = u.solids[i], lq = c.limbs[l.name], low = F[1] - l.ball - LR.land.h(F[0], F[2]) < 2.3; s.x = F[0]; s.z = F[2]; s.r = low ? l.ball * 1.15 + l.toeLen * 0.3 : 0;
        if (!u.post && !lq.sw && c.rate > 0.02) { const age = (c.u - (lq.k + u.off[l.name])) * u.T; if (age >= 0 && age < 5) imp.push({ x: lq.p[0], y: lq.p[1] - l.ball, z: lq.p[2], age, size: l.ball * 1.1 + l.toeLen * 0.6, tonnes: K.spec.tonnes || 50, unit: u, leg: l.name, k: lq.k }); } });
    }
    M.boneTex.needsUpdate = true; R.lamps = lamps; R.info.mechTris = tris; R.info.mechs = M.units.filter((u) => u.lod >= 0).length;
    // the ground carries every footfall to the eye: a short ring, weaker with distance
    let sx = 0, sy = 0; for (const p of imp) { if (p.age > 2.6) continue; const d = Math.hypot(p.x - cam.position.x, p.z - cam.position.z), amp = ((0.0042 * Math.sqrt(p.tonnes)) / (1 + d / 14)) * Math.exp(-p.age * 2.6) * LR.sm(0, 0.06, p.age); sy += amp * Math.sin(p.age * 31 + p.k); sx += amp * 0.5 * Math.sin(p.age * 24 + p.k * 2.1); }
    lastShake = LR.off.has('shake') ? [0, 0, 0] : [sx, sy, sx * 0.6]; cam.position.x += lastShake[0]; cam.position.y += lastShake[1]; cam.position.z += lastShake[2]; shaken = [cam.position.x, cam.position.y, cam.position.z]; M.shake = Math.hypot(sx, sy);
    // a flyer cries now and then (each at its own times)
    if (!LR.RENDER) for (const u of M.units) { const cr = u.fly && u.K.spec.cry; if (!cr) continue; const k = Math.floor((time + (u.phase || 0) * cr[0]) / cr[0]); if (u._cry !== undefined && k !== u._cry) LR.emit('mechcall', { unit: u, at: u.pose.W.body.p, f: cr[1], len: cr[2], gain: cr[3] || 0.6 }); u._cry = k; }
    // a move with a voice: when its time comes round, the machine calls
    if (!LR.RENDER) for (const u of M.units) { const c = u.pose.cmd, sd = c.move && c.move.sound; if (sd) { if (u._mt !== undefined && u._mt < sd[0] && c.mt >= sd[0]) LR.emit('mechcall', { unit: u, at: (u.pose.W.head || u.pose.W.body).p, f: sd[1], len: sd[2], gain: sd[3] || 1 }); u._mt = c.mt; } else u._mt = undefined; }
    // new footfalls since the last frame: for dust and sound (the live page; a still shows what the ages say)
    if (!LR.RENDER) { M.seen = M.seen || new Map(); for (const p of imp) { const key = p.unit.name + p.leg; if (M.seen.get(key) !== p.k) { const first = !M.seen.has(key); M.seen.set(key, p.k); if (!first && p.age < 0.5) LR.emit('footfall', p); } } }
  };
  // sound: where a footfall or a call is from the listener (distance, and which ear)
  const heard = (x, y, z) => { const P = LR.player, d = Math.hypot(x - P.x, y - (P.y + P.eye), z - P.z), rx = Math.cos(P.yaw), rz = Math.sin(P.yaw); return { d, side: LR.clamp(((x - P.x) * rx + (z - P.z) * rz) / Math.max(4, d), -1, 1) }; };
  LR.on('footfall', (p) => { if (LR.audio && LR.audio.ready) LR.audio.footfall(Object.assign(heard(p.x, p.y, p.z), { tonnes: p.tonnes, wet: LR.water && LR.water.levelAt(p.x, p.z) > p.y + 0.05 })); });
  LR.on('mechcall', (e) => { if (LR.audio && LR.audio.ready) LR.audio.call(Object.assign(heard(e.at[0], e.at[1], e.at[2]), { f: e.f, len: e.len, gain: e.gain })); });
  // what a unit weighs on the page: triangles a level, bones, lamps (the checks and the HUD's numbers read this)
  M.info = () => M.units.map((u) => ({ name: u.name, kind: u.kind, bones: u.kin.nb, tris: u.K.tris, lamps: u.lampDefs ? u.lampDefs.length : 0, lod: u.lod, dist: u.dist }));

  // ── a studio: one kind alone on a grey floor with a figure for scale, walking an oval — for the cast sheet (render.mjs --cast) ──
  M.studio = (kind) => {
    const K = M.kinds[kind]; if (!K) throw new Error('no machine kind ' + kind + ' (have: ' + Object.keys(M.kinds).join(', ') + ')'); const W = LR.world, L = LR.land;
    M.units.length = 0; for (const k in M.routes) delete M.routes[k]; W.solids.length = 0; W.lights.length = 0; W.sounds.length = 0; W.places.length = 0; M.planned = false;
    const FL = K.spec.flight, xs = K.spec.limbs.map((l) => l.home[0]), wb = FL ? (FL.span || 6) * 1.5 : Math.max(...xs) - Math.min(...xs), R = FL ? Math.max(40, (FL.speed * FL.speed) / 5) : Math.max(26, wb * 2.6), SL = FL ? R * 1.6 : 0, half = Math.min(320, Math.ceil((Math.max(R * 2.2, (SL + R) * 2) + 40) / 64) * 64) / (FL ? 1 : 1);
    L.create({ height: (x, z) => (LR.fbm(x * 0.07, z * 0.07, 3) - 0.5) * 0.12, half, res: 0.5 }); L.paint('paved', () => 1); L.paint('grass', () => 0); L.paint('tall', () => 0); L.paint('flowers', () => 0); L.paint('fern', () => 0);
    if (LR.grass) LR.grass.enabled = false;
    const pts = []; if (FL) { for (let i = -3; i <= 3; i++) pts.push([(i / 3) * SL, -R]); for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; pts.push([SL + Math.sin(a) * R, -Math.cos(a) * R]); } for (let i = 3; i >= -3; i--) pts.push([(i / 3) * SL, R]); for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; pts.push([-SL - Math.sin(a) * R, Math.cos(a) * R]); } }      // a flyer: two long straights (it is turned about flying level) joined by half circles
    else for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push([Math.sin(a) * R * 1.25, -Math.cos(a) * R]); }      // it passes (0, −R) heading east
    // (a flyer goes round the same oval a few metres up, climbing along one side and coming down the other: low enough to stand by the figure)
    M.route('studio', pts, { width: 0 }); const mv = Object.keys(K.spec.moves || {})[0], u = FL ? M.spawn(kind, { name: kind, fly: pts.map((p, i) => [p[0], p[1], 6 + (FL.span || 6) * 0.4 + (p[1] > 0 ? 2.5 : 0) * Math.cos((p[0] / (SL + R)) * Math.PI * 0.5)]) }) : M.spawn(kind, { route: 'studio', name: kind, halts: [{ at: 0.5, hold: 12, move: mv }] }); if (FL) delete M.routes.studio; M.plan({ press: false });
    // a figure 1.75 m tall beside the way, in orange: what the size is measured against
    { const g = new LR.Geo(), fx = 0, fz = -R + (FL ? (FL.span || 6) * 0.6 : Math.max(...K.spec.limbs.map((l) => Math.abs(l.home[1])))) + 2.2, y = L.h(fx, fz); g.mat('cloth', { tint: '#ff7a1a', flags: LR.FLAG.NOWEATHER }); g.tube([[fx, y, fz], [fx, y + 0.85, fz], [fx, y + 1.45, fz]], [0.16, 0.2, 0.17], { sides: 8, caps: true }); g.blob(fx, y + 1.62, fz, 0.13, { amp: 0, seg: 8, rings: 6 }); W.add(g, { name: 'figure' }); M.figure = [fx, fz]; }
    M.start(); W.radius = half - 10; W.spawn = { x: 0, z: -R + 40, yaw: 0 }; return u;
  };
  // ── a wreck: a kind in a pose, built into the world and left there ─────────────────────────────────────────────
  // LR.mech.wreck(kind, { x, z, yaw°, pose(cmd) → edit the rest command (lay it down, fold its legs), sink, moss: tint the parts toward moss })
  M.wreck = (kind, o = {}) => {
    const K = M.kinds[kind], kin = K.kin, G = M.geometry(kind, 0), rest = kin.pose(kin.restCmd()).W, cmd = kin.restCmd(), L = LR.land, h = (o.yaw || 0) * D2R;
    cmd.body = M.bodyFrame([o.x, L.h(o.x, o.z) + K.spec.ride, o.z], h); for (const l of kin.limbs) { const fw = [Math.cos(h), Math.sin(h)], rt = [-Math.sin(h), Math.cos(h)], x = o.x + fw[0] * l.home[0] + rt[0] * l.home[1], z = o.z + fw[1] * l.home[0] + rt[1] * l.home[1]; cmd.limbs[l.name] = { p: [x, L.h(x, z) + l.ball, z], n: [0, 1, 0], yaw: h, gamma: l.gamma }; }
    if (o.pose) o.pose(cmd, { kin, land: L, bodyFrame: M.bodyFrame, h }); const Wd = kin.pose(cmd).W;
    const src = G.geometry, P = src.attributes.position.array.slice(), N = new Int8Array(src.attributes.normal.array), bone = src.attributes.bone.array, data = new Float32Array(12), n = P.length / 3;
    const mats = kin.bones.map((b, i) => { const d = new Float32Array(12); skin(d, 0, Wd[b[0]], rest[b[0]]); return d; });
    for (let i = 0; i < n; i++) { const m = mats[bone[i]], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], nx = N[i * 4], ny = N[i * 4 + 1], nz = N[i * 4 + 2];
      P[i * 3] = m[0] * x + m[1] * y + m[2] * z + m[3]; P[i * 3 + 1] = m[4] * x + m[5] * y + m[6] * z + m[7]; P[i * 3 + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
      N[i * 4] = Math.round(m[0] * nx + m[1] * ny + m[2] * nz); N[i * 4 + 1] = Math.round(m[4] * nx + m[5] * ny + m[6] * nz); N[i * 4 + 2] = Math.round(m[8] * nx + m[9] * ny + m[10] * nz); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 4, true)); g.setAttribute('uv', src.attributes.uv); g.setAttribute('color', src.attributes.color.clone()); const meta = src.attributes.meta.clone(); g.setAttribute('meta', meta); g.setIndex(src.index);
    // its lights are out and its ceramic is green: lamp faces become dull glass, every tint is pulled toward lichen
    { const ma = meta.array, ca = g.attributes.color.array, k = o.moss === undefined ? 0.45 : o.moss; for (let i = 0; i < n; i++) { if (ma[i * 4 + 1] & LR.FLAG.LAMP) { ma[i * 4 + 1] = 0; ca[i * 4] = ca[i * 4 + 1] = ca[i * 4 + 2] = 26; } else { ca[i * 4] = Math.round(ca[i * 4] * (1 - k * 0.5)); ca[i * 4 + 1] = Math.round(ca[i * 4 + 1] * (1 - k * 0.22)); ca[i * 4 + 2] = Math.round(ca[i * 4 + 2] * (1 - k * 0.6)); ca[i * 4 + 3] = Math.round(ca[i * 4 + 3] * (1 - k * 0.45)); } } }
    g.computeBoundingSphere(); g.computeBoundingBox(); const W = LR.world, mat = LR.render.matWorld({ double: true }), m = new T.Mesh(g, mat); m.matrixAutoUpdate = false; m.name = 'wreck'; W.scene.add(m);
    const s = new T.Mesh(g, LR.render.matShadow({})); s.matrixAutoUpdate = false; W.shadowScene.add(s); const t = new T.Mesh(g, LR.render.matTopo()); t.matrixAutoUpdate = false; W.topoScene.add(t); W.stats.tris += G.tris; W.stats.meshes++;
    // what of it stands in the walker's way: every joint near the ground
    for (const l of kin.limbs) { const sol = kin.pose(cmd).sols[l.name]; for (const J of sol.J) if (J[1] - L.h(J[0], J[2]) < 2.2) W.solidCircle(J[0], J[2], l.width * 0.9 + 0.3); }
    return { W: Wd, cmd, mesh: m };
  };
}
