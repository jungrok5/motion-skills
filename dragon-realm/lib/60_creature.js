// dragon-realm · 60_creature — a long-bodied creature that follows a rail.
//   const c = DR.creature({ length, radius, rail: { points, keys }, wave, palette, … });  scene.add(c.group)
// The head leads along one curve through the whole film; every ring of the body sits where the head was `a` metres
// ago (follow-the-leader), plus a swimming wave.  The pose is a pure function of t: a small float texture of ring
// centres and frames is rewritten each frame and the tube, fins, hair and limbs all read it in the vertex shader.
// Scales are an analytic lattice in the fragment shader (no texture); two palettes (before / after) with a front that
// travels down the body let the creature transform.
{
  const { lerp, sat, smooth, clamp } = DR, V = DR.vec, u = (v) => ({ value: v });

  // GLSL: the scale lattice.  p = (around in scale counts, along in rows).  Returns height 0..1 in x, the slope in yz
  // (around, along), w = id hash.  rim → out.
  const SCALE_GLSL = /* glsl */`
    vec4 drScale(vec2 p, out float rim, out float crev){
      float bestH = -1.0; vec4 res = vec4(0.0); rim = 0.0; crev = 1.0;
      float row0 = floor(p.y);
      for (int k = 1; k >= 0; k--) {                 // the row toward the head lies on top: test it last so it wins
        float row = row0 - float(k);
        float x = p.x + 0.5 * mod(row, 2.0); float ci = floor(x);
        vec2 f = vec2(x - ci - 0.5, p.y - row);       // f.y: 0 at this scale's root … up to 2 where its tip overlaps the next row
        float d = length(vec2(f.x * 1.72, (f.y - 0.62) * 0.92));
        if (d < 1.0 && f.y > 0.0) {
          float h = smoothstep(0.0, 1.5, f.y) * (0.55 + 0.45 * (1.0 - d * d)) + 0.14 * exp(-f.x * f.x * 60.0);
          if (h + float(1 - k) * 0.35 > bestH) { bestH = h + float(1 - k) * 0.35;
            float e = smoothstep(0.76, 0.92, d);
            res = vec4(h, f.x * 3.0 * e + sign(f.x) * 0.25 * exp(-abs(f.x) * 18.0) - f.x * 40.0 * 0.14 * exp(-f.x * f.x * 60.0) * 0.2, (f.y - 0.62) * 1.3 * e - 0.34, fract(sin(dot(vec2(ci, row), vec2(127.1, 311.7))) * 43758.5453));
            rim = e * (1.0 - smoothstep(0.93, 1.0, d)) * smoothstep(0.35, 0.9, f.y); crev = smoothstep(0.88, 1.0, d); }
        }
      }
      return res;
    }`;
  DR.SCALE_GLSL = SCALE_GLSL;

  // the skin material, shared by the tube ('BODY') and by sculpted parts ('PART': lattice coords from attributes)
  // pal: { a: {...}, b: {...} } each { back, side, belly, rim, glow }
  const skinMat = (C, mode) => {
    const pal = C.spec.palette, col = (k) => u(new THREE.Vector3(...DR.rgb(k)));
    const U = C.skinU || (C.skinU = { uSpine: u(null), uRings: u(C.rings), uLen: u(C.spec.length), uMorph: u(-1e3), uMorphHead: u(0), uWetB: u(0), uGlowB: u(0), uScaleN: u(C.spec.scale?.around ?? 42), uScaleRow: u(C.spec.scale?.row ?? 0.52),
      uA0: col(pal.a.back), uA1: col(pal.a.side), uA2: col(pal.a.belly), uA3: col(pal.a.rim), uB0: col(pal.b.back), uB1: col(pal.b.side), uB2: col(pal.b.belly), uB3: col(pal.b.rim), uEdge: col(pal.edge || '#ffd27a'), uSheen: col(pal.sheen || '#7fd0ff') });
    return DR.mat({ color: '#ffffff', roughness: 0.42, metalness: 0.15, depth: true, uniforms: U, defines: mode === 'BODY' ? { SK_BODY: 1 } : { SK_PART: 1 }, vertexColors: mode !== 'BODY', side: mode === 'BODY' ? THREE.FrontSide : THREE.DoubleSide,
      vHead: /* glsl */`
        uniform sampler2D uSpine; uniform float uRings, uLen;
        varying vec4 vSk; varying vec3 vAlong;
        #ifdef SK_BODY
          attribute vec2 aRing;
          void drRing(float fi, out vec4 c, out vec3 n, out vec3 b){ float i0 = floor(fi), f = fi - i0; int i = int(i0), j = int(min(i0 + 1.0, uRings));
            vec4 c0 = texelFetch(uSpine, ivec2(i, 0), 0), c1 = texelFetch(uSpine, ivec2(j, 0), 0); c = mix(c0, c1, f);
            n = normalize(mix(texelFetch(uSpine, ivec2(i, 1), 0).xyz, texelFetch(uSpine, ivec2(j, 1), 0).xyz, f)); b = normalize(mix(texelFetch(uSpine, ivec2(i, 2), 0).xyz, texelFetch(uSpine, ivec2(j, 2), 0).xyz, f)); }
        #else
          attribute vec4 aMask; uniform vec4 uPart;    // along0 (m from the head tip), metres per unit, lattice count round, mirror
        #endif`,
      vBody: /* glsl */`
        #ifdef SK_BODY
          vec4 c; vec3 rn, rb; drRing(aRing.x, c, rn, rb); float ca = cos(aRing.y), sa = sin(aRing.y);
          float fy = ca > 0.0 ? 1.0 + 0.10 * pow(ca, 6.0) : 0.86, fx = 1.0;
          drPos = c.xyz + (rn * ca * fy + rb * sa * fx) * c.w; drNrm = normalize(rn * ca / fy + rb * sa / fx);
          float am = aRing.x / uRings * uLen; vSk = vec4(am, aRing.y, c.w, 0.0); vAlong = normalize(cross(rb, rn));   // toward the tail
        #else
          vSk = vec4(uPart.x - position.z * uPart.y, atan(position.x, position.y), aMask.x, aMask.y); vAlong = normalize((modelMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
        #endif`,
      fHead: /* glsl */`
        uniform float uMorph, uMorphHead, uWetB, uGlowB, uScaleN, uScaleRow, uLen; uniform vec3 uA0, uA1, uA2, uA3, uB0, uB1, uB2, uB3, uEdge, uSheen;
        varying vec4 vSk; varying vec3 vAlong;
        #ifdef SK_PART
          uniform vec4 uPart;
        #endif
        ${SCALE_GLSL}`,
      fBody: /* glsl */`
        float along = vSk.x, ang = vSk.y, dist = length(vWPos - cameraPosition);
        #ifdef SK_BODY
          float nA = uScaleN, rowL = uScaleRow * (0.55 + 0.45 * smoothstep(0.0, 2.2, vSk.z)), skinK = 1.0, flesh = 0.0, bellyOn = 1.0;
          vec3 A = normalize(vAlong - N * dot(vAlong, N)), Cc = cross(N, A);
          float morph = smoothstep(uMorph - 2.5, uMorph + 2.5, along) ; morph = 1.0 - morph;        // 1 = already transformed
          float front = exp(-pow((along - uMorph) / 3.2, 2.0));
        #else
          float nA = uPart.z, rowL = uScaleRow * 0.55, skinK = vSk.z, flesh = vSk.w, bellyOn = uPart.w;
          vec3 A = normalize(vAlong - N * dot(vAlong, N) + 1e-4), Cc = cross(N, A);
          float morph = uMorphHead, front = 0.0;
        #endif
        float belly = smoothstep(-0.40, -0.72, cos(ang)) * bellyOn;
        vec2 sp = vec2(ang / 6.28318 * nA, along / rowL);
        float px = rowL / max(dist * uPx, 1e-5);                               // pixels per scale row
        float kPat = smoothstep(2.2, 6.0, px) * skinK, kRel = smoothstep(3.0, 8.0, px) * skinK;
        float rim, crev; vec4 sc = drScale(sp, rim, crev);
        // belly: wide plates across
        float pl = fract(along / (rowL * 2.1)); float plateH = smoothstep(0.0, 0.85, pl); float plateEdge = smoothstep(0.88, 1.0, pl) + smoothstep(0.06, 0.0, pl);
        vec3 back = mix(uA0, uB0, morph), side = mix(uA1, uB1, morph), bel = mix(uA2, uB2, morph), rimC = mix(uA3, uB3, morph);
        float topK = smoothstep(-0.1, 0.9, cos(ang));
        vec3 base = mix(side, back, topK);
        base = mix(base, mix(back, side, 1.0 - topK * 0.5), (sc.w - 0.5) * 0.9 * kPat);          // every scale its own place between the two colours
        vec3 col = base * mix(1.0, 0.62 + 0.7 * sc.w, kPat);
        col *= mix(1.0, 0.40 + 0.60 * smoothstep(0.0, 0.6, sc.x), kPat);         // shade under the overlap
        col = mix(col, rimC, rim * 0.55 * kPat);
        col *= 1.0 - 0.75 * crev * kPat;
        vec3 bcol = bel * (0.8 + 0.3 * plateH) * (1.0 - 0.45 * plateEdge * kRel);
        col = mix(col, bcol, belly);
        vec3 nb = N;
        nb += (Cc * sc.y * 1.5 + A * sc.z * 1.5) * kRel * (1.0 - belly);
        nb += A * (0.5 - pl) * 0.5 * belly * kRel;
        N = normalize(nb);
        roughnessFactor = mix(0.48, mix(0.36, 0.20, sc.w), kPat) - 0.08 * rim * kPat; metalnessFactor = 0.10 + 0.75 * rim * kPat * morph + 0.18 * morph;
        roughnessFactor = mix(roughnessFactor, 0.5, belly * 0.6);
        // a pearly sheen at grazing angles once transformed; a dull oily one before
        vec3 Vw = normalize(cameraPosition - vWPos); float fr = pow(1.0 - max(dot(N, Vw), 0.0), 3.0);
        col += uSheen * fr * (0.10 + 0.5 * morph) * (0.6 + 0.8 * sc.w) * (1.0 - belly * 0.5);
        // flesh (mouth) and bare skin (nose, lips) on sculpted parts
        #ifdef SK_PART
          col = mix(col, mix(vec3(0.32, 0.035, 0.04), vec3(0.55, 0.10, 0.09), 0.5 + 0.5 * sin(vWPos.y * 9.0)), flesh);
          roughnessFactor = mix(roughnessFactor, 0.25, flesh); metalnessFactor *= 1.0 - flesh;
          col *= diffuseColor.rgb;                                             // vertex paint: cavity shading
        #endif
        // wet
        col *= 1.0 - 0.38 * uWetB; roughnessFactor = mix(roughnessFactor, 0.12, uWetB * 0.8);
        diffuseColor.rgb = col;
        // the transformation front: light between the scales
        drEmit += uEdge * (front * (2.5 + 5.0 * (1.0 - smoothstep(0.0, 0.6, sc.x))) + uGlowB * 0.6 * (1.0 - smoothstep(0.0, 0.35, sc.x)) * kPat * morph) * (1.0 - belly * 0.5);
        drAO = mix(1.0, (0.5 + 0.5 * smoothstep(0.0, 0.5, sc.x)) * (1.0 - 0.5 * crev), kPat);
      ` });
  };

  // ── ribbons and fins: instanced strips rooted on the spine, bent by the flow in the vertex shader ──
  // items: [{ a (metres behind the head), ang (round the body, 0 = back), len, width, lift (0 flat along the body … 1 standing), seed, fin (0 hair, 1 blade) }]
  const stripMesh = (C, items, pal, segs = 7) => {
    const P = [], I = [], UVs = []; for (let i = 0; i <= segs; i++) { const v = i / segs; P.push(-0.5, v, 0, 0.5, v, 0); UVs.push(0, v, 1, v); if (i < segs) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2)); g.setIndex(I);
    const n = items.length, A = new Float32Array(n * 4), B = new Float32Array(n * 4);
    items.forEach((it, i) => { A.set([it.a, it.ang, it.len, it.width], i * 4); B.set([it.lift ?? 0.5, it.seed ?? i, it.fin ?? 0, it.grow ?? 0], i * 4); });
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4)); g.instanceCount = n;
    const U = { ...C.skinU, uRoot: u(new THREE.Vector3(...DR.rgb(pal.root))), uTip: u(new THREE.Vector3(...DR.rgb(pal.tip))), uRootB: u(new THREE.Vector3(...DR.rgb(pal.rootB || pal.root))), uTipB: u(new THREE.Vector3(...DR.rgb(pal.tipB || pal.tip))), uGrow: C.growU, uSpeed: C.speedU };
    const mat = DR.mat({ base: 'lambert', color: '#ffffff', side: THREE.DoubleSide, depth: true, uniforms: U,
      vHead: /* glsl */`uniform sampler2D uSpine; uniform float uRings, uLen, uSpeed; uniform vec4 uGrow; attribute vec4 aA, aB; varying vec3 vS; varying float vMorphS;
        uniform float uMorph;
        void drRing(float fi, out vec4 c, out vec3 n, out vec3 b){ fi = clamp(fi, 0.0, uRings - 0.001); float i0 = floor(fi), f = fi - i0; int i = int(i0), j = int(min(i0 + 1.0, uRings));
          c = mix(texelFetch(uSpine, ivec2(i, 0), 0), texelFetch(uSpine, ivec2(j, 0), 0), f); n = normalize(mix(texelFetch(uSpine, ivec2(i, 1), 0).xyz, texelFetch(uSpine, ivec2(j, 1), 0).xyz, f)); b = normalize(mix(texelFetch(uSpine, ivec2(i, 2), 0).xyz, texelFetch(uSpine, ivec2(j, 2), 0).xyz, f)); }`,
      vBody: /* glsl */`
        float v = position.y, grow = aB.w < 0.5 ? 1.0 : (aB.w < 1.5 ? uGrow.x : (aB.w < 2.5 ? uGrow.y : uGrow.z));
        vec4 c; vec3 rn, rb; drRing(aA.x / uLen * uRings, c, rn, rb); vec3 tail = normalize(cross(rb, rn));
        vec3 radial = rn * cos(aA.y) + rb * sin(aA.y), sideV = normalize(cross(radial, tail));
        float len = aA.z * grow, sd = aB.y;
        // the strip leaves the body along a direction between "standing" and "combed back", then the flow takes it
        float lift = aB.x * (1.0 - 0.55 * smoothstep(8.0, 45.0, uSpeed) * (1.0 - aB.z * 0.6));
        vec3 d0 = normalize(mix(tail, radial, lift));
        float wv = sin(uTime * (2.2 + fract(sd * 0.37) * 1.6) - v * 3.2 + sd * 5.1) * (0.10 + 0.22 * (1.0 - aB.z)) * v * v
                 + sin(uTime * 5.7 + sd * 2.3 - v * 6.0) * 0.05 * v * v * (1.0 - aB.z);
        vec3 droop = mix(tail, vec3(0.0, -1.0, 0.0), 0.35 * (1.0 - smoothstep(4.0, 30.0, uSpeed)) * (1.0 - aB.z));
        vec3 dir = normalize(mix(d0, droop, v * (0.75 - 0.4 * aB.z)));
        vec3 p = c.xyz + radial * c.w * 0.96 + (d0 * (v - v * v * 0.5) + dir * v * v * 0.5) * len + sideV * wv * len;
        float w = aA.w * grow * (aB.z > 0.5 ? (1.0 - v) * (0.55 + 0.45 * (1.0 - v)) : sin(min(v * 1.25 + 0.12, 1.0) * 3.14159) * (1.0 - v * 0.55));
        vec3 wdir = aB.z > 0.5 ? tail : sideV;
        drPos = p + wdir * position.x * w * (aB.z > 0.5 ? -1.0 : 1.0) + (aB.z > 0.5 ? tail * v * len * 0.55 : vec3(0.0));
        drNrm = normalize(cross(wdir, dir) + radial * 0.35);
        vS = vec3(position.x, v, fract(sd * 0.713)); vMorphS = 1.0 - smoothstep(uMorph - 2.5, uMorph + 2.5, aA.x);`,
      fHead: 'uniform vec3 uRoot, uTip, uRootB, uTipB; varying vec3 vS; varying float vMorphS;',
      fBody: /* glsl */`
        float strand = 0.82 + 0.18 * sin(vS.x * 46.0 + vS.z * 30.0) * sin(vS.x * 17.0 + 1.3);
        vec3 col = mix(mix(uRoot, uRootB, vMorphS), mix(uTip, uTipB, vMorphS), smoothstep(0.05, 0.9, vS.y)) * strand * (0.8 + 0.4 * vS.z);
        diffuseColor.rgb = col; drThrough = col * 1.6; drAO = 0.55 + 0.45 * vS.y;
        vec3 Vw = normalize(cameraPosition - vWPos); drEmit += col * uKeyCol * drSun * pow(max(dot(reflect(-uKeyDir, N), Vw), 0.0), 18.0) * 0.12;` });
    const m = DR.shadowed(new THREE.Mesh(g, mat), true, false); m.frustumCulled = false; return m;
  };

  DR.creature = (spec) => {
    const S = { length: 120, radius: 2.4, rings: 280, sides: 26, profile: [[0, 0.62], [0.035, 0.68], [0.11, 1], [0.26, 1], [0.6, 0.86], [0.8, 0.54], [0.93, 0.22], [0.985, 0.07], [1, 0.02]],
      wave: { length: 34, amp: 1.05, speed: 5.5 }, ...spec };
    const C = { spec: S, rings: S.rings, group: new THREE.Group(), growU: u(new THREE.Vector4(1, 1, 1, 1)), speedU: u(0) };
    C.group.name = S.name || 'creature';
    // ── the rail and its clock ──
    const rail = (C.rail = DR.path(S.rail.points, { step: 0.5 })), sOf = (C.sOf = DR.mono(S.rail.keys.map((k) => [k[0], rail.sAt(k[1])])));
    // a roll field fixed to the rail: the "up" of the body at every metre, carried along with a limited turn rate so
    // loops and climbs through the vertical roll smoothly instead of flipping
    const RN = Math.ceil((rail.length + 2 * S.length) / 1) + 2, s0 = -S.length, upT = new Float32Array(RN * 3); { let n = [0, 1, 0]; const d = [0, 0, 0];
      for (let i = 0; i < RN; i++) { rail.dir(s0 + i, d); const ref = Math.abs(d[1]) > 0.92 ? [0, 0.2, d[1] > 0 ? -1 : 1] : [0, 1, 0]; let k = V.dot(ref, d); const r2 = V.norm([ref[0] - d[0] * k, ref[1] - d[1] * k, ref[2] - d[2] * k]);
        k = V.dot(n, d); let m = V.norm([n[0] - d[0] * k, n[1] - d[1] * k, n[2] - d[2] * k]); const turn = i === 0 ? 1 : 0.07; m = V.norm(V.lerp(m, r2, turn)); n = m; upT[i * 3] = m[0]; upT[i * 3 + 1] = m[1]; upT[i * 3 + 2] = m[2]; } }
    const upAt = (s, out) => { const f = clamp(s - s0, 0, RN - 1.001), i = Math.floor(f), w = f - i; for (let k = 0; k < 3; k++) out[k] = lerp(upT[i * 3 + k], upT[i * 3 + 3 + k], w); return out; };
    const profAt = (x) => { const P = S.profile; let i = 1; while (i < P.length - 1 && P[i][0] < x) i++; const a = P[i - 1], b = P[i]; return lerp(a[1], b[1], sat((x - a[0]) / (b[0] - a[0]))); };
    const N = S.rings, spineData = new Float32Array((N + 1) * 4 * 3), spineTex = new THREE.DataTexture(spineData, N + 1, 3, THREE.RGBAFormat, THREE.FloatType); spineTex.minFilter = spineTex.magFilter = THREE.NearestFilter; spineTex.needsUpdate = true;
    C.spine = { pos: new Float32Array((N + 1) * 3), nrm: new Float32Array((N + 1) * 3), bin: new Float32Array((N + 1) * 3), rad: new Float32Array(N + 1) };
    const tp = [0, 0, 0], tn = [0, 0, 0], td = [0, 0, 0];
    // pose(t, out): ring centres with the swimming wave; extra offsets from S.impulse(t, a, out) if given
    const pose = (C.pose = (t, sp = C.spine) => {
      const sH = sOf(t), W = S.wave, vel = (sOf(t + 0.03) - sOf(t - 0.03)) / 0.06, st = S.state ? S.state(t) : {};
      const amp = (st.wave ?? 1) * W.amp * lerp(1.15, 0.7, smooth(12, 55, vel)), kk = DR.TAU / W.length;
      for (let i = 0; i <= N; i++) { const a = (i / N) * S.length, s = sH - a; rail.at(s, tp); rail.dir(s, td, 2.0); upAt(s, tn);
        let k = V.dot(tn, td); tn[0] -= td[0] * k; tn[1] -= td[1] * k; tn[2] -= td[2] * k; V.norm(tn, tn); const bx = td[1] * tn[2] - td[2] * tn[1], by = td[2] * tn[0] - td[0] * tn[2], bz = td[0] * tn[1] - td[1] * tn[0];
        const env = smooth(4, 26, a) * (0.8 + 0.7 * smooth(S.length * 0.5, S.length, a)), ph = a * kk - (sH * 0.9 + t * W.speed) * kk;
        const lat = Math.sin(ph) * amp * env, hv = Math.sin(ph * 0.63 + 1.3) * amp * 0.42 * env;
        sp.pos[i * 3] = tp[0] + bx * lat + tn[0] * hv; sp.pos[i * 3 + 1] = tp[1] + by * lat + tn[1] * hv; sp.pos[i * 3 + 2] = tp[2] + bz * lat + tn[2] * hv;
        sp.nrm[i * 3] = tn[0]; sp.nrm[i * 3 + 1] = tn[1]; sp.nrm[i * 3 + 2] = tn[2];
        sp.rad[i] = S.radius * profAt(i / N) * (1 + 0.016 * Math.sin(t * 1.3 + a * 0.05)) * (st.girth ?? 1); }
      // frames from the waved centres
      for (let i = 0; i <= N; i++) { const i0 = Math.max(0, i - 1), i1 = Math.min(N, i + 1); td[0] = sp.pos[i0 * 3] - sp.pos[i1 * 3]; td[1] = sp.pos[i0 * 3 + 1] - sp.pos[i1 * 3 + 1]; td[2] = sp.pos[i0 * 3 + 2] - sp.pos[i1 * 3 + 2]; V.norm(td, td);
        tn[0] = sp.nrm[i * 3]; tn[1] = sp.nrm[i * 3 + 1]; tn[2] = sp.nrm[i * 3 + 2]; const k = V.dot(tn, td); tn[0] -= td[0] * k; tn[1] -= td[1] * k; tn[2] -= td[2] * k; V.norm(tn, tn);
        sp.nrm[i * 3] = tn[0]; sp.nrm[i * 3 + 1] = tn[1]; sp.nrm[i * 3 + 2] = tn[2];
        sp.bin[i * 3] = td[1] * tn[2] - td[2] * tn[1]; sp.bin[i * 3 + 1] = td[2] * tn[0] - td[0] * tn[2]; sp.bin[i * 3 + 2] = td[0] * tn[1] - td[1] * tn[0]; }
      sp.fwd = [sp.pos[0] - sp.pos[3], sp.pos[1] - sp.pos[4], sp.pos[2] - sp.pos[5]]; V.norm(sp.fwd, sp.fwd); sp.vel = vel; sp.sH = sH; return sp; });
    // where the head is at any time (for cameras, sounds, the pearl): cheap, no body
    C.headAt = (t, out = [0, 0, 0]) => rail.at(sOf(t), out);
    C.bodyAt = (t, a, out = [0, 0, 0]) => rail.at(sOf(t) - a, out);
    C.speedAt = (t) => (sOf(t + 0.03) - sOf(t - 0.03)) / 0.06;

    // ── the tube ──
    const R = S.sides, ar = new Float32Array((N + 1) * (R + 1) * 2), ix = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= R; j++) { const o = (i * (R + 1) + j) * 2; ar[o] = i; ar[o + 1] = (j / R) * DR.TAU - Math.PI; }
    for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * (R + 1) * 3), 3)); tg.setAttribute('aRing', new THREE.BufferAttribute(ar, 2)); tg.setIndex(ix);
    tg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((N + 1) * (R + 1) * 3).fill(0.577), 3));
    C._partU = u(new THREE.Vector4(0, 1, 30, 1));
    const body = (C.body = DR.shadowed(new THREE.Mesh(tg, skinMat(C, 'BODY')))); body.frustumCulled = false; C.skinU.uSpine.value = spineTex; C.group.add(body);
    C.partMat = (along0, mPerUnit, around = 30, belly = 1) => { const m = skinMat(C, 'PART'); const U4 = u(new THREE.Vector4(along0, mPerUnit, around, belly)); const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { prev(sh, r); sh.uniforms.uPart = U4; }; if (m.userData.depth) { const pd = m.userData.depth.onBeforeCompile; m.userData.depth.onBeforeCompile = (sh, r) => { pd(sh, r); sh.uniforms.uPart = U4; }; } return m; };
    C.strips = (items, pal, segs) => { const m = stripMesh(C, items, pal, segs); C.group.add(m); return m; };
    // things that ride a ring: obj.matrix is set from the ring frame each frame (z = forward, y = up of the body)
    const riders = []; const M = new THREE.Matrix4();
    C.ride = (obj, a, fn) => { obj.matrixAutoUpdate = false; riders.push({ obj, a, fn }); C.group.add(obj); return obj; };
    C.frameAt = (a, m) => { const sp = C.spine, f = clamp((a / S.length) * N, 0, N - 0.001), i = Math.floor(f), w = f - i, g = (arr, k) => lerp(arr[i * 3 + k], arr[i * 3 + 3 + k], w);
      const nx = g(sp.nrm, 0), ny = g(sp.nrm, 1), nz = g(sp.nrm, 2), bx = g(sp.bin, 0), by = g(sp.bin, 1), bz = g(sp.bin, 2), fx = ny * bz - nz * by, fy = nz * bx - nx * bz, fz = nx * by - ny * bx;   // forward = n × b
      m.set(-bx, nx, fx, g(sp.pos, 0), -by, ny, fy, g(sp.pos, 1), -bz, nz, fz, g(sp.pos, 2), 0, 0, 0, 1); return m; };
    C.update = (t) => {
      const sp = pose(t), st = S.state ? S.state(t) : {}; C.state = st;
      for (let i = 0; i <= N; i++) { const o = i * 4, w = (N + 1) * 4; spineData[o] = sp.pos[i * 3]; spineData[o + 1] = sp.pos[i * 3 + 1]; spineData[o + 2] = sp.pos[i * 3 + 2]; spineData[o + 3] = sp.rad[i];
        spineData[w + o] = sp.nrm[i * 3]; spineData[w + o + 1] = sp.nrm[i * 3 + 1]; spineData[w + o + 2] = sp.nrm[i * 3 + 2]; spineData[2 * w + o] = sp.bin[i * 3]; spineData[2 * w + o + 1] = sp.bin[i * 3 + 1]; spineData[2 * w + o + 2] = sp.bin[i * 3 + 2]; }
      spineTex.needsUpdate = true;
      const U = C.skinU; U.uMorph.value = st.morph ?? -1e3; U.uMorphHead.value = st.morphHead ?? ((st.morph ?? -1e3) > 0 ? 1 : 0); U.uWetB.value = st.wet ?? 0; U.uGlowB.value = st.glow ?? 0;
      const g = st.grow || [1, 1, 1]; C.growU.value.set(g[0], g[1], g[2], 1); C.speedU.value = sp.vel;
      for (const r of riders) { C.frameAt(r.a, M); r.obj.matrix.copy(M); if (r.fn) r.fn(r.obj, t, st, sp); r.obj.matrixWorldNeedsUpdate = true; }
      C.group.visible = st.visible ?? true;
    };
    DR.onFrame(C.update, 10);
    // ── the body audit (run by check.mjs): is every pose of the film one a long body can take? ──
    //   bend: the turn between neighbouring rings stays under LIM.bend (no kinks, no folding through itself)
    //   roll: the body's "up" turns under LIM.roll per ring (no flips);  speed ≥ 0 (it never slides tail-first:
    //   the way it moves is the way it faces);  speed changes under LIM.accel (no teleporting between keys)
    const LIM = (C.LIM = { bend: 16, roll: 9, accel: 95, ...S.limits });
    DR.checks.push(() => { const fail = [], warn = [], info = [], sp = { pos: new Float32Array((N + 1) * 3), nrm: new Float32Array((N + 1) * 3), bin: new Float32Array((N + 1) * 3), rad: new Float32Array(N + 1) };
      let mbA = 0, mbP = [0, 0, 0], mb = 0, mbT = 0, mr = 0, mrT = 0, back = null, ma = 0, maT = 0, vmax = 0; const d0 = [0, 0, 0], d1 = [0, 0, 0], D = DR.DURATION, t0 = S.auditFrom ?? 0;
      for (let t = t0; t < D; t += 0.25) { pose(t, sp); const v = sp.vel; vmax = Math.max(vmax, v); if (v < -0.05 && back === null) back = t; const a = Math.abs(C.speedAt(t + 0.12) - C.speedAt(t - 0.12)) / 0.24; if (a > ma) { ma = a; maT = t; }
        for (let i = 1; i < N; i++) { for (let k = 0; k < 3; k++) { d0[k] = sp.pos[i * 3 + k] - sp.pos[i * 3 - 3 + k]; d1[k] = sp.pos[i * 3 + 3 + k] - sp.pos[i * 3 + k]; }
          const bend = Math.acos(clamp(V.dot(V.norm(d0, d0), V.norm(d1, d1)), -1, 1)) / DR.DEG; if (bend > mb) { mb = bend; mbT = t; mbA = (i / N) * S.length; mbP = [sp.pos[i * 3], sp.pos[i * 3 + 1], sp.pos[i * 3 + 2]]; }
          const roll = Math.acos(clamp(sp.nrm[i * 3] * sp.nrm[i * 3 + 3] + sp.nrm[i * 3 + 1] * sp.nrm[i * 3 + 4] + sp.nrm[i * 3 + 2] * sp.nrm[i * 3 + 5], -1, 1)) / DR.DEG; if (roll > mr) { mr = roll; mrT = t; } } }
      const ringLen = S.length / N, minR = ringLen / (2 * Math.sin((mb * DR.DEG) / 2 || 1e-6));
      info.push(`body ${C.group.name}: ${S.length} m, ${N} rings · tightest bend ${mb.toFixed(1)}° per ring at ${mbT.toFixed(1)} s, ${mbA.toFixed(0)} m behind the head, near [${mbP.map((v) => v.toFixed(0)).join(', ')}] (turn radius ${minR.toFixed(1)} m, body radius ${S.radius} m) · most roll ${mr.toFixed(1)}° per ring at ${mrT.toFixed(1)} s · top speed ${vmax.toFixed(0)} m/s · hardest pull ${ma.toFixed(0)} m/s² at ${maT.toFixed(1)} s`);
      if (mb > LIM.bend) fail.push(`body: a ${mb.toFixed(1)}° kink between rings at ${mbT.toFixed(1)} s (limit ${LIM.bend}°) — the rail turns tighter than the body can: move the control points apart or widen the turn (radius ≥ ${(S.radius * 2.2).toFixed(0)} m)`);
      else if (minR < S.radius * 2.2) warn.push(`body: turn radius ${minR.toFixed(1)} m at ${mbT.toFixed(1)} s is under 2.2 × the body radius — the inside of the coil will crease`);
      if (mr > LIM.roll) fail.push(`body: the back rolls ${mr.toFixed(1)}° between rings at ${mrT.toFixed(1)} s (limit ${LIM.roll}°) — a flip; ease the rail through the vertical there`);
      if (back !== null) fail.push(`body: it slides backwards at ${back.toFixed(1)} s — a rail key asks the head to be behind where it was (keys must advance along the route)`);
      if (ma > LIM.accel) warn.push(`body: speed jumps by ${ma.toFixed(0)} m/s² at ${maT.toFixed(1)} s — two keys are too close in time for their distance`);
      return { fail, warn, info }; });
    // the cast sheet: the creature from every side at one moment (render.mjs --cast).  Views look AT the body, so
    // "left" shows its left flank with the head pointing left on the page — check that front, back and both sides agree.
    const ct = S.castTime ?? DR.DURATION * 0.75, view = (label, a, az, el, dist, fov = 30) => DR.castViews.push({ label: `${C.group.name}: ${label}`, t: ct, cam: (t) => { const p = C.bodyAt(t, a), q = C.bodyAt(t, a + 6), f = V.norm([p[0] - q[0], 0, p[2] - q[2]]), s = [f[2], 0, -f[0]], ca = Math.cos(az * DR.DEG), sa = Math.sin(az * DR.DEG), ce = Math.cos(el * DR.DEG);
        return { p: [p[0] + (f[0] * ca + s[0] * sa) * ce * dist, p[1] + Math.sin(el * DR.DEG) * dist, p[2] + (f[2] * ca + s[2] * sa) * ce * dist], l: p, fov }; } });
    view('head, front', 0, 0, 4, 26); view('head, 3/4 from its left', 0, 42, 8, 24); view('head, its left side', 0, 90, 3, 22); view('head, 3/4 from its right', 0, -42, 8, 24); view('head, its right side', 0, -90, 3, 22); view('head, from above', 3, 20, 72, 30);
    view('neck and shoulders, left', S.length * 0.17, 100, 10, 34, 38); view('neck and shoulders, right', S.length * 0.17, -100, 10, 34, 38); view('mid body, from below', S.length * 0.5, 60, -50, 30, 38); view('hind legs, left', S.length * 0.52, 95, 5, 30, 38); view('tail, right', S.length * 0.9, -90, 10, 34, 38); view('whole, from behind and above', S.length * 0.5, 160, 30, 150, 40);
    return C;
  };
}
