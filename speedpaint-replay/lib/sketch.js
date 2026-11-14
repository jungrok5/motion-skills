// speedpaint-replay · sketch.js — the authoring side. You build one illustration as a list of items, stage by stage,
// in the order a painter would make them. The replay (replay.js) times them and plays the making.
//
//   const s = new Sketch({ seed: 7 });
//   s.ellipse(500, 360, 210, 250)                       rough   — blue construction (head circle, centre line, eye line)
//   s.ink('420,300 470,280 540,290', { w: 4 })          line    — tapered pen line through the control points
//   s.flat('skin', '…outline…', { fill: '#f1c9a5' })    flat    — a named base-colour region (painted in by a sweeping brush)
//   s.shadow('…', { fill: '#b98a7a', clip: 'skin' })    shadow  — multiply, clipped to the named flats (a clipping layer)
//   s.light('…', { fill: '#fff3d6', clip: 'hair' })     highlight — screen by default
//   s.glow / s.fx(…)                                    finish  — light, grade, rim, bokeh; `over: true` lays it over the ink
//
// Points are art units on a 1000 × 1000 canvas, written "x,y x,y …" or [[x,y], …]. Control points are smoothed
// (Catmull-Rom) unless { raw: true }. Wrap a part in s.push({ rot, ox, oy, dx, dy, sx, sy }) … s.pop() to author it
// upright and then tilt / move it (a head turned 12°, a hand reused). Time order = the order you add items; paint order
// (z) is separate: { z } on any item, default = the order added within its stage. { order } moves an item in time within
// its stage (default = the order added), e.g. lock flats added with the line art but painted after the face.
import { P, spline, resample, xf, rng, clamp, lerp, bbox, area, normals, smooth, mix } from './core.js';
import { prepStroke, prepFill } from './brush.js';

export const STAGES = ['rough', 'line', 'flat', 'shadow', 'highlight', 'finish'];
export const INK = '#2b2321', ROUGH = '#6f9be0';

export class Sketch {
  constructor({ seed = 1, ink = INK, rough = ROUGH, paper = '#fdfcf8', meta = {} } = {}) {
    this.items = []; this.regions = {}; this.stack = []; this.r = rng(seed); this.seed = seed;
    this.inkColor = ink; this.roughColor = rough; this.paper = paper; this.meta = meta;
    this.zc = Object.fromEntries(STAGES.map(s => [s, 0]));
    this.pose = null; this.marks = {}; this.eyes = [];
  }
  // ---- transform stack ----
  push(t) { this.stack.push(t); return this; }
  pop() { this.stack.pop(); return this; }
  tf(pts) { let p = P(pts); for (let i = this.stack.length - 1; i >= 0; i--) p = xf(p, this.stack[i]); return p; }
  pt(x, y) { return this.tf([[x, y]])[0]; }

  _add(stage, it) {
    it.stage = stage; it.id = this.items.length; it.seed = it.seed ?? (this.seed * 131 + it.id * 7);
    it.z = it.z ?? (this.zc[stage]++);
    this.items.push(it);
    return it;
  }
  _line(pts, o) { const c = this.tf(pts); return o.raw ? resample(c, 3) : spline(c, !!o.closed, 3); }

  // ---- rough: thin blue construction lines ----
  rough(pts, o = {}) {
    const it = { kind: 'pencil', pts: this._line(pts, o), w: o.w ?? 1.7, color: o.color ?? this.roughColor, alpha: o.alpha ?? .8, weight: o.weight ?? 1, dur: o.dur };
    // a rough line is quick and a little loose
    const r = rng(this.seed + this.items.length * 17), n = normals(it.pts), j = o.loose ?? 1.6;
    let ph = r() * 9; it.pts = it.pts.map((p, i) => { const k = Math.sin(i * .045 + ph) * j; return [p[0] + n[i][0] * k, p[1] + n[i][1] * k]; });
    return this._add('rough', prepStroke(it));
  }
  ellipse(cx, cy, rx, ry, o = {}) {
    const rot = o.rot ?? 0, a0 = o.from ?? -Math.PI * .62, a1 = o.to ?? a0 + Math.PI * 2.08, n = 48, pts = [];
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
    return this.rough(pts, { ...o, raw: true });
  }

  // ---- line art: tapered pen ----
  ink(pts, o = {}) {
    const it = { kind: 'pen', pts: this._line(pts, o), w: o.w ?? 3, taper: o.taper ?? [.18, .32], floor: o.floor, wobble: o.wobble,
      color: o.color ?? this.inkColor, alpha: o.alpha ?? 1, z: o.z, dur: o.dur, weight: o.weight ?? 1 };
    if (it.pts.length < 2) return null;
    return this._add('line', prepStroke(it));
  }

