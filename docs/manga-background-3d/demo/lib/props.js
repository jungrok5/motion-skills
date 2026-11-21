// manga-background-3d · props.js — a prop kit built from the Stage primitives. Each prop sits on its pos (floor
// level), turned by ry degrees about y, front facing +z. They are examples of the style's level of detail — a piece
// adds its own props in its scenes.js the same way (see references/KIT.md). Tones: 1 paper … 0 ink.
import { Stage } from './kit.js';

const P = Stage.prototype;
const def = (o, d) => ({ ...d, ...o });

// ── indoors ───────────────────────────────────────────────────────────────────────────────────────
P.desk = function (pos, ry = 0, o = {}) {
  const { w, d, h, tone, drawers } = def(o, { w: 1.2, d: 0.6, h: 0.72, tone: 0.9, drawers: true });
  return this.at(pos, ry, () => {
    this.box([0, h - 0.03, 0], [w, 0.03, d], { tone });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (!(drawers && sx > 0)) this.box([sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03)], [0.035, h - 0.03, 0.035], { tone: tone * 0.9, detail: true });
    if (drawers) {
      this.box([w / 2 - 0.2, 0, 0], [0.4, h - 0.03, d - 0.02], { tone });
      for (let i = 0; i < 3; i++) { this.box([w / 2 - 0.2, 0.05 + i * 0.21, d / 2 - 0.005], [0.36, 0.19, 0.012], { tone, detail: true }); this.box([w / 2 - 0.2, 0.15 + i * 0.21, d / 2 + 0.005], [0.08, 0.012, 0.012], { tone: 0.5, detail: true }); }
    }
  });
};
P.chair = function (pos, ry = 0, o = {}) {
  const { tone, h } = def(o, { tone: 0.8, h: 0.45 });
  return this.at(pos, ry, () => {
    this.box([0, h - 0.03, 0], [0.42, 0.04, 0.42], { tone });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box([sx * 0.18, 0, sz * 0.18], [0.03, h - 0.03, 0.03], { tone: tone * 0.85, detail: true });
    for (const sx of [-1, 1]) this.box([sx * 0.18, h, -0.19], [0.03, 0.42, 0.03], { tone: tone * 0.85, detail: true });
    this.box([0, h + 0.22, -0.19], [0.42, 0.2, 0.025], { tone });
  });
};
P.stool = function (pos, o = {}) {
  const { h, r, tone } = def(o, { h: 0.65, r: 0.17, tone: 0.75 });
  this.cyl([pos[0], pos[1] + h - 0.05, pos[2]], r, 0.05, { tone, seg: 18 });
  this.cyl([pos[0], pos[1], pos[2]], 0.03, h - 0.05, { tone: 0.55, detail: true, seg: 8 });
  this.cyl([pos[0], pos[1], pos[2]], r * 0.9, 0.025, { tone: 0.55, seg: 16 });
  this.torus([pos[0], pos[1] + h * 0.35, pos[2]], r * 0.75, 0.012, { tone: 0.55, detail: true });
};
P.table = function (pos, ry = 0, o = {}) {
  const { w, d, h, tone } = def(o, { w: 1.4, d: 0.8, h: 0.72, tone: 0.86 });
  return this.at(pos, ry, () => {
    this.box([0, h - 0.04, 0], [w, 0.04, d], { tone });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box([sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06)], [0.045, h - 0.04, 0.045], { tone: tone * 0.85, detail: true });
  });
};
P.shelf = function (pos, ry = 0, o = {}) {
  const { w, h, d, rows, tone, fill, open } = def(o, { w: 0.9, h: 1.8, d: 0.35, rows: 4, tone: 0.92, fill: true, open: false });
  const r = this.rand;
  return this.at(pos, ry, () => {
    if (open) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box([sx * (w / 2 - 0.015), 0, sz * (d / 2 - 0.015)], [0.025, h, 0.025], { tone, detail: true }); }
    else { for (const sx of [-1, 1]) this.box([sx * (w / 2 - 0.01), 0, 0], [0.02, h, d], { tone }); this.box([0, 0, -d / 2 + 0.005], [w, h, 0.01], { tone: tone * 0.95 }); }
    for (let i = 0; i <= rows; i++) this.box([0, (i * (h - 0.02)) / rows, 0], [w - (open ? 0 : 0.04), 0.02, d], { tone, detail: i > 0 && i < rows });
    if (fill) for (let i = 0; i < rows; i++) {
      const y = (i * (h - 0.02)) / rows + 0.02, sh = (h - 0.02) / rows - 0.06;
      let x = -w / 2 + 0.04;
      while (x < w / 2 - 0.1) {
        const kind = r();
        if (kind < 0.55) { const n = 3 + (r() * 6 | 0); this.books([x, y, 0], 0, { n, h: sh * (0.6 + 0.35 * r()), d: d * 0.8 }); x += n * 0.035 + 0.03; }
        else if (kind < 0.8) { const bw = 0.12 + r() * 0.12; this.carton([x + bw / 2, y, 0], 0, [bw, sh * (0.4 + 0.4 * r()), d * 0.75]); x += bw + 0.03; }
        else { this.bottle([x + 0.04, y, d * 0.1], { h: sh * (0.5 + 0.4 * r()) }); x += 0.1; }
      }
    }
  });
};
P.books = function (pos, ry = 0, o = {}) {
  const { n, h, d, lean } = def(o, { n: 6, h: 0.24, d: 0.18, lean: true });
  const r = this.rand;
  return this.at(pos, ry, () => {
    let x = 0;
    for (let i = 0; i < n; i++) { const bw = 0.022 + r() * 0.025, bh = h * (0.72 + 0.28 * r()); this.box([x + bw / 2, 0, 0], [bw, bh, d * (0.85 + 0.15 * r())], { tone: [0.95, 0.8, 0.65, 0.88, 0.5][(r() * 5) | 0], detail: true }); x += bw + 0.002; }
    if (lean && r() < 0.5) this.box([x + 0.06, 0, 0], [0.03, h * 0.85, d * 0.9], { rot: [0, 0, -22], tone: 0.7, detail: true });
  });
};
P.counter = function (pos, ry = 0, o = {}) {
  const { w, d, h, tone, top } = def(o, { w: 2, d: 0.6, h: 0.95, tone: 0.86, top: 0.95 });
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [w, h - 0.04, d], { tone });
    this.box([0, h - 0.04, 0.02], [w + 0.04, 0.04, d + 0.06], { tone: top });
    this.box([0, 0, d / 2 + 0.002], [w, 0.1, 0.01], { tone: tone * 0.7, detail: true });
  });
};
P.cabinet = function (pos, ry = 0, o = {}) {
  const { w, h, d, doors, tone } = def(o, { w: 0.8, h: 0.9, d: 0.45, doors: 2, tone: 0.88 });
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [w, h, d], { tone });
    for (let i = 0; i < doors; i++) { const dw = w / doors; this.box([-w / 2 + dw * (i + 0.5), 0.04, d / 2], [dw - 0.02, h - 0.08, 0.012], { tone, detail: true }); this.box([-w / 2 + dw * (i + 0.5) + (i % 2 ? -1 : 1) * (dw / 2 - 0.06), h * 0.55, d / 2 + 0.012], [0.015, 0.1, 0.015], { tone: 0.45, detail: true }); }
  });
};
P.fridge = function (pos, ry = 0, o = {}) {
  const { w, h, d, tone } = def(o, { w: 0.65, h: 1.6, d: 0.65, tone: 0.95 });
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [w, h, d], { tone });
    this.box([0, h * 0.62, d / 2 + 0.002], [w - 0.01, 0.012, 0.006], { tone: 0.6, detail: true });
    for (const y of [h * 0.4, h * 0.75]) this.box([w / 2 - 0.06, y, d / 2 + 0.015], [0.02, 0.22, 0.025], { tone: 0.6, detail: true });
  });
};
P.monitor = function (pos, ry = 0, o = {}) {
  const { w, tone, on } = def(o, { w: 0.5, tone: 0.45, on: false });
  const h = w * 0.62;
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [0.2, 0.015, 0.16], { tone });
    this.box([0, 0, -0.03], [0.04, 0.12, 0.03], { tone });
    this.box([0, 0.1, 0], [w, h, 0.035], { tone });
    this.box([0, 0.1 + 0.02, 0.018], [w - 0.04, h - 0.04, 0.004], { flag: on ? 'light' : 'glass', tone: 0.9, lines: 'all', detail: true });
  });
};
P.bottle = function (pos, o = {}) {
  const { h, r, tone } = def(o, { h: 0.28, r: 0.04, tone: 0.92 });
  return this.lathe(pos, [[0, 0], [r, 0], [r, h * 0.62], [r * 0.4, h * 0.82], [r * 0.32, h * 0.97], [r * 0.34, h], [0, h]], { tone, seg: 12, detail: true });
};
P.can = function (pos, o = {}) { const { h, r, tone } = def(o, { h: 0.12, r: 0.033, tone: 0.8 }); return this.cyl(pos, r, h, { tone, seg: 12, detail: true }); };
P.cup = function (pos, o = {}) { const { h, r, tone } = def(o, { h: 0.1, r: 0.04, tone: 0.95 }); return this.cyl(pos, r * 0.8, h, { r2: r, tone, seg: 14, open: false, detail: true }); };
P.carton = function (pos, ry = 0, size = [0.4, 0.3, 0.35], o = {}) {
  const [w, h, d] = size;
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [w, h, d], { tone: o.tone ?? 0.8 });
    this.box([0, h, 0], [0.06, 0.003, d + 0.002], { tone: 0.95, detail: true, lines: 'outline' });
  });
};
P.plant = function (pos, o = {}) {
  const { h, pot, tone } = def(o, { h: 0.6, pot: 0.14, tone: 0.62 });
  const r = this.rand;
  this.cyl(pos, pot * 0.8, pot * 1.2, { r2: pot, tone: 0.85, seg: 14 });
  const n = 5 + (r() * 4 | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + r() * 30, l = h * (0.55 + 0.45 * r());
    this.at([pos[0], pos[1] + pot * 1.15, pos[2]], a, () => this.extrude([0, 0, 0], [[0, 0], [l * 0.18, l * 0.55], [0, l], [-l * 0.18, l * 0.55]], 0.006, { rot: [-(15 + 35 * r()), 0, 0], tone, detail: true, crease: 60 }));
  }
};
P.clock = function (pos, ry = 0, o = {}) {
  const { r } = def(o, { r: 0.16 });
  return this.at(pos, ry, () => {
    this.cyl([0, 0, 0], r, 0.04, { rot: [90, 0, 0], tone: 0.95, seg: 24 });
    this.box([0, 0.02, 0.025], [0.012, r * 0.6, 0.004], { tone: 0.15, rot: [0, 0, -30], detail: true, center: true });
    this.box([0, 0.02, 0.026], [0.012, r * 0.85, 0.004], { tone: 0.15, rot: [0, 0, 70], detail: true, center: true });
  });
};
P.poster = function (pos, ry = 0, size = [0.42, 0.6], text = '', o = {}) {
  if (text) return this.sign(pos, size, text, { ry, board: 0, bg: o.bg ?? 0.95, ...o });
  return this.plane(pos, size, { ry, tone: o.tone ?? 0.9 });
};
P.fluorescent = function (pos, ry = 0, len = 1.2, o = {}) {
  return this.at(pos, ry, () => {
    this.box([0, -0.05, 0], [len, 0.05, 0.14], { tone: 0.95, cast: false });
    this.glow([0, -0.08, 0], [len - 0.06, 0.03, 0.04], { lines: 'outline', detail: true });
    if (o.light) this.light([0, -0.2, 0], { intensity: o.light, distance: 5 });
  });
};
P.pendant = function (pos, drop = 0.6, o = {}) {
  const [x, y, z] = pos, sy = y - drop;
  this.line([[x, y, z], [x, sy + 0.18, z]], { weight: 0.7 });
  this.lathe([x, sy, z], [[0.02, 0.18], [0.05, 0.16], [o.r ?? 0.17, 0.02], [o.r ?? 0.17, 0]], { tone: o.tone ?? 0.6, seg: 18, open: true });
  this.glow([x, sy + 0.03, z], 0.045, { shape: 'sphere', lines: 'none' });
  if (o.light) this.light([x, sy - 0.1, z], { intensity: o.light, distance: o.distance ?? 4 });
};
P.aircon = function (pos, ry = 0, o = {}) {
  return this.at(pos, ry, () => {
    this.box([0, 0, 0.11], [0.85, 0.28, 0.22], { tone: 0.97 });
    this.box([0, 0.03, 0.222], [0.75, 0.04, 0.006], { tone: 0.75, detail: true });
  });
};
// a curtain hung from a rail: folds as a zig-zag profile, o.gather 0..1 bunches it to one side
P.curtain = function (pos, ry = 0, w = 1.4, h = 1.6, o = {}) {
  const folds = Math.max(3, Math.round(w / 0.12)), d = 0.05, pts = [];
  for (let i = 0; i <= folds; i++) pts.push([(i / folds) * w - w / 2, (i % 2 ? d : 0)]);
  const prof = [...pts.map(p => [p[0], p[1]]), ...pts.slice().reverse().map(p => [p[0], p[1] + 0.01])];
  return this.at(pos, ry, () => {
    this.mesh([0, 0, 0], extrudeUp(prof, h), { tone: o.tone ?? 0.9, crease: 25 });
    this.cyl([-w / 2 - 0.05, h, 0.03], 0.012, w + 0.1, { rot: [0, 0, -90], tone: 0.6, detail: true, seg: 8 });
  });
};
P.bed = function (pos, ry = 0, o = {}) {
  const { w, l, tone } = def(o, { w: 1.0, l: 2.0, tone: 0.9 });
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [w, 0.3, l], { tone: 0.8 });
    this.box([0, 0.3, 0.05], [w - 0.04, 0.18, l - 0.12], { tone });
    this.box([0, 0.48, -l / 2 + 0.3], [w * 0.6, 0.1, 0.35], { tone: 0.97 });
    this.box([0, 0.48, 0.35], [w + 0.02, 0.06, l * 0.55], { tone: 0.82, rot: [2, 0, 0] });
    this.box([0, 0, -l / 2 - 0.02], [w, 0.8, 0.05], { tone: 0.8 });
  });
};
P.trash = function (pos, o = {}) { return this.cyl(pos, 0.13, 0.32, { r2: 0.15, tone: o.tone ?? 0.75, open: true, seg: 14 }); };

