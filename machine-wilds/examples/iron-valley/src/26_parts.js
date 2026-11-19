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
      // what is left of its livery: a band of faded teal round the middle shell, unit marks stencilled fore and aft, a dark line where shells meet
      k.mat('accent'); k.loft('x', [[-0.55, 1.245, 1.69, 0.08, 0, 3], [0.55, 1.245, 1.69, 0.08, 0, 3]], { sides: 18, from: -0.6 * Math.PI, to: 0.6 * Math.PI, caps: false });
      k.mat('dark'); for (const x of [-1.85, 1.95]) k.loft('x', [[x - 0.09, 1.0, 1.44, 0.06, 0, 3], [x + 0.09, 1.0, 1.44, 0.06, 0, 3]], { sides: 18, from: -0.6 * Math.PI, to: 0.6 * Math.PI, caps: false });
      if (k.mid) { k.mat('dark'); for (const s of [-1, 1]) for (const [x, w] of [[3.1, 0.5], [3.75, 0.22], [4.1, 0.22], [-3.3, 0.5], [-3.95, 0.22]]) g.box(x, 0.36, s * 1.385, w, 0.34, 0.03, {}); }
      // the girders the hips bolt to, and the ribs between them
      k.mat('frame'); for (const [x, hz] of [[3.2, 1.5], [-3.5, 1.7]]) { g.box(x, -0.95, 0, 1.25, 0.8, hz * 2 + 0.5, { soft: 0.2 }); for (const s of [-1, 1]) { g.box(x, -0.55, s * hz * 0.6, 0.9, 0.9, 0.24, { soft: 0.2 }); if (k.fine) k.bolts('x', [x + 0.63, -0.95, s * hz], 0.3, 8, 0.035); } }
      if (k.mid) for (let x = -2.6; x <= 2.4; x += 1.25) g.box(x, -0.85, 0, 0.14, 0.62, 2.1, { soft: 0.2 });
      // under the keel: a sensor drum on a short neck
      k.mat('joint'); k.ycyl(-1.7, -1.15, 0.6, 0, 0.42, 0.5, { sides: 14 }); k.mat('dark'); k.ball(0.6, -1.95, 0, 0.55, { squash: [1, 0.7, 1] });
      // the counterweight boom: it balances the neck
      k.mat('dark'); g.tube([[-5.6, -0.1, 0], [-7.4, 0.25, 0], [-8.6, 0.42, 0]], [0.36, 0.26, 0.2], { sides: k.n(10), caps: true }); k.mat('rust'); g.box(-8.5, 0.42, 0, 1.1, 0.7, 0.9, { soft: 0.3 }); k.mat('joint'); g.box(-7.2, 0.2, 0, 0.3, 0.8, 0.8, { soft: 0.3 });
      // ── what keeps it walking, bolted on wherever there was room ──
      // the hydraulic pack under the keel: accumulators either side, the pump and its cooler between, a main along each flank, a line down to every hip
      for (const s of [-1, 1]) for (const x of [-1.95, 0.4]) k.tank([x, -1.3, s * 0.64], [x + 1.75, -1.3, s * 0.64], 0.24, { role: s < 0 ? 'frame' : 'rust', up: [0, -1, 0] });
      k.mat('joint'); g.box(-2.5, -1.32, 0, 0.7, 0.46, 0.8, { soft: 0.2 }); k.fins([-1.75, -1.44, 0], [1, 0, 0], 14, 0.26, 0.6, 0.07, { up: [0, 0, 1] });
      for (const s of [-1, 1]) { k.pipe([[-3.4, -1.0, s * 1.0], [-1.0, -1.1, s * 1.03], [1.6, -1.08, s * 1.0], [3.1, -0.98, s * 0.94]], 0.07, { joints: [1, 2] });
        k.hose([[3.1, -0.98, s * 0.94], [3.4, -1.5, s * 1.2], [3.25, -1.36, s * 1.6]], 0.05); k.hose([[-3.4, -1.0, s * 1.0], [-3.7, -1.52, s * 1.3], [-3.55, -1.38, s * 1.8]], 0.05); k.hose([[-2.3, -1.1, s * 0.42], [-2.1, -1.5, s * 0.8], [-1.6, -1.12, s * 1.0]], 0.04);
        // louvres in the keel's flank, a junction box on each hip girder
        k.grille([0.95, -0.62, s * 1.135], [0, 0, s], 1.3, 0.32, { up: [0, 1, 0] }); k.grille([-1.2, -0.62, s * 1.135], [0, 0, s], 0.9, 0.32, { up: [0, 1, 0] });
        for (const [x, hz] of [[3.2, 1.5], [-3.5, 1.7]]) k.jbox([x + 0.63, -0.86, s * hz * 0.45], [1, 0, 0], 0.42, 0.3, 0.14, { up: [0, 1, 0], glands: 3 }); }
      // on the back: service hatches in each shell, a rail along the spine, a ladder up the left flank at the seam
      k.hatch([-3.4, 1.075, -0.42], [0, 1, 0], 0.9, 0.6, { up: [1, 0, 0], role: 'joint' }); k.hatch([1.15, 1.27, 0.45], [0, 1, 0], 0.8, 0.56, { up: [1, 0, 0], role: 'joint' }); k.hatch([3.5, 1.055, -0.4], [0, 1, 0], 0.9, 0.6, { up: [1, 0, 0], role: 'joint' });
      for (const pts of [[[-4.7, 1.0, 0.56], [-3.4, 1.07, 0.6], [-2.1, 1.02, 0.58]], [[-1.5, 1.2, 0.68], [0, 1.29, 0.72], [1.6, 1.2, 0.68]], [[2.3, 1.0, 0.56], [3.5, 1.05, 0.6], [4.8, 0.96, 0.52]]]) k.rail(pts, 0.55, [0, 1, 0], { role: 'dark' });
      k.ladder([-1.85, -1.38, -1.56], [-1.85, 0.72, -1.56], 0.42, [0, 0, -1], { off: 0.16, role: 'dark' });
      // two stacks at the stern, a dish and two whips amidships, a dome forward
      k.stack([-4.6, 0.92, -0.5], [-4.78, 1.78, -0.52], 0.11); k.stack([-4.55, 0.94, 0.05], [-4.7, 1.5, 0.05], 0.085);
      k.dish([-0.95, 1.28, -0.55], [0.25, 1, -0.3], 0.34);
      if (k.mid) { k.mat('dark'); for (const [x, z, h] of [[-1.25, 0.22, 1.5], [-1.5, -0.1, 1.05]]) g.tube([[x, 1.27, z], [x - 0.08, 1.27 + h, z + 0.03]], [0.022, 0.007], { sides: 5 }); g.mat('ceramic', { tint: '#cfd0cb' }); g.blob(2.9, 1.1, 0.0, 0.2, { amp: 0, squash: [1, 0.6, 1], seg: k.n(10), rings: 5 }); }
      // the counterweight is slabs on four through bolts
      if (k.mid) { k.mat('dark'); for (const x of [-8.78, -8.5, -8.22]) g.box(x, 0.42, 0, 0.03, 0.73, 0.93, {}); for (const sy of [-1, 1]) for (const sz of [-1, 1]) k.pipe([[-9.12, 0.42 + sy * 0.24, sz * 0.3], [-7.9, 0.42 + sy * 0.24, sz * 0.3]], 0.035, { flange: false, sides: 6 }); }
      // a towing eye at the stem
      if (k.fine) { k.mat('steel'); const R = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 2; R.push([5.78 + Math.cos(a) * 0.13, -0.15 + Math.sin(a) * 0.13, 0]); } g.tube(R, 0.03, { sides: 5 }); }
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
      k.mat('accent'); k.loft('x', [[0.2, 0.615, 0.625, 0.1, 0, 3], [0.5, 0.612, 0.62, 0.1, 0, 3]], { sides: 14, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
      // the great lens in a hood under the brow, two small eyes beside it
      k.mat('joint'); g.push(new THREE.Matrix4().makeRotationZ(-Math.PI / 2 - 0.24)); g.lathe(0.36, 0, [[0.44, -1.52], [0.5, -1.2], [0.46, -0.9]], { sides: k.n(14) }); g.pop();
      // round the lens a ring of studs; pods, louvres and a hatch; cables back to the neck; the hinge of the bill
      k.along([1.2, -0.355, 0], [0.97, -0.24, 0], () => { k.mat('steel'); k.bolts('y', [0, 0, 0], 0.475, 12, 0.024, { h: 0.05 }); });
      for (const s of [-1, 1]) { k.mat('dark'); g.tube([[0.25, -0.02, s * 0.6], [0.72, -0.04, s * 0.64]], 0.105, { sides: k.n(8), caps: true }); k.mat('joint'); g.tube([[0.72, -0.04, s * 0.64], [0.78, -0.04, s * 0.645]], 0.12, { sides: k.n(8), caps: true });
        k.grille([-0.32, 0.22, s * 0.585], [0, 0.15, s], 0.46, 0.2, { up: [0, 1, 0] }); k.hose([[-0.7, -0.12, s * 0.2], [-1.0, -0.36, s * 0.22], [-1.12, -0.72, s * 0.2]], 0.035); }
      k.hatch([0.36, 0.703, 0], [0, 1, 0], 0.5, 0.4, { up: [1, 0, 0], role: 'joint' });
      if (k.mid) { k.mat('dark'); g.box(-0.3, 0.83, 0, 0.5, 0.26, 0.03, { soft: 0.3 }); g.tube([[-0.5, 0.68, 0.3], [-0.62, 1.5, 0.32]], [0.016, 0.006], { sides: 4 }); k.mat('joint'); k.zcyl(-0.27, 0.27, 1.16, -0.06, 0.085, { sides: 8 }); }
    });
    k.lamp('head', { name: 'search', at: [1.22, -0.36, 0], dir: [0.97, -0.24, 0], color: [0.72, 0.9, 1.0], power: 90, cone: 8, range: 170, lens: 0.36, proud: 0.08 });
    for (const s of [-1, 1]) k.lamp('head', { at: [0.95, 0.2, s * 0.5], dir: [0.8, 0, s * 0.6], color: [0.25, 0.85, 1.0], power: 0.8, range: 10, lens: 0.1, glow: 0.7 });
    // what trails: two feelers under the bill, a whip mast on the tail with a light at its tip
    for (const e of k.S.extras) k.bone(e.name, (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, e.len * 0.5, 0], [0, e.len, 0]], e.name === 'mast' ? [0.07, 0.045, 0.02] : [0.045, 0.03, 0.012], { sides: k.n(6), caps: true }); });
    k.lamp('mast', { at: [0, 5.15, 0], dir: [0, 1, 0], color: [1, 0.18, 0.08], power: 0.7, range: 10, lens: 0.07, glow: 0.9 });
  },
  // 솔개: a keel no longer than a car, wings of two parts with slats for feathers, a fan for a tail (the blades weathered plate, only the leading one of each wing and the back still pale), an eye under a hooked brow.
  // (a wing bone: X the leading edge's way (forward), Y out along the wing, Z up on the left wing and down on the right)
  kite(k) {
    k.bone('body', (g) => {
      k.mat('dark'); k.loft('x', [[-1.7, 0.1, 0.12, 0, 0, 3], [-0.9, 0.24, 0.3, 0, 0, 3], [0.2, 0.3, 0.4, 0, 0, 3], [1.0, 0.24, 0.3, 0.03, 0, 3], [1.35, 0.14, 0.16, 0.08, 0, 3]], { sides: 12 });
      k.mat('shell'); k.loft('x', [[-1.3, 0.2, 0.26, 0.06, 0, 3], [-0.4, 0.32, 0.42, 0.08, 0, 3], [0.5, 0.33, 0.43, 0.08, 0, 3], [1.15, 0.2, 0.26, 0.1, 0, 3]], { sides: 12, from: -0.6 * Math.PI, to: 0.6 * Math.PI, caps: false });
      k.mat('accent'); k.loft('x', [[-0.12, 0.345, 0.45, 0.085, 0, 3], [0.12, 0.345, 0.45, 0.085, 0, 3]], { sides: 12, from: -0.6 * Math.PI, to: 0.6 * Math.PI, caps: false });
      // the shoulders: a drum either side for the wing to turn on, a spar through the keel between them
      k.mat('joint'); for (const s of [-1, 1]) k.xcyl(0.02, 0.48, 0.22, s * 0.42, 0.16, { sides: 10 }); k.mat('steel'); g.tube([[0.25, 0.22, -0.5], [0.25, 0.22, 0.5]], 0.06, { sides: 6 });
      // an aerial, louvres either side, two nozzles at the stern, a hatch in the back
      if (k.mid) { k.mat('dark'); g.box(-0.3, 0.5, 0, 0.42, 0.2, 0.02, { soft: 0.3 }); for (const s of [-1, 1]) { k.grille([0.32, 0.0, s * 0.405], [0, -0.1, s], 0.4, 0.12, { up: [0, 1, 0] }); k.along([-1.52, -0.02, s * 0.1], [-1, 0, 0], (g2) => { k.mat('joint'); g2.lathe(0, 0, [[0.06, 0], [0.095, 0.16], [0.075, 0.24]], { sides: k.n(8) }); }); }
        k.hatch([-0.7, 0.385, 0], [0, 1, 0], 0.36, 0.26, { up: [1, 0, 0], role: 'joint' }); k.rivets([-1.1, 0.3, 0.2], [1.0, 0.33, 0.24], 12, 0.012, [0, 0.8, 0.6]); k.rivets([-1.1, 0.3, -0.2], [1.0, 0.33, -0.24], 12, 0.012, [0, 0.8, -0.6]); }
      // feet it never uses, folded under
      if (k.mid) { k.mat('dark'); for (const s of [-1, 1]) { g.tube([[-0.2, -0.26, s * 0.2], [-0.7, -0.42, s * 0.24], [-1.0, -0.36, s * 0.24]], 0.04, { sides: 5 }); g.box(-1.08, -0.37, s * 0.24, 0.22, 0.05, 0.16, { soft: 0.3 }); } }
    });
    for (const [side, n1, n2] of [[-1, 'wing_L1', 'wing_L2'], [1, 'wing_R1', 'wing_R2']]) { const up = -side;      // which way this wing's Z is up
      k.bone(n1, (g) => { k.mat('joint'); k.xcyl(-0.24, 0.24, 0, 0, 0.15, { sides: 10 }); k.mat('dark'); g.tube([[0.12, 0.1, 0], [0.16, 2.1, 0]], [0.075, 0.055], { sides: k.n(8), caps: true });
        // the inner wing: a panel behind the spar, ribs under it
        k.mat('shell'); g.poly([[0.2, 0.16, up * 0.03], [0.24, 2.08, up * 0.03], [-0.95, 2.02, up * 0.0], [-1.1, 0.22, up * -0.02]], { hint: [0, 0, up], two: true }); k.mat('accent'); g.poly([[0.21, 1.5, up * 0.035], [0.235, 1.85, up * 0.035], [-0.96, 1.8, up * 0.005], [-0.99, 1.46, up * 0.004]], { hint: [0, 0, up], two: true });
        if (k.mid) { k.mat('dark'); for (const y of [0.5, 1.1, 1.7]) g.box(-0.4, y, -up * 0.03, 1.25, 0.035, 0.05, {}); } k.mat('joint'); k.xcyl(-0.2, 0.3, 2.1, 0, 0.11, { sides: 8 }); if (k.mid) { k.mat('joint'); g.box(-0.3, 0.26, up * 0.06, 0.3, 0.3, 0.08, { soft: 0.2 }); k.pipe([[-0.3, 0.4, up * 0.085], [-0.52, 1.62, up * 0.06]], 0.018, { flange: false, sides: 5 }); k.rivets([0.12, 0.3, up * 0.045], [0.16, 2.0, up * 0.045], 10, 0.014, [0, 0, up]); k.rivets([-0.9, 0.34, up * 0.02], [-0.86, 1.96, up * 0.025], 10, 0.012, [0, 0, up]); k.hose([[0.0, 0.1, -up * 0.06], [-0.05, 1.0, -up * 0.07], [0.0, 2.0, -up * 0.05]], 0.016); } });
      k.bone(n2, (g) => { k.mat('dark'); g.tube([[0.14, 0, 0], [0.02, 2.2, 0]], [0.05, 0.022], { sides: k.n(7), caps: true });
        // five slats for primaries, fanned from the wrist, each its own blade
        const N = k.lod === 2 ? 3 : 5; for (let i = 0; i < N; i++) { const f = i / (N - 1), a = 0.1 + f * 1.15, len = 2.35 - f * 0.75, y0 = 0.1 + (1 - f) * 0.5, c = Math.cos(a), sn = Math.sin(a), ax = [-sn, c], px = [c, sn], w = 0.2;
          const P = (al, ac) => [0.08 + ax[0] * al + px[0] * ac, y0 + ax[1] * al + px[1] * ac, up * (0.02 - 0.012 * i)]; if (i === 0) g.mat('ceramic', { tint: '#dcdedb' }); else g.mat(i % 2 ? 'rustplate' : 'paintmetal', { tint: i % 2 ? '#b3a797' : '#77847f' });      /* the leading blade is still pale; the rest are plate that has weathered */ g.poly([P(0, w), P(len * 0.85, w * 0.8), P(len, 0), P(len * 0.85, -w * 0.7), P(0, -w)], { hint: [0, 0, up], two: true }); } });
    }
    k.bone('tail', (g) => { k.mat('joint'); g.tube([[0, 0, 0], [0, 0.3, 0]], 0.1, { sides: 8, caps: true }); const N = k.lod === 2 ? 3 : 5; for (let i = 0; i < N; i++) { const a = (i / (N - 1) - 0.5) * 1.0, c = Math.cos(a), sn = Math.sin(a), len = 1.5 - Math.abs(a) * 0.4;
        g.mat(i % 2 ? 'rustplate' : 'paintmetal', { tint: i % 2 ? '#b3a797' : '#77847f' }); g.poly([[sn * 0.2 - c * 0.13, 0.2 * c + sn * 0.13 * 0 + 0.1, 0.01 * i], [sn * len - c * 0.16, c * len + 0.1, 0.01 * i], [sn * len + c * 0.16, c * len + 0.1, 0.01 * i], [sn * 0.2 + c * 0.13, 0.2 * c + 0.1, 0.01 * i]], { two: true }); } });
    k.bone('streamer', (g) => { k.mat('accent'); g.tube([[0, 0, 0], [0, 0.9, 0], [0, 1.8, 0]], [0.03, 0.02, 0.008], { sides: 5 }); });
    k.bone('neck_01', (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, 0.5, 0]], [0.14, 0.11], { sides: k.n(8), caps: true }); });
    k.bone('head', (g) => { k.mat('dark'); k.loft('x', [[-0.2, 0.14, 0.16, 0, 0, 3], [0.2, 0.2, 0.2, 0, 0, 3], [0.55, 0.13, 0.12, -0.03, 0, 3]], { sides: 10 }); k.mat('shell'); k.loft('x', [[-0.18, 0.17, 0.2, 0.03, 0, 3], [0.25, 0.23, 0.23, 0.04, 0, 3], [0.6, 0.1, 0.1, 0.02, 0, 3]], { sides: 10, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
      k.mat('dark'); g.tube([[0.52, -0.02, 0], [0.84, -0.06, 0], [0.92, -0.2, 0]], [0.06, 0.035, 0.008], { sides: 6 }); });
    k.lamp('head', { name: 'eye', at: [0.3, -0.19, 0], dir: [0.62, -0.78, 0], color: [0.78, 0.92, 1.0], power: 30, cone: 7, range: 120, lens: 0.11, proud: 0.02 });
    k.lamp('wing_L2', { at: [0.04, 2.18, 0], dir: [0, 1, 0], color: [1, 0.08, 0.05], power: 0.9, range: 9, lens: 0.05, glow: 0.9 }); k.lamp('wing_R2', { at: [0.04, 2.18, 0], dir: [0, 1, 0], color: [0.1, 1, 0.3], power: 0.9, range: 9, lens: 0.05, glow: 0.9 });
  },
  // 물떼새: the walker's own machine.  A pod between two hips, a counterweight boom behind, a short neck and a head that is mostly
  // lamp; a bedroll, a canister and a whip aerial — somebody lives on it
  plover(k) {
    k.limbs({ style: 'shell' });
    k.bone('body', (g) => {
      k.mat('dark'); k.loft('x', [[-0.52, 0.1, 0.12, 0.02, 0, 4], [-0.3, 0.19, 0.22, 0, 0, 4], [0.2, 0.2, 0.23, 0, 0, 4], [0.46, 0.13, 0.15, 0.04, 0, 4]], { sides: 14 });
      k.mat('shell'); k.loft('x', [[-0.44, 0.14, 0.2, 0.05, 0, 3], [-0.2, 0.24, 0.27, 0.06, 0, 3], [0.2, 0.25, 0.28, 0.06, 0, 3], [0.44, 0.15, 0.2, 0.06, 0, 3]], { sides: 14, from: -0.6 * Math.PI, to: 0.6 * Math.PI, caps: false });
      k.mat('accent'); k.loft('x', [[-0.05, 0.262, 0.292, 0.06, 0, 3], [0.07, 0.262, 0.292, 0.06, 0, 3]], { sides: 14, from: -0.58 * Math.PI, to: 0.58 * Math.PI, caps: false });
      // the hip girder, its end caps; the counterweight boom
      k.mat('frame'); g.box(0, -0.1, 0, 0.26, 0.16, 0.62, { soft: 0.2 }); if (k.fine) for (const s of [-1, 1]) k.bolts('z', [0, -0.1, s * 0.31], 0.06, 6, 0.008, { dir: s });
      k.mat('dark'); g.tube([[-0.46, 0.02, 0], [-0.74, 0.07, 0], [-0.92, 0.1, 0]], [0.07, 0.05, 0.04], { sides: k.n(8), caps: true }); k.mat('rust'); g.box(-0.9, 0.1, 0, 0.16, 0.13, 0.17, { soft: 0.3 });
      // what it carries and what keeps it going
      k.tank([-0.34, -0.2, 0.12], [0.1, -0.2, 0.12], 0.055, { role: 'rust', up: [0, -1, 0], straps: 2 }); k.tank([-0.3, -0.2, -0.12], [0.06, -0.2, -0.12], 0.045, { role: 'frame', up: [0, -1, 0], straps: 1, gauge: false });
      for (const s of [-1, 1]) { k.hose([[0.12, -0.2, s * 0.12], [0.1, -0.24, s * 0.2], [0.02, -0.16, s * 0.27]], 0.012); k.grille([0.16, -0.02, s * 0.228], [0, 0, s], 0.22, 0.07, { up: [0, 1, 0] }); k.rivets([-0.36, 0.2, s * 0.2], [0.36, 0.21, s * 0.2], 9, 0.006, [0, 0.8, s * 0.6]); }
      k.hatch([-0.2, 0.3, 0], [0, 1, 0], 0.2, 0.16, { up: [1, 0, 0], role: 'joint' }); k.stack([-0.4, 0.2, -0.1], [-0.44, 0.42, -0.11], 0.022);
      g.mat('cloth', { tint: '#6f6a55' }); g.tube([[-0.34, 0.27, -0.2], [-0.34, 0.27, 0.2]], 0.065, { sides: k.n(8), caps: true }); if (k.mid) { k.mat('rubber'); for (const z of [-0.12, 0.12]) g.tube([[-0.34, 0.2, z], [-0.27, 0.27, z], [-0.34, 0.34, z], [-0.41, 0.27, z], [-0.34, 0.2, z]], 0.008, { sides: 4 }); }
      if (k.mid) { k.mat('dark'); g.tube([[0.1, 0.3, 0.16], [0.1, 0.38, 0.16], [0.3, 0.36, 0.16], [0.3, 0.28, 0.16]], 0.009, { sides: 5 }); }      // a grab rail
    });
    k.neckLinks({ width: 0.16, style: 'shell' });
    k.bone('head', (g) => {
      k.mat('dark'); k.loft('x', [[-0.14, 0.07, 0.08, 0, 0, 4], [-0.02, 0.1, 0.11, 0.01, 0, 4], [0.2, 0.1, 0.105, 0.01, 0, 4], [0.3, 0.075, 0.08, 0, 0, 4]], { sides: 12 });
      k.mat('shell'); k.loft('x', [[-0.13, 0.08, 0.1, 0.02, 0, 3], [0.02, 0.125, 0.135, 0.03, 0, 3], [0.2, 0.12, 0.125, 0.03, 0, 3], [0.32, 0.07, 0.09, 0.03, 0, 3]], { sides: 12, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
      k.mat('joint'); k.along([0.31, -0.01, 0], [1, -0.06, 0], (g2) => { g2.lathe(0, 0, [[0.062, -0.02], [0.074, 0.01], [0.066, 0.035]], { sides: k.n(12) }); }); if (k.fine) { k.mat('dark'); g.tube([[-0.05, 0.15, 0.05], [-0.07, 0.3, 0.055]], [0.005, 0.002], { sides: 4 }); for (const s of [-1, 1]) k.hose([[-0.13, -0.04, s * 0.05], [-0.2, -0.12, s * 0.055], [-0.22, -0.24, s * 0.05]], 0.008); }
    });
    k.lamp('head', { name: 'torch', at: [0.325, -0.012, 0], dir: [0.985, -0.17, 0], color: [1.0, 0.9, 0.72], power: 16, cone: 17, range: 60, lens: 0.06, proud: 0.012 });
    for (const s of [-1, 1]) k.lamp('head', { at: [0.2, 0.06, s * 0.118], dir: [0.5, 0, s], color: [1, 0.5, 0.14], power: 0.3, range: 4, lens: 0.016, glow: 0.7 });
    k.lamp('body', { at: [-0.985, 0.1, 0], dir: [-1, 0, 0], color: [1, 0.12, 0.06], power: 0.06, range: 2, lens: 0.02, glow: 0.6 });
    k.bone('whip', (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, 0.45, 0], [0, 0.9, 0]], [0.012, 0.008, 0.003], { sides: k.n(5), caps: true }); });
  },
  // 자라: a shell first.  A dome of plates the width of a house over a flat hull, a skirt of rust round its rim, scutes bolted on in
  // three rows, forty years of moss on top; four sprawled girder legs come out from under the rim; a blunt head on a short neck
  jara(k) {
    k.limbs({ style: 'girder' });
    k.bone('body', (g) => {
      // the hull and its belly plates
      k.mat('dark'); k.loft('x', [[-5.5, 0.5, 2.1, -0.35, 0, 4], [-3.6, 0.95, 3.5, -0.4, 0, 4], [0, 1.05, 3.9, -0.4, 0, 4], [3.6, 0.95, 3.4, -0.4, 0, 4], [5.5, 0.5, 2.0, -0.3, 0, 4]], { sides: 18 });
      // the carapace: one dome, and the rim that overhangs the legs
      const DOME = [[-5.9, 0.55, 2.7, 0.1, 0, 2.6], [-3.7, 2.2, 4.4, 0.1, 0, 2.6], [0, 2.9, 4.8, 0.1, 0, 2.6], [3.5, 2.3, 4.3, 0.1, 0, 2.6], [5.7, 0.65, 2.5, 0.1, 0, 2.6]];
      k.mat('shell'); k.loft('x', DOME, { sides: 24, from: -0.5 * Math.PI, to: 0.5 * Math.PI, caps: false });
      k.mat('rust'); for (const [f0, f1] of [[0.36 * Math.PI, 0.52 * Math.PI], [-0.52 * Math.PI, -0.36 * Math.PI]]) k.loft('x', DOME.map((q) => [q[0], q[1] * 1.03 + 0.05, q[2] * 1.035 + 0.06, q[3], 0, q[5]]), { sides: 24, from: f0, to: f1, caps: false });
      // scutes: thick plates bolted to the dome in three rows (where the dome is at a point, and which way it faces there)
      const dome = (x, z) => { const hx = x < 0 ? 5.9 : 5.7, e = Math.max(0.02, 1 - (x / hx) ** 2), bz = 4.8 * Math.sqrt(e), by = 2.9 * Math.sqrt(e), y = 0.1 + by * Math.pow(Math.max(0.001, 1 - Math.pow(Math.abs(z) / bz, 2.6)), 1 / 2.6), n = [x / (hx * hx) * 2.9, 1 / 2.9, (z / (4.8 * 4.8)) * 2.9 * 1.5]; return [[x, y, z], n]; };
      for (const [zr, xs, w, h] of [[0, [-3.8, -1.9, 0, 1.9, 3.7], 1.6, 2.0], [2.5, [-3.1, -1.1, 0.9, 2.9], 1.7, 1.6], [-2.5, [-3.1, -1.1, 0.9, 2.9], 1.7, 1.6]]) for (const x of xs) { const [c, n] = dome(x, zr); k.hatch([c[0], c[1] - 0.1, c[2]], n, w, h, { up: [1, 0, 0], role: zr === 0 ? 'shell' : 'rust', t: 0.24 }); }
      // moss, and what grows in it
      g.mat('moss', { tint: '#5e6b4e', flags: LR.FLAG.SWAY, weight: 0.25 }); const rr = LR.rng('jara-moss'); for (let i = 0; i < (k.lod === 0 ? 26 : k.lod === 1 ? 14 : 6); i++) { const x = -4.6 + rr() * 9, z = (rr() - 0.5) * 6.4, c = dome(x, z)[0]; g.blob(c[0], c[1] + 0.12, c[2], 0.5 + rr() * 0.7, { squash: [1.4, 0.4 + rr() * 0.3, 1.3], seg: k.n(8), rings: 4, seed: i }); }
      // the plant: mains under the rim with a line to every hip, tanks slung under the hull, louvres, two stacks through the shell, a ladder and a rail for whoever tended it
      for (const s of [-1, 1]) { k.pipe([[-4.4, -0.5, s * 3.0], [-1.5, -0.55, s * 3.7], [1.5, -0.55, s * 3.7], [4.2, -0.5, s * 2.9]], 0.11, { joints: [1, 2], role: 'rust' }); for (const x of [3.4, -3.4]) k.hose([[x * 0.9, -0.52, s * 3.25], [x, -0.9, s * 3.0], [x, -0.6, s * 2.75]], 0.07);
        k.tank([-2.6, -1.25, s * 1.6], [-0.2, -1.25, s * 1.6], 0.42, { role: 'rust', up: [0, -1, 0] }); k.grille([1.6, -0.45, s * 3.82], [0, 0, s], 1.8, 0.5, { up: [0, 1, 0] }); k.grille([-1.6, -0.45, s * 3.84], [0, 0, s], 1.4, 0.5, { up: [0, 1, 0] });
        k.rivets([-4.6, 0.02, s * 3.5], [4.4, 0.02, s * 3.4], 30, 0.035, [0, 0.4, s]); }
      k.stack([-3.9, 1.9, -1.2], [-4.2, 3.5, -1.3], 0.2); k.stack([-3.9, 1.9, 1.1], [-4.15, 3.1, 1.2], 0.16);
      k.ladder([1.0, -1.1, -4.55], [1.0, 1.0, -4.3], 0.5, [0, 0.2, -1], { off: 0.2, role: 'frame' }); k.rail([[-1.6, 2.9, 0.9], [0, 3.0, 1.0], [1.6, 2.9, 0.9]], 0.9, [0, 1, 0], { role: 'frame' }); k.dish([2.6, 2.55, -1.6], [0.4, 1, -0.4], 0.5);
      k.jbox([5.35, -0.3, 1.0], [1, 0, 0], 0.8, 0.5, 0.2, { up: [0, 1, 0], glands: 3 });
    });
    for (const [x, s] of [[3.6, -1], [3.6, 1], [0, -1], [0, 1], [-3.6, -1], [-3.6, 1]]) k.lamp('body', { at: [x, -0.1, s * 4.05], dir: [0, -0.5, s], color: [1, 0.6, 0.2], power: 2.2, range: 14, lens: 0.14, glow: 0.6 });
    k.lamp('body', { at: [-5.6, -0.2, 0], dir: [-1, 0, 0], color: [1, 0.12, 0.06], power: 2, range: 14, lens: 0.16, glow: 0.8 });
    k.neckLinks({ width: 1.1, style: 'girder' });
    k.bone('head', (g) => { k.mat('frame'); k.loft('x', [[-0.5, 0.5, 0.6, 0, 0, 4], [0.5, 0.62, 0.74, 0, 0, 4], [1.5, 0.44, 0.58, -0.08, 0, 4], [1.9, 0.26, 0.4, -0.14, 0, 3]], { sides: 14 });
      k.mat('rust'); k.loft('x', [[-0.45, 0.56, 0.68, 0.06, 0, 3], [0.5, 0.7, 0.82, 0.08, 0, 3], [1.5, 0.48, 0.62, 0.02, 0, 3]], { sides: 14, from: -0.5 * Math.PI, to: 0.5 * Math.PI, caps: false }); k.mat('dark'); g.box(1.2, -0.42, 0, 1.2, 0.14, 0.9, { soft: 0.3 });
      for (const s of [-1, 1]) { k.along([1.25, 0.05, s * 0.6], [0.75, -0.1, s * 0.65], (g2) => { k.mat('joint'); g2.lathe(0, 0, [[0.2, -0.05], [0.24, 0.04], [0.2, 0.1]], { sides: k.n(12) }); }); k.hose([[-0.5, -0.2, s * 0.3], [-0.9, -0.5, s * 0.34], [-1.0, -0.9, s * 0.3]], 0.05); } k.grille([0.4, 0.1, 0.76], [0, 0, 1], 0.7, 0.3, { up: [0, 1, 0] }); k.grille([0.4, 0.1, -0.76], [0, 0, -1], 0.7, 0.3, { up: [0, 1, 0] }); });
    for (const s of [-1, 1]) k.lamp('head', { name: 'eye', at: [1.32, 0.04, s * 0.67], dir: [0.86, -0.28, s * 0.42], color: [1.0, 0.72, 0.3], power: 20, cone: 13, range: 80, lens: 0.19, proud: 0.03 });
    k.bone('tail', (g) => { k.mat('frame'); g.tube([[0, 0, 0], [0, 1.1, 0], [0, 2.2, 0]], [0.36, 0.22, 0.07], { sides: k.n(8), caps: true }); if (k.mid) { k.mat('rust'); for (const y of [0.3, 0.9, 1.5]) g.box(0, y, 0.2, 0.5 - y * 0.2, 0.3, 0.1, { soft: 0.3 }); } });
  },
  // 가재: a shell of overlapping plates the red of old oxide from a spike of a snout to a jointed tail, eight girder legs under
  // it, two claws carried low in front, feelers, and two eyes on stalks that burn red
  gajae(k) {
    k.limbs({ style: 'girder' });
    k.bone('body', (g) => {
      k.mat('dark'); k.loft('x', [[-4.6, 0.4, 0.8, -0.2, 0, 4], [-2.5, 0.7, 1.35, -0.3, 0, 4], [1.5, 0.8, 1.5, -0.3, 0, 4], [4.2, 0.55, 1.1, -0.2, 0, 4], [5.0, 0.3, 0.6, -0.1, 0, 3]], { sides: 16 });
      // the fore shell and its snout
      const FORE = [[-0.5, 1.15, 1.85, 0.25, 0, 2.6], [1.4, 1.45, 2.05, 0.25, 0, 2.6], [3.4, 1.2, 1.7, 0.22, 0, 2.6], [4.9, 0.55, 0.85, 0.15, 0, 2.6]];
      k.mat('shell'); k.loft('x', FORE, { sides: 20, from: -0.56 * Math.PI, to: 0.56 * Math.PI, caps: false }); k.loft('x', [[4.8, 0.36, 0.5, 0.36, 0, 3], [5.8, 0.2, 0.22, 0.42, 0, 3], [6.9, 0.03, 0.03, 0.5, 0, 3]], { sides: 10 });
      k.mat('accent'); k.loft('x', [[1.25, 1.475, 2.085, 0.25, 0, 2.6], [1.6, 1.47, 2.08, 0.25, 0, 2.6]], { sides: 20, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
      k.mat('rust'); for (const x of [0.2, 2.6]) k.loft('x', [[x - 0.07, 1.36, 2.0, 0.25, 0, 2.6], [x + 0.07, 1.36, 2.0, 0.25, 0, 2.6]], { sides: 20, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
      // five plates down the back, each under the one before
      for (let i = 0; i < 5; i++) { const x0 = -0.35 - i * 0.86, a = 1.18 - i * 0.11, b = 1.78 - i * 0.2, cy = 0.22 - i * 0.02; k.mat(i % 2 ? 'rust' : 'shell'); k.loft('x', [[x0 - 1.0, a * 0.9, b * 0.9, cy, 0, 2.6], [x0 - 0.5, a, b, cy, 0, 2.6], [x0, a * 1.03, b * 1.03, cy, 0, 2.6]], { sides: 18, from: -0.55 * Math.PI, to: 0.55 * Math.PI, caps: false });
        if (k.fine) for (const s of [-1, 1]) k.rivets([x0 - 0.12, cy + a * 0.6, s * b * 0.78], [x0 - 0.12, cy + a * 0.99, s * b * 0.2], 5, 0.03, [0.2, 0.7, s * 0.6]); }
      // under the shell: mains and a line to every hip, tanks, louvres, two short stacks behind the fore shell, spines along its ridge
      for (const s of [-1, 1]) { k.pipe([[-3.6, -0.3, s * 1.2], [-0.5, -0.35, s * 1.5], [2.6, -0.3, s * 1.45], [4.2, -0.2, s * 1.0]], 0.08, { joints: [1, 2], role: 'rust' }); for (const x of [3.3, 1.4, -0.5, -2.4]) k.hose([[x + 0.3, -0.33, s * 1.42], [x + 0.2, -0.7, s * 1.6], [x, -0.42, s * 1.5]], 0.05);
        k.tank([0.2, -1.0, s * 0.62], [2.4, -1.0, s * 0.62], 0.32, { role: 'rust', up: [0, -1, 0] }); k.grille([2.2, 0.0, s * 1.5], [0, -0.1, s], 1.2, 0.36, { up: [0, 1, 0] }); k.stack([-0.1, 1.2, s * 0.7], [-0.3, 2.1, s * 0.75], 0.13); }
      if (k.mid) { k.mat('dark'); for (const x of [0.6, 1.5, 2.4, 3.2]) g.tube([[x, 1.62 - Math.abs(x - 1.5) * 0.12, 0], [x - 0.25, 2.1 - Math.abs(x - 1.5) * 0.16, 0]], [0.1, 0.01], { sides: 5 }); }
      k.hatch([1.5, 1.46, 0.9], [0, 1, 0.35], 0.9, 0.7, { up: [1, 0, 0], role: 'rust', t: 0.08 });
    });
    for (const [x, s] of [[2.6, -1], [2.6, 1], [0.2, -1], [0.2, 1], [-2.2, -1], [-2.2, 1]]) k.lamp('body', { at: [x, -0.05, s * (1.56 - Math.max(0, -x) * 0.12)], dir: [0, -0.4, s], color: [1, 0.16, 0.06], power: 1.6, range: 12, lens: 0.1, glow: 0.8 });
    // the tail: two more plates on their own hinges, and a fan of blades at the end
    k.bone('tail_1', (g) => { k.mat('joint'); k.xcyl(-0.7, 0.7, 0, 0, 0.26, { sides: 12 }); k.mat('shell'); k.loft('y', [[0.05, 0.62, 0.95, 0.12, 0, 2.6], [0.9, 0.6, 0.9, 0.12, 0, 2.6], [1.75, 0.5, 0.78, 0.1, 0, 2.6]], { sides: 16, from: -0.5 * Math.PI, to: 0.5 * Math.PI, caps: false }); k.mat('dark'); g.tube([[0, 0.1, -0.1], [0, 1.7, -0.1]], 0.3, { sides: k.n(8), caps: true }); });
    k.bone('tail_2', (g) => { k.mat('joint'); k.xcyl(-0.6, 0.6, 0, 0, 0.22, { sides: 12 }); k.mat('rust'); k.loft('y', [[0.05, 0.5, 0.78, 0.1, 0, 2.6], [1.0, 0.42, 0.66, 0.1, 0, 2.6]], { sides: 14, from: -0.5 * Math.PI, to: 0.5 * Math.PI, caps: false });
      const N = k.lod === 2 ? 3 : 5; for (let i = 0; i < N; i++) { const a = (i / (N - 1) - 0.5) * 1.5, c = Math.cos(a), sn = Math.sin(a), len = 1.5 - Math.abs(a) * 0.25; k.mat(i % 2 ? 'shell' : 'rust'); g.poly([[sn * 0.3 - c * 0.3, 0.9 + c * 0.2, 0.08 + 0.02 * i], [sn * len - c * 0.36, 0.9 + c * len, 0.02 * i], [sn * (len + 0.3), 0.9 + c * (len + 0.3), 0.02 * i], [sn * len + c * 0.36, 0.9 + c * len, 0.02 * i], [sn * 0.3 + c * 0.3, 0.9 + c * 0.2, 0.08 + 0.02 * i]], { two: true }); } });
    // the claws: an arm, an elbow, a hand with a fixed blade and one held open over it
    for (const [n, s] of [['claw_L', -1], ['claw_R', 1]]) k.bone(n, (g) => { k.mat('joint'); k.xcyl(-0.3, 0.3, 0, 0, 0.3, { sides: 12 }); k.mat('dark'); g.tube([[0, 0, 0], [0, 1.5, 0]], [0.26, 0.2], { sides: k.n(10), caps: true }); k.mat('joint'); k.xcyl(-0.26, 0.26, 1.5, 0, 0.26, { sides: 12 }); k.mat('dark'); g.tube([[0, 1.5, 0], [0, 2.5, 0.05]], [0.2, 0.24], { sides: k.n(10), caps: true });
      k.mat('shell'); k.loft('y', [[2.3, 0.3, 0.42, 0, 0, 3], [2.9, 0.42, 0.56, 0, 0, 3], [3.5, 0.3, 0.44, -0.05, 0, 3], [4.4, 0.03, 0.06, -0.2, 0, 3]], { sides: 12 });      // the hand and its fixed blade
      k.mat('rust'); k.loft('y', [[2.9, 0.16, 0.34, 0.42, 0, 3], [3.6, 0.13, 0.26, 0.55, 0, 3], [4.3, 0.02, 0.05, 0.42, 0, 3]], { sides: 10 }); k.mat('joint'); k.xcyl(-0.3, 0.3, 2.9, 0.36, 0.14, { sides: 8 });      // the one that closes
      if (k.fine) { k.mat('steel'); for (let i = 0; i < 5; i++) g.tube([[0, 3.2 + i * 0.22, 0.16 - i * 0.03], [0, 3.24 + i * 0.22, 0.3 - i * 0.03]], [0.05, 0.01], { sides: 4 }); k.hose([[0.2, 0.2, -0.2], [0.26, 0.9, -0.3], [0.2, 1.5, -0.22]], 0.04); k.rivets([-0.3, 2.5, 0.05], [-0.24, 3.4, 0], 6, 0.025, [-1, 0, 0]); } });
    for (const n of ['feeler_L', 'feeler_R']) k.bone(n, (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, 1.8, 0], [0, 3.6, 0]], [0.05, 0.03, 0.008], { sides: k.n(5), caps: true }); });
    k.neckLinks({ width: 0.7, style: 'girder' });
    k.bone('head', (g) => { k.mat('dark'); k.loft('x', [[-0.3, 0.3, 0.5, 0, 0, 4], [0.5, 0.36, 0.56, 0, 0, 4], [1.2, 0.22, 0.36, -0.06, 0, 3]], { sides: 12 }); k.mat('shell'); k.loft('x', [[-0.25, 0.34, 0.56, 0.05, 0, 3], [0.5, 0.42, 0.62, 0.06, 0, 3], [1.15, 0.24, 0.4, 0.02, 0, 3]], { sides: 12, from: -0.5 * Math.PI, to: 0.5 * Math.PI, caps: false });
      for (const s of [-1, 1]) { k.mat('joint'); g.tube([[0.3, 0.3, s * 0.4], [0.5, 0.75, s * 0.62], [0.72, 0.95, s * 0.7]], [0.07, 0.06, 0.09], { sides: k.n(7), caps: true }); } });
    for (const s of [-1, 1]) { k.lamp('head', { name: 'eye', at: [0.8, 0.96, s * 0.7], dir: [0.9, -0.3, s * 0.2], color: [1.0, 0.2, 0.08], power: 26, cone: 12, range: 90, lens: 0.11, proud: 0.03 }); k.lamp('head', { at: [1.22, -0.02, s * 0.2], dir: [1, -0.1, s * 0.2], color: [1, 0.3, 0.1], power: 1.2, range: 8, lens: 0.06, glow: 0.8 }); }
  },
  // 공벌레: seven arches of plate from nose to tail, pale and rust by turns, over a hull no bigger than a bath; six quick legs;
  // two feelers and two small lamps
  gong(k) {
    k.limbs({ style: 'girder' });
    k.bone('body', (g) => {
      k.mat('dark'); k.loft('x', [[-1.35, 0.14, 0.34, -0.02, 0, 4], [-0.6, 0.2, 0.52, -0.02, 0, 4], [0.6, 0.2, 0.52, -0.02, 0, 4], [1.3, 0.16, 0.36, -0.02, 0, 4]], { sides: 12 });
      for (let i = 0; i < 7; i++) { const x = 1.18 - i * 0.4, f = 1 - 0.42 * ((i - 3) / 3.4) ** 2, hh = 0.62 * f, ww = 0.84 * (0.72 + 0.28 * f); k.mat(i % 2 ? 'rust' : 'shell'); k.loft('x', [[x - 0.3, hh * 0.92, ww * 0.95, 0.04, 0, 2.6], [x - 0.02, hh, ww, 0.04, 0, 2.6], [x + 0.2, hh * 1.03, ww * 1.02, 0.04, 0, 2.6]], { sides: 14, from: -0.56 * Math.PI, to: 0.56 * Math.PI, caps: false });
        if (k.fine) for (const s of [-1, 1]) k.rivets([x + 0.12, 0.04 + hh * 0.5, s * ww * 0.86], [x + 0.12, 0.04 + hh * 0.98, s * ww * 0.3], 4, 0.012, [0.2, 0.6, s * 0.7]); }
      if (k.mid) { for (const s of [-1, 1]) for (const x of [0.85, 0, -0.85]) k.hose([[x * 0.8, -0.14, s * 0.2], [x, -0.2, s * 0.36], [x, -0.1, s * 0.42]], 0.016); k.mat('dark'); for (const s of [-1, 1]) g.tube([[-1.3, 0.02, s * 0.14], [-1.62, 0.1, s * 0.2]], [0.04, 0.012], { sides: 5 }); }
    });
    k.neckLinks({ width: 0.24, style: 'girder' });
    k.bone('head', (g) => { k.mat('shell'); k.loft('x', [[-0.12, 0.3, 0.52, 0.02, 0, 2.6], [0.14, 0.24, 0.42, 0.01, 0, 2.6], [0.4, 0.1, 0.2, -0.03, 0, 2.6]], { sides: 12, from: -0.56 * Math.PI, to: 0.56 * Math.PI, caps: false }); k.mat('dark'); k.loft('x', [[-0.1, 0.14, 0.3, -0.04, 0, 4], [0.36, 0.09, 0.2, -0.05, 0, 3]], { sides: 10 }); });
    for (const s of [-1, 1]) k.lamp('head', { name: 'eye', at: [0.34, -0.03, s * 0.13], dir: [0.9, -0.3, s * 0.25], color: [1.0, 0.75, 0.35], power: 3.5, cone: 20, range: 16, lens: 0.035, proud: 0.01 });
    k.lamp('body', { at: [-1.36, 0.0, 0], dir: [-1, 0, 0], color: [1, 0.12, 0.06], power: 0.2, range: 3, lens: 0.03, glow: 0.7 });
    for (const n of ['feeler_L', 'feeler_R']) k.bone(n, (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, 0.4, 0], [0, 0.8, 0]], [0.014, 0.009, 0.003], { sides: k.n(5), caps: true }); });
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
      g.mat('moss', { tint: '#5e6b4e', flags: LR.FLAG.SWAY, weight: 0.3 }); for (const [x, y, z, r] of [[-2.2, 3.35, 0.6, 0.5], [0.9, 3.4, -0.7, 0.42], [1.6, 4.55, 0.2, 0.4], [-3.4, 0.75, 0.9, 0.36], [3.2, 0.75, -1.0, 0.4]]) g.blob(x, y, z, r, { squash: [1.3, 0.5, 1.2], seg: k.n(8), rings: 4, seed: x * 9 });
      k.mat('dark'); g.box(-2.6, 5.5, 0.6, 0.12, 0.6, 0.12);
      // ── the power pack behind the cab: an engine block, its radiator behind louvres, an air filter, a stack ──
      k.mat('dark'); g.box(3.55, 1.2, -0.55, 1.1, 1.05, 1.0, { soft: 0.12 }); k.fins([3.0, 1.2, 0.18], [0, 0, 1], 12, 0.9, 0.9, 0.06, { up: [0, 1, 0] }); k.grille([3.0, 1.2, 0.96], [0, 0, 1], 0.96, 0.96, { up: [0, 1, 0], role: 'rust' });
      k.stack([3.9, 1.7, -0.95], [3.9, 3.2, -1.0], 0.1); k.tank([3.2, 1.95, -0.95], [3.2, 1.95, -0.15], 0.21, { role: 'rust', straps: 1, gauge: false });
      k.hose([[3.2, 1.95, -0.1], [3.3, 1.9, 0.1], [3.4, 1.6, 0.2]], 0.06); k.jbox([4.12, 1.3, -0.4], [1, 0, 0], 0.5, 0.6, 0.12, { up: [0, 1, 0], glands: 3 });
      // under the bed: the oil tank and a smaller one, a main along each side with a line down to every hip
      k.tank([-2.6, -0.52, 0], [-0.62, -0.52, 0], 0.36, { role: 'rust', up: [0, -1, 0] }); k.tank([0.7, -0.5, 0.5], [2.6, -0.5, 0.5], 0.26, { role: 'frame', up: [0, -1, 0] });
      for (const s of [-1, 1]) { k.pipe([[-4.2, 0.2, s * 1.42], [-1.8, 0.2, s * 1.45], [1.8, 0.2, s * 1.45], [4.2, 0.2, s * 1.42]], 0.06, { joints: [1, 2] });
        for (const x of [3.6, 0, -3.6]) k.hose([[x + 0.55, 0.2, s * 1.45], [x + 0.6, -0.12, s * 1.72], [x + 0.32, -0.36, s * 1.78]], 0.045);
        k.rivets([-4.2, 0.645, s * 1.48], [4.2, 0.645, s * 1.48], 42, 0.022, [0, 1, 0]);
        // lockers hung under the bed's edge
        for (const x of [1.8, -1.8]) { k.mat('rust'); g.box(x, 0.02, s * 1.64, 0.95, 0.52, 0.3, { soft: 0.1 }); k.hatch([x, 0.02, s * 1.79], [0, 0, s], 0.82, 0.4, { up: [0, 1, 0] }); } }
      // at the stern: two drums, a winch, marker bars; a ladder up the load frame; turnbuckles in the lashings; the container's door gear
      for (const z of [-0.95, -0.35]) k.tank([-4.0, 0.66, z], [-4.0, 1.52, z], 0.27, { role: 'rust', straps: 2, gauge: false });
      k.mat('joint'); k.zcyl(0.25, 1.05, -4.0, 1.0, 0.2, { sides: 12 }); for (const z of [0.25, 1.05]) k.zcyl(z - 0.03, z + 0.03, -4.0, 1.0, 0.34, { sides: 12 }); k.mat('frame'); for (const z of [0.16, 1.14]) g.box(-4.0, 0.85, z, 0.5, 0.42, 0.06, { soft: 0.2 });
      g.mat('iron', { tint: '#5a5048' }); k.zcyl(0.3, 1.0, -4.0, 1.0, 0.26, { sides: 10 });
      k.stripes([-4.92, 0.05, 0], [-1, 0, 0], 2.3, 0.3, 7, { up: [0, 1, 0] }); k.stripes([4.83, 0.02, 0], [1, 0, 0], 2.0, 0.24, 7, { up: [0, 1, 0] });
      k.ladder([-3.96, 0.7, -1.42], [-3.96, 5.1, -1.42], 0.4, [-1, 0, 0], { off: 0.14, role: 'rust' });
      if (k.mid) { k.mat('steel'); for (const x of [-2.6, -0.6, 1.5]) for (const s of [-1, 1]) g.box(x, 1.7, s * 1.43, 0.09, 0.32, 0.09, { soft: 0.3 }); for (const z of [-0.85, -0.3, 0.3, 0.85]) { g.tube([[-3.54, 0.8, z], [-3.54, 3.2, z]], 0.03, { sides: 5 }); g.box(-3.56, 1.9, z, 0.05, 0.1, 0.22, {}); } }
      // gussets where the posts meet the bed
      k.mat('rust'); for (const x of [-3.7, 2.6]) for (const s of [-1, 1]) { g.beam([x + 0.6, 0.7, s * 1.42], [x, 1.5, s * 1.42], 0.08, 0.12, { caps: false }); g.beam([x - 0.6, 0.7, s * 1.42], [x, 1.5, s * 1.42], 0.08, 0.12, { caps: false }); }
    });
    k.bone('radar', (g) => { k.mat('rust'); g.box(0, 0.5, 0, 1.5, 0.4, 0.12, { soft: 0.2 }); k.mat('dark'); g.box(0, 0.2, 0, 0.14, 0.4, 0.14); });
    for (const n of ['chain_L', 'chain_R']) { const e = k.S.extras.find((q) => q.name === n); k.bone(n, (g) => { g.mat('iron', { tint: '#6a5a4c' }); g.tube([[0, 0, 0], [0, e.len, 0]], 0.04, { sides: 5 }); k.mat('rust'); g.box(0, e.len, 0, 0.26, 0.3, 0.16, { soft: 0.3 }); }); }
    k.bone('neck_01', (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, 0.9, 0]], 0.3, { sides: k.n(10), caps: true }); });
    k.bone('head', (g) => { k.mat('frame'); k.loft('x', [[-0.4, 0.5, 0.95, 0, 0, 5], [0.5, 0.6, 1.05, 0, 0, 5], [1.25, 0.42, 0.9, -0.1, 0, 4]], { sides: 12 }); k.mat('dark'); g.box(1.22, -0.05, 0, 0.14, 0.34, 1.5, { soft: 0.3 }); k.mat('rust'); g.box(0.4, 0.62, 0, 1.5, 0.08, 2.0, { soft: 0.2 });
      k.grille([1.3, -0.05, 0], [1, 0, 0], 0.5, 0.26, { up: [0, 1, 0] }); for (const s of [-1, 1]) { k.along([1.29, -0.05, s * 0.48], [0.96, -0.26, s * 0.08], (g2) => { k.mat('joint'); g2.lathe(0, 0, [[0.19, 0], [0.225, 0.05], [0.19, 0.1]], { sides: k.n(12) }); if (k.fine) { k.mat('steel'); k.bolts('y', [0, 0.05, 0], 0.235, 8, 0.016, { h: 0.04 }); } }); k.hatch([0.4, 0.05, s * 1.045], [0, 0, s], 0.6, 0.5, { up: [0, 1, 0] }); }
      if (k.mid) { k.mat('dark'); g.box(0.55, 0.74, 0, 0.2, 0.12, 1.4, { soft: 0.3 }); g.tube([[-0.1, 0.66, 0.8], [-0.22, 1.9, 0.86]], [0.02, 0.007], { sides: 4 }); k.rivets([-0.3, 0.665, -0.9], [1.1, 0.665, -0.9], 8, 0.02, [0, 1, 0]); k.rivets([-0.3, 0.665, 0.9], [1.1, 0.665, 0.9], 8, 0.02, [0, 1, 0]); } });
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
      // ── the plant that keeps five thousand tonnes moving ──
      for (const s of [-1, 1]) {
        // mains along both edges of the deck, a drop to every hip, an accumulator on each hip block
        k.pipe([[-26, 0.5, s * 8.9], [-13, 0.5, s * 8.9], [0, 0.5, s * 8.9], [13, 0.5, s * 8.9], [26, 0.5, s * 8.9]], 0.3, { joints: [1, 2, 3], role: 'rust', far: true }); k.pipe([[-25, 1.05, s * 8.45], [0, 1.05, s * 8.45], [25, 1.05, s * 8.45]], 0.15, { joints: [1], role: 'frame' });
        for (const x of [18, 6, -6, -18]) { k.pipe([[x + 1.3, 0.5, s * 8.9], [x + 1.3, 0.2, s * 9.9], [x + 1.3, -1.4, s * 10.45]], 0.2, { role: 'frame' }); k.tank([x - 1.7, 1.26, s * 9.75], [x + 0.6, 1.26, s * 9.75], 0.55, { role: 'rust' }); k.jbox([x - 1.2, -1.2, s * 10.42], [0, 0, s], 1.2, 1.4, 0.3, { up: [0, 1, 0], glands: 3 }); }
        // rivets along the box girders, marker bars on their ends
        for (const y of [-0.8, -3.6]) k.rivets([-25.6, y, s * 9.32], [25.6, y, s * 9.32], 70, 0.07, [0, 0, s]);
        for (const e of [-1, 1]) k.stripes([e * 26.02, -2.2, s * 8.2], [e, 0, 0], 2.2, 2.6, 6, { up: [0, 1, 0], t: 0.06 });
        for (const x of [-21, -9, 3, 15]) k.hose([[x, -3.95, s * 6.2], [x + 3, -5.3, s * 6.5], [x + 6, -3.95, s * 6.2]], 0.12); }
      k.pipe([[-18, -4.15, 0], [-6, -4.15, 0], [6, -4.15, 0], [18, -4.15, 0]], 0.36, { joints: [1, 2], role: 'frame', far: true });
      // at the stern: three stacks, a bank of coolers behind louvres
      for (let i = 0; i < 3; i++) k.stack([-24.6, 0, -4.4 + i * 2.3], [-24.6, 8.5 + i * 1.2, -4.4 + i * 2.3], 0.55);
      k.fins([-25.8, 1.75, 2.4], [0, 0, 1], 16, 1.2, 3.0, 0.28, { up: [0, 1, 0], role: 'frame' }); k.grille([-26.45, 1.75, 4.65], [-1, 0, 0], 4.6, 3.1, { up: [0, 1, 0], t: 0.24, role: 'rust' });
      // ways for the people who kept it: ladders up the houses, a gallery along the long wall, doors, hatches in the deck
      k.ladder([11.3, 0, -3], [11.3, 10.2, -3], 0.7, [1, 0, 0], { off: 0.28, r: 0.05, step: 0.35 }); k.ladder([-0.3, 10.2, 0.5], [-0.3, 16.8, 0.5], 0.7, [1, 0, 0], { off: 0.28, r: 0.05, step: 0.35 }); k.ladder([19, 0, -3.25], [19, 6.4, -3.25], 0.6, [0, 0, 1], { off: 0.2, r: 0.045, step: 0.35 });
      k.mat('rust'); g.box(-4, 3.3, 5.2, 30, 0.12, 1.4, { soft: 0.05 }); if (k.mid) for (let x = -18; x <= 10; x += 4.67) g.beam([x, 3.25, 5.85], [x, 1.9, 4.55], 0.12, 0.12, { caps: false });
      k.rail([-19, -12, -5, 2, 9, 11].map((x) => [x, 3.36, 5.85]), 1.1, [0, 1, 0], { r: 0.045 });
      for (const [x, z, sz] of [[-12, 4.52, 1], [2, 4.52, 1], [-8, -6.52, -1]]) k.hatch([x, 1.25, z], [0, 0, sz], 1.2, 2.3, { up: [0, 1, 0], t: 0.08, role: 'rust' }); k.hatch([-10, 4.55, 4.52], [0, 0, 1], 1.1, 2.1, { up: [0, 1, 0], t: 0.08, role: 'rust' });
      for (const [x, z] of [[15, -7.4], [24.5, 1], [-22, -6.5], [2, 7.6], [-24, 7]]) k.hatch([x, -0.1, z], [0, 1, 0], 2.4, 1.8, { up: [1, 0, 0], t: 0.12 });
      // on the roofs: air plant and ducts, three dishes
      k.mat('frame'); g.box(3, 10.9, -2.2, 3, 1.4, 2.2, { soft: 0.08 }); k.fins([1.3, 10.9, 1.6], [1, 0, 0], 10, 1.3, 2.0, 0.3, { up: [0, 0, 1] }); k.mat('rust'); g.box(6.3, 10.6, 2, 6, 0.8, 0.9, { soft: 0.1 }); g.box(9, 10.6, -0.2, 0.9, 0.8, 4.4, { soft: 0.1 }); k.grille([3, 10.9, -1.08], [0, 0, 1], 2.4, 1.0, { up: [0, 1, 0], t: 0.12 });
      k.dish([8, 10.2, -4], [0.3, 1, -0.4], 1.3); k.dish([-4, 16.8, -4], [-0.5, 1, 0.2], 1.6); k.dish([-11, 16.8, 1], [0.2, 1, 0.5], 1.1); k.mat('frame'); g.box(-6, 17.3, 0.5, 2.2, 1.0, 1.6, { soft: 0.1 }); k.fins([-9.6, 17.3, -1.5], [1, 0, 0], 8, 1.0, 1.5, 0.26, { up: [0, 0, 1] });
      // forty years of growth: moss banks along every edge, brush on the roofs
      g.mat('moss', { tint: '#5e6b4e', flags: LR.FLAG.SWAY, weight: 0.25 }); const rr = LR.rng('ridge-moss'); for (let i = 0; i < (k.lod === 0 ? 46 : k.lod === 1 ? 24 : 10); i++) { const top = rr() < 0.4, x = -25 + rr() * 50, z = top ? -6 + rr() * 9 : (rr() < 0.5 ? -1 : 1) * (7 + rr() * 2.4), y = top ? (Math.abs(x + 4) < 15 && z < 4.4 ? (Math.abs(x + 9) < 8.5 && z < 2.7 ? 16.6 : 10) : 0.1) : 0.1; g.blob(x, y + 0.3, z, 0.9 + rr() * 1.5, { squash: [1.4, 0.45 + rr() * 0.5, 1.3], seg: k.n(8), rings: 4, seed: i }); }
    });
    k.bone('neck_01', (g) => { k.mat('frame'); g.tube([[0, 0, 0], [0, 3.2, 0]], [2.2, 1.8], { sides: k.n(12), caps: true }); });
    // the prow: a hooded block that turns, two eyes under the hood
    k.bone('head', (g) => { k.mat('frame'); k.loft('x', [[-3, 2.2, 5.2, 0, 0, 5], [1.5, 2.6, 5.6, 0, 0, 5], [5.5, 1.9, 4.6, -0.3, 0, 4]], { sides: 14 }); k.mat('rust'); g.box(3.6, 2.5, 0, 6.4, 0.5, 11.6, { soft: 0.1 }); k.mat('dark'); for (const s of [-1, 1]) { g.push(new THREE.Matrix4().makeTranslation(5.2, -0.4, s * 2.5).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2 - 0.2))); g.lathe(0, 0, [[1.25, -0.9], [1.4, 0], [1.3, 0.7]], { sides: k.n(14) }); g.pop(); }
      k.grille([5.42, 0.9, 0], [1, 0, 0], 3.0, 0.9, { up: [0, 1, 0], t: 0.2 }); k.hatch([3, 2.75, 0], [0, 1, 0], 2, 1.6, { up: [1, 0, 0], t: 0.1 });
      for (const s of [-1, 1]) { k.along([5.72, -0.52, s * 2.5], [0.95, -0.3, s * 0.03], (g2) => { k.mat('joint'); g2.lathe(0, 0, [[1.16, 0], [1.34, 0.12], [1.16, 0.28]], { sides: k.n(16) }); if (k.mid) { k.mat('steel'); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g2.tube([[Math.cos(a) * 1.25, 0.24, Math.sin(a) * 1.25], [Math.cos(a) * 1.25, 0.36, Math.sin(a) * 1.25]], 0.05, { sides: 5, caps: true }); } } });
        k.rail([[0.6, 2.75, s * 5.6], [3.6, 2.75, s * 5.6], [6.6, 2.75, s * 5.6]], 1.1, [0, 1, 0], { r: 0.045 }); k.rivets([-2.6, 0, s * 5.42], [4.6, 0, s * 5.3], 14, 0.07, [0, 0, s]); k.ladder([-2.2, -2.0, s * 5.3], [-2.2, 2.6, s * 5.5], 0.7, [0, 0, s], { off: 0.26, r: 0.05, step: 0.35 }); } });
    for (const s of [-1, 1]) k.lamp('head', { name: 'eye', at: [5.75, -0.55, s * 2.5], dir: [0.95, -0.3, s * 0.03], color: [1.0, 0.86, 0.62], power: 150, cone: 10, range: 360, lens: 1.05, proud: 0.05 });
    for (const [x, y, z] of [[26.8, 0.6, -9.4], [26.8, 0.6, 9.4], [-26.8, 0.6, -9.4], [-26.8, 0.6, 9.4]]) k.lamp('body', { at: [x, y, z], dir: [Math.sign(x), 0, 0], color: [1, 0.1, 0.05], power: 6, range: 30, lens: 0.3, glow: 0.9 });
    for (const x of [-18, -6, 6, 18]) for (const s of [-1, 1]) k.lamp('body', { at: [x, -4.1, s * 9.3], dir: [0, -1, 0], color: [1, 0.6, 0.22], power: 5, range: 30, lens: 0.34, glow: 0.6 });
    k.bone('mast', (g) => { k.mat('frame'); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.beam([sx * 0.9, 0, sz * 0.9], [sx * 0.25, 22, sz * 0.25], 0.22, 0.22, { caps: false }); if (k.mid) for (let y = 0; y < 22; y += 2.75) { const w0 = 0.9 - (0.65 * y) / 22, w1 = 0.9 - (0.65 * (y + 2.75)) / 22; for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) g.beam([a[0] * w0, y, a[1] * w0], [b[0] * w1, y + 2.75, b[1] * w1], 0.1, 0.1, { caps: false }); } k.mat('rust'); g.box(0, 18.5, 0, 4.6, 0.3, 0.5); g.box(0, 14.5, 0, 0.5, 0.3, 3.8); k.dish([2.1, 18.65, 0], [0.4, 0.3, 1], 0.8); k.dish([-2.1, 18.65, 0], [-0.3, 0.3, -1], 0.7); k.ladder([0.98, 0, 0], [0.32, 21.5, 0], 0.45, [1, 0.03, 0], { off: 0.14, r: 0.035, step: 0.35 }); k.hose([[0.3, 0, 0.5], [0.22, 10, 0.4], [0.1, 21, 0.2]], 0.05); });
    k.lamp('mast', { at: [0, 22.2, 0], dir: [0, 1, 0], color: [1, 0.1, 0.05], power: 8, range: 40, lens: 0.3, glow: 1 });
    for (const e of k.S.extras) if (e.name.startsWith('cable')) k.bone(e.name, (g) => { g.mat('iron', { tint: '#3e3a36' }); g.tube([[0, 0, 0], [0, e.len * 0.5, 0], [0, e.len, 0]], 0.09, { sides: k.n(5) }); k.mat('rust'); g.box(0, e.len, 0, 0.7, 1.0, 0.5, { soft: 0.3 }); });
  },
};
