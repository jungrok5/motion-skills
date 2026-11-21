// one-line-drawing · line.js — authoring THE line. There is no moveTo: every call continues from where the pen is, so
// the drawing is one unbroken stroke by construction. The calls are the style's vocabulary:
//   to / curve / path      plain travel and outlines you place by hand
//   contour(shape)         go round a silhouette from the scene (from the point nearest the pen), curling at corners
//   steps                  right-angle staircases (wires, roofs, ledges, the frame)
//   hook / curl / curls    a small loop at a corner, a drop ending in a loop, a row of cursive loops (treelines, signature)
//   zig / wave / scallop   zigzags (road edges, grass), waves, bumps (bushes, clouds)
//   sweep / reflect        a zigzag that fills a region row by row — water, a road, a silhouette's reflection
//   back                   retrace the last stretch (how a one-line artist gets somewhere without lifting)
//   pause / tag            the pen stops to think · names a stretch (line sheet, camera notes)
// L.last = { name, start, end, dir } of the latest contour: stop a contour `until` a point, make a detour (up a rod and
// back), then finish it with contour(name, { until: first.start, dir: first.dir }).
import { rng, noise1, clamp, add, sub, mul, dist, norm, perp, mix, rot, dot, cross, bbox, polyLen } from './core.js';

export const KINDS = ['line', 'curve', 'contour', 'step', 'curl', 'zig', 'wave', 'scallop', 'sweep', 'back'];

