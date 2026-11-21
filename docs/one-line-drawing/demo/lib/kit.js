// one-line-drawing · kit.js — silhouettes a scene is made of. Every helper returns draw(g): it fills / strokes in
// whatever colour the caller set (black for the mask the line traces, a fog tone for the reference painting), so the
// picture under the pen and the line come from the same shapes. Page coordinates (1080 × 1920), y down.
// Add your own in the piece: S.shape('stall', { depth, draw: g => { g.beginPath(); …; g.fill(); } }).
import { rng, noise1, clamp, add, sub, mul, dist, norm, rot } from './core.js';

const D = Math.PI / 180;
export const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); };
export const bar = (g, a, b, w) => { g.save(); g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); };
export const disc = (g, c, r) => { g.beginPath(); g.arc(c[0], c[1], r, 0, Math.PI * 2); g.fill(); };
export const ell = (g, c, rx, ry, a = 0) => { g.beginPath(); g.ellipse(c[0], c[1], rx, ry, a, 0, Math.PI * 2); g.fill(); };
const all = (...fs) => g => fs.forEach(f => f && f(g));

// ---- structures ------------------------------------------------------------------------------------------------
// a post / utility pole: shaft, cross arms [{ y (from top, 0…1), len }], optional lean (deg)
export const pole = (x, top, base, { w = 9, arms = [], lean = 0 } = {}) => g => {
  const t = [x + Math.tan(lean * D) * (base - top), top];
  bar(g, [x, base], t, w);
  for (const a of arms) { const y = top + (base - top) * (a.y || 0), cx = x + (t[0] - x) * (1 - (a.y || 0)); bar(g, [cx - a.len / 2, y], [cx + a.len / 2, y], w * .7); }
};
// a street lamp: post, arm and a hanging lantern facing `dir` (1 right, -1 left)
export const lamp = (x, base, h, { dir = 1, w = 8 } = {}) => g => {
  bar(g, [x, base], [x, base - h], w);
  bar(g, [x, base - h], [x + dir * h * .16, base - h - h * .04], w * .7);
  const lx = x + dir * h * .16; poly(g, [[lx - h * .035, base - h + h * .02], [lx + h * .035, base - h + h * .02], [lx + h * .05, base - h + h * .08], [lx - h * .05, base - h + h * .08]]);
};
// a fence: n posts between x0 and x1 standing on y, joined by one or two rails
export const fence = (x0, x1, y, { n = 6, h = 60, rails = 2, w = 6 } = {}) => g => {
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * i / (n - 1); bar(g, [x, y], [x, y - h], w); }
  for (let k = 0; k < rails; k++) { const yy = y - h * (.35 + .5 * k / Math.max(1, rails - 1)); bar(g, [x0, yy], [x1, yy], w * .55); }
};
// a house: body, roof ('gable' | 'hip' | 'flat' | 'shed'), optional chimney (x 0…1 across the roof)
export const house = (x, base, w, h, { roof = 'gable', rh = .45, chimney = null, eave = .06 } = {}) => g => {
  g.fillRect(x, base - h, w, h);
  const top = base - h, e = w * eave, r = h * rh;
  if (roof === 'gable') poly(g, [[x - e, top + 2], [x + w / 2, top - r], [x + w + e, top + 2]]);
  if (roof === 'hip') poly(g, [[x - e, top + 2], [x + w * .28, top - r], [x + w * .72, top - r], [x + w + e, top + 2]]);
  if (roof === 'shed') poly(g, [[x - e, top + 2], [x - e, top - r], [x + w + e, top - r * .35], [x + w + e, top + 2]]);
  if (roof === 'flat') g.fillRect(x - e, top - 8, w + 2 * e, 10);
  if (chimney != null) { const cx = x + w * chimney; g.fillRect(cx - w * .05, top - r * 1.05, w * .1, r * .8); }
};
// a tower: shaft and a top ('spire' | 'dome' | 'lantern' | 'flat')
export const tower = (x, base, w, h, { top = 'spire', th = .5 } = {}) => g => {
  g.fillRect(x - w / 2, base - h, w, h);
  const y = base - h, t = h * th;
  if (top === 'spire') { g.fillRect(x - w * .62, y - 6, w * 1.24, 8); poly(g, [[x - w * .42, y - 4], [x, y - t], [x + w * .42, y - 4]]); bar(g, [x, y - t], [x, y - t - w * .45], 3); }
  if (top === 'dome') { g.beginPath(); g.ellipse(x, y, w * .55, t * .45, 0, Math.PI, 0); g.fill(); bar(g, [x, y - t * .45], [x, y - t * .7], 3); }
  if (top === 'lantern') { g.fillRect(x - w * .35, y - t * .35, w * .7, t * .35); poly(g, [[x - w * .5, y - t * .35], [x, y - t * .65], [x + w * .5, y - t * .35]]); }
};
// a row of buildings along a base line: { x0, x1, base, h: [min, max], seed, spires: [x…], domes: [x…] }
export const skyline = ({ x0, x1, base, h = [40, 110], seed = 3, spires = [], domes = [] }) => g => {
  const r = rng(seed); let x = x0;
  while (x < x1) { const w = r.range(34, 90), hh = r.range(h[0], h[1]); house(x, base, Math.min(w, x1 - x), hh, { roof: r.pick(['gable', 'flat', 'hip', 'flat']), rh: r.range(.2, .5), chimney: r() < .3 ? r.range(.2, .8) : null })(g); x += w - 2; }
  for (const sx of spires) tower(sx, base, 26, h[1] * 1.6, { top: 'spire', th: .9 })(g);
  for (const dx of domes) tower(dx, base, 46, h[1] * 1.15, { top: 'dome', th: .7 })(g);
};

