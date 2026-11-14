// shred-poster · 30_sheet — the poster as strips lying on the floor: the HOOK (frame 0 is the finished poster, then the
// strips rip sideways and the camera lunges at the hero line) and the REBUILD (scrambled strips coast in and snap
// into line in a wave, a click on every landing, then the poster rests and the film loops into the hook).
// Both shots use the same strips with the same seed, so the last frame of the rebuild IS the first frame of the hook.
//
// World: z up, the floor at z = 0, the poster 2 × 3 units centred on the origin (poster unit u → u·0.002).
{
  SP.PW = 2; SP.PH = 3;
  SP.rowY = (r) => SP.PH / 2 - r * (SP.PH / 1500);          // poster row (units from the top) → world y

  SP.sheetShots = (ctx, o = {}) => {
    const { poster, aspect } = ctx;
    const r = SP.rng(o.seed ?? 11);
    const scene = new THREE.Scene();
    const NS = o.strips ?? 26, jitter = o.jitter ?? 0.22;
    const tex = ctx.texHero;
    const mat = SP.paperMat(tex, { paper: poster.spec.paper, dark: poster.dark, rough: 0.62, inkRough: 0.46, trans: 0.18, back: 0.16, bump: 0.16 });
    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), SP.floorMat({ lo: 0.17, hi: 0.36, relief: 0.5, ...(o.floor || {}) }));
    floor.receiveShadow = true; scene.add(floor);
    // the cut: unequal bands, about ±20 %
    const bands = [0]; for (let i = 1; i < NS; i++) bands.push((i + r.norm(0, jitter)) / NS); bands.push(1);
    for (let i = 1; i < NS; i++) bands[i] = SP.clamp(bands[i], bands[i - 1] + 0.35 / NS, 1 - (NS - i) * 0.35 / NS);
    const strips = [];
    const Z0 = 0.035;
    for (let i = 0; i < NS; i++) {
      const v0 = bands[i], v1 = bands[i + 1], h = (v1 - v0) * SP.PH, w = SP.PW * r.uni(0.995, 1.005);
      const nx = SP.soft ? 110 : 160, ny = 5, g = SP.grid(nx, ny);
      const X = new Float32Array(g.N), Y = new Float32Array(g.N);
      for (let j = 0; j <= ny; j++) for (let k = 0; k <= nx; k++) { const q = j * (nx + 1) + k; X[q] = (k / nx - 0.5) * w; Y[q] = (j / ny - 0.5) * h; }   // rows go up: the print faces the camera
      const crumple = i >= 2 ? 1 : 2.4;
      const z = SP.creases(r, X, Y, Math.round(10 * crumple), 0.005 * crumple, true);
      const bow = SP.field(r, ny + 1, nx + 1, 3, 30), fine = SP.field(r, ny + 1, nx + 1, 0, 1), edge = r.uni(0.3, 1);
      let zmin = Infinity;
      for (let q = 0; q < g.N; q++) { const j = Math.floor(q / (nx + 1)), tt = (j / ny) * 2 - 1; z[q] += bow[q] * 0.006 + fine[q] * 0.0005 * crumple + tt * tt * 0.008 * edge; zmin = Math.min(zmin, z[q]); }
      // ragged cut edges: the band edges wander a little along the strip (a hand-fed cut, not a laser)
      const rag = SP.field(r, 1, nx + 1, 0, 6);
      for (let q = 0; q < g.N; q++) {
        const j = Math.floor(q / (nx + 1)), k = q % (nx + 1), yy = Y[q] + (j === 0 || j === ny ? rag[k] * 0.0025 : 0);
        g.pos[q * 3] = X[q]; g.pos[q * 3 + 1] = yy; g.pos[q * 3 + 2] = z[q] - zmin;
        g.uv[q * 2] = X[q] / SP.PW + 0.5; g.uv[q * 2 + 1] = 1 - (v0 + (0.5 - yy / h) * (v1 - v0));
      }
      g.commit();
      const m = new THREE.Mesh(g.geo, mat); m.castShadow = true; m.receiveShadow = true;
      const base = [r.norm(0, 0.006), SP.PH / 2 - (v0 + v1) / 2 * SP.PH + r.norm(0, 0.002), Z0 + 0.004 * r()], rot = [r.norm(0, 0.015), 0, r.norm(0, 0.002)];
      m.position.set(...base); m.rotation.set(...rot); scene.add(m);
      strips.push({ m, base, rot, v0, v1 });
    }
    // light: one soft key from the upper left with a narrowed spread (a pool of light, darker corners), a sky fill
    const key = new THREE.SpotLight(0xfff6ec, o.key ?? 3.2, 0, 0.62, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(SP.soft ? 1536 : 2048, SP.soft ? 1536 : 2048); key.shadow.bias = -0.00025; key.shadow.normalBias = 0.003; key.shadow.radius = 3; key.shadow.camera.near = 2; key.shadow.camera.far = 16;
    scene.add(key, key.target);
    const KEY_END = o.keyEnd || [[-3.4, 3.6, 5.2], [0.2, -0.3, 0]], KEY_START = o.keyStart || [[-5.2, 0.4, 4.2], [-0.5, -1.1, 0]];
    const fill = new THREE.HemisphereLight(0xe8eefc, 0x403c38, o.fill ?? 0.55); fill.position.set(0, 0, 1); scene.add(fill);
    const glint = new THREE.SpotLight(0xfffaf2, 0, 0, 0.5, 1, 0); scene.add(glint, glint.target);
    const setKey = (u) => { key.position.set(...SP.mix3(KEY_START[0], KEY_END[0], u)); key.target.position.set(...SP.mix3(KEY_START[1], KEY_END[1], u)); };
    // camera: a long lens straight down (near-orthographic); `scale` = the height of floor the frame shows
    const FOV = 9, cam = new THREE.PerspectiveCamera(FOV, aspect, 1, 200), tanh = Math.tan((FOV / 2) * SP.DEG);
    const CAM_Y0 = o.camY ?? -0.3, S_END = o.scale ?? 4.7, S_START = S_END + 0.3, PUSH = 0.05;
    const setCam = (scale, y) => { const D = scale / (2 * tanh); cam.position.set(0, y, D); cam.up.set(0, 1, 0); cam.lookAt(0, y, 0); cam.updateMatrixWorld(); };

    // ── the rebuild plan (seconds, local to the rebuild shot) ──
    const DC = o.rebuildDur, hold = o.hold ?? 0.34, holdT = DC - hold;
    const order = o.order || 'top';
    const plan = [];
    for (let i = 0; i < NS; i++) {
      const c = (NS - 1) / 2, x = order === 'bottom' ? 1 - i / (NS - 1) : order === 'middle' ? Math.abs(i - c) / c : i / (NS - 1);   // 0 lands first
      const k = Math.round(x * (NS - 1));
      const side = (k % 2 ? 1 : -1) * (r() < 0.8 ? 1 : -1);   // neighbours start on opposite sides more often than not
      const o0 = side * r.uni(0.5, 1.25), o1 = o0 * r.uni(0.15, 0.45);
      const span = holdT - 0.45 - 0.32 - 0.05;
      const t2 = 0.45 + span * (1 - (1 - x) ** 1.6) + r.norm(0, 0.025);   // the wave bunches up: accelerating
      plan.push({ o0, o1, t1: r.uni(-0.5, -0.15), tc: 0.35 + 0.45 * (t2 - 0.45), t2: Math.max(0.2, t2), d2: 0.62 - 0.3 * x, lift: 0 });
    }
    // the last strip to land must finish by the hold
    const tl = Math.max(...plan.map((p) => p.t2 + p.d2)); if (tl > holdT) { const s = (holdT - 0.02) / tl; for (const p of plan) { p.t2 *= s; p.d2 *= Math.max(0.7, s); } }
    for (let n = 0; n < (o.lifts ?? 3); n++) plan[r.int(0, NS - 1)].lift = r.uni(0.04, 0.07);
    const tLast = Math.max(...plan.map((p) => p.t2 + p.d2));
    const lands = plan.map((p, i) => ({ t: p.t2 + p.d2, i })).sort((a, b) => a.t - b.t);
    const off = (p, t) => {
      const a = p.o1 + (p.o0 - p.o1) * Math.exp(-Math.max(0, t - p.t1) / p.tc), tau = (t - p.t2) / p.d2;
      return a * (tau < 1 ? 1 - 1.03 * SP.sease(tau, 3) : SP.spring(t - p.t2 - p.d2, 0.03));
    };
    const cScale = (t) => S_END + PUSH * (DC - t) + (S_START - S_END - PUSH * DC) * (1 - SP.sease(Math.min(1, t / (DC - hold)), 1.6));

    // the hook plan: a held frame, then a fast rip from the top
    const HD = o.hookDur, H_HOLD = o.hookHold ?? 4 / 60, rip = strips.map((_, i) => ({ amp: r.sign() * r.uni(0.35, 1.1), ts: H_HOLD + 0.01 * i + r.uni(0, 0.03) }));
    const hero = poster.marks.hero || { y0: 200, y1: 450 }, heroY = SP.rowY((hero.y0 + hero.y1) / 2);
    const lungeY = (heroY - CAM_Y0) * (o.lungeTo ?? 0.8), lungeS = S_END * (o.lunge ?? 0.29);

    const restAll = () => { for (const s of strips) { s.m.position.set(...s.base); s.m.rotation.set(...s.rot); } };
    return {
      scene, cam, lands, tLast, strips, plan,
      hook(t) {
        restAll(); glint.intensity = 0; setKey(1);
        for (let i = 0; i < NS; i++) { const u = Math.max(0, t - rip[i].ts) / 0.3; strips[i].m.position.x = strips[i].base[0] + rip[i].amp * u ** 2.2; }
        const u = Math.max(0, t - H_HOLD) / (HD - H_HOLD), e = u ** 2.2;
        setCam(S_END - PUSH * t - lungeS * e, CAM_Y0 + lungeY * e);
      },
      rebuild(t) {
        restAll();
        for (let i = 0; i < NS; i++) {
          const p = plan[i], s = strips[i];
          let v = 0;
          if (t < holdT) {
            v = off(p, t);
            for (const j of [i - 1, i + 1]) if (j >= 0 && j < NS) { const q = plan[j], ss = t - q.t2 - q.d2; if (ss > 0) v += 0.005 * Math.sign(q.o1) * Math.exp(-ss / 0.07) * Math.sin((SP.TAU * ss) / 0.11); }   // neighbours shiver
          }
          const tau = (t - p.t2) / p.d2, lift = t < holdT ? p.lift * Math.sin(Math.PI * SP.sat(tau)) : 0;
          s.m.position.set(s.base[0] + v, s.base[1], s.base[2] + lift); s.m.rotation.set(s.rot[0] + lift * 2.2, s.rot[1], s.rot[2]);
        }
        setKey(SP.sease(Math.min(1, t / tLast), 1.8));
        // after the final click a soft light passes down the poster once
        const g = (t - tLast - 0.03) / 0.42, y = 2.6 - 5.4 * SP.sat(g);
        glint.position.set(0, y, 2.4); glint.target.position.set(0, y - 1, 0); glint.intensity = g > 0 && g < 1 ? 1.4 * Math.sin(Math.PI * g) ** 2 : 0;
        setCam(cScale(t), CAM_Y0);
      },
    };
  };
}
