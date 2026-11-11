// aphorism-film · figure.js — the cast: flat cel-shaded anime characters with ink outlines, designed per topic from a spec.
//
//   bust(ctx, spec, { x, y, s, turn, look, blink, mouth, sway, bodyTurn })   a head-and-shoulders close-up (front or 3/4)
//   body(ctx, spec, { x, y, h, view: 'side'|'front'|'back', dir: 1|-1, pose })  a full figure standing on y
//   walk(phase, o) · run(phase, o) · stand(o)                                  poses for body() (pure functions of phase)
//   LIM, issues(), clearIssues()                                              the joint-limit audit (check.mjs fails on it)
//
// spec (design one per character for each topic — see references/CAST.md):
//   { name, hair, streaks: [c1, c2], style: 'hime'|'bob'|'long'|'short', skin, eye, eye2, top, topKind: 'blazer'|'sweater'|'dress',
//     collar, tie, bottom, bottomKind: 'skirt'|'trousers', legs, shoes, bag, band }
//
// Directions follow CONTRIBUTING.md: in a 3/4 view the eye on the side the face turns toward is the FAR eye (narrower),
// the nose points that way, the ear and more cheek show on the back side; in side view the near arm and leg are drawn in
// front of the body, the far ones behind, the backpack sits on the back, hair streams away from the direction of travel.
import { TAU, clamp, lerp, mix, rgba, shade } from './core.js';
import { INK, outline, smoothPath, path } from './kit.js';

export const LIM = {           // radians; measured from straight down, + = forward (the way the figure faces)
  hip: [-1.3, 2.2],            // thigh: ~75° back … well forward
  knee: [-2.6, 0.02],          // shin folds BACK only
  shoulder: [-1.4, 3.1],       // arm: back … overhead
  elbow: [-0.02, 2.6],         // forearm folds FORWARD only
  ankle: [-0.9, 0.7],
  spine: [-0.35, 0.6], neck: [-0.6, 0.6], turn: [-0.62, 0.62],
};
let ISSUES = [];
export const issues = () => ISSUES.slice();
export const clearIssues = () => { ISSUES = []; };
function audit(who, joint, v, [a, b]) { if (v < a - 1e-6 || v > b + 1e-6) { const m = `body: ${who} ${joint} ${v.toFixed(2)} outside [${a}, ${b}]`; if (!ISSUES.includes(m)) ISSUES.push(m); } }

const DEF = { name: 'girl', hair: '#151a2c', streaks: ['#2f6bff', '#e8402a'], style: 'hime', skin: '#f6d2b6', eye: '#2fa3c6', eye2: '#f2b51d',
  top: '#d8322a', topKind: 'blazer', collar: '#fbf7ee', tie: '#d8322a', bottom: '#d8322a', bottomKind: 'skirt', legs: '#17121c', shoes: '#e8402a', bag: null, band: null };
export const withDef = s => ({ ...DEF, ...s });
const down = a => [Math.sin(a), Math.cos(a)];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

// ---------- poses ----------
export function stand(o = {}) {
  const a = o.arms ?? .06;
  return { near: { hip: o.hip ?? .02, knee: -.03, ankle: 0, sh: a, el: .12 }, far: { hip: -.02, knee: -.03, ankle: 0, sh: -a * .6, el: .1 }, spine: o.spine ?? 0, neck: o.neck ?? 0, sway: o.sway ?? 0 };
}
// a walk cycle: phase 0 … 1 (one stride of each leg). o.amp scales the stride.
export function walk(p, o = {}) {
  const A = o.amp ?? 1, leg = q => { const s = Math.sin(TAU * q), c = Math.cos(TAU * (q + .04));
    return { hip: .42 * A * s, knee: -(.08 + 1.0 * A * Math.max(0, c) ** 2), ankle: clamp(.25 * s, -.4, .3) }; };
  const arm = q => { const s = Math.sin(TAU * q); return { sh: -.38 * A * s, el: .22 + .25 * A * Math.max(0, s) }; };
  const N = { ...leg(p), ...arm(p + .5) }, F = { ...leg(p + .5), ...arm(p) };
  return { near: N, far: F, spine: .06 * A, neck: -.04, sway: Math.sin(TAU * p * 2) * .5, bob: 1 };
}
export function run(p, o = {}) {
  const A = o.amp ?? 1, leg = q => { const s = Math.sin(TAU * q), c = Math.cos(TAU * (q + .02));
    return { hip: (.2 + .75 * s) * A, knee: -(.2 + 1.9 * A * Math.max(0, c) ** 1.5), ankle: clamp(.35 * s, -.6, .45) }; };
  const arm = q => { const s = Math.sin(TAU * q); return { sh: -.7 * A * s + .05, el: .9 + .25 * s }; };
  const N = { ...leg(p), ...arm(p + .5) }, F = { ...leg(p + .5), ...arm(p) };
  return { near: N, far: F, spine: .32 * A, neck: -.22, sway: 1, bob: 1 };
}