// ---- nature ----------------------------------------------------------------------------------------------------
// a conifer: tiers of drooping boughs
export const pine = (x, base, h, { w = h * .36, tiers = 6, seed = 1 } = {}) => g => {
  const r = rng(seed); bar(g, [x, base], [x, base - h * .2], Math.max(4, w * .09));
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, y = base - h * (.12 + .88 * k), ww = w * (1 - k * .85) * r.range(.85, 1.1) / 2, th = h * .2;
    poly(g, [[x - ww, y], [x - ww * .55, y - th * .45], [x, y - th], [x + ww * .5, y - th * .4], [x + ww, y + r.range(-4, 4)], [x, y - th * .2]]);
  }
};
// a broadleaf tree: trunk, two limbs, a lumpy crown of overlapping discs
export const tree = (x, base, h, { crown = h * .32, seed = 1, lean = 0 } = {}) => g => {
  const r = rng(seed), top = [x + lean * h * .2, base - h + crown];
  bar(g, [x, base], top, Math.max(5, h * .05));
  bar(g, mix2([x, base], top, .55), [top[0] - crown * .45, top[1] + crown * .1], h * .025);
  bar(g, mix2([x, base], top, .6), [top[0] + crown * .5, top[1] + crown * .05], h * .025);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = crown * r.range(.45, .62); disc(g, [top[0] + Math.cos(a) * crown * .5, top[1] + Math.sin(a) * crown * .4 - crown * .15], rr); }
  disc(g, [top[0], top[1] - crown * .2], crown * .7);
};
const mix2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
// a band of trees along y: 'round' bumps or 'pine' teeth, height h
export const treeline = (x0, x1, y, { h = 60, kind = 'round', seed = 5 } = {}) => g => {
  const r = rng(seed), n1 = noise1(seed); g.beginPath(); g.moveTo(x0, y);
  for (let x = x0; x <= x1; x += kind === 'pine' ? 26 : 4) {
    if (kind === 'pine') { const hh = h * (.55 + .45 * (n1(x * .02) * .5 + .5)) * r.range(.75, 1.1); g.lineTo(x, y - hh * .3); g.lineTo(x + 13, y - hh); }
    else g.lineTo(x, y - h * (.5 + .35 * n1(x * .012) + .15 * Math.abs(Math.sin(x * .06 + n1(x * .03) * 2))));
  }
  g.lineTo(x1, y); g.closePath(); g.fill();
};
// a far ridge: a band from y up to a wavy top
export const hills = (x0, x1, y, { amp = 60, seed = 2, freq = .004 } = {}) => g => {
  const n1 = noise1(seed); g.beginPath(); g.moveTo(x0, y);
  for (let x = x0; x <= x1; x += 6) g.lineTo(x, y - amp * (.55 + .45 * n1(x * freq)) - amp * .25 * n1(x * freq * 3.1 + 9));
  g.lineTo(x1, y); g.closePath(); g.fill();
};
// a gull: a small filled crescent pair
export const bird = (x, y, s = 14, { flap = .4 } = {}) => g => {
  const wing = d => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + d * s * .5, y - s * (.3 + flap * .5), x + d * s, y - s * flap * .2); g.quadraticCurveTo(x + d * s * .5, y - s * (.15 + flap * .35), x, y + s * .12); g.fill(); };
  wing(1); wing(-1);
};

