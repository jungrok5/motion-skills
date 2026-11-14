// ink-water-emergence · paint.js — the camera, and the painter that draws a posed body into the "form" canvas the water
// renderer reads. Colours here are not colours but three channels:
//   R = ink density of the finished form    G = coverage (255 inside the body)    B = emission (how much smoke it sheds)
// Parts are depth-sorted (far first), so the near legs, the near eye and the near fang are drawn over the body from any
// camera angle — front, 3/4, side, from either direction.
import { clamp, smooth, lerp, v3, rng, hash, TAU } from './core.js';

// ---------- camera: an orbit around `at` ----------
// c = { at: [x, y, z], yaw (deg, 0 = camera on the +z side looking toward -z), pitch (deg, + looks down), dist, fov (deg), roll (deg) }
export function camera(c, W, H, m = 0) {
  const yaw = (c.yaw || 0) * Math.PI / 180, pitch = (c.pitch || 0) * Math.PI / 180, dist = c.dist || 4, fov = (c.fov || 30) * Math.PI / 180;
  const at = c.at || [0, .6, 0];
  const pos = [at[0] + Math.sin(yaw) * Math.cos(pitch) * dist, at[1] + Math.sin(pitch) * dist, at[2] + Math.cos(yaw) * Math.cos(pitch) * dist];
  const f = v3.norm(v3.sub(at, pos));
  let r = v3.norm(v3.cross(f, [0, 1, 0])), u = v3.cross(r, f);
  const roll = (c.roll || 0) * Math.PI / 180;
  if (roll) { const cr = Math.cos(roll), sr = Math.sin(roll); [r, u] = [v3.add(v3.mul(r, cr), v3.mul(u, sr)), v3.sub(v3.mul(u, cr), v3.mul(r, sr))]; }
  const focal = H / 2 / Math.tan(fov / 2), ox = W * m, oy = H * m;
  const project = (p) => {
    const d = v3.sub(p, pos), z = Math.max(.05, v3.dot(d, f));
    return [ox + W / 2 + v3.dot(d, r) / z * focal, oy + H / 2 - v3.dot(d, u) / z * focal, z, focal / z];
  };
  // the water renderer anchors its noise to "world" coordinates in the camera plane through `at`
  const h = 2 * dist * Math.tan(fov / 2);
  return { project, pos, f, r, u, focal, W, H, m, uni: { x: v3.dot(at, r) + yaw * dist * .0, y: v3.dot(at, u), h }, toCam: (p) => v3.norm(v3.sub(pos, p)) };
}

// ---------- the look: densities and emissions of each kind of part ----------
export const LOOK = {
  body: .14, under: .58,       // pale wash on top, darker underneath
  chest: .2, leg: .18, paw: .5, claw: 1,
  mane: .8, maneCurls: .82, tail: .8, tuft: .85,
  face: .2, muzzle: .16, nose: .95, brow: .95, eyeRing: 1, pupil: 1, mouth: .97,
  line: .42, lineW: .008,       // ink outline (world units)
  blotch: .85, blotches: 14,   // dark pooled patches on the body
  shadow: .32,
  emit: { body: .3, mane: .75, tail: .9, leg: .3, face: .3, fin: .6 },
  sweep: { from: 'head', spread: .7 },   // which parts condense first
};

const col = (d, g, b) => `rgb(${Math.round(clamp(d) * 255)},${Math.round(clamp(g) * 255)},${Math.round(clamp(b) * 255)})`;
const cola = (d, g, b, a) => `rgba(${Math.round(clamp(d) * 255)},${Math.round(clamp(g) * 255)},${Math.round(clamp(b) * 255)},${a})`;