export class Line {
  constructor(scene, { seed = 1 } = {}) {
    this.S = scene; this.seed = seed; this.r = rng(seed * 97 + 5);
    this.raw = []; this.kind = []; this.tags = []; this.pauses = []; this.tagName = 'start';
    this.count = Object.fromEntries(KINDS.map(k => [k, 0]));
  }
  get at() { if (!this.raw.length) throw new Error('call L.start([x, y]) first'); return this.raw[this.raw.length - 1]; }
  get heading() { const n = this.raw.length; for (let i = n - 2; i >= 0; i--) if (dist(this.raw[i], this.raw[n - 1]) > 3) return norm(sub(this.raw[n - 1], this.raw[i])); return [1, 0]; }
  _push(pts, kind) {
    for (const p of pts) {
      if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) throw new Error(`${kind}: point is not a number`);
      if (this.raw.length && dist(p, this.at) < .2) continue;
      this.raw.push([p[0], p[1]]); this.kind.push(kind); this.tags.push(this.tagName);
    }
    return this;
  }
  start(p) { if (this.raw.length) throw new Error('start() once: the line never lifts'); this.raw.push([p[0], p[1]]); this.kind.push('line'); this.tags.push(this.tagName); return this; }
  tag(name) { this.tagName = name; return this; }
  pause(s = .45) { this.pauses.push({ i: this.raw.length - 1, s }); return this; }

  // straight, with an optional bow (fraction of the length, + bulges to the left of travel)
  to(p, { bow = 0, kind = 'line' } = {}) {
    const a = this.at, n = Math.max(2, Math.ceil(dist(a, p) / 12)), nrm = perp(norm(sub(p, a))), L = dist(a, p);
    this.count[kind]++;
    return this._push(Array.from({ length: n }, (_, i) => { const k = (i + 1) / n; return add(mix(a, p, k), mul(nrm, Math.sin(Math.PI * k) * bow * L)); }), kind);
  }
  curve(c, p) {
    const a = this.at, n = Math.max(4, Math.ceil((dist(a, c) + dist(c, p)) / 10)); this.count.curve++;
    return this._push(Array.from({ length: n }, (_, i) => { const k = (i + 1) / n; return mix(mix(a, c, k), mix(c, p, k), k); }), 'curve');
  }
  // through a list of points, optionally rounded
  path(points, { smooth = 0 } = {}) {
    let p = [this.at, ...points];
    for (let s = 0; s < smooth; s++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) q.push(mix(p[i], p[i + 1], .25), mix(p[i], p[i + 1], .75)); q.push(p[p.length - 1]); p = q; }
    this.count.curve++; return this._push(p.slice(1), 'curve');
  }

  // a loop at the pen, continuing its heading. side +1 curls clockwise on screen, -1 anticlockwise, 0 = toward `toward`
  curl(r = 7, { side = 0, toward = null, stretch = 1.25, kind = 'curl' } = {}) {
    const u = this.heading, P = this.at;
    let sg = side || 1; if (!side && toward) sg = cross(u, sub(toward, P)) >= 0 ? 1 : -1;
    const C = add(P, mul(perp(u), r * sg)), v0 = sub(P, C), n = Math.max(10, Math.ceil(r * 2.2)), pts = [];
    for (let i = 1; i <= n; i++) {
      const th = i / n * Math.PI * 2, v = rot(v0, sg * th);
      // a cursive loop: a little longer along the heading, ending a hair ahead of where it began
      const along = dot(v, u), q = add(C, add(v, mul(u, along * (stretch - 1))));
      pts.push(add(q, mul(u, i / n * r * .7)));
    }
    this.count.curl++; return this._push(pts, kind);
  }
  // drop along dir by len, then a loop: the end of a wire, a lamp's hook, a ledge
  hook({ dir = [0, 1], len = 26, r = 7, side = 0 } = {}) { this.to(add(this.at, mul(norm(dir), len)), { kind: 'step' }); return this.curl(r, { side: side || (dir[1] >= 0 ? -1 : 1) }); }
  // a row of n cursive loops on the way to p (treelines, smoke, the signature). up: loops rise above the travel
  curls(p, { n = 5, r = 9, up = true, wobble = .25 } = {}) {
    const a = this.at, u = norm(sub(p, a)), L = dist(a, p), sg = (perp(u)[1] > 0) === up ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const rr = r * (1 + (this.r() - .5) * wobble * 2);
      this.to(add(a, mul(u, L * (i + .55) / n)), { kind: 'curl' }); this.curl(rr, { side: sg });
    }
    return this.to(p, { kind: 'curl' });
  }
  // right-angle staircase to p in n steps; first: 'h' or 'v'. hook: a loop of that radius at each inner corner
  steps(p, { n = 2, first = 'h', hook = 0 } = {}) {
    const a = this.at, dx = (p[0] - a[0]) / n, dy = (p[1] - a[1]) / n; this.count.step++;
    for (let i = 0; i < n; i++) {
      const c = this.at, m = first === 'h' ? [c[0] + dx, c[1]] : [c[0], c[1] + dy], e = [c[0] + dx, c[1] + dy];
      this.to(m, { kind: 'step' }); if (hook && i < n) this.curl(hook, { toward: e }); this.to(e, { kind: 'step' });
    }
    return this;
  }
  // zigzag to p: n teeth of amplitude amp (px). round 0…1 softens the points
  zig(p, { n = 6, amp = 24, round = 0, kind = 'zig' } = {}) {
    const a = this.at, u = norm(sub(p, a)), nr = perp(u), L = dist(a, p), pts = [];
    for (let i = 1; i <= n * 2; i++) { const k = i / (n * 2), s = i === n * 2 ? 0 : (i % 2 ? 1 : -1) * amp * (1 + (this.r() - .5) * .35); pts.push(add(mix(a, p, k), mul(nr, s))); }
    this.count[kind]++; return this._push(round > 0 ? soften([a, ...pts], round).slice(1) : pts, kind);
  }
  wave(p, { n = 3, amp = 18 } = {}) {
    const a = this.at, u = norm(sub(p, a)), nr = perp(u), L = dist(a, p), m = Math.max(8, Math.ceil(L / 6)), pts = [];
    for (let i = 1; i <= m; i++) { const k = i / m; pts.push(add(mix(a, p, k), mul(nr, Math.sin(k * Math.PI * 2 * n) * amp))); }
    this.count.wave++; return this._push(pts, 'wave');
  }
  // n bumps on the way to p (h tall), rising to the left of travel when up (bushes, cloud edges, a crown's rim)
  scallop(p, { n = 5, h = 22, up = true } = {}) {
    const a = this.at, u = norm(sub(p, a)), nr = mul(perp(u), (perp(u)[1] > 0) === up ? -1 : 1), L = dist(a, p), m = n * 10, pts = [];
    for (let i = 1; i <= m; i++) { const k = i / m, bump = Math.abs(Math.sin(k * Math.PI * n)) * h * (1 + (this.r() - .5) * .3); pts.push(add(mix(a, p, k), mul(nr, bump))); }
    this.count.scallop++; return this._push(pts, 'scallop');
  }

  // go round a shape of the scene. from: 'near' (nearest the pen) or [x, y]; until: [x, y] stops at the outline point
  // nearest it (otherwise part 0…1 of the way round, 1 = all the way back); dir: 'auto' | 'cw' | 'ccw';
  // curl: loop radius at sharp corners (0 = none), corner: the turn (deg) that counts, gap: px between loops
  contour(name, { loop = 0, from = 'near', until = null, part = 1, dir = 'auto', curl = 0, corner = 70, gap = 70, maxCurls = 8, inset = 0 } = {}) {
    let poly = this.S.contour(name, loop);
    if (inset) poly = offsetPoly(poly, inset);
    const N = poly.length, P = this.at, start = nearest(poly, from === 'near' ? P : from);
    let order = Array.from({ length: N }, (_, k) => poly[(start + k) % N]);
    const cw = dir === 'cw' || (dir === 'auto' && dot(this.heading, norm(sub(order[Math.min(3, N - 1)], order[0]))) >= dot(this.heading, norm(sub(poly[(start - 3 + N) % N], order[0]))));
    if (!cw) order = [order[0], ...order.slice(1).reverse()];
    order.push(order[0]);
    let end = order.length - 1;
    if (until) end = Math.max(1, nearest(order.slice(0, -1), until));
    else if (part < 1) { const tot = polyLen(order) * part; let s = 0; for (let i = 1; i < order.length; i++) { s += dist(order[i - 1], order[i]); if (s >= tot) { end = i; break; } } }
    const seg = order.slice(0, end + 1);
    this.last = { name, start: seg[0], end: seg[seg.length - 1], dir: cw ? 'cw' : 'ccw' };
    if (dist(P, seg[0]) > .5) this.to(seg[0]);
    // corners worth a loop: big turns measured over ±12 px, far enough apart
    const corners = new Set(); if (curl > 0) {
      const turn = i => { const a = back(seg, i, 12), b = fwd(seg, i, 12); if (!a || !b) return 0; const u = norm(sub(seg[i], a)), v = norm(sub(b, seg[i])); return Math.acos(clamp(dot(u, v), -1, 1)) * 180 / Math.PI; };
      const cand = seg.map((_, i) => [i, turn(i)]).filter(([, t]) => t > corner).sort((x, y) => y[1] - x[1]);
      for (const [i] of cand) { if (corners.size >= maxCurls) break; if ([...corners].every(j => arcDist(seg, i, j) > gap)) corners.add(i); }
    }
    this.count.contour++;
    for (let i = 1; i < seg.length; i++) {
      this._push([seg[i]], 'contour');
      if (corners.has(i) && i < seg.length - 1) { const nx = fwd(seg, i, 10) || seg[i + 1]; this.curl(curl * (.8 + this.r() * .45), { toward: nx }); this._push([seg[i]], 'contour'); }
    }
    return this;
  }
  // fill a region with a zigzag, row by row. region: a shape name or a polygon. step: row spacing (px);
  // from 'top' | 'bottom'; pad: px past the edges; mirror: a ground y — sweep the shape's reflection below it
  // (squash stretches it, as reflections on wet ground run long); round 0…1 softens the teeth; rows: [y0, y1] limits
  sweep(region, { step = 34, from = 'top', pad = 6, jitter = .18, mirror = null, squash = 1.15, round = 0, rows = null, x = null } = {}) {
    const isName = typeof region === 'string', b = isName ? this.S.bounds(region) : bbox(region);
    let y0 = b.y0, y1 = b.y1;
    if (mirror != null) { y0 = mirror; y1 = mirror + (mirror - b.y0) * squash; }
    if (rows) { y0 = Math.max(y0, rows[0]); y1 = Math.min(y1, rows[1]); }
    const ys = []; for (let y = y0 + step * .35; y <= y1 - step * .2; y += step) ys.push(y);
    if (from === 'bottom') ys.reverse();
    const spanAt = y => { const yy = mirror != null ? mirror - (y - mirror) / squash : y; const s = isName ? this.S.span(region, yy) : polySpan(region, yy); if (!s) return null; return x ? [Math.max(s[0], x[0]), Math.min(s[1], x[1])] : s; };
    let left = this.at[0] < (b.x0 + b.x1) / 2; const pts = [];
    for (const y of ys) {
      const s = spanAt(y); if (!s || s[1] - s[0] < 4) continue;
      const w = s[1] - s[0], j = () => (this.r() - .5) * 2 * jitter;
      pts.push([left ? s[0] - pad + j() * w * .2 : s[1] + pad + j() * w * .2, y + j() * step]);
      left = !left;
    }
    if (!pts.length) throw new Error(`sweep: no rows inside ${isName ? region : 'the polygon'}`);
    this.to(pts[0]); this.count.sweep++;
    return this._push((round > 0 ? soften(pts, round) : pts).slice(1), 'sweep');
  }
  reflect(name, o = {}) { return this.sweep(name, { mirror: this.S.groundOf(name), ...o }); }
  // retrace the last len px, a hair to one side (one-line artists double back rather than lift)
  back(len = 60, { off = 1.6 } = {}) {
    const pts = []; let s = 0;
    for (let i = this.raw.length - 2; i >= 0 && s < len; i--) { s += dist(this.raw[i], this.raw[i + 1]); pts.push(this.raw[i]); }
    const u = perp(this.heading); this.count.back++;
    return this._push(pts.map(p => add(p, mul(u, off))), 'back');
  }

  // resample to an even step with the hand's wobble; the film reads this
  finish({ step = 2, wobble = .8 } = {}) {
    const P = this.raw, n1 = noise1(this.seed * 13 + 1), n2 = noise1(this.seed * 29 + 3);
    const pts = [P[0]], kind = [this.kind[0]], tag = [this.tags[0]], rawAt = [0];
    for (let i = 1; i < P.length; i++) {
      const d = dist(P[i - 1], P[i]), k = Math.max(1, Math.ceil(d / step));
      for (let j = 1; j <= k; j++) { pts.push(mix(P[i - 1], P[i], j / k)); kind.push(this.kind[i]); tag.push(this.tags[i]); rawAt.push(i); }
    }
    // hand wobble: a slow drift and a faint tremor across the direction of travel
    const out = []; let s = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) s += dist(pts[i - 1], pts[i]);
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)], nr = perp(norm(sub(b, a)));
      out.push(add(pts[i], mul(nr, (n1(s / 140) * .8 + n2(s / 23) * .2) * wobble)));
    }
    const pauses = this.pauses.map(p => ({ i: rawAt.findIndex(r => r >= p.i), s: p.s })).filter(p => p.i >= 0);
    return { pts: out, kind, tag, pauses, count: { ...this.count }, raw: P.length };
  }
}

