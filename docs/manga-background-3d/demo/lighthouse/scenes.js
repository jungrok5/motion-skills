// 「등대지기의 섬」 — the sets of a quiet manga about the last keeper of a small island lighthouse. Three locations,
// all designed from BRIEF.md and none of them in the starter: the spiral stair inside the tower (round, looked up
// at), the harbour pier with its boats (open water, rigging, rope), and the lamp room at night (a glass lantern, a
// glowing lens and its beam over a dark sea). Round things are built as rings of straight pieces so the pen gets
// the seams a manga artist would draw.

const ring = (n, f) => { for (let i = 0; i < n; i++) f(i, (i / n) * Math.PI * 2); };

// a round tower wall made of n panels (inside radius r, thickness t), with window gaps at the listed panels
function towerWall(S, y, r, h, n, t, windows = {}, tone = 0.95) {
  const pw = 2 * (r + t / 2) * Math.tan(Math.PI / n) + 0.01;
  ring(n, (i, a) => {
    S.at([Math.sin(a) * (r + t / 2), y, Math.cos(a) * (r + t / 2)], (a * 180) / Math.PI, () => {   // local z points out from the axis
      const w = windows[i];
      if (!w) { S.box([0, 0, 0], [pw, h, t], { tone, crease: 8 }); return; }
      S.box([0, 0, 0], [pw, w.y, t], { tone, crease: 8 });
      S.box([0, w.y + w.h, 0], [pw, h - w.y - w.h, t], { tone, crease: 8 });
      S.box([0, w.y, 0], [pw, w.h, 0.02], { flag: 'glass', lines: 'all', cast: false });
    });
  });
}
// a boat: a pointed hull (plan-view slab), gunwale, wheelhouse, mast, rigging
function boat(S, pos, ry, o = {}) {
  const L = o.len ?? 7, B = o.beam ?? 2.2;
  S.at(pos, ry, () => {
    const plan = [[-B / 2, L / 2], [B / 2, L / 2], [B / 2, -L * 0.15], [B * 0.18, -L / 2], [-B * 0.18, -L / 2], [-B / 2, -L * 0.15]];
    S.slab([0, -0.5, 0], plan, 1.25, { tone: o.tone ?? 0.92, crease: 20 });
    S.slab([0, 0.75, 0], plan.map(([x, z]) => [x * 1.03, z * 1.01]), 0.08, { tone: 0.7 });
    S.box([0, -0.05, 0], [B * 1.02, 0.12, L * 0.62], { tone: 0.55, detail: true });          // the rub strake
    S.box([0, 0.83, L * 0.12], [B * 0.62, 1.3, L * 0.26], { tone: 0.97 });
    S.box([0, 2.13, L * 0.12], [B * 0.7, 0.08, L * 0.3], { tone: 0.75 });
    for (const sx of [-1, 1]) S.box([sx * B * 0.312, 1.45, L * 0.12], [0.012, 0.45, L * 0.18], { flag: 'glass', lines: 'all', cast: false });
    S.box([0, 1.45, L * 0.12 - L * 0.13 - 0.006], [B * 0.5, 0.45, 0.012], { flag: 'glass', lines: 'all', cast: false });
    S.cyl([0, 0.8, -L * 0.18], 0.06, o.mast ?? 5, { tone: 0.75, seg: 10 });
    const top = S.world([0, 0.8 + (o.mast ?? 5), -L * 0.18]), bow = S.world([0, 0.85, -L / 2 + 0.2]), stern = S.world([0, 0.85, L / 2 - 0.2]);
    S.stack.push(S.stack[0].clone()); S.line([top, bow], { weight: 0.6 }); S.line([top, stern], { weight: 0.6 }); S.stack.pop();
    S.box([0, 0.8 + (o.mast ?? 5) * 0.7, -L * 0.18], [1.4, 0.05, 0.05], { tone: 0.7, detail: true });
    for (let i = 0; i < 4; i++) S.cyl([(i % 2 ? 1 : -1) * (B / 2 + 0.05), 0.2, -L * 0.1 + i * 0.9], 0.13, 0.32, { rot: [0, 0, 90], tone: 0.9, seg: 10, center: true, detail: true });  // fenders
    if (o.name) S.sign([B / 2 + 0.02, 0.2, -L * 0.28], [1.4, 0.32], o.name, { ry: 90, board: 0, bg: o.tone ?? 0.92, frame: false });
  });
}
// sea: one flat sheet, plus short horizontal strokes for the water (the way manga draws a calm sea)
function sea(S, y, size, tone, n) {
  S.box([0, y - 0.3, -size / 2 + 20], [size, 0.3, size], { tone, lines: 'none', cast: false, receive: true });
  const r = S.rand;
  for (let i = 0; i < n; i++) {
    const z = 18 - Math.pow(r(), 1.6) * 140, x = (r() - 0.5) * (40 + Math.abs(z) * 1.6), l = 0.5 + r() * (1.2 + Math.abs(z) * 0.04);
    S.line([[x - l / 2, y + 0.01, z], [x + l / 2, y + 0.01, z + (r() - 0.5) * 0.1]], { weight: 0.5 });
  }
}

