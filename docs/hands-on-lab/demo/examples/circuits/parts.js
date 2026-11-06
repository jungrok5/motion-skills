// Circuits course · the bench parts, built from the kit. Each returns its group and the world points wires attach to.
// Sizes are in bench units (1 ≈ 2 cm). Parts sit on the floor (y = 0) unless lifted.
export const COL = {
  cell: '#8fd14f', band: '#f5a524', cap: '#2b2f38', metal: '#c9ced6', brass: '#d9a441', wood: '#c08a55', woodTop: '#d39a62',
  red: '#e0503a', green: '#4caf50', black: '#2f333b', glass: '#fff4cf', meter: '#f2c230', bezel: '#2b2f38',
  body: '#e9d7b4', board: '#f4f1ea', can: '#2e5fa8',
};

const RES_COL = ['#1b1b1b', '#7b4a24', '#d33a2c', '#f08a24', '#f2d22e', '#3c9a4a', '#2f62c9', '#8a4bc8', '#8c8c8c', '#f5f5f5'];
/** resistor colour bands for a value in ohms: [digit, digit, multiplier, gold] */
export function bands(ohms) {
  const e = Math.floor(Math.log10(ohms)) - 1, d = Math.round(ohms / 10 ** e);
  const d1 = Math.floor(d / 10) % 10, d2 = d % 10;
  return [RES_COL[d1], RES_COL[d2], RES_COL[Math.max(0, e)] ?? RES_COL[0], '#c9a03a'];
}

/** a cell lying along x: battery(k, { at, rot, volts, part }) → { g, plus, minus } */
export function battery(k, o = {}) {
  const g = k.group({ at: o.at || [0, 0, 0], rot: o.rot || [0, 0, 0] });
  const L = o.len ?? 2.3, R = 0.46, y = R;
  const p = o.part ?? 'battery';
  k.cyl(R, R, L, { axis: 'x', at: [0, y, 0], color: COL.cell, parent: g, part: p });
  k.cyl(R * 1.004, R * 1.004, 0.32, { axis: 'x', at: [L / 2 - 0.36, y, 0], color: COL.band, parent: g, part: p, outline: false });
  k.cyl(R * 0.98, R * 0.98, 0.12, { axis: 'x', at: [-L / 2 - 0.04, y, 0], color: COL.cap, parent: g, part: p });
  k.cyl(R * 0.98, R * 0.98, 0.1, { axis: 'x', at: [L / 2 + 0.03, y, 0], color: COL.cap, parent: g, part: p });
  k.cyl(0.14, 0.16, 0.16, { axis: 'x', at: [L / 2 + 0.15, y, 0], color: COL.metal, parent: g, part: p });
  k.text(o.volts != null ? `${o.volts} V` : '+', { w: 1.0, h: 0.42, at: [-0.15, y + R + 0.005, 0], rot: [-90, 0, 0], parent: g, color: '#1f3a12', size: 0.78 });
  return { g, plus: k.at(g, [L / 2 + 0.24, y, 0]), minus: k.at(g, [-L / 2 - 0.11, y, 0]), top: k.at(g, [0, y + R, 0]) };
}

/** a wooden block with two brass screws; returns the screw tops */
export function block(k, o = {}) {
  const g = k.group({ at: o.at || [0, 0, 0], rot: o.rot || [0, 0, 0] });
  const w = o.w ?? 1.5, d = o.d ?? 0.9, h = o.h ?? 0.32;
  k.box(w, h, d, { at: [0, h / 2, 0], color: COL.wood, parent: g, r: 0.06, part: o.part });
  const sx = w / 2 - 0.2;
  for (const x of [-sx, sx]) k.cyl(0.1, 0.1, 0.08, { at: [x, h + 0.04, d * 0.22], color: COL.brass, parent: g, part: o.part });
  return { g, h, a: k.at(g, [-sx, h + 0.06, d * 0.22]), b: k.at(g, [sx, h + 0.06, d * 0.22]) };
}

