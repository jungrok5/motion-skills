// ink-summoning · beasts.js — the creatures the ink becomes. Three body plans, each a 3D skeleton (so it reads from any
// camera angle) painted in sumi-e ink: a dark wash body with a lighter belly, dry-brush markings that wrap the body's
// surface, crisp black accents (eyes, claws, teeth), and edges that break into ink as it forms or dissolves.
//
//   quadruped(PRESET.tiger, keys)   tiger · wolf · (any four-legged beast: params below)      keys: {t, x, z, yaw, gait,
//                                   speed?, roar, crouch, rear, lift, look, form}
//   serpent(PRESET.dragon, path, keys)   dragon · koi · snake — follows a 3D path            keys: {t, along, form, roar, wave}
//   bird(PRESET.crane, path, keys)       crane · phoenix · hawk — flies along a path          keys: {t, along, form, flap, glide}
//
// form: 0 = not there yet, .3 = a smoky ink silhouette, 1 = fully formed. Every state is a pure function of t.
import { clamp, lerp, keys, v3, dir, ik, noise2, sn, hash, TAU, smooth, rng, ease } from './core.js';
import { tube, blob, soft3, taper, line3, depth, facing, cpos } from './shape.js';
import { ribbon, drawRibbon, INK } from './ink.js';

export const PRESET = {
  tiger: { kind: 'quad', body: '#141416', base: '#19191c', hi: '#8d9198', stripe: '#eceef0', tone: .5, len: 1.2, sh: .95, hip: .88, leg: 1, head: 1.2, r: .33, tail: 1.05, tailW: .07, stripes: 13, ears: 'round', snout: .9, ruff: .8, wash: '#2a2b2f', back: '#070708', belly: '#3a3c41', stride: 1.5 },
  wolf:  { kind: 'quad', body: '#18181b', base: '#1c1c1f', hi: '#a3a7ad', stripe: '#eceef0', tone: .62, len: .95, sh: .84, hip: .8, leg: .95, head: .95, r: .24, tail: .8, tailW: .13, stripes: 0, ears: 'point', snout: 1.35, ruff: 1.3, wash: '#2e2f33', back: '#08080a', belly: '#44464b', stride: 1.4 },
  dragon: { kind: 'serpent', body: '#151518', base: '#1a1a1d', hi: '#a4a8ae', len: 9, r: .26, legs: true, antlers: true, whiskers: true, crest: true, scales: true, fins: false, wash: '#45464b', back: '#121214', belly: '#c9ccd1' },
  koi:    { kind: 'serpent', body: '#18181b', base: '#1c1c1f', hi: '#b5b9bf', len: 1.8, r: .26, legs: false, antlers: false, whiskers: true, crest: false, scales: true, fins: true, wash: '#3a3b40', back: '#111113', belly: '#d8dadd', fat: 1.6 },
  crane:  { kind: 'bird', span: 2.2, body: .45, neck: .55, beak: .2, legs: true, tail: .25, plumes: false, body0: '#eceeef', shade: '#9fa3a8', tips: '#111113' },
  phoenix: { kind: 'bird', span: 2.8, body: .5, neck: .4, beak: .1, legs: false, tail: 1.6, plumes: true, body0: '#3a3b40', shade: '#16161a', tips: '#0b0b0d' },
};

