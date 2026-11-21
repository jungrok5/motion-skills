// pop-up-quest — paper-cut puppets. A character is a handful of die-cut card parts (tail, two boots, coat, head, eyes,
// paw, optional bag and carried item) drawn from flat polygons with a cream cutting margin, hinged at pivots, and posed
// by pure functions of time. Motion is keyed in code (this skill is code-only): weight sets timing, the planted boot
// never slides, idles breathe, big moves gather and recover. See references/CAST.md.
//
// Card space: x right, y up, 100 units = the character's height, origin at the soles. Art faces RIGHT in 3/4 view:
// the snout / beak points +x, the far (narrower) eye is the one on the +x side, the near shoulder, paw, boot and bag
// sit on the -x (back) side and are drawn in front. Facing left mirrors the whole rig.
import * as T from 'three';

const TAU = Math.PI * 2, D2R = Math.PI / 180;
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const ease = x => { const p = clamp01(x); return p * p * (3 - 2 * p); };
const easeOut = x => 1 - (1 - clamp01(x)) ** 3;
const lerp = (a, b, u) => a + (b - a) * u;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ── weight → timing. A heavier body starts later, steps slower, breathes slower, lands harder. ────────────────
export const MASS = {
  light:  { step: .24, stride: .17, lift: .085, breathe: 2.6, gather: .16, hop: .30, land: .10, recover: .26, turn: .30 },
  medium: { step: .31, stride: .17, lift: .07,  breathe: 3.3, gather: .22, hop: .36, land: .13, recover: .34, turn: .38 },
  heavy:  { step: .42, stride: .16, lift: .05,  breathe: 4.2, gather: .32, hop: .42, land: .18, recover: .48, turn: .52 },
};
// joint limits (degrees) — the rig reports anything outside these; scripts/check.mjs fails on it.
// paw stops at 95°: the near arm is drawn over the body, so raised any higher it would cover the face.
export const LIMITS = { lean: [-12, 12], head: [-22, 22], tail: [-40, 40], foot: [-28, 28], paw: [-25, 95], bag: [-18, 18], turn: [0, 180] };