// tapered capsule between two screen circles
function capsulePath(ctx, A, B, ra, rb) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6;
  if (L <= Math.abs(ra - rb)) { const [c, r] = ra > rb ? [A, ra] : [B, rb]; ctx.moveTo(c[0] + r, c[1]); ctx.arc(c[0], c[1], r, 0, TAU); return; }
  const a = Math.atan2(dy, dx), off = Math.acos(clamp((ra - rb) / L, -1, 1));
  ctx.moveTo(A[0] + Math.cos(a + off) * ra, A[1] + Math.sin(a + off) * ra);
  ctx.arc(A[0], A[1], ra, a + off, a - off + TAU, false);
  ctx.arc(B[0], B[1], rb, a - off, a + off, false);
  ctx.closePath();
}
// a spiral curl (the shishi / karajishi swirl): centre, radius, turns, direction, start angle
function curlPath(ctx, c, r, w, turns, dir, a0, d, g, b) {
  const N = Math.max(10, Math.round(26 * turns));
  let px = null, py = null;
  for (let i = 0; i <= N; i++) {
    const k = i / N, th = a0 + dir * k * turns * TAU, rr = r * (1 - .82 * k);
    const x = c[0] + Math.cos(th) * rr, y = c[1] + Math.sin(th) * rr;
    if (px !== null) { ctx.lineWidth = Math.max(.6, w * (1 - k) ** .7 * (k < .08 ? .5 + k * 6 : 1)); ctx.strokeStyle = col(d, g, b); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
    px = x; py = y;
  }
}

// a flame-shaped brush stroke: from base c, heading a0, length len, width w; the centreline bends more and more toward the
// tip (bend in turns; ± = direction), so a big bend ends in a curl. The stroke swells near the base and tapers to a point.
function flame(ctx, c, len, w, a0, bend, d, g, b) {
  const N = 18, L = [], Rr = []; let x = c[0], y = c[1], th = a0;
  const ds = len / N;
  for (let i = 0; i <= N; i++) {
    const k = i / N, wk = w * Math.sin(Math.PI * Math.min(1, .04 + k * .96)) ** .55 * (1 - .35 * k) * 1.3;
    const nx = -Math.sin(th), ny = Math.cos(th);
    L.push([x + nx * wk, y + ny * wk]); Rr.push([x - nx * wk, y - ny * wk]);
    th += bend * TAU * 1.6 * (k ** 1.5) / N * 1.9; x += Math.cos(th) * ds; y += Math.sin(th) * ds;
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath();
  ctx.fillStyle = col(d, g, b); ctx.fill();
}

// ---------- paint one frame ----------
// frame = { cam (from camera()), creatures: [{ pose, look, e (0…1), seed }], ground: true }
export function paintForm(ctx, frame) {
  const { cam } = frame, FW = ctx.canvas.width, FH = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const cr of frame.creatures) paintCreature(ctx, cam, cr, frame);
}

function partE(E, order, sweep) {
  const sp = sweep.spread ?? .7;
  const pos = sweep.from === 'tail' ? 1 - order : sweep.from === 'center' ? Math.abs(order - .5) * 2 : sweep.from === 'all' ? 0 : order;
  return clamp(E * (1 + sp) - pos * sp);
}

function paintCreature(ctx, cam, cr, frame) {
  const look = { ...LOOK, ...(cr.look || {}), emit: { ...LOOK.emit, ...((cr.look || {}).emit || {}) }, sweep: { ...LOOK.sweep, ...((cr.look || {}).sweep || {}) } };
  const E = clamp(cr.e ?? 1), pose = cr.pose, seed = cr.seed || 1;
  if (E <= 0) return;
  const P = cam.project;
  const items = []; // { z, draw() }
  const add = (z, draw) => items.push({ z, draw });
  const pe = (order) => partE(E, order, look.sweep);
  // densities scale with the part's own emergence; emission rises earlier than density so smoke shows the shape first
  const D = (d, order) => d * smooth(.05, 1, pe(order));
  const G = (order) => pe(order) > .015 ? 1 : 0;
  const B = (em, order) => em * smooth(0, .35, pe(order) + .12);
  const lw = (z) => Math.max(.7, look.lineW * cam.focal / z);

  // ground shadow (no coverage, no emission — it never smokes)
  if (pose.body.kind === 'quadruped' && frame.ground !== false) {
    const c = [pose.root[0] * .5 + pose.withers[0] * .5, 0, pose.root[2] * .5 + pose.withers[2] * .5];
    const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; const fw = pose.forward; pts.push(P([c[0] + fw[0] * Math.cos(a) * pose.length * .62 - fw[2] * Math.sin(a) * .42, 0, c[2] + fw[2] * Math.cos(a) * pose.length * .62 + fw[0] * Math.sin(a) * .42])); }
    const cx = pts.reduce((s, p) => s + p[0], 0) / 24, cy = pts.reduce((s, p) => s + p[1], 0) / 24;
    ctx.save(); ctx.translate(cx, cy);
    const rx = Math.max(...pts.map(p => Math.abs(p[0] - cx))), ry = Math.max(2, Math.max(...pts.map(p => Math.abs(p[1] - cy))));
    ctx.scale(1, ry / rx);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, cola(look.shadow * E, 0, 0, 1)); gr.addColorStop(.55, cola(look.shadow * .5 * E, 0, 0, 1)); gr.addColorStop(1, cola(0, 0, 0, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }

  const R = rng(seed * 7919 + 13);
  for (const part of pose.parts) {
    const o = part.order ?? .5;
    if (part.type === 'cap' || part.type === 'ball') {
      const A = P(part.a || part.p), Bp = P(part.b || part.p), ra = (part.ra || part.r) * A[3], rb = (part.rb || part.r) * Bp[3];
      const z = (A[2] + Bp[2]) / 2;
      const top = look[part.tone] ?? look.body;
      const blot = []; const n = part.id === 'torso' ? look.blotches : part.id === 'belly' || part.id === 'chest' ? Math.round(look.blotches / 3) : 0;
      for (let i = 0; i < n; i++) blot.push([R(), R() * 2 - 1, .3 + R() * .7, R()]);
      add(z, () => {
        ctx.beginPath(); capsulePath(ctx, A, Bp, ra, rb);
        const y0 = Math.min(A[1] - ra, Bp[1] - rb), y1 = Math.max(A[1] + ra, Bp[1] + rb);
        const gr = ctx.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, col(D(top * .7, o), G(o), B(look.emit.body, o))); gr.addColorStop(.55, col(D(top, o), G(o), B(look.emit.body, o)));
        gr.addColorStop(1, col(D(look.under, o), G(o), B(look.emit.body * 1.6, o)));
        ctx.fillStyle = gr; ctx.fill();
        if (blot.length) { // pooled ink patches, clipped to the part
          ctx.save(); ctx.clip();
          for (const [u, v, s, k] of blot) {
            const c = [lerp(A[0], Bp[0], u), lerp(A[1], Bp[1], u) + v * lerp(ra, rb, u) * .8], r = lerp(ra, rb, u) * (.35 + .55 * s);
            const g2 = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
            g2.addColorStop(0, cola(D(look.blotch * (.6 + .4 * k), o), G(o), B(look.emit.body * 2.5, o), .95)); g2.addColorStop(.6, cola(D(look.blotch * .5, o), G(o), B(look.emit.body, o), .5)); g2.addColorStop(1, cola(0, G(o), 0, 0));
            ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 1.4, r, Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) + (k - .5), 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
      });
    } else if (part.type === 'leg') {
      const pts = part.pts.map(P), rr = part.r;
      const z = pts.reduce((s, p) => s + p[2], 0) / pts.length;
      const ord = o;
      const farSide = z > P(pose.root)[2] ? 1 : 0;   // legs on the far side sit in shadow
      const tufts = []; for (let i = 0; i < 3; i++) tufts.push([R(), R()]);
      add(z, () => {
        const dk = farSide ? 1.9 : 1;
        // thigh mass
        const T = pts[0], th = part.thigh * T[3];
        ctx.beginPath(); capsulePath(ctx, T, [lerp(T[0], pts[1][0], .55), lerp(T[1], pts[1][1], .55)], th, rr * 1.35 * pts[1][3]);
        ctx.fillStyle = col(D(look.leg * dk, ord), G(ord), B(look.emit.leg, ord)); ctx.fill();
        // segments
        const rads = [rr * 1.25, rr * .95, rr * .8, rr * .9];
        for (let i = 0; i < 3; i++) {
          const A = pts[i], Bq = pts[i + 1];
          ctx.beginPath(); capsulePath(ctx, A, Bq, rads[i] * A[3], rads[i + 1] * Bq[3]);
          const gr = ctx.createLinearGradient(A[0], A[1], Bq[0], Bq[1]);
          gr.addColorStop(0, col(D(look.leg * dk, ord), G(ord), B(look.emit.leg, ord))); gr.addColorStop(1, col(D(look.paw * dk, ord), G(ord), B(look.emit.leg, ord)));
          ctx.fillStyle = gr; ctx.fill();
          if (!farSide) { ctx.lineWidth = lw(z) * .8; ctx.strokeStyle = col(D(look.line * .8, ord), G(ord), B(.3, ord)); ctx.stroke(); }
        }
        // paw + claws
        const F = pts[3], Tt = pts[4], pr = rr * 1.25 * F[3];
        ctx.beginPath(); capsulePath(ctx, F, [lerp(F[0], Tt[0], .7), lerp(F[1], Tt[1], .7) - pr * .1], pr, pr * .9);
        ctx.fillStyle = col(D(look.paw, ord), G(ord), B(look.emit.leg, ord)); ctx.fill();
        ctx.lineWidth = lw(z) * 1.6; ctx.strokeStyle = col(D(look.claw, ord), G(ord), B(.2, ord));
        const dir = Math.sign(Tt[0] - F[0]) || 1;
        for (let k = 0; k < 3; k++) { const x = lerp(F[0], Tt[0], .55) + dir * pr * (.25 + k * .32), y = F[1] + pr * .55; ctx.beginPath(); ctx.moveTo(x - dir * pr * .1, y - pr * .5); ctx.quadraticCurveTo(x + dir * pr * .45, y - pr * .35, x + dir * pr * .35, y + pr * .05); ctx.stroke(); }
        // flame tufts behind the elbow / hock and at the wrist (guardian-lion fur), sweeping back and down
        if (look.legTufts !== false) {
          for (const [ji, [a, b]] of [[1, tufts[0]], [1, tufts[1]], [2, tufts[2]]]) {
            const J = pts[ji], sz = rr * J[3];
            const base = [J[0] - dir * sz * .6, J[1] + sz * (b - .5)];
            flame(ctx, base, sz * (2.2 + a * 1.4), sz * .55, Math.atan2(.55 + b * .5, -dir), dir * (.35 + a * .4), D(look.tuft, ord), G(ord), B(look.emit.mane, ord));
          }
        }
      });
    } else if (part.type === 'tail') {
      const pts = part.pts.map(P), z = pts.reduce((s, p) => s + p[2], 0) / pts.length;
      const curls = []; for (let i = 0; i < 7; i++) curls.push([R(), R(), R()]);
      add(z, () => {
        for (let i = 0; i < pts.length - 1; i++) {
          const k = i / (pts.length - 1), A = pts[i], Bq = pts[i + 1];
          ctx.beginPath(); capsulePath(ctx, A, Bq, part.r * A[3] * (1 - .4 * k), part.r * Bq[3] * (1 - .4 * (k + 1 / pts.length)));
          ctx.fillStyle = col(D(lerp(look.leg, look.tail, k), o), G(o), B(look.emit.tail, o)); ctx.fill();
        }
        // a flame-shaped tuft at the tip: strokes fanning out along the tail's direction, tips curling
        const T = pts[pts.length - 1], Tp = pts[pts.length - 3], s = part.r * T[3];
        const ang = Math.atan2(T[1] - Tp[1], T[0] - Tp[0]);
        curls.forEach(([a, b, c], i) => {
          // a plume: every stroke leaves the tip in nearly the tail's own direction and they all curl the same way
          const th = ang + (i / (curls.length - 1) - .5) * .9 + (a - .5) * .3, sgn = Math.cos(ang) > 0 ? 1 : -1;
          const base = [T[0] - Math.cos(ang) * s * (3 - i * .3), T[1] - Math.sin(ang) * s * (3 - i * .3)];
          flame(ctx, base, s * (6 + c * 5), s * (.9 + a * .5), th, sgn * (.4 + b * .4), D(look.tuft * (.6 + .4 * c), o), G(o), B(look.emit.tail, o));
        });
      });
    } else if (part.type === 'head') paintHead(ctx, cam, part.head, look, add, D, G, B, o, lw, seed, pose);
    else if (part.type === 'spine') paintSpine(ctx, cam, part, look, add, D, G, B, lw);
    else if (part.type === 'fin' || part.type === 'flukes') paintFin(ctx, cam, part, look, add, D, G, B, lw);
    else if (part.type === 'swimhead') paintSwimHead(ctx, cam, part, look, add, D, G, B, lw, seed);
  }
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.draw();
}

// ---------- the guardian-lion head: mane, face, eyes, brows, nose, jaw, fangs ----------
function paintHead(ctx, cam, h, look, add, D, G, B, o, lw, seed, pose) {
  const P = cam.project, r = h.r * (pose.body.spec.scale || 1);
  const at = (f, u, l) => h.at(f * h.r, u * h.r, l * h.r);   // head-local, in head radii
  const toCam = cam.toCam(h.origin);
  const vis = (f, u, l) => v3.dot(h.dir(f, u, l), toCam);     // > 0 faces the camera
  const R = rng(seed * 31 + 5);
  const ball = (p, rad, d, em, line = true, ord = o) => { const q = P(p); add(q[2], () => { ctx.beginPath(); ctx.arc(q[0], q[1], rad * r * q[3], 0, TAU); ctx.fillStyle = col(D(d, ord), G(ord), B(em, ord)); ctx.fill(); if (line) { ctx.lineWidth = lw(q[2]); ctx.strokeStyle = col(D(look.line, ord), G(ord), B(.3, ord)); ctx.stroke(); } }); return q; };
  const S = pose.body.spec, mane = S.mane ?? 1;
  const C = P(at(.2, 0, 0)); // the face centre on screen: mane strokes radiate from it
  const zH = P(h.origin)[2];   // the mane always sits behind the face, whatever the camera
  const HB = P(at(-2, -.4, 0)), backV = [HB[0] - C[0], HB[1] - C[1]], bl = Math.hypot(backV[0], backV[1]) || 1;
  const flow = (a, k) => Math.atan2(Math.sin(a) * (1 - k) + backV[1] / bl * k, Math.cos(a) * (1 - k) + backV[0] / bl * k); // radial → swept back
  // mane: a soft mass behind the head, then rings of flame strokes radiating from the face, curling at their tips, and
  // more flowing back down the neck over the shoulders
  if (mane > 0) {
    const back = at(-.45, -.1, 0), q = P(back);
    add(q[2], () => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.3 * mane * r * q[3], 0, TAU); ctx.fillStyle = col(D(look.mane * .4, o), G(o), B(look.emit.mane, o)); ctx.fill(); });
    for (let ring = 0; ring < 3; ring++) {
      const nRing = Math.round((20 + ring * 7) * mane);
      for (let i = 0; i < nRing; i++) {
        const a = i / nRing * TAU + R() * .25 + ring * .4, rad = (.9 + ring * .38 + R() * .2) * mane;
        const p = at(-.2 - ring * .18 - R() * .15, Math.cos(a) * rad, Math.sin(a) * rad);
        const q2 = P(p), sz = (.55 + R() * .35 + ring * .12) * mane * r * q2[3];
        const out = Math.atan2(q2[1] - C[1], q2[0] - C[0]), bend = (R() > .5 ? 1 : -1) * (.35 + R() * .45), dd = look.maneCurls * (.35 + .65 * R());
        add(Math.max(q2[2], zH + r * (.35 - ring * .05)), () => flame(ctx, q2, sz * 3.1, sz * .22, flow(out + (R() - .5) * .5, .55 + ring * .1), bend, D(dd, o + .04), G(o), B(look.emit.mane, o)));
      }
    }
    const neckBase = pose.withers;
    for (let i = 0; i < Math.round(30 * mane); i++) {
      const k = R(), side = (R() * 2 - 1);
      const p = v3.add(v3.lerp(h.origin, neckBase, .3 + k * .65), v3.add(v3.mul(h.hl, side * r * 1.15), v3.mul(h.hu, (R() - .2) * r * 1.3)));
      const q2 = P(p), sz = (.5 + R() * .4) * r * q2[3] * mane, toBack = Math.atan2(P(neckBase)[1] - C[1], P(neckBase)[0] - C[0]);
      const bend = (R() > .5 ? 1 : -1) * (.3 + R() * .5), dd = look.maneCurls * (.5 + .5 * R());
      add(Math.max(q2[2] - .002, zH + r * .3), () => flame(ctx, q2, sz * 3.3, sz * .22, toBack + (R() - .5) * 1.4, bend, D(dd, .15), G(.15), B(look.emit.mane, .15)));
    }
  }
  // cranium + cheeks
  ball(at(-.05, .1, 0), .92, look.face, look.emit.face, false);
  ball(at(.35, -.3, .55), .55, look.face, look.emit.face, false); ball(at(.35, -.3, -.55), .55, look.face, look.emit.face, false);
  // ears
  // jaw (opens about a pivot under the cheeks) and mouth
  const ja = h.jaw;
  const jawPt = (f, u, l) => { const c = Math.cos(-ja), s = Math.sin(-ja), pf = .15, pu = -.45; const df = f - pf, du = u - pu; return at(pf + df * c - du * s, pu + df * s + du * c, l); };
  if (ja > .05) {
    const q1 = P(at(1.3, -.5, 0)), q2 = P(jawPt(1.25, -.62, 0)), q0 = P(at(.25, -.5, 0));
    add(Math.min(q1[2], q2[2]) + r * .2, () => {
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.quadraticCurveTo(q1[0], q1[1] - 3, q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.quadraticCurveTo(q2[0] - (q2[0] - q0[0]) * .2, q2[1], q0[0], q0[1]); ctx.closePath();
      ctx.fillStyle = col(D(look.mouth, o), G(o), B(.5, o)); ctx.fill();
    });
  }
  // lower jaw + beard flames hanging from the chin
  ball(jawPt(.75, -.62, 0), .5, look.muzzle * 1.3, look.emit.face, false);
  for (let i = 0; i < 6; i++) { const p = jawPt(.15 + i * .17, -.95, (i - 2.5) * .22), q = P(p), sz = .42 * r * q[3], dn = Math.atan2(P(jawPt(.6, -2, 0))[1] - q[1], P(jawPt(.6, -2, 0))[0] - q[0]); add(q[2] - .001, () => flame(ctx, q, sz * 2, sz * .45, dn + (i - 2.5) * .12, (i % 2 ? 1 : -1) * .5, D(look.maneCurls * .9, o), G(o), B(look.emit.mane, o))); }
  // muzzle and nose
  ball(at(.95, -.25, .3), .55, look.muzzle, look.emit.face, false); ball(at(.95, -.25, -.3), .55, look.muzzle, look.emit.face, false);
  ball(at(.85, .25, 0), .5, look.face * 1.2, look.emit.face, false);   // the bridge of the nose
  // a broad, flat nose and the line of the mouth curling back from it (closed mouth)
  for (const s of [1, -1]) ball(at(1.4, -.04, .2 * s), .2, look.nose, look.emit.face, false);
  ball(at(1.38, .08, 0), .16, look.nose * .8, look.emit.face, false);
  if (ja < .15) for (const s of [1, -1]) {
    // the closed mouth: a short line back from under the nose, turning DOWN at the corner (not a smile)
    const a = P(at(1.38, -.42, .1 * s)), b = P(at(1.15, -.5, .38 * s)), c = P(at(.95, -.72, .5 * s));
    add(Math.min(a[2], b[2]) - r * .3, () => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]); ctx.lineWidth = lw(a[2]) * 2; ctx.strokeStyle = col(D(look.mouth, o), G(o), B(.3, o)); ctx.stroke(); });
  }
  // the cheek ruff: short swept strokes over the rim of the face, so the head never reads as a round ball
  if (mane > 0) for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + .1, p = at(.25, Math.cos(a) * .98, Math.sin(a) * .98), q = P(p), sz = (.32 + R() * .15) * r * q[3];
    const out = Math.atan2(q[1] - C[1], q[0] - C[0]), dd = look.maneCurls * (.45 + .4 * R()), bend = (R() > .5 ? 1 : -1) * .5;
    add(zH - r * .05, () => flame(ctx, q, sz * 2.4, sz * .3, flow(out, .35), bend, D(dd, o), G(o), B(look.emit.mane, o)));
  }
  // fangs (white = no ink) when the jaw is open
  if (ja > .1) for (const s of [1, -1]) {
    if (vis(.5, -.3, s * .7) < -.4) continue;
    const top = P(at(1.25, -.5, .28 * s)), tip = P(at(1.22, -.5 - .55 * ja, .28 * s)), lo = P(jawPt(1.2, -.62, .3 * s)), lt = P(jawPt(1.18, -.62 + .4 * ja, .3 * s));
    add(Math.min(top[2], lo[2]) - .02, () => {
      for (const [a, b] of [[top, tip], [lo, lt]]) { const w = r * a[3] * .09; ctx.beginPath(); ctx.moveTo(a[0] - w, a[1]); ctx.lineTo(a[0] + w, a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fillStyle = col(0, 1, 0); ctx.fill(); ctx.lineWidth = lw(a[2]) * .7; ctx.strokeStyle = col(D(look.line, o), 1, 0); ctx.stroke(); }
    });
  }
  // eyes: bulging, a black ring, white of the eye, a black pupil (only the ones facing the camera)
  for (const s of [1, -1]) {
    const n = vis(.6, .3, .75 * s); if (n < -.15) continue;
    const p = at(.78, .3, .46 * s), q = P(p), er = .2 * r * q[3], squash = clamp(.35 + n * .9, .35, 1);
    const fw = P(at(1.6, .3, .46 * s)), tilt = Math.atan2(fw[1] - q[1], fw[0] - q[0]), slant = (Math.cos(tilt) >= 0 ? -1 : 1) * .35;
    const look2 = h.dir(1, 0, 0), pupilOff = [v3.dot(look2, cam.r), -v3.dot(look2, cam.u)];
    add(q[2] - r * .25, () => {
      ctx.save(); ctx.translate(q[0], q[1]);
      ctx.rotate(slant);
      ctx.beginPath(); ctx.ellipse(0, 0, er * 1.45 * squash, er * 1.1, 0, 0, TAU); ctx.fillStyle = col(D(look.eyeRing, o), G(o), B(.4, o)); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, er * 1.1 * squash, er * .78, 0, 0, TAU); ctx.fillStyle = col(0, G(o), 0); ctx.fill();
      ctx.beginPath(); ctx.arc(pupilOff[0] * er * .3, pupilOff[1] * er * .15, er * .66, 0, TAU); ctx.fillStyle = col(D(look.pupil, o), G(o), 0); ctx.fill();
      ctx.beginPath(); ctx.arc(pupilOff[0] * er * .35 - er * .12, pupilOff[1] * er * .2 - er * .14, er * .11, 0, TAU); ctx.fillStyle = col(0, G(o), 0); ctx.fill();
      ctx.restore();
    });
    // a heavy curling brow above each eye, flicking up and back
    const bq = P(at(1.0, .48, .25 * s)), bs = .3 * r * bq[3], tgt = P(at(.2, .75, .75 * s)), backA = Math.atan2(tgt[1] - bq[1], tgt[0] - bq[0]);
    add(bq[2] - r * .3, () => flame(ctx, bq, bs * 3.2, bs * .42, backA, (Math.cos(backA) > 0 ? -1 : 1) * .9, D(look.brow, o), G(o), B(look.emit.mane, o)));
  }
}

