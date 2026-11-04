// sketch-cartoon-short · rig.js — the cast: long-limbed cartoon people and four-legged companions, built from data, posed by
// angles, drawn with the pencil (sketch.js): misregistered flat colour, one shadow side, overshooting double lines, boiling.
//
//   const MAYA = { h: 620, skin: '#c99272', hair: { style: 'wild', col: '#24201d' }, top: { col: '#efe9d6', len: .45 },
//                  jacket: { col: '#cfe0a8', len: .52 }, pants: { col: '#8d8a4f', baggy: 1.5 }, shoes: { col: '#6b4a32' } };
//   const G = R.person(ctx, MAYA, { x: 960, y: 900, s: 1, face: 1, turn: .55, ...R.run(ph), expr: 'determined', wind: [-40, 0] });
//   G.hands.near → { x, y, ang } (stage px) — hold a prop there · G.feet → soles · G.head → { x, y, r } · G.box
//
// Angles (radians, screen space, + = toward the way the figure faces): spine / head lean; arms [shoulder, elbow] with 0 =
// hanging straight down, elbow + = forearm folds forward/up; legs [hip, knee] with 0 = straight down, knee − = shin folds
// back (the natural bend). `plant: true` (default) moves the figure so its lowest sole stands on y — feet never float or
// sink. Pose helpers (stand, walk, run, leap, crouch, reach, fall) return partial poses; blend() mixes two.
import * as S from './sketch.js';
const { TAU, clamp, lerp, tone, mix } = S;

// ── expressions: eyes open (0 closed … 1.4 wide), eye shape, brows [angle (+ angry, − worried), raise], mouth, blush ──
export const EXPR = {
  neutral: { open: 1, brow: [0, 0], mouth: 'line', mw: .8 },
  smile: { open: .92, brow: [.08, .06], mouth: 'smile', mw: 1 },
  grin: { open: .85, brow: [.12, .12], mouth: 'grin', mw: 1.25, blush: .5 },
  joy: { open: 0, eye: 'happy', brow: [-.1, .25], mouth: 'open', mw: 1.15, mo: .9, blush: .6 },
  shock: { open: 1.4, brow: [-.2, .45], mouth: 'o', mw: .55, mo: 1, pupil: .5 },
  scared: { open: 1.25, brow: [-.5, .3], mouth: 'wobble', mw: 1, mo: .5, pupil: .55 },
  determined: { open: .72, brow: [.5, -.08], mouth: 'flat', mw: .75 },
  sly: { open: .58, brow: [.32, -.04], mouth: 'smirk', mw: .9 },
  sad: { open: .78, brow: [-.45, .18], mouth: 'frown', mw: .7 },
  wink: { open: 1, wink: true, brow: [.1, .12], mouth: 'smile', mw: 1.05, blush: .3 },
  calm: { open: .5, brow: [0, 0], mouth: 'smile', mw: .55 },
  yell: { open: 1.05, brow: [.4, .1], mouth: 'open', mw: 1.1, mo: 1.1 },
  awe: { open: 1.2, brow: [-.15, .35], mouth: 'o', mw: .45, mo: .6, pupil: .8, blush: .3 },
};