  // ---- regions (flat / shadow / highlight / finish) ----
  _region(stage, pts, o, defaults) {
    const c = this.tf(pts), outline = o.raw ? c : spline(c, true, 4);
    const it = { kind: 'fill', pts: outline, fill: o.fill ?? defaults.fill, mode: o.mode ?? defaults.mode, alpha: o.alpha ?? 1,
      blur: o.blur ?? 0, clip: o.clip ?? null, angle: o.angle ?? defaults.angle, brush: o.brush, reveal: o.reveal ?? defaults.reveal ?? 'sweep',
      z: o.z, dur: o.dur, weight: o.weight ?? 1, over: !!o.over, name: o.name, order: o.order };
    prepFill(it);
    return this._add(stage, it);
  }
  flat(name, pts, o = {}) {
    const it = this._region('flat', pts, { ...o, name }, { fill: '#ddd', angle: -.45 });
    (this.regions[name] ||= []).push(it);
    return it;
  }
  shadow(pts, o = {}) { return this._region('shadow', pts, o, { fill: '#b9a2b6', mode: 'multiply', angle: .5 }); }
  light(pts, o = {}) { return this._region('highlight', pts, o, { fill: '#fff6e0', mode: 'screen', angle: -.9 }); }
  glow(pts, o = {}) { return this._region('finish', pts, o, { fill: '#ffe7b8', mode: 'screen', angle: -.3, reveal: 'fade' }); }
  // a custom finish effect: draw(ctx, u, env) paints the effect at progress u (0 → 1); env = { t, art: Sketch, k }
  fx(draw, o = {}) {
    const box = o.box ?? { x: 100, y: 100, w: 800, h: 800 };
    const it = { kind: 'fx', draw, box: { ...box, cx: box.x + box.w / 2, cy: box.y + box.h / 2 }, over: !!o.over, z: o.z, dur: o.dur, weight: o.weight ?? 1, name: o.name };
    const sweep = []; for (let i = 0; i <= 6; i++) sweep.push([box.x + box.w * (i % 2 ? .85 : .15), box.y + box.h * i / 6]);
    it.sweep = resample(sweep, 8);
    return this._add('finish', it);
  }
  // recolour the line art during the finish (lines warm up / pick up the light): u-driven, `amount` 0…1
  inkTint(color, amount = .5, o = {}) { const it = this.fx(() => { }, { box: { x: 200, y: 200, w: 600, h: 600 }, ...o, name: 'inkTint' }); it.tint = { color, amount }; return it; }

  // ---- body marks (for the pose / body check, see references/BODY.md) ----
  mark(name, x, y) { this.marks[name] = this.pt(x, y); return this; }
  setPose(p) { this.pose = p; return this; }

  // ======== helpers that make many items at once ========

  // A hair lock: a tapering ribbon along a centreline (root → tip). Adds its two edge lines (+ inner strands) as ink, its
  // outline as a `name` flat (default 'hair'), and optionally a shade strip on one side (clipped to the hair).
  //   c: control points root → tip · w: width at the root · tip: 'point' | 'blunt' · strands: inner lines
  //   shade: 'l' | 'r' (side that gets a shadow strip) · edges: 'both' | 'l' | 'r' | 'none' · flat: false (lines only)
  lock(c, o = {}) {
    const name = o.name ?? 'hair', w = o.w ?? 40, line = spline(this.tf(c), false, 3), nrm = normals(line), n = line.length;
    const prof = u => (o.tip === 'blunt' ? lerp(1, .55, u) : Math.pow(1 - u, o.sharp ?? .85)) * (.82 + .18 * smooth(u / .18));
    const side = sgn => line.map((p, i) => { const u = i / (n - 1), h = w * prof(u) / 2 * sgn; return [p[0] + nrm[i][0] * h, p[1] + nrm[i][1] * h]; });
    const L = side(1), R = side(-1);
    const iw = o.inkW ?? 2.6, zc = o.z;
    const saved = this.stack; this.stack = [];   // L and R are already in picture space
    if (o.flat !== false) {
      const it = this.flat(name, [...L, ...R.slice().reverse()], { fill: o.fill, raw: true, z: zc, angle: o.angle, dur: o.flatDur, weight: o.flatWeight ?? .5, order: o.flatOrder });
      it.lock = true;
    }
    const e = o.edges ?? 'both';
    if (e === 'both' || e === 'l') this.ink(L, { raw: true, w: iw, taper: o.taper ?? [.12, .5], dur: o.inkDur, weight: o.inkWeight });
    if (e === 'both' || e === 'r') this.ink(R, { raw: true, w: iw * (o.rw ?? .9), taper: o.taper ?? [.12, .5], dur: o.inkDur, weight: o.inkWeight });
    const r = rng(this.seed * 7 + this.items.length);
    for (let k = 0; k < (o.strands ?? 1); k++) {
      const f = r.range(-.55, .55), u0 = r.range(.02, .3), u1 = r.range(.45, .85), pts = [];
      for (let i = Math.floor(u0 * (n - 1)); i <= Math.floor(u1 * (n - 1)); i++) { const u = i / (n - 1), h = w * prof(u) / 2 * f; pts.push([line[i][0] + nrm[i][0] * h, line[i][1] + nrm[i][1] * h]); }
      if (pts.length > 3) this.ink(pts, { raw: true, w: iw * .62, taper: [.3, .5], weight: .6 });
    }
    if (o.shade) {
      const sg = o.shade === 'l' ? 1 : -1, edge = sg > 0 ? L : R, inner = line.map((p, i) => { const u = i / (n - 1), h = w * prof(u) / 2 * sg * (o.shadeIn ?? .1); return [p[0] + nrm[i][0] * h, p[1] + nrm[i][1] * h]; });
      const a = Math.floor((o.shadeFrom ?? .05) * (n - 1)), b = Math.floor((o.shadeTo ?? .9) * (n - 1));
      this.shadow([...edge.slice(a, b), ...inner.slice(a, b).reverse()], { raw: true, fill: o.shadeFill, clip: name, alpha: o.shadeAlpha ?? 1, blur: o.shadeBlur ?? 1.5, weight: .4 });
    }
    this.stack = saved;
    return { L, R, line };
  }