// ---- helpers ---------------------------------------------------------------------------------------------------
function nearest(poly, p) { let bi = 0, bd = Infinity; poly.forEach((q, i) => { const d = dist(q, p); if (d < bd) { bd = d; bi = i; } }); return bi; }
function back(seg, i, d) { let s = 0; for (let k = i - 1; k >= 0; k--) { s += dist(seg[k], seg[k + 1]); if (s >= d) return seg[k]; } return null; }
function fwd(seg, i, d) { let s = 0; for (let k = i + 1; k < seg.length; k++) { s += dist(seg[k - 1], seg[k]); if (s >= d) return seg[k]; } return null; }
function arcDist(seg, i, j) { const [a, b] = i < j ? [i, j] : [j, i]; let s = 0; for (let k = a + 1; k <= b; k++) s += dist(seg[k - 1], seg[k]); return s; }
function soften(pts, k) { const q = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; q.push(mix(a, b, k * .5), mix(a, b, 1 - k * .5)); } q.push(pts[pts.length - 1]); return q; }
function polySpan(poly, y) {
  let a = Infinity, b = -Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y)) { const x = xi + (y - yi) / (yj - yi) * (xj - xi); a = Math.min(a, x); b = Math.max(b, x); }
  }
  return a < b ? [a, b] : null;
}
// push a closed outline outward (+) or inward (−) by d px along its normals
function offsetPoly(poly, d) {
  const n = poly.length, sgn = area2(poly) > 0 ? 1 : -1;
  return poly.map((p, i) => { const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n], t = norm(sub(b, a)); return add(p, mul([t[1], -t[0]], d * sgn)); });
}
function area2(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; }