/** a bulb on a block: bulb(k, { at, part }) → { g, a, b, set(level), glass } */
export function bulb(k, o = {}) {
  const p = o.part ?? 'bulb';
  const bl = block(k, { ...o, w: 1.3, d: 1.0, part: p });
  const g = bl.g;
  const sock = k.group({ at: [0, bl.h, -0.08], parent: g });
  k.cyl(0.26, 0.3, 0.16, { at: [0, 0.08, 0], color: COL.metal, parent: sock, part: p });
  for (let i = 0; i < 3; i++) k.torus(0.235, 0.035, { axis: 'y', at: [0, 0.2 + i * 0.075, 0], color: COL.metal, parent: sock, part: p });
  k.cyl(0.235, 0.235, 0.24, { at: [0, 0.28, 0], color: COL.metal, parent: sock, part: p, outline: false });
  const glassMat = k.toon(COL.glass, { fresh: true });
  if (o.out) return { g, a: bl.a, b: bl.b, sock, top: k.at(sock, [0, 0.6, 0]), set() {} };
  const glass = k.lathe([[0.001, 1.38], [0.22, 1.33], [0.42, 1.14], [0.48, 0.92], [0.4, 0.68], [0.24, 0.5], [0.2, 0.4], [0.2, 0.38]], { parent: sock, material: glassMat, part: p, seg: 36 });
  const fil = k.tube([[-0.1, 0.45, 0], [-0.08, 0.86, 0], [0, 0.95, 0], [0.08, 0.86, 0], [0.1, 0.45, 0]], 0.018, { color: '#a07a3c', parent: sock, outline: false, shadow: false });
  const glow = k.glow([0, 0.95, 0], { parent: sock, size: o.glowSize ?? 3.2, color: '#ffd54a' });
  const cold = new k.THREE.Color(COL.glass), hot = new k.THREE.Color('#ffe066');
  return {
    g, a: bl.a, b: bl.b, glass, sock, top: k.at(sock, [0, 1.45, 0]),
    set(lv) {
      lv = Math.max(0, Math.min(1.2, lv));
      glassMat.color.copy(cold).lerp(hot, Math.min(1, lv)); glassMat.emissive.setRGB(0.55 * lv, 0.45 * lv, 0.1 * lv);
      fil.material = k.toon(lv > 0.05 ? '#ff9c2a' : '#a07a3c', { flat: lv > 0.05 });
      glow.set(lv);
    },
  };
}

/** a resistor on a block: resistor(k, { at, ohms, part }) → { g, a, b } */
export function resistor(k, o = {}) {
  const p = o.part ?? 'r';
  const bl = block(k, { ...o, w: 1.6, d: 0.9, part: p });
  const g = bl.g, y = bl.h + 0.42;
  const body = k.group({ at: [0, y, 0.02], parent: g });
  k.lathe([[0.001, -0.5], [0.17, -0.48], [0.22, -0.4], [0.22, -0.26], [0.17, -0.18], [0.16, 0], [0.17, 0.18], [0.22, 0.26], [0.22, 0.4], [0.17, 0.48], [0.001, 0.5]].map(([r, z]) => [r, z]), { parent: body, color: COL.body, part: p, rot: [0, 0, 90] });
  const bs = bands(o.ohms ?? 1000), xs = [-0.33, -0.17, -0.02, 0.3];
  bs.forEach((c, i) => k.cyl(i === 0 ? 0.226 : 0.168, i === 0 ? 0.226 : 0.168, 0.07, { axis: 'x', at: [xs[i], 0, 0], color: c, parent: body, outline: false, part: p }));
  const sx = 0.6;
  for (const sg of [-1, 1]) k.tube([[0.5 * sg, y, 0.02], [sx * sg, y, 0.02], [sx * sg, y - 0.12, 0.12], [sx * sg, bl.h + 0.06, 0.198]], 0.03, { color: COL.metal, parent: g, outline: false, caps: false, tension: 0.2 });
  return { g, a: bl.a, b: bl.b, top: k.at(g, [0, y + 0.3, 0]) };
}

