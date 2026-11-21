// 「세탁소집 딸」 — the sets of a slice-of-life webtoon about a girl who grows up above her family's laundry shop.
// Four locations, each built from BRIEF.md: the shop (day), the rooftop room (day), the alley stairs (late afternoon)
// and the bus stop (night). Everything specific to this story — the garment rail, the press table, the sewing
// machine, the rooftop washing lines, the shelter — is built here from the Stage primitives; generic furniture
// comes from the kit (lib/props.js). Units: metres. Tones: 1 paper white … 0 ink.

// ── things this story needs (not in the kit) ─────────────────────────────────────────────────────
// a garment in a dry-cleaning cover on a hanger, hung from a rail running along z (its face looks along the rail)
function garment(S, pos, o = {}) {
  const r = S.rand, L = o.long ? 1.15 : 0.82 + 0.1 * r(), w = 0.23 + 0.03 * r();
  const shape = [[-0.03, 0], [0.03, 0], [w, -0.08], [w + 0.03, -0.38], [w - 0.02, -0.39], [w - 0.01, -L], [-w + 0.01, -L], [-w + 0.02, -0.39], [-w - 0.03, -0.38], [-w, -0.08]];
  S.at(pos, (r() - 0.5) * 16, () => {
    S.extrude([0, -0.06, 0], shape, 0.035, { tone: o.tone ?? [0.97, 0.9, 0.82, 0.95][(r() * 4) | 0], centerZ: true, crease: 50 });
    S.line([[0, -0.06, 0], [0, 0.02, 0], [0.03, 0.05, 0], [0.0, 0.08, 0], [-0.03, 0.05, 0]], { weight: 0.6 });
    if (r() < 0.5) S.box([0, -0.2 - 0.3 * r(), 0.019], [0.07, 0.05, 0.004], { tone: 0.97, detail: true, lines: 'outline', cast: false });  // the claim tag
  });
}
function sewingMachine(S, pos, ry) {
  S.at(pos, ry, () => {
    S.box([0, 0, 0], [0.48, 0.07, 0.22], { tone: 0.75 });
    S.extrude([-0.2, 0.07, 0], [[0, 0], [0.1, 0], [0.1, 0.2], [0.36, 0.2], [0.36, 0.12], [0.42, 0.12], [0.42, 0.27], [0, 0.27]], 0.14, { tone: 0.8, centerZ: true });
    S.cyl([0.17, 0.33, 0], 0.012, 0.06, { tone: 0.3, detail: true });                 // the spool
    S.cyl([-0.15, 0.17, 0.07], 0.07, 0.025, { rot: [90, 0, 0], tone: 0.5, seg: 16 }); // the wheel
  });
}
function pressTable(S, pos, ry) {
  S.at(pos, ry, () => {
    S.extrude([0, 0.86, 0], [[-0.6, -0.2], [0.35, -0.2], [0.6, -0.08], [0.62, 0], [0.6, 0.08], [0.35, 0.2], [-0.6, 0.2]], 0.04, { rot: [90, 0, 0], tone: 0.9, curve: 8 });
    for (const x of [-0.45, 0.3]) S.box([x, 0, 0], [0.04, 0.82, 0.3], { tone: 0.6, rot: [0, 0, x < 0 ? 6 : -6] });
    S.extrude([0.05, 0.86, 0.06], [[0, 0], [0.26, 0], [0.22, 0.08], [0.05, 0.1]], 0.12, { tone: 0.55, centerZ: true });   // the iron
    S.line([[0.15, 1.0, 0.06], [0.2, 1.4, 0.0], [0.3, 1.9, -0.1], [0.3, 2.6, -0.1]], { weight: 0.9 });                       // its hose to the ceiling
  });
}
function foldedStack(S, pos, n, tone = 0.95) {
  const r = S.rand;
  for (let i = 0; i < n; i++) S.box([pos[0] + (r() - 0.5) * 0.02, pos[1] + i * 0.045, pos[2]], [0.32, 0.04, 0.26], { tone: [tone, 0.86, 0.78][i % 3], ry: (r() - 0.5) * 6, detail: true, crease: 20 });
}
function washing(S, a, b, items) {
  // a line between two points with things pegged on it (world-ish coordinates in the current frame)
  S.line([a, b], { sag: 0.12, weight: 0.7 });
  const r = S.rand;
  items.forEach((k, i) => {
    const t = (i + 0.7) / (items.length + 0.4), x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t - 0.12 * 4 * t * (1 - t);
    const ang = Math.atan2(-(b[2] - a[2]), b[0] - a[0]) * 180 / Math.PI;
    S.at([x, y, z], ang, () => {
      if (k === 'towel') S.plane([0, -0.62, 0], [0.42, 0.62], { tone: [0.97, 0.88][i % 2], rot: [0, 0, (r() - 0.5) * 4], cast: true });
      else if (k === 'shirt') S.extrude([0, 0, 0], [[-0.07, 0], [0.07, 0], [0.24, -0.06], [0.33, -0.3], [0.24, -0.32], [0.21, -0.7], [-0.21, -0.7], [-0.24, -0.32], [-0.33, -0.3], [-0.24, -0.06]], 0.02, { tone: 0.95, centerZ: true });
      else if (k === 'socks') { S.box([-0.05, -0.28, 0], [0.07, 0.28, 0.02], { tone: 0.7 }); S.box([0.05, -0.28, 0], [0.07, 0.28, 0.02], { tone: 0.7 }); }
      S.box([0, -0.02, 0], [0.025, 0.06, 0.03], { tone: 0.5, detail: true });   // a peg
    });
  });
}