// ── species: head outline, ears, muzzle and tail. Add your own: any {head, ears, muzzle, nose, tail} in card units. ─
const R = (cx, cy, rx, ry, n = 12, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * TAU; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export const SPECIES = {
  fox:     { head: [[-24, 60], [-20, 48], [-4, 42], [16, 44], [34, 56], [36, 61], [22, 76], [-4, 82], [-22, 76]], ears: [[[-20, 74], [-17, 98], [-4, 80]], [[6, 80], [20, 97], [22, 74]]], muzzle: [[6, 52], [36, 58], [34, 54], [16, 44], [2, 45]], nose: [[31, 56], [37, 59], [32, 61]], tail: 'bushy' },
  cat:     { head: R(4, 62, 25, 20, 10), ears: [[[-18, 72], [-16, 92], [-4, 80]], [[8, 81], [20, 92], [22, 72]]], muzzle: [[6, 50], [26, 52], [24, 60], [8, 60]], nose: [[20, 58], [25, 58], [22.5, 55]], tail: 'thin' },
  bear:    { head: R(4, 62, 26, 21, 10), ears: [R(-16, 80, 7, 7, 8), R(18, 80, 7, 7, 8)], muzzle: R(16, 56, 11, 8, 8), nose: R(22, 59, 4, 3, 6), tail: 'round' },
  mouse:   { head: [[-20, 58], [-14, 46], [6, 44], [30, 52], [36, 57], [24, 70], [0, 78], [-18, 72]], ears: [R(-14, 82, 12, 12, 10), R(14, 84, 11, 11, 10)], muzzle: [[10, 48], [34, 56], [28, 60], [12, 58]], nose: R(35, 57, 3, 3, 6), tail: 'thin' },
  rabbit:  { head: R(4, 60, 23, 19, 10), ears: [[[-14, 72], [-18, 106], [-8, 108], [-4, 76]], [[6, 77], [10, 110], [19, 106], [16, 74]]], muzzle: R(15, 54, 10, 7, 8), nose: [[20, 58], [25, 58], [22.5, 55]], tail: 'round' },
  owl:     { head: [[-25, 54], [-18, 43], [14, 43], [28, 54], [28, 70], [24, 84], [14, 77], [-6, 77], [-18, 84], [-25, 70]], ears: [], muzzle: [], nose: [[4, 58], [11, 58], [7.5, 51]], tail: 'feather', face: [R(-3, 63, 11, 11, 12), R(17, 63, 8.5, 10.5, 12)], eyes: [[-3, 63, 3.8, 4.4], [17, 63.5, 2.6, 4.2]] },
  bird:    { head: R(2, 62, 22, 20, 10), ears: [[[-6, 80], [0, 92], [6, 81]]], muzzle: R(0, 54, 14, 8, 8), nose: [[20, 64], [34, 60], [20, 56]], tail: 'feather' },
  frog:    { head: [[-26, 54], [-18, 44], [14, 44], [30, 52], [30, 66], [-26, 66]], ears: [R(-12, 70, 10, 9, 8), R(15, 70, 9, 9, 8)], eyes: [[-12, 71, 3.4, 4.2], [15, 71, 2.4, 4]], muzzle: [[-20, 48], [26, 50], [24, 56], [-20, 56]], nose: [[16, 52], [24, 53], [20, 51]], tail: 'none' },
  penguin: { head: R(2, 62, 23, 21, 10), ears: [], muzzle: [[-10, 46], [22, 46], [24, 66], [8, 70], [-12, 62]], nose: [[22, 60], [32, 58], [22, 55]], tail: 'feather' },
};
const TAILS = {
  bushy:   { pts: [[0, 0], [-10, 6], [-30, 4], [-42, 18], [-34, 30], [-18, 26], [-4, 12]], tip: [[-30, 4], [-42, 18], [-36, 24], [-30, 12]], pivot: [-12, 22] },
  thin:    { pts: [[0, 0], [-14, -2], [-28, 6], [-34, 18], [-31, 19], [-26, 9], [-14, 3], [0, 3]], pivot: [-12, 20] },
  round:   { pts: R(-4, 0, 8, 8, 8), pivot: [-14, 22] },
  feather: { pts: [[0, 0], [-20, -4], [-28, 4], [-20, 10], [0, 6]], tip: [[-20, -4], [-28, 4], [-22, 4]], pivot: [-12, 20] },
  none:    null,
};

// build the part list for a character spec → [{key, pivot:[x,y], parent, shapes:[{pts, fill}], layer}]
export function design(spec) {
  const sp = typeof spec.species === 'string' ? SPECIES[spec.species] : spec.species;
  const fur = spec.fur, belly = spec.belly || '#f2e6cc', coat = spec.coat, coat2 = spec.coat2 || shadeHex(coat, .78);
  const inner = spec.inner || shadeHex(fur, .7), boot = spec.boot || '#5a4032', eye = spec.eye || '#2b2d2a';
  const parts = [];
  const tail = spec.tail === undefined ? TAILS[sp.tail] : TAILS[spec.tail];
  if (tail) parts.push({ key: 'tail', pivot: tail.pivot, shapes: [{ pts: tail.pts.map(p => [p[0] + tail.pivot[0], p[1] + tail.pivot[1]]), fill: fur }, ...(tail.tip ? [{ pts: tail.tip.map(p => [p[0] + tail.pivot[0], p[1] + tail.pivot[1]]), fill: belly }] : [])] });
  // boots: far (+x, drawn behind) and near (-x, drawn in front); toes point +x
  const bootPts = cx => [[cx - 6, 16], [cx + 3, 16], [cx + 3, 6], [cx + 10, 4], [cx + 10, 0], [cx - 7, 0]];
  parts.push({ key: 'footFar', pivot: [7, 16], shapes: [{ pts: bootPts(7), fill: shadeHex(boot, .85) }] });
  parts.push({ key: 'footNear', pivot: [-7, 16], shapes: [{ pts: bootPts(-7), fill: boot }] });
  // coat: a folded trapezoid; the far half in the darker tone, two buttons on the near half
  const coatPts = [[-18, 12], [18, 12], [15, 46], [-14, 47]];
  parts.push({ key: 'coat', pivot: [0, 14], shapes: [
    { pts: coatPts, fill: coat }, { pts: [[2, 12], [18, 12], [15, 46], [1, 46.5]], fill: coat2 },
    ...(spec.collar ? [{ pts: [[-14, 47], [15, 46], [10, 40], [-9, 40]], fill: spec.collar }] : []),
    { pts: R(-3, 31, 1.7, 1.7, 6), fill: spec.button || '#e8c46a' }, { pts: R(-3, 23, 1.7, 1.7, 6), fill: spec.button || '#e8c46a' }] });
  if (spec.bag) parts.push({ key: 'bag', pivot: [-8, 42], shapes: [
    { pts: [[-9, 44], [-6, 46], [14, 20], [11, 18]], fill: shadeHex(spec.bag, .7) },
    { pts: [[-22, 26], [-6, 26], [-6, 14], [-22, 14]], fill: spec.bag }, { pts: [[-22, 26], [-6, 26], [-8, 20], [-20, 20]], fill: shadeHex(spec.bag, .82) },
    { pts: R(-14, 21, 1.6, 1.6, 6), fill: '#e8c46a' }] });
  // head: outline, ears behind, a fold down the middle (far half darker), muzzle, nose
  const head = sp.head, earShapes = (sp.ears || []).flatMap(e => [{ pts: e, fill: fur }, { pts: shrink(e, .55), fill: inner }]);
  const cx = head.reduce((a, p) => a + p[0], 0) / head.length;
  parts.push({ key: 'head', pivot: [2, 46], shapes: [
    ...earShapes, { pts: head, fill: fur }, { pts: half(head, cx + 4), fill: shadeHex(fur, .88) },
    ...(sp.face || []).map(f => ({ pts: f, fill: belly })),
    { pts: sp.muzzle, fill: belly }, { pts: sp.nose, fill: spec.nose || '#3a2f2a' },
    ...(spec.hat ? hatShapes(spec.hat, head) : [])] });
  // eyes: near eye (−x side) round, far eye (+x side) narrower — the face points +x
  const [en, ef] = sp.eyes || [[4, 64, 3.2, 4.2], [18, 64.5, 2.2, 4]];
  parts.push({ key: 'eyes', parent: 'head', pivot: [(en[0] + ef[0]) / 2, en[1]], shapes: [
    { pts: R(en[0], en[1], en[2], en[3], 10), fill: eye }, { pts: R(ef[0], ef[1], ef[2], ef[3], 10), fill: eye },
    { pts: R(en[0] + 1, en[1] + 1.6, 1, 1, 6), fill: '#fff6dc' }, { pts: R(ef[0] + .6, ef[1] + 1.5, .8, .8, 6), fill: '#fff6dc' }] });
  // paw: the near arm, hinged at the near shoulder, drawn over the coat; optional carried item in the mitten
  const paw = spec.paw || fur;
  parts.push({ key: 'paw', pivot: [-9, 42], shapes: [
    { pts: [[-12, 43], [-6, 43], [-5, 27], [-8, 23], [-13, 25], [-13, 28]], fill: spec.sleeve || coat },
    { pts: R(-9, 24, 4.6, 4.2, 8), fill: paw },
    ...(spec.item ? spec.item.map(s => ({ pts: s.pts.map(p => [p[0] - 9, p[1] + 22]), fill: s.fill })) : [])] });
  return parts;
}
function half(pts, cx) { // the part of a polygon right of x = cx (clipped), for the folded far half
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ina = a[0] >= cx, inb = b[0] >= cx;
    if (ina) out.push(a);
    if (ina !== inb) { const u = (cx - a[0]) / (b[0] - a[0]); out.push([cx, a[1] + (b[1] - a[1]) * u]); }
  }
  return out.length > 2 ? out : [[cx, 0], [cx, 0], [cx, 0]];
}
function shrink(pts, k) { const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]); return pts.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k + (1 - k) * -2]); }
function hatShapes(hat, head) {
  const top = Math.max(...head.map(p => p[1]));
  if (hat.type === 'cap') return [{ pts: [[-18, top - 8], [16, top - 8], [12, top + 4], [-12, top + 6]], fill: hat.color }, { pts: [[10, top - 8], [30, top - 9], [26, top - 4], [10, top - 4]], fill: shadeHex(hat.color, .8) }, { pts: R(0, top - 2, 2.2, 2.2, 6), fill: '#e8c46a' }];
  if (hat.type === 'beanie') return [{ pts: [[-22, top - 10], [22, top - 10], [16, top + 6], [0, top + 9], [-16, top + 6]], fill: hat.color }, { pts: [[-23, top - 12], [23, top - 12], [23, top - 7], [-23, top - 7]], fill: shadeHex(hat.color, .8) }];
  if (hat.type === 'tall') return [{ pts: [[-14, top - 6], [14, top - 6], [12, top + 18], [-12, top + 18]], fill: hat.color }, { pts: [[-22, top - 8], [22, top - 8], [22, top - 4], [-22, top - 4]], fill: shadeHex(hat.color, .8) }];
  return [];
}
export function shadeHex(hex, k) { const c = new T.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s, Math.max(0, Math.min(1, h.l * k))); return '#' + c.getHexString(); }