/** a digital meter on a stand with a yellow case: meter(k, { at, rot, part }) → { g, set(text, sub), a, b } */
export function meter(k, o = {}) {
  const p = o.part ?? 'meter';
  const g = k.group({ at: o.at || [0, 0, 0], rot: o.rot || [0, 0, 0] });
  const tilt = k.group({ at: [0, 0.95, 0], rot: [-14, 0, 0], parent: g });
  k.box(1.9, 1.35, 0.5, { color: COL.meter, parent: tilt, r: 0.12, part: p });
  k.box(1.55, 0.72, 0.1, { at: [0, 0.18, 0.25], color: COL.bezel, parent: tilt, r: 0.06, part: p });
  const scr = k.screen(1.4, 0.6, { at: [0, 0.18, 0.305], parent: tilt, part: p });
  k.text(o.title || 'V', { w: 0.6, h: 0.22, at: [0, -0.4, 0.255], parent: tilt, color: '#3b3000', size: 0.8 });
  k.box(1.5, 0.14, 0.9, { at: [0, 0.07, -0.05], color: COL.bezel, parent: g, r: 0.05, part: p });
  k.box(0.18, 0.75, 0.18, { at: [0, 0.45, -0.1], color: COL.bezel, parent: g, r: 0.04, part: p });
  for (const [x, c] of [[-0.45, COL.red], [0.45, COL.black]]) k.cyl(0.09, 0.09, 0.12, { axis: 'z', at: [x, -0.5, 0.25], color: c, parent: tilt, part: p });
  return { g, set: scr.set, a: k.at(tilt, [-0.45, -0.5, 0.32]), b: k.at(tilt, [0.45, -0.5, 0.32]), top: k.at(tilt, [0, 0.7, 0]) };
}

/** a knife switch on a block: knife(k, { at, part }) → { g, a, b, set(closed) } */
export function knife(k, o = {}) {
  const p = o.part ?? 'switch';
  const bl = block(k, { ...o, w: 1.7, d: 0.8, part: p });
  const g = bl.g, y = bl.h;
  k.box(0.14, 0.3, 0.3, { at: [-0.55, y + 0.15, 0.0], color: COL.metal, parent: g, r: 0.03, part: p });
  k.box(0.26, 0.22, 0.3, { at: [0.6, y + 0.11, 0.0], color: COL.metal, parent: g, r: 0.03, part: p });
  const hinge = k.group({ at: [-0.55, y + 0.27, 0.0], parent: g });
  k.box(1.25, 0.06, 0.2, { at: [0.62, 0, 0], color: COL.metal, parent: hinge, r: 0.02, part: p });
  k.cyl(0.07, 0.07, 0.55, { at: [1.18, 0.27, 0], color: COL.red, parent: hinge, part: p });
  return { g, a: bl.a, b: bl.b, top: k.at(g, [0, y + 0.8, 0]), set(closed) { hinge.rotation.z = closed ? -0.04 : 0.95; } };
}