// ── outdoors ──────────────────────────────────────────────────────────────────────────────────────
// a building block whose front faces +z: floors of windows, an optional shop front with an awning and a sign,
// a parapet, balconies, an outside air-con unit or two. Returns nothing — call it many times with a seed.
P.building = function (pos, ry = 0, o = {}) {
  const r = this.rand;
  const { w, d, floors, fh, tone, cols, shop, parapet, balcony, sign, roofTone } = def(o, { w: 8, d: 8, floors: 3, fh: 3, tone: 0.92, cols: 3, shop: null, parapet: true, balcony: false, sign: null, roofTone: 0.8 });
  const H = floors * fh;
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [w, H, d], { tone, crease: 20 });
    if (parapet) { this.box([0, H, d / 2 - 0.08], [w, 0.5, 0.16], { tone }); this.box([-w / 2 + 0.08, H, 0], [0.16, 0.5, d], { tone }); this.box([w / 2 - 0.08, H, 0], [0.16, 0.5, d], { tone }); this.box([0, H, -d / 2 + 0.08], [w, 0.5, 0.16], { tone }); }
    const f0 = shop ? 1 : 0;
    for (let f = f0; f < floors; f++) {
      const y = f * fh + 0.9;
      this.box([0, f * fh - 0.05, d / 2 + 0.03], [w + 0.04, 0.1, 0.06], { tone: tone * 0.92, detail: true });
      for (let c = 0; c < cols; c++) {
        const ww = Math.min(1.6, (w / cols) * 0.62), x = -w / 2 + (w / cols) * (c + 0.5);
        if (o.lit && r() < o.lit) this.glow([x, y, d / 2 + 0.005], [ww, 1.2, 0.01], { lines: 'outline' });
        else if (o.simple) this.box([x, y, d / 2 + 0.005], [ww, 1.2, 0.012], { flag: 'glass', lines: 'outline', detail: true, cast: false });
        else this.window([x, y, d / 2 - 0.02], ww, 1.2, { t: 0.06, panes: [2, 1], frame: 0.7, sill: true });
        if (balcony && f > 0 && c % 2 === 0) { this.box([x, f * fh - 0.05, d / 2 + 0.5], [ww + 0.5, 0.1, 1.0], { tone: 0.9 }); this.box([x, f * fh + 0.05, d / 2 + 0.98], [ww + 0.5, 0.95, 0.05], { tone: 0.84 }); }
        if (r() < (o.ac ?? 0.25)) this.box([x + ww / 2 + 0.45, f * fh + 0.3, d / 2 + 0.2], [0.7, 0.5, 0.3], { tone: 0.95, detail: true });
      }
    }
    if (shop) {
      const st = shop.tone ?? 0.85;
      this.box([0, 0, d / 2 + 0.01], [w - 0.4, 2.4, 0.04], { flag: shop.lit ? 'light' : 'glass', lines: 'outline' });
      for (let i = 0; i <= (shop.bays ?? 3); i++) this.box([-w / 2 + 0.2 + (i * (w - 0.4)) / (shop.bays ?? 3), 0, d / 2 + 0.03], [0.08, 2.4, 0.08], { tone: st });
      this.box([0, 2.4, d / 2 + 0.03], [w - 0.3, 0.12, 0.1], { tone: st });
      if (shop.awning !== false) this.extrude([-w / 2 + 0.15, 2.75, d / 2], [[0, 0], [0, 0.25], [1.1, -0.25], [1.1, -0.4]], w - 0.3, { rot: [0, 90, 0], tone: shop.awning ?? 0.7 });
      if (shop.sign) this.sign([0, shop.awning === false ? 2.6 : 3.05, d / 2 + 0.05], [Math.min(w - 0.6, 3.6), 0.62], shop.sign, { bg: shop.signBg ?? 0.97 });
    }
    if (sign) this.sign([w / 2 + 0.05, fh * 1.2, d / 2 - 0.45], [0.55, Math.min(H - fh * 1.3, 3.2)], sign, { ry: 90, vertical: true, bg: 0.95 });
  });
};
// a utility pole; returns the world points where its wires attach (left / right of the crossarm)
P.pole = function (pos, o = {}) {
  const { h, arm, tone, ry, transformer } = def(o, { h: 9, arm: 1.6, tone: 0.8, ry: 0, transformer: false });
  let pts = [];
  this.at(pos, ry, () => {
    this.cyl([0, 0, 0], 0.15, h, { r2: 0.11, tone, seg: 14 });
    this.box([0, h - 0.6, 0], [arm, 0.1, 0.1], { tone: 0.7 });
    this.box([0, h - 1.3, 0], [arm * 0.75, 0.08, 0.08], { tone: 0.7 });
    for (const x of [-arm / 2 + 0.1, 0, arm / 2 - 0.1]) this.cyl([x, h - 0.5, 0], 0.03, 0.1, { tone: 0.9, detail: true, seg: 8 });
    if (transformer) this.cyl([0.3, h - 3, 0.25], 0.22, 0.75, { tone: 0.75, seg: 14 });
    for (let i = 0; i < 6; i++) this.box([0, 2.2 + i * 0.45, 0], [0.25, 0.025, 0.025], { rot: [0, i % 2 ? 90 : 0, 0], tone: 0.5, detail: true });
    pts = [[-arm / 2 + 0.1, h - 0.42, 0], [0, h - 0.42, 0], [arm / 2 - 0.1, h - 0.42, 0], [-arm * 0.35, h - 1.22, 0], [arm * 0.35, h - 1.22, 0]].map(p => this.world(p));
  });
  return pts;
};
// string sagging wires between consecutive poles' attach points (from pole())
P.wires = function (poles, o = {}) {
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1], n = Math.min(a.length, b.length, o.count ?? 5);
    for (let k = 0; k < n; k++) {
      const len = Math.hypot(b[k][0] - a[k][0], b[k][2] - a[k][2]);
      this.stack.push(new THREE.Matrix4());   // the attach points are already in world space
      this.line([a[k], b[k]], { sag: (o.sag ?? 0.035) * len * (0.85 + 0.3 * this.rand()), weight: o.weight ?? 0.75, seg: 20 });
      this.stack.pop();
    }
  }
};
P.streetlamp = function (pos, ry = 0, o = {}) {
  const { h, glow, light } = def(o, { h: 5.5, glow: true, light: 1.2 });
  return this.at(pos, ry, () => {
    this.cyl([0, 0, 0], 0.08, h, { r2: 0.06, tone: 0.7, seg: 12 });
    this.box([0, h - 0.1, 0.45], [0.06, 0.06, 0.9], { tone: 0.7 });
    this.box([0, h - 0.22, 0.9], [0.22, 0.14, 0.42], { tone: 0.75 });
    if (glow) this.glow([0, h - 0.26, 0.9], [0.18, 0.04, 0.36], { lines: 'none' });
    if (glow && light) this.light([0, h - 0.6, 0.9], { intensity: light, distance: 9 });
  });
};
P.vending = function (pos, ry = 0, o = {}) {
  const r = this.rand;
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [0.95, 1.83, 0.7], { tone: o.tone ?? 0.9 });
    this.box([0, 0.85, 0.351], [0.8, 0.85, 0.01], { flag: o.lit ? 'light' : 'glass', lines: 'outline' });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) this.can([-0.32 + i * 0.13, 0.9 + row * 0.27, 0.3], { h: 0.1, r: 0.028, tone: 0.5 + 0.4 * r() });
    this.box([0, 0.12, 0.352], [0.55, 0.2, 0.012], { tone: 0.3, detail: true });
  });
};
P.bench = function (pos, ry = 0, o = {}) {
  const { w } = def(o, { w: 1.6 });
  return this.at(pos, ry, () => {
    for (let i = 0; i < 3; i++) this.box([0, 0.43, -0.15 + i * 0.13], [w, 0.03, 0.1], { tone: 0.82 });
    for (let i = 0; i < 2; i++) this.box([0, 0.6 + i * 0.14, -0.24], [w, 0.1, 0.03], { tone: 0.82, rot: [-10, 0, 0] });
    for (const sx of [-1, 1]) { this.box([sx * (w / 2 - 0.12), 0, 0], [0.05, 0.43, 0.4], { tone: 0.5 }); this.box([sx * (w / 2 - 0.12), 0.43, -0.24], [0.05, 0.45, 0.04], { tone: 0.5 }); }
  });
};
// a railing along points [[x,z],…] at height h: posts every `step` metres and rails
P.railing = function (pts, o = {}) {
  const { h, step, tone, y, rails } = def(o, { h: 1.0, step: 1.2, tone: 0.75, y: 0, rails: 2 });
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / step));
    const ang = Math.atan2(-(z1 - z0), x1 - x0) * 180 / Math.PI;
    for (let k = 0; k <= n; k++) if (k < n || i === pts.length - 2) this.cyl([x0 + (x1 - x0) * k / n, y, z0 + (z1 - z0) * k / n], 0.025, h, { tone, detail: true, seg: 8 });
    this.at([(x0 + x1) / 2, y, (z0 + z1) / 2], ang, () => {
      this.box([0, h, 0], [len, 0.045, 0.05], { tone });
      for (let k = 1; k < rails; k++) this.box([0, (h * k) / rails, 0], [len, 0.025, 0.025], { tone, detail: true });
    });
  }
};
P.fence = function (pos, ry = 0, o = {}) {
  const { w, h, step } = def(o, { w: 4, h: 1.2, step: 0.12 });
  return this.at(pos, ry, () => {
    for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) this.box([x, 0, 0], [0.025, h, 0.025], { tone: 0.8, detail: true });
    for (const y of [0.1, h - 0.08]) this.box([0, y, 0], [w, 0.04, 0.04], { tone: 0.75 });
  });
};
P.tree = function (pos, o = {}) {
  const { kind, h, tone } = def(o, { kind: 'round', h: 5, tone: 0.62 });
  const r = this.rand;
  this.cyl(pos, h * 0.035, h * 0.45, { r2: h * 0.025, tone: 0.55, seg: 10 });
  if (kind === 'conifer') {
    for (let i = 0; i < 5; i++) { const y = h * (0.25 + i * 0.15), rr = h * (0.26 - i * 0.045); this.cone([pos[0], pos[1] + y, pos[2]], rr, h * 0.3, { tone, seg: 9 + (i % 2), rot: [0, r() * 60, 0], crease: 55 }); }
  } else {
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, rr = h * (0.13 + 0.09 * r()); this.sphere([pos[0] + Math.cos(a) * h * 0.13, pos[1] + h * (0.55 + 0.25 * r()), pos[2] + Math.sin(a) * h * 0.13], rr, { tone, seg: 9, seg2: 6, crease: 50 }); }
  }
};
// road along −z from pos: width w, length len, centre line dashes, kerbs, optional crosswalk at cross metres
P.road = function (pos, ry = 0, o = {}) {
  const { w, len, tone, kerb, cross, dashes } = def(o, { w: 7, len: 60, tone: 0.72, kerb: 2.5, cross: null, dashes: true });
  return this.at(pos, ry, () => {
    this.box([0, -0.02, -len / 2], [w, 0.02, len], { tone, lines: 'none' });
    for (const s of [-1, 1]) { this.box([s * (w / 2 + kerb / 2), -0.02, -len / 2], [kerb, 0.17, len], { tone: 0.88 }); }
    if (dashes) for (let z = 1; z < len; z += 4) this.box([0, 0, -z], [0.14, 0.004, 2], { tone: 0.97, lines: 'outline', detail: true, cast: false });
    if (cross !== null) for (let x = -w / 2 + 0.4; x < w / 2 - 0.3; x += 0.9) this.box([x + 0.25, 0, -cross], [0.5, 0.004, 3], { tone: 0.97, lines: 'outline', cast: false });
  });
};
P.car = function (pos, ry = 0, o = {}) {
  const { tone } = def(o, { tone: 0.8 });
  return this.at(pos, ry, () => {
    this.box([0, 0.3, 0], [1.75, 0.65, 4.3], { tone });
    this.extrude([-0.82, 0.95, 0], [[0, 0], [1.64, 0], [1.5, 0.55], [0.14, 0.55]], 2.2, { rot: [0, 90, 0], tone, centerZ: false });
    this.box([0, 1.0, -0.15], [1.6, 0.45, 1.8], { flag: 'glass', lines: 'none', cast: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.cyl([sx * 0.8, 0.32, sz * 1.35], 0.32, 0.22, { rot: [0, 0, 90], tone: 0.25, seg: 14, center: true });
  });
};
P.crate = function (pos, ry = 0, o = {}) {
  const s = o.size ?? 0.5;
  return this.at(pos, ry, () => {
    this.box([0, 0, 0], [s, s * 0.8, s * 0.75], { tone: o.tone ?? 0.78 });
    for (let i = 1; i < 3; i++) this.box([0, (s * 0.8 * i) / 3, s * 0.375 + 0.003], [s, 0.01, 0.006], { tone: 0.6, detail: true });
  });
};
// a paper lantern (night: it glows); o.text writes on it
P.lantern = function (pos, o = {}) {
  const { r, h, glow } = def(o, { r: 0.18, h: 0.42, glow: true });
  const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push([r * Math.sin(Math.PI * (0.12 + 0.76 * t)), h * t]); }
  this.cyl([pos[0], pos[1] + h, pos[2]], r * 0.45, 0.04, { tone: 0.3, detail: true, seg: 12 });
  this.cyl([pos[0], pos[1] - 0.04, pos[2]], r * 0.45, 0.04, { tone: 0.3, detail: true, seg: 12 });
  return this.lathe(pos, prof, { flag: glow ? 'light' : 'solid', tone: 0.95, seg: 14, lines: 'outline', cast: false });
};

// extrude an XZ profile upward (used by curtain)
import * as THREE from 'three';
function extrudeUp(prof, h) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(prof.map(p => new THREE.Vector2(p[0], -p[1]))), { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

export { Stage };
