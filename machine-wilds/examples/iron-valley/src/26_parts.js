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
    k.lamp('head', { name: 'search', at: [1.22, -0.36, 0], dir: [0.97, -0.24, 0], color: [0.72, 0.9, 1.0], power: 34, cone: 9.5, range: 150, lens: 0.36, proud: 0.08 });
    for (const s of [-1, 1]) k.lamp('head', { at: [0.95, 0.2, s * 0.5], dir: [0.8, 0, s * 0.6], color: [0.25, 0.85, 1.0], power: 0.8, range: 10, lens: 0.1, glow: 0.7 });
    // what trails: two feelers under the bill, a whip mast on the tail with a light at its tip
    for (const e of k.S.extras) k.bone(e.name, (g) => { k.mat('dark'); g.tube([[0, 0, 0], [0, e.len * 0.5, 0], [0, e.len, 0]], e.name === 'mast' ? [0.07, 0.045, 0.02] : [0.045, 0.03, 0.012], { sides: k.n(6), caps: true }); });
    k.lamp('mast', { at: [0, 5.15, 0], dir: [0, 1, 0], color: [1, 0.18, 0.08], power: 0.7, range: 10, lens: 0.07, glow: 0.9 });
  },
};
