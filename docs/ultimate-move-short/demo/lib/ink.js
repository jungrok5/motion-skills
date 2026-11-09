// ultimate-move-short · ink.js — sumi ink on screen: dry-brush strokes (a solid core, bristle lines that break into
// flying-white gaps 飞白, hair-thin tails, splatter), splash blobs, flecks that fly off and fall, and the "ink shadow" —
// the huge black afterimage a fast body drags behind it (墨影). All shapes are seeded, so a frame is a function of t.
//
//   brush(ctx, pts, widths, { col, dry, seed, head, fade, red, alpha })   pts: screen [[x, y]…], widths: px per point
//   brush3(ctx, v, pts3, widthsM, o)            the same from 3D points (metres) through the camera
//   splash(ctx, x, y, r, { seed, spikes, drops, col, grow })
//   flecks(ctx, list)                           list from fleckList(...) — small torn ink pieces in flight
//   inkShadow(ctx, v, H, t, o)                  the 墨影 trail behind a fighter (see the function for options)
import { clamp, lerp, hash, noise2, sn, rgba, mix, v3, TAU } from './core.js';
import { smoothOpen, smoothClosed } from './cam.js';

export const INK = '#09090b';

// offset a polyline sideways by w[i] (positive = left of travel)
function offset(pts, w, k = 1) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    out.push([pts[i][0] - dy / l * w[i] * k, pts[i][1] + dx / l * w[i] * k]);
  }
  return out;
}
// resample a polyline into a smooth dense curve (Catmull-Rom), ~`step` px apart; widths follow
function dense(pts, w, step = 5) {
  const P = [], W = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const k = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      P.push([0, 1].map(c => .5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      W.push(w[i] + (w[i + 1] - w[i]) * t);
    }
  }
  P.push(pts[n - 1]); W.push(w[n - 1]);
  return { P, W };
}
// cumulative arc length → u in [0, 1]
function arcU(pts) { const u = [0]; let L = 0; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); u.push(L); } return { u: u.map(x => x / (L || 1)), L }; }
// cut a polyline (and its widths) to the part between u0 and u1
function cut(pts, w, u0, u1) {
  const { u } = arcU(pts), P = [], W = [];
  for (let i = 0; i < pts.length; i++) {
    if (u[i] >= u0 && u[i] <= u1) { P.push(pts[i]); W.push(w[i]); }
    if (i < pts.length - 1) for (const e of [u0, u1]) if (u[i] < e && u[i + 1] > e) { const k = (e - u[i]) / (u[i + 1] - u[i]); P.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]); W.push(lerp(w[i], w[i + 1], k)); }
  }
  // keep order by u
  return { P, W };
}

