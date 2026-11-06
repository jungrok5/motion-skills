// Machines course · the bench parts, built from the kit. 1 bench unit = 0.5 m. Parts stand on the floor (y = 0).
export const COL = {
  wood: '#c08a55', woodDark: '#9a6a3c', brass: '#d9a441', crate: '#e7b26b', crateDark: '#c98f45', fulcrum: '#e0503a',
  driver: '#f5a524', driven: '#3a7bea', rope: '#efe2c4', metal: '#c9ced6', dark: '#2f333b', balance: '#f2c230', green: '#8fd14f',
};

/** a crate with slats and its weight printed on the side: crate(k, { size, text, parent, at, part }) */
export function crate(k, o = {}) {
  const s = o.size ?? 0.9, g = k.group({ at: o.at || [0, 0, 0], parent: o.parent, rot: o.rot });
  const p = o.part ?? 'crate';
  k.box(s, s, s, { at: [0, s / 2, 0], color: COL.crate, parent: g, r: 0.05, part: p });
  for (const y of [0.18, 0.82]) k.box(s * 1.02, s * 0.1, s * 1.02, { at: [0, s * y, 0], color: COL.crateDark, parent: g, r: 0.02, part: p, outline: false });
  k.text(o.text || '40 N', { w: s * 0.8, h: s * 0.32, at: [0, s * 0.5, s / 2 + 0.012], parent: g, color: '#4a2f12', size: 0.78 });
  return { g, top: [0, s, 0], size: s };
}

/** a brass slotted weight (10 N): weight(k, { at, parent }) */
export function weight(k, o = {}) {
  const g = k.group({ at: o.at || [0, 0, 0], parent: o.parent });
  k.cyl(0.32, 0.32, 0.2, { at: [0, 0.1, 0], color: COL.brass, parent: g, part: o.part ?? 'weights' });
  k.cyl(0.07, 0.07, 0.06, { at: [0, 0.22, 0], color: '#b8862e', parent: g, part: o.part ?? 'weights', outline: false });
  return g;
}

/** a triangular fulcrum: fulcrum(k, { at, h, part }) */
export function fulcrum(k, o = {}) {
  const h = o.h ?? 1.0, g = k.group({ at: o.at || [0, 0, 0] });
  k.extrude([[-0.55, 0], [0.55, 0], [0, h]], 1.1, { color: COL.fulcrum, parent: g, part: o.part ?? 'pivot', bevel: 0.03 });
  k.box(1.4, 0.1, 1.3, { at: [0, 0.05, 0], color: COL.woodDark, parent: g, r: 0.03, part: o.part ?? 'pivot' });
  return { g, top: [0, h, 0] };
}

/** a wooden wedge whose angle you set: wedge(k, { at, h, depth, part }) → { g, set(angleDeg), slope(s) → point, b } */
export function wedge(k, o = {}) {
  const h = o.h ?? 1.6, dep = o.depth ?? 1.6, g = k.group({ at: o.at || [0, 0, 0] });
  const body = k.extrude([[-1, 0], [0, 0], [0, h]], dep, { color: COL.wood, parent: g, part: o.part ?? 'ramp', bevel: 0.02 });
  let b = 1;
  return {
    g, body,
    set(deg) { b = h / Math.tan((deg * Math.PI) / 180); body.scale.x = b; },
    /** point on the slope at s (0 = bottom, 1 = top), in world units, plus the slope's angle */
    slope(s) { return [g.position.x - b + b * s, h * s, g.position.z]; },
    get base() { return b; },
  };
}

/** a winch: a post with a drum you can turn: winch(k, { at, h, part }) → { g, drum, set(angle), rope (world point on the drum) } */
export function winch(k, o = {}) {
  const h = o.h ?? 2.1, g = k.group({ at: o.at || [0, 0, 0], rot: o.rot });
  const p = o.part ?? 'winch';
  k.box(0.9, 0.2, 1.3, { at: [0, 0.1, 0], color: COL.woodDark, parent: g, part: p, r: 0.03 });
  for (const z of [-0.45, 0.45]) k.box(0.22, h, 0.16, { at: [0, h / 2, z], color: COL.wood, parent: g, part: p, r: 0.03 });
  const drum = k.group({ at: [0, h - 0.3, 0], parent: g });
  k.cyl(0.22, 0.22, 0.75, { axis: 'z', color: COL.dark, parent: drum, part: p });
  for (const z of [-0.38, 0.38]) k.cyl(0.32, 0.32, 0.05, { axis: 'z', at: [0, 0, z], color: COL.metal, parent: drum, part: p });
  k.box(0.08, 0.5, 0.08, { at: [0, 0.25, 0.62], color: COL.metal, parent: drum, part: p, r: 0.02 });
  k.cyl(0.07, 0.07, 0.3, { axis: 'z', at: [0, 0.5, 0.75], color: COL.fulcrum, parent: drum, part: p });
  k.cyl(0.04, 0.04, 0.3, { axis: 'z', at: [0, 0, 0.5], color: COL.metal, parent: drum, outline: false });
  return { g, drum, set(a) { drum.rotation.z = a; }, rope: (side = -1) => k.at(g, [0.22 * side, h - 0.3, 0]), top: k.at(g, [0, h + 0.3, 0]) };
}

