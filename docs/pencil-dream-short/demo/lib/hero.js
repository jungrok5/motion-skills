// pencil-dream-short · hero.js — the doodled hero: a loose graphite figure built from data, turned like a small 3-D model.
//
//   hero(spec, pose) → { parts, at, audit }
//     parts  [{ knock, ops }] back to front (render with Painter.parts)
//     at     anchors in world units: feet, hip, shoulder.{R,L}, hand.{R,L}, tip (pencil point), head (centre), top, eye
//     audit  ["body: Ada R elbow folds backward", …] — joints outside LIM, a pencil the hand cannot reach
//
// Turning: features sit on a sphere (head) and an elliptic cylinder (torso) and are projected for the body's yaw, so a figure
// facing screen-right shows its RIGHT side: the near shoulder / hip are on the screen side BEHIND the face, the far ones on
// the facing side; the eye on the facing side is the narrower one; the ear and the parting sit toward the back of the head.
// Yaw: 0 = facing the viewer, +90 = facing screen right, −90 = screen left, ±180 = back to the viewer.
//
// spec = {
//   name, H: 240 (height in world units, feet to crown), hand: 'R' (the drawing hand),
//   head: { r: .13 (× H), jaw: .84 (jaw width), chin: .12 }, ink: 2.0 (line width px),
//   hair: { style: 'bob' | 'curls' | 'spiky' | 'short' | 'bun' | 'tufts' | 'none', len: 1, vol: 1, fringe: 'side' | 'straight' | 'none', seed },
//   face: { eye: 'round' | 'dot', lashes, freckles, blush (spot on nose and lips), nose: 'button' | 'long' | 'round', beard: null | 'full' | 'short', brows: 1 },
//   items: [{ type: 'glasses' | 'beanie' | 'scarf' | 'bow' | 'cap', pom, tail }]  (drawn in the spot colour — the hero's signature),
//   top: { kind: 'tee' | 'sweater' | 'coat' | 'dress', stripes: 0, pocket, collar: 'round' | 'v' | 'roll' },
//   legs: { kind: 'trousers' | 'shorts' | 'skirt', boots },
//   pencil: { len: .2 (× H) },
// }
// pose = {
//   x, y (feet, world), yaw (body, deg), head: { yaw (relative to body), roll, pitch (+ up) }, look: [lx, ly] (−1…1), blink (0…1),
//   mouth: 'smile' | 'grin' | 'o' | 'flat' | 'open' | 'smirk' | 'sad', brows: 'up' | 'flat' | 'knit' | 'soft',
//   arms: { R: { a, b } | { to: [x, y] } (the pencil tip, or the hand when empty) | { grip: [x, y], dir } (the hand, pencil along dir rad), L: … }   a = upper arm from hanging, toward the facing side (outward when frontal), b = elbow bend
//   legs: { R: { a, k }, L: { a, k } }, stance (× H), breathe (s), flow (s, hair / scarf sway), hold: 'R' | 'L' | null (pencil in that hand),
//   penAng (deg, the pencil's angle when held and not drawing), open: 'R' | 'L' (an open palm ready to catch)
// }
import { TAU, clamp, lerp, n1, hash, curve, arc, ellipse, hand as wob, line, fill, part, hatch, bez } from './pencil.js';

export const LIM = { neck: 90, roll: 32, pitch: 42, shoulder: [-70, 195], elbow: [-4, 155], hip: [-35, 80], knee: [-4, 145] };
const D = Math.PI / 180;

function rot(p, c, a) { const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * k - y * s, c[1] + x * s + y * k]; }
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const nrm = v => { const d = Math.hypot(v[0], v[1]) || 1; return [v[0] / d, v[1] / d]; };

/** project a point on an ellipsoid (rx wide, rz deep, ry tall) at (lon, lat) for yaw θ and pitch p → [x, y, depth] relative */
function proj(lon, lat, th, p = 0, rx = 1, ry = rx, rz = rx) {
  let X = Math.sin(lon) * Math.cos(lat) * rx, Y = -Math.sin(lat) * ry, Z = Math.cos(lon) * Math.cos(lat) * rz;
  const Y2 = Y * Math.cos(p) - Z * Math.sin(p), Z2 = Y * Math.sin(p) + Z * Math.cos(p);
  return [X * Math.cos(th) + Z2 * Math.sin(th), Y2, -X * Math.sin(th) + Z2 * Math.cos(th)];
}
/** 2-bone IK: shoulder S → target T with bone lengths a, b; pick the elbow that scores higher */
function ik(S, T, a, b, score) {
  const d0 = Math.hypot(T[0] - S[0], T[1] - S[1]), d = clamp(d0, Math.abs(a - b) + 1e-3, a + b - 1e-3), base = Math.atan2(T[1] - S[1], T[0] - S[0]);
  const al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const E1 = [S[0] + Math.cos(base + al) * a, S[1] + Math.sin(base + al) * a], E2 = [S[0] + Math.cos(base - al) * a, S[1] + Math.sin(base - al) * a];
  const E = score(E1) >= score(E2) ? E1 : E2, dir = nrm(sub(T, S)), H = [S[0] + dir[0] * d, S[1] + dir[1] * d];
  const hand = d0 > a + b ? [E[0] + nrm(sub(H, E))[0] * b, E[1] + nrm(sub(H, E))[1] * b] : T;
  return { E, H: hand, short: d0 - (a + b) };
}
/** a tube (arm, leg) between points with half-widths → closed outline */
function tube(pts, ws) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = nrm(sub(b, a)), w = ws[i];
    L.push([pts[i][0] - d[1] * w, pts[i][1] + d[0] * w]); R.push([pts[i][0] + d[1] * w, pts[i][1] - d[0] * w]);
  }
  return { L, R, poly: [...L, ...R.reverse()] };
}

