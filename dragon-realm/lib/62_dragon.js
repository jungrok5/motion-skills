// dragon-realm · 62_dragon — the parts of an eastern dragon, sculpted from numbers, for a DR.creature body.
//   DR.dragon(creature, spec) builds and mounts: a skull and a hinged jaw (signed-distance sculpt → surface nets),
//   teeth, tongue, eyes with lids, antlers, whiskers, a mane, a beard, dorsal fins, a tail plume and four clawed legs.
// Everything is parametric (spec.head, spec.antlers, spec.mane, …) so another film can make a hornless serpent, a
// long-snouted sea wyrm or a feathered one from the same file; nothing here is a stored model.
// Units of the sculpt: 1 = the neck radius.  +z = forward (out of the snout), +y = up, x = the creature's left/right.
{
  const SD = DR.sd, u = (v) => ({ value: v }), { lerp, sat, smooth } = DR;
  const mirrorGeo = (g) => { const m = g.clone(); m.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)); const ix = m.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } return m; };

  DR.dragon = (C, spec = {}) => {
    const S = { headScale: 1.25, antlers: true, legs: true, ...spec }, H = { snout: 1, jawLen: 1, brow: 1, nose: 1, cheek: 1, ...S.head };
    const R0 = C.spec.radius * C.spec.profile[0][1], HS = R0 * S.headScale;   // metres per sculpt unit
    const out = { parts: {} }, rng = DR.rng(S.seed || 7);
    const sn = 3.3 * H.snout;   // z of the snout's end

    // ── skull ──
    const skullF = SD.mirrorX(SD.union([
      SD.ellipsoid([0, 0.12, 0.55], [0.98, 0.84, 1.15]),                                 // cranium
      SD.ellipsoid([0, 0.02, 1.2 + sn * 0.33], [0.64, 0.46, sn * 0.5]),                   // snout
      SD.ellipsoid([0, -0.16, 1.0 + sn * 0.3], [0.72, 0.30, sn * 0.5]),                   // upper lip shelf
      SD.ellipsoid([0, 0.10, sn + 0.42], [0.54 * H.nose, 0.40 * H.nose, 0.46]),            // nose bulb
      SD.sphere([0.30 * H.nose, 0.32, sn + 0.5], 0.23 * H.nose),                           // nostril mounds
      SD.chain([[0.30, 0.60, 2.0, 0.17], [0.62, 0.86 * H.brow, 1.52, 0.25], [0.92, 0.92 * H.brow, 0.95, 0.27], [1.05, 0.74, 0.35, 0.2]], 0.1),   // brow ridge
      SD.ellipsoid([0.86 * H.cheek, -0.12, 0.92], [0.40, 0.48, 0.78]),                     // cheek
      SD.chain([[0, 0.86, -0.1, 0.2], [0, 0.72, 1.2, 0.17], [0, 0.42, 2.4, 0.13], [0, 0.34, sn, 0.1]], 0.12),   // crest down the midline
      SD.chain([[0.5, 0.2, sn * 0.72, 0.16], [0.56, 0.12, sn * 0.95, 0.2]], 0.1),          // whisker pads
      SD.sphere([0.98, 0.3, 0.0], 0.42),                                                    // jaw hinge boss
    ], 0.16));
    const skullCut = SD.mirrorX(SD.union([
      SD.sphere([0.80, 0.46, 1.36], 0.30),                                                  // eye socket
      SD.ellipsoid([0.40 * H.nose, 0.36, sn + 0.74], [0.085, 0.07, 0.16], [0.2, 0.5, 0]),   // nostril
      SD.ellipsoid([0, -0.50, 1.9], [0.50, 0.26, 1.9]),                                     // the roof of the mouth
    ], 0.04));
    const skullSDF = SD.cut(skullF, skullCut, 0.07);
    const paintHead = (x, y, z, nx, ny, nz) => { const cav = sat(0.72 + ny * 0.22 + 0.1 * Math.sin(z * 9) * 0.3); return [cav, cav, cav]; };
    const maskHead = (jaw) => (x, y, z) => { const inMouth = jaw ? sat((y + 0.52) * 9) * sat((0.42 - Math.abs(x)) * 6) * sat((z - 0.5) * 3) : sat((-0.36 - y) * 9) * sat((0.5 - Math.abs(x)) * 6) * sat((z - 0.4) * 3);
      const skin = jaw ? 1 : 1 - Math.max(smooth(sn - 0.1, sn + 0.35, z), 0); return [skin * (1 - inMouth), inMouth]; };
    const cell = S.cell || 0.055;
    const skullG = DR.meshSDF(skullSDF, [-1.5, -0.9, -0.75], [1.5, 1.35, sn + 1.05], cell, { paint: paintHead, attr: maskHead(false) });
    // ── jaw (its own mesh, hinged at the back) ──
    const jl = 3.25 * H.jawLen * H.snout;
    const jawF = SD.mirrorX(SD.union([
      SD.chain([[0.86, -0.20, 0.25, 0.26], [0.72, -0.58, 1.1, 0.24], [0.5, -0.66, 2.2, 0.21], [0.2, -0.64, jl, 0.2]], 0.12),
      SD.ellipsoid([0, -0.74, 1.7], [0.6, 0.2, 1.5]),
      SD.ellipsoid([0, -0.66, jl + 0.05], [0.36, 0.22, 0.34]),                               // chin
      SD.sphere([0, -0.92, jl - 0.5], 0.2),                                                  // beard boss
    ], 0.14));
    const jawSDF = SD.cut(jawF, SD.ellipsoid([0, -0.42, 1.75], [0.42, 0.2, 1.5]), 0.08);
    const jawG = DR.meshSDF(jawSDF, [-1.2, -1.25, -0.2], [1.2, 0.2, jl + 0.6], cell, { paint: paintHead, attr: maskHead(true) });
    const headMat = C.partMat(0, HS, 34), head = new THREE.Group(), jaw = new THREE.Group();
    head.scale.setScalar(HS);
    const skull = DR.shadowed(new THREE.Mesh(skullG, headMat)), jawM = DR.shadowed(new THREE.Mesh(jawG, headMat));
    const hinge = [0, -0.08, 0.2]; jaw.position.set(...hinge); jawM.position.set(-hinge[0], -hinge[1], -hinge[2]); jaw.add(jawM); head.add(skull, jaw);

    // ── teeth, tongue ──
    const ivory = DR.mat({ color: S.teeth || '#e9e2c8', roughness: 0.35, fBody: 'diffuseColor.rgb *= 0.55 + 0.45 * smoothstep(0.0, 0.5, vUv0.y); drAO = 0.6 + 0.4 * vUv0.y;' });
    const tooth = (x, y, z, len, r, lean, dir) => DR.tube([[x, y, z, r], [x + lean * 0.3, y + dir * len * 0.55, z - len * 0.12, r * 0.72], [x + lean * 0.45, y + dir * len, z - len * 0.3, 0.012]], { sides: 6, steps: 5 });
    const up = [], lo = [];
    for (let i = 0; i < 11; i++) { const f = i / 10, z = lerp(sn + 0.15, 0.95, f), x = lerp(0.2, 0.62, Math.pow(f, 0.55)), fang = i === 1 ? 2.3 : i === 4 ? 1.5 : 1, len = (0.2 + 0.1 * Math.sin(i * 2.3)) * fang;
      for (const s of [-1, 1]) { up.push(tooth(s * x, -0.36, z, len, 0.055 * (0.8 + fang * 0.25), s * 0.1, -1)); if (i < 9) lo.push(tooth(s * x * 0.9, -0.44, z - 0.14, len * 0.75, 0.05 * (0.8 + fang * 0.2), s * 0.08, 1)); } }
    for (const s of [-0.09, 0.09]) { up.push(tooth(s, -0.34, sn + 0.42, 0.16, 0.05, 0, -1)); lo.push(tooth(s * 0.9, -0.46, jl + 0.18, 0.14, 0.045, 0, 1)); }
    skull.add(new THREE.Mesh(DR.merge(up), ivory)); const loM = new THREE.Mesh(DR.merge(lo), ivory); loM.position.copy(jawM.position); jaw.add(loM);
    const tongueMat = DR.mat({ color: '#b0303a', roughness: 0.3, vHead: 'uniform float uJaw;', uniforms: { uJaw: (out.jawU = u(0)) },
      vBody: 'float tv = uv.y; drPos.y += sin(tv * 2.6 + uTime * 5.0) * 0.07 * tv * tv * (0.4 + uJaw) + tv * tv * 0.22 * uJaw; drPos.x += sin(uTime * 3.1 + tv * 3.0) * 0.05 * tv * tv; drPos.x *= 1.0; drPos.y = (drPos.y + 0.52) * 0.42 - 0.52;' });
    const tongue = new THREE.Mesh(DR.tube([[0, -0.52, 0.6, 0.3], [0, -0.5, 1.6, 0.3], [0, -0.52, 2.6, 0.24], [0, -0.5, jl + 0.1, 0.06]], { sides: 8, steps: 14 }), tongueMat); tongue.position.copy(jawM.position); jaw.add(tongue);

    // ── eyes: a painted iris seen through a clear dome, a slit pupil, a lid that closes ──
    const eyeU = (out.eyeU = { uLid: u(0), uEyeGlow: u(1), uIris: u(new THREE.Vector3(...DR.rgb(S.iris || '#ffb400'))), uIris2: u(new THREE.Vector3(...DR.rgb(S.iris2 || '#c43a00'))) });
    const eyeMat = DR.mat({ color: '#ffffff', roughness: 0.06, metalness: 0, uniforms: eyeU, vHead: 'varying vec3 vEye;', vBody: 'vEye = position;',
      fHead: 'uniform float uLid, uEyeGlow; uniform vec3 uIris, uIris2; varying vec3 vEye;',
      fBody: /* glsl */`
        vec3 e = normalize(vEye); float r = length(e.xy) / max(e.z + 0.35, 0.05) * 1.25;                 // looking down +z of the eye
        float a = atan(e.y, e.x);
        float fib = 0.6 + 0.4 * sin(a * 34.0 + sin(a * 9.0) * 2.0) * (0.5 + 0.5 * drN4(vec2(a * 0.6, r * 2.0)).r);
        vec3 iris = mix(uIris, uIris2, smoothstep(0.25, 0.92, r) + 0.25 * (1.0 - fib)) * fib;
        float pup = smoothstep(0.075, 0.045, abs(e.x) / max(e.z + 0.35, 0.05) * (1.0 + 2.4 * r * r)) * smoothstep(0.86, 0.7, r);
        float white = smoothstep(0.90, 1.02, r);
        vec3 col = mix(iris, vec3(0.012), pup); col = mix(col, vec3(0.03, 0.02, 0.02), smoothstep(0.84, 0.92, r) * (1.0 - white)); col = mix(col, vec3(0.42, 0.32, 0.22), white);
        float lid = smoothstep(uLid * 2.3 - 1.2, uLid * 2.3 - 1.05, -e.y);                                  // the lid comes down from above
        diffuseColor.rgb = mix(col, vec3(0.03, 0.035, 0.03), 1.0 - lid);
        drEmit += iris * (1.0 - pup) * (1.0 - white) * lid * uEyeGlow * 1.3; roughnessFactor = mix(0.06, 0.6, 1.0 - lid); drAO = 0.75;` });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 20), eyeMat); e.position.set(s * 0.76, 0.46, 1.36); e.lookAt(s * 0.76 + s * 0.85, 0.46 + 0.12, 1.36 + 0.5); e.updateMatrix(); skull.add(e); }

    // ── antlers: branching tubes that grow (group scale) ──
    const horn = DR.mat({ color: S.hornColor || '#d9b56a', roughness: 0.4, metalness: 0.2, fBody: 'float ring = 0.82 + 0.18 * sin(vUv0.y * 46.0 + sin(vUv0.x * 6.28) * 1.2); diffuseColor.rgb *= ring * mix(0.55, 1.15, smoothstep(0.0, 1.0, vUv0.y * 0.22)); drAO = 0.7;' });
    const antler = new THREE.Group(); out.antlers = antler;
    if (S.antlers) { const A = { len: 3.4, tines: 3, spread: 0.55, ...S.antlers }, parts = [];
      for (const s of [-1, 1]) { const b0 = [s * 0.5, 0.86, 0.35], beam = [[...b0, 0.2]]; let p = b0.slice(), d = [s * A.spread * 0.6, 0.85, -0.35];
        for (let i = 1; i <= 5; i++) { const f = i / 5; d = DR.vec.norm([d[0] + s * 0.06, d[1] - 0.06, d[2] - 0.2]); p = DR.vec.mad(p, d, A.len / 5); beam.push([p[0], p[1], p[2], lerp(0.19, 0.035, f)]); }
        parts.push(DR.tube(beam, { sides: 8, steps: 18 }));
        for (let k = 0; k < A.tines; k++) { const f = 0.22 + (k / A.tines) * 0.62, i0 = Math.floor(f * 5), a = beam[i0], b = beam[i0 + 1], w = f * 5 - i0, q = [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)], l = A.len * (0.42 - k * 0.07);
          const td = DR.vec.norm([s * (0.25 + 0.2 * k), 0.7, 0.6 - 0.25 * k]); parts.push(DR.tube([[...q, lerp(a[3], b[3], w) * 0.8], [...DR.vec.mad(q, td, l * 0.5), 0.06], [...DR.vec.mad(DR.vec.mad(q, td, l), [0, 1, 0], l * 0.18), 0.015]], { sides: 6, steps: 8 })); } }
      const am = DR.shadowed(new THREE.Mesh(DR.merge(parts), horn), true, false); antler.add(am); skull.add(antler); }

    // ── whiskers: long tapered tubes that trail and curl ──
    const whU = { uSpeedW: C.speedU };
    const whMat = DR.mat({ color: S.whiskerColor || '#d8b26a', roughness: 0.45, uniforms: whU, vHead: 'uniform float uSpeedW;',
      vBody: /* glsl */`float s = uv.y, sw = smoothstep(4.0, 40.0, uSpeedW); float sd = sign(position.x);
        vec3 rest = position; vec3 back = vec3(position.x * (1.0 - 0.45 * s), position.y + 0.25 * s, mix(position.z, position.z - s * s * 5.5, 1.0));
        drPos = mix(rest, back, sw * s);
        drPos.y += sin(uTime * 2.1 - s * 5.0 + sd) * 0.30 * s * s + sin(uTime * 0.9 + sd * 2.0) * 0.35 * s;
        drPos.x += sd * (sin(uTime * 1.7 - s * 4.0) * 0.22 * s * s + 0.3 * s * (1.0 - sw));`, depth: true });
    const wh = []; for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push([s * (0.55 + 2.6 * Math.sin(f * 1.5)), 0.1 + 0.5 * Math.sin(f * 2.2) - f * 0.5, sn * 0.9 + 1.1 * Math.sin(f * 2.4) - f * f * 1.5, lerp(0.085, 0.012, Math.pow(f, 0.7))]); }
      wh.push(DR.tube(pts, { sides: 6, steps: 34, uvLen: 1e9 })); }
    const whG = DR.merge(wh); { const uv = whG.attributes.uv, pos = whG.attributes.position; let mx = 0; for (let i = 0; i < pos.count; i++) mx = Math.max(mx, Math.abs(pos.getX(i))); for (let i = 0; i < uv.count; i++) uv.setY(i, sat((Math.abs(pos.getX(i)) - 0.55) / (mx - 0.55))); }
    const whM = DR.shadowed(new THREE.Mesh(whG, whMat), true, false); whM.frustumCulled = false; out.whiskers = whM; skull.add(whM);

    // ── mount the head on ring 0 ──
    const lookM = new THREE.Matrix4(), sclM = new THREE.Matrix4().makeScale(HS, HS, HS), rotM = new THREE.Matrix4();
    const holder = new THREE.Group(); holder.add(head); head.matrixAutoUpdate = true;
    C.ride(holder, 0, (obj, t, st) => { const j = sat(st.jaw ?? 0.12); jaw.rotation.x = j * 0.62; out.jawU.value = j; head.rotation.set((st.pitch ?? 0) - j * 0.08, st.yaw ?? 0, st.rollH ?? 0);
      eyeU.uLid.value = st.lid ?? 0; eyeU.uEyeGlow.value = st.eyeGlow ?? 1; const g = st.grow || [1, 1, 1]; antler.scale.setScalar(Math.max(g[0], 1e-3)); antler.visible = g[0] > 0.01; });
    head.position.set(0, 0, HS * 0.25);
    out.head = head; out.HS = HS; out.mouth = [0, -0.45 * HS, (sn * 0.8) * HS];
    // where the mouth is in the world at the last update (for the pearl, breath, roar)
    const tmpV = new THREE.Vector3(); out.point = (lx, ly, lz, o = [0, 0, 0]) => { head.updateMatrix(); tmpV.set(lx, ly, lz).applyMatrix4(head.matrix).applyMatrix4(holder.matrix); o[0] = tmpV.x; o[1] = tmpV.y; o[2] = tmpV.z; return o; };
    out.mouthWorld = (o) => out.point(0, -0.42, sn * 0.8, o); out.sn = sn;

    // ── hair and fins on the spine ──
    const L = C.spec.length, strips = [], P = { mane: 1, fins: 1, beard: 1, plume: 1, ...S.hair };
    if (P.fins) for (let a = 5; a < L - 6; a += 1.05) { const k = Math.sin((a / L) * Math.PI); strips.push({ a, ang: 0, len: (1.1 + 1.3 * k) * (0.6 + 0.75 * rng()) * P.fins, width: 1.5, lift: 0.86, seed: a, fin: 1, grow: 2 }); }
    if (P.mane) for (let i = 0; i < 300; i++) { const a = rng.range(0.4, 18) * (rng() < 0.6 ? 0.5 : 1), side = rng.range(-1.7, 1.7); strips.push({ a, ang: side, len: rng.range(3.0, 9.0) * P.mane * (1 - a / 34), width: rng.range(0.14, 0.34), lift: rng.range(0.3, 0.85), seed: i * 3.1, fin: 0, grow: 2 }); }
    if (P.plume) for (let i = 0; i < 46; i++) strips.push({ a: L - rng.range(0.5, 9), ang: rng.range(-3.1, 3.1), len: rng.range(4, 9) * P.plume, width: rng.range(0.3, 0.6), lift: 0.3, seed: 400 + i, fin: 0, grow: 2 });
    for (const la of S.legs ? [0.17, 0.52] : []) for (let i = 0; i < 22; i++) strips.push({ a: L * la + rng.range(-1.2, 2.8), ang: rng.sign() * rng.range(1.5, 2.0), len: rng.range(1.2, 2.6), width: rng.range(0.12, 0.24), lift: 0.35, seed: 600 + i + la * 100, fin: 0, grow: 3 });
    const hp = { root: '#1a1c16', tip: '#4c4a36', rootB: '#b8862d', tipB: '#ffe9a8', ...S.hairColors };
    out.strips = C.strips(strips, hp, 8);
    // beard and jaw tufts ride the jaw: plain bent ribbons in head space
    if (P.beard) { const bs = []; for (let i = 0; i < 34; i++) { const z = rng.range(0.8, jl), x = rng.range(-0.5, 0.5) * (1 - z / (jl * 1.4)), l = rng.range(1.2, 2.6) * P.beard; const pts = [[x, -0.9, z, 0.06], [x * 1.2, -0.9 - l * 0.5, z - l * 0.25, 0.05], [x * 1.3, -0.9 - l, z - l * 0.9, 0.008]]; bs.push(DR.tube(pts, { sides: 4, steps: 6 })); }
      const bm = new THREE.Mesh(DR.merge(bs), DR.mat({ base: 'lambert', color: hp.rootB, uniforms: { uG: C.growU }, vHead: 'uniform vec4 uG;', vBody: 'float bv = clamp((-position.y - 0.9) / 2.2, 0.0, 1.0); drPos.z -= bv * bv * 1.2; drPos.x += sin(uTime * 2.3 + position.z * 3.0) * 0.12 * bv; drPos = mix(vec3(position.x, -0.9, position.z), drPos, uG.y);' })); bm.position.copy(jawM.position); jaw.add(bm); out.beard = bm; }

    // ── legs: one sculpt (thigh, shin, paw, four hooked claws), mirrored, mounted on rings ──
    if (S.legs) {
      const legF = SD.union([
        SD.chain([[0, 0.2, 0, 0.9], [0.15, -0.8, -0.3, 0.72], [0.3, -1.7, -0.9, 0.44]], 0.25),               // thigh, back to the knee
        SD.chain([[0.3, -1.7, -0.9, 0.42], [0.38, -2.5, -0.35, 0.36], [0.42, -3.2, 0.1, 0.27]], 0.16),        // shin, forward to the ankle
        SD.ellipsoid([0.42, -3.35, 0.4], [0.42, 0.24, 0.55]),                                                   // paw
        ...[-0.42, -0.14, 0.14, 0.42].map((k, i) => SD.chain([[0.42 + k * 0.7, -3.36, 0.7, 0.14], [0.42 + k * 1.3, -3.42, 1.15 - Math.abs(k) * 0.3, 0.12], [0.42 + k * 1.5, -3.62, 1.42 - Math.abs(k) * 0.3, 0.085]], 0.06)),
      ], 0.12);
      const legG = DR.meshSDF(legF, [-1.0, -4.1, -1.6], [1.5, 0.9, 2.0], S.cell ? S.cell * 1.3 : 0.07, { paint: paintHead, attr: () => [1, 0] });
      const claws = []; for (const k of [-0.42, -0.14, 0.14, 0.42]) { const bx = 0.42 + k * 1.5, bz = 1.42 - Math.abs(k) * 0.3; claws.push(DR.tube([[bx, -3.62, bz, 0.085], [bx + k * 0.1, -3.82, bz + 0.3, 0.06], [bx + k * 0.12, -4.12, bz + 0.34, 0.01]], { sides: 6, steps: 6 })); }
      const clawG = DR.merge(claws), legMat = C.partMat(30, HS * 0.8, 22, 0), LS = C.spec.radius * 0.62;
      out.legs = [];
      for (const [la, fore] of [[0.17, 1], [0.52, 0]]) for (const s of [-1, 1]) {
        const g = new THREE.Group(), inner = new THREE.Group(), lm = DR.shadowed(new THREE.Mesh(s > 0 ? legG : mirrorGeo(legG), legMat)), cm = new THREE.Mesh(s > 0 ? clawG : mirrorGeo(clawG), ivory);
        inner.add(lm, cm); inner.scale.setScalar(LS * (fore ? 1 : 1.12)); g.add(inner); out.legs.push(g);
        C.ride(g, L * la, (obj, t, st, sp) => { const r = sp.rad[Math.round((la * C.rings))], gr = (st.grow || [1, 1, 1])[2]; inner.visible = gr > 0.02;
          inner.position.set(s * r * 0.72, -r * 0.42, 0); const sw = smooth(10, 40, sp.vel), pad = Math.sin(t * 1.5 + la * 9 + s) * 0.25 * (1 - sw);
          inner.rotation.set(-0.25 - 1.0 * sw + pad + (st.reach ?? 0) * (fore ? 0.9 : 0.2), 0, s * (0.5 + 0.25 * sw)); inner.scale.setScalar(LS * (fore ? 1 : 1.12) * Math.max(gr, 1e-3)); });
      }
    }
    return out;
  };
}