// ---- water and boats -------------------------------------------------------------------------------------------
// a jetty: deck from x0 to x1 at y (thickness th), posts down to the water line wy every `every` px
export const jetty = (x0, x1, y, wy, { th = 14, every = 70, w = 10 } = {}) => g => {
  g.fillRect(x0, y - th, x1 - x0, th);
  for (let x = x0 + 8; x <= x1 - 4; x += every) bar(g, [x, y], [x, wy], w);
};
// a rowing boat / small boat: hull of width w with its waterline at y, optional mast and cabin
export const boat = (x, y, w, { h = w * .22, mast = 0, cabin = 0, dir = 1 } = {}) => g => {
  const X = dx => x + dx * dir; // the bow is on the `dir` side
  poly(g, [[X(-w / 2), y - h], [X(w / 2), y - h * 1.15], [X(w * .38), y], [X(-w * .4), y]]);
  if (cabin) g.fillRect(X(dir > 0 ? -w * .18 : w * .14), y - h - w * cabin * .25, w * .32, w * cabin * .25 + 2);
  if (mast) { bar(g, [x, y - h], [x, y - h - w * mast], 4); bar(g, [x, y - h - w * mast * .9], [x + w * .32 * dir, y - h - 2], 2.5); }
};

// ---- props held in a hand --------------------------------------------------------------------------------------
// an umbrella whose shaft ends at `hand`, canopy centre `up` px above along `tilt` (deg, + leans right)
export const umbrella = (hand, { r = 120, up = 170, tilt = 0 } = {}) => g => {
  const d = rot([0, -1], tilt * D), c = add(hand, mul(d, up)), side = rot(d, Math.PI / 2);
  bar(g, hand, add(c, mul(d, r * .25)), 5);
  const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(add(c, add(mul(side, -Math.cos(a) * r), mul(d, Math.sin(a) * r * .55)))); }
  for (let k = 3; k >= 0; k--) { const a = Math.PI * (k + .5) / 4; pts.push(add(c, add(mul(side, -Math.cos(a) * r * .92), mul(d, -r * .06)))); }
  poly(g, pts);
};
// a rod / staff / pole held at `hand`, running to `tip`
export const rod = (hand, tip, { w = 4 } = {}) => g => bar(g, hand, tip, w);
// a hand lantern hanging below `hand`
export const lantern = (hand, { s = 26 } = {}) => g => { bar(g, hand, [hand[0], hand[1] + s * .8], 2.5); g.fillRect(hand[0] - s * .4, hand[1] + s * .8, s * .8, s); poly(g, [[hand[0] - s * .5, hand[1] + s * .82], [hand[0], hand[1] + s * .55], [hand[0] + s * .5, hand[1] + s * .82]]); };

// ---- people ----------------------------------------------------------------------------------------------------
// The figure rig. One body, built from joint angles in degrees, so the same numbers draw the mask, the reference and the
// cast sheet, and check.mjs can test them. Facing: 'left' | 'right' (profile, walking that way) | 'toward' | 'away'.
//   stride 0…1 (0 stands), lean (deg forward), arms { near: { sh, el }, far: { sh, el } } (side) — sh swings forward
//   from hanging, el folds the forearm forward; frontal views use { left/right: { sh (out from the side), el } }.
//   reach: { near|far|left|right: [x, y] } solves that arm for a hand at the point (the elbow only bends forward).
//   hat: 'brim' | 'cap' | 'hood' | null · coat: 'long' | 'short' | 'dress' | null · bag: 'back' | 'side' | null
export const LIMITS = { hip: [-35, 95], knee: [0, 140], shoulder: [-70, 180], elbow: [0, 150], lean: [-25, 25], out: [-10, 165] };