/** an LED on a block: led(k, { at, color, flipped, part }) → { g, a (anode side), b, set(level) } */
export function led(k, o = {}) {
  const p = o.part ?? 'led';
  const bl = block(k, { ...o, w: 1.2, d: 0.9, part: p });
  const g = bl.g, y = bl.h;
  const c = o.color || '#e23b2e';
  const holder = k.group({ at: [0, y, -0.05], rot: [0, o.flipped ? 180 : 0, 0], parent: g });
  k.tube([[-0.12, 0.0, 0], [-0.12, 0.62, 0]], 0.025, { color: COL.metal, parent: holder, outline: false });
  k.tube([[0.12, 0.0, 0], [0.12, 0.55, 0]], 0.025, { color: COL.metal, parent: holder, outline: false });
  const domeMat = k.toon(c, { fresh: true });
  k.cyl(0.3, 0.3, 0.07, { at: [0, 0.62, 0], color: c, parent: holder, part: p, material: domeMat });
  k.lathe([[0.26, 0], [0.26, 0.38], [0.22, 0.52], [0.12, 0.6], [0.001, 0.62]], { at: [0, 0.65, 0], parent: holder, material: domeMat, part: p });
  const glow = k.glow([0, 1.0, 0], { parent: holder, size: 2.2, color: c });
  const base = new k.THREE.Color(c);
  return {
    g, a: bl.a, b: bl.b, top: k.at(holder, [0, 1.3, 0]),
    set(lv) { lv = Math.max(0, Math.min(1, lv)); domeMat.emissive.copy(base).multiplyScalar(0.7 * lv); glow.set(lv); },
  };
}

/** an electrolytic capacitor on a block: capacitor(k, { at, label, part }) */
export function capacitor(k, o = {}) {
  const p = o.part ?? 'cap';
  const bl = block(k, { ...o, w: 1.3, d: 1.0, part: p });
  const g = bl.g, y = bl.h, s = o.size ?? 1;
  k.cyl(0.42 * s, 0.42 * s, 1.15 * s, { at: [0, y + 0.62 * s, -0.08], color: COL.can, parent: g, part: p });
  k.box(0.16 * s, 1.0 * s, 0.05, { at: [0.3 * s, y + 0.62 * s, -0.08 + 0.37 * s], rot: [0, 38, 0], color: '#c9d3e6', parent: g, part: p, outline: false, r: 0.01 });
  k.cyl(0.38 * s, 0.38 * s, 0.04, { at: [0, y + 1.21 * s, -0.08], color: COL.metal, parent: g, part: p });
  k.text(o.label || '470µF', { w: 0.95, h: 0.3, at: [0, y + 0.62 * s, -0.08 + 0.43 * s], parent: g, color: '#ffffff', size: 0.7 });
  return { g, a: bl.a, b: bl.b, top: k.at(g, [0, y + 1.4 * s, 0]) };
}

/** a bench power supply with a knob: supply(k, { at, part }) → { g, set(text), plus, minus, knob } */
export function supply(k, o = {}) {
  const p = o.part ?? 'supply';
  const g = k.group({ at: o.at || [0, 0, 0], rot: o.rot || [0, 0, 0] });
  k.box(2.0, 1.25, 1.3, { at: [0, 0.625, 0], color: COL.black, parent: g, r: 0.12, part: p });
  const scr = k.screen(1.1, 0.42, { at: [-0.32, 0.86, 0.652], parent: g, part: p, bg: '#1f2a24', ink: '#7dffb0' });
  const knob = k.group({ at: [0.6, 0.86, 0.66], parent: g });
  k.cyl(0.24, 0.26, 0.2, { axis: 'z', color: '#d6d9de', parent: knob, part: p });
  k.box(0.05, 0.2, 0.04, { at: [0, 0.12, 0.11], color: COL.red, parent: knob, outline: false });
  for (const [x, c] of [[-0.55, COL.red], [0.05, '#202227']]) k.cyl(0.11, 0.11, 0.12, { axis: 'z', at: [x, 0.32, 0.68], color: c, parent: g, part: p });
  return { g, set: (t) => scr.set(t), knob, plus: k.at(g, [-0.55, 0.32, 0.74]), minus: k.at(g, [0.05, 0.32, 0.74]), top: k.at(g, [0, 1.4, 0]) };
}