// a dry-brush stroke. o: { col, dry 0…1 (gaps), seed, head (0…1 how much is drawn), tail0 (0…1 eaten from the start),
//   fade (0…1 dissolve), bristles, alpha, core (0…1 solid part of the width), red: { n, w, col, glow, side } accent
//   streaks running inside the black, rough (edge noise), splatter, hairs }
export function brush(ctx, pts, widths, o = {}) {
  if (pts.length < 2) return;
  const head = o.head ?? 1, tail0 = o.tail0 ?? 0, fade = clamp(o.fade ?? 0), seed = o.seed || 1, col = o.col || INK;
  if (head <= tail0 + 1e-3 || fade >= 1) return;
  let { P, W } = cut(pts, widths, tail0, head);
  if (P.length < 2) return;
  ({ P, W } = dense(P, W, o.step ?? 5));
  const { u, L } = arcU(P), n = P.length;
  const tap = (o.taper ?? 1);
  W = W.map((w, i) => w * (1 - fade * .55) * Math.min(1, (u[i] * 5 + .3)) * Math.pow(Math.min(1, (1 - u[i]) * 3 + .1), .7 * tap));
  const maxW = Math.max(...W); if (maxW < .3) return;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1) * (1 - fade * fade * .8);
  const rough = o.rough ?? .22;
  const Wr = W.map((w, i) => w * (1 + (noise2(u[i] * L * .02, seed) - .5) * rough * 2));
  // 1. the solid body (narrower than the stroke, so the edge is made of bristles, not an outline)
  const core = (o.core ?? .55) * (1 - fade * .6);
  if (core > .05) { const Lc = offset(P, Wr, core), Rc = offset(P, Wr, -core); ctx.fillStyle = col; ctx.beginPath(); smoothOpen(ctx, Lc, .5); smoothOpen(ctx, Rc.slice().reverse(), .5, false); ctx.closePath(); ctx.fill(); }
  // 2. bristles: many streaks along the stroke, each with its own width and ragged start / end; the dry brush breaks
  //    them (more toward the end and the edges) so paper shows through in streaks (飞白)
  const nb = o.bristles || Math.round(clamp(maxW / 2.2, 10, 40));
  const dry = clamp((o.dry ?? .35) + fade * .55);
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const nrm = P.map((p, i) => { const a = P[Math.max(0, i - 1)], c = P[Math.min(n - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  ctx.fillStyle = col;
  const sliver = (run, wid) => {     // a tapered streak: pointed at both ends, width wobbling along it
    const m = run.length; if (m < 2) return;
    const Lf = [], Rt = [];
    for (let j = 0; j < m; j++) { const [x, y, nx, ny, w] = run[j], tp = Math.min(1, Math.min(j, m - 1 - j) / Math.max(1, m * .3) + .08), ww = w * tp * wid; Lf.push([x + nx * ww, y + ny * ww]); Rt.push([x - nx * ww, y - ny * ww]); }
    ctx.beginPath(); ctx.moveTo(Lf[0][0], Lf[0][1]); for (const p of Lf) ctx.lineTo(p[0], p[1]); for (let j = m - 1; j >= 0; j--) ctx.lineTo(Rt[j][0], Rt[j][1]); ctx.closePath(); ctx.fill();
  };
  for (let b = 0; b < nb; b++) {
    const r0 = hash(seed, b * 5) * 2 - 1, off = Math.sign(r0) * (.35 + .63 * Math.pow(Math.abs(r0), 1.3)), edge = Math.abs(off), lw = Math.max(.6, maxW * (.05 + hash(seed, b * 5 + 1) * .09) * (1.2 - edge * .5));
    const us = hash(seed, b * 5 + 2) * .3 * (edge + .3), ue = 1 - hash(seed, b * 5 + 3) * .35 * (edge * 1.2 + .15);
    ctx.globalAlpha = (o.alpha ?? 1) * (1 - fade * fade * .8) * (.7 + hash(seed, b * 5 + 4) * .3);
    let run = [];
    for (let i = 0; i < n; i++) {
      const inside = u[i] >= us && u[i] <= ue;
      const gapN = noise2(u[i] * L * (.008 + edge * .018) + b * 7.3, seed + b * .37), thr = dry * (.15 + u[i] * .8 + edge * .8);
      if (inside && gapN > thr) run.push([P[i][0] + nrm[i][0] * Wr[i] * off, P[i][1] + nrm[i][1] * Wr[i] * off, nrm[i][0], nrm[i][1], lw * (.55 + noise2(u[i] * 9 + b, seed + 3) * .9)]);
      else { sliver(run, 1); run = []; }
    }
    sliver(run, 1);
  }
  ctx.globalAlpha = (o.alpha ?? 1) * (1 - fade * fade * .8);
  // 3. hair-thin tails past the end
  if (o.hairs !== false) {
    ctx.lineWidth = .8; ctx.globalAlpha *= .75;
    const e = P[n - 1], d = P[Math.max(0, n - 3)], dx = e[0] - d[0], dy = e[1] - d[1], l = Math.hypot(dx, dy) || 1;
    for (let k = 0; k < 6; k++) {
      const off = (hash(seed, k) - .5) * W[Math.max(0, n - 3)] * 1.8, len = (8 + hash(seed, k + 9) * 26) * (o.hairLen ?? 1);
      ctx.beginPath(); ctx.moveTo(e[0] - dy / l * off - dx / l * 6, e[1] + dx / l * off - dy / l * 6); ctx.lineTo(e[0] - dy / l * off * 1.25 + dx / l * len, e[1] + dx / l * off * 1.25 + dy / l * len); ctx.stroke();
    }
    ctx.globalAlpha /= .75;
  }
  // 4. splatter beside the stroke
  const sp = o.splatter ?? .5;
  if (sp > 0) {
    ctx.fillStyle = col;
    const m = Math.round(sp * Math.min(60, L / 14));
    for (let k = 0; k < m; k++) {
      const i = Math.floor(hash(seed, k * 3) * n), side = hash(seed, k * 3 + 1) > .5 ? 1 : -1, dist = W[i] * (1.05 + hash(seed, k * 3 + 2) * 1.5), rr = Math.max(.6, maxW * .05 * (.2 + hash(seed, k + 77)));
      ctx.beginPath(); ctx.ellipse(P[i][0] + nrm[i][0] * dist * side, P[i][1] + nrm[i][1] * dist * side, rr * 1.6, rr, Math.atan2(nrm[i][0], -nrm[i][1]), 0, TAU); ctx.fill();
    }
  }
  // 5. accent streaks: fine red hairlines running inside the black, broken and fading along their length, glowing
  if (o.red) {
    const rc = o.red.col || '#e0142d', nr = o.red.n ?? 2, side = o.red.side ?? 1;
    ctx.lineCap = 'round';
    for (let k = 0; k < nr; k++) {
      const off = side * (.12 + k * .2 + hash(seed, k + 500) * .12), us = .05 + hash(seed, k + 510) * .25, ue = .7 + hash(seed, k + 520) * .28;
      const lw = Math.max(.7, maxW * (o.red.w ?? .016) * (k === 0 ? 1.3 : .8));
      ctx.shadowColor = rc; ctx.shadowBlur = Math.max(2, lw * 3) * (o.red.glow ?? 1); ctx.strokeStyle = rc; ctx.lineWidth = lw;
      for (let i = 1; i < n; i++) {
        if (u[i] < us || u[i] > ue) continue;
        if (noise2(u[i] * L * .012 + k * 3.1, seed + 11) < .3) continue;      // broken
        const a2 = Math.sin(Math.PI * (u[i] - us) / (ue - us));             // fades in and out along the stroke
        ctx.globalAlpha = (o.alpha ?? 1) * (1 - fade) * (o.red.a ?? 1) * a2 * (k === 0 ? 1 : .7);
        const p0 = P[i - 1], p1 = P[i];
        ctx.beginPath(); ctx.moveTo(p0[0] + nrm[i - 1][0] * Wr[i - 1] * off, p0[1] + nrm[i - 1][1] * Wr[i - 1] * off); ctx.lineTo(p1[0] + nrm[i][0] * Wr[i] * off, p1[1] + nrm[i][1] * Wr[i] * off); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// a torn ink blot: an irregular wet patch, stretched and spiked toward the trailing side (dir = screen motion angle)
export function blot(ctx, x, y, r, o = {}) {
  const seed = o.seed || 1, n = 22, e = o.stretch ?? .8, dir = o.dir ?? 0, pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, rel = Math.cos(a - dir - Math.PI);           // 1 on the trailing side
    let rr = r * (.62 + noise2(Math.cos(a) * 1.6 + seed * 3.1, Math.sin(a) * 1.6) * .6);
    rr *= 1 + e * Math.max(0, rel) ** 2 * (1 + hash(seed, i) * 1.4);
    if (hash(seed, i + 40) > .9) rr *= rel > 0 ? 1.3 : .8;            // a few spikes behind, bites in front
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  ctx.beginPath(); smoothClosed(ctx, pts, .42); ctx.fill();
}

// a stroke from 3D points; widths in metres are converted with each point's depth. o.flatW: widths already in px.
export function brush3(ctx, v, pts3, widths, o = {}) {
  const P = [], W = [];
  for (let i = 0; i < pts3.length; i++) { const p = v.p(pts3[i]); if (!p) continue; P.push([p[0], p[1]]); W.push(o.px ? widths[i] : widths[i] * v.k(p[2])); }
  if (P.length > 1) brush(ctx, P, W, o);
}

// an ink splash: an irregular blob with radial spikes, streaks and drops. grow 0…1 (0 = nothing, 1 = full)
export function splash(ctx, x, y, r, o = {}) {
  const seed = o.seed || 1, g = clamp(o.grow ?? 1), col = o.col || INK, n = 46, sy = o.sy ?? 1;
  if (g <= 0) return;
  const R = r * (1 - Math.pow(1 - g, 3));
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.fillStyle = col;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, spike = hash(seed, i) > (1 - (o.spikes ?? .3)) ? 1 + hash(seed, i + 50) * 1.6 : 1;
    const rr = R * (.55 + noise2(Math.cos(a) * 2 + seed, Math.sin(a) * 2) * .55) * spike;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * sy]);
  }
  ctx.beginPath(); smoothClosed(ctx, pts, .35); ctx.fill();
  // streaks: long thin rays
  const ns = o.streaks ?? 10;
  for (let k = 0; k < ns; k++) {
    const a = hash(seed, k + 200) * TAU, l = R * (1.2 + hash(seed, k + 210) * 1.8), w = R * (.04 + hash(seed, k + 220) * .08);
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l * sy, nx = -Math.sin(a) * w, ny = Math.cos(a) * w * sy;
    ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.quadraticCurveTo(x + Math.cos(a) * l * .6 + nx * .4, y + Math.sin(a) * l * .6 * sy + ny * .4, ex, ey); ctx.quadraticCurveTo(x + Math.cos(a) * l * .6 - nx * .4, y + Math.sin(a) * l * .6 * sy - ny * .4, x - nx, y - ny); ctx.fill();
  }
  // drops
  const nd = o.drops ?? 24;
  for (let k = 0; k < nd; k++) {
    const a = hash(seed, k + 300) * TAU, d = R * (1.1 + hash(seed, k + 310) * 1.9), rr = Math.max(.7, R * .05 * hash(seed, k + 320));
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * sy, rr * 1.5, rr, a, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// flecks: torn ink pieces — {p:[x,y,z], v:[…], tb, life, size, seed}. Ballistic in 3D (gravity g), tumbling, shrinking.
export function fleckList(seed, n, o) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = k => hash(seed * 31 + i, k);
    const tb = o.t0 + h(1) * (o.t1 - o.t0), at = o.at(tb, h(2), h(9));
    const dirv = o.dir ? o.dir(tb, h) : [(h(3) - .5) * 2, h(4) * 1.2, (h(5) - .5) * 2];
    const sp = (o.speed ?? 2) * (.4 + h(6));
    out.push({ p: at, v: v3.mul(dirv, sp), tb, life: (o.life ?? 1.2) * (.5 + h(7)), size: (o.size ?? .04) * (.3 + h(8) * 1.2), seed: seed * 31 + i, g: o.g ?? 3, drag: o.drag ?? 1.2, sq: o.square || 0 });
  }
  return out;
}
export function flecks(ctx, v, list, t, o = {}) {
  ctx.save(); ctx.fillStyle = o.col || INK;
  for (const f of list) {
    const a = t - f.tb; if (a < 0 || a > f.life) continue;
    const dr = (1 - Math.exp(-f.drag * a)) / f.drag;
    const p = [f.p[0] + f.v[0] * dr, f.p[1] + f.v[1] * dr - .5 * f.g * a * a, f.p[2] + f.v[2] * dr];
    if (p[1] < 0 && !o.noGround) continue;
    const q = v.p(p); if (!q) continue;
    const k = 1 - a / f.life, sz = f.size * v.k(q[2]) * (.35 + .65 * k);
    if (sz < .4) continue;
    ctx.globalAlpha = (o.alpha ?? 1) * Math.min(1, k * 2.5);
    const rot = hash(f.seed, 1) * TAU + a * (hash(f.seed, 2) - .5) * 14;
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(rot);
    if (f.sq) { ctx.fillRect(-sz / 2, -sz / 2 * (.6 + hash(f.seed, 4) * .4), sz, sz * (.6 + hash(f.seed, 4) * .4)); }
    else { ctx.beginPath(); ctx.moveTo(-sz, 0); ctx.quadraticCurveTo(0, -sz * .5, sz * (.6 + hash(f.seed, 3)), sz * .1); ctx.quadraticCurveTo(0, sz * .35, -sz, 0); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}

// 墨影 — the ink shadow: the fighter's body dragged through the last `span` seconds as wet black ink. Each tracked part
// (chest, pelvis, hem, knees, head) leaves torn blots along its own past path, joined by a streaky stroke; the old end
// thins and breaks into small blots, and fine accent streaks run through the mass. o: { span (s), w (m), from (shot time
// it starts), parts, red, redN, alpha, seed, dry, lift (m the trail rises behind), gap (s left clear behind the body) }
export function inkShadow(ctx, v, H, t, o = {}) {
  const span = o.span ?? .45, gap = o.gap ?? .05, t0 = Math.max(o.from ?? -1e9, t - span), t1 = t - gap;
  if (t1 - t0 < .02) return;
  const parts = o.parts || ['chest', 'pelvis', 'hemB', 'head'];
  const pick = (r, p) => p === 'hemB' ? r.PF.at(r.pelvis, 0, -.5, -.25) : p === 'hemF' ? r.PF.at(r.pelvis, 0, -.35, .1) : p === 'tip' ? r.blade.tip : r[p];
  const n = 14, seed = o.seed || 3, W = o.w ?? .42, near = o.near ?? 1.4;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = o.col || INK;
  parts.forEach((part, j) => {
    const scale = part === 'head' ? .45 : part.startsWith('knee') ? .6 : part === 'hemF' ? .7 : 1;
    const P = [], Wd = [], A = [];
    for (let i = 0; i <= n; i++) {
      const tt = t0 + (t1 - t0) * i / n, r = H.rig(tt), p = pick(r, part), age = (t - tt) / span;
      const wob = [sn(tt * 3 + j, seed) * .1 * age, sn(tt * 3 + j, seed + 3) * .06 * age + (o.lift ?? .06) * age, sn(tt * 3 + j, seed + 7) * .1 * age];
      const q = v.p(v3.add(p, wob)); if (!q || q[2] < near) continue;
      P.push([q[0], q[1]]); Wd.push(W * scale * v.k(q[2]) * (.2 + .8 * Math.pow(1 - clamp(age), .7))); A.push(age);
    }
    if (P.length < 2) return;
    // the streaky stroke that joins the blots
    brush(ctx, P, Wd.map(w => w * .95), { seed: seed + j * 11, dry: (o.dry ?? .55), splatter: .9, taper: .25, core: .45, red: o.red && j < (o.redN ?? 2) ? { ...o.red, n: 2, side: j % 2 ? -1 : 1 } : null, hairLen: 2.2, col: o.col });
    ctx.fillStyle = o.col || INK;
    // torn blots along the path, broken into small pieces at the old end
    for (let i = 0; i < P.length; i++) {
      const a = A[i], prev = P[Math.max(0, i - 1)], nx = P[Math.min(P.length - 1, i + 1)], dir = Math.atan2(nx[1] - prev[1], nx[0] - prev[0]);
      if (a < .55 && i % 3 === 0) blot(ctx, P[i][0], P[i][1], Wd[i] * .32, { seed: seed * 7 + j * 31 + i, dir, stretch: 2.8 });
      else for (let k = 0; k < 3; k++) { const h = q => hash(seed * 7 + j * 31 + i, q + k * 9), d = Wd[i] * (1 + a * 2.5); blot(ctx, P[i][0] + (h(1) - .5) * d * 1.6, P[i][1] + (h(2) - .5) * d, Wd[i] * (.12 + h(3) * .22), { seed: seed + i * 13 + k, dir, stretch: 1.5 }); }
    }
  });
  // inner tone: a few grey streaks along the motion, so the mass reads as wet ink with depth, not a flat cut-out
  if (o.tone !== false) parts.slice(0, 3).forEach((part, j) => {
    const P = [], Wd = [];
    for (let i = 0; i <= 10; i++) { const tt = t0 + (t1 - t0) * i / 10, r = H.rig(tt), q = v.p(v3.add(pick(r, part), [0, (o.lift ?? .15) * (t - tt) / span + (j - 1) * .08, 0])); if (!q) continue; P.push([q[0], q[1]]); Wd.push(W * .32 * v.k(q[2]) * (1 - (t - tt) / span * .6)); }
    if (P.length > 1) brush(ctx, P, Wd, { seed: seed + 90 + j, dry: .6, core: 0, splatter: 0, hairs: false, col: '#2e2e33', alpha: .8, bristles: 10 });
  });
  ctx.restore();
}