// ---------- the full figure ----------
// geometry in local units (h = height in stage px), origin = ground under the pelvis, facing +x
export function bodyGeom(spec, P, h) {
  const sp = withDef(spec), who = sp.name;
  const thigh = h * .245, shin = h * .23, ankleH = h * .03, torso = h * .25, neck = h * .03, R = h * .088, upper = h * .145, fore = h * .13, footL = h * .075;
  for (const side of ['near', 'far']) { const L = P[side]; audit(who, side + ' hip', L.hip, LIM.hip); audit(who, side + ' knee', L.knee, LIM.knee); audit(who, side + ' shoulder', L.sh, LIM.shoulder); audit(who, side + ' elbow', L.el, LIM.elbow); audit(who, side + ' ankle', L.ankle || 0, LIM.ankle); }
  audit(who, 'spine', P.spine || 0, LIM.spine); audit(who, 'neck', P.neck || 0, LIM.neck);
  const pel = [0, 0], up = [Math.sin(P.spine || 0), -Math.cos(P.spine || 0)];
  const chest = add(pel, up, torso), shoulder = add(pel, up, torso * .9);
  const hn = (P.spine || 0) + (P.neck || 0), head = add(add(chest, up, neck), [Math.sin(hn), -Math.cos(hn)], R * 1.02);
  const legs = {}, arms = {};
  for (const side of ['near', 'far']) {
    const L = P[side], H = add(pel, [side === 'near' ? h * .008 : -h * .008, 0]);
    const K = add(H, down(L.hip), thigh), A = add(K, down(L.hip + L.knee), shin);
    const fa = (L.ankle || 0), heel = add(A, [-h * .012, ankleH]), toe = add(heel, [Math.cos(fa) * footL, -Math.sin(fa) * footL]);
    legs[side] = { H, K, A, heel, toe };
    const Sh = add(shoulder, [side === 'near' ? h * .01 : -h * .01, 0]), E = add(Sh, down(L.sh), upper), W = add(E, down(L.sh + L.el), fore);
    arms[side] = { S: Sh, E, W };
  }
  const low = Math.max(legs.near.heel[1], legs.near.toe[1], legs.far.heel[1], legs.far.toe[1]);
  const sh = p => [p[0], p[1] - low];
  for (const s of ['near', 'far']) { for (const k in legs[s]) legs[s][k] = sh(legs[s][k]); for (const k in arms[s]) arms[s][k] = sh(arms[s][k]); }
  return { sp, h, R, pel: sh(pel), chest: sh(chest), shoulder: sh(shoulder), head: sh(head), up, legs, arms, dims: { thigh, shin, torso, upper, fore, footL } };
}
function limb(ctx, pts, ws, col, lw) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) for (let i = 0; i < pts.length - 1; i++) {
    ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
    ctx.lineWidth = ws[i] + (pass ? 0 : lw * 2); ctx.strokeStyle = pass ? col[i] || col[0] : INK; ctx.stroke();
  }
}
function foot(ctx, L, col, lw, h) {
  const [hx, hy] = L.heel, [tx, ty] = L.toe, a = Math.atan2(ty - hy, tx - hx), len = Math.hypot(tx - hx, ty - hy);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(-h * .006, 0); ctx.lineTo(-h * .006, -h * .03); ctx.quadraticCurveTo(len * .5, -h * .04, len, -h * .012); ctx.quadraticCurveTo(len * 1.04, 0, len * .9, 0); ctx.closePath();
  outline(ctx, col, lw); ctx.fillStyle = '#fbf7ee'; ctx.fillRect(-h * .006, -h * .006, len * .95, h * .006); ctx.restore();
}
// side-view head: cranium, profile, one eye, hair cap with blunt bangs; hair mass streaming behind (drawn separately)
function sideHead(ctx, g, sp, lw, sway) {
  const [x, y] = g.head, R = g.R;
  ctx.save(); ctx.translate(x, y);
  // face (skin), profile toward +x
  smoothPath(ctx, [[-R * .7, -R * .2], [-R * .2, -R * .95], [R * .7, -R * .7], [R * .95, -R * .05], [R * 1.06, R * .3], [R * .9, R * .45], [R * .92, R * .58], [R * .62, R * .9], [R * .1, R * .95], [-R * .5, R * .5]]);
  outline(ctx, sp.skin, lw);
  // eye
  ctx.beginPath(); ctx.ellipse(R * .58, R * .08, R * .11, R * .2, 0, 0, TAU); outline(ctx, sp.eye, lw * .6);
  ctx.beginPath(); ctx.ellipse(R * .58, R * .1, R * .05, R * .1, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
  ctx.beginPath(); ctx.moveTo(R * .4, -R * .12); ctx.quadraticCurveTo(R * .6, -R * .2, R * .74, -R * .1); ctx.lineWidth = lw * 1.3; ctx.strokeStyle = INK; ctx.stroke();
  // mouth tick
  ctx.beginPath(); ctx.moveTo(R * .82, R * .6); ctx.lineTo(R * .92, R * .6); ctx.lineWidth = lw * .6; ctx.stroke();
  // ear (on the side of the head, behind the face)
  ctx.beginPath(); ctx.ellipse(-R * .05, R * .12, R * .13, R * .2, 0, 0, TAU); outline(ctx, shade(sp.skin, -.08), lw * .6);
  // hair cap + bangs (blunt cut above the eye), back of the head
  const cut = sp.style === 'short' ? R * .2 : -R * .22;
  smoothPath(ctx, [[R * .95, cut], [R * .98, -R * .55], [R * .5, -R * 1.08], [-R * .3, -R * 1.12], [-R * 1.05, -R * .55], [-R * 1.1, R * .25], [-R * .8, R * (sp.style === 'bob' ? .95 : .7)], [-R * .2, R * .45], [-R * .05, -R * .1], [R * .5, cut]]);
  outline(ctx, sp.hair, lw);
  if (sp.streaks) { ctx.save(); ctx.clip(); ctx.fillStyle = sp.streaks[0]; ctx.fillRect(-R * 1.2, -R * .75, R * 2.4, R * .14); ctx.fillStyle = sp.streaks[1]; ctx.fillRect(-R * 1.2, -R * .58, R * 2.4, R * .08); ctx.restore(); }
  if (sp.band) { ctx.beginPath(); ctx.ellipse(-R * .05, -R * .62, R * .2, R * .62, .35, -1.2, 1.2); ctx.lineWidth = R * .14; ctx.strokeStyle = sp.band; ctx.stroke(); }
  ctx.restore();
}
function hairMass(ctx, g, sp, lw, sway) {   // long hair down the back, swinging opposite to the way the figure moves
  if (sp.style === 'short' || sp.style === 'bob') return;
  const [x, y] = g.head, R = g.R, len = (sp.style === 'long' ? 5.2 : 4.4) * R, s = (sway || 0) * .5 + .25;
  const pts = [[x + R * .2, y - R * 1.0], [x - R * .9, y - R * .75], [x - R * 1.2, y + R * .2], [x - R * 1.25 - s * R * .6, y + len * .55], [x - R * 1.1 - s * R * 1.2, y + len],
    [x - R * .55 - s * R * 1.1, y + len * 1.04], [x - R * .25 - s * R * .5, y + len * .6], [x - R * .2, y + R * 1.1], [x, y]];
  smoothPath(ctx, pts); outline(ctx, sp.hair, lw);
  ctx.strokeStyle = rgba(shade(sp.hair, .45), .8); ctx.lineWidth = lw * .6;
  for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x - R * (.5 + j * .2), y + R * .1); ctx.quadraticCurveTo(x - R * (.8 + j * .15) - s * R * .3, y + len * .5, x - R * (.6 + j * .18) - s * R * 1.1, y + len * .95); ctx.stroke(); }
}
function sideTorso(ctx, g, sp, lw) {
  const h = g.h, P = g.pel, C = g.chest, up = g.up, rt = [-up[1], up[0]];  // rt = forward
  const at = (p, f, u) => [p[0] + rt[0] * f + up[0] * u, p[1] + rt[1] * f + up[1] * u];
  // bag on the back
  if (sp.bag) { const b = at(C, -h * .07, -h * .1); ctx.beginPath(); ctx.roundRect(b[0] - h * .055, b[1] - h * .075, h * .065, h * .13, h * .014); outline(ctx, sp.bag, lw); ctx.fillStyle = rgba(INK, .25); ctx.fillRect(b[0] - h * .05, b[1] + h * .01, h * .055, h * .012); }
  // skirt / trousers top
  if (sp.bottomKind === 'skirt') {
    const hem = h * .15, q = [at(P, -h * .048, h * .045), at(P, h * .05, h * .045), at(P, h * .088, -hem), at(P, -h * .088, -hem)];
    path(ctx, q); outline(ctx, sp.bottom, lw);
    ctx.strokeStyle = rgba(INK, .55); ctx.lineWidth = lw * .5; for (let i = 1; i < 4; i++) { const a = at(P, -h * .045 + i * h * .026, h * .03), b = at(P, -h * .09 + i * h * .046, -hem + 2); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  // torso: back, shoulder, chest, waist
  const tp = [at(P, -h * .045, h * .03), at(C, -h * .048, -h * .02), at(C, -h * .03, h * .025), at(C, h * .03, h * .022), at(C, h * .052, -h * .06), at(P, h * .04, h * .07), at(P, h * .045, h * .02)];
  smoothPath(ctx, tp); outline(ctx, sp.top, lw);
  if (sp.topKind === 'blazer') { const a = at(C, h * .045, h * .02), b = at(C, h * .02, -h * .1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = lw * .6; ctx.strokeStyle = rgba(INK, .6); ctx.stroke(); }
  // collar
  const c0 = at(C, h * .03, h * .03), c1 = at(C, h * .055, -h * .02), c2 = at(C, h * .0, h * .025);
  path(ctx, [c0, c1, c2]); outline(ctx, sp.collar, lw * .7);
  if (sp.bottomKind === 'dress' || sp.topKind === 'dress') {
    const hem = h * .2, q = [at(P, -h * .055, h * .05), at(P, h * .055, h * .05), at(P, h * .11, -hem), at(P, -h * .11, -hem)]; path(ctx, q); outline(ctx, sp.top, lw);
  }
}
export function body(ctx, spec, o = {}) {
  const sp = withDef(spec), h = o.h || 300, view = o.view || 'side', dir = o.dir || 1, P = o.pose || stand(), lw = o.lw ?? Math.max(1.2, h * .009);
  ctx.save(); ctx.translate(o.x || 0, o.y || 0);
  if (o.shadow !== false) { ctx.beginPath(); ctx.ellipse(0, 0, h * .15, h * .022, 0, 0, TAU); ctx.fillStyle = rgba(INK, .28); ctx.fill(); }
  if (view === 'side') {
    ctx.scale(dir, 1);
    const g = bodyGeom(sp, P, h), N = g.legs.near, F = g.legs.far, an = g.arms.near, af = g.arms.far;
    const leg = (L, k) => { limb(ctx, [L.H, L.K, L.A], [h * .05, h * .04], [k ? sp.skin : shade(sp.skin, -.12), sp.legs], lw); foot(ctx, L, k ? sp.shoes : shade(sp.shoes, -.2), lw, h); };
    const arm = (A, k) => { limb(ctx, [A.S, A.E, A.W], [h * .038, h * .032], [k ? sp.top : shade(sp.top, -.2)], lw); ctx.beginPath(); ctx.arc(A.W[0], A.W[1], h * .017, 0, TAU); outline(ctx, k ? sp.skin : shade(sp.skin, -.12), lw * .8); };
    hairMass(ctx, g, sp, lw, P.sway);
    arm(af, 0); leg(F, 0);
    if (sp.bottomKind === 'trousers') { limb(ctx, [F.H, F.K, F.A], [h * .058, h * .048], [shade(sp.bottom, -.2)], lw); foot(ctx, F, shade(sp.shoes, -.2), lw, h); limb(ctx, [N.H, N.K, N.A], [h * .058, h * .048], [sp.bottom], lw); foot(ctx, N, sp.shoes, lw, h); }
    else leg(N, 1);
    sideTorso(ctx, g, sp, lw);
    // neck
    limb(ctx, [g.chest, add(g.head, [0, g.R * .4])], [h * .028], [sp.skin], lw * .8);
    sideHead(ctx, g, sp, lw, P.sway);
    arm(an, 1);
  } else {
    // front / back: legs straight-ish, arms at the sides, symmetric head
    const g = bodyGeom(sp, { near: { hip: 0, knee: 0, ankle: 0, sh: 0, el: 0 }, far: { hip: 0, knee: 0, ankle: 0, sh: 0, el: 0 }, spine: 0, neck: 0 }, h);
    const hipY = g.pel[1], C = g.chest, R = g.R, hd = g.head, sw = h * .078, back = view === 'back';
    if (!back && sp.style !== 'short' && sp.style !== 'bob') { ctx.beginPath(); ctx.roundRect(hd[0] - R * 1.08, hd[1] - R * .5, R * 2.16, R * (sp.style === 'long' ? 4 : 3.3), R * .5); outline(ctx, sp.hair, lw); }
    for (const s of [-1, 1]) { const x = s * h * .032; limb(ctx, [[x, hipY], [x, hipY + g.dims.thigh], [x * 1.05, -h * .03]], [h * .05, h * .04], [sp.bottomKind === 'trousers' ? sp.bottom : sp.skin, sp.bottomKind === 'trousers' ? sp.bottom : sp.legs], lw);
      ctx.beginPath(); ctx.ellipse(x * 1.1, -h * .014, h * .026, h * .017, 0, 0, TAU); outline(ctx, sp.shoes, lw); }
    for (const s of [-1, 1]) { const S = [s * sw * .78, C[1] + h * .025], E = [s * sw * .9, C[1] + h * .15], W = [s * sw * .92, C[1] + h * .27]; limb(ctx, [S, E, W], [h * .036, h * .03], [sp.top], lw); ctx.beginPath(); ctx.arc(W[0], W[1], h * .017, 0, TAU); outline(ctx, sp.skin, lw * .8); }
    if (sp.bottomKind === 'skirt') { path(ctx, [[-sw * .55, hipY - h * .04], [sw * .55, hipY - h * .04], [sw * .95, hipY + h * .14], [-sw * .95, hipY + h * .14]]); outline(ctx, sp.bottom, lw); ctx.strokeStyle = rgba(INK, .5); ctx.lineWidth = lw * .5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * sw * .22, hipY - h * .03); ctx.lineTo(i * sw * .38, hipY + h * .135); ctx.stroke(); } }
    path(ctx, [[-sw * .58, hipY + h * .01], [-sw * .7, C[1] + h * .12], [-sw * .85, C[1] + h * .03], [-sw * .5, C[1] - h * .005], [sw * .5, C[1] - h * .005], [sw * .85, C[1] + h * .03], [sw * .7, C[1] + h * .12], [sw * .58, hipY + h * .01]]); outline(ctx, sp.top, lw);
    if (sp.bag && back) { ctx.beginPath(); ctx.roundRect(-sw * .55, C[1] + h * .03, sw * 1.1, h * .15, h * .02); outline(ctx, sp.bag, lw); }
    if (!back) { path(ctx, [[-sw * .3, C[1] - h * .005], [0, C[1] + h * .07], [sw * .3, C[1] - h * .005]]); outline(ctx, sp.collar, lw * .7); if (sp.tie) { path(ctx, [[-h * .012, C[1] + h * .02], [h * .012, C[1] + h * .02], [h * .016, C[1] + h * .12], [0, C[1] + h * .14], [-h * .016, C[1] + h * .12]]); outline(ctx, sp.tie, lw * .6); } }
    limb(ctx, [[0, C[1]], [0, hd[1] + R * .5]], [h * .026], [sp.skin], lw * .8);
    ctx.beginPath(); ctx.ellipse(hd[0], hd[1] + R * .08, R * .82, R * .98, 0, 0, TAU); outline(ctx, back ? sp.hair : sp.skin, lw);
    if (!back) {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hd[0] + s * R * .33, hd[1] + R * .18, R * .13, R * .19, 0, 0, TAU); outline(ctx, sp.eye, lw * .5); ctx.beginPath(); ctx.ellipse(hd[0] + s * R * .33, hd[1] + R * .2, R * .06, R * .1, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(hd[0] - R * .1, hd[1] + R * .62); ctx.lineTo(hd[0] + R * .1, hd[1] + R * .62); ctx.lineWidth = lw * .6; ctx.strokeStyle = INK; ctx.stroke();
      // hair cap with blunt bangs + side locks
      smoothPath(ctx, [[-R * 1.02, R * .7], [-R * 1.05, -R * .4], [-R * .5, -R * 1.05], [R * .5, -R * 1.05], [R * 1.05, -R * .4], [R * 1.02, R * .7], [R * .7, R * .7], [R * .72, -R * .02], [-R * .72, -R * .02], [-R * .7, R * .7]].map(([a, b]) => [hd[0] + a, hd[1] + b]));
      outline(ctx, sp.hair, lw);
    } else {
      // back of the head: long hair down the back
      if (sp.style !== 'short' && sp.style !== 'bob') { ctx.beginPath(); ctx.roundRect(hd[0] - R * 1.02, hd[1] - R * .2, R * 2.04, R * (sp.style === 'long' ? 4.6 : 3.8), R * .5); outline(ctx, sp.hair, lw); }
      smoothPath(ctx, [[-R * 1.02, R * .6], [-R * 1.05, -R * .4], [-R * .5, -R * 1.05], [R * .5, -R * 1.05], [R * 1.05, -R * .4], [R * 1.02, R * .6], [0, R * .95]].map(([a, b]) => [hd[0] + a, hd[1] + b])); outline(ctx, sp.hair, lw);
    }
    if (sp.streaks) { ctx.save(); ctx.beginPath(); ctx.ellipse(hd[0], hd[1] - R * .2, R * 1.06, R * .9, 0, Math.PI, TAU); ctx.clip(); ctx.fillStyle = sp.streaks[0]; ctx.fillRect(hd[0] - R * 1.2, hd[1] - R * .62, R * 2.4, R * .14); ctx.fillStyle = sp.streaks[1]; ctx.fillRect(hd[0] - R * 1.2, hd[1] - R * .46, R * 2.4, R * .08); ctx.restore(); }
    if (sp.band) { ctx.beginPath(); ctx.ellipse(hd[0], hd[1] - R * .1, R * 1.0, R * .85, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = R * .14; ctx.strokeStyle = sp.band; ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- the bust (close-up) ----------
// x, y = centre of the face; s = face height (forehead to chin) in stage px. turn −0.6 … 0.6: + = the face turns toward
// screen right. look = [lx, ly] −1 … 1 (where the irises point), blink 0 … 1, mouth 'flat'|'smile'|'open'|'set',
// sway = hair swing (−1 … 1), bodyTurn = the shoulders' turn (neck twist = turn − bodyTurn, audited).
export function bust(ctx, spec, o = {}) {
  const sp = withDef(spec), s = o.s || 400, t = o.turn || 0, bt = o.bodyTurn ?? t * .4, lw = o.lw ?? Math.max(2, s * .008), sw = o.sway || 0;
  audit(sp.name, 'head turn', t, LIM.turn); audit(sp.name, 'neck twist', t - bt, [-0.5, 0.5]);
  const [lx, ly] = o.look || [0, 0], bl = clamp(o.blink || 0);
  ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.scale(s, s);
  const L = lw / s, fx = t * .13;                       // features shift toward the side the face turns to
  // back hair (behind everything), shifted to the back side
  if (sp.style !== 'short') {
    const bx = -t * .08, len = sp.style === 'bob' ? .95 : 2.6, wid = sp.style === 'bob' ? .62 : .66;
    smoothPath(ctx, [[bx - wid, -.35], [bx - wid - .04 + sw * .02, len * .5], [bx - wid + .02 + sw * .05, len], [bx + wid - .02 + sw * .05, len], [bx + wid + .04 + sw * .02, len * .5], [bx + wid, -.35], [bx, -.82]]);
    outline(ctx, sp.hair, L);
  }
  // shoulders / torso
  ctx.save(); ctx.translate(bt * .1, 0);
  const sh = [[-1.08, 3.4], [-1.05, 1.15], [-.78, .86], [-.2, .74], [.2, .74], [.78, .86], [1.05, 1.15], [1.08, 3.4]];
  smoothPath(ctx, sh); outline(ctx, sp.top, L);
  // shirt V + collar + tie
  path(ctx, [[-.26, .74], [0, 1.45], [.26, .74]]); outline(ctx, sp.collar, L * .8);
  path(ctx, [[-.24, .72], [-.08, .98], [-.3, .98]]); outline(ctx, sp.collar, L * .7);
  path(ctx, [[.24, .72], [.08, .98], [.3, .98]]); outline(ctx, sp.collar, L * .7);
  if (sp.tie) { path(ctx, [[-.06, .86], [.06, .86], [.09, 1.5], [0, 1.62], [-.09, 1.5]]); outline(ctx, sp.tie, L * .7);
    for (const y of [1.02, 1.3]) { path(ctx, [[0, y - .07], [.05, y], [0, y + .07], [-.05, y]]); outline(ctx, sp.eye2 || '#f2b51d', L * .5); path(ctx, [[0, y - .03], [.022, y], [0, y + .03], [-.022, y]]); outline(ctx, sp.eye || '#2fa3c6', 0); } }
  if (sp.topKind === 'blazer') { for (const sd of [-1, 1]) { path(ctx, [[sd * .2, .74], [sd * .5, .8], [sd * .26, 1.4], [sd * .06, 1.7]]); outline(ctx, shade(sp.top, -.12), L * .8); } }
  ctx.restore();
  // neck + cel shadow under the chin
  ctx.beginPath(); ctx.rect(-.11 + fx * .3, .3, .22, .52); outline(ctx, sp.skin, L * .8);
  path(ctx, [[-.11 + fx * .3, .4], [.11 + fx * .3, .4], [.11 + fx * .3, .58], [-.11 + fx * .3, .5]]); ctx.fillStyle = shade(sp.skin, -.14); ctx.fill();
  // face: the cheek on the back side bulges more; the far cheek tucks in
  const nearW = .42 + Math.abs(t) * .02, farW = .42 - Math.abs(t) * .1, sL = t > 0 ? nearW : farW, sR = t > 0 ? farW : nearW;
  smoothPath(ctx, [[-sL, -.45], [-sL - .01, .05], [-sL * .78, .32], [fx * .9 - .08, .5], [fx * .9, .54], [fx * .9 + .08, .5], [sR * .78, .32], [sR + .01, .05], [sR, -.45], [0, -.62]]);
  outline(ctx, sp.skin, L);
  // ear on the back side in 3/4
  if (Math.abs(t) > .12) { const ex = t > 0 ? -sL + .02 : sR - .02; ctx.beginPath(); ctx.ellipse(ex, .06, .07, .13, 0, 0, TAU); outline(ctx, shade(sp.skin, -.06), L * .7); }
  // blush
  ctx.fillStyle = rgba('#ec6f9b', .18); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + sd * .23, .2, .09, .04, 0, 0, TAU); ctx.fill(); }
  // eyes: the one on the side the face turns toward is narrower (far eye)
  for (const sd of [-1, 1]) {
    const far = (sd > 0) === (t > 0) && Math.abs(t) > .02, k = far ? 1 - Math.abs(t) * .55 : 1, ex = fx + sd * (.2 - (far ? Math.abs(t) * .04 : 0)), ey = .02, ew = .13 * k, eh = .12;
    const open = 1 - bl;
    ctx.save(); ctx.translate(ex, ey);
    if (open > .08) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, ew, eh * open, 0, 0, TAU); ctx.fillStyle = '#fbf7ee'; ctx.fill(); ctx.clip();
      const ix = lx * ew * .35, iy = ly * eh * .3;
      ctx.beginPath(); ctx.ellipse(ix, iy, ew * .7, eh * .95, 0, 0, TAU); ctx.fillStyle = shade(sp.eye, -.45); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ix, iy + eh * .1, ew * .58, eh * .8, 0, 0, TAU); ctx.fillStyle = sp.eye; ctx.fill();
      ctx.beginPath(); ctx.ellipse(ix, iy + eh * .45, ew * .45, eh * .4, 0, 0, TAU); ctx.fillStyle = sp.eye2; ctx.fill();
      ctx.beginPath(); ctx.ellipse(ix, iy, ew * .25, eh * .42, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); ctx.ellipse(ix - ew * .25, iy - eh * .35, ew * .14, eh * .12, 0, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ix + ew * .25, iy + eh * .3, ew * .06, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(INK, .25); ctx.fillRect(-ew, -eh, ew * 2, eh * .35);   // lid shadow
      ctx.restore();
    }
    // upper lash line: heavy, flicking out at the outer corner
    const top = -eh * open * .95;
    ctx.beginPath(); ctx.moveTo(-sd * ew * 1.05, top * .3); ctx.quadraticCurveTo(0, top * 1.45 - .01, sd * ew * 1.15, top * .6 - .005); ctx.lineTo(sd * ew * 1.3, top * .4 - .03);
    ctx.lineWidth = L * 2.6; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-sd * ew * .8, eh * open * .9); ctx.quadraticCurveTo(0, eh * open * 1.05, sd * ew * .8, eh * open * .8); ctx.lineWidth = L * .7; ctx.stroke();
    ctx.restore();
  }
  // brows peek through the bangs
  ctx.lineWidth = L * 1.2; ctx.strokeStyle = shade(sp.hair, .1);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + sd * .1, -.14); ctx.quadraticCurveTo(fx + sd * .2, -.17 - (o.brow || 0) * .03, fx + sd * .3, -.15); ctx.stroke(); }
  // nose + mouth
  ctx.strokeStyle = shade(sp.skin, -.4); ctx.lineWidth = L * .9;
  ctx.beginPath(); ctx.moveTo(fx * 1.25 + t * .02, .2); ctx.lineTo(fx * 1.25 + t * .05, .24); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = L;
  const m = o.mouth || 'flat', mx = fx * 1.1;
  ctx.beginPath();
  if (m === 'smile') { ctx.moveTo(mx - .06, .35); ctx.quadraticCurveTo(mx, .39, mx + .06, .35); ctx.stroke(); }
  else if (m === 'open') { ctx.ellipse(mx, .37, .035, .03, 0, 0, TAU); outline(ctx, '#7a2a2a', L * .7); }
  else if (m === 'set') { ctx.moveTo(mx - .055, .36); ctx.quadraticCurveTo(mx, .345, mx + .055, .365); ctx.stroke(); }
  else { ctx.moveTo(mx - .045, .36); ctx.lineTo(mx + .045, .36); ctx.stroke(); }
  // the bangs cast a cel shadow on the forehead
  { const cy0 = sp.style === 'short' ? -.2 : -.1; ctx.save(); smoothPath(ctx, [[-sL, -.45], [-sL - .01, .05], [-sL * .78, .32], [fx * .9, .54], [sR * .78, .32], [sR + .01, .05], [sR, -.45], [0, -.62]]); ctx.clip(); ctx.fillStyle = shade(sp.skin, -.13); ctx.beginPath(); ctx.moveTo(-.6, cy0); for (let i = 0; i <= 14; i++) ctx.lineTo(-.48 + i * (.96 / 14), cy0 + .07 + (i % 2 ? .02 : 0)); ctx.lineTo(.6, cy0 - .2); ctx.lineTo(-.6, cy0 - .2); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // bangs: blunt cut just above the eyes, jagged strand tips, colour streaks; side locks framing the face
  const hx = -t * .03, cutY = sp.style === 'short' ? -.2 : -.1;
  // the crown is a dome (an ellipse arc) wider than the face; the bangs hang from it to a blunt, slightly jagged cut
  ctx.beginPath(); ctx.moveTo(hx - .5, cutY + .02); ctx.lineTo(hx - .53, -.3); ctx.ellipse(hx, -.3, .53, .48, 0, Math.PI, TAU); ctx.lineTo(hx + .5, cutY + .02);
  for (let i = 0; i <= 14; i++) { const u = i / 14, X = lerp(hx + .48, hx - .48, u) + sw * .01; ctx.lineTo(X, cutY + (i % 2 ? .032 : -.004) + Math.sin(i * 1.7) * .006); }
  ctx.closePath();
  outline(ctx, sp.hair, L);
  ctx.save(); ctx.clip();
  // a sheen band across the crown (the 'angel ring'), then streak strands of colour falling through the bangs
  ctx.lineWidth = .05; ctx.strokeStyle = rgba(shade(sp.hair, .5), .55); ctx.beginPath(); ctx.ellipse(hx, -.3, .44, .3, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  if (sp.streaks) for (let i = 0; i < 6; i++) { const X = hx - .36 + i * .145, c0 = sp.streaks[i % 2 ? 1 : 0], w = i % 2 ? .018 : .03;
    const gr = ctx.createLinearGradient(0, -.52, 0, -.22); gr.addColorStop(0, rgba(c0, 0)); gr.addColorStop(1, rgba(c0, .95)); ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(X - w * .6, -.52); ctx.lineTo(X - w, cutY + .03); ctx.lineTo(X + w, cutY + .03); ctx.lineTo(X + w * .6, -.52); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = rgba(INK, .55); ctx.lineWidth = L * .7; for (let i = 0; i < 12; i++) { const X = hx - .45 + i * .08; ctx.beginPath(); ctx.moveTo(X + .02, -.7); ctx.quadraticCurveTo(X, -.4, X + .005, cutY + .02); ctx.stroke(); }
  ctx.restore();
  if (sp.style !== 'short') for (const sd of [-1, 1]) {
    const x0 = (sd < 0 ? -sL : sR) - sd * .02, len = sp.style === 'bob' ? .55 : 1.2, back = (sd > 0) !== (t > 0);
    path(ctx, [[x0 - sd * .05, -.3], [x0 + sd * .1, -.32], [x0 + sd * .08 + sw * .02, len], [x0 - sd * .03 + sw * .02, len + .04], [x0 - sd * .04, .1]]);
    outline(ctx, back || Math.abs(t) < .02 ? sp.hair : shade(sp.hair, .08), L);
  }
  if (sp.band) { ctx.beginPath(); ctx.ellipse(hx, -.3, .5, .44, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = .05; ctx.strokeStyle = sp.band; ctx.stroke(); }
  ctx.restore();
}