/** a cable from a to b that drops to the floor and passes through floor waypoints [[x, z], …] */
export function cable(k, a, b, o = {}) {
  const fy = o.floor ?? 0.1, pts = [a];
  pts.push([a[0], Math.max(fy, a[1] * 0.55), a[2] + (o.outA ?? 0.25)]);
  for (const [x, z, yy] of o.via || []) pts.push([x, yy ?? fy, z]);
  pts.push([b[0], Math.max(fy, b[1] * 0.55), b[2] + (o.outB ?? 0.25)]);
  pts.push(b);
  return k.tube(pts, o.r ?? 0.075, { color: o.color || COL.red, flow: o.flow, reverse: o.reverse, part: o.part, tension: 0.5 });
}

/** a breadboard: board(k, { at, w, d }) → { g, hole(col, row), rail('+'|'-', col) } — columns along x, rows −5…−1 and 1…5
 *  along z (each column of five is joined underneath); the two power rails run along the back edge */
export function board(k, o = {}) {
  const g = k.group({ at: o.at || [0, 0, 0] });
  const w = o.w ?? 4.6, d = o.d ?? 2.8, h = 0.36, pitch = 0.2;
  k.box(w, h, d, { at: [0, h / 2, 0], color: COL.board, parent: g, r: 0.08, part: o.part ?? 'board' });
  const cols = Math.floor((w - 0.5) / pitch);
  const X = (c) => -w / 2 + 0.25 + (c + 0.5) * pitch, zr = { '+': -d / 2 + 0.2, '-': -d / 2 + 0.32 };
  const T = k.THREE, cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * d / w);
  const c = cv.getContext('2d'), sx = cv.width / w, sz = cv.height / d, px = (x) => (x + w / 2) * sx, pz = (z) => (z + d / 2) * sz;
  c.fillStyle = COL.board; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e6e0d3'; c.fillRect(0, pz(-0.07), cv.width, 0.14 * sz);
  c.fillStyle = '#d33a2c'; c.fillRect(px(-w / 2 + 0.25), pz(-d / 2 + 0.1) - 1.5, (w - 0.5) * sx, 3);
  c.fillStyle = '#2f62c9'; c.fillRect(px(-w / 2 + 0.25), pz(-d / 2 + 0.42) - 1.5, (w - 0.5) * sx, 3);
  c.fillStyle = '#3a3a3a';
  const dot = (x, z) => c.fillRect(px(x) - 3.5, pz(z) - 3.5, 7, 7);
  for (let i = 0; i < cols; i++) {
    for (const r of [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) dot(X(i), r * pitch);
    if (i % 6 !== 5) { dot(X(i), zr['+']); dot(X(i), zr['-']); }
  }
  c.font = `600 ${Math.round(0.11 * sz)}px monospace`; c.fillStyle = '#a49c8c';
  for (let i = 0; i < cols; i += 5) c.fillText(String(i + 1), px(X(i)) - 6, pz(d / 2 - 0.12));
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const top = new T.Mesh(new T.PlaneGeometry(w - 0.1, d - 0.1), new T.MeshBasicMaterial({ map: tex }));
  top.rotation.x = -Math.PI / 2; top.position.y = h + 0.003; top.userData.noFit = true; g.add(top);
  return { g, h, hole: (col, row) => k.at(g, [X(col), h, row * pitch]), rail: (side, col) => k.at(g, [X(col), h, zr[side]]) };
}

