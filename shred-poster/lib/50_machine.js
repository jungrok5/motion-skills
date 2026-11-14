// shred-poster · 50_machine — the MACHINE: a strip-cut shredder in close-up, one camera move. The poster comes down
// bottom-first (so its text reads upright) into two shafts of cutter discs; the hero line is bitten while the camera
// is close on the nip, then the camera dives under the cutters into the curtain of strips as the sliced line comes out.
// The print flows: every (sub)frame rebuilds the sheet and the lanes from the length fed so far, and the cockle of the
// paper is sampled at paper coordinates, so it travels with the print into the cutters.
//
// World: z up, the paper plane is y = 0, the shafts lie along x at y = ±D; the discs' edges cross at z = Z_CUT.
{
  SP.machineShot = (ctx, o = {}) => {
    const { poster, aspect } = ctx, Dur = o.dur, r = SP.rng(o.seed ?? 23);
    const scene = new THREE.Scene();
    scene.background = SP.color(o.backdrop || '#2b2a28');   // the dark inside of the machine (not a black void)
    const LANES = o.lanes ?? 26, LW = SP.PW / LANES, R = 0.2, SD = 0.19, Z_CUT = Math.sqrt(R * R - SD * SD);
    // the feed: the poster's bottom edge starts just above the scissor point and slides in; when the cutters bite they
    // snatch it (a quick surge) and then pull a steady speed under load. Bottom-first, so the text reads upright and
    // the lower part of the poster (the footer line) is what the camera sees bitten and coming out as strips.
    const START = o.start ?? 0.14, VIN = 0.42, V = o.feed ?? 0.75, T0 = 0.1, tb = START / VIN;
    const dtF = 1 / 600, nF = Math.ceil((Dur + 0.6) / dtF), feedTab = new Float32Array(nF + 1);
    { let p = 0; for (let i = 1; i <= nF; i++) { const x = -0.2 + (i - 1) * dtF; let v = VIN + (V - VIN) * SP.sease((x - tb) / 0.07, 2); if (x > tb) v += 0.22 * Math.exp(-(x - tb) / 0.05) * (1 - Math.exp(-(x - tb) / 0.012)); p += v * dtF; feedTab[i] = p; }
      const at0 = feedTab[Math.round(0.2 / dtF)]; for (let i = 0; i <= nF; i++) feedTab[i] -= at0 + START; }
    const fed = (t) => { const f = SP.clamp((t + T0 + 0.2) / dtF, 0, nF - 1e-6), i = Math.floor(f); return feedTab[i] + (feedTab[i + 1] - feedTab[i]) * (f - i); };
    const tBite = tb - T0;
    const tex = ctx.texHero;
    const mat = SP.paperMat(tex, { paper: poster.spec.paper, dark: poster.dark, rough: 0.58, inkRough: 0.42, trans: 0.3, back: 0.16, bump: 0.12 });
    // cockle field over the whole poster (paper coordinates), sampled as the sheet moves
    const CX = 48, CY = 72, cock = SP.field(r, CY + 1, CX + 1, 6, 6);
    const cockAt = (u, v) => { const x = SP.clamp(u, 0, 1) * CX, y = SP.clamp(v, 0, 1) * CY, i = Math.min(CX - 1, x | 0), j = Math.min(CY - 1, y | 0), fx = x - i, fy = y - j, a = cock[j * (CX + 1) + i], b = cock[j * (CX + 1) + i + 1], c = cock[(j + 1) * (CX + 1) + i], d = cock[(j + 1) * (CX + 1) + i + 1]; return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy; };

    // the sheet above the cut
    const SNX = 72, SNY = 70, sheet = SP.grid(SNX, SNY), sheetMesh = new THREE.Mesh(sheet.geo, mat);
    sheetMesh.castShadow = sheetMesh.receiveShadow = true; sheetMesh.frustumCulled = false; scene.add(sheetMesh);
    // the lanes below it
    const lanes = [];
    for (let k = 0; k < LANES; k++) {
      const g = SP.grid(1, 48), m = new THREE.Mesh(g.geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
      lanes.push({ g, m, side: k % 2 ? 1 : -1, curl: r.uni(0.55, 1.35), ph: r.uni(0, 6.28), sw: r.uni(0.04, 0.12), tw: r.uni(0.25, 0.7) });
    }
    // the machine
    const steel = SP.steelMat({ color: o.steel || '#a3a5a9', rough: 0.24 }), steelDark = SP.steelMat({ color: '#7d7f83', rough: 0.34 }), body = SP.plasticMat({ color: o.body || '#18181a' });
    const teeth = o.teeth ?? 22, gear = new THREE.Shape();
    for (let i = 0; i <= teeth * 4; i++) { const a = (i / (teeth * 4)) * SP.TAU, ph = i % 4, rr = ph === 0 ? R : ph === 1 ? R * 0.99 : ph === 2 ? R * 0.955 : R * 0.965; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i === 0) gear.moveTo(x, y); else gear.lineTo(x, y); }
    const discGeo = new THREE.ExtrudeGeometry(gear, { depth: LW * 0.86, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 1 });
    discGeo.translate(0, 0, -LW * 0.43); discGeo.rotateY(Math.PI / 2);   // axis along x
    const spacerGeo = new THREE.CylinderGeometry(R * 0.6, R * 0.6, LW * 0.98, 40); spacerGeo.rotateZ(Math.PI / 2);
    const shaftGeo = new THREE.CylinderGeometry(0.045, 0.045, SP.PW + 0.8, 24); shaftGeo.rotateZ(Math.PI / 2);
    const shafts = [];
    for (const sy of [-1, 1]) {
      const grp = new THREE.Group(); grp.position.set(0, sy * SD, 0);
      grp.add(new THREE.Mesh(shaftGeo, steelDark));
      for (let k = 0; k < LANES; k++) {
        const x = -SP.PW / 2 + (k + 0.5) * LW, isDisc = (k % 2 === 0) === (sy < 0);
        const m = new THREE.Mesh(isDisc ? discGeo : spacerGeo, isDisc ? steel : steelDark); m.position.x = x; m.rotation.x = isDisc ? r.uni(0, 6.28) : 0;
        m.castShadow = m.receiveShadow = true; grp.add(m);
      }
      scene.add(grp); shafts.push({ grp, sy });
    }
    // side frames and the combs below
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.8), body); f.position.set(sx * (SP.PW / 2 + 0.3), 0, -0.05); f.castShadow = f.receiveShadow = true; scene.add(f); }
    for (const sy of [-1, 1]) {
      const comb = new THREE.Mesh(new THREE.BoxGeometry(SP.PW + 0.6, 0.06, 0.05), body); comb.position.set(0, sy * 0.13, -0.24); comb.castShadow = true; scene.add(comb);
    }
    // light: a key from the front-left above, a rim from behind (it glows through the strips), steel in a soft studio
    const key = new THREE.DirectionalLight(0xfff4e8, o.key ?? 2.4); key.position.set(-2.2, -3.2, 3.4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.003; key.shadow.radius = 2;
    Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.6, bottom: -2.6, near: 0.5, far: 14 });
    const rim = new THREE.DirectionalLight(0xfffaf3, o.rim ?? 1.6); rim.position.set(1.2, 4, 1.5);
    const under = new THREE.DirectionalLight(0xdfe6ff, 0.35); under.position.set(0, -1, -3);
    const amb = new THREE.HemisphereLight(0xeef0f6, 0x202020, 0.35); amb.position.set(0, 0, 1);
    scene.add(key, rim, under, amb);
    scene.environment = ctx.env; scene.environmentIntensity = 0.9;

    // one continuous move: rush at the poster, close on the bite while the hero line is eaten, dive past the cutters
    // with a slight orbit and roll, under the comb looking up into the curtain as the sliced line comes out, whip out.
    // keys: [u, camera, target, vertical fov°, roll°] — u runs 0..1 over the shot
    const lens = (mm) => (2 * Math.atan(18 / mm)) / SP.DEG;
    const keys = o.cameraKeys || [
      [0.0, [-0.3, -4.9, 2.05], [0.0, 0, 0.8], lens(40), 3.4],
      [0.244, [-0.08, -2.7, 0.62], [0.03, 0, 0.15], lens(40), 1.1],
      [0.463, [0.12, -1.85, -0.25], [0.1, 0, -0.12], lens(36), -2.9],
      [0.634, [0.2, -1.3, -1.15], [0.15, -0.05, -0.42], lens(32), 0],
      [0.829, [0.42, -1.25, -1.25], [0.37, -0.05, -0.45], lens(32), 0],
      [1.0, [0.85, -1.25, -1.22], [0.8, -0.05, -0.45], lens(32), 0],
    ];
    const rail = SP.rail(keys);
    const cam = new THREE.PerspectiveCamera(34, aspect, 0.05, 40);
    const CURTAIN = 2.2;   // longest strip modelled below the cut
    return {
      scene, cam, tBite, fed, Z_CUT, tIn: tBite,
      update(t) {
        const F = fed(t);
        // sheet: rows from the scissor point up to the top edge of the poster
        const top = SP.PH - F; // visible height above the cut
        for (let j = 0; j <= SNY; j++) {
          const z = Z_CUT + Math.max(0, top) * (j / SNY), d = F + (z - Z_CUT);   // d: distance from the poster's bottom edge
          const pull = Math.exp(-(z - Z_CUT) / 0.12);   // drawn flat into the nip
          for (let i = 0; i <= SNX; i++) {
            const u = i / SNX, q = j * (SNX + 1) + i, x = (u - 0.5) * SP.PW;
            sheet.pos[q * 3] = x; sheet.pos[q * 3 + 1] = cockAt(u, d / SP.PH) * 0.012 * (1 - pull) + 0.03 * Math.sin(u * 3.1 + 0.4) * (1 - pull) * SP.sat((z - Z_CUT) / 1.2); sheet.pos[q * 3 + 2] = z;
            sheet.uv[q * 2] = u; sheet.uv[q * 2 + 1] = d / SP.PH;
          }
        }
        sheet.geo.attributes.uv.needsUpdate = true; sheet.commit(); sheetMesh.visible = top > 0.001;
        // lanes: each leaves the nip in its own lane, pushed back or forward alternately, curls and sways there
        const sEnd = SP.clamp(F, 0, CURTAIN + Math.max(0, F - SP.PH)), sStart = Math.max(0, F - SP.PH);   // after the top edge passes the nip the strips run on and away
        lanes.forEach((L, k) => {
          const g = L.g, n = g.ny, x0 = -SP.PW / 2 + k * LW + LW * 0.03, x1 = x0 + LW * 0.94;
          L.m.visible = sEnd - sStart > 0.002;
          let y = 0, z = Z_CUT, sPrev = 0;
          for (let j = 0; j <= n; j++) {
            const s = sStart + (j / n) * (sEnd - sStart), d = F - s;
            // integrate the centre line from the nip to s (coarse steps), the strip bending away from the paper plane
            for (let m = 0; m < 6; m++) { const s0 = sPrev + ((s - sPrev) * m) / 6, ds = (s - sPrev) / 6, sm = s0 + ds / 2;
              const th = L.side * L.curl * (0.25 + 0.55 * Math.min(1.6, sm) ** 1.4) * SP.sat(sm / 0.08) + L.sw * Math.sin(2.1 * t + L.ph + sm * 1.6) * SP.sat(sm / 0.3);
              y += Math.sin(th) * ds; z -= Math.cos(th) * ds; }
            sPrev = s;
            const sway = 0.012 * Math.sin(1.7 * t + L.ph + s * 2.2) * SP.sat(s / 0.4);
            const phi = L.tw * Math.sin(1.3 * s + L.ph + 0.9 * t) * SP.sat(s / 0.25), hw = (x1 - x0) / 2, cx = (x0 + x1) / 2;   // a slow twist about the strip's length catches the light
            for (let i = 0; i <= 1; i++) { const q = j * 2 + i, side = i ? -1 : 1, xx = cx + side * hw * Math.cos(phi); g.pos[q * 3] = xx + sway; g.pos[q * 3 + 1] = y + side * hw * Math.sin(phi); g.pos[q * 3 + 2] = z; g.uv[q * 2] = (cx + side * hw) / SP.PW + 0.5; g.uv[q * 2 + 1] = d / SP.PH; }
          }
          g.geo.attributes.uv.needsUpdate = true; g.commit();
        });
        // discs: rim speed = paper speed
        const ang = F / R;
        for (const s of shafts) s.grp.rotation.x = -s.sy * ang;
        const c = rail(SP.sat(t / Dur));
        cam.position.set(c.p[0] + SP.shake(t, 7, 0.004), c.p[1], c.p[2] + SP.shake(t, 8, 0.004)); cam.up.set(0, 0, 1); cam.lookAt(c.l[0], c.l[1], c.l[2]);
        cam.rotateZ(c.roll * SP.DEG); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      },
    };
  };

  // camera rail: keys [u, [px,py,pz], [lx,ly,lz], fov, roll°], Catmull-Rom through them (a move with no corners)
  SP.rail = (keys, easing = (u) => u) => {
    const K = keys.map((k) => ({ u: k[0], p: k[1], l: k[2], fov: k[3] ?? 35, roll: k[4] ?? 0 })), n = K.length;
    const cr = (a, b, c, d, s) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
    return (u) => {
      const x = easing(SP.sat(u)); let i = 0; while (i < n - 2 && K[i + 1].u < x) i++;
      const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[Math.min(n - 1, i + 1)], k3 = K[Math.min(n - 1, i + 2)], s = SP.sat(SP.unlerp(k1.u, k2.u, x));
      const o = { p: [0, 0, 0], l: [0, 0, 0] };
      for (let c = 0; c < 3; c++) { o.p[c] = cr(k0.p[c], k1.p[c], k2.p[c], k3.p[c], s); o.l[c] = cr(k0.l[c], k1.l[c], k2.l[c], k3.l[c], s); }
      o.fov = cr(k0.fov, k1.fov, k2.fov, k3.fov, s); o.roll = cr(k0.roll, k1.roll, k2.roll, k3.roll, s); return o;
    };
  };
}