// ---------- shared: paint a creature on a scratch layer, then composite it with its formation ----------
// The body is drawn opaque on its own layer (so overlapping parts don't darken), lightened toward the room by distance,
// then eaten by ink-smoke shapes while it is still forming (form < 1) and composited.
function layered(ctx, v, film, form, seed, center, paint) {
  if (form <= .001) return;
  const L = film.beastBuf || (film.beastBuf = film.mk(film.canvas.width, film.canvas.height)), x = L.getContext('2d');
  const tf = ctx.getTransform();
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, L.width, L.height); x.setTransform(tf);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  paint(x);
  const z = v.depth(center), fog = clamp((z - 8) / 30) * .5;
  if (fog > .01) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(222,225,228,${fog})`; x.fillRect(0, 0, L.width, L.height); x.restore(); }
  if (form < 1) {
    // dissolve: punch smoke-shaped holes, more of them the less formed it is
    const q = v.p(center); if (q) {
      const R = rng(seed), sz = v.k(q[2]) * 1.2;
      x.save(); x.globalCompositeOperation = 'destination-out';
      const n = Math.round(26 * (1 - form));
      for (let i = 0; i < n; i++) {
        const sp = film.smoke[i % film.smoke.length], rr = sz * (.25 + R() * .5) * (1.2 - form * .6);
        x.globalAlpha = clamp((1 - form) * 1.6);
        x.drawImage(sp, q[0] + (R() - .5) * sz * 3.2 - rr, q[1] + (R() - .5) * sz * 1.8 - rr, rr * 2, rr * 2);
      }
      x.restore();
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(Math.pow(form, .6) * 1.15); ctx.drawImage(L, 0, 0); ctx.restore();
}
// a dry-brush stroke along world points (markings, fur, scales): tapered at both ends
function mark(ctx, v, pts, w, col, a = 1) { ctx.save(); ctx.globalAlpha = a; taper(ctx, v, pts, w, col, { pow: .9, end: 1 }); ctx.restore(); }
function mark2(ctx, v, pts, w, col, a = 1) {   // thick in the middle, thin both ends
  const n = pts.length; ctx.save(); ctx.globalAlpha = a; tube(ctx, v, pts, pts.map((_, i) => w / 2 * Math.sin(Math.PI * (i + .5) / n) + .002), col, { cap: false }); ctx.restore();
}


// a brush stroke painted along world points with per-point widths; the brush axis always faces the camera, so a body
// painted this way reads as a sumi-e stroke from any angle (dry edges, bristle streaks, a ragged tail)
const up8 = (pts, n) => { if (pts.length < 2) return pts; const out = []; for (let i = 0; i < n; i++) { const u = i / (n - 1), m = pts.length - 1, x = u * m, k = Math.min(m - 1, Math.floor(x)), f = x - k, p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(m, k + 2)], f2 = f * f, f3 = f2 * f; out.push([0, 1, 2].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * f + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * f2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * f3))); } return out; };
export function brush(ctx, v, pts, widths, o = {}) {
  const n = o.n || Math.max(8, pts.length * 5), P = up8(pts, n), cam = cpos(v);
  const W = typeof widths === 'number' ? null : up8(widths.map(w => [w, 0, 0]), n).map(q => q[0]);
  const wid = P.map((p, i) => { const tg = v3.sub(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]); let a = v3.cross(tg, v3.sub(cam, p)); if (v3.len(a) < 1e-9) a = [0, 1, 0]; return v3.norm(a); });
  const rb = ribbon(P, wid, { w: W ? (s => W[Math.min(n - 1, Math.round(s * (n - 1)))]) : widths, seed: o.seed ?? 1, dry: o.dry ?? .45, splat: o.splat ?? 0, wash: o.wash ?? 0, tone: o.tone ?? 0, ink: o.ink || INK, alpha: o.alpha ?? 1, bristles: o.bristles ?? 40, entry: o.entry ?? .04, tail: o.tail ?? .2, sheen: o.sheen ?? 0 });
  drawRibbon(ctx, v, rb, { head: 1 });
}

// ================= quadruped =================
export function quadruped(P, list, o = {}) {
  P = { ...PRESET.tiger, ...P };
  const K = list || [{ t: 0 }];
  const B = {
    P, seed: o.seed || 7,
    pose(t) { const g = k => keys(K, t, k, ({ x: 0, z: 0, yaw: 0, gait: 0, roar: 0, crouch: 0, rear: 0, lift: 0, look: 0, form: 1, lookP: 0 })[k]); return { x: g('x'), z: g('z'), yaw: g('yaw'), gait: g('gait'), roar: g('roar'), crouch: g('crouch'), rear: g('rear'), lift: g('lift'), look: g('look'), lookP: g('lookP'), form: g('form') }; },
    // distance travelled (for the gait phase): integrate the keyed path
    travelled(t) { let d = 0, p = this.pose(0); const n = Math.max(2, Math.ceil(t / .04)); for (let i = 1; i <= n; i++) { const q = this.pose(t * i / n); d += Math.hypot(q.x - p.x, q.z - p.z); p = q; } return d; },
    state(t) { return quadState(this, t); },
    center: st => st.chest,
    shadow: st => [{ p: [st.mid[0], 0, st.mid[2]], r: P.len * .75, a: .3 * st.form * clamp(1 - st.air), sx: 1, sz: 1 }],
    draw(ctx, v, st, film) { layered(ctx, v, film, st.form, this.seed, st.chest, x => drawQuad(x, v, this, st)); },
  };
  return B;
}
function quadState(B, t) {
  const P = B.P, p = B.pose(t), f = dir(p.yaw), r = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)], up = [0, 1, 0];
  const d = B.travelled(t), phase = d / P.stride, moving = clamp(p.gait);
  const bob = Math.sin(phase * TAU * 2) * .03 * moving;
  const root = [p.x, 0, p.z], air = Math.max(0, p.lift);
  const local = (fx, y, rx) => v3.add(v3.add(v3.add(root, v3.mul(f, fx)), v3.mul(r, rx)), [0, y, 0]);
  const rear = p.rear, cr = p.crouch;
  const hip = local(-P.len / 2, P.hip * (1 - cr * .3) + bob + air, 0);
  const chest = local(P.len / 2 - rear * .25, P.sh * (1 - cr * .38) + rear * .55 + bob * 1.3 + air, 0);
  const mid = v3.add(v3.lerp(hip, chest, .5), [0, -.02, 0]);
  const body = v3.norm(v3.sub(chest, hip));
  // head: up and forward from the chest; a roar thrusts it forward and low, the jaw drops
  const hy = .22 - p.roar * .18 - cr * .1, hf = .32 + p.roar * .12;
  const hd = v3.norm(v3.add(dir(p.yaw + p.look, p.lookP - p.roar * .15), v3.mul(body, .3)));
  const neck = v3.add(chest, v3.add(v3.mul(f, .14), [0, .1 - cr * .05, 0]));
  const head = v3.add(neck, v3.add(v3.mul(hd, hf * P.head), [0, hy * P.head, 0]));
  // legs: a trot/gallop cycle; stance feet slide back under the body, swing feet lift forward
  const legs = [];
  const defs = [['FL', .25, P.len / 2 - .05, -.15], ['FR', .75, P.len / 2 - .05, .15], ['HL', .5, -P.len / 2 + .05, -.14], ['HR', 0, -P.len / 2 + .05, .14]];
  for (const [nm, ph, fx, rx] of defs) {
    const front = nm[0] === 'F', c = ((phase + ph) % 1 + 1) % 1, st = c < .55;
    const k = st ? c / .55 : (c - .55) / .45, sl = P.stride * .42 * moving;
    let off = st ? lerp(sl, -sl, k) : lerp(-sl, sl, ease.sine(k)), lift = st ? 0 : Math.sin(Math.PI * k) * .22 * moving;
    let foot = local(fx + off, lift + air * .6, rx * 1.05);
    if (front && rear > 0) foot = v3.lerp(foot, v3.add(local(fx + .25, P.sh * .6 + .3, rx * .9), [0, air, 0]), rear);   // rearing: front paws up
    if (cr > 0 && !st) foot[1] *= 1 - cr;
    const rootP = front ? v3.add(chest, v3.add(v3.mul(r, rx), [0, -.12, 0])) : v3.add(hip, v3.add(v3.mul(r, rx), [0, -.05, 0]));
    const l1 = (front ? .44 : .48) * P.leg * (P.sh / .92), l2 = (front ? .44 : .5) * P.leg * (P.sh / .92);
    const knee = ik(rootP, v3.add(foot, [0, .06, 0]), l1, l2, v3.add(v3.mul(f, front ? -1 : -1), [0, .1, 0])).mid;
    legs.push({ nm, root: rootP, knee, foot, front, near: rx });
  }
  const tailRoot = local(-P.len / 2 - .12, P.hip + bob + air - .02, 0);
  return { t, p, f, r, up, hip, chest, mid, neck, head, hd, legs, tailRoot, phase, form: p.form, air, roar: p.roar, moving };
}
function drawQuad(ctx, v, B, st) {
  const P = B.P, t = st.t, f = st.f, r = st.r, up = st.up, sd = B.seed;
  const parts = [], add = (p, fn) => parts.push({ z: depth(v, p), fn });
  const cam = cpos(v), side = v3.dot(r, v3.sub(cam, st.mid)) > 0 ? 1 : -1;   // which flank faces the camera
  const k = P.r / .3;
  // the spine: tail root → haunch → loin (dips) → withers (rises) → chest → neck; the belly tucks at the waist
  const back = v3.norm(v3.sub(st.hip, st.chest));
  const spine = [v3.mad(st.hip, back, .1), st.hip, v3.add(v3.lerp(st.hip, st.chest, .4), [0, -.03, 0]), v3.add(v3.lerp(st.hip, st.chest, .8), [0, .03, 0]), st.chest, v3.lerp(st.chest, st.neck, .7)];
  const rad = [.2, .26, .22, .27, .3, .21].map(x => x * k * 1.08);
  const below = spine.map((p, i) => v3.add(p, [0, -rad[i] * (i === 2 ? .15 : .3), 0]));
  add(st.mid, () => {
    // paper: an opaque pale silhouette so the beast hides what is behind it
    tube(ctx, v, below.map((p, i) => v3.add(p, [0, rad[i] * .2, 0])), rad.map(x => x * .86), P.base);
    // the body: dense ink brushwork whose bristle edges break into fur; rim streaks along the top show the form
    brush(ctx, v, below, rad.map(x => x * 2.05), { dry: .3, seed: sd, bristles: 64, tail: .1, entry: .02, ink: P.body });
    for (let q = 0; q < 3; q++) brush(ctx, v, spine.map((p, i) => v3.add(p, [0, rad[i] * (.72 - q * .1), 0])), rad.map(x => x * (.16 - q * .03)), { wash: 1, dry: .55, seed: sd + 1 + q, bristles: 6, tail: .4, entry: .2, ink: P.hi });
    // stripes: dry-brush bands wrapping the flank facing the camera, forked and tapered
    for (let i = 0; i < P.stripes; i++) {
      const u = .04 + i / P.stripes * .82 + (hash(i, 3) - .5) * .03, j = u * (spine.length - 1), j0 = Math.floor(j), fr = j - j0;
      const c = v3.lerp(below[j0], below[j0 + 1], fr), rr = lerp(rad[j0], rad[j0 + 1], fr) * 1.04;
      const pts = []; for (let q = 0; q < 6; q++) { const a = lerp(-.05, 1.95 + hash(i, 4) * .45, q / 5); pts.push(v3.add(c, v3.add(v3.add(v3.mul(up, Math.cos(a) * rr), v3.mul(r, side * Math.sin(a) * rr)), v3.mul(f, (q / 4) * .06 * (hash(i, 5) - .3))))); }
      brush(ctx, v, pts, .06 + .045 * hash(i, 6), { dry: .45, seed: sd + 10 + i, bristles: 16, tail: .55, entry: .2, ink: P.stripe, alpha: .92 });
      // a fork: a short second branch splitting off the lower half
      if (hash(i, 8) > .45) { const f0 = pts[3], f1 = v3.add(pts[5], v3.mul(f, (hash(i, 9) - .5) * .18)); brush(ctx, v, [f0, v3.lerp(f0, f1, .5), f1], .045, { dry: .5, seed: sd + 30 + i, bristles: 10, tail: .6, entry: .3, ink: P.stripe, alpha: .85 }); }
    }
    // fur along the belly edge: short dry downward flicks
    for (let i = 0; i < 13; i++) { const u = clamp(i / 12 + (hash(i, 17) - .5) * .07), j = 1 + u * 3, j0 = Math.floor(j), c = v3.lerp(spine[j0], spine[Math.min(5, j0 + 1)], j - j0), rr = lerp(rad[j0], rad[Math.min(5, j0 + 1)], j - j0); const a = v3.add(c, [0, -rr * .95, 0]); const L2 = .04 + .1 * hash(i, 2); brush(ctx, v, [v3.add(a, [0, .05, 0]), v3.add(v3.add(a, v3.mul(f, -L2 * .6)), [0, -L2, 0])], .04 + .03 * hash(i, 3), { dry: .4, seed: sd + 40 + i, bristles: 9, tail: .75, ink: P.body }); }
  });
  // legs: haunch/shoulder → knee → paw, painted; the far legs darker
  for (const L of st.legs) {
    const near = (L.near > 0 ? 1 : -1) === side;
    add(v3.add(v3.lerp(L.root, L.knee, .5), v3.mul(r, L.near * .2)), () => {
      const top = (L.front ? .14 : .19) * k, pts = [v3.add(L.root, [0, .14, 0]), L.root, L.knee, v3.lerp(L.knee, L.foot, .6), L.foot];
      const ws = [top * 2.3, top * 2.1, (L.front ? .085 : .07) * k * 2, .07 * k * 2, .075 * k * 2];
      tube(ctx, v, pts, ws.map(x => x * .36), P.base);
      brush(ctx, v, pts, ws, { dry: .32, seed: sd + (L.front ? 60 : 70) + L.near * 10, bristles: 34, tail: .05, entry: .02, ink: near ? P.body : P.back });
      if (near) brush(ctx, v, [pts[0], pts[1], pts[2]], [top * .3, top * .25, .02 * k], { wash: 1, dry: .7, seed: sd + 80 + L.near, bristles: 6, tail: .6, ink: P.hi, alpha: .45 });
      const toe = v3.add(L.foot, v3.mul(f, .1 * k));
      brush(ctx, v, [v3.add(L.foot, [0, .035, 0]), v3.add(toe, [0, .025, 0])], .17 * k, { dry: .2, seed: sd + 90, bristles: 16, tail: .2, ink: P.back });
      if (P.stripes && near) for (let q = 0; q < 3; q++) { const a = v3.lerp(L.root, L.knee, .25 + q * .25); brush(ctx, v, [v3.add(a, v3.mul(f, .07)), v3.add(a, v3.mul(r, side * .07)), v3.add(a, v3.mul(f, -.07))], .04, { dry: .5, seed: sd + 100 + q, bristles: 10, tail: .5, ink: P.stripe, alpha: .85 }); }
      // claws on the near front paw when roaring / striking
      if (near && L.front && st.roar > .3) for (let q = 0; q < 3; q++) taper(ctx, v, [v3.add(toe, v3.mul(r, (q - 1) * .03)), v3.add(v3.add(toe, v3.mul(f, .05)), [0, -.03, (q - 1) * .02])], .015, '#f0efe9');
    });
  }
  // tail: trails behind, swings, ends in a dark tip
  add(st.tailRoot, () => {
    const pts = [st.tailRoot], n = 6;
    for (let j = 1; j <= n; j++) { const u = j / n, sw = sn(t * 1.7 + u * 2, 9) * .25 * u; pts.push(v3.add(st.tailRoot, v3.add(v3.mul(f, -P.tail * u), v3.add(v3.mul(r, sw), [0, -P.tail * .4 * Math.sin(u * 2.2) + P.tail * .4 * u * u * (1 - st.moving * .5), 0])))); }
    brush(ctx, v, pts, pts.map((_, j) => (P.tailW * (1 - j / (n + 3)) + .02) * 2), { dry: .35, seed: sd + 120, bristles: 24, tail: .35, ink: P.body });
    if (P.stripes) for (let j = 1; j < n; j++) { const a = pts[j]; brush(ctx, v, [v3.add(a, [0, .06, 0]), v3.add(a, v3.mul(r, side * .06)), v3.add(a, [0, -.06, 0])], .045, { dry: .4, seed: sd + 130 + j, bristles: 8, tail: .4, ink: P.stripe, alpha: .85 }); }
  });
  add(st.head, () => drawQuadHead(ctx, v, B, st, side));
  parts.sort((a, b) => b.z - a.z); for (const p of parts) p.fn();
}
function drawQuadHead(ctx, v, B, st, side) {
  const P = B.P, h = P.head, c = st.head, F = st.hd, X = v3.norm(v3.cross([0, 1, 0], F)), U = v3.norm(v3.cross(F, X));
  // at(forward, up, side): a point in the head's frame, in metres × head size
  const at = (fx, uy, xs) => v3.add(c, v3.mul(v3.add(v3.add(v3.mul(F, fx), v3.mul(U, uy)), v3.mul(X, xs)), h));
  const roar = st.roar, sn2 = P.snout, sd = B.seed + 200, kk = P.r / .3 * 1.1, wolf = P.ears === 'point';
  const pale = P.stripe, dark = '#050506';
  const camDir = v3.norm(v3.sub(cpos(v), c)), front = v3.dot(F, camDir);
  const B2 = (pts, w, o) => brush(ctx, v, pts, w, { seed: sd + (o.s || 0), bristles: o.b || 12, dry: o.dry ?? .4, tail: o.tail ?? .5, entry: o.entry ?? .1, ink: o.ink || P.body, wash: o.wash || 0, alpha: o.a ?? 1 });
  // neck into the head
  tube(ctx, v, [st.neck, v3.lerp(st.neck, c, .6), c], [.2, .19, .16].map(x => x * h * kk * .85), P.base);
  B2([st.neck, v3.lerp(st.neck, c, .6), c], [.44, .4, .34].map(x => x * h * kk), { s: 1, b: 36, dry: .3, tail: .1 });
  // ears (behind the skull)
  for (const s of [-1, 1]) {
    const b0 = at(-.05, .13, s * .11), tip = wolf ? at(-.08, .33, s * .15) : at(-.06, .23, s * .17);
    const e1 = v3.mad(b0, X, -s * .05 * h), e2 = v3.mad(b0, X, s * .06 * h);
    soft3(ctx, v, [e1, v3.lerp(e1, tip, .7), tip, v3.lerp(e2, tip, .6), e2, v3.mad(b0, U, -.03 * h)], P.body);
    if (front > .1) soft3(ctx, v, [v3.lerp(b0, e1, .3), v3.lerp(b0, tip, .65), v3.lerp(b0, e2, .3)], '#6d7077');
  }
  // skull + cheek ruffs fanning out and down: a face wider than it is tall
  blob(ctx, v, c, .16 * h, P.base);
  B2([at(-.14, .05, 0), at(.09, .06, 0)], .34 * h, { s: 50, b: 34, dry: .3, tail: .3 });
  for (const s of [-1, 1]) for (let k = 0; k < 8 * P.ruff; k++) {
    const u = k / (8 * P.ruff), root = at(.02, .06 - u * .16, s * .12), tip = at(-.06 - u * .04, -.02 - u * .2, s * (.27 + .05 * Math.sin(u * 6)) * (wolf ? 1.1 : 1));
    B2([root, v3.lerp(root, tip, .55), tip], [.07 * h, .05 * h, .01 * h], { s: 60 + k * 2 + s, b: 10, dry: .4, tail: .7, ink: k > 8 * P.ruff - 3 ? '#5c5f66' : P.body });
  }
  // pale cheeks (tiger: white patches under the eyes; wolf: a pale mask)
  for (const s of [-1, 1]) B2([at(.11, .0, s * .06), at(.06, -.07, s * .16), at(-.01, -.1, s * .22)], [.07 * h, .06 * h, .02 * h], { s: 80 + s, b: 12, ink: pale, a: wolf ? .45 : .75, dry: .45, tail: .6 });
  // muzzle: the bridge runs down the middle to a broad nose; whisker pads; jaw
  const nose = at(.16 + .06 * sn2, -.03, 0), padY = -.075;
  B2([at(.08, .13, 0), at(.14, .05, 0), v3.add(nose, v3.mul(U, .02 * h))], [.09 * h, .08 * h, .07 * h], { s: 90, b: 16, dry: .3, tail: .2 });
  const jawA = roar * .85, jd = v3.norm(v3.add(v3.mul(F, Math.cos(jawA)), v3.mul(U, -Math.sin(jawA))));
  const jawRoot = at(.06, -.1, 0), jawTip = v3.mad(jawRoot, jd, (.13 + .05 * sn2) * h);
  if (roar > .05) {
    // the gape: dark, a tongue, two great upper fangs and two lower
    soft3(ctx, v, [at(.08, padY - .02, -.08), at(.15 + .05 * sn2, padY - .03, 0), at(.08, padY - .02, .08), v3.mad(jawTip, X, .06 * h), v3.mad(jawTip, X, -.06 * h)], dark);
    blob(ctx, v, v3.lerp(jawRoot, jawTip, .55), .035 * h, '#6a6266');
    brush(ctx, v, [jawRoot, v3.lerp(jawRoot, jawTip, .6), jawTip], [.13 * h, .11 * h, .07 * h], { seed: sd + 7, bristles: 14, dry: .3, tail: .3, ink: P.body });
    if (front > .3) blob(ctx, v, v3.mad(jawTip, U, -.01 * h), .02 * h, pale, { sx: 1.4 });                // chin
    for (const s of [-1, 1]) {
      const fu = at(.13 + .04 * sn2, padY - .03, s * .045); taper(ctx, v, [fu, v3.mad(v3.mad(fu, U, -.085 * h * roar), F, -.01 * h)], .028 * h, '#f4f3ee');
      const fl = v3.mad(v3.mad(jawTip, X, s * .04 * h), F, -.02 * h); taper(ctx, v, [fl, v3.mad(fl, v3.norm(v3.add(U, v3.mul(F, -.3))), .06 * h * roar)], .022 * h, '#f4f3ee');
    }
  } else { brush(ctx, v, [jawRoot, jawTip], [.12 * h, .08 * h], { seed: sd + 7, bristles: 12, dry: .3, tail: .3, ink: P.body }); if (front > .3) blob(ctx, v, v3.mad(jawTip, U, -.01 * h), .025 * h, pale); }
  for (const s of [-1, 1]) {
    const pad = at(.14 + .05 * sn2, padY, s * .05);
    B2([v3.mad(pad, X, -s * .02 * h), v3.mad(v3.mad(pad, X, s * .03 * h), U, -.01 * h)], [.06 * h, .04 * h], { s: 120 + s, b: 10, ink: '#d7d9dc', dry: .3, tail: .5, entry: .3 });
    for (let k = 0; k < 3; k++) blob(ctx, v, v3.add(pad, v3.add(v3.mul(X, s * (.012 + .014 * k) * h), v3.mul(U, (.006 - (k % 2) * .01) * h))), .004 * h, dark);
  }
  soft3(ctx, v, [v3.add(nose, v3.mul(X, -.045 * h)), v3.add(nose, v3.mul(X, .045 * h)), v3.add(v3.add(nose, v3.mul(U, -.04 * h)), v3.mul(F, .01 * h))], dark);   // nose
  // forehead markings
  if (P.stripes) for (let k = 0; k < 4; k++) { const y = .12 + k * .03; B2([at(.09, y, -.07 + k * .012), at(.1, y + .012, 0), at(.09, y, .07 - k * .012)], .016 * h, { s: 100 + k, b: 6, ink: pale, a: .8, tail: .4, entry: .3 }); }
  // eyes: slanted almonds (inner corner low), pale with a dark slit, a heavy brow, a pale spot above (tiger)
  for (const s of [-1, 1]) {
    const inner = at(.13, .045, s * .03), outer = at(.1, .085, s * .105), mid = v3.lerp(inner, outer, .5);
    if (!facing(v, mid, v3.add(F, v3.mul(X, s * .9)))) continue;
    if (P.stripes) blob(ctx, v, at(.105, .135, s * .07), .022 * h, pale);
    soft3(ctx, v, [v3.mad(inner, F, .005), v3.add(mid, v3.mul(U, .024 * h)), outer, v3.add(mid, v3.mul(U, -.014 * h))], '#ece8da');
    blob(ctx, v, v3.add(mid, v3.mul(X, -s * .004 * h)), .011 * h, dark, { sy: 1.6 });
    B2([v3.add(inner, v3.mul(U, .012 * h)), v3.add(mid, v3.mul(U, .034 * h)), v3.add(outer, v3.mul(U, .022 * h))], .022 * h, { s: 110 + s, b: 8, ink: dark, dry: .2, tail: .5 });
  }
  // whiskers
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const w0 = at(.15 + .05 * sn2, padY + .005 - k * .01, s * .07); line3(ctx, v, [w0, v3.add(w0, v3.add(v3.mul(X, s * .24 * h), v3.add(v3.mul(U, (-.05 + k * .03) * h), v3.mul(F, -.05 * h))))], .0035, 'rgba(236,238,240,.8)'); }
}

// ================= serpent (dragon · koi) =================
// path: { pts } (e.g. a ribbon or I.path(...)); along = metres of the path the head has travelled
export function serpent(P, path, list, o = {}) {
  P = { ...PRESET.dragon, ...P };
  const pts = path.pts, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + v3.dist(pts[i], pts[i - 1]));
  const total = cum[cum.length - 1];
  const at = d => { d = clamp(d, 0, total); let i = 0, lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; } i = lo; const k = (d - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]); return v3.lerp(pts[i], pts[Math.min(pts.length - 1, i + 1)], k); };
  const K = list || [{ t: 0 }];
  const B = {
    P, seed: o.seed || 9, total, at,
    pose(t) { const g = (k, d) => keys(K, t, k, d); return { along: g('along', P.len), form: g('form', 1), roar: g('roar', 0), wave: g('wave', 1) }; },
    state(t) {
      const p = this.pose(t), n = 56, body = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), d = p.along - u * P.len;
        let q = d < 0 ? v3.mad(at(0), v3.norm(v3.sub(at(0), at(.3))), d) : at(d);   // before the path start: extend backward
        body.push(q);
      }
      // a travelling undulation perpendicular to the path, in its local plane
      const frames = transport(body);
      for (let i = 0; i < n; i++) { const u = i / (n - 1), w = Math.sin(u * 9 - t * 4.5) * .16 * p.wave * Math.sin(Math.PI * Math.min(1, u * 1.4)); body[i] = v3.add(body[i], v3.add(v3.mul(frames[i].n, w), v3.mul(frames[i].b, w * .5))); }
      return { t, p, body, frames: transport(body), form: p.form, roar: p.roar };
    },
    center: st => st.body[Math.floor(st.body.length * .3)],
    shadow: st => [],
    draw(ctx, v, st, film) {
      layered(ctx, v, film, st.form, this.seed, this.center(st), x => drawSerpent(x, v, this, st));
      // ink smoke streaming off the body: soft sprites along it, drifting back and up, more of them while it forms
      if (P.smoke !== 0) { const n = st.body.length; ctx.save();
        for (let i = 2; i < n; i += 2) { const q = st.body[i], f = st.frames[i], u = i / (n - 1), hh = hash(i, this.seed);
          const drift = (st.t * .7 + hh) % 1, p = v3.add(q, v3.add(v3.mul(f.t, drift * .9), v3.add(v3.mul(f.b, (hh - .3) * P.r * 2.4 + drift * .5), v3.mul(f.n, (hash(i, 3) - .5) * P.r * 2))));
          const s2 = v.p(p); if (!s2) continue; const r = P.r * (1.6 + drift * 2.2) * v.k(s2[2]);
          ctx.globalAlpha = (P.smoke ?? .16) * Math.sin(Math.PI * drift) * (1.6 - st.form * .7) * (1 - u * .4) * Math.min(1, st.form * 3);
          ctx.drawImage(film.smoke[i % film.smoke.length], s2[0] - r, s2[1] - r, r * 2, r * 2); }
        ctx.restore(); }
    },
  };
  return B;
}
// parallel-transport frames along a polyline: tangent t, normal n, binormal b (b starts near world up)
function transport(pts) {
  const n = pts.length, out = [];
  let tan = v3.norm(v3.sub(pts[0], pts[1])), b = v3.norm(v3.sub([0, 1, 0], v3.mul(tan, tan[1]))); if (!isFinite(b[0]) || v3.len(b) < .1) b = [1, 0, 0];
  for (let i = 0; i < n; i++) {
    const t2 = v3.norm(v3.sub(pts[Math.max(0, i - 1)], pts[Math.min(n - 1, i + 1)]));
    b = v3.norm(v3.sub(b, v3.mul(t2, v3.dot(b, t2))));
    // lean the frame back toward world up so the belly stays roughly downward
    b = v3.norm(v3.lerp(b, v3.norm(v3.sub([0, 1, 0], v3.mul(t2, t2[1]))), .15));
    out.push({ t: t2, b, n: v3.norm(v3.cross(t2, b)) });
  }
  return out;
}
function drawSerpent(ctx, v, B, st) {
  const P = B.P, body = st.body, fr = st.frames, n = body.length, t = st.t;
  const fat = P.fat || 1;
  const rad = body.map((_, i) => { const u = i / (n - 1); return P.r * fat * (u < .06 ? .75 + u * 4 : 1) * Math.pow(1 - Math.max(0, u - .35) / .65, P.legs ? .9 : .6) * (P.fins ? (1 - .5 * Math.max(0, u - .7) / .3) : 1) + .015; });
  const cam = cpos(v);
  // split the body into chunks for depth sorting against itself (a coiling dragon passes in front of itself)
  const parts = [], add = (p, fn) => parts.push({ z: depth(v, p), fn });
  const C = 7, per = Math.ceil(n / C);
  for (let c = 0; c < C; c++) {
    const a = Math.max(0, c * per - 1), b = Math.min(n - 1, (c + 1) * per);
    const seg = body.slice(a, b + 1), rs = rad.slice(a, b + 1), fs = fr.slice(a, b + 1);
    add(seg[Math.floor(seg.length / 2)], () => {
      tube(ctx, v, seg, rs.map(r => r * .85), P.base || '#1a1a1d', { cap: c === C - 1 });
      brush(ctx, v, seg, rs.map(r => r * 2.05), { dry: .3, seed: B.seed + c, bristles: 50, tail: c === C - 1 ? .5 : 0, entry: 0, ink: P.body || P.wash, n: seg.length * 2 });
      // pale belly plates along the underside, a rim of light along the back
      brush(ctx, v, seg.map((p, j) => v3.mad(p, fs[j].b, -rs[j] * .55)), rs.map(r => r * .75), { wash: 1, tone: .5, dry: .45, seed: B.seed + 20 + c, bristles: 16, tail: 0, entry: 0, ink: P.belly, n: seg.length * 2 });
      brush(ctx, v, seg.map((p, j) => v3.mad(p, fs[j].b, rs[j] * .72)), rs.map(r => r * .18), { wash: 1, dry: .5, seed: B.seed + 40 + c, bristles: 6, tail: 0, entry: 0, ink: P.hi || '#9a9ea5', n: seg.length * 2 });
      // belly plate lines
      for (let j = 0; j < seg.length; j++) { if ((a + j) % 2) continue; const p = v3.mad(seg[j], fs[j].b, -rs[j] * .7); mark(ctx, v, [v3.mad(p, fs[j].n, -rs[j] * .45), v3.mad(p, fs[j].b, -rs[j] * .12), v3.mad(p, fs[j].n, rs[j] * .45)], rs[j] * .12, '#6c6f75', .75); }
      // scales: small lighter arcs on the camera-facing flank
      if (P.scales) for (let j = 0; j < seg.length; j++) for (let k = 0; k < 3; k++) {
        const ang = -.4 + k * .55 + ((a + j) % 2) * .27, sd = v3.dot(fs[j].n, v3.sub(cam, seg[j])) > 0 ? 1 : -1;
        const nrm = v3.norm(v3.add(v3.mul(fs[j].b, Math.cos(ang)), v3.mul(fs[j].n, sd * Math.sin(ang))));
        const p = v3.mad(seg[j], nrm, rs[j] * 1.01), w = rs[j] * .28;
        mark(ctx, v, [v3.mad(v3.mad(p, fs[j].t, w * .4), fs[j].b, w * .5), v3.mad(p, fs[j].t, -w * .3), v3.mad(v3.mad(p, fs[j].t, w * .4), fs[j].b, -w * .5)], rs[j] * .07, '#a9adb3', .55);
      }
      // dorsal crest: spikes along the top, raked back
      if (P.crest) for (let j = 1; j < seg.length; j++) { const i = a + j, u = i / (n - 1); if (u < .08 || u > .95 || i % 2) continue; const p = v3.mad(seg[j], fs[j].b, rs[j] * .85), L = .25 + .3 * hash(i, 4) * hash(i, 5) * 2; brush(ctx, v, [p, v3.add(p, v3.add(v3.mul(fs[j].b, rs[j] * L), v3.mul(fs[j].t, -rs[j] * .9)))], [rs[j] * .3, rs[j] * .04], { dry: .45, seed: B.seed + 400 + i, bristles: 8, tail: .5, ink: P.back }); }
      if (P.fins && a < n * .55 && b > n * .25) { const i = Math.floor(n * .35) - a; if (i >= 0 && i < seg.length) { const p = v3.mad(seg[i], fs[i].b, rs[i]); soft3(ctx, v, [p, v3.add(p, v3.add(v3.mul(fs[i].b, P.r * 1.2), v3.mul(fs[i].t, -P.r * 1.6))), v3.add(p, v3.mul(fs[i].t, -P.r * 2.2))], P.back); } }
    });
  }
  // legs with claws (dragon): two pairs, paddling
  if (P.legs) for (const [u, s, ph] of [[.18, 1, 0], [.18, -1, .5], [.5, 1, .3], [.5, -1, .8]]) {
    const i = Math.round(u * (n - 1)), p = body[i], f = fr[i], cyc = Math.sin(t * 3.2 + ph * TAU);
    const sh = v3.mad(p, f.n, s * rad[i] * .7);
    const el = v3.add(sh, v3.add(v3.mul(f.n, s * .35), v3.add(v3.mul(f.b, -.25), v3.mul(f.t, .15 + cyc * .2))));
    const paw = v3.add(el, v3.add(v3.mul(f.n, s * .1), v3.add(v3.mul(f.b, -.3), v3.mul(f.t, .25 + cyc * .15))));
    add(el, () => {
      tube(ctx, v, [sh, el, paw], [.11, .07, .05], P.wash);
      for (let k = 0; k < 4; k++) { const a = (k - 1.5) * .45, dirc = v3.norm(v3.add(v3.mul(f.t, Math.cos(a)), v3.mul(f.n, s * Math.sin(a)))); const c1 = v3.mad(paw, dirc, .1), c2 = v3.add(c1, v3.mul(f.b, -.08)); taper(ctx, v, [paw, c1, c2], .035, '#0b0b0c', { pow: .8 }); }
      for (let k = 0; k < 3; k++) mark(ctx, v, [el, v3.add(el, v3.add(v3.mul(f.t, -.22 - k * .05), v3.mul(f.b, .06 * k)))], .04, P.belly, .8);   // elbow tufts
    });
  }
  // tail tuft: a fan of flame-like strokes
  { const p = body[n - 1], f = fr[n - 1]; add(p, () => { for (let k = 0; k < 7; k++) { const a = (k - 3) * .28 + sn(t * 2 + k, 3) * .15; const d = v3.norm(v3.add(v3.mul(f.t, -Math.cos(a)), v3.mul(f.b, Math.sin(a)))); const e = v3.mad(p, d, P.fins ? P.r * 2.6 : .7 + .3 * hash(k, 2)); taper(ctx, v, [p, v3.add(v3.lerp(p, e, .5), v3.mul(f.n, sn(t * 3 + k, 1) * .1)), e], P.fins ? P.r * .9 : .09, k % 2 ? P.back : P.wash, { pow: .8 }); } }); }
  // head
  add(body[0], () => drawSerpentHead(ctx, v, B, st, rad[0]));
  parts.sort((a, b) => b.z - a.z); for (const p of parts) p.fn();
}
function drawSerpentHead(ctx, v, B, st, r0) {
  const P = B.P, t = st.t, f = st.frames[0], c = st.body[0];
  const F = f.t, U = f.b, X = f.n, roar = st.roar;
  const h = P.r / .26 * (P.fins ? .9 : 1.1);
  const at = (fx, uy, xs) => v3.add(c, v3.mul(v3.add(v3.add(v3.mul(F, fx), v3.mul(U, uy)), v3.mul(X, xs)), h));
  if (P.fins) {   // koi: rounded head, barbels, pectoral fins
    blob(ctx, v, at(.1, 0, 0), .26 * h, P.wash); blob(ctx, v, at(.22, -.04, 0), .16 * h, P.belly);
    for (const s of [-1, 1]) { blob(ctx, v, at(.18, .06, s * .14), .03 * h, '#0b0b0c'); taper(ctx, v, [at(.3, -.08, s * .06), at(.38, -.2, s * .14), at(.36, -.32, s * .2)], .02 * h, P.back); soft3(ctx, v, [at(-.15, -.15, s * .2), at(-.35, -.45, s * .55), at(-.5, -.2, s * .45)], P.back); }
    return;
  }
  // mane: flame-like wisps streaming back from the head and neck
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU, root = at(-.15 - (k % 4) * .1, Math.cos(a) * .18, Math.sin(a) * .2);
    const tip = v3.add(root, v3.add(v3.mul(F, -.55 - hash(k, 2) * .35), v3.add(v3.mul(U, Math.cos(a) * .2 + .1), v3.mul(X, Math.sin(a) * .25 + sn(t * 2 + k, 4) * .1))));
    brush(ctx, v, [root, v3.add(v3.lerp(root, tip, .5), v3.mul(U, .08)), tip], [.12 * h, .08 * h, .01], { dry: .4, seed: B.seed + 300 + k, bristles: 12, tail: .5, ink: k % 3 ? (P.body || P.wash) : '#6d7178' });
  }
  // antlers: branching, raked back
  if (P.antlers) for (const s of [-1, 1]) {
    const a0 = at(-.05, .2, s * .12), a1 = v3.add(a0, v3.add(v3.mul(U, .35 * h), v3.add(v3.mul(F, -.35 * h), v3.mul(X, s * .12 * h)))), a2 = v3.add(a1, v3.add(v3.mul(U, .15 * h), v3.add(v3.mul(F, -.4 * h), v3.mul(X, s * .1 * h))));
    taper(ctx, v, [a0, a1, a2], .07 * h, '#1d1d20', { pow: .7 });
    const b1 = v3.lerp(a0, a1, .6); taper(ctx, v, [b1, v3.add(b1, v3.add(v3.mul(U, .2 * h), v3.mul(F, .05 * h)))], .04 * h, '#1d1d20');
    const b2 = v3.lerp(a1, a2, .5); taper(ctx, v, [b2, v3.add(b2, v3.add(v3.mul(U, .16 * h), v3.mul(X, s * .05 * h)))], .035 * h, '#1d1d20');
  }
  // skull, brow ridges, long snout; the jaw opens with roar
  blob(ctx, v, at(0, .02, 0), .23 * h, P.body || P.wash);
  tube(ctx, v, [at(.05, .05, 0), at(.32, .02, 0), at(.48, -.02, 0)], [.17, .13, .1].map(x => x * h), P.body || P.wash);
  for (const s2 of [-1, 1]) mark(ctx, v, [at(.1, .08, s2 * .1), at(.45, .02, s2 * .06)], .025 * h, P.hi || '#999', .7);
  tube(ctx, v, [at(.1, .12, 0), at(.4, .05, 0)], [.06, .035].map(x => x * h), P.back);
  const ja = .15 + roar * .7, jd = v3.norm(v3.add(v3.mul(F, Math.cos(ja)), v3.mul(U, -Math.sin(ja))));
  const j0 = at(.05, -.1, 0), j1 = v3.mad(j0, jd, .42 * h);
  soft3(ctx, v, [at(.08, -.06, -.09), at(.46, -.06, 0), at(.08, -.06, .09), v3.mad(j1, X, .06 * h), v3.mad(j1, X, -.06 * h)], '#09090a');
  tube(ctx, v, [j0, v3.lerp(j0, j1, .6), j1], [.09, .07, .05].map(x => x * h), P.body || P.wash);
  for (let k = 0; k < 5; k++) { const u = .25 + k * .17; for (const s of [-1, 1]) { const tt = v3.mad(v3.lerp(at(.05, -.08, 0), at(.46, -.06, 0), u), X, s * .06 * h); taper(ctx, v, [tt, v3.mad(tt, U, -.06 * h)], .025 * h, '#f2f0ea'); const tb = v3.mad(v3.lerp(j0, j1, u), X, s * .05 * h); taper(ctx, v, [tb, v3.mad(tb, U, .05 * h * (1 - ja * .3))], .02 * h, '#f2f0ea'); } }
  // eyes: bright, with a dark pupil and a heavy brow
  for (const s of [-1, 1]) {
    const e = at(.18, .1, s * .13);
    if (!facing(v, e, v3.add(F, v3.mul(X, s * .8)))) continue;
    blob(ctx, v, e, .045 * h, '#f4f2ea'); blob(ctx, v, v3.mad(e, F, .01), .02 * h, '#08080a');
    taper(ctx, v, [at(.1, .18, s * .1), at(.25, .14, s * .16), at(.3, .1, s * .12)], .06 * h, P.back, { pow: .6 });
  }
  // whiskers: long trailing barbels from the snout tip that stream back along where the head has been
  if (P.whiskers) for (const s of [-1, 1]) {
    const root = at(.42, 0, s * .06), pts = [root];
    for (let j = 1; j <= 8; j++) { const u = j / 8; pts.push(v3.add(root, v3.add(v3.mul(F, -1.6 * u * h), v3.add(v3.mul(X, s * (.25 * u + .15 * Math.sin(u * 5 + t * 3)) * h), v3.mul(U, (-.2 * u + .1 * Math.sin(u * 4 - t * 2.5)) * h))))); }
    taper(ctx, v, pts, .03 * h, '#1b1b1e', { pow: .7 });
  }
}

// ================= bird (crane · phoenix) =================
export function bird(P, path, list, o = {}) {
  P = { ...PRESET.crane, ...P };
  const pts = path.pts, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + v3.dist(pts[i], pts[i - 1]));
  const total = cum[cum.length - 1];
  const at = d => { d = clamp(d, 0, total); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; } const k = (d - cum[lo]) / Math.max(1e-6, cum[lo + 1] - cum[lo]); return v3.lerp(pts[lo], pts[Math.min(pts.length - 1, lo + 1)], k); };
  const K = list || [{ t: 0 }];
  return {
    P, seed: o.seed || 13, total,
    state(t) {
      const g = (k, d) => keys(K, t, k, d), along = g('along', 0), form = g('form', 1), flap = g('flap', 1.6), glide = g('glide', 0);
      const p = at(along), ahead = at(Math.min(total, along + .3)), behind = at(Math.max(0, along - .3));
      let F = v3.norm(v3.sub(ahead, behind)); if (!isFinite(F[0])) F = [0, 0, 1];
      const X = v3.norm(v3.cross([0, 1, 0], F)), U = v3.norm(v3.cross(F, X));
      // the flap phase integrates the flap rate; a glide holds the wings out
      const ph = (o.phase || 0) + t * flap, beat = Math.sin(ph * TAU) * (1 - glide);
      return { t, p, F, X, U, beat, ph, form, glide };
    },
    center: st => st.p,
    shadow: () => [],
    draw(ctx, v, st, film) { layered(ctx, v, film, st.form, this.seed, st.p, x => drawBird(x, v, this, st)); },
  };
}
function drawBird(ctx, v, B, st) {
  const P = B.P, { p, F, X, U, beat } = st, sp = P.span / 2;
  const parts = [], add = (q, fn) => parts.push({ z: depth(v, q), fn });
  const L = (f, u, x) => v3.add(p, v3.add(v3.add(v3.mul(F, f), v3.mul(U, u)), v3.mul(X, x)));
  // body + neck + head
  add(p, () => {
    tube(ctx, v, [L(-P.body * .55, 0, 0), L(0, .02, 0), L(P.body * .45, .04, 0)], [.09, .13, .1], P.body0);
    tube(ctx, v, [L(-P.body * .5, -.05, 0), L(P.body * .3, -.04, 0)], [.06, .07], P.shade);
    const n1 = L(P.body * .45, .05, 0), n2 = L(P.body * .45 + P.neck * .5, .08, 0), hd = L(P.body * .45 + P.neck, .06, 0);
    tube(ctx, v, [n1, n2, hd], [.06, .035, .04], P.plumes ? P.body0 : '#1b1b1e');
    blob(ctx, v, hd, .05, P.plumes ? P.body0 : P.body0);
    if (!P.plumes) blob(ctx, v, v3.add(hd, v3.mul(U, .035)), .022, '#2a2a2e');        // crown
    taper(ctx, v, [v3.mad(hd, F, .03), v3.mad(hd, F, .03 + P.beak)], .03, '#3b3b3f');
    // tail and trailing legs
    if (P.plumes) for (let k = 0; k < 5; k++) { const a = (k - 2) * .18, e = L(-P.body * .5 - P.tail * (.7 + .3 * hash(k, 2)), -.1 + Math.sin(st.ph * TAU * .5 + k) * .15, a * P.tail); taper(ctx, v, [L(-P.body * .5, 0, 0), v3.add(v3.lerp(L(-P.body * .5, 0, 0), e, .5), v3.mul(U, .12)), e], .12, k % 2 ? P.tips : P.shade, { pow: .7 }); }
    else for (let k = 0; k < 5; k++) taper(ctx, v, [L(-P.body * .5, 0, 0), L(-P.body * .5 - P.tail, -.03, (k - 2) * .04)], .05, P.tips);
    if (P.legs) for (const s of [-1, 1]) line3(ctx, v, [L(-P.body * .3, -.08, s * .04), L(-P.body * .5 - .45, -.12, s * .05), L(-P.body * .5 - .6, -.1, s * .05)], .012, '#2b2b2e');
  });
  // wings: arm → wrist → tip; primaries fan from the wrist, secondaries line the arm
  for (const s of [-1, 1]) {
    const lift = beat * .9, fold = .15 - beat * .1;
    const sh = L(P.body * .15, .05, s * .08);
    const wr = v3.add(sh, v3.add(v3.mul(X, s * sp * .45 * Math.cos(lift * .7)), v3.add(v3.mul(U, sp * .45 * Math.sin(lift * .7)), v3.mul(F, -fold))));
    const tipDir = v3.norm(v3.add(v3.mul(X, s * Math.cos(lift)), v3.add(v3.mul(U, Math.sin(lift)), v3.mul(F, -.35))));
    add(wr, () => {
      const nf = 11;
      for (let k = 0; k < nf; k++) {
        const u = k / (nf - 1), base = v3.lerp(wr, sh, u * .95);
        const d = v3.norm(v3.add(v3.mul(tipDir, 1 - u), v3.mul(F, -u * 1.1)));
        const len = sp * (.62 - u * .32) * (k < 6 ? 1 : .85), e = v3.mad(base, d, len);
        const mid = v3.add(v3.lerp(base, e, .5), v3.mul(U, -.03 - beat * .05));
        taper(ctx, v, [base, mid, e], .14 - u * .04, k < 6 ? P.tips : P.body0, { pow: .55 });
        if (k < 6 && !P.plumes) taper(ctx, v, [base, v3.lerp(base, mid, .9)], .11, P.body0, { pow: .6 });   // white base, black tips
      }
      tube(ctx, v, [sh, wr], [.06, .04], P.body0);
      line3(ctx, v, [sh, wr], .012, P.shade);
    });
  }
  parts.sort((a, b) => b.z - a.z); for (const q of parts) q.fn();
}