// ---------- swimmers ----------
function paintSpine(ctx, cam, part, look, add, D, G, B, lw) {
  // one silhouette for the whole body (no seams between segments): the outline is the spine offset by its radius on
  // both sides in screen space, round at the head; one vertical gradient — dark back, pale belly
  const P = cam.project, pts = part.pts.map(P), n = pts.length - 1;
  const side = (sgn) => pts.map((p, i) => {
    const A = pts[Math.max(0, i - 1)], Bq = pts[Math.min(n, i + 1)], dx = Bq[0] - A[0], dy = Bq[1] - A[1], L = Math.hypot(dx, dy) || 1, r = part.rad[i] * p[3];
    return [p[0] - dy / L * r * sgn, p[1] + dx / L * r * sgn];
  });
  const z = pts.reduce((s, p) => s + p[2], 0) / pts.length, o = .5;
  add(z, () => {
    const a = side(1), b = side(-1), h = pts[0], r0 = part.rad[0] * h[3];
    const path = () => { ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]); a.forEach(q => ctx.lineTo(q[0], q[1])); for (let i = n; i >= 0; i--) ctx.lineTo(b[i][0], b[i][1]); ctx.closePath(); };
    const ys = [...a, ...b].map(q => q[1]), y0 = Math.min(...ys) - r0, y1 = Math.max(...ys) + r0;
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, col(D(look.back ?? .7, o), G(o), B(look.emit.body, o))); gr.addColorStop(.5, col(D(look.body, o), G(o), B(look.emit.body, o))); gr.addColorStop(1, col(D(look.belly ?? .15, o), G(o), B(look.emit.body * .6, o)));
    ctx.fillStyle = gr; path(); ctx.fill(); ctx.beginPath(); ctx.arc(h[0], h[1], r0, 0, TAU); ctx.fill();
    ctx.lineWidth = lw(z); ctx.strokeStyle = col(D(look.line, o), G(o), B(.4, o)); ctx.beginPath(); a.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
  });
}
function paintFin(ctx, cam, part, look, add, D, G, B, lw) {
  const P = cam.project, Wd = part.Wd;
  let poly;
  if (part.type === 'fin') {
    // a long pectoral fin: from the root sweeping back and out to the side, flapping up/down
    const sw = part.sweep * Math.PI / 180, fl = part.flap * Math.PI / 180;
    const out = Wd([-Math.sin(sw), Math.sin(fl) * Math.cos(sw) - .35, part.side * Math.cos(fl) * Math.cos(sw)]);
    const back = Wd([-1, 0, 0]);
    const r0 = v3.add(part.root, v3.add(v3.mul(Wd([0, -1, part.side * .4]), part.r * .6), [0, 0, 0]));
    const tip = v3.add(r0, v3.mul(out, part.len));
    poly = [r0, v3.add(r0, v3.mul(back, part.w * 1.2)), v3.add(tip, v3.mul(back, part.w * .4)), tip, v3.add(v3.lerp(r0, tip, .5), v3.mul(back, -part.w * .15))];
  } else {
    // flukes: a wide crescent at the end of the tail, in the horizontal plane (whale) or vertical (fish)
    const fwd = v3.norm(v3.sub(part.prev, part.root)), side = part.wave === 'vertical' ? Wd([0, 0, 1]) : Wd([0, 1, 0]);
    const b = part.bend * Math.PI / 180 * .3, back = v3.mul(fwd, -1);
    const tip1 = v3.add(part.root, v3.add(v3.mul(side, part.span / 2), v3.mul(back, part.chord * 1.2)));
    const tip2 = v3.add(part.root, v3.add(v3.mul(side, -part.span / 2), v3.mul(back, part.chord * 1.2)));
    const notch = v3.add(part.root, v3.mul(back, part.chord * .55));
    poly = [v3.add(part.root, v3.mul(fwd, part.chord * .4)), v3.add(tip1, v3.mul(fwd, part.chord * .9)), tip1, notch, tip2, v3.add(tip2, v3.mul(fwd, part.chord * .9))];
  }
  const q = poly.map(P), z = q.reduce((s, p) => s + p[2], 0) / q.length, o = part.order;
  add(z, () => {
    ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = col(D(look.fin ?? .55, o), G(o), B(look.emit.fin, o)); ctx.fill();
    ctx.lineWidth = lw(z); ctx.strokeStyle = col(D(look.line, o), G(o), B(.4, o)); ctx.stroke();
  });
}
function paintSwimHead(ctx, cam, part, look, add, D, G, B, lw, seed) {
  const P = cam.project, Wd = part.Wd, p0 = part.pts[0], p1 = part.pts[2], r = part.rad[3];
  const fwd = v3.norm(v3.sub(p0, p1)), up = Wd([0, 1, 0]), left = v3.norm(v3.cross(fwd, up));
  const toCam = cam.toCam(p0), R = rng(seed * 17 + 3);
  // eye on each side, low and behind the mouth line
  for (const s of [1, -1]) {
    const n = v3.dot(v3.mul(left, s), toCam); if (n < .05) continue;
    const e = v3.add(v3.add(v3.lerp(part.pts[2], part.pts[3], .3), v3.mul(left, s * r * .82)), v3.mul(up, -r * .25)), q = P(e), er = part.eye * r * q[3] * .5;
    add(q[2] - r * .5, () => { ctx.beginPath(); ctx.ellipse(q[0], q[1], er * 1.4, er, 0, 0, TAU); ctx.fillStyle = col(D(1, .1), 1, B(.3, .1)); ctx.fill(); ctx.beginPath(); ctx.arc(q[0] + er * .3, q[1] - er * .2, er * .3, 0, TAU); ctx.fillStyle = col(0, 1, 0); ctx.fill(); });
  }
  // the mouth line and throat grooves (pale lines along the underside)
  if (part.grooves) {
    const lines = [];
    for (let k = 0; k < 7; k++) { const off = (k - 3) / 3; const pts = []; for (let i = 0; i <= 6; i++) { const j = Math.min(part.pts.length - 1, i); const c = part.pts[j], rr = part.rad[j]; pts.push(v3.add(c, v3.add(v3.mul(up, -rr * (.75 - .1 * Math.abs(off))), v3.mul(left, rr * off * .55)))); } lines.push(pts); }
    const z = P(part.pts[3])[2] - r * .3;
    add(z, () => { for (const L of lines) { ctx.beginPath(); L.map(P).forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.lineWidth = lw(z) * .9; ctx.strokeStyle = col(D(look.groove ?? .55, .1), 1, B(.2, .1)); ctx.stroke(); } });
  }
  if (part.knobs) {
    const knobs = []; for (let i = 0; i < 14; i++) knobs.push([R() * 2.2, R() * 2 - 1]);
    const z = P(part.pts[1])[2] - r * .4;
    add(z, () => { for (const [u, v] of knobs) { const j = Math.min(3, Math.floor(u)), c = v3.lerp(part.pts[j], part.pts[j + 1], u - j), rr = part.rad[j]; const q = P(v3.add(c, v3.add(v3.mul(up, rr * .82), v3.mul(left, v * rr * .45)))); ctx.beginPath(); ctx.arc(q[0], q[1], rr * .07 * q[3], 0, TAU); ctx.fillStyle = col(D(.95, .1), 1, B(.5, .1)); ctx.fill(); } });
  }
}