// ── atlas: every part drawn on one canvas, with a cream die-cut margin; plus a plain card-back atlas ─────────
const PX = 7, CUT = 2.2;   // pixels per card unit, cutting margin in card units
function drawAtlas(parts, back = false) {
  const cells = parts.map(p => { const all = p.shapes.flatMap(s => s.pts); const xs = all.map(q => q[0]), ys = all.map(q => q[1]);
    return { x0: Math.min(...xs) - CUT - 1, x1: Math.max(...xs) + CUT + 1, y0: Math.min(...ys) - CUT - 1, y1: Math.max(...ys) + CUT + 1 }; });
  let x = 0, y = 0, rowH = 0; const W = 1024;
  for (const c of cells) { const w = (c.x1 - c.x0) * PX, h = (c.y1 - c.y0) * PX; if (x + w > W) { x = 0; y += rowH + 4; rowH = 0; } c.px = x; c.py = y; c.pw = w; c.ph = h; x += w + 4; rowH = Math.max(rowH, h); }
  const H = Math.pow(2, Math.ceil(Math.log2(y + rowH + 4)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.lineJoin = 'round';
  parts.forEach((p, i) => {
    const c = cells[i]; const tx = q => c.px + (q[0] - c.x0) * PX, ty = q => c.py + (c.y1 - q[1]) * PX;
    const path = s => { g.beginPath(); s.pts.forEach((q, k) => k ? g.lineTo(tx(q), ty(q)) : g.moveTo(tx(q), ty(q))); g.closePath(); };
    const solid = p.key === 'eyes' ? p.shapes.slice(0, 2) : p.shapes;
    g.strokeStyle = back ? '#d9c79f' : '#f4e8cb'; g.lineWidth = CUT * 2 * PX;
    for (const s of solid) { path(s); g.stroke(); }
    g.fillStyle = back ? '#d9c79f' : '#f4e8cb'; for (const s of solid) { path(s); g.fill(); }
    if (back) { g.strokeStyle = '#ead9b3'; g.lineWidth = CUT * .9 * PX; for (const s of solid) { path(s); g.stroke(); } g.fillStyle = '#ead9b3'; for (const s of solid) { path(s); g.fill(); } }
    else for (const s of p.shapes) { g.fillStyle = s.fill; path(s); g.fill(); }
  });
  return { canvas: cv, cells, W, H };
}

// ── the rig ──────────────────────────────────────────────────────────────────────────────────────────────
export function makePuppet(spec, height = 1.1) {
  const parts = design(spec), front = drawAtlas(parts), back = drawAtlas(parts, true);
  const tex = new T.CanvasTexture(front.canvas), btex = new T.CanvasTexture(back.canvas);
  for (const t of [tex, btex]) { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; }
  const fm = new T.MeshLambertMaterial({ map: tex, alphaTest: .5, side: T.FrontSide });
  const bm = new T.MeshLambertMaterial({ map: btex, alphaTest: .5, side: T.BackSide });
  const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: .5 });
  const unit = height / 100, root = new T.Group(), lift = new T.Group(), body = new T.Group();
  lift.position.y = (CUT + .2) * unit; root.add(lift); lift.add(body);   // the cream margin under the boots rests on the page
  const joints = {}, order = ['tail', 'footFar', 'footNear', 'coat', 'bag', 'head', 'eyes', 'paw'];
  for (const key of order) {
    const i = parts.findIndex(p => p.key === key); if (i < 0) continue;
    const p = parts[i], c = front.cells[i], j = new T.Group();
    const parent = p.parent ? joints[p.parent] : (key.startsWith('foot') ? lift : body);
    const ppiv = p.parent ? parts.find(q => q.key === p.parent).pivot : [0, 0];
    j.position.set((p.pivot[0] - ppiv[0]) * unit, (p.pivot[1] - ppiv[1]) * unit, p.parent ? .004 : order.indexOf(key) * .0045);
    parent.add(j);
    const geo = new T.PlaneGeometry(c.x1 - c.x0, c.y1 - c.y0).scale(unit, unit, 1), uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (c.px + c.pw * uv.getX(k)) / front.W, 1 - (c.py + c.ph * (1 - uv.getY(k))) / front.H);
    const offx = ((c.x0 + c.x1) / 2 - p.pivot[0]) * unit, offy = ((c.y0 + c.y1) / 2 - p.pivot[1]) * unit;
    const card = new T.Mesh(geo, fm); card.position.set(offx, offy, 0); card.castShadow = true; card.customDepthMaterial = dm; j.add(card);
    const cb = new T.Mesh(geo, bm); cb.position.copy(card.position); j.add(cb);
    joints[key] = j; j.userData.rest = j.position.clone();
  }
  const m = MASS[spec.mass || 'medium'];
  return { root, body, joints, unit, spec, mass: m, height, hw: 7 * unit, name: spec.name, report: [] };
}