export const scenes = {
  // ── 1 · the shop (day) ─────────────────────────────────────────────────────────────────────────
  shop: {
    name: '동네 세탁소', mood: 'day',
    build(S) {
      S.sun({ dir: [0.25, 0.7, 1], area: { center: [0, 1, 0], radius: 6 } });
      const W = 6, D = 5, H = 2.7;
      S.room({ w: W, d: D, h: H, floor: 0.9, skirting: true,
        openings: {
          s: [{ kind: 'window', at: 1.9, w: 2.6, y: 0.5, h: 1.9, panes: [3, 1], frame: 0.65 }, { kind: 'door', at: 4.5, w: 1.0, h: 2.15, glassPanel: true, tone: 0.75 }],
          n: [{ kind: 'hole', at: 4.6, w: 0.9, y: 0, h: 2.05 }],
        } });
      // the garment rail along the right wall
      S.cyl([2.45, 1.95, 2.2], 0.02, 4.2, { rot: [90, 0, 0], tone: 0.6, seg: 10 });
      for (const z of [2.2, 0, -2.0]) S.cyl([2.45, 1.95, z], 0.02, 0.75, { tone: 0.6, seg: 8 });
      for (const z of [-2.1, 2.3]) S.box([2.45, 0, z], [0.04, 1.97, 0.04], { tone: 0.6 });
      for (let i = 0; i < 34; i++) garment(S, [2.45, 1.93, -1.95 + i * 0.12], { long: i % 7 === 3 || i % 7 === 4 });
      // the counter, the till, the claim stack
      S.counter([-1.4, 0, 0.3], 0, { w: 2.6, d: 0.6, h: 0.98, tone: 0.82 });
      S.box([-2.1, 0.98, 0.3], [0.38, 0.12, 0.32], { tone: 0.55 });
      S.box([-2.1, 1.1, 0.24], [0.3, 0.1, 0.03], { tone: 0.45, rot: [-35, 0, 0] });
      foldedStack(S, [-1.2, 0.98, 0.32], 6);
      foldedStack(S, [-0.75, 0.98, 0.3], 4, 0.88);
      S.cup([-0.35, 0.98, 0.4]);
      S.box([-1.65, 0.98, 0.45], [0.16, 0.012, 0.22], { tone: 0.97, detail: true });        // the receipt pad
      S.sign([-1.4, 0.45, 0.62], [1.1, 0.36], '세탁 수선', { board: 0.02, bg: 0.97 });
      // behind the counter: shelves of finished work, the press, the machine
      S.shelf([-2.4, 0, -1.6], 90, { w: 1.6, h: 2.0, d: 0.45, rows: 4, fill: false, tone: 0.86 });
      for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) foldedStack(S, [-2.4, 0.02 + row * 0.495, -2.1 + i * 0.5], 2 + ((row + i) % 3));
      pressTable(S, [-0.6, 0, -1.4], 20);
      S.table([0.9, 0, -2.0], 0, { w: 1.0, d: 0.6, h: 0.74, tone: 0.82 });
      sewingMachine(S, [0.9, 0.74, -2.05], 0);
      S.stool([0.9, 0, -1.45], { h: 0.48 });
      S.carton([1.6, 0, -2.15], 10, [0.45, 0.35, 0.4]);
      S.carton([1.6, 0.35, -2.15], -5, [0.4, 0.28, 0.36], { tone: 0.88 });
      // the back wall: the curtained door to the house, the clock, the calendar, the price list, a fan
      S.curtain([1.46, 1.25, -2.47], 0, 0.9, 0.8, { tone: 0.8 });
      S.clock([0.3, 2.25, -2.42], 0);
      S.poster([-0.85, 1.35, -2.42], 0, [0.38, 0.55], '11월\n2026', { bg: 0.95 });
      S.sign([0.3, 1.3, -2.43], [0.95, 0.66], '와이셔츠 2,500\n양복 상하 9,000\n바지 수선 5,000', { bg: 0.92, board: 0.02 });
      S.grid([0, 0, 0], [W, D], 0.3);                                                         // floor tiles
      S.grid([0, H, 0], [W, D], 0.6, { plane: 'ceiling', weight: 0.4 });                      // ceiling boards
      S.box([-2.95, 1.9, 1.2], [0.1, 0.25, 0.4], { tone: 0.6 });                              // a radio on a bracket
      S.box([-2.95, 1.86, 1.2], [0.1, 0.04, 0.5], { tone: 0.8 });
      S.plant([-2.5, 0, 2.05], { h: 0.8, pot: 0.18 });
      S.box([1.9, 0.005, 1.9], [1.0, 0.012, 0.6], { tone: 0.7, cast: false });               // the door mat
      for (const x of [-1.6, 1.0]) S.fluorescent([x, H, 0.6], 90, 1.2);
      S.fluorescent([-0.3, H, -1.4], 0, 1.2);
    },
  },

  // ── 2 · the rooftop room (day) ─────────────────────────────────────────────────────────────────
  roof: {
    name: '옥탑방 옥상', mood: 'day',
    build(S) {
      S.sun({ dir: [-0.6, 0.75, 0.45], area: { center: [0, 1, -1], radius: 9 } });
      S.box([0, -0.3, 0], [10, 0.3, 9], { tone: 0.88, crease: 20 });                         // the roof slab
      for (const [x, z, w, d] of [[0, -4.5, 10, 0.2], [-5, 0, 0.2, 8.8], [5, 0, 0.2, 8.8], [0, 4.5, 10, 0.2]]) S.box([x, 0, z], [w, 1.0, d], { tone: 0.94 });
      // the rooftop room with its door, window, outdoor unit and gas bottle
      S.at([-2.2, 0, -2.6], 0, () => {
        S.box([0, 0, 0], [4.2, 2.4, 3.0], { tone: 0.97 });
        S.box([0, 2.4, 0.15], [4.6, 0.12, 3.5], { tone: 0.8 });
        S.door([0.9, 0, 1.5], 0.85, 2.0, { t: 0.06, tone: 0.72 });
        S.window([-0.9, 1.0, 1.5], 1.2, 0.9, { t: 0.06, panes: [2, 1], sill: true });
        for (let i = 0; i < 6; i++) S.box([-1.5 + i * 0.12, 1.0, 1.56], [0.025, 0.9, 0.025], { tone: 0.55, detail: true });   // the window bars
        S.box([2.6, 0, 0.6], [0.75, 0.6, 0.32], { tone: 0.95 });
        S.cyl([2.6, 0.24, 0.77], 0.18, 0.02, { rot: [90, 0, 0], tone: 0.7, seg: 18 });
        S.cyl([-2.45, 0, 1.0], 0.17, 0.9, { tone: 0.72, seg: 14 });
        S.line([[-2.45, 0.9, 1.0], [-2.3, 1.2, 1.1], [-2.1, 1.4, 1.5]], { weight: 0.8 });
      });
      // the water tank on its stand
      S.at([3.2, 0, -3.1], 0, () => {
        for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) S.box([x, 0, z], [0.08, 0.9, 0.08], { tone: 0.6 });
        S.box([0, 0.9, 0], [1.5, 0.08, 1.5], { tone: 0.65 });
        S.cyl([0, 0.98, 0], 0.75, 1.3, { tone: 0.9, seg: 22 });
        S.cyl([0, 2.28, 0], 0.3, 0.12, { tone: 0.8, seg: 16 });
        S.line([[0.75, 1.3, 0], [1.2, 1.3, 0], [1.2, 0.1, 0], [1.7, 0.1, 0.3]], { weight: 1.1 });
      });
      // washing lines between two posts and the room's eave
      for (const p of [[3.8, 0, 1.1], [-3.6, 0, 1.1]]) S.cyl(p, 0.04, 2.1, { tone: 0.6, seg: 8 });
      washing(S, [-3.6, 2.0, 1.1], [3.8, 2.0, 1.1], ['shirt', 'towel', 'towel', 'socks', 'shirt', 'towel', 'shirt']);
      washing(S, [-3.6, 1.8, 1.1], [-0.4, 2.2, -1.0], ['towel', 'socks']);
      // the table, the chairs, the planters
      S.table([1.4, 0, 2.7], 15, { w: 0.8, d: 0.8, h: 0.7, tone: 0.95 });
      S.chair([0.8, 0, 3.1], 120, { tone: 0.95 }); S.chair([2.0, 0, 2.2], -50, { tone: 0.95 });
      for (let i = 0; i < 4; i++) { S.box([-4.4 + i * 0.75, 0, 3.9], [0.6, 0.32, 0.42], { tone: 0.97 }); for (let k = 0; k < 6; k++) S.cone([-4.6 + i * 0.75 + k * 0.08, 0.32, 3.9 + (k % 2) * 0.1], 0.02, 0.35 + 0.15 * S.rand(), { tone: 0.6, seg: 5, detail: true }); }
            // the neighbourhood around: other rooftops, an apartment block, a church spire, wires
      const r = S.rand;
      for (let gx = -4; gx <= 3; gx++) for (let gz = -4; gz <= 1; gz++) {          // neighbouring roofs, a street grid
        const x = gx * 9.5 + (r() - 0.5) * 1.5, z = gz * 9 - 1 + (r() - 0.5) * 1.5;
        if (Math.abs(x) < 12.5 && z > -11) continue;                                 // our own building and its street
        const floors = 3 + (r() < 0.3 ? 1 : 0);
        S.building([x, -9.4 - r() * 1.2, z], r() < 0.2 ? 90 : 0, { w: 7 + r() * 1.5, d: 7.5, floors, fh: 2.8, cols: 3, tone: [0.97, 0.9, 0.84][(gx + gz + 9) % 3], simple: true, ac: 0.15 });
        if (r() < 0.35) S.cyl([x + 1.5, -9.4 + floors * 2.8 + 0.5, z - 1], 0.6, 1.1, { tone: 0.9, seg: 14 });   // their water tanks
      }
      for (let i = 0; i < 3; i++) S.building([-24 + i * 12, -9.4, -55], 0, { w: 9, d: 9, floors: 15, fh: 2.8, cols: 5, tone: 0.92, parapet: false, ac: 0, simple: true });
      S.at([16, -9.4, -34], 0, () => { S.box([0, 0, 0], [4, 9, 6], { tone: 0.9 }); S.cone([0, 9, 0], 1.6, 5, { seg: 4, tone: 0.85, crease: 20 }); S.box([0, 14, 0], [0.12, 1.6, 0.12], { tone: 0.4 }); S.box([0, 14.9, 0], [0.8, 0.12, 0.12], { tone: 0.4 }); });
      const p1 = S.pole([6.2, -9.4, 5], { h: 18.5 }), p2 = S.pole([6.4, -9.4, -14], { h: 18 }), p3 = S.pole([6.8, -9.4, -33], { h: 18 });
      S.wires([p1, p2, p3]);
      S.line([[6.2, 8.7, 5], [-0.2, 1.8, -1.1]], { sag: 0.3, weight: 0.7 });   // the drop to the rooftop room
    },
  },

  // ── 3 · the alley stairs (late afternoon) ─────────────────────────────────────────────────────
  stairs: {
    name: '비탈 골목 계단', mood: 'day',
    build(S) {
      S.sun({ dir: [0.6, 0.95, -0.25], area: { center: [0, 2, -6], radius: 11 } });
      const rise = 0.165, run = 0.32, n = 22, top = n * rise, zEnd = -3 - n * run, r = S.rand;
      S.box([0, -0.2, 2], [12, 0.2, 10], { tone: 0.86 });                                     // the street at the bottom
      S.stairs([0, 0, -3], n, 3.0, rise, run, { tone: 0.93 });
      S.box([0, 0, -3 - n * run - 3], [3.0, top, 6], { tone: 0.9 });                          // the landing above
      const ground = z => (z > -3 ? 0 : z < zEnd ? top : Math.ceil((-3 - z) / run) * rise);
      // handrail down the middle: posts and a sloped rail
      const slope = Math.atan2(rise, run) * 180 / Math.PI, len = Math.hypot(n * run, top);
      for (let i = 0; i <= n; i += 4) S.cyl([0, ground(-3 - i * run - 0.01), -3 - i * run - 0.15], 0.025, 0.9, { tone: 0.6, seg: 8 });
      S.box([0, top / 2 + 0.9, -3 - (n * run) / 2], [0.05, 0.05, len], { rot: [slope, 0, 0], tone: 0.6, center: true });
      // houses climbing both sides
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const z = 1 - i * 3.6, g = ground(z - 1.8), h = 4.6 + r() * 1.6, dpt = 5;
        S.at([side * (1.5 + dpt / 2), g, z - 1.8], side > 0 ? -90 : 90, () => {
          S.box([0, -3, 0], [3.5, h + 3, dpt], { tone: [0.98, 0.9, 0.95, 0.86][(i + (side > 0 ? 1 : 0)) % 4], crease: 20 });
          S.box([0, h, 0.1], [3.8, 0.12, dpt + 0.3], { tone: 0.7 });
          S.window([-0.6, 1.2, dpt / 2 + 0.02], 1.1, 0.9, { t: 0.06, panes: [2, 1], sill: true });
          for (let k = 0; k < 5; k++) S.box([-1.05 + k * 0.22, 1.15, dpt / 2 + 0.08], [0.02, 1.0, 0.02], { tone: 0.5, detail: true });
          S.box([-0.6, 1.15, dpt / 2 + 0.08], [1.15, 0.02, 0.02], { tone: 0.5, detail: true }); S.box([-0.6, 2.13, dpt / 2 + 0.08], [1.15, 0.02, 0.02], { tone: 0.5, detail: true });
          if (i % 2 === 0) { S.door([1.0, 0, dpt / 2 + 0.02], 0.9, 2.0, { t: 0.06, tone: 0.6 }); S.box([1.0, 2.05, dpt / 2 + 0.25], [1.2, 0.06, 0.55], { tone: 0.75 }); }
          else { S.box([1.1, 1.3, dpt / 2 + 0.1], [0.32, 0.4, 0.2], { tone: 0.82 }); S.line([[1.1, 1.3, dpt / 2 + 0.1], [1.1, 0.2, dpt / 2 + 0.06], [1.6, 0.2, dpt / 2 + 0.06]], { weight: 1 }); }  // gas meter + pipe
          S.window([0.3, 3.3, dpt / 2 + 0.02], 1.4, 1.0, { t: 0.06, panes: [2, 1], sill: true });
          if (r() < 0.6) S.box([0.3, 3.0, dpt / 2 + 0.35], [1.6, 0.05, 0.6], { tone: 0.8 });
          S.line([[1.7, h, dpt / 2 + 0.06], [1.7, 0.1, dpt / 2 + 0.06]], { weight: 1.1 });   // the downpipe
        });
      }
      // things on the steps
      for (let i = 0; i < 6; i++) { const z = -3.4 - i * 1.15, x = (i % 2 ? 1 : -1) * 1.2; S.plant([x, ground(z), z], { h: 0.45 + 0.3 * r(), pot: 0.13 }); }
      S.box([-1.1, ground(-8.6), -8.6], [0.5, 0.28, 0.35], { tone: 0.97 });
      S.cyl([1.25, ground(-5.3), -5.3], 0.2, 0.55, { tone: 0.7, seg: 14 });                   // a rubber bucket
      // the pole at the top with its mirror, the lamp, wires over the alley
      const pa = S.pole([1.25, top, zEnd - 1.2], { h: 8, arm: 1.2 });
      const pb = S.pole([-1.3, 0, 3.5], { h: 8.5, arm: 1.2, transformer: true });
      S.wires([pb, pa]);
      S.line([pa[0], [-3.5, top + 4.8, zEnd + 2]], { sag: 0.4, weight: 0.7 });
      S.line([pb[2], [3.5, 5.2, 0.2]], { sag: 0.3, weight: 0.7 });
      S.lathe([1.25, top + 3.2, zEnd - 1.0], [[0.01, 0], [0.25, 0.04], [0.32, 0.12]], { rot: [80, 160, 0], tone: 0.92, seg: 18, open: true });   // the convex mirror
      S.streetlamp([-1.25, top, zEnd - 0.4], 160, { h: 4.5, light: 0 });
      S.sign([0, top + 0.02, zEnd - 0.2], [1.2, 0.3], '천천히', { rot: [-90, 0, 0], board: 0, bg: 0.9, frame: false });
    },
  },

  // ── 4 · the bus stop (night) ──────────────────────────────────────────────────────────────────
  busstop: {
    name: '밤의 버스 정류장', mood: 'night',
    build(S) {
      S.sun({ dir: [0.3, 1, 0.6], shadow: false });
      S.road([30, 0, -4.5], 90, { w: 7, len: 60, kerb: 3, cross: 33, tone: 0.55 });
      S.box([0, -0.05, 6], [60, 0.2, 8], { tone: 0.7, lines: 'none' });   // starts where the kerb ends (z 2): no shared top face
      // the shelter
      S.at([0, 0.15, 0.6], 0, () => {
        for (const x of [-1.9, 0, 1.9]) S.box([x, 0, 0.6], [0.08, 2.5, 0.08], { tone: 0.6 });
        S.box([0, 2.5, 0.2], [4.2, 0.12, 1.6], { tone: 0.75, rot: [-4, 0, 0] });
        for (const x of [-0.95, 0.95]) S.box([x, 0.15, 0.62], [1.8, 2.1, 0.02], { flag: 'glass', lines: 'outline' });
        S.box([-1.9, 0.15, 0.1], [0.02, 2.1, 0.95], { flag: 'glass', lines: 'outline' });
        S.glow([1.9, 0.3, 0.1], [0.12, 1.8, 0.9], { lines: 'all' });                           // the lit advert panel
        S.bench([0, 0, 0.25], 0, { w: 2.4 });
        S.sign([0.9, 2.1, 0.58], [0.9, 0.28], '6월 12일 10:42', { bg: 0.15, ink: 0.95, board: 0.03 });
        S.glow([0, 2.4, 0.2], [2.8, 0.03, 0.08], { lines: 'none' });
        S.light([0, 2.1, 0.2], { intensity: 0.9, distance: 5 });
      });
      S.at([-2.8, 0.15, -0.3], 0, () => {                                                       // the stop sign post
        S.cyl([0, 0, 0], 0.05, 3.0, { tone: 0.6, seg: 10 });
        S.sign([0, 2.5, 0.04], [0.7, 0.5], '정류장\n세탁소 앞', { bg: 0.97 });
        S.sign([0, 1.6, 0.04], [0.6, 0.7], '6411\n7016\nN13', { bg: 0.92 });
      });
      // across the road: a row of shops, one lit late
      const shops = [['24시 편의점', true], ['꽃집', false], ['분식 김밥', true], ['수선 세탁', false], ['부동산', false]];
      shops.forEach(([name, lit], i) => S.building([-14 + i * 7, 0, -14], 0, { w: 6.6, d: 7, floors: 3 + (i % 2), fh: 3, cols: 3, tone: [0.75, 0.68, 0.78][i % 3], lit: 0.45, ac: 0.3, shop: { sign: name, lit, awning: lit ? 0.6 : false, signBg: 0.95 } }));
      S.light([-14, 2, -9.5], { intensity: 1.2, distance: 7 }); S.light([0, 2, -9.5], { intensity: 1, distance: 6 });
      // lamps, poles, wires, a parked car, a traffic light
      for (const x of [-9, 6]) S.streetlamp([x, 0.15, -0.6], 180, { h: 6 });
      S.streetlamp([-2, 0.15, -9], 0, { h: 6, light: 0.8 });
      const poles = [-18, -6, 6, 18].map(x => S.pole([x, 0.15, -9.6], { h: 9 }));
      S.wires(poles);
      S.car([9, 0, -6.6], 90, { tone: 0.6 });
      S.at([12, 0.15, -0.8], 0, () => { S.cyl([0, 0, 0], 0.07, 3.2, { tone: 0.55 }); S.box([0, 2.6, 0.1], [0.32, 0.9, 0.25], { tone: 0.35 }); S.glow([0, 3.15, 0.24], 0.09, { shape: 'sphere' }); });
    },
  },
};