  // A strip along one side of a line, widest in the middle and tapering to both ends: rim light, an edge shadow, the
  // light on a shoulder. stage 'highlight' (default) or 'shadow'; side 'l' / 'r' of the direction the points run;
  // w: widest width; taper: [in, out] fractions; plus any region option (fill, clip, blur, alpha, mode).
  edge(pts, o = {}) {
    const line = spline(this.tf(pts), false, 3), nrm = normals(line), N = line.length, w = o.w ?? 12, sg = o.side === 'r' ? -1 : 1;
    const [ti, to] = o.taper ?? [.25, .25];
    const inner = line.map((p, i) => { const u = i / (N - 1), h = w * smooth(Math.min(u / ti, 1)) * smooth(Math.min((1 - u) / to, 1)) * sg; return [p[0] + nrm[i][0] * h, p[1] + nrm[i][1] * h]; });
    const saved = this.stack; this.stack = [];
    const ring = [...line, ...inner.reverse()], opt = { ...o, raw: true };
    const it = o.stage === 'shadow' ? this.shadow(ring, opt) : this.light(ring, opt);
    this.stack = saved; return it;
  }

  // A lens (pointed at both ends, bulging by w in the middle) from a to b, bowed sideways by `bow`: a strand of hair
  // sheen, a glint on a lip, a crease. stage 'highlight' (default), 'shadow' or 'flat' (then o.name is required).
  lens(a, b, w, o = {}) {
    const [p, q] = this.tf([a, b]), dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = 14, bow = o.bow ?? 0;
    const side = sg => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, h = Math.sin(Math.PI * u) * (w / 2 * sg + bow * this._scale()); return [p[0] + dx * u + nx * h, p[1] + dy * u + ny * h]; });
    const ring = [...side(1), ...side(-1).reverse().slice(1, -1)], saved = this.stack; this.stack = [];
    const opt = { ...o, raw: true };
    const it = o.stage === 'shadow' ? this.shadow(ring, opt) : o.stage === 'flat' ? this.flat(o.name, ring, opt) : this.light(ring, opt);
    this.stack = saved; return it;
  }
  _scale() { let k = 1; for (const t of this.stack) k *= (t.sx ?? 1); return k; }

  // An anime eye. side 'L' / 'R' = which side of the picture it is on (its outer corner points that way).
  //   x, y: centre of the opening · w, h: size of the opening · tilt: radians (outer corner up +) · look: [dx, dy] iris shift
  //   iris: [top, bottom] colours · lash: line weight · open: 0…1 · id: unique name (the eye white is a clipping region)
  eye(o) {
    const { x, y, w, h } = o, side = o.side === 'L' ? -1 : 1, tilt = (o.tilt ?? 0) * side, id = o.id ?? `eye${this.items.length}`;
    const look = o.look ?? [0, 0], lw = o.lash ?? 5, op = o.open ?? 1, z = o.z ?? 40;
    // local frame: u 0 (inner corner) → 1 (outer), v up negative; convert to picture space
    const T = (u, v) => { const lx = (u - .5) * w * side, ly = v * h; const c = Math.cos(-tilt), s = Math.sin(-tilt); return [x + lx * c - ly * s, y + lx * s + ly * c]; };
    const L = arr => arr.map(([u, v]) => T(u, v));
    const upper = L([[-.02, .18], [.15, -.22 * op], [.45, -.5 * op], [.75, -.48 * op], [1, -.12 * op], [1.07, -.24 * op]]);
    const lower = L([[.3, .5 * op], [.62, .52 * op], [.9, .3 * op]]);
    const white = L([[0, .16], [.2, -.2 * op], [.48, -.44 * op], [.78, -.42 * op], [1, -.1 * op], [.86, .36 * op], [.55, .5 * op], [.22, .42 * op]]);
    const ord = o.order ?? 900;   // eyes are flatted after the skin by default
    this.flat(id, white, { fill: o.white ?? '#fbf7f2', z, weight: .5, order: ord });
    const ic = T(.53 + look[0], -.04 + look[1]), rx = w * (o.irisW ?? .27), ry = h * (o.irisH ?? .6) * Math.max(.6, op);
    const ell = (cx, cy, ax, ay, n = 28) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * ax, cy + Math.sin(a) * ay]; });
    const [it0, it1] = o.iris ?? ['#2d4c7a', '#7fb2de'];
    const gt = this.pt(ic[0], ic[1] - ry), gb = this.pt(ic[0], ic[1] + ry);   // gradient ends, in picture space
    this.flat(id + ':iris', ell(ic[0], ic[1], rx, ry), { fill: { linear: [...gt, ...gb], stops: [[0, it0], [1, it1]] }, clip: id, z: z + 1, raw: true, weight: .5, order: ord + .1 });
    this.flat(id + ':pupil', ell(ic[0], ic[1] + ry * .05, rx * .42, ry * .46), { fill: o.pupil ?? mix(it0, '#000000', .55), clip: id, z: z + 2, raw: true, weight: .3, order: ord + .2 });
    // line art: crease, upper lid (heavy), lashes, lower lid, iris rim
    this.ink(L([[.12, -.62 * op - .25], [.45, -.88 * op - .2], [.8, -.78 * op - .18]]), { w: lw * .32, taper: [.3, .4] });
    this.ink(upper, { w: lw, taper: [.35, .12], floor: .2 });
    this.ink(L([[.93, -.2 * op], [1.12, -.42 * op]]), { w: lw * .45, taper: [.1, .9] });
    this.ink(L([[.8, -.38 * op], [.94, -.68 * op]]), { w: lw * .35, taper: [.1, .9] });
    this.ink(lower, { w: lw * .32, taper: [.5, .5] });
    this.ink(ell(ic[0], ic[1], rx, ry, 30).slice(16, 30).concat(ell(ic[0], ic[1], rx, ry, 30).slice(0, 3)), { raw: true, w: lw * .28, taper: [.3, .3], alpha: .8 });
    // shadow under the lid, light in the iris, catchlights
    this.shadow(L([[-.05, .1], [.2, -.3 * op], [.5, -.56 * op], [.8, -.52 * op], [1.05, -.12 * op], [.8, .02], [.5, -.05], [.2, .05]]), { fill: o.lidShadow ?? '#8b8fb5', clip: id, alpha: .8, blur: 2, z: 50 });
    this.light(ell(ic[0] + rx * .1, ic[1] + ry * .45, rx * .7, ry * .32), { fill: o.irisLight ?? '#9fd0ff', clip: id + ':iris', mode: 'screen', blur: 3, alpha: .85, raw: true });
    const c1 = T(.53 + look[0] - .08 * side, -.2 + look[1]), c2 = T(.53 + look[0] + .09 * side, .2 + look[1]);
    this.light(ell(c1[0], c1[1], rx * .26, rx * .22), { fill: '#ffffff', mode: 'source-over', clip: id, raw: true, weight: .3 });
    this.light(ell(c2[0], c2[1], rx * .12, rx * .1), { fill: '#ffffff', mode: 'source-over', clip: id, raw: true, alpha: .9, weight: .3 });
    this.eyes.push({ side: o.side, id, c: this.pt(x, y), w: w * this._scale(), h: h * this._scale() });
    return { center: this.pt(...ic), id };
  }

  // finish-stage helpers ------------------------------------------------------------------------------------------
  // soft round light (a lamp, a rim, a bloom) that fades in
  bloom(x, y, r, o = {}) {
    const c = this.pt(x, y); const saved = this.stack; this.stack = [];
    const n = 40, pts = Array.from({ length: n }, (_, i) => [c[0] + Math.cos(i / n * 6.283) * r, c[1] + Math.sin(i / n * 6.283) * r]);
    const it = this.glow(pts, { raw: true, fill: { radial: [c[0], c[1], r], stops: [[0, o.color ?? 'rgba(255,230,180,.9)'], [1, 'rgba(255,230,180,0)']] }, mode: o.mode ?? 'screen', alpha: o.alpha ?? 1, over: o.over, clip: o.clip, weight: o.weight ?? .6 });
    this.stack = saved; return it;
  }
}