// ── motion. A puppet's whole pose is a pure function of a "plan" and time t. ─────────────────────────────
// plan = { x, facing: 1|-1, walk?: {t0, from, to}, turn?: {t0, to}, cheer?: t0, point?: {t0, t1}, look?: x, seed }
// Walk: a side-shuffle of boots. The leading boot steps, then the trailing boot closes; the planted boot stays put.
export function walkPlan(actor, t0, from, to) {
  const m = actor.mass, dir = Math.sign(to - from) || 1, dist = Math.abs(to - from);
  let n = Math.max(2, Math.ceil(dist / (m.stride / 2))); if (n % 2) n++;
  const l = 2 * dist / n;
  return { t0, from, to, dir, n, l, settle: .1, dur: .12 + n * m.step + .3 };
}
function feetAt(actor, w, t) {   // world-x (along the page) of near and far boot + which one swings + swing phase
  const m = actor.mass, hw = actor.hw, start = w.t0 + .12;   // .12 s anticipation lean before the first step
  const k = (t - start) / m.step, done = Math.max(0, Math.min(w.n, Math.floor(k)));
  // the boot on the leading side (in the walking direction) steps first
  const lead = w.dir * w.facingSign > 0 ? 'far' : 'near';   // the boot on the side we walk toward
  const base = { near: w.from - hw * w.facingSign, far: w.from + hw * w.facingSign };
  const moved = { near: 0, far: 0 };
  for (let s = 0; s < done; s++) moved[(s % 2 === 0) ? lead : (lead === 'far' ? 'near' : 'far')]++;
  const pos = { near: base.near + moved.near * w.l * w.dir, far: base.far + moved.far * w.l * w.dir };
  let swing = null, u = 0;
  if (k >= 0 && k < w.n) { swing = (done % 2 === 0) ? lead : (lead === 'far' ? 'near' : 'far'); u = k - done; pos[swing] += ease(u) * w.l * w.dir; }
  return { pos, swing, u, walking: k >= 0 && k < w.n, k };
}
export function pose(actor, plan, t) {
  const { joints: j, mass: m, unit } = actor, rep = { foot: { near: 0, far: 0 }, ang: {} };
  const seed = plan.seed || 0;
  let facing = plan.facing || 1, rootX = plan.x, rootY = 0, bob = 0, lean = 0, squash = 0, head = 0, paw = 0, tail = 0, bag = 0, spin = 0;
  const feet = { near: { x: 0, y: 0, r: 0 }, far: { x: 0, y: 0, r: 0 } };
  // turn on the spot: the card swings edge-on, flips, and swings back, one boot lifting on each half (stepped)
  if (plan.turn && t >= plan.turn.t0) {
    const u = (t - plan.turn.t0) / m.turn;
    if (u < 1) { facing = u < .5 ? -plan.turn.to : plan.turn.to; spin = Math.sin(Math.PI * u) * 90; const s = u < .5 ? 'far' : 'near'; feet[s].y = Math.sin(Math.PI * ((u % .5) * 2)) * m.lift * .6; }
    else facing = plan.turn.to;
  }
  const sideX = { near: -actor.hw, far: actor.hw };
  // walking
  let walking = false;
  if (plan.walk && !(t >= plan.walk.t0)) rootX = plan.walk.from;   // waiting at the start of the walk
  if (plan.walk && t >= plan.walk.t0) {
    const w = { ...plan.walk, facingSign: facing };
    const f = feetAt(actor, w, t);
    if (t < plan.walk.t0 + plan.walk.dur) {
      walking = f.walking;
      rootX = (f.pos.near + f.pos.far) / 2;
      for (const s of ['near', 'far']) feet[s].x = (f.pos[s] - rootX) * facing - sideX[s];
      if (f.swing) { feet[f.swing].y = Math.sin(Math.PI * f.u) * m.lift; feet[f.swing].r = Math.sin(Math.PI * f.u) * 14; /* the toe lifts */ bob = Math.sin(Math.PI * f.u) * m.lift * .35; lean = 5 * w.dir * facing; tail = -Math.sin(TAU * f.k / 2) * 14; bag = Math.sin(TAU * f.k / 2) * 10; head = Math.sin(TAU * f.k / 2 + .6) * 4; }
      const pre = (t - plan.walk.t0) / .12; if (pre < 1) lean = -3 * Math.sin(Math.PI * pre) * w.dir * facing;     // anticipation: lean back
      const after = t - (plan.walk.t0 + .12 + plan.walk.n * m.step); if (after > 0) { lean = 4 * Math.sin(Math.PI * clamp01(after / .3)) * (1 - clamp01(after / .3)) * w.dir * facing; tail = 18 * Math.sin(Math.PI * clamp01(after / .3)); }  // recovery: momentum carries the top
    } else rootX = plan.walk.to;
    rep.walkFeet = f.pos;
  }
  // idle — every rest breathes: coat rises, head follows a beat later, tail sways, weight shifts, eyes blink irregularly
  const br = Math.sin(TAU * (t + seed) / m.breathe), brLag = Math.sin(TAU * (t + seed - .28) / m.breathe);
  if (!walking) { lean += Math.sin(TAU * (t + seed * 3) / 7.3) * 2; tail += Math.sin(TAU * (t + seed) / 2.3 - .8) * 9; head += Math.sin(TAU * (t + seed) / 5.1) * 3 + brLag * 1.5; }
  squash += br * .022;
  // pointing at a prop: paw gathers (dips) then rises and holds, settles back down
  if (plan.point && t >= plan.point.t0) {
    const a = t - plan.point.t0, out = plan.point.t1 - plan.point.t0;
    if (a < .16) paw = -12 * Math.sin(Math.PI * a / .16);
    else if (a < out) paw = 74 * easeOut((a - .16) / .3) + Math.sin(TAU * a * 1.3) * 3;
    else paw = 74 * (1 - ease((a - out) / .4)) + 8 * Math.sin(Math.PI * clamp01((a - out) / .4)) * (1 - clamp01((a - out) / .4));
    head += clamp01(a / .3) * 6 * (a < out ? 1 : 1 - clamp01((a - out) / .4));
  }
  // cheer (the big move): gather → hop → land → recover, scaled by mass
  if (plan.cheer != null && t >= plan.cheer) {
    const a = t - plan.cheer, g0 = m.gather, h0 = g0 + m.hop, l0 = h0 + m.land, r0 = l0 + m.recover;
    if (a < g0) { const u = Math.sin(Math.PI / 2 * a / g0); squash -= .12 * u; head -= 8 * u; paw = -18 * u; tail -= 14 * u; }
    else if (a < h0) { const u = (a - g0) / m.hop; rootY += Math.sin(Math.PI * u) * actor.height * .24; squash += .06 * Math.sin(Math.PI * u); paw = lerp(-18, 88, easeOut(u * 1.6)); head += 10 * Math.sin(Math.PI * u); tail += 30 * Math.sin(Math.PI * u); feet.near.r = feet.far.r = -10 * Math.sin(Math.PI * u); }
    else if (a < l0) { const u = (a - h0) / m.land; squash -= .14 * Math.sin(Math.PI * u); paw = 88 - 20 * u; head -= 6 * Math.sin(Math.PI * u); }
    else if (a < r0) { const u = (a - l0) / m.recover; squash += .04 * Math.sin(Math.PI * u) * (1 - u); paw = lerp(68, 0, ease(u)) + 6 * Math.sin(Math.PI * u) * (1 - u); tail -= 16 * Math.sin(Math.PI * u) * (1 - u); }
  }
  // apply
  const root = actor.root; root.position.set(rootX, rootY, 0); actor.body.position.y = bob; root.scale.x = facing; root.rotation.y = spin * D2R * facing;
  actor.body.rotation.z = -lean * D2R; actor.body.scale.set(1 - squash * .4, 1 + squash, 1);
  if (j.head) j.head.rotation.z = -head * D2R;
  if (j.paw) j.paw.rotation.z = paw * D2R;    // positive = raise forward (toward the facing side)
  if (j.tail) j.tail.rotation.z = -tail * D2R;
  if (j.bag) j.bag.rotation.z = -bag * D2R;
  if (j.eyes) {   // irregular blink: next blink 2.2–5.4 s after the last, 0.13 s long
    let tb = seed * 1.7 % 3, n = 0; while (tb + 2.2 + hash(n + seed) * 3.2 < t) { tb += 2.2 + hash(n + seed) * 3.2; n++; }
    const since = t - tb, blink = since < .13 ? Math.sin(Math.PI * since / .13) : 0;
    j.eyes.scale.y = 1 - .9 * blink; j.eyes.position.x = j.eyes.userData.rest.x + (plan.look || 0) * unit * 2;
  }
  for (const s of ['near', 'far']) { const jj = j[s === 'near' ? 'footNear' : 'footFar']; if (!jj) continue; jj.position.x = jj.userData.rest.x + feet[s].x; jj.position.y = jj.userData.rest.y + feet[s].y; jj.rotation.z = feet[s].r * D2R; }
  rep.ang = { lean, head, paw, tail, bag, foot: Math.max(Math.abs(feet.near.r), Math.abs(feet.far.r)), turn: spin };
  rep.rootX = rootX; rep.feet = feet; rep.facing = facing; rep.lifted = { near: feet.near.y > 1e-4, far: feet.far.y > 1e-4 };
  return rep;
}
// world x of each boot's sole along the walk (for the slide check)
export function bootX(actor, rep) { return { near: rep.rootX + (rep.feet.near.x + -actor.hw) * rep.facing, far: rep.rootX + (rep.feet.far.x + actor.hw) * rep.facing }; }