/** the hero, in parts, back to front */
export function hero(spec, pose) {
  const H = spec.H || 240, name = spec.name || 'hero', ink = spec.ink ?? 2.0, sd = (spec.hair && spec.hair.seed) || 3;
  const th = (pose.yaw || 0) * D, f = Math.sin(th) >= 0 ? 1 : -1, side = Math.abs(Math.sin(th)), back = Math.cos(th) < -.05;
  const hp = pose.head || {}, hth = th + (hp.yaw || 0) * D, roll = (hp.roll || 0) * D, pitch = (hp.pitch || 0) * D;
  const audit = [], A = m => audit.push(`body: ${name} ${m}`);
  if (Math.abs(hp.yaw || 0) > LIM.neck) A(`neck turned ${Math.round(hp.yaw)}° (limit ${LIM.neck}°)`);
  if (Math.abs(hp.roll || 0) > LIM.roll) A(`head tilted ${Math.round(hp.roll)}° (limit ${LIM.roll}°)`);
  if (Math.abs(hp.pitch || 0) > LIM.pitch) A(`head pitched ${Math.round(hp.pitch)}° (limit ${LIM.pitch}°)`);
  const br = Math.sin((pose.breathe || 0) * TAU / 3.6) * H * .003, fl = pose.flow || 0;
  const x = pose.x || 0, y = pose.y || 0, stance = (pose.stance ?? .05) * H;
  const r = (spec.head?.r ?? .13) * H, hipY = y - .385 * H, shY = hipY - .27 * H - br, neckTop = shY - .045 * H;
  const hc = [x + Math.sin(th) * H * .004, neckTop - r * .78 - br * .5];   // head centre
  const W = (v, o = {}) => line(wob(v, o.amp ?? H * .0035, o.seed ?? 1, o.over ?? H * .006), { w: o.w ?? ink, a: o.a ?? .92, passes: o.passes ?? 2, col: o.col, taper: o.taper, seed: (o.seed ?? 1) * 13 + 7 });
  const parts = [], at = { feet: [x, y], hip: [x, hipY] };
  const R = p => roll ? rot(p, [x, neckTop], roll) : p;   // head roll pivots on the neck

  // ── torso frame ──
  const sa = .105 * H, sb = .062 * H, ha = .078 * H;
  const shoulder = s => { const lon = s === 'R' ? -Math.PI / 2 : Math.PI / 2, p = proj(lon, 0, th, 0, sa, 1, sb); return { p: [x + p[0], shY + H * .012], z: p[2] }; };
  const hip = s => { const lon = s === 'R' ? -Math.PI / 2 : Math.PI / 2, p = proj(lon, 0, th, 0, ha * .62, 1, sb * .8); return { p: [x + p[0], hipY], z: p[2] }; };
  const SH = { R: shoulder('R'), L: shoulder('L') }, HP = { R: hip('R'), L: hip('L') };
  at.shoulder = { R: SH.R.p, L: SH.L.p };
  const near = SH.R.z >= SH.L.z ? 'R' : 'L', far = near === 'R' ? 'L' : 'R';

  // ── arms ──
  const ua = .13 * H, fa = .12 * H, armW = .026 * H, pl = (spec.pencil?.len ?? .17) * H;
  const arms = {};
  for (const s of ['R', 'L']) {
    const S = SH[s].p, o = (pose.arms && pose.arms[s]) || { a: 8, b: 12 }, dir = side > .35 ? f : (s === 'L' ? 1 : -1);
    const holds = pose.hold === s;
    let E, Hd, tip = null, penDir = null;
    if (o.grip) {
      // a given grip (the hand-over after a catch): the hand goes there, the pencil points along o.dir
      const sol = ik(S, o.grip, ua, fa, P => side > .35 ? -f * P[0] * side + P[1] * (1 - side) : P[1] + Math.abs(P[0] - x) * .4);
      E = sol.E; Hd = sol.H; if (sol.short > H * .02) A(`${s} hand cannot reach its grip (${Math.round(sol.short)} short)`);
      if (holds) { const pa = o.dir ?? ((pose.penAng ?? 60) * D); penDir = [Math.cos(pa), Math.sin(pa)]; tip = add(Hd, penDir, pl * .7); }
    } else if (o.to) {
      // drawing: the pencil continues the reach a little downward; the hand grips it a third of the way from the back
      const T = o.to, d0 = nrm(sub(T, S)), da = Math.atan2(d0[1], d0[0]) + (d0[0] >= 0 ? .55 : -.55) * (holds ? 1 : 0);
      penDir = holds ? [Math.cos(da), Math.sin(da)] : d0;
      const G = holds ? sub(T, [penDir[0] * pl * .7, penDir[1] * pl * .7]) : T;
      const sol = ik(S, G, ua, fa, P => side > .35 ? -f * P[0] * side + P[1] * (1 - side) : P[1] + Math.abs(P[0] - x) * .4);
      E = sol.E; Hd = sol.H;
      if (sol.short > H * .02) A(`${s} hand cannot reach its target (${Math.round(sol.short)} short)`);
      if (holds) tip = add(Hd, penDir, pl * .7);
    } else {
      const a = (o.a ?? 8) * D, b = (o.b ?? 12) * D;
      E = [S[0] + Math.sin(a) * ua * dir, S[1] + Math.cos(a) * ua]; Hd = [E[0] + Math.sin(a + b) * fa * dir, E[1] + Math.cos(a + b) * fa];
      if (holds) { const pa = (pose.penAng ?? (dir > 0 ? 60 : 120)) * D; penDir = [Math.cos(pa), Math.sin(pa)]; tip = add(Hd, penDir, pl * .7); }
    }
    // audit in the "forward" convention: angles measured toward dir
    const ang = v => Math.atan2(v[0] * dir, v[1]) / D, aU = ang(sub(E, S)), aF = ang(sub(Hd, E)), bend = ((aF - aU + 540) % 360) - 180;
    const aN = aU < -90 ? aU + 360 : aU;   // overhead reads as ~180°, not −180°
    if (side > .5 && (aN < LIM.shoulder[0] || aN > LIM.shoulder[1])) A(`${s} shoulder at ${Math.round(aN)}°`);
    if (side > .5 && (bend < LIM.elbow[0] || bend > LIM.elbow[1])) A(`${s} elbow folds ${bend < 0 ? 'backward' : 'too far'} (${Math.round(bend)}°)`);
    arms[s] = { S, E, H: Hd, tip, penDir, holds, open: pose.open === s };
  }
  at.hand = { R: arms.R.H, L: arms.L.H }; at.tip = (arms.R.tip || arms.L.tip) || null;

  const drawArm = s => {
    const a = arms[s], t = tube([a.S, a.E, a.H], [armW * 1.15, armW * .95, armW * .8]), ops = [];
    ops.push(W(t.L, { seed: 11 + (s === 'R' ? 0 : 5), w: ink * .9 }), W(t.R.slice().reverse(), { seed: 12 + (s === 'R' ? 0 : 5), w: ink * .9 }));
    // cuff
    const cd = nrm(sub(a.H, a.E)), cuff = add(a.E, cd, fa * .78);
    ops.push(W([[cuff[0] - cd[1] * armW * 1.1, cuff[1] + cd[0] * armW * 1.1], [cuff[0] + cd[1] * armW * 1.1, cuff[1] - cd[0] * armW * 1.1]], { w: ink * .7, seed: 13, over: 0 }));
    const hr = H * .022, ha = Math.atan2(cd[1], cd[0]), hk = curve(ellipse(a.H[0] + cd[0] * hr * .3, a.H[1] + cd[1] * hr * .3, hr * 1.15, hr * .85, ha, 8).slice(0, 8), 4, true);
    let pencilPart = null;
    if (a.holds && a.tip) pencilPart = pencil(a.H, a.penDir, pl, ink, H);
    const tb = rot(cd, [0, 0], s === 'R' ? -1.1 : 1.1), handOps = [W(hk, { w: ink * .85, seed: 14, over: hr * .3 }), W([add(a.H, tb, hr * .5), add(a.H, tb, hr * 1.25)], { w: ink * .7, seed: 17, over: 0, passes: 1 })];
    if (a.holds) handOps.push(W(arc(a.H[0], a.H[1], hr * .55, hr * .5, Math.atan2(cd[1], cd[0]) - .4, Math.atan2(cd[1], cd[0]) + 1.6, 6), { w: ink * .6, seed: 15, over: 0, passes: 1 }));   // fingers wrapped
    else if (a.open) { for (let k = -1; k <= 1; k++) { const fd = rot(cd, [0, 0], k * .35); handOps.push(W([add(a.H, fd, hr * .7), add(a.H, fd, hr * 1.55)], { w: ink * .7, seed: 16 + k, over: 0, passes: 1 })); } }
    return { arm: part(ops, t.poly), hand: part(handOps, hk), pencil: pencilPart };
  };

  // ── legs ──
  const legW = .034 * H, thigh = .185 * H, shin = .185 * H, foot = .085 * H;
  const legs = {};
  for (const s of ['R', 'L']) {
    const o = (pose.legs && pose.legs[s]) || {}, Hp = HP[s].p, sx = (s === 'R' ? -1 : 1) * stance * Math.max(.25, Math.abs(Math.cos(th)));
    const a = (o.a ?? 0) * D, k = (o.k ?? 0) * D, fwd = side > .35 ? f : 1;
    if ((o.k ?? 0) < LIM.knee[0] || (o.k ?? 0) > LIM.knee[1]) A(`${s} knee bent ${Math.round(o.k)}° (folds backward only, ≤ ${LIM.knee[1]}°)`);
    if ((o.a ?? 0) < LIM.hip[0] || (o.a ?? 0) > LIM.hip[1]) A(`${s} hip at ${Math.round(o.a)}°`);
    const K = [Hp[0] + sx * .5 + Math.sin(a) * thigh * fwd, Hp[1] + Math.cos(a) * thigh];
    const An = [K[0] + sx * .5 + Math.sin(a - k) * shin * fwd, K[1] + Math.cos(a - k) * shin];
    legs[s] = { Hp, K, An, z: HP[s].z };
  }
  // plant the lowest sole on the ground line
  const low = Math.max(legs.R.An[1], legs.L.An[1]), dy = y - H * .025 - low;
  for (const s of ['R', 'L']) for (const k of ['K', 'An']) legs[s][k] = [legs[s][k][0], legs[s][k][1] + dy];
  const drawLeg = s => {
    const L = legs[s], kind = spec.legs?.kind || 'trousers', t = tube([L.Hp, L.K, L.An], [legW * 1.2, legW, kind === 'shorts' ? legW * .6 : legW * .95]), ops = [];
    ops.push(W(t.L, { seed: 21 + (s === 'R' ? 0 : 4), w: ink * .9 }), W(t.R.slice().reverse(), { seed: 22 + (s === 'R' ? 0 : 4), w: ink * .9 }));
    if (kind === 'shorts') { const m = [lerp(L.Hp[0], L.K[0], .8), lerp(L.Hp[1], L.K[1], .8)]; ops.push(W([[m[0] - legW * 1.3, m[1]], [m[0] + legW * 1.3, m[1]]], { w: ink * .8, seed: 23, over: 0 })); }
    // shoe: points to the facing side (frontal: a little outward)
    const fd = side > .2 ? f * Math.max(side, .35) : (s === 'R' ? -.3 : .3), boot = spec.legs?.boots;
    const toe = [L.An[0] + fd * foot, L.An[1] + H * .02], heel = [L.An[0] - fd * foot * .25, L.An[1] + H * .02];
    const shoe = curve([heel, [heel[0], L.An[1] - H * (boot ? .045 : .012)], [L.An[0] + fd * foot * .3, L.An[1] - H * (boot ? .04 : .016)], [toe[0], toe[1] - H * .012], toe, [lerp(heel[0], toe[0], .5), toe[1] + H * .004]], 5, true);
    ops.push(W(shoe, { seed: 24, w: ink * .95, over: 0 }));
    return part(ops, [...t.poly, ...shoe]);
  };

  // ── head geometry ──
  const hpt = (lon, lat, rr = 1) => { const p = proj(lon * D, lat * D, hth, pitch, r * rr); return { p: R([hc[0] + p[0], hc[1] + p[1]]), z: p[2] }; };
  const jaw = spec.head?.jaw ?? .84, chinShift = Math.sin(hth) * r * .2;
  const headPoly = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * TAU, s = Math.sin(a), lower = Math.max(0, s), rr = 1 - (1 - jaw) * lower * lower;
    headPoly.push(R([hc[0] + Math.cos(a) * r * rr + chinShift * lower * lower, hc[1] + s * r * (1 + (spec.head?.chin ?? .12) * lower * lower)]));
  }
  at.head = R(hc); at.top = R([hc[0], hc[1] - r]); at.eye = hpt(0, 4).p;

  // hair
  const hair = spec.hair || { style: 'bob' }, hl = hair.len ?? 1, hv = hair.vol ?? 1, sway = n1(fl * .7, 9) * r * .05;
  const backHair = [], frontHair = [];
  const crown = (rr, a0 = 200, a1 = 340) => arc(hc[0], hc[1] - r * .02, r * rr, r * rr * .98, a0 * D, a1 * D, 18).map(R);
  if (hair.style === 'bob' || hair.style === 'curls' || hair.style === 'bun' || hair.style === 'spiky' || hair.style === 'short') {
    const vol = (hair.style === 'short' ? 1.05 : 1.12) * hv, lenY = hair.style === 'short' ? r * .1 : hair.style === 'bob' ? r * .95 * hl : r * .6 * hl;
    const sideL = R([hc[0] - r * vol + sway, hc[1] + lenY]), sideR = R([hc[0] + r * vol + sway, hc[1] + lenY]);
    const mass = [...crown(vol, 160, 380), sideR, R([hc[0] + r * .3, hc[1] + lenY * .6]), R([hc[0] - r * .3, hc[1] + lenY * .6]), sideL];
    backHair.push(part([W(curve([sideL, ...crown(vol, 160, 380), sideR], 3), { seed: sd, w: ink * .95, amp: r * .03 })], curve(mass, 3, true)));
    if (hair.style === 'bun') { const b = R([hc[0] - Math.sin(hth) * r * .3, hc[1] - r * 1.18]); backHair.push(part([W(ellipse(b[0], b[1], r * .38, r * .3, 0, 16), { seed: sd + 2 })], ellipse(b[0], b[1], r * .38, r * .3, 0, 16))); }
    // loose strands: the doodle look — a few lines that overshoot the mass
    const n = hair.style === 'short' ? 5 : 9, rs = (i, k) => hash(sd, i, k);
    for (let i = 0; i < n; i++) {
      const a = (195 + 150 * (i + rs(i, 1) * .6) / n) * D, from = R([hc[0] + Math.cos(a) * r * .55, hc[1] + Math.sin(a) * r * .75]);
      const out = R([hc[0] + Math.cos(a) * r * (vol + .08 + rs(i, 2) * .14) + sway, hc[1] + Math.sin(a) * r * (vol + .02) + (hair.style === 'bob' ? r * .2 : 0)]);
      const end = hair.style === 'bob' && Math.abs(Math.cos(a)) > .55 ? R([hc[0] + Math.sign(Math.cos(a)) * r * (vol + rs(i, 3) * .12) + sway * 1.5, hc[1] + lenY * (.7 + rs(i, 4) * .4)]) : out;
      const strand = hair.style === 'curls' ? arc(out[0], out[1], r * .14, r * .14, a, a + 5.5, 10) : hair.style === 'spiky' ? [from, add(out, nrm(sub(out, hc)), r * .25)] : curve([from, out, end], 5);
      backHair.push(part([W(strand, { seed: sd + 10 + i, w: ink * .7, passes: 1, over: r * .06 })]));
    }
    // a wild strand or two on top (the doodle's cowlick)
    frontHair.push(part([W(curve([R([hc[0] + r * .05, hc[1] - r * .92]), R([hc[0] + r * .2 + sway, hc[1] - r * 1.3]), R([hc[0] + r * .45 + sway * 2, hc[1] - r * 1.38])], 6), { seed: sd + 30, w: ink * .7, passes: 1 })]));
  } else if (hair.style === 'tufts') {
    for (const s of [-1, 1]) { const ear = R([hc[0] + s * r * .95, hc[1] + r * .05]); backHair.push(part([W(curve([add(ear, [0, -r * .25]), add(ear, [s * r * .2, 0]), add(ear, [s * r * .1, r * .3])], 5), { seed: sd + s, w: ink * .8 })], ellipse(ear[0], ear[1], r * .22, r * .32))); }
  }
  // fringe (front, only when the face is toward us)
  const faceOn = Math.cos(hth) > -.1;
  if (faceOn && hair.fringe && hair.fringe !== 'none' && hair.style !== 'none' && hair.style !== 'tufts') {
    const ops = [];
    for (let i = 0; i < 6; i++) {
      const lon = -60 + i * 24 + (hair.fringe === 'side' ? 12 : 0), p0 = hpt(lon, 62).p, p1 = hpt(lon + (hair.fringe === 'side' ? 22 : 4), 30 + hash(sd, i) * 12).p;
      if (hpt(lon, 40).z > -r * .1) ops.push(W(curve([p0, [lerp(p0[0], p1[0], .5) + sway, lerp(p0[1], p1[1], .5)], p1], 5), { seed: sd + 40 + i, w: ink * .7, passes: 1, over: r * .04 }));
    }
    frontHair.push(part(ops));
  }

  // face
  const face = spec.face || {}, ex = pose.mouth || 'smile', brow = pose.brows || 'flat', look = pose.look || [0, 0], blink = clamp(pose.blink || 0);
  const faceOps = [], faceFills = [];
  const eyeLon = 30, eyeLat = 2, er = r * (face.eye === 'dot' ? .07 : .17);
  for (const s of [-1, 1]) {
    const c = hpt(s * eyeLon, eyeLat); if (c.z < r * .12) continue;
    const fore = clamp(c.z / r, .25, 1) ** .8, rx = er * fore, ry = er * (face.eye === 'dot' ? 1 : 1.12) * (1 - blink * .92);
    const rr = roll + Math.sin(hth) * 0;
    if (face.eye === 'dot' || blink > .85) {
      if (blink > .85) faceOps.push(W(arc(c.p[0], c.p[1], er * fore, er * .45, 0, Math.PI, 8, roll), { seed: 50 + s, w: ink * .9, over: 0, passes: 1 }));
      else faceFills.push(fill(ellipse(c.p[0] + look[0] * rx * .4, c.p[1] + look[1] * ry * .3, rx * 1.1, ry * 1.2, roll, 10), { col: 'lead', gap: rx * .5, a: .9, edge: false }));
    } else {
      faceOps.push(W(ellipse(c.p[0], c.p[1], rx, ry, roll, 18), { seed: 52 + s, w: ink * .85, over: r * .02, amp: r * .008 }));
      const ix = c.p[0] + look[0] * rx * .42 + Math.sin(hth) * rx * .12, iy = c.p[1] + look[1] * ry * .32 + ry * .08, ir = Math.min(rx, ry) * .62;
      faceFills.push(fill(ellipse(ix, iy, ir, ir * 1.05, 0, 12), { col: 'lead', gap: ir * .45, a: .95, edge: false }));
      faceFills.push(fill(ellipse(ix - ir * .35, iy - ir * .4, ir * .26, ir * .26, 0, 8), { col: 'paper', gap: ir * .2, a: 1, edge: false }));
      if (face.lashes) faceOps.push(W([[c.p[0] + s * rx * .9, c.p[1] - ry * .5], [c.p[0] + s * rx * 1.25, c.p[1] - ry * .85]], { seed: 54 + s, w: ink * .7, passes: 1, over: 0 }));
    }
    // brows
    const bl = { up: 30, flat: 22, knit: 18, soft: 24 }[brow] ?? 22, tilt = { up: .0, flat: 0, knit: .35 * s, soft: -.25 * s }[brow] ?? 0;
    const b0 = hpt(s * (eyeLon - 14), eyeLat + bl).p, b1 = hpt(s * (eyeLon + 14), eyeLat + bl - 2).p;
    faceOps.push(W(curve([[b0[0], b0[1] + tilt * r * .1], [lerp(b0[0], b1[0], .5), lerp(b0[1], b1[1], .5) - r * .04], [b1[0], b1[1] - tilt * r * .1]], 4), { seed: 56 + s, w: ink * (face.brows ?? 1) * .95, over: 0, passes: 1 }));
  }
  // nose
  const nz = hpt(0, -12, 1.06);
  if (nz.z > -r * .2) {
    const np = nz.p, sdir = Math.sin(hth);
    if (face.nose === 'long' || face.nose === 'round' || Math.abs(sdir) > .3) faceOps.push(W(curve([hpt(0, 0).p, [np[0] + sdir * r * (face.nose === 'long' ? .2 : .1), np[1]], [np[0] - sdir * r * .02, np[1] + r * .06]], 5), { seed: 60, w: ink * .85, over: 0 }));
    else faceOps.push(W(arc(np[0], np[1], r * (face.nose === 'round' ? .1 : .06), r * .05, .3, Math.PI - .3, 8, roll), { seed: 60, w: ink * .85, over: 0 }));
    if (face.blush) faceFills.push(fill(ellipse(np[0] + sdir * r * .03, np[1] + r * .01, r * .07, r * .055, 0, 10), { col: 'spot', gap: r * .03, a: .6, edge: false }));
    if (face.freckles) for (const s of [-1, 1]) { const c = hpt(s * 32, -16); if (c.z > r * .2) for (let i = 0; i < 3; i++) faceOps.push(W([[c.p[0] + (i - 1) * r * .06, c.p[1] + (i % 2) * r * .03], [c.p[0] + (i - 1) * r * .06 + 1, c.p[1] + (i % 2) * r * .03 + 1]], { seed: 62 + i, w: ink * .8, over: 0, passes: 1 })); }
  }
  // mouth
  const mc = hpt(0, -36), mw = r * .2 * clamp(Math.cos(hth) * .6 + .5, .45, 1);
  if (mc.z > -r * .15) {
    const m = mc.p, mo = Math.sin(hth) * r * .04, L0 = [m[0] - mw + mo, m[1]], R0 = [m[0] + mw + mo, m[1]];
    let mp = null, mf = null;
    if (ex === 'smile') mp = curve([[L0[0], L0[1] - r * .03], [m[0] + mo, m[1] + r * .06], [R0[0], R0[1] - r * .03]], 6);
    else if (ex === 'smirk') mp = curve([[L0[0], L0[1] + r * .01], [m[0] + mo, m[1] + r * .03], [R0[0], R0[1] - r * .05]], 6);
    else if (ex === 'flat') mp = [L0, R0];
    else if (ex === 'sad') mp = curve([[L0[0], L0[1] + r * .04], [m[0] + mo, m[1] - r * .02], [R0[0], R0[1] + r * .04]], 6);
    else if (ex === 'o') mf = ellipse(m[0] + mo, m[1] + r * .02, mw * .38, r * .07, 0, 12);
    else if (ex === 'open' || ex === 'grin') mf = curve([[L0[0], L0[1] - r * .02], [m[0] + mo, m[1] - r * (ex === 'grin' ? .0 : .03)], [R0[0], R0[1] - r * .02], [m[0] + mo, m[1] + r * (ex === 'grin' ? .1 : .13)]], 5, true);
    if (mp) faceOps.push(W(mp, { seed: 64, w: ink, over: r * .02 }));
    if (mf) { faceOps.push(W(mf, { seed: 65, w: ink * .9, over: 0 })); faceFills.push(fill(mf, { col: face.blush ? 'spot' : 'lead', gap: r * .03, a: face.blush ? .8 : .55, edge: false })); }
    else if (face.blush) faceFills.push(fill(ellipse(m[0] + mo, m[1] + r * .035, mw * .55, r * .035, 0, 10), { col: 'spot', gap: r * .02, a: .55, edge: false }));
  }
  // ears: on the side away from the face
  const earOps = [];
  for (const s of [-1, 1]) { const e = hpt(s * 98, -6); if (e.z > -r * .35 && Math.abs(Math.sin(hth)) > .08 && Math.sign(s) !== Math.sign(Math.sin(hth)) || (Math.abs(Math.sin(hth)) <= .08 && !back)) earOps.push(W(arc(e.p[0] + s * r * .04 * Math.cos(hth), e.p[1], r * .12, r * .17, s > 0 ? -1.4 : 1.7, s > 0 ? 1.4 : 4.6, 8, roll), { seed: 66 + s, w: ink * .8, over: 0 })); }
  // beard
  const beardPart = [];
  if (face.beard) {
    const lo = face.beard === 'full' ? 1.55 : 1.3, bpts = [];
    for (let i = 0; i <= 14; i++) { const a = (10 + i / 14 * 160) * D; bpts.push(R([hc[0] + Math.cos(a) * r * (.98 - .1 * Math.sin(a)) + chinShift * Math.sin(a), hc[1] + Math.sin(a) * r * lo * (.55 + .45 * Math.sin(a))])); }
    const top = [hpt(70, -18).p, hpt(30, -28).p, hpt(0, -26).p, hpt(-30, -28).p, hpt(-70, -18).p];
    const poly = [...bpts, ...top.filter((_, i) => true)];
    const ops = [W(curve(bpts, 3), { seed: 70, w: ink * .95, amp: r * .03 })];
    for (let i = 0; i < 9; i++) { const a = (20 + i * 17.5) * D, p = R([hc[0] + Math.cos(a) * r * .62 + chinShift, hc[1] + Math.sin(a) * r * .75 + r * .25]); ops.push(W(curve([p, [p[0] + Math.cos(a) * r * .1 + r * .04, p[1] + r * .14], [p[0] + Math.cos(a) * r * .16, p[1] + r * .3]], 4), { seed: 71 + i, w: ink * .6, passes: 1, over: 0 })); }
    // moustache over the mouth
    const mm = hpt(0, -28).p; ops.push(W(curve([[mm[0] - r * .3, mm[1] + r * .06], [mm[0] - r * .1, mm[1] - r * .03], [mm[0] + Math.sin(hth) * r * .05, mm[1] + r * .01], [mm[0] + r * .12, mm[1] - r * .03], [mm[0] + r * .3, mm[1] + r * .06]], 4), { seed: 79, w: ink * 1.1 }));
    beardPart.push(part(ops, poly));
  }

  // ── items (spot colour) ──
  const itemsBack = [], itemsFront = [], items = spec.items || [];
  for (const it of items) {
    if (it.type === 'glasses' && faceOn) {
      const ops = [], cs = [];
      for (const s of [-1, 1]) { const c = hpt(s * eyeLon, eyeLat - 2); if (c.z < r * .05) continue; const fore = clamp(c.z / r, .2, 1) ** .8; cs.push({ c, s, fore }); ops.push(line(wob(ellipse(c.p[0], c.p[1], r * .27 * fore, r * .26, roll, 22), r * .006, 80 + s, r * .02), { col: 'spot', w: r * .065, world: true, passes: 2, taper: .2 })); ops.push(W(ellipse(c.p[0], c.p[1], r * .27 * fore, r * .26, roll, 22), { seed: 82 + s, w: ink * .55, a: .5, passes: 1, over: 0 })); }
      if (cs.length === 2) { const a = hpt(-eyeLon + 18, eyeLat + 2).p, b = hpt(eyeLon - 18, eyeLat + 2).p; ops.push(line(curve([a, [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5) - r * .05], b], 4), { col: 'spot', w: r * .05, world: true, passes: 1 })); }
      // the temple arm runs back to the near ear
      const ts = -Math.sign(Math.sin(hth)) || 1, e = hpt(ts * 95, 0), g = hpt(ts * (eyeLon + 22), eyeLat);
      if (Math.abs(Math.sin(hth)) > .12 && g.z > 0) ops.push(line([g.p, e.p], { col: 'spot', w: r * .045, world: true, passes: 1 }));
      itemsFront.push(part(ops));
    }
    if (it.type === 'beanie') {
      // sits above the brows: cuff from −.75 r to −.45 r, dome up to −1.4 r
      const top = [], cy = hc[1] - r * .52;
      for (let i = 0; i <= 18; i++) { const a = (180 + i * 10) * D; top.push(R([hc[0] + Math.cos(a) * r * 1.0, cy + Math.sin(a) * r * .88 * (1 - .08 * Math.abs(Math.cos(a)))])); }
      const cl = R([hc[0] - r * 1.0, hc[1] - r * .42]), cr = R([hc[0] + r * 1.0, hc[1] - r * .42]), cl2 = R([hc[0] - r * .99, hc[1] - r * .74]), cr2 = R([hc[0] + r * .99, hc[1] - r * .74]);
      const dome = [...top, cr2, ...curve([cr2, R([hc[0], hc[1] - r * .8 + Math.cos(hth) * r * .03]), cl2], 5)];
      const cuff = [cl2, ...curve([cl2, R([hc[0], hc[1] - r * .8]), cr2], 5), cr, ...curve([cr, R([hc[0], hc[1] - r * .36]), cl], 5)];
      const ops = [fill(dome, { gap: r * .09, angle: -.9 }), fill(cuff, { gap: r * .07, angle: .2, a: .95 }), W(curve(top, 2), { seed: 90, w: ink, amp: r * .015 }), W(cuff, { seed: 91, w: ink * .9 })];
      for (let i = 0; i < 9; i++) { const k = (i + .5) / 9, p0 = [lerp(cl2[0], cr2[0], k), lerp(cl2[1], cr2[1], k) - r * .04], p1 = [lerp(cl[0], cr[0], k), lerp(cl[1], cr[1], k) + r * .04]; ops.push(W([p0, p1], { seed: 92 + i, w: ink * .5, a: .6, passes: 1, over: 0 })); }
      if (it.pom !== false) { const pt = R([hc[0] - Math.sin(hth) * r * .1 + n1(fl, 4) * r * .03, hc[1] - r * 1.48]); ops.push(fill(ellipse(pt[0], pt[1], r * .2, r * .18, 0, 12), { gap: r * .06 }), W(ellipse(pt[0], pt[1], r * .2, r * .18, 0, 12), { seed: 99, w: ink * .8, amp: r * .02 })); }
      itemsFront.push(part(ops, [...dome, ...cuff]));
    }
    if (it.type === 'cap') {
      const dome = arc(hc[0], hc[1] - r * .15, r * 1.04, r * .95, Math.PI, TAU, 16).map(R), bill = Math.sin(hth) * r * .9 + (Math.abs(Math.sin(hth)) < .3 ? 0 : 0);
      const b0 = R([hc[0] + (bill >= 0 ? r * .2 : -r * .2), hc[1] - r * .18]), b1 = R([hc[0] + bill * 1.3 + (Math.abs(bill) < r * .3 ? r * .6 : 0), hc[1] - r * .12]);
      const ops = [fill([...dome], { gap: r * .09 }), W(dome, { seed: 93 }), W(curve([b0, [lerp(b0[0], b1[0], .5), b1[1] - r * .08], b1], 4), { seed: 94, w: ink * 1.1 })];
      itemsFront.push(part(ops, dome));
    }
    if (it.type === 'bow') {
      const c = R([hc[0] + r * .6 - Math.sin(hth) * r * .3, hc[1] - r * .9]), ops = [];
      for (const s of [-1, 1]) { const wing = [c, [c[0] + s * r * .35, c[1] - r * .22], [c[0] + s * r * .38, c[1] + r * .18]]; ops.push(fill(wing, { gap: r * .05 }), W([...wing, c], { seed: 95 + s, w: ink * .8 })); }
      itemsFront.push(part(ops));
    }
  }

  // ── torso ──
  const top = spec.top || { kind: 'tee' }, hw = Math.hypot(sa * Math.cos(th), sb * Math.sin(th)), hemW = Math.hypot((ha + H * .012) * Math.cos(th), sb * 1.05 * Math.sin(th));
  const coat = top.kind === 'coat' || top.kind === 'dress', hemY = hipY + (coat ? H * .1 : H * .015), bx = x + Math.sin(th) * sb * .15;
  const torso = curve([[bx - hw * .45, neckTop + H * .02], [bx - hw, shY + H * .03], [bx - hw * .98, lerp(shY, hipY, .55)], [bx - hemW * (coat ? 1.3 : 1.02), hemY], [bx + hemW * (coat ? 1.3 : 1.02), hemY], [bx + hw * .98, lerp(shY, hipY, .55)], [bx + hw, shY + H * .03], [bx + hw * .45, neckTop + H * .02]], 4, true);
  const tOps = [W(curve([[bx - hw * .45, neckTop + H * .02], [bx - hw, shY + H * .03], [bx - hw * .98, lerp(shY, hipY, .55)], [bx - hemW * (coat ? 1.3 : 1.02), hemY]], 5), { seed: 30 }),
    W(curve([[bx + hw * .45, neckTop + H * .02], [bx + hw, shY + H * .03], [bx + hw * .98, lerp(shY, hipY, .55)], [bx + hemW * (coat ? 1.3 : 1.02), hemY]], 5), { seed: 31 }),
    W([[bx - hemW * (coat ? 1.3 : 1.02), hemY], [bx + hemW * (coat ? 1.3 : 1.02), hemY]], { seed: 32, w: ink * .9 })];
  // neckline on the front, following the turn
  const nr = H * .045, ring = [];
  for (let i = -6; i <= 6; i++) { const p = proj(i * 11 * D, 0, th, 0, nr * 1.2, 1, nr * .8); if (p[2] > -nr * .1) ring.push([x + p[0], neckTop + H * .022 + Math.max(0, p[2]) * (top.collar === 'v' ? .9 : .45)]); }
  if (!back && ring.length > 2) tOps.push(W(curve(ring, 3), { seed: 33, w: ink * .85 }));
  if (top.kind === 'sweater') { tOps.push(W([[bx - hemW * 1.02, hemY - H * .02], [bx + hemW * 1.02, hemY - H * .02]], { seed: 34, w: ink * .6, a: .7, passes: 1 })); for (let i = 0; i < 8; i++) { const k = (i + .5) / 8, xx = lerp(bx - hemW, bx + hemW, k); tOps.push(W([[xx, hemY - H * .02], [xx, hemY]], { seed: 35 + i, w: ink * .45, a: .5, passes: 1, over: 0 })); } }
  if (top.stripes) for (let i = 1; i <= top.stripes; i++) { const yy = lerp(shY + H * .05, hipY, i / (top.stripes + 1)), seg = []; for (let j = -6; j <= 6; j++) { const p = proj(j * 15 * D, 0, th, 0, lerp(hw, hemW, i / (top.stripes + 1)) / Math.max(.3, Math.abs(Math.cos(th))) * Math.abs(Math.cos(th)) || hw, 1, sb); if (p[2] > 0) seg.push([x + p[0], yy + p[2] * .12]); } if (seg.length > 1) tOps.push(W(seg, { seed: 40 + i, w: ink * .6, a: .7, passes: 1 })); }
  if (top.pocket && !back) { const p = proj(25 * D, 0, th, 0, hw, 1, sb); if (p[2] > 0) { const px = x + p[0], py = lerp(shY, hipY, .45); tOps.push(W([[px - H * .02, py], [px - H * .02, py + H * .035], [px + H * .02, py + H * .035], [px + H * .02, py]], { seed: 45, w: ink * .7, passes: 1 })); } }
  const neck = part([W([[x - H * .018, neckTop - r * .2], [x - H * .02, neckTop + H * .02]], { seed: 36, w: ink * .85, over: 0 }), W([[x + H * .018, neckTop - r * .2], [x + H * .02, neckTop + H * .02]], { seed: 37, w: ink * .85, over: 0 })], [[x - H * .02, neckTop - r * .3], [x + H * .02, neckTop - r * .3], [x + H * .022, neckTop + H * .025], [x - H * .022, neckTop + H * .025]]);

  // scarf (spot) — wraps the neck, the tail hangs on the near side and sways
  for (const it of items) if (it.type === 'scarf') {
    const wrap = curve([[x - H * .05, neckTop - H * .005], [x, neckTop + H * .012], [x + H * .05, neckTop - H * .005], [x + H * .055, neckTop + H * .03], [x, neckTop + H * .05], [x - H * .055, neckTop + H * .03]], 4, true);
    const ts = near === 'R' ? (Math.sin(th) >= 0 ? -1 : 1) : 1, sw2 = n1(fl * .9, 12) * H * .02, t0 = [x + ts * H * .03 * Math.max(.4, Math.cos(th)), neckTop + H * .04];
    const tail = curve([t0, [t0[0] + H * .03 * ts, t0[1]], [t0[0] + H * .03 * ts + sw2, t0[1] + H * .12], [t0[0] + sw2 * 1.4, t0[1] + H * .13], t0], 4, true);
    itemsBack.push({ wrap: part([fill(wrap, { gap: H * .008 }), W(wrap, { seed: 96, w: ink * .9 })], wrap), tail: part([fill(tail, { gap: H * .008, angle: 1.2 }), W(tail, { seed: 97, w: ink * .85 })], tail) });
  }

  // ── assemble, back to front ──
  const ARM = { R: drawArm('R'), L: drawArm('L') }, LEG = { R: drawLeg('R'), L: drawLeg('L') };
  const farFirst = legs.R.z < legs.L.z ? ['R', 'L'] : ['L', 'R'];
  if (back) { parts.push(...itemsFront.filter(() => false)); }
  parts.push(...backHair.filter(() => !back));
  parts.push(ARM[far].arm, ARM[far].hand); if (ARM[far].pencil) parts.push(ARM[far].pencil);
  parts.push(LEG[farFirst[0]], LEG[farFirst[1]]);
  if (back) for (const s of itemsBack) parts.push(s.tail);   // seen from behind, the scarf's tail hangs in front of the chest, hidden
  parts.push(neck, part(tOps, torso));
  if (!back) for (const s of itemsBack) parts.push(s.tail);
  const headOps = [W(headPoly.concat([headPoly[0]]), { seed: 1, w: ink, over: r * .03, amp: r * .012 }), ...earOps];
  parts.push(part(headOps, headPoly));
  if (back) parts.push(...backHair);
  if (!back) parts.push(...beardPart);   // seen from behind the beard is hidden by the head
  if (!back) parts.push(part([...faceFills, ...faceOps]));
  parts.push(...frontHair.filter(() => !back), ...itemsFront);
  for (const s of itemsBack) parts.push(s.wrap);
  parts.push(ARM[near].arm, ARM[near].hand); if (ARM[near].pencil) parts.push(ARM[near].pencil);
  return { parts, at, audit, near };
}