/** a spring balance with a screen: balance(k, { parent }) → { g, set(text) } — lies along local +x */
export function balance(k, o = {}) {
  const g = k.group({ at: o.at || [0, 0, 0], parent: o.parent, rot: o.rot });
  const p = o.part ?? 'balance';
  k.box(0.95, 0.26, 0.36, { at: [0.55, 0, 0], color: COL.balance, parent: g, r: 0.08, part: p });
  const scr = k.screen(0.62, 0.22, { at: [0.55, 0.135, 0], rot: [-90, 0, 0], parent: g, part: p });
  k.cyl(0.03, 0.03, 0.12, { axis: 'x', at: [0.03, 0, 0], color: COL.metal, parent: g, outline: false });
  k.torus(0.07, 0.022, { at: [1.1, 0, 0], color: COL.metal, parent: g, outline: false });
  return { g, set: (t) => scr.set(t), tip: [1.17, 0, 0] };
}

/** a pulley wheel with its strap: pulley(k, { at, r, parent, part }) → group (turn it with .rotation.z) */
export function pulley(k, o = {}) {
  const r = o.r ?? 0.25, g = k.group({ at: o.at || [0, 0, 0], parent: o.parent });
  const p = o.part ?? 'pulley';
  const wheel = k.group({ parent: g });
  k.cyl(r, r, 0.14, { axis: 'z', color: COL.metal, parent: wheel, part: p, seg: 32 });
  k.torus(r, 0.035, { color: '#9aa1ab', parent: wheel, part: p, outline: false });
  k.box(r * 1.5, 0.05, 0.16, { color: '#9aa1ab', parent: wheel, outline: false, r: 0.01 });
  k.cyl(0.05, 0.05, 0.3, { axis: 'z', color: COL.dark, parent: g, outline: false });
  for (const z of [-0.12, 0.12]) k.box(0.12, r + 0.25, 0.04, { at: [0, (r + 0.25) / 2 - 0.02, z], color: COL.dark, parent: g, part: p, r: 0.01 });
  return { g, wheel };
}

/** a flat gear from module m and tooth count z, lying in the XZ plane (turn it with .rotation.y): gear(k, { z, m, color, at, part }) */
export function gear(k, o = {}) {
  const T = k.THREE, z = o.z, m = o.m ?? 0.12, r = (m * z) / 2, ra = r + m, rr = r - 1.25 * m, p = (2 * Math.PI) / z;
  const shape = new T.Shape();
  for (let i = 0; i < z; i++) {
    const c = (i + 0.5) * p, pts = [[rr, c - 0.5 * p], [rr, c - 0.3 * p], [ra, c - 0.13 * p], [ra, c + 0.13 * p], [rr, c + 0.3 * p]];
    pts.forEach(([R, a], j) => { const x = R * Math.cos(a), y = R * Math.sin(a); if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y); });
  }
  shape.closePath();
  const hole = new T.Path(); hole.absarc(0, 0, 0.09, 0, Math.PI * 2, true); shape.holes.push(hole);
  if (r > 1.0) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, hp = new T.Path(); hp.absarc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.2, 0, Math.PI * 2, true); shape.holes.push(hp); }
  const g = k.group({ at: o.at || [0, 0, 0] }), spin = k.group({ parent: g });
  const disc = k.extrude(shape, 0.22, { color: o.color, parent: spin, part: o.part, bevel: 0.025, curve: 6 });
  disc.rotation.x = -Math.PI / 2;
  k.cyl(0.22, 0.24, 0.14, { at: [0, 0.16, 0], color: COL.dark, parent: spin, part: o.part });
  k.box(0.1, 0.03, 0.34, { at: [0, 0.245, 0], color: COL.metal, parent: spin, outline: false, r: 0.01 });
  return { g, spin, r, ra };
}