/** a small part standing in breadboard holes: a resistor bent into two holes */
export function boardResistor(k, a, b, o = {}) {
  const p = o.part ?? 'r';
  const g = k.group({}), mid = [(a[0] + b[0]) / 2, a[1] + 0.42, (a[2] + b[2]) / 2];
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]), ang = Math.atan2(b[2] - a[2], b[0] - a[0]);
  const body = k.group({ at: mid, parent: g }); body.rotation.y = -ang;
  k.lathe([[0.001, -0.36], [0.13, -0.35], [0.16, -0.28], [0.16, -0.18], [0.12, -0.12], [0.115, 0], [0.12, 0.12], [0.16, 0.18], [0.16, 0.28], [0.13, 0.35], [0.001, 0.36]], { parent: body, color: COL.body, part: p, rot: [0, 0, 90] });
  bands(o.ohms ?? 1000).forEach((c, i) => k.cyl(i === 0 ? 0.163 : 0.122, i === 0 ? 0.163 : 0.122, 0.05, { axis: 'x', at: [[-0.24, -0.12, -0.01, 0.22][i], 0, 0], color: c, parent: body, outline: false, part: p }));
  const u = [(b[0] - a[0]) / len, (b[2] - a[2]) / len];
  k.tube([a, [a[0], mid[1], a[2]], [mid[0] - u[0] * 0.36, mid[1], mid[2] - u[1] * 0.36]], 0.022, { color: COL.metal, outline: false, caps: false, tension: 0 });
  k.tube([b, [b[0], mid[1], b[2]], [mid[0] + u[0] * 0.36, mid[1], mid[2] + u[1] * 0.36]], 0.022, { color: COL.metal, outline: false, caps: false, tension: 0 });
  return { g, top: [mid[0], mid[1] + 0.25, mid[2]] };
}

/** a short jumper wire between two board holes, arched */
export function jumper(k, a, b, o = {}) {
  const h = o.h ?? 0.35, m = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
  return k.tube([a, [a[0], a[1] + h * 0.7, a[2]], m, [b[0], b[1] + h * 0.7, b[2]], b], o.r ?? 0.05, { color: o.color || COL.red, flow: o.flow, reverse: o.reverse });
}

/** a coin-style power pack (for the breadboard build) */
export function pack(k, o = {}) {
  const p = o.part ?? 'battery';
  const g = k.group({ at: o.at || [0, 0, 0] });
  k.cyl(0.8, 0.85, 0.42, { at: [0, 0.21, 0], color: COL.black, parent: g, part: p });
  k.text(o.text || '3 V', { w: 1.0, h: 0.45, at: [0, 0.425, 0.05], rot: [-90, 0, 0], parent: g, color: '#ffffff', size: 0.8 });
  return { g, plus: k.at(g, [0.35, 0.42, -0.45]), minus: k.at(g, [-0.35, 0.42, -0.45]), top: k.at(g, [0, 0.5, 0]) };
}

/** a rotary selector on a block: three screws (A = left, B = right, C = common, front) and a pointer: selector(k, { at, part }) */
export function selector(k, o = {}) {
  const p = o.part ?? 'switch';
  const g = k.group({ at: o.at || [0, 0, 0], rot: o.rot || [0, 0, 0] });
  const h = 0.32;
  k.box(1.6, h, 1.3, { at: [0, h / 2, 0], color: COL.wood, parent: g, r: 0.06, part: p });
  const pos = { a: [-0.5, h, -0.35], b: [0.5, h, -0.35], c: [0, h, 0.42] };
  for (const q of Object.values(pos)) k.cyl(0.1, 0.1, 0.08, { at: [q[0], h + 0.04, q[2]], color: COL.brass, parent: g, part: p });
  k.text('A', { w: 0.3, h: 0.3, at: [-0.5, h + 0.005, -0.58], rot: [-90, 0, 0], parent: g, color: '#3b2610' });
  k.text('B', { w: 0.3, h: 0.3, at: [0.5, h + 0.005, -0.58], rot: [-90, 0, 0], parent: g, color: '#3b2610' });
  const knob = k.group({ at: [0, h, 0.05], parent: g });
  k.cyl(0.3, 0.34, 0.22, { at: [0, 0.11, 0], color: COL.black, parent: knob, part: p });
  k.box(0.1, 0.06, 0.62, { at: [0, 0.25, -0.2], color: COL.red, parent: knob, part: p, r: 0.02 });
  const T = (q) => k.at(g, [q[0], h + 0.08, q[2]]);
  return { g, a: T(pos.a), b: T(pos.b), c: T(pos.c), top: k.at(g, [0, 0.9, 0]), set(which) { knob.rotation.y = which === 'charge' ? 0.62 : which === 'discharge' ? -0.62 : 0; } };
}
