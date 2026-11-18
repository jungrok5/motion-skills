// 쇠울림 골짜기 · the machines' parts.  The legs are the kit's stock mechanisms (k.limbs); everything that makes a machine
// this machine — hull, neck, head, load — is written here, each part in the frame of the one bone it rides.
// A body, a head: x forward, y up, z right.  A neck link: X the pin, Y along it, Z its back.
V.parts = {
  // 두루미: a keel under a pale carapace, hip girders, a counterweight boom, a ladder neck and a head like a bird's — a
  // sensor block with one great lens and a long bill
  crane(k) {
    k.limbs({ style: 'shell' });
    k.bone('body', (g) => {
      k.mat('dark'); k.loft('x', [[-5.9, 0.34, 0.5, -0.1, 0, 4], [-4.2, 0.72, 0.95, -0.2, 0, 4], [0, 0.9, 1.15, -0.25, 0, 4], [4.0, 0.76, 1.0, -0.15, 0, 4], [5.7, 0.42, 0.6, 0.15, 0, 4]], { sides: 18 });
      // the carapace: three overlapping shells along the back, open below so the keel shows
      k.mat('shell'); for (const [x0, x1, hh, ww] of [[-5.2, -1.6, 1.0, 1.45], [-2.1, 2.2, 1.18, 1.62], [1.7, 5.3, 0.98, 1.4]])
        k.loft('x', [[x0, hh * 0.55, ww * 0.6, 0.02, 0, 3], [x0 + 0.5, hh, ww, 0.05, 0, 3], [(x0 + x1) / 2, hh * 1.04, ww * 1.03, 0.08, 0, 3], [x1 - 0.5, hh * 0.96, ww * 0.97, 0.05, 0, 3], [x1, hh * 0.6, ww * 0.62, 0.02, 0, 3]], { sides: 18, from: -0.62 * Math.PI, to: 0.62 * Math.PI, caps: false });
      // the girders the hips bolt to, and the ribs between them
      k.mat('frame'); for (const [x, hz] of [[3.2, 1.5], [-3.5, 1.7]]) { g.box(x, -0.95, 0, 1.25, 0.8, hz * 2 + 0.5, { soft: 0.2 }); for (const s of [-1, 1]) { g.box(x, -0.55, s * hz * 0.6, 0.9, 0.9, 0.24, { soft: 0.2 }); if (k.fine) k.bolts('x', [x + 0.63, -0.95, s * hz], 0.3, 8, 0.035); } }
      if (k.mid) for (let x = -2.6; x <= 2.4; x += 1.25) g.box(x, -0.85, 0, 0.14, 0.62, 2.1, { soft: 0.2 });
      // under the keel: a sensor drum on a short neck
      k.mat('joint'); k.ycyl(-1.7, -1.15, 0.6, 0, 0.42, 0.5, { sides: 14 }); k.mat('dark'); k.ball(0.6, -1.95, 0, 0.55, { squash: [1, 0.7, 1] });
      // the counterweight boom: it balances the neck
      k.mat('dark'); g.tube([[-5.6, -0.1, 0], [-7.4, 0.25, 0], [-8.6, 0.42, 0]], [0.36, 0.26, 0.2], { sides: k.n(10), caps: true }); k.mat('rust'); g.box(-8.5, 0.42, 0, 1.1, 0.7, 0.9, { soft: 0.3 }); k.mat('joint'); g.box(-7.2, 0.2, 0, 0.3, 0.8, 0.8, { soft: 0.3 });
      if (k.fine) { k.mat('rubber'); for (const s of [-1, 1]) g.tube([[4.6, -0.5, s * 0.5], [2.0, -0.95, s * 0.72], [-1.0, -1.0, s * 0.75], [-4.0, -0.8, s * 0.6]], 0.06, { sides: 6 }); }
    });
    // running lights low on the keel (amber), a beacon on the tail (red)
    for (const x of [3.9, 1.3, -1.3, -3.9]) for (const s of [-1, 1]) k.lamp('body', { at: [x, -0.42, s * 1.04], dir: [0, -0.25, s], color: [1, 0.55, 0.16], power: 0.5, range: 9, lens: 0.09, glow: 0.5 });
    k.lamp('body', { at: [-8.9, 0.82, 0], dir: [0, 1, 0], color: [1, 0.1, 0.06], power: 1.2, range: 12, lens: 0.12, glow: 0.8 });
    k.neckLinks({ width: 1.0, style: 'shell' });
    k.bone('head', (g) => {
      k.mat('joint'); k.xcyl(-0.2, 0.2, 0, 0, 0.0001);                                           // (the gimbal sits inside the block)
      k.mat('dark'); k.loft('x', [[-0.75, 0.3, 0.34, 0, 0, 4], [-0.3, 0.5, 0.52, 0.02, 0, 4], [0.7, 0.52, 0.5, 0.02, 0, 4], [1.25, 0.34, 0.34, -0.05, 0, 4]], { sides: 14 });
      k.mat('shell'); k.loft('x', [[-0.7, 0.36, 0.42, 0.06, 0, 3], [-0.1, 0.6, 0.62, 0.1, 0, 3], [0.8, 0.58, 0.58, 0.1, 0, 3], [1.3, 0.3, 0.36, 0.06, 0, 3]], { sides: 14, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
      // the bill: two long blades with a gap between them
      k.mat('shell'); k.loft('x', [[1.15, 0.2, 0.24, 0.06, 0, 3], [2.0, 0.13, 0.15, 0.03, 0, 3], [3.0, 0.03, 0.04, -0.02, 0, 3]], { sides: 10 }); k.mat('dark'); k.loft('x', [[1.15, 0.12, 0.2, -0.22, 0, 3], [2.0, 0.08, 0.12, -0.17, 0, 3], [2.8, 0.02, 0.03, -0.12, 0, 3]], { sides: 8 });
      // the great lens in a hood under the brow, two small eyes beside it
      k.mat('joint'); g.push(new THREE.Matrix4().makeRotationZ(-Math.PI / 2 - 0.24)); g.lathe(0.36, 0, [[0.44, -1.52], [0.5, -1.2], [0.46, -0.9]], { sides: k.n(14) }); g.pop();
    });
    k.lamp('head', { name: 'search', at: [1.22, -0.36, 0], dir: [0.97, -0.24, 0], color: [0.72, 0.9, 1.0], power: 90, cone: 8, range: 170, lens: 0.36, proud: 0.08 });
    for (const s of [-1, 1]) k.lamp('head', { at: [0.95, 0.2, s * 0.5], dir: [0.8, 0, s * 0.6], color: [0.25, 0.85, 1.0], power: 0.8, range: 10, lens: 0.1, glow: 0.7 });
    // what trails: two feelers under the bill, a whip mast on the tail with a light at its tip
    for (const e of k.S.extras) k.bone(e.name, (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, e.len * 0.5, 0], [0, e.len, 0]], e.name === 'mast' ? [0.07, 0.045, 0.02] : [0.045, 0.03, 0.012], { sides: k.n(6), caps: true }); });
    k.lamp('mast', { at: [0, 5.15, 0], dir: [0, 1, 0], color: [1, 0.18, 0.08], power: 0.7, range: 10, lens: 0.07, glow: 0.9 });
  },
  // 등짐: a bed on six legs, a cab like a visor with two amber lamps, a frame of old girders holding what it carries
  porter(k) {
    k.limbs({ style: 'girder' });
    k.bone('body', (g) => {
      k.mat('frame'); k.loft('x', [[-4.9, 0.36, 1.25, 0, 0, 6], [-4.4, 0.5, 1.5, 0, 0, 6], [4.0, 0.5, 1.5, 0, 0, 6], [4.8, 0.4, 1.2, 0.05, 0, 5]], { sides: 14 });
      k.mat('dark'); for (const x of [3.6, 0, -3.6]) { g.box(x, -0.35, 0, 0.9, 0.6, 3.5, { soft: 0.2 }); for (const s of [-1, 1]) if (k.fine) k.bolts('x', [x + 0.46, -0.35, s * 1.5], 0.2, 6, 0.025); }
      k.mat('rust'); g.box(0, 0.58, 0, 8.6, 0.12, 3.1, { soft: 0.1 });                                   // the bed
      // the load frame: four posts, rails, cross braces
      k.mat('rust'); for (const x of [-3.7, 2.6]) for (const s of [-1, 1]) g.box(x, 2.9, s * 1.42, 0.2, 4.6, 0.2, { soft: 0.2 }); for (const s of [-1, 1]) { g.beam([-3.7, 5.15, s * 1.42], [2.6, 5.15, s * 1.42], 0.16, 0.2); g.beam([-3.7, 0.8, s * 1.42], [2.6, 5.1, s * 1.42], 0.1, 0.1); } for (const x of [-3.7, 2.6]) g.beam([x, 5.15, -1.42], [x, 5.15, 1.42], 0.16, 0.2);
      // what it carries: a container lashed down, a tank, a crate stack on top — all long out of use
      g.mat('corrugated', { tint: '#7f9aa6' }); g.box(-0.5, 2.0, 0, 6.0, 2.6, 2.44, { soft: 0.04, grain: 'y' }); k.mat('rust'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(-0.5 + sx * 2.95, 2.0, sz * 1.17, 0.16, 2.66, 0.16);
      k.mat('dark'); g.tube([[-3.0, 3.95, -0.4], [0.2, 3.95, -0.4]], 0.6, { sides: k.n(12), caps: true }); g.mat('corrugated', { tint: '#a8584a' }); g.box(1.4, 3.9, 0.3, 1.9, 1.2, 1.6, { soft: 0.05 });
      if (k.mid) { k.mat('rubber'); for (const x of [-2.6, -0.6, 1.5]) g.tube([[x, 0.65, -1.5], [x, 3.4, -1.3], [x, 3.6, 0], [x, 3.4, 1.3], [x, 0.65, 1.5]], 0.035, { sides: 5 }); }
      // moss and what grows in it, on everything that faces up
      g.mat('moss', { flags: LR.FLAG.SWAY, weight: 0.3 }); for (const [x, y, z, r] of [[-2.2, 3.35, 0.6, 0.5], [0.9, 3.4, -0.7, 0.42], [1.6, 4.55, 0.2, 0.4], [-3.4, 0.75, 0.9, 0.36], [3.2, 0.75, -1.0, 0.4]]) g.blob(x, y, z, r, { squash: [1.3, 0.5, 1.2], seg: k.n(8), rings: 4, seed: x * 9 });
      k.mat('dark'); g.box(-2.6, 5.5, 0.6, 0.12, 0.6, 0.12);
    });
    k.bone('radar', (g) => { k.mat('rust'); g.box(0, 0.5, 0, 1.5, 0.4, 0.12, { soft: 0.2 }); k.mat('dark'); g.box(0, 0.2, 0, 0.14, 0.4, 0.14); });
    for (const n of ['chain_L', 'chain_R']) { const e = k.S.extras.find((q) => q.name === n); k.bone(n, (g) => { g.mat('iron', { tint: '#6a5a4c' }); g.tube([[0, 0, 0], [0, e.len, 0]], 0.04, { sides: 5 }); k.mat('rust'); g.box(0, e.len, 0, 0.26, 0.3, 0.16, { soft: 0.3 }); }); }
    k.bone('neck_01', (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, 0.9, 0]], 0.3, { sides: k.n(10), caps: true }); });
    k.bone('head', (g) => { k.mat('frame'); k.loft('x', [[-0.4, 0.5, 0.95, 0, 0, 5], [0.5, 0.6, 1.05, 0, 0, 5], [1.25, 0.42, 0.9, -0.1, 0, 4]], { sides: 12 }); k.mat('dark'); g.box(1.22, -0.05, 0, 0.14, 0.34, 1.5, { soft: 0.3 }); k.mat('rust'); g.box(0.4, 0.62, 0, 1.5, 0.08, 2.0, { soft: 0.2 }); });
    for (const s of [-1, 1]) k.lamp('head', { name: 'eye', at: [1.3, -0.05, s * 0.48], dir: [0.96, -0.26, s * 0.08], color: [1.0, 0.62, 0.2], power: 22, cone: 14, range: 70, lens: 0.17, proud: 0.02 });
    k.lamp('body', { at: [-4.95, 0.1, 0], dir: [-1, 0, 0], color: [1, 0.12, 0.06], power: 0.8, range: 9, lens: 0.1, glow: 0.8 });
  },
  // 마루: a deck of girders as long as a street, a station on it gone to ruin and moss, a prow with two great eyes
  ridge(k) {
    k.limbs({ style: 'girder' });
    k.bone('body', (g) => {
      // the deck truss: two box girders, cross frames at every hip, a plated deck
      k.mat('frame'); for (const s of [-1, 1]) g.box(0, -2.2, s * 8.2, 52, 3.4, 2.2, { soft: 0.05, grain: 'x' }); for (const x of [18, 6, -6, -18]) { g.box(x, -2.2, 0, 3.4, 3.0, 18.4, { soft: 0.05 }); for (const s of [-1, 1]) g.box(x, -1.6, s * 9.6, 4.6, 4.6, 1.6, { soft: 0.1 }); }
      if (k.mid) { k.mat('rust'); for (let x = -23; x <= 23; x += 5.8) for (const s of [-1, 1]) { g.beam([x, -3.8, s * 7.2], [x + 2.9, -0.6, s * 7.2], 0.4, 0.4, { caps: false }); g.beam([x + 2.9, -0.6, s * 7.2], [x + 5.8, -3.8, s * 7.2], 0.4, 0.4, { caps: false }); } }
      k.mat('rust'); g.box(0, -0.35, 0, 54, 0.5, 19.6, { soft: 0.03 });
      // the station: a long house in three steps, panelled in concrete, with rows of windows (some still lit after dark)
      const house = (x, y, z, sx, sy, sz, seed) => { k.mat('shell', { seed }); g.box(x, y + sy / 2, z, sx, sy, sz, { soft: 0.03, ao: [0.6, 1] }); k.mat('dark'); g.box(x, y + sy + 0.2, z, sx + 0.8, 0.4, sz + 0.8, { soft: 0.1 });
        const rows = Math.floor(sy / 3.2), cols = Math.floor(sx / 3.4); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (const s of [-1, 1]) { const wx = x - sx / 2 + (c + 0.5) * (sx / cols), wy = y + 1.9 + r * 3.2; g.mat('glass', { flags: LR.FLAG.WINDOW, seed: (seed * 31 + r * 7 + c * 13 + (s > 0 ? 5 : 0)) & 255 }); g.quad([wx - 1.0, wy - 0.8, z + s * (sz / 2 + 0.04)], [wx + 1.0, wy - 0.8, z + s * (sz / 2 + 0.04)], [wx + 1.0, wy + 0.8, z + s * (sz / 2 + 0.04)], [wx - 1.0, wy + 0.8, z + s * (sz / 2 + 0.04)], { hint: [0, 0, s] }); } };
      house(-4, 0, -1, 30, 9.8, 11, 3); house(-9, 9.8, -1.5, 17, 6.6, 8.5, 5); house(9, 0, 5.2, 8, 6.4, 6.4, 7); house(-15, 16.4, -1.5, 6, 4, 6, 9);
      // tanks, a crane jib long since stuck, the foot of the mast
      k.mat('rust'); for (const [x, z] of [[19, -5], [19, -1.2], [22.6, -3]]) { g.tube([[x, 0, z], [x, 6.4, z]], 1.7, { sides: k.n(14), caps: true }); } g.tube([[15, 2.2, 6.5], [23.5, 2.2, 6.5]], 1.9, { sides: k.n(14), caps: true });
      k.mat('frame'); g.beam([-22, 0, 6], [-22, 9, 6], 1.0, 1.0); g.beam([-22, 9, 6], [-33, 12.5, 7.5], 0.7, 0.9); g.mat('iron', { tint: '#5a5550' }); g.tube([[-33, 12.4, 7.5], [-33, 5.5, 7.5]], 0.07, { sides: 4 }); k.mat('rust'); g.box(-33, 5.2, 7.5, 0.9, 0.8, 0.6, { soft: 0.3 });
      k.mat('frame'); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.beam([-14 + sx * 1.6, 0, 2 + sz * 1.6], [-14 + sx * 0.9, 16.2, 2 + sz * 0.9], 0.3, 0.3, { caps: false });
      // rails round the deck, what hangs under it
      if (k.mid) { g.mat('iron', { tint: '#6a6660' }); for (const s of [-1, 1]) { g.tube([[-26.8, 1.1, s * 9.6], [26.8, 1.1, s * 9.6]], 0.05, { sides: 4 }); for (let x = -26; x <= 26; x += 4) g.tube([[x, 0, s * 9.6], [x, 1.1, s * 9.6]], 0.05, { sides: 4 }); } }
      k.mat('dark'); for (const [x, z, r, h] of [[2, 0, 2.6, 3.2], [-12, -3, 1.8, 2.4], [12, 3, 1.5, 2]]) g.tube([[x, -4, z], [x, -4 - h, z]], [r, r * 0.8], { sides: k.n(12), caps: true });
      // forty years of growth: moss banks along every edge, brush on the roofs
      g.mat('moss', { flags: LR.FLAG.SWAY, weight: 0.25 }); const rr = LR.rng('ridge-moss'); for (let i = 0; i < (k.lod === 0 ? 46 : k.lod === 1 ? 24 : 10); i++) { const top = rr() < 0.4, x = -25 + rr() * 50, z = top ? -6 + rr() * 9 : (rr() < 0.5 ? -1 : 1) * (7 + rr() * 2.4), y = top ? (Math.abs(x + 4) < 15 && z < 4.4 ? (Math.abs(x + 9) < 8.5 && z < 2.7 ? 16.6 : 10) : 0.1) : 0.1; g.blob(x, y + 0.3, z, 0.9 + rr() * 1.5, { squash: [1.4, 0.45 + rr() * 0.5, 1.3], seg: k.n(8), rings: 4, seed: i }); }
    });
    k.bone('neck_01', (g) => { k.mat('frame'); g.tube([[0, 0, 0], [0, 3.2, 0]], [2.2, 1.8], { sides: k.n(12), caps: true }); });
    // the prow: a hooded block that turns, two eyes under the hood
    k.bone('head', (g) => { k.mat('frame'); k.loft('x', [[-3, 2.2, 5.2, 0, 0, 5], [1.5, 2.6, 5.6, 0, 0, 5], [5.5, 1.9, 4.6, -0.3, 0, 4]], { sides: 14 }); k.mat('rust'); g.box(3.6, 2.5, 0, 6.4, 0.5, 11.6, { soft: 0.1 }); k.mat('dark'); for (const s of [-1, 1]) { g.push(new THREE.Matrix4().makeTranslation(5.2, -0.4, s * 2.5).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2 - 0.2))); g.lathe(0, 0, [[1.25, -0.9], [1.4, 0], [1.3, 0.7]], { sides: k.n(14) }); g.pop(); } });
    for (const s of [-1, 1]) k.lamp('head', { name: 'eye', at: [5.75, -0.55, s * 2.5], dir: [0.95, -0.3, s * 0.03], color: [1.0, 0.86, 0.62], power: 150, cone: 10, range: 360, lens: 1.05, proud: 0.05 });
    for (const [x, y, z] of [[26.8, 0.6, -9.4], [26.8, 0.6, 9.4], [-26.8, 0.6, -9.4], [-26.8, 0.6, 9.4]]) k.lamp('body', { at: [x, y, z], dir: [Math.sign(x), 0, 0], color: [1, 0.1, 0.05], power: 6, range: 30, lens: 0.3, glow: 0.9 });
    for (const x of [-18, -6, 6, 18]) for (const s of [-1, 1]) k.lamp('body', { at: [x, -4.1, s * 9.3], dir: [0, -1, 0], color: [1, 0.6, 0.22], power: 5, range: 30, lens: 0.34, glow: 0.6 });
    k.bone('mast', (g) => { k.mat('frame'); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.beam([sx * 0.9, 0, sz * 0.9], [sx * 0.25, 22, sz * 0.25], 0.22, 0.22, { caps: false }); if (k.mid) for (let y = 0; y < 22; y += 2.75) { const w0 = 0.9 - (0.65 * y) / 22, w1 = 0.9 - (0.65 * (y + 2.75)) / 22; for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) g.beam([a[0] * w0, y, a[1] * w0], [b[0] * w1, y + 2.75, b[1] * w1], 0.1, 0.1, { caps: false }); } k.mat('rust'); g.box(0, 18.5, 0, 4.6, 0.3, 0.5); g.box(0, 14.5, 0, 0.5, 0.3, 3.8); });
    k.lamp('mast', { at: [0, 22.2, 0], dir: [0, 1, 0], color: [1, 0.1, 0.05], power: 8, range: 40, lens: 0.3, glow: 1 });
    for (const e of k.S.extras) if (e.name.startsWith('cable')) k.bone(e.name, (g) => { g.mat('iron', { tint: '#3e3a36' }); g.tube([[0, 0, 0], [0, e.len * 0.5, 0], [0, e.len, 0]], 0.09, { sides: k.n(5) }); k.mat('rust'); g.box(0, e.len, 0, 0.7, 1.0, 0.5, { soft: 0.3 }); });
  },
};