const DEF = {
  h: 600, head: .078, legs: .5, torso: .25, neck: .035, shoulders: .2, hips: .15, arm: .4, foot: .1,
  skin: '#d6a585', eyes: { col: '#3c4a37', size: 1, lashes: false }, nose: 'tick', brows: '#2a2522',
  hair: { style: 'mop', col: '#2b2622', vol: 1, len: 1 },
  top: { col: '#e6e0cc', len: 1 }, jacket: null, pants: { col: '#7f7c52', baggy: 1, len: 1 }, shoes: { col: '#5e4630', boot: false },
  lw: 2.7, cheeks: '#d9837a',
};
const withDef = sp => ({ ...DEF, ...sp, eyes: { ...DEF.eyes, ...(sp.eyes || {}) }, hair: { ...DEF.hair, ...(sp.hair || {}) }, top: sp.top === null ? null : { ...DEF.top, ...(sp.top || {}) }, pants: { ...DEF.pants, ...(sp.pants || {}) }, shoes: { ...DEF.shoes, ...(sp.shoes || {}) } });

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const rotV = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const L2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ── what a body can do: joint ranges (radians, in the pose's own terms). person() reports a pose outside them to S.audit,
// which check.mjs fails on ("body: …"). Knees only fold back, elbows only fold forward, necks and spines turn so far. ──
export const LIM = {
  hip: [-1.3, 2.4],        // thigh: ~75° back … well past horizontal forward
  knee: [-2.7, .12],       // shin folds BACK only (a forward bend is a broken knee)
  shoulder: [-1.5, 3.35],  // arm: ~85° back … straight up overhead
  elbow: [-.12, 2.8],      // forearm folds FORWARD/up only
  wrist: [-1.3, 1.3], spine: [-.6, 1.15], head: [-.75, .75], neck: [-.6, .6],
};
function audit(who, joint, v, [a, b]) { if (v < a - 1e-6 || v > b + 1e-6) S.audit.push(`body: ${who} ${joint} out of range (${v < a ? 'below' : 'above'} ${v < a ? a : b})`); }

/** the solved skeleton in figure-local units (origin = the ground under the figure, y down) */
export function personGeom(spec, P = {}) {
  const sp = withDef(spec), h = sp.h, f = P.face || 1, turn = clamp(P.turn ?? .55), dir = a => [Math.sin(a) * f, Math.cos(a)], who = sp.name || 'person';
  const legL = h * sp.legs, thigh = legL * .49, shin = legL * .45, ankleH = legL * .06, R = h * sp.head;
  const torsoL = h * sp.torso, neckL = h * sp.neck, upper = h * sp.arm * .5, fore = h * sp.arm * .44, footL = h * sp.foot;
  const hip = P.hip || [0, 0], spn = (P.spine ?? 0), pelvis = [hip[0] * f, -legL + hip[1]];
  const chest = add(pelvis, rotV([0, -torsoL], spn * f));
  const spread = sp.shoulders * h / 2 * (1 - .7 * turn), hsp = sp.hips * h / 2 * (1 - .65 * turn) * .62;
  // Which side is near. A figure facing screen-right (face 1) and turned toward us shows its RIGHT side: that shoulder and hip
  // sit on the screen side BEHIND the way it faces (−f) and are drawn in front; the far ones sit on the facing side (+f),
  // half hidden by the chest. (Putting the near limbs on the facing side turns the body around under the head.)
  const sFr = add(chest, rotV([f * spread, torsoL * .04], spn * f)), sBk = add(chest, rotV([-f * spread, torsoL * .05], spn * f));
  const neckTop = add(chest, rotV([f * turn * R * .12, -neckL], (spn + (P.neck ?? 0)) * f));
  const hr = (spn * .35 + (P.head ?? 0)) * f, head = add(neckTop, rotV([0, -R * .92], hr));
  const hFr = add(pelvis, [f * hsp, 0]), hBk = add(pelvis, [-f * hsp, 0]);
  const splay = (1 - turn);                       // seen from the front, arms and legs hang a little outward
  const legs = {}, arms = {};
  for (const side of ['near', 'far']) {
    const out = side === 'near' ? -1 : 1;
    let [l1, l2] = (P.leg && P.leg[side]) || [side === 'near' ? .04 : -.03, -.04];
    audit(who, `${side} hip`, l1, LIM.hip); audit(who, `${side} knee`, l2, LIM.knee);
    l1 += out * splay * .04;
    const H = side === 'near' ? hBk : hFr, K = add(H, dir(l1), thigh), A = add(K, dir(l1 + l2), shin);
    const fa = P.foot && P.foot[side] != null ? P.foot[side] : clamp((l1 + l2) * .75, -1.25, .55);
    const heel = add(A, [0, ankleH]), toe = add(heel, [f * Math.cos(fa) * footL, -Math.sin(fa) * footL]);
    legs[side] = { H, K, A, heel, toe, fa };
    let [a1, a2] = (P.arm && P.arm[side]) || [side === 'near' ? .1 : -.08, .18];
    audit(who, `${side} shoulder`, a1, LIM.shoulder); audit(who, `${side} elbow`, a2, LIM.elbow); audit(who, `${side} wrist`, P.wrist?.[side] ?? 0, LIM.wrist);
    a1 += out * splay * .18;
    const Sh = side === 'near' ? sBk : sFr, E = add(Sh, dir(a1), upper), W = add(E, dir(a1 + a2), fore);
    arms[side] = { S: Sh, E, W, ang: a1 + a2 + (P.wrist?.[side] ?? 0) };
  }
  audit(who, 'spine', spn, LIM.spine); audit(who, 'head', P.head ?? 0, LIM.head); audit(who, 'neck', P.neck ?? 0, LIM.neck);
  // plant: the lowest sole stands on the ground line
  let dy = 0;
  if (P.plant !== false) { dy = -Math.max(legs.near.heel[1], legs.near.toe[1], legs.far.heel[1], legs.far.toe[1]); }
  const sh = p => [p[0], p[1] + dy];
  const J = { pelvis: sh(pelvis), chest: sh(chest), sFr: sh(sFr), sBk: sh(sBk), neckTop: sh(neckTop), head: sh(head), hFr: sh(hFr), hBk: sh(hBk) };
  for (const s of ['near', 'far']) { for (const k of ['H', 'K', 'A', 'heel', 'toe']) legs[s][k] = sh(legs[s][k]); for (const k of ['S', 'E', 'W']) arms[s][k] = sh(arms[s][k]); }
  // lean pivots on the lowest point of the soles, so a leaning figure keeps its foot on the ground
  const soles = [legs.near.heel, legs.near.toe, legs.far.heel, legs.far.toe], low = soles.reduce((a, b) => b[1] > a[1] ? b : a);
  return { sp, f, turn, R, hr, legs, arms, J, pivot: low[0], dims: { thigh, shin, upper, fore, footL, torsoL, ankleH, legL } };
}

/** local → stage (x, y, s, lean, squash) */
function toStage(P, pivot = 0) {
  const s = P.s ?? 1, f = P.face || 1, a = (P.lean ?? 0) * f, sq = P.squash ?? 1, c = Math.cos(a), sn = Math.sin(a), x = P.x ?? 0, y = P.y ?? 0, pv = pivot / Math.sqrt(sq);
  return p => { const px = p[0] / Math.sqrt(sq) - pv, py = p[1] * sq; return [x + s * (pv + px * c - py * sn), y + s * (px * sn + py * c)]; };
}

// ── drawing helpers ──
/** a tapered tube along a joint chain: widths ws at each joint. Returns the two sides. */
function tube(ctx, pts, ws, col, o = {}) {
  const C = S.curve(pts, 4), n = C.length, segL = [0]; for (let i = 1; i < pts.length; i++) segL.push(segL[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = segL[segL.length - 1] || 1, cl = [0]; for (let i = 1; i < n; i++) cl.push(cl[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
  const wAt = u => { const d = u * tot; for (let i = 1; i < segL.length; i++) if (d <= segL[i] || i === segL.length - 1) return lerp(ws[i - 1], ws[i], clamp((d - segL[i - 1]) / (segL[i] - segL[i - 1] || 1))); return ws[ws.length - 1]; };
  const A = [], B = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, w = wAt(cl[i] / (cl[n - 1] || 1)) / 2;
    A.push([C[i][0] + nx * w, C[i][1] + ny * w]); B.push([C[i][0] - nx * w, C[i][1] - ny * w]);
  }
  const poly = [...A, ...B.slice().reverse()], wm = (ws[0] + ws[ws.length - 1]) / 2;
  if (col) { S.fill(ctx, poly, col, { tex: o.tex ?? .5, smooth: false }); if (o.shade !== false) S.shadeSide(ctx, poly, tone(col, -.24), -wm * .32, -wm * .22); }
  if (o.line !== false) { S.line(ctx, A, { w: o.w, over: o.over ?? 5 }); S.line(ctx, B, { w: o.w, over: o.over ?? 5 }); if (o.cap) S.line(ctx, [A[n - 1], C[n - 1], B[n - 1]], { w: o.w * .8, over: 2 }); }
  return { A, B, C, poly };
}
/** a hand at the wrist pointing along ang (0 = down); grip 'open' | 'fist' | 'hold' */
function hand(ctx, W, ang, L, skin, f, grip, w) {
  const d = [Math.sin(ang) * f, Math.cos(ang)], c = add(W, d, L * .45), rx = L * (grip === 'open' ? .36 : .4), ry = L * (grip === 'open' ? .52 : .4);
  const pts = S.ellipse(0, 0, rx, ry, 14).map(p => add(c, rotV(p, -Math.atan2(d[0], d[1]))));
  S.shape(ctx, pts, { fill: skin, w: w * .8 });
  const th = add(c, rotV([f * rx * .9, -ry * .2], -Math.atan2(d[0], d[1])));   // thumb
  S.line(ctx, [add(th, rotV([0, -ry * .4], -Math.atan2(d[0], d[1]))), add(th, rotV([f * rx * .5, ry * .1], -Math.atan2(d[0], d[1])))], { w: w * .75, over: 2 });
  if (grip === 'open') S.strokes(ctx, [0, 1].map(i => [add(c, rotV([(i - .5) * rx * .7, ry * .3], -Math.atan2(d[0], d[1]))), add(c, rotV([(i - .5) * rx * .8, ry * .95], -Math.atan2(d[0], d[1])))]), { w: w * .7 });
  return { x: c[0], y: c[1] };
}
function shoe(ctx, Lg, sp, f, w) {
  const { heel, toe } = Lg, L = Math.hypot(toe[0] - heel[0], toe[1] - heel[1]) * (sp.shoes.size ?? 1), u = [(toe[0] - heel[0]) / L, (toe[1] - heel[1]) / L], v = [u[1] * f, -u[0] * f];   // u along the foot, v up out of the sole
  const P = (x, y) => [heel[0] + u[0] * x * L + v[0] * y * L, heel[1] + u[1] * x * L + v[1] * y * L], ht = sp.shoes.boot ? .72 : .42;
  const pts = [P(-.18, 0), P(.55, -.02), P(1.08, 0), P(1.16, .2), P(1.02, .36), P(.6, .4), P(.3, ht), P(-.14, ht + .02), P(-.24, .3)];
  S.shape(ctx, pts, { fill: sp.shoes.col, shade: true, w, light: [-L * .12, -L * .1] });
  S.line(ctx, [P(-.16, .07), P(.6, .05), P(1.1, .08)], { w: w * .7, over: 3, passes: 1 });   // sole
  if (sp.shoes.boot) S.line(ctx, [P(.25, ht * .7), P(.55, .42)], { w: w * .6, over: 2, passes: 1 });
}
// ── face ──
function face(ctx, sp, G, P, w) {
  const R = G.R, f = G.f, turn = G.turn, E = { ...EXPR.neutral, ...(EXPR[P.expr] || EXPR[sp.expr] || {}), ...(P.face2 || {}) };
  const fx = f * turn * R * .34, ey = R * .1, sep = R * .36 * (1 - .4 * turn), sz = sp.eyes.size;
  const open = (E.open) * (1 - clamp(P.blink ?? 0)), look = P.look || [0, 0];
  for (const side of ['far', 'near']) {
    const k = side === 'near' ? -1 : 1, ex = fx + f * k * sep * (side === 'far' ? 1 - .2 * turn : 1), ew = R * .19 * sz * (side === 'far' ? 1 - .38 * turn : 1), eh = R * .25 * sz;   // near eye: the one away from the way the face points
    const wink = E.wink && side === 'near';
    if (E.eye === 'happy' || wink || open < .12) { S.line(ctx, S.arc(ex, ey + eh * .1, ew, eh * .55, Math.PI * 1.1, Math.PI * 1.9, 8).map(p => E.eye === 'happy' ? p : [p[0], ey + (ey - p[1]) * .25 + eh * .1]), { w: w * 1.15, over: 2 }); }
    else {
      const oh = eh * Math.min(1.45, open), pts = S.ellipse(ex, ey, ew, oh, 16);
      S.fill(ctx, pts, '#f1ecdc', { off: [0, 0], wob: .6 });
      const ir = Math.min(ew, oh) * (E.pupil ?? .78), ix = ex + look[0] * ew * .35 + f * turn * ew * .18, iy = ey + look[1] * oh * .3 + oh * .08;
      ctx.save(); S.trace(ctx, pts, true); ctx.clip();
      S.fill(ctx, S.ellipse(ix, iy, ir * .82, ir, 12), sp.eyes.col, { off: [0, 0], wob: .4 });
      S.fill(ctx, S.ellipse(ix, iy + ir * .05, ir * .45, ir * .55, 10), '#1b1a18', { off: [0, 0], wob: .3 });
      S.fill(ctx, S.ellipse(ix - ir * .3, iy - ir * .35, ir * .2, ir * .2, 8), '#fbf7ea', { off: [0, 0], wob: .2 });
      ctx.restore();
      S.line(ctx, S.arc(ex, ey, ew * 1.05, oh, Math.PI * 1.05, Math.PI * 1.95, 9), { w: w * 1.3, over: 3 });              // upper lid, heavy
      S.line(ctx, S.arc(ex, ey, ew * .9, oh * .95, Math.PI * .2, Math.PI * .8, 6), { w: w * .55, over: 1, passes: 1, a: .6 });
      if (sp.eyes.lashes) S.line(ctx, [[ex + f * k * ew * .95, ey - oh * .55], [ex + f * k * ew * 1.35, ey - oh * .85]], { w: w * .8, over: 1, passes: 1 });
    }
    const [ba, br] = E.brow, by = ey - eh * 1.25 - R * br * .4, bx = ex, bl = ew * 1.1, inner = -f * k;   // inner end points to the nose
    S.line(ctx, [[bx - inner * bl * .9, by - bl * ba * -.15], [bx + inner * bl * .9, by + bl * ba * .5]], { w: w * 1.1, col: sp.brows, over: 2 });
  }
  // nose
  const nx = fx + f * R * .1 * (1 + turn), ny = R * .38;
  if (sp.nose === 'long') S.line(ctx, [[nx - f * R * .02, ey], [nx + f * R * .2 * turn + f * R * .06, ny], [nx - f * R * .02, ny + R * .06]], { w: w * .8, over: 2, passes: 1 });
  else S.line(ctx, [[nx + f * R * .04, ny - R * .08], [nx + f * R * .08, ny], [nx - f * R * .02, ny + R * .04]], { w: w * .8, over: 1, passes: 1 });
  // mouth
  const mx = fx + f * R * .06, my = R * .6, mw = R * .22 * (E.mw ?? 1), mo = (E.mo ?? 0) * R * .2 * (P.talk != null ? .3 + .7 * P.talk : 1);
  const m = E.mouth;
  if (m === 'smile') S.line(ctx, S.arc(mx, my - mw * .5, mw, mw * .55, Math.PI * .15, Math.PI * .85, 8), { w: w * .95, over: 2 });
  else if (m === 'smirk') S.line(ctx, [[mx - mw * .8, my], [mx + f * mw * .2, my + mw * .05], [mx + f * mw * .9, my - mw * .3]], { w: w * .95, over: 2 });
  else if (m === 'frown') S.line(ctx, S.arc(mx, my + mw * .45, mw * .8, mw * .4, Math.PI * 1.15, Math.PI * 1.85, 8), { w: w * .9, over: 2 });
  else if (m === 'flat') S.line(ctx, [[mx - mw * .8, my], [mx + mw * .8, my + mw * .06]], { w: w * .9, over: 2 });
  else if (m === 'wobble') S.line(ctx, Array.from({ length: 7 }, (_, i) => [mx - mw + i * mw / 3, my + Math.sin(i * 2.2) * mw * .12]), { w: w * .9, over: 1, smooth: true });
  else if (m === 'o' || m === 'open' || m === 'grin') {
    const pts = m === 'o' ? S.ellipse(mx, my + mo * .3, mw * .7, mo * .7 + R * .05, 12)
      : m === 'grin' ? [...S.arc(mx, my - mw * .2, mw, mw * .75, 0, Math.PI, 10)]
        : [...S.arc(mx, my - mo * .1, mw, mo + R * .05, 0, Math.PI, 10), [mx + mw, my - mo * .1]];
    S.shape(ctx, pts, { fill: m === 'grin' ? '#f1ecdc' : '#4a2a26', w: w * .9 });
    if (m === 'open') S.fill(ctx, S.ellipse(mx, my + mo * .55, mw * .45, mo * .32, 10), '#c8665c', { off: [0, 0] });
  } else S.line(ctx, [[mx - mw * .7, my], [mx + mw * .7, my]], { w: w * .85, over: 2 });
  if (E.blush || sp.blush) { ctx.save(); ctx.globalAlpha = (E.blush || sp.blush) * .35; for (const k of [-1, 1]) S.fill(ctx, S.ellipse(fx + f * k * sep * 1.15, R * .42, R * .16, R * .08, 10), sp.cheeks, { off: [0, 0] }); ctx.restore(); }
  // ear on the back side of the head
  if (turn > .25) { const ex = fx - f * R * .78, eyy = R * .2; S.shape(ctx, S.ellipse(ex, eyy, R * .12, R * .2, 10), { fill: sp.skin, w: w * .8 }); }
}

// ── hair: locks (tapered, curling, falling, blowing) around the head; head-local coordinates ──
function lockPath(root, ang, len, wd, curl, wind, seed, flow, grav = 1) {
  let d = [Math.cos(ang), Math.sin(ang) + grav * .35], p = root.slice(); const C = [p.slice()], N = 7;
  { const l = Math.hypot(d[0], d[1]); d = [d[0] / l, d[1] / l]; }
  for (let i = 1; i <= N; i++) {
    const u = i / N, wv = [wind[0] * u * .012 + S.n1(flow * 1.7 + seed, seed) * .08 * u, wind[1] * u * .012 + grav * .5 * u];
    d = [d[0] + wv[0], d[1] + wv[1]]; const l = Math.hypot(d[0], d[1]); d = [d[0] / l, d[1] / l];
    const c = Math.sin(u * 5 + seed) * curl * wd * .6;
    p = add(p, d, len / N); C.push([p[0] - d[1] * c, p[1] + d[0] * c]);
  }
  return C;
}
function drawLock(ctx, C, wd, col, w) {
  const n = C.length, A = [], B = [];
  for (let i = 0; i < n; i++) { const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, u = i / (n - 1), ww = wd * (u < .25 ? .75 + u : 1.0 - (u - .25) / .75 * .98) / 2; A.push([C[i][0] + nx * ww, C[i][1] + ny * ww]); B.push([C[i][0] - nx * ww, C[i][1] - ny * ww]); }
  const poly = [...A, ...B.reverse()];
  S.fill(ctx, S.curve(poly, 3, true), col, { off: [1.5, 1], wob: .8, smooth: false });
  S.line(ctx, A.slice(1), { w, over: 3 }); S.line(ctx, B.slice(0, -1), { w: w * .8, over: 3, passes: 1 });
}
function hairLocks(sp, R, f, turn, P) {
  const H = sp.hair, st = H.style, vol = H.vol ?? 1, ln = H.len ?? 1, back = [], front = [], r = S.rng(H.seed || 5);
  const pushRing = (arr, n, a0, a1, rr, len, wd, curl, out = 1) => {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? .5 : i / (n - 1), a = lerp(a0, a1, u) + (r() - .5) * .15, root = [Math.cos(a) * R * rr, Math.sin(a) * R * rr];
      const facing = Math.max(0, Math.cos(a) * f);   // locks on the face side get shorter as the head turns to profile
      arr.push({ grav: arr.grav ?? 1, root, ang: a + (out - 1) * .5, len: len * (.75 + r() * .5) * (1 - turn * .75 * facing), wd: wd * (.8 + r() * .4), curl: curl * (r() < .5 ? -1 : 1), seed: i * 7.3 + r() * 10 });
    }
  };
  let hull = null;
  if (st === 'wild') {
    back.grav = 1.3; pushRing(back, 15, -Math.PI / 2 - Math.PI * .8, -Math.PI / 2 + Math.PI * .8, .8, R * 3.4 * ln, R * 1.05 * vol, .9);
    back.grav = 1.6; pushRing(back, 7, -Math.PI / 2 - 1.2, -Math.PI / 2 + 1.0, .9, R * 1.6 * vol, R * .9 * vol, .6);
    front.grav = .8; pushRing(front, 3, -Math.PI / 2 - .3 - f * .25, -Math.PI / 2 + .8 - f * .25, .85, R * 1.25, R * .55, .5, 1.5);
    const bx = -f * R * .25 * turn;
    hull = wd => [[bx - R * 1.25 * vol, -R * .5], [bx - R * .85 * vol, -R * 1.15], [bx, -R * 1.22 * vol], [bx + R * .9 * vol, -R * 1.1], [bx + R * 1.3 * vol, -R * .3], [bx + R * 1.35 * vol + wd[0] * .2, R * 1.6 * ln], [bx + R * .6 + wd[0] * .35, R * 2.7 * ln], [bx - R * .7 + wd[0] * .35, R * 2.8 * ln], [bx - R * 1.4 * vol + wd[0] * .2, R * 1.5 * ln]];
  } else if (st === 'bob') {
    back.grav = 1.4; pushRing(back, 12, -Math.PI / 2 - Math.PI * .75, -Math.PI / 2 + Math.PI * .75, .85, R * 1.55 * ln, R * .9 * vol, .15);
    hull = () => S.ellipse(0, R * .15, R * 1.2 * vol, R * 1.3, 18);
    pushRing(front, 5, -Math.PI / 2 - .8, -Math.PI / 2 + .8, .9, R * .75, R * .45, .1, 2.1);
  } else if (st === 'tied') {
    back.grav = 1.2; pushRing(back, 1, -Math.PI / 2 - f * 2.2, -Math.PI / 2 - f * 2.2, .95, R * 2.6 * ln, R * .7 * vol, .9);
    pushRing(front, 3, -Math.PI / 2 - .6, -Math.PI / 2 + .6, .92, R * .55, R * .38, .2, 1.9);
  } else if (st === 'spiky') {
    back.grav = .15; pushRing(back, 9, -Math.PI / 2 - 1.9, -Math.PI / 2 + 1.9, .85, R * .95 * ln, R * .55 * vol, .2, .55);
    pushRing(front, 4, -Math.PI / 2 - .7, -Math.PI / 2 + .7, .9, R * .7, R * .4, .2, 1.4);
  } else if (st === 'bun') {
    pushRing(front, 3, -Math.PI / 2 - .5, -Math.PI / 2 + .5, .92, R * .5, R * .35, .2, 1.9);
  } else if (st === 'buzz') {
    // crown only
  } else {   // mop: a short messy mass
    back.grav = .5; pushRing(back, 11, -Math.PI / 2 - 1.75, -Math.PI / 2 + 1.75, .85, R * .75 * ln, R * .62 * vol, .5, .7);
    pushRing(front, 4, -Math.PI / 2 - .75, -Math.PI / 2 + .6, .9, R * .62, R * .42, .4, 1.8);
  }
  return { back, front, hull };
}

/**
 * person(ctx, spec, pose) — draw one person; returns G (stage coordinates): { feet: [{x, y}…], hands: { near, far } ({ x, y, ang }),
 * head: { x, y, r }, box: { x0, y0, x1, y1 }, ground }. Pose fields: see the header + { x, y, s, face, turn, lean, squash, hip,
 * spine, neck, head, arm: { near, far }, leg: { near, far }, foot, wrist, plant, expr, look, blink, talk, wind [x, y] (hair and
 * jacket blow toward +x/+y), flow (a time for the flutter, usually lt), grip: { near, far }, farFront (far arm drawn in front),
 * lw (line weight, stage px) }
 */
export function person(ctx, spec, P = {}) {
  const G = personGeom(spec, P), sp = G.sp, f = G.f, R = G.R, { legs, arms, J, dims } = G, s = P.s ?? 1;
  const w = (P.lw ?? sp.lw) / Math.pow(s, .45), wind = P.wind || [0, 0], flow = P.flow ?? 0;
  const ST = toStage(P, G.pivot), sq = P.squash ?? 1, pvs = G.pivot * s / Math.sqrt(sq);
  ctx.save(); ctx.translate((P.x ?? 0) + pvs, P.y ?? 0); ctx.rotate((P.lean ?? 0) * f); ctx.translate(-pvs, 0); ctx.scale(s / Math.sqrt(sq), s * sq);
  const hairL = hairLocks(sp, R, f, G.turn, P), hcol = sp.hair.col, headPts = headShape(R, f, G.turn);
  const inHead = fn => { ctx.save(); ctx.translate(J.head[0], J.head[1]); ctx.rotate(G.hr); fn(); ctx.restore(); };
  const windL = rotV(wind, -G.hr);
  // 1 back hair
  inHead(() => { if (hairL.hull) S.shape(ctx, hairL.hull(windL), { fill: hcol, w: w * .85, tex: .4 }); for (const L of hairL.back) drawLock(ctx, lockPath(L.root, L.ang, L.len, L.wd, L.curl, windL, L.seed, flow, L.grav), L.wd, hcol, w * .85); });
  if (sp.hair.style === 'bun') inHead(() => S.shape(ctx, S.ellipse(-f * R * .25, -R * 1.05, R * .42, R * .38, 14), { fill: hcol, w }));
  const sleeve = sp.jacket ? sp.jacket.col : sp.top ? (sp.top.sleeves === false ? null : sp.top.col) : null;
  const armW = R * (sp.jacket ? .58 : .42) * (sp.sleeveW ?? 1);
  const drawArm = side => {
    const A = arms[side];
    tube(ctx, [A.S, A.E, A.W], [armW * 1.05, armW * .92, armW * (sp.jacket ? 1 : .7)], sleeve || sp.skin, { w });
    const grip = (P.grip && P.grip[side]) || 'open', hp = hand(ctx, A.W, A.ang, R * .62, sp.skin, f, grip, w);
    A.hand = { x: hp.x, y: hp.y };
  };
  const drawLeg = side => {
    const Lg = legs[side], pw = R * .78 * (sp.pants.baggy ?? 1);
    if (sp.pants.skirt) { tube(ctx, [Lg.H, Lg.K, Lg.A], [R * .36, R * .3, R * .24], sp.skin, { w }); }
    else tube(ctx, [add(Lg.H, [0, -dims.thigh * .1]), Lg.K, add(Lg.A, [0, dims.ankleH * .3])], [pw * 1.05, pw * .9, pw * (sp.pants.baggy > 1.2 ? 1.05 : .7)], sp.pants.col, { w, cap: true });
    // knee folds on baggy trousers
    if (!sp.pants.skirt && (sp.pants.baggy ?? 1) > 1.1) S.strokes(ctx, [0, 1].map(i => { const c = L2(Lg.K, Lg.A, .3 + i * .25); return [add(c, [-pw * .3, -pw * .1]), add(c, [pw * .05, pw * .08]), add(c, [pw * .28, -pw * .05])]; }), { w: w * .8 });
    shoe(ctx, Lg, sp, f, w);
  };
  // 2 far arm (behind), far leg
  if (!P.farFront) drawArm('far');
  drawLeg('far');
  const jk = sp.jacket, jl = jk ? (jk.len ?? .5) * sp.h * .5 : 0, flap = [wind[0] * .25 + S.n1(flow * 3, 3) * R * .1, wind[1] * .1];
  // 3 torso (skin under, top over). Front = the side the figure faces (+f): the chest swells there, the back is flatter.
  const wFr = add(J.pelvis, rotV([f * sp.hips * sp.h * .45 * (1 - .45 * G.turn), -R * .2], (P.spine ?? 0) * f)), wBk = add(J.pelvis, rotV([-f * sp.hips * sp.h * .42 * (1 - .55 * G.turn), -R * .2], (P.spine ?? 0) * f));
  const torso = [J.sBk, add(L2(J.sBk, J.sFr, .5), [0, -R * .12]), J.sFr, add(L2(J.sFr, wFr, .45), [f * R * .12, 0]), wFr, wBk, add(L2(J.sBk, wBk, .5), [-f * R * .06, 0])];
  S.shape(ctx, torso, { fill: sp.skin, shade: true, w });
  if (sp.top) {
    const k = clamp(sp.top.len ?? 1), bFr = L2(J.sFr, wFr, k), bBk = L2(J.sBk, wBk, k);
    S.shape(ctx, [J.sBk, add(L2(J.sBk, J.sFr, .5), [0, -R * .14]), J.sFr, add(L2(J.sFr, bFr, .5), [f * R * .1, 0]), add(bFr, [0, R * .05]), add(L2(bFr, bBk, .5), [0, R * .12]), add(bBk, [0, R * .05])], { fill: sp.top.col, shade: true, w });
  }
  // 4 pants block (hips) + near leg
  if (!sp.pants.skirt) S.shape(ctx, [add(wBk, [0, -R * .05]), add(wFr, [0, -R * .05]), add(J.hFr, [f * R * .35, R * .5]), add(J.pelvis, [0, R * 1.1]), add(J.hBk, [-f * R * .3, R * .45])], { fill: sp.pants.col, w, shade: false, line: false });
  else S.shape(ctx, [add(wBk, [0, -R * .05]), add(wFr, [0, -R * .05]), add(J.hFr, [f * R * 1.1 + flap[0] * .3, dims.thigh * .8]), add(J.hBk, [-f * R * 1.0 + flap[0] * .3, dims.thigh * .85])], { fill: sp.pants.col, w, shade: true, tex: .6 });
  drawLeg('near');
  if (!sp.pants.skirt) S.line(ctx, [add(wBk, [0, R * .05]), add(wFr, [0, R * .05])], { w: w * .8, over: 4, passes: 1 });   // waistband
  // 5 open coat: two fronts that meet the centre-front line, which moves toward the facing side as the figure turns. The
  //   near front covers the near half (and the whole side in profile); the far front narrows to a strip; the shirt shows
  //   between them — on the chest, never at the back.
  if (jk) {
    const cf = .5 + .45 * G.turn, gap = R * .24 * (1 - .6 * G.turn);
    const hemBk = add(L2(J.sBk, wBk, 1.05), [-f * R * .35, jl * .55]), hemFr = add(L2(J.sFr, wFr, 1.05), [f * R * .3, jl * .55]);
    const cfT = add(L2(J.sBk, J.sFr, cf), [0, R * .55]), cfB = L2(hemBk, hemFr, cf), nk = add(J.neckTop, [0, R * .3]);
    S.shape(ctx, [add(nk, [f * R * .15, -R * .05]), add(J.sFr, [f * R * .2, -R * .05]), add(hemFr, flap), add(add(cfB, [f * gap, 0]), flap), add(cfT, [f * gap * .7, 0])], { fill: tone(jk.col, -.04), shade: true, w, tex: .5, sharp: true });
    S.shape(ctx, [add(nk, [-f * R * .2, -R * .05]), add(J.sBk, [-f * R * .25, -R * .05]), add(hemBk, flap), add(add(cfB, [-f * gap, 0]), flap), add(cfT, [-f * gap * .7, 0])], { fill: jk.col, shade: true, w, tex: .5, sharp: true });
    S.line(ctx, [add(nk, [-f * R * .2, -R * .05]), add(cfT, [-f * gap * .7, -R * .1]), add(J.sBk, [f * R * .05, R * .35])], { w: w * .8, over: 3, passes: 1 });   // lapel
  }
  // 7 neck, head, face, hair crown and fringe
  tube(ctx, [add(J.chest, [f * G.turn * R * .1, R * .05]), J.neckTop, add(J.head, [0, R * .5])], [R * .34, R * .32, R * .3], sp.skin, { w, shade: false });
  inHead(() => {
    S.shape(ctx, headPts, { fill: sp.skin, shade: tone(sp.skin, -.18), w, light: [-R * .28, -R * .18] });
    face(ctx, sp, G, P, w);
    if (sp.hair.style !== 'none') {
      const top = crownShape(R, f, G.turn, sp.hair.style);
      S.shape(ctx, top, { fill: hcol, w, tex: .4, light: [-R * .2, -R * .2], shade: tone(hcol, .12) });
      for (const L of hairL.front) drawLock(ctx, lockPath(L.root, L.ang, L.len, L.wd, L.curl, windL, L.seed, flow, L.grav), L.wd, hcol, w * .85);
      if (sp.hair.style === 'wild' || sp.hair.style === 'mop') S.strokes(ctx, [0, 1, 2].map(i => S.arc(f * R * .1, -R * .15, R * (.5 + i * .18), R * (.55 + i * .15), Math.PI * 1.15 + i * .1, Math.PI * 1.6 + i * .1, 5)), { w: w * .6, col: tone(hcol, .35), a: .5 });
    }
    if (sp.glasses) for (const k of [-1, 1]) S.loop(ctx, S.ellipse(f * G.turn * R * .34 + f * k * R * .36 * (1 - .4 * G.turn), R * .1, R * .26 * (k > 0 ? 1 - .35 * G.turn : 1), R * .24, 14), { w: w * .9, col: sp.glasses });
  });
  // 8 near arm in front
  if (P.farFront) drawArm('far');
  drawArm('near');
  ctx.restore();
  // geometry in stage coordinates
  const pts = [legs.near.heel, legs.near.toe, legs.far.heel, legs.far.toe].map(ST), hd = ST(J.head);
  const handOut = side => { const A = arms[side], hp = ST(A.hand ? [A.hand.x, A.hand.y] : A.W); return { x: hp[0], y: hp[1], ang: A.ang, wrist: ST(A.W) }; };
  const all = [...pts, hd, ST(J.sFr), ST(J.sBk), ST(arms.near.W), ST(arms.far.W)];
  const bx = S.bbox(all);
  return { feet: pts.map(p => ({ x: p[0], y: p[1] })), ground: Math.max(...pts.map(p => p[1])), hands: { near: handOut('near'), far: handOut('far') }, head: { x: hd[0], y: hd[1], r: R * s }, box: { x0: bx[0], y0: hd[1] - R * s * 1.4, x1: bx[2], y1: bx[3] }, chest: ST(J.chest), pelvis: ST(J.pelvis) };
}
function headShape(R, f, turn) {
  const p = [];
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + i / 26 * TAU, c = Math.cos(a), s = Math.sin(a);
    let x = c * R * .86, y = s * R * (s > 0 ? 1.08 : 1);
    if (s > 0) { x *= 1 - .38 * s * s; x += f * turn * R * .16 * s * s; }    // jaw narrows to a chin that points the way the head faces
    p.push([x, y]);
  }
  return p;
}
function crownShape(R, f, turn, st) {
  const p = [], low = st === 'buzz' ? .05 : st === 'bob' ? .3 : .12;
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (1 - low) + i / 14 * Math.PI * (1 + 2 * low); p.push([Math.cos(a) * R * 1.03 - f * R * .02, Math.sin(a) * R * 1.05 - R * .04]); }
  // hairline across the forehead, the part pushed to the face side
  const px = f * turn * R * .2 + f * R * .15;
  p.push([R * .78, -R * .05], [R * .62, -R * .3], [px + R * .22, -R * .42], [px, -R * .5], [px - R * .3, -R * .4], [-R * .62, -R * .3], [-R * .8, -R * .05]);
  return p;
}

// ── pose helpers (partial poses; spread them into a pose) ──
const sn = Math.sin, cs = Math.cos;
/** standing: a slight contrapposto and breath; t = time (it breathes on twos) */
export const stand = (t = 0, o = {}) => ({ spine: .02 + sn(Math.floor(t * 12) / 12 * 1.6) * .012, head: o.head ?? 0, leg: { near: [.06, -.03], far: [-.05, -.02] }, arm: { near: [.12, .2], far: [-.1, .16] } });
/** walking cycle, ph 0…1 per two steps */
export function walk(ph, o = {}) {
  const a = ph * TAU, A = o.stride ?? .42, k = n => -.08 - .75 * Math.max(0, cs(n)) ** 1.4;
  return { spine: .06, head: -.04, leg: { near: [A * sn(a), k(a)], far: [A * sn(a + Math.PI), k(a + Math.PI)] }, arm: { near: [-A * .9 * sn(a), .3], far: [-A * .9 * sn(a + Math.PI), .3] }, hip: [0, -Math.abs(cs(a)) * 6] };
}
/** running cycle (big cartoon stride), ph 0…1 per two steps */
export function run(ph, o = {}) {
  const a = ph * TAU, A = o.stride ?? .85, k = n => -.18 - 1.55 * Math.max(0, cs(n + .35)) ** 1.15;
  return { spine: o.lean ?? .3, head: -.18, leg: { near: [A * sn(a), k(a)], far: [A * sn(a + Math.PI), k(a + Math.PI)] }, arm: { near: [-1.0 * sn(a), 1.5], far: [-1.0 * sn(a + Math.PI), 1.5] }, grip: { near: 'fist', far: 'fist' } };
}
/** a jump in three beats: k 0….25 crouch, .25….42 push, .42…1 in the air (spread, tuck to land at 1). plant only in the crouch. */
export function leap(k) {
  if (k < .25) { const u = S.ease.out(k / .25); return { spine: .5 * u, head: -.2 * u, leg: { near: [.9 * u + .05, -1.7 * u], far: [.8 * u, -1.55 * u] }, arm: { near: [-1.1 * u, .6], far: [-1.2 * u, .5] }, grip: { near: 'fist', far: 'fist' } }; }
  if (k < .42) { const u = S.ease.out((k - .25) / .17); return { spine: lerp(.5, .15, u), head: lerp(-.2, -.3, u), leg: { near: [lerp(.95, -.2, u), lerp(-1.7, -.1, u)], far: [lerp(.8, -.35, u), lerp(-1.55, -.3, u)] }, arm: { near: [lerp(-1.1, 2.6, u), .3], far: [lerp(-1.2, 2.3, u), .3] }, plant: true }; }
  const u = S.ease.sine((k - .42) / .58);
  return { spine: lerp(.15, .2, u), head: -.2, leg: { near: [lerp(1.1, .5, u), lerp(-1.2, -.6, u)], far: [lerp(-.7, .2, u), lerp(-.9, -.6, u)] }, arm: { near: [lerp(2.0, 1.3, u), .2], far: [lerp(-1.3, -.6, u), .4] }, plant: false };
}
export const crouch = (k = 1) => ({ spine: .45 * k, head: -.25 * k, leg: { near: [1.0 * k + .05, -1.9 * k], far: [.75 * k, -1.7 * k] }, arm: { near: [.6 * k, .9 * k], far: [.4 * k, 1.1 * k] } });
/** arm reaching: angle a (0 down, π/2 forward, π up) */
export const reach = (a, side = 'near') => ({ arm: { [side]: [a, .08] }, grip: { [side]: 'open' } });
/** falling / floating: arms up, legs dangling, plant false */
export const fall = (t = 0) => ({ spine: -.1, head: .15, leg: { near: [.25 + sn(t * 9) * .1, -.5], far: [-.1 + sn(t * 9 + 2) * .1, -.35] }, arm: { near: [2.7, .2], far: [2.4, .3] }, plant: false });
/** mix two poses (numbers and [a, b] pairs, nested), k 0 → a, 1 → b */
export function blend(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, k);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i] ?? v, k));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = { ...a, ...b }; for (const key in o) if (key in a && key in b) o[key] = blend(a[key], b[key], k); else o[key] = k < .5 ? (a[key] ?? b[key]) : (b[key] ?? a[key]); return o; }
  return k < .5 ? (a ?? b) : (b ?? a);
}
/** merge poses (later wins; arm/leg/grip merged per side) */
export function pose(...ps) {
  const o = {};
  for (const p of ps) for (const k in p) o[k] = (k === 'arm' || k === 'leg' || k === 'grip' || k === 'foot' || k === 'wrist') ? { ...(o[k] || {}), ...p[k] } : p[k];
  return o;
}

