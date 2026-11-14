// shred-poster · 40_cascade — the CASCADE: shredder ribbons fall and lay down onto a pile in three depth layers, and a
// hero ribbon cut along the hero line carries the headline (in the accent) along the camera path. Ribbons never pass
// through each other: every (sub)frame they are laid one by one onto a height map of everything laid before them.
// A ribbon is a function of time: arches sag as it settles, a slow wave sways it, raised parts flutter; a falling one
// comes down at a steady terminal speed, slows on the air cushion and touches down progressively along its length.
{
  class Ribbon {
    constructor(o) {
      Object.assign(this, o);
      const r = o.rng, nx = o.nx, ny = o.ny;
      this.g = SP.grid(nx, ny);
      this.s = new Float32Array(nx + 1); for (let i = 0; i <= nx; i++) this.s[i] = (i / nx) * o.L;
      this.ph = [0, 0, 0, 0, 0, 0].map(() => r.uni(0, 6.28));
      this.amp = o.amp * r.uni(0.7, 1.15); this.fq = r.uni(...(o.freq || [1.1, 1.7]));
      const hn = SP.field(r, 1, nx + 1, 0, 25); this.hn = hn.map((v) => v * o.amp * 0.12);
      this.zn = SP.field(r, ny + 1, nx + 1, 3, 4).map((v) => v * 0.003);
      const S = new Float32Array(this.g.N), T = new Float32Array(this.g.N);
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const q = j * (nx + 1) + i; S[q] = this.s[i]; T[q] = (j / ny - 0.5) * o.w; }
      this.cr = SP.creases(r, S, T, Math.max(4, Math.round(o.L * 3)), 0.006, true);
      if (o.crimp) {   // transverse kinks left by the shredder's rollers, irregular pitch: light breaks on crisp lines
        let ph = 0; const zc = new Float32Array(nx + 1), ds = o.L / nx, a = r.uni(0.6, 1.3); let m = 0;
        for (let i = 0; i <= nx; i++) { ph += r.uni(0.5, 1.5) * ds / 0.2; const fr = ph - Math.floor(ph) - 0.5; zc[i] = 2 * o.crimp * a * Math.sqrt(fr * fr + 0.0009); m += zc[i]; }
        m /= nx + 1; for (let q = 0; q < this.g.N; q++) this.cr[q] += zc[q % (nx + 1)] - m;
      }
      this.sway = r.uni(0.012, 0.025);
      for (let q = 0; q < this.g.N; q++) { const [u, v] = o.uv(S[q], T[q] / o.w); this.g.uv[q * 2] = u; this.g.uv[q * 2 + 1] = v; }
      this.mesh = new THREE.Mesh(this.g.geo, o.mat); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
      this.lat = new Float32Array(nx + 1); this.h = new Float32Array(nx + 1); this.tw = new Float32Array(nx + 1); this.dz = new Float32Array(nx + 1); this.air = new Float32Array(nx + 1);
    }
    coords(t) {
      const { s, ph, nx, ny, w, lat, h, tw, dz, air } = this, pos = this.g.pos;
      const settle = 1 + 0.35 * (1 - SP.sease(t / 1.8, 1.4));
      let hmin = Infinity;
      for (let i = 0; i <= nx; i++) {
        const si = s[i];
        lat[i] = this.meander * (0.1 * Math.sin(si * 0.9 + ph[0]) + 0.05 * Math.sin(si * 2.3 + ph[1])) + this.sway * Math.sin(si * 1.1 - 2.4 * t + ph[3]);
        const fold = Math.abs(Math.sin(si * this.fq + ph[2])) ** 3;
        h[i] = this.amp * fold * settle + this.hn[i]; hmin = Math.min(hmin, h[i]);
        tw[i] = this.twist * (0.7 * Math.sin(si * 0.7 + ph[1]) * fold + 0.3 * Math.sin(si * 1.9 + ph[0])) + 0.1 * fold * Math.sin(3.1 * t + si * 1.3 + ph[4]);
        dz[i] = 0; air[i] = 0;
      }
      for (let i = 0; i <= nx; i++) h[i] -= hmin;
      if (this.land) {
        const [tl, sc, dn, drift, p5] = this.land;
        for (let i = 0; i <= nx; i++) {
          const si = s[i], tau = tl - t + SP.clamp((dn * (si - sc)) / 5, -0.35, 0.35);   // contact rolls along at 5 u/s
          let d = Math.sqrt(Math.max(tau, 0) ** 2 + 0.0144) - 0.12;                        // slow terminal fall, cushioned touchdown
          const ls = Math.max(-tau, 0); d += 0.012 * Math.sin((SP.TAU * ls) / 0.16) * Math.exp(-ls / 0.07);   // one small rebound
          const a = SP.sat(d / 0.35); dz[i] = d; air[i] = a;
          h[i] = h[i] * (1 + 0.9 * a) + 0.05 * a * (1 + Math.sin(2.4 * si - 6 * t + p5));
          lat[i] += drift * d; tw[i] += 0.3 * a * Math.sin(1.6 * si - 4.5 * t + p5);
        }
      }
      for (let i = 0; i <= nx; i++) {
        const lim = 0.5 + 0.1 * air[i]; tw[i] = SP.clamp(tw[i], -lim, lim);
        const dx = (lat[Math.min(nx, i + 1)] - lat[Math.max(0, i - 1)]) / (s[Math.min(nx, i + 1)] - s[Math.max(0, i - 1)]), nrm = Math.atan(dx);
        const sn = Math.sin(nrm), ct = Math.cos(tw[i]), st = Math.sin(tw[i]);
        for (let j = 0; j <= ny; j++) {
          const q = j * (nx + 1) + i, T = j / ny - 0.5;
          pos[q * 3] = this.bx + s[i] - T * w * sn;
          pos[q * 3 + 1] = this.by + lat[i] + T * w * ct;
          pos[q * 3 + 2] = this.z0 + dz[i] + h[i] + T * w * st + this.zn[q] + this.cr[q];
        }
      }
    }
  }

  // the pile: ribbons are laid one by one, each lifted to rest on a height map of everything laid before it. The lift
  // drapes: it falls off with a limited slope along the strip (paper is stiff over its narrow width, so across it is
  // lifted as one), and the peaks are slightly rounded.
  class Stack {
    constructor(x0, x1, y0, y1, res, floor) { this.x0 = x0; this.y0 = y0; this.res = res; this.nx = Math.ceil((x1 - x0) / res) + 1; this.ny = Math.ceil((y1 - y0) / res) + 1; this.floor = floor; this.H = new Float32Array(this.nx * this.ny); }
    reset() { this.H.fill(this.floor); }
    ix(x) { return SP.clamp(Math.round((x - this.x0) / this.res), 0, this.nx - 1); }
    iy(y) { return SP.clamp(Math.round((y - this.y0) / this.res), 0, this.ny - 1); }
    hAt(x, y) { const i = this.ix(x), j = this.iy(y), H = this.H, nx = this.nx; let m = -1e9; for (let b = -1; b <= 1; b++) { const jj = SP.clamp(j + b, 0, this.ny - 1); for (let a = -1; a <= 1; a++) m = Math.max(m, H[jj * nx + SP.clamp(i + a, 0, nx - 1)]); } return m; }
    place(rib, gap, slope = 0.2) {
      const { nx, ny } = rib, pos = rib.g.pos, ds = rib.L / nx;
      const p = new Float32Array(nx + 1);
      for (let i = 0; i <= nx; i++) { let m = 0; for (let j = 0; j <= ny; j++) { const q = (j * (nx + 1) + i) * 3; m = Math.max(m, this.hAt(pos[q], pos[q + 1]) + gap - pos[q + 2]); } p[i] = m; }
      let any = false; for (const v of p) if (v > 0) { any = true; break; }
      if (any) {
        const f = new Float32Array(nx + 1), b = new Float32Array(nx + 1);
        let run = -1e9; for (let i = 0; i <= nx; i++) { run = Math.max(run, p[i] + i * ds * slope); f[i] = run - i * ds * slope; }
        run = -1e9; for (let i = nx; i >= 0; i--) { run = Math.max(run, p[i] - i * ds * slope); b[i] = run + i * ds * slope; }
        const q = new Float32Array(nx + 1); for (let i = 0; i <= nx; i++) q[i] = Math.max(f[i], b[i]);
        const sm = new Float32Array(nx + 1), R = 6; // gaussian-ish rounding (σ ≈ 3 samples), never below the need
        for (let i = 0; i <= nx; i++) { let s = 0, ws = 0; for (let k = -R; k <= R; k++) { const wgt = Math.exp(-0.5 * (k / 3) ** 2); s += q[SP.clamp(i + k, 0, nx)] * wgt; ws += wgt; } sm[i] = Math.max(s / ws, p[i]); }
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pos[(j * (nx + 1) + i) * 3 + 2] += sm[i];
      }
      // stamp: every vertex and the points between rows
      const H = this.H, sx = this.nx;
      for (let i = 0; i <= nx; i++) for (let j = 0; j < ny; j++) {
        const a = (j * (nx + 1) + i) * 3, c = ((j + 1) * (nx + 1) + i) * 3;
        for (let u = 0; u <= 2; u++) { const k = u / 2, x = pos[a] + (pos[c] - pos[a]) * k, y = pos[a + 1] + (pos[c + 1] - pos[a + 1]) * k, z = pos[a + 2] + (pos[c + 2] - pos[a + 2]) * k, id = this.iy(y) * sx + this.ix(x); if (z > H[id]) H[id] = z; }
      }
    }
  }
  SP.Stack = Stack;

  SP.cascadeShot = (ctx, o = {}) => {
    const { poster, aspect } = ctx, D = o.dur, r = SP.rng(o.seed ?? 31), lr = SP.rng((o.seed ?? 31) + 46);
    const scene = new THREE.Scene();
    // the camera tracks along +x with a speed ramp: a kick at the cut, then cruise, then a surge before the next cut
    const N = 400, pos = new Float32Array(N + 1), dt = D / N;
    for (let i = 1; i <= N; i++) { const t = (i - 1) * dt, v = 0.8 * (1 + 1.4 * Math.exp(-t / 0.1) + 1.6 * SP.sease((t - (D - 0.52)) / 0.5, 2.2)); pos[i] = pos[i - 1] + v * dt; }
    const camX = (t) => { const f = SP.clamp(t / dt, 0, N - 1e-6), i = Math.floor(f); return -2.4 + pos[i] + (pos[i + 1] - pos[i]) * (f - i); };
    const plainTex = ctx.texPlain.clone(), heroTex = ctx.texHero.clone();
    for (const t of [plainTex, heroTex]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; }
    const pk = { paper: poster.spec.paper, dark: poster.dark, rough: 0.6, inkRough: 0.44, trans: 0.26, back: 0.16, bump: 0.14 };
    const mat = SP.paperMat(plainTex, pk), matHero = SP.paperMat(heroTex, pk);   // the accent stays on the hero only
    const S = o.printScale ?? 1.5, W0 = o.width ?? 0.27, L = 12, ribs = [];
    const nxFor = (len) => Math.round(len / (SP.soft ? 0.05 : 0.04));
    const layers = o.layers || [[16, 0.03, 0], [18, 0.15, 0.03], [8, 0.24, 0.07]];
    layers.forEach(([count, amp, z0], layer) => {
      for (let j = 0; j < count; j++) {
        const y = -3 + (j + r.uni(-0.3, 0.3)) * (5.6 / count), wid = W0 * r.uni(0.85, 1.15), bx = -L / 2 - 1.5 + r.uni(-1, 1), u0 = r(), v0 = r();
        const rb = new Ribbon({ rng: r, L, w: wid, bx, by: y, z0, nx: nxFor(L), ny: 5, mat, amp, twist: 0.45, meander: 1, crimp: 0.005,
          uv: (s, T) => [u0 + ((T + 0.5) * wid) / (SP.PW * S), v0 - s / (SP.PH * S)] });
        Object.assign(rb, { layer, j, y }); ribs.push(rb);
      }
    });
    const landing = (tl, bx) => [tl, camX(tl) + lr.uni(-0.4, 0.6) - bx, lr.sign(), lr.uni(0.12, 0.3) * lr.sign(), lr.uni(0, 6.28)];
    const drop = ribs.filter((rb) => rb.layer === 2 || (rb.layer === 1 && rb.j % 3 === 1)).sort((a, b) => Math.abs(a.y - 0.25) - Math.abs(b.y - 0.25));
    const times = [0.1, 0.18, 0.46, 0.58, 0.72, 0.86, 1.0, 1.12, 1.26, 1.4, 1.55, 1.2, 0.95, 1.6, 0.8, 1.35].map((x) => x * (D / 1.87));
    drop.forEach((rb, i) => { if (i < times.length) rb.land = landing(times[i], rb.bx); });
    const orr = SP.rng(5), rest = [];
    for (const layer of [0, 1, 2]) rest.push(...orr.shuffle(ribs.filter((rb) => rb.layer === layer && !rb.land)));
    // the hero: a horizontal band of the poster (the hero rows) laid along the ribbon, so a whole word runs along it
    const hm = poster.marks.hero || { y0: 200, y1: 450 }, hs = o.heroScale ?? 0.78, vb0 = 1 - hm.y1 / 1500, vb1 = 1 - hm.y0 / 1500;
    const hw = ((hm.y1 - hm.y0) / 1500) * SP.PH * hs, HL = 6;
    const hero = new Ribbon({ rng: r, L: HL, w: hw, bx: -4.6, by: 0.05, z0: 0.12, nx: nxFor(HL) + 40, ny: 10, mat: matHero, amp: 0.07, freq: [0.5, 0.7], meander: 0.35, twist: 0.12, crimp: 0.004,
      uv: (s, T) => [s / (SP.PW * hs), vb0 + (T + 0.5) * (vb1 - vb0)] });
    hero.land = [0.3 * (D / 1.87), camX(0.3 * (D / 1.87)) + 0.2 + 4.6, 1, 0.1, 1.3];
    const order = [...rest, ...[...drop.filter((d) => d.land), hero].sort((a, b) => a.land[0] - b.land[0])];
    for (const rb of [...ribs, hero]) scene.add(rb.mesh);
    const stack = new Stack(-12, 9, -4, 3.6, SP.soft ? 0.045 : 0.035, -0.01);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), SP.floorMat({ lo: 0.3, hi: 0.38, relief: 0.25, scale: 6, ...(o.floor || {}) }));
    floor.position.z = -0.01; floor.receiveShadow = true; scene.add(floor);
    // light: a smallish key (falling ribbons cast a readable shadow), a broad sky, a back light that glows through arches
    const key = new THREE.DirectionalLight(0xfff6ec, o.key ?? 2.6); key.castShadow = true;
    key.shadow.mapSize.set(SP.soft ? 2048 : 3072, SP.soft ? 2048 : 3072); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.004; key.shadow.radius = 2.5;
    Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 20 });
    const back = new THREE.DirectionalLight(0xfff8f0, o.back ?? 1.1);
    const sky = new THREE.HemisphereLight(0xf6f7fb, 0x6a6660, o.sky ?? 0.9); sky.position.set(0, 0, 1);
    scene.add(key, key.target, back, back.target, sky);
    const cam = new THREE.PerspectiveCamera(o.fov ?? 50.6, aspect, 0.1, 60);
    const DOF = { focus: 3.6, k: o.dof ?? 16 };
    return {
      scene, cam, dof: DOF, hero,
      landTimes: [...drop.filter((d) => d.land).map((d) => d.land[0]), hero.land[0]].sort((a, b) => a - b),
      update(t) {
        stack.reset();
        for (const rb of order) { rb.coords(t); stack.place(rb, 0.004); rb.g.commit(); }
        const x = camX(t), u = SP.sat(t / D), z = 3.3 + 0.9 * SP.sease(u, 1.3);
        cam.position.set(x + SP.shake(t, 1, 0.006), -1.5 + SP.shake(t, 2, 0.006), z + SP.shake(t, 3, 0.004));
        cam.up.set(0, 0, 1); cam.lookAt(x, 0.2, 0);
        cam.rotateZ(((o.roll ?? -40) - 6 * SP.sease(u, 1.5)) * SP.DEG + SP.shake(t, 4, 0.003)); cam.updateMatrixWorld();
        key.position.set(x - 2.5, 3, 5); key.target.position.set(x, 0, 0); back.position.set(x + 1.5, 5, 1.2); back.target.position.set(x, 0, 0.2);
        DOF.focus = Math.hypot(1.65, z - 0.15);
      },
    };
  };
}