export const scenes = {
  // ── 1 · the spiral stair inside the tower (day light through the slit windows) ────────────────
  tower: {
    name: '등대 안 나선계단', mood: 'day', ambient: 0.8,
    build(S) {
      S.sun({ dir: [0.12, 1, 0.08], strength: 0.32, area: { center: [0, 4.5, 0], radius: 5 } });   // light from the lantern far above
      const R = 2.0, R0 = 0.75, n = 46, rise = 0.19, turn = 21;
      S.box([0, -0.1, 0], [5.4, 0.1, 5.4], { tone: 0.9 });
      S.grid([0, 0, 0], [4, 4], 0.4, { weight: 0.4 });                                       // the flagstones
      towerWall(S, 0, R, 10, 20, 0.35, { 2: { y: 1.4, h: 1.0 }, 7: { y: 3.6, h: 1.0 }, 12: { y: 5.8, h: 1.0 }, 17: { y: 8.0, h: 1.0 } }, 1.0);
      const rail = [], inner = [];
      for (let i = 0; i < n; i++) {
        const a = i * turn, y = i * rise, ar = (a * Math.PI) / 180;
        S.at([0, y, 0], a, () => {
          S.extrude([0, 0, 0], [[R0, -0.16], [R - 0.02, -0.4], [R - 0.02, 0.4], [R0, 0.16]], 0.07, { rot: [90, 0, 0], tone: i % 2 ? 0.93 : 0.98, crease: 20 });
          S.cyl([R0 + 0.04, 0, 0], 0.018, 0.95, { tone: 0.45, detail: true, seg: 6 });       // a baluster on every tread, at the well
        });
        rail.push([Math.cos(ar) * (R0 + 0.04), y + 0.95, -Math.sin(ar) * (R0 + 0.04)]);
        inner.push([Math.cos(ar) * R0, y - 0.07, -Math.sin(ar) * R0]);
      }
      S.line(rail, { weight: 1.5 });                                                          // the handrail round the open well
      S.line(inner, { weight: 1.0 });                                                         // the stringer under the treads' inner ends
      S.box([0, 9.0, 0], [5.4, 0.15, 5.4], { tone: 0.8, cast: false });                       // the landing floor above
      S.at([1.25, 0, -0.9], -30, () => { S.box([0, 0, 0], [0.5, 0.45, 0.35], { tone: 0.7 }); S.cyl([0, 0.45, 0], 0.09, 0.28, { tone: 0.85, seg: 12 }); });  // an oil can on a crate
      S.lathe([-1.1, 0, -1.2], [[0, 0], [0.18, 0], [0.2, 0.5], [0.16, 0.55], [0, 0.55]], { tone: 0.6, seg: 14 });    // a bucket
      S.sign([0.95, 1.5, 1.72], [0.5, 0.36], '1931', { ry: 210, board: 0.02, bg: 0.9 });       // the builder's plate
    },
  },

  // ── 2 · the harbour pier (day) ──────────────────────────────────────────────────────────────
  pier: {
    name: '선착장', mood: 'day',
    build(S) {
      S.sun({ dir: [-0.55, 0.7, 0.5], area: { center: [0, 0, -4], radius: 14 } });
      sea(S, -1.2, 400, 0.94, 260);
      const L = 22, W = 3.2;
      for (let z = 4; z > 4 - L; z -= 0.3) S.box([0, 0, z - 0.15], [W, 0.1, 0.28], { tone: 0.88 + 0.08 * S.rand(), crease: 20 });   // the planks
      for (let z = 4; z >= 4 - L; z -= 2.5) for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) { S.cyl([x, -2.5, z], 0.15, 2.5, { tone: 0.7, seg: 10 }); S.cyl([x, 0.1, z], 0.13, 0.45, { tone: 0.75, seg: 10, detail: true }); }
      for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) S.box([x, -0.3, 4 - L / 2], [0.1, 0.3, L], { tone: 0.6 });
      for (const z of [0.5, -6, -12.5]) for (const s of [-1, 1]) { S.cyl([s * (W / 2 - 0.35), 0.1, z], 0.13, 0.35, { tone: 0.5, seg: 12 }); S.sphere([s * (W / 2 - 0.35), 0.45, z], 0.14, { tone: 0.5, seg: 12, seg2: 6 }); }
      // things on the pier
      S.torus([0.7, 0.1, -1.0], 0.4, 0.06, { tone: 0.8 }); S.torus([0.72, 0.22, -1.02], 0.33, 0.06, { tone: 0.8 });   // a coil of rope
      S.line([[0.95, 0.15, -1.2], [1.35, 0.25, -0.5], [1.35, 0.45, 0.5]], { weight: 0.9 });
      for (const [x, z, ry] of [[-0.9, -3.5, 10], [-0.95, -4.1, -8], [-0.85, -3.8, 4]]) S.crate([x, 0.1 + (z === -3.8 ? 0.4 : 0), z], ry, { size: 0.55 });
      for (let i = 0; i < 3; i++) S.lathe([0.95, 0.1, -8 - i * 0.6], [[0, 0], [0.24, 0], [0.28, 0.4], [0.24, 0.8], [0, 0.8]], { tone: 0.65, seg: 14 });   // barrels
      S.at([-0.6, 0.1, -9.6], 0, () => { S.box([0, 0, 0], [0.9, 0.5, 0.6], { tone: 0.92 }); S.grid([0, 0.5, 0], [0.9, 0.6], 0.15, { weight: 0.4 }); });   // a fish box with a net over it
      S.streetlamp([-W / 2 + 0.2, 0.1, -6], 90, { h: 4, light: 0 });
      S.streetlamp([W / 2 - 0.2, 0.1, -15], -90, { h: 4, light: 0 });
      boat(S, [4.0, -1.2, -5.5], 180, { len: 8, beam: 2.4, name: '새벽호', mast: 5.5 });
      boat(S, [-4.2, -1.2, -11], 0, { len: 6.5, beam: 2.1, tone: 0.82, name: '등대호', mast: 4.5 });
      S.line([[3.0, 0.2, -2.6], [1.45, 0.4, -2.0]], { sag: 0.15, weight: 0.8 });              // the mooring lines
      S.line([[-3.3, 0.2, -13.4], [-1.45, 0.45, -12.5]], { sag: 0.15, weight: 0.8 });
      // the shore: a boat shed, rocks, the lighthouse on its headland, the hills
      S.at([0, 0, 8], 0, () => {
        S.box([0, -1.2, 0], [30, 1.3, 8], { tone: 0.86 });
        S.box([-5, 0.1, 0.5], [6, 3.2, 4.5], { tone: 0.95 });
        S.extrude([-8, 3.3, -1.75], [[0, 0], [3, 1.1], [6, 0], [6, 0.1], [3, 1.22], [0, 0.1]], 4.5, { tone: 0.7 });
        S.grid([-5, 1.7, -1.74], [6, 3.2], 0.25, { plane: 'wall', stepY: 9, weight: 0.4 });
      });
      S.at([-26, -1.5, -60], 0, () => {
        for (const [x, z, r] of [[0, 0, 9], [8, 3, 6], [-7, 2, 7]]) S.sphere([x, -r * 0.4, z], r, { tone: 0.8, seg: 8, seg2: 6, crease: 30 });
        S.cyl([0, 4.2, 0], 1.6, 13, { r2: 1.15, tone: 0.98, seg: 18 });
        for (let i = 0; i < 3; i++) S.cyl([0, 6 + i * 3.4, 0], 1.47 - i * 0.12, 1.1, { r2: 1.42 - i * 0.12, tone: 0.55, seg: 18 });
        S.cyl([0, 17.2, 0], 1.6, 0.25, { tone: 0.6, seg: 18 });
        S.cyl([0, 17.45, 0], 0.95, 1.4, { tone: 0.95, seg: 12, flag: 'glass', lines: 'all' });
        S.cone([0, 18.85, 0], 1.15, 1.0, { tone: 0.6, seg: 12 });
      });
      for (let i = 0; i < 7; i++) S.sphere([30 - i * 12, -14, -95 - (i % 3) * 8], 18 + (i % 2) * 6, { tone: 0.9, seg: 9, seg2: 5, crease: 35, cast: false });
    },
  },

  // ── 3 · the lamp room at night ──────────────────────────────────────────────────────────────
  lamp: {
    name: '등대 꼭대기 램프실', mood: 'night',
    build(S) {
      S.sun({ dir: [-0.4, 0.8, 0.5], shadow: false });
      sea(S, -38, 600, 0.32, 160);
      const G = 3.4, n = 12;
      S.cyl([0, -0.35, 0], G, 0.35, { tone: 0.75, seg: 36 });                                 // the gallery floor
      S.cyl([0, -6, 0], 2.3, 5.65, { r2: 2.25, tone: 0.9, seg: 24 });                        // the tower top below
      const rail = [], rail2 = [];
      ring(36, (i, a) => { const p = [Math.cos(a) * (G - 0.1), 0, Math.sin(a) * (G - 0.1)]; if (i % 3 === 0) S.cyl(p, 0.025, 1.05, { tone: 0.5, detail: true, seg: 6 }); rail.push([p[0], 1.05, p[2]]); rail2.push([p[0], 0.55, p[2]]); });
      S.line(rail, { closed: true, weight: 1.2 }); S.line(rail2, { closed: true, weight: 0.8 });
      // the lantern: a low wall, twelve glass panes with astragals, the copper roof and its ventilator
      const r = 1.75;
      ring(n, (i, a) => {
        const deg = (a * 180) / Math.PI, pw = 2 * r * Math.tan(Math.PI / n) + 0.01;
        S.at([Math.sin(a) * r, 0, Math.cos(a) * r], deg, () => {
          if (i !== 3) { S.box([0, 0, 0], [pw, 0.9, 0.18], { tone: 0.92, crease: 8 }); S.box([0, 0.9, 0], [pw - 0.02, 1.9, 0.02], { flag: 'glass', see: true, lines: 'none', cast: false }); S.box([0, 1.6, 0], [pw, 0.03, 0.05], { tone: 0.3, detail: true }); }
          else S.door([0, 0, 0], pw - 0.06, 2.1, { t: 0.06, tone: 0.6, open: 0.25 });
        });
        S.box([Math.sin(a + Math.PI / n) * r, 0, Math.cos(a + Math.PI / n) * r], [0.06, 2.8, 0.06], { ry: deg, tone: 0.3 });
      });
      S.cyl([0, 2.8, 0], r + 0.12, 0.18, { tone: 0.4, seg: n });
      S.cyl([0, 2.98, 0], r + 0.05, 1.2, { r2: 0.35, tone: 0.45, seg: n * 2, crease: 25 });
      S.sphere([0, 4.35, 0], 0.32, { tone: 0.45, seg: 12, seg2: 8 });
      S.cyl([0, 4.65, 0], 0.03, 0.8, { tone: 0.3, detail: true, seg: 6 });
      // the lens: stacked prism rings around a lamp — it glows, and throws its beam
      S.cyl([0, 0, 0], 0.5, 0.95, { r2: 0.35, tone: 0.6, seg: 16 });
      for (let i = 0; i < 7; i++) S.cyl([0, 0.95 + i * 0.16, 0], 0.62 - Math.abs(i - 3) * 0.05, 0.12, { r2: 0.6 - Math.abs(i - 3) * 0.05, seg: 20, flag: 'light', lines: 'outline' });
      S.glow([0, 1.4, 0], 0.22, { shape: 'sphere' });
      S.beam([0, 1.43, 0], 160, 0.45, 16, { ry: 28, rot: [-2, 28, 0], strength: 0.9 });               // the beam over the sea
      S.beam([0, 1.43, 0], 160, 0.45, 16, { rot: [-2, 208, 0], strength: 0.9 });
      S.light([0, 1.4, 0], { intensity: 2.2, distance: 9 });
      S.light([0, 1.4, 2.6], { intensity: 0.8, distance: 6 });
      S.box([1.55, 0, -2.2], [0.5, 0.45, 0.35], { tone: 0.7, ry: 30 });                       // the keeper's things
      S.lathe([-2.3, 0, 1.6], [[0, 0], [0.13, 0], [0.13, 0.25], [0.05, 0.36], [0.05, 0.42], [0, 0.42]], { tone: 0.65, seg: 12 });
    },
  },
};