// ── companions: four-legged critters (dog, cat, fox, goat, rabbit-thing …) ──
const CDEF = { len: 190, h: 150, col: '#b9a5a8', belly: null, ear: { style: 'long', len: 1, w: 1 }, tail: { len: 1, style: 'thin' }, snout: .5, eye: '#1f1d1b', lw: 2.4, head: 1, legs: 1 };
/**
 * critter(ctx, spec, pose) — pose: { x, y (ground), s, face, gait: 'stand' | 'sit' | 'run' | 'walk' | 'leap' | 'crouch', ph (cycle),
 * k (leap progress 0…1), look [x, y], expr: 'calm' | 'alarm' | 'happy' | 'sleep', ears (0…1 how far they stream back), wind, flow, plant }
 * Returns { head: { x, y, r }, back: { x, y } (a point on its back to ride / land on), box, ground }.
 */
export function critter(ctx, spec, P = {}) {
  const sp = { ...CDEF, ...spec, ear: { ...CDEF.ear, ...(spec.ear || {}) }, tail: { ...CDEF.tail, ...(spec.tail || {}) } };
  const f = P.face || 1, s = P.s ?? 1, w = sp.lw / Math.pow(s, .45), gait = P.gait || 'stand', ph = (P.ph ?? 0) * TAU, L = sp.len, H = sp.h, legL = H * .5 * sp.legs;
  const dir = a => [Math.sin(a) * f, Math.cos(a)];
  let body = 0, bob = 0, stretch = 1, legs, headUp = 0;
  if (gait === 'run' || gait === 'leap') {   // gallop: front and back pairs swing together, the body stretches and bunches
    const g = gait === 'leap' ? (P.k ?? .5) * Math.PI * 1.6 - .8 : ph;
    stretch = 1 + .18 * sn(g); body = -.12 * cs(g); bob = -Math.max(0, sn(g)) * H * .12;
    // front legs: the lower leg (wrist → paw) folds BACK as it lifts; hind legs: the lower leg (hock → paw) folds FORWARD
    legs = { fN: [.9 * sn(g) + .3, -(.15 + .9 * Math.max(0, cs(g)))], fF: [.9 * sn(g + .5) + .3, -(.15 + .9 * Math.max(0, cs(g + .5)))], bN: [-.9 * sn(g) - .2, .15 + .8 * Math.max(0, -cs(g))], bF: [-.9 * sn(g + .5) - .2, .15 + .8 * Math.max(0, -cs(g + .5))] };
  } else if (gait === 'walk') {
    legs = { fN: [.35 * sn(ph), -.35 * Math.max(0, cs(ph))], fF: [.35 * sn(ph + Math.PI), -.35 * Math.max(0, cs(ph + Math.PI))], bN: [.35 * sn(ph + Math.PI * .5) - .12, .2 + .35 * Math.max(0, cs(ph + .5 * Math.PI))], bF: [.35 * sn(ph + Math.PI * 1.5) - .12, .2 + .35 * Math.max(0, cs(ph + 1.5 * Math.PI))] };
    bob = -Math.abs(sn(ph)) * 3;
  } else if (gait === 'sit') { body = -1.0; legs = { fN: [.05, 0], fF: [-.05, 0], bN: [1.3, -2.4], bF: [1.2, -2.3] }; headUp = .1; }
  else if (gait === 'crouch') { body = .12; legs = { fN: [.6, -.9], fF: [.5, -.8], bN: [-.55, 1.5], bF: [-.45, 1.4] }; }
  else legs = { fN: [.05, 0], fF: [-.06, 0], bN: [-.2, .3], bF: [-.12, .25] };
  if (gait !== 'sit') for (const k in legs) { const v = legs[k][1]; if (k[0] === 'f' ? v > .15 : v < -.15) S.audit.push(`body: ${sp.name || 'critter'} ${k[0] === 'f' ? 'front' : 'hind'} lower leg folds the wrong way`); }   // sitting folds the haunch: exempt
  const half = L * .5 * stretch, hipY = -legL;
  const C = [0, hipY - H * .12 + bob], shoulder = add(C, rotV([f * half * .8, 0], body * f)), hip = add(C, rotV([-f * half * .8, 0], body * f));
  // legs: 2 segments; sitting back legs fold into a haunch
  const seg = legL * .52, LG = {};
  for (const [k, base] of [['fN', shoulder], ['fF', shoulder], ['bN', hip], ['bF', hip]]) { const [a1, a2] = legs[k], K = add(base, dir(a1), seg), A = add(K, dir(a1 + a2), seg * .98); LG[k] = { base, K, A }; }
  let dy = 0; if (P.plant !== false && gait !== 'leap') dy = -Math.max(...Object.values(LG).map(l => l.A[1]));
  if (gait === 'sit') dy = -Math.max(LG.fN.A[1], LG.fF.A[1]);
  ctx.save(); ctx.translate(P.x ?? 0, P.y ?? 0); ctx.scale(s, s); ctx.translate(0, dy);
  const col = sp.col, dark = tone(col, -.2), lw = H * .1;
  const legDraw = (k, c) => { const l = LG[k]; tube(ctx, [l.base, l.K, l.A], [lw * 1.5, lw, lw * .85], c, { w }); S.shape(ctx, S.ellipse(l.A[0] + f * lw * .35, l.A[1] - lw * .1, lw * .75, lw * .45, 10), { fill: c, w: w * .8 }); };
  legDraw('bF', dark); legDraw('fF', dark);
  // tail
  const tl = sp.tail.len * L * .55, tw = S.n1((P.flow ?? 0) * 2.5, 9) * .5 + (gait === 'run' ? .4 : 0);
  const tailPts = [hip, add(hip, [-f * tl * .4, -tl * (.3 + tw * .3)]), add(hip, [-f * tl * .85, -tl * (.45 + tw * .2)]), add(hip, [-f * tl, -tl * (.75 + tw * .1)])];
  if (sp.tail.style === 'fluffy') tube(ctx, tailPts, [lw * 1.4, lw * 2.2, lw * 2.4, lw * .6], col, { w }); else tube(ctx, tailPts, [lw * .8, lw * .55, lw * .4, lw * .2], col, { w });
  // body
  const bpts = [];
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, c = Math.cos(a), sn2 = Math.sin(a), r = H * (.28 + (sn2 > 0 ? .05 : 0)) * (1 - .15 * Math.max(0, -c * f)); bpts.push(add(C, rotV([c * half * 1.05, sn2 * r], body * f))); }
  S.shape(ctx, bpts, { fill: col, shade: true, w, tex: .5 });
  if (gait === 'sit') S.shape(ctx, S.ellipse(hip[0] + f * H * .05, hip[1] + H * .02, H * .26, H * .2, 14), { fill: col, shade: true, w });
  if (sp.belly) S.fill(ctx, S.ellipse(C[0], C[1] + H * .14, half * .6, H * .1, 14), sp.belly, {});
  legDraw('bN', col); legDraw('fN', col);
  // head
  const hr = H * .27 * sp.head, neckDir = gait === 'sit' ? -.2 : gait === 'run' ? .35 : .1;
  const hc = add(shoulder, rotV([f * hr * .9, -hr * (1.1 + headUp * 3)], (body * .3 + neckDir * .3) * f));
  tube(ctx, [shoulder, L2(shoulder, hc, .6)], [H * .32, hr * 1.0], col, { w, line: false, shade: false });
  const ex = { ...{ calm: { o: .8 }, alarm: { o: 1.35 }, happy: { o: 0 }, sleep: { o: -1 } }[P.expr || 'calm'] };
  // ears behind / in front
  const earBack = clamp(P.ears ?? (gait === 'run' ? .9 : .2)), elen = hr * 1.7 * sp.ear.len, ew = hr * .55 * sp.ear.w, wind = P.wind || [0, 0];
  const ear = (side) => {
    const base = add(hc, [-f * hr * (side ? .1 : .35), -hr * .7]);
    if (sp.ear.style === 'point') { S.shape(ctx, [add(base, [-f * ew * .6, 0]), add(base, [f * ew * .6, 0]), add(base, [-f * elen * .25 * earBack, -elen * .65 * (1 - earBack * .4)])], { fill: side ? col : dark, w }); return; }
    if (sp.ear.style === 'round') { S.shape(ctx, S.ellipse(base[0], base[1] - ew * .4, ew * .7, ew * .7, 12), { fill: side ? col : dark, w }); return; }
    const a = lerp(-.35, -1.35, earBack) * f + (side ? .15 : -.1), C2 = [base], d0 = [Math.sin(-a) * -1, -Math.cos(a)];
    let p = base; for (let i = 1; i <= 4; i++) { const u = i / 4; const dd = [-f * Math.sin(Math.abs(a)) * (1 + u * .3) + wind[0] * .004 * u, -Math.cos(a) * (1 - u * 1.3) + .5 * u + S.n1((P.flow ?? 0) * 4 + side, 4) * .15]; const l = Math.hypot(dd[0], dd[1]); p = add(p, [dd[0] / l, dd[1] / l], elen / 4); C2.push(p); }
    tube(ctx, C2, [ew * .7, ew * 1.1, ew, ew * .8, ew * .3], side ? col : dark, { w });
  };
  ear(0);
  const hp = S.ellipse(hc[0], hc[1], hr * 1.05, hr * .95, 18), sn3 = add(hc, [f * hr * (.85 + sp.snout * .4), hr * .25]);
  S.shape(ctx, hp, { fill: col, shade: true, w, light: [-hr * .3, -hr * .2] });
  S.shape(ctx, S.ellipse(sn3[0], sn3[1], hr * (.35 + sp.snout * .25), hr * .3, 12), { fill: tone(col, .12), w: w * .9 });
  S.fill(ctx, S.ellipse(sn3[0] + f * hr * (.2 + sp.snout * .2), sn3[1] - hr * .12, hr * .12, hr * .09, 8), '#2a2523', { off: [0, 0] });
  const eyeC = add(hc, [f * hr * .35, -hr * .12]), look = P.look || [0, 0];
  if (ex.o > .1) { const er = hr * .17 * ex.o; S.fill(ctx, S.ellipse(eyeC[0], eyeC[1], er * .9, er * 1.1, 10), '#efe9d8', { off: [0, 0] }); S.fill(ctx, S.ellipse(eyeC[0] + look[0] * er * .3 + f * er * .15, eyeC[1] + look[1] * er * .3, er * .55, er * .7, 8), sp.eye, { off: [0, 0] }); S.loop(ctx, S.ellipse(eyeC[0], eyeC[1], er * .95, er * 1.15, 10), { w: w * .8 }); }
  else if (ex.o === 0) S.line(ctx, S.arc(eyeC[0], eyeC[1] + hr * .06, hr * .14, hr * .12, Math.PI * 1.1, Math.PI * 1.9, 6), { w });
  else S.line(ctx, S.arc(eyeC[0], eyeC[1] - hr * .03, hr * .14, hr * .08, Math.PI * .1, Math.PI * .9, 6), { w });
  S.line(ctx, [add(sn3, [-f * hr * .1, hr * .25]), add(sn3, [f * hr * .2, hr * .3])], { w: w * .8, over: 2, passes: 1 });   // mouth
  ear(1);
  ctx.restore();
  const T = p => [(P.x ?? 0) + s * p[0], (P.y ?? 0) + s * (p[1] + dy)];
  const hs = T(hc), bk = T(add(C, [0, -H * .28])), feet = Object.values(LG).map(l => T(l.A));
  return { head: { x: hs[0], y: hs[1], r: hr * s }, back: { x: bk[0], y: bk[1] }, ground: Math.max(...feet.map(p => p[1])), box: { x0: Math.min(...feet.map(p => p[0]), hs[0] - hr * s) , y0: hs[1] - hr * s * 2, x1: Math.max(...feet.map(p => p[0]), hs[0] + hr * s), y1: Math.max(...feet.map(p => p[1])) } };
}

/** where(spec, pose) — the same geometry person() returns (hands, head, feet, ground), without drawing: aim props and paths at it */
export function where(spec, P = {}) {
  const n0 = S.audit.length, G = personGeom(spec, P); S.audit.length = n0;
  const ST = toStage(P, G.pivot), { legs, arms, J } = G, R = G.R * (P.s ?? 1);
  const hand = side => { const A = arms[side], d = [Math.sin(A.ang) * G.f, Math.cos(A.ang)], c = add(A.W, d, G.R * .62 * .45), p = ST(c); return { x: p[0], y: p[1], ang: A.ang, wrist: ST(A.W) }; };
  const pts = [legs.near.heel, legs.near.toe, legs.far.heel, legs.far.toe].map(ST), hd = ST(J.head);
  return { hands: { near: hand('near'), far: hand('far') }, head: { x: hd[0], y: hd[1], r: R }, feet: pts.map(p => ({ x: p[0], y: p[1] })), ground: Math.max(...pts.map(p => p[1])) };
}