/** the pencil prop: hexagonal body, sharpened cone (wood), lead in the spot colour, ferrule and eraser — grip at `g`, pointing d */
export function pencil(g, d, L, ink = 2, H = 240) {
  const n = [-d[1], d[0]], w = L * .055, back = add(g, d, -L * .3), cone = add(g, d, L * .5), tip = add(g, d, L * .7), fer = add(back, d, L * .07);
  const P = (p, k) => [p[0] + n[0] * w * k, p[1] + n[1] * w * k];
  const W = (v, s, o = {}) => line(wob(v, L * .004, s, 0), { w: o.w ?? ink * .85, a: o.a ?? .9, passes: 1, col: o.col, seed: s });
  const body = [P(back, -1), P(cone, -1), tip, P(cone, 1), P(back, 1)];
  return part([
    W([P(back, -1), P(cone, -1)], 201), W([P(back, 1), P(cone, 1)], 202), W([P(back, 0), P(cone, 0)], 203, { w: ink * .4, a: .45 }),
    W([P(cone, -1), add(tip, d, -L * .06), P(cone, 1)], 204), fill([add(tip, d, -L * .07), [tip[0] + n[0] * w * .3 - d[0] * L * .07, tip[1] + n[1] * w * .3 - d[1] * L * .07], tip, [tip[0] - n[0] * w * .3 - d[0] * L * .07, tip[1] - n[1] * w * .3 - d[1] * L * .07]], { gap: w * .3, edge: false }),
    W([P(fer, -1), P(fer, 1)], 205, { w: ink * .7 }), W([P(back, -1), P(add(back, d, -L * .06), -1), P(add(back, d, -L * .06), 1), P(back, 1)], 206),
  ], [...body, P(add(back, d, -L * .06), 1), P(add(back, d, -L * .06), -1)]);
}

/** idle life: breathing and blinks on a seeded schedule (pure function of t) */
export function blinkAt(t, seed = 1) { const i = Math.floor(t / 3.1), t0 = i * 3.1 + hash(i, seed) * 2.2, k = (t - t0) / .16; return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; }