export function figureRig(o) {
  const { x, ground, h } = o, facing = o.facing || 'right', side = facing === 'left' || facing === 'right';
  const f = facing === 'left' ? -1 : 1, s = clamp(o.stride ?? 0, 0, 1), lean = o.lean ?? s * 4;
  const thigh = h * .245, shin = h * .235, foot = h * .075, torso = h * .3, neck = h * .035, head = h * .066, upper = h * .17, fore = h * .155;
  const J = { facing, side, f, h, joints: {}, angles: {}, problems: [] };
  const ang = (name, v, lim) => { J.angles[name] = +v.toFixed(1); const [a, b] = LIMITS[lim]; if (v < a - .01 || v > b + .01) J.problems.push(`${name} ${v.toFixed(0)}° outside ${lim} ${a}…${b}°`); return v; };
  ang('lean', lean, 'lean');
  // legs: thigh angle from straight down (+ forward), knee folds the shin backward
  const legs = side ? { front: [s * 24, s * 8], back: [-s * 20, s * 32] } : { left: [s * 10, s * 18], right: [0, 0] };
  const L = {}, P = (a, l) => side ? [Math.sin(a * D) * l * f, Math.cos(a * D) * l] : [0, Math.cos(a * D) * l]; // frontal: a swing only foreshortens
  for (const [k, [hip, knee]] of Object.entries({ ...legs, ...(o.legs || {}) })) {
    ang(`${k} hip`, hip, 'hip'); ang(`${k} knee`, knee, 'knee');
    const kn = P(hip, thigh), an = add(kn, P(hip - knee, shin));
    L[k] = { kn, an };
  }
  // the hips sit so the lowest ankle is one foot-height above the ground
  const lowY = Math.max(...Object.values(L).map(l => l.an[1]));
  const hip = [x, ground - h * .03 - lowY];
  for (const [k, l] of Object.entries(L)) {
    const off = side ? [0, 0] : [k === 'left' ? -h * .045 : h * .045, 0];
    const kn = add(add(hip, off), l.kn), an = add(add(hip, off), l.an);
    J.joints[`${k} hip`] = add(hip, off); J.joints[`${k} knee`] = kn; J.joints[`${k} ankle`] = an;
    J.joints[`${k} toe`] = side ? add(an, [f * foot, h * .028]) : add(an, [0, h * .03]);
  }
  const up = rot([0, -1], lean * D * (side ? f : 0)), sh = add(hip, mul(up, torso)), hd = add(sh, mul(up, neck + head));
  J.joints.hip = hip; J.joints.chest = sh; J.joints.head = hd; J.headR = head;
  // arms
  const armsDefault = side ? { near: { sh: -s * 22, el: 12 + s * 10 }, far: { sh: s * 22, el: 14 + s * 12 } } : { left: { sh: 8, el: 10 }, right: { sh: 8, el: 10 } };
  const arms = { ...armsDefault, ...(o.arms || {}) };
  const shoulderPt = k => side ? add(sh, [f * (k === 'near' ? -h * .012 : h * .012), h * .02]) : add(sh, [k === 'left' ? -h * .105 : h * .105, h * .02]);
  for (const [k, a0] of Object.entries(arms)) {
    let a = { ...a0 }; const S0 = shoulderPt(k);
    if (o.reach && o.reach[k]) a = solveArm(S0, o.reach[k], upper, fore, side ? f : (k === 'left' ? -1 : 1), J, k);
    ang(`${k} shoulder`, a.sh, side ? 'shoulder' : 'out'); ang(`${k} elbow`, a.el, 'elbow');
    const dir = side ? f : (k === 'left' ? -1 : 1);
    const ua = a.sh * D, E = add(S0, [Math.sin(ua) * upper * dir, Math.cos(ua) * upper]);
    const fa = (a.sh + a.el) * D, Hh = add(E, [Math.sin(fa) * fore * dir, Math.cos(fa) * fore]);
    J.joints[`${k} shoulder`] = S0; J.joints[`${k} elbow`] = E; J.joints[`${k} hand`] = Hh;
  }
  J.o = o; J.ground = ground;
  return J;
}
// two-bone IK in the arm's swing plane: the elbow bends forward only; an unreachable target is a problem, not a stretch
function solveArm(S, T, a, b, dir, J, k) {
  const d = sub(T, S), L = Math.hypot(d[0], d[1]);
  if (L > a + b - .5) J.problems.push(`${k} hand cannot reach [${T.map(Math.round)}] (${L.toFixed(0)} > arm ${(a + b).toFixed(0)})`);
  const l = clamp(L, Math.abs(a - b) + 1, a + b - .5);
  const target = Math.atan2(d[0] * dir, d[1]) / D; // angle from straight down, + forward
  const cosE = clamp((a * a + b * b - l * l) / (2 * a * b), -1, 1), el = 180 - Math.acos(cosE) / D;
  const cosS = clamp((a * a + l * l - b * b) / (2 * a * l), -1, 1), sh = target - Math.acos(cosS) / D;
  return { sh, el };
}
// draw a rigged figure: head, hat, torso / coat, arms, legs, feet. Returns draw(g).
export const figure = J => g => {
  const j = J.joints, h = J.h, f = J.f, side = J.side, o = J.o;
  const limb = (a, b, w) => bar(g, a, b, w);
  const legs = side ? ['back', 'front'] : ['left', 'right'];
  for (const k of legs) {
    limb(j[`${k} hip`], j[`${k} knee`], h * .062); limb(j[`${k} knee`], j[`${k} ankle`], h * .05);
    const an = j[`${k} ankle`], toe = j[`${k} toe`];
    if (side) poly(g, [[an[0] - f * h * .02, an[1] - h * .01], [toe[0], toe[1] - h * .018], [toe[0] + f * h * .006, toe[1]], [an[0] - f * h * .03, toe[1]]]);
    else ell(g, [an[0], an[1] + h * .018], h * .028, h * .018);
  }
  // torso and coat
  const sh = j.chest, hp = j.hip, sw = side ? h * .07 : h * .125, hw = side ? h * .075 : h * .095;
  const up = norm(sub(sh, hp)), across = [-up[1], up[0]];
  const hemY = o.coat === 'long' ? .5 : o.coat === 'dress' ? .62 : o.coat === 'short' ? .12 : .02;
  const hem = add(hp, mul(up, -h * hemY)), hemW = o.coat === 'long' || o.coat === 'dress' ? hw * 1.45 : hw;
  poly(g, [add(sh, mul(across, -sw)), add(sh, mul(across, sw)), add(hem, [hemW * (side ? 1.05 : 1), 0]), add(hem, [-hemW * (side ? 1.05 : 1), 0])]);
  ell(g, add(sh, mul(up, -h * .01)), sw * 1.02, h * .035, Math.atan2(up[1], up[0]) + Math.PI / 2); // shoulders round
  if (o.bag === 'back' && side) ell(g, add(add(sh, mul(up, -h * .12)), [-f * h * .085, 0]), h * .05, h * .085);
  if (o.bag === 'side') g.fillRect(hp[0] + (side ? -f * h * .07 : h * .1) - h * .04, hp[1] - h * .06, h * .08, h * .07);
  // neck and head
  limb(sh, j.head, h * .045); disc(g, j.head, J.headR);
  if (side) ell(g, add(j.head, [f * J.headR * .55, J.headR * .25]), J.headR * .55, J.headR * .45); // jaw / nose side
  if (o.hat === 'brim') { ell(g, add(j.head, [0, -J.headR * .55]), J.headR * 1.75, J.headR * .32); poly(g, [add(j.head, [-J.headR * .85, -J.headR * .5]), add(j.head, [-J.headR * .75, -J.headR * 1.45]), add(j.head, [J.headR * .75, -J.headR * 1.45]), add(j.head, [J.headR * .85, -J.headR * .5])]); }
  if (o.hat === 'cap') { ell(g, add(j.head, [0, -J.headR * .45]), J.headR * 1.05, J.headR * .7); if (side) ell(g, add(j.head, [f * J.headR * 1.1, -J.headR * .35]), J.headR * .6, J.headR * .14); }
  if (o.hat === 'hood') ell(g, add(j.head, [side ? -f * J.headR * .15 : 0, -J.headR * .1]), J.headR * 1.3, J.headR * 1.35);
  // arms last (in front of the coat)
  for (const k of side ? ['far', 'near'] : ['left', 'right']) {
    if (!j[`${k} shoulder`]) continue;
    limb(j[`${k} shoulder`], j[`${k} elbow`], h * .05); limb(j[`${k} elbow`], j[`${k} hand`], h * .043); disc(g, j[`${k} hand`], h * .026);
  }
};
