// drawing.js — how a piece is authored: a list of strokes, recorded in the order a hand would lay them down.
// Nothing is drawn here. art() records; render.mjs / the live page play the strokes onto a Surface.
// Every helper takes a region (where), a tool (what with) and colour (a hex, a list to pick from, a ramp function,
// or fn(x, y, r) → colour), and turns it into marks: hatching, zig-zag scribbles, contour strokes around a form,
// side-of-stick passes, dabs, lines, blending, lifting.
import { rng, val, rgb, vary, wobble, catmull, seg, clamp, lerp, hashStr, smooth } from './core.js';
import { tool as mkTool } from './tools.js';
import { R } from './region.js';

const D2R = Math.PI / 180;

export class Drawing {
  constructor({ width = 1920, height = 1080, seed = 1, paper = {}, title = '' } = {}) {
    this.W = width; this.H = height; this.title = title;
    this.paper = paper;
    this.r = rng(seed);
    this.ops = [];
    this.stages = [];
    this.toolsUsed = new Map();
    this.full = R.rect(0, 0, width, height);
  }
  // ---- structure ----
  stage(name) { this.stages.push({ name, start: this.ops.length }); return this; }
  tool(t, over) { return typeof t === 'object' && !over ? t : mkTool(t, over); }
  // resolve a colour spec at a point
  colour(spec, x, y, r, amt) {
    let c;
    if (typeof spec === 'function') c = spec(x, y, r);
    else if (Array.isArray(spec) && typeof spec[0] !== 'number') c = spec[Math.floor(r() * spec.length)];
    else c = spec;
    return vary(rgb(c), r, amt);
  }
  push(pts, o, r) {
    const t = typeof o.tool === 'string' ? mkTool(o.tool) : o.tool;
    if (!t) throw new Error('every mark needs a tool');
    this.toolsUsed.set(t.name, (this.toolsUsed.get(t.name) || 0) + 1);
    const x = pts[Math.floor(pts.length / 2)][0], y = pts[Math.floor(pts.length / 2)][1];
    this.ops.push({
      pts, tool: t,
      col: o.col || this.colour(o.color ?? '#000', x, y, r, o.vary ?? 0.05),
      width: val(o.width ?? t.width, r),
      pressure: clamp(val(o.pressure ?? 0.7, r), 0, 1.2),
      opacity: o.opacity,
      seed: Math.floor(r() * 2 ** 31),
      mask: o.clip === false ? null : o.mask || null,
      feather: o.feather, rag: o.rag, taper: o.taper,
    });
  }

  // ---- single marks ----
  // a stroke along points (already in virtual px). wobble: hand tremor amplitude (px)
  stroke(pts, o = {}) {
    const r = o.r || this.r;
    let p = pts.length === 2 ? seg(pts[0], pts[1]) : pts;
    if (o.smooth) p = catmull(p, 6);
    if (o.wobble !== 0) p = wobble(p, r, o.wobble ?? 1.2, o.wobbleFreq ?? 0.025);
    this.push(p, o, r);
    return this;
  }
  // a drawn line: one to several passes, each a little off (a hand going over its line again)
  line(pts, o = {}) {
    const r = o.r || this.r, n = o.passes ?? 1;
    for (let i = 0; i < n; i++) {
      const off = i ? (o.passOffset ?? 1.2) : 0;
      const q = pts.map(([x, y]) => [x + (r() - 0.5) * off * 2, y + (r() - 0.5) * off * 2]);
      // a line drawn in pieces: long lines get broken into overlapping strokes, like a real hand
      const maxLen = o.maxLen ?? 260;
      const dense = q.length === 2 ? seg(q[0], q[1]) : (o.smooth ? catmull(q, 6) : q);
      let chunk = [dense[0]], L = 0;
      for (let k = 1; k < dense.length; k++) {
        L += Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]);
        chunk.push(dense[k]);
        if (L > maxLen * (0.7 + 0.6 * r()) && k < dense.length - 2) { this.stroke(chunk, { ...o, smooth: false, r }); chunk = [dense[k - 1], dense[k]]; L = 0; }
      }
      if (chunk.length > 1) this.stroke(chunk, { ...o, smooth: false, r });
    }
    return this;
  }
  // short marks at given points (lit windows, leaves, sparks, distant birds)
  dabs(points, o = {}) {
    const r = o.r || this.r;
    for (const p of points) {
      const [x, y] = p;
      const len = val(o.length ?? 4, r), ang = (val(o.angle ?? 0, r) + (r() - 0.5) * 2 * (o.angleJitter ?? 15)) * D2R;
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
      this.push(len < 0.5 ? [[x, y]] : [[x - dx, y - dy], [x, y + (r() - 0.5) * 0.4], [x + dx, y + dy]], { ...o, color: p[2] ?? o.color }, r);
    }
    return this;
  }

  // ---- filling a region ----
  // hatching: rows of short, slightly curved strokes. The workhorse.
  //   angle (deg) or angleAt(x, y) · angleJitter · length [a,b] · width [a,b] · spacing (px between marks) · pressure [a,b]
  //   curve (bow, fraction of length) · zigzag (legs per mark: back-and-forth scribble) · coverage (0..1 of grid cells used)
  //   clip (default true: marks stay in the region, edge softened by feather / rag) · order 'sweep' | 'random' · sweep (deg)
  hatch(region, o = {}) {
    const r = o.r || this.r.fork(this.ops.length);
    const [x0, y0, x1, y1] = region.bbox;
    const sp = o.spacing ?? 9, cover = o.coverage ?? 1;
    const cand = [];
    for (let y = y0 - sp * 0.5; y <= y1 + sp * 0.5; y += sp * (0.85 + 0.15 * r())) {
      for (let x = x0 - sp * 0.5; x <= x1 + sp * 0.5; x += sp) {
        const cx = x + (r() - 0.5) * sp * 1.1, cy = y + (r() - 0.5) * sp * 1.1;
        if (cover < 1 && r() > cover) continue;
        if (o.where && !o.where(cx, cy, r)) continue;
        if (!region.inside(cx, cy)) continue;
        cand.push([cx, cy]);
      }
    }
    const swp = (o.sweep ?? (o.angle ?? 45) + 90) * D2R, sx = Math.cos(swp), sy = Math.sin(swp);
    if (o.order === 'random') cand.sort(() => r() - 0.5);
    else { const jit = sp * 6; cand.sort((a, b) => a[0] * sx + a[1] * sy + ((hashStr(a + '') % 1000) / 1000) * jit - (b[0] * sx + b[1] * sy + ((hashStr(b + '') % 1000) / 1000) * jit)); }
    for (const [cx, cy] of cand) this.push(this.markPath(cx, cy, o, r), { ...o, mask: o.clip === false ? null : region }, r);
    return this;
  }
  // one hatch mark centred at (cx, cy)
  markPath(cx, cy, o, r) {
    const base = o.angleAt ? o.angleAt(cx, cy, r) : val(o.angle ?? 45, r);
    const ang = (base + (r() - 0.5) * 2 * (o.angleJitter ?? 8)) * D2R;
    const len = val(o.length ?? [14, 28], r), ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    const bow = (r() - 0.5) * 2 * (o.curve ?? 0.08) * len;
    const zz = o.zigzag ? Math.max(1, Math.round(val(o.zigzag, r))) : 1;
    let pts = [];
    if (zz <= 1) {
      for (let k = 0; k <= 4; k++) { const t = k / 4 - 0.5, b = bow * (1 - 4 * t * t); pts.push([cx + ux * t * len + vx * b, cy + uy * t * len + vy * b]); }
    } else {
      // back-and-forth scribble: legs side by side, joined by tight turns
      const gap = val(o.legGap ?? (val(o.width ?? 8, r) * 0.7), r);
      for (let l = 0; l < zz; l++) {
        const off = (l - (zz - 1) / 2) * gap, dir = l % 2 ? -1 : 1, sh = (r() - 0.5) * len * 0.15;
        pts.push([cx + vx * off - ux * dir * len * 0.5 + ux * sh, cy + vy * off - uy * dir * len * 0.5 + uy * sh]);
        pts.push([cx + vx * off + ux * dir * len * 0.5 + ux * sh + vx * bow * 0.3, cy + vy * off + uy * dir * len * 0.5 + uy * sh + vy * bow * 0.3]);
      }
      pts = catmull(pts, 5);
    }
    return o.wobble === 0 ? pts : wobble(pts, r, o.wobble ?? 0.8, 0.05);
  }
  // side of the stick: broad, light passes that let the grain speak (underlayers, haze, glazes)
  side(region, o = {}) {
    return this.hatch(region, { width: [26, 42], length: [40, 90], spacing: 22, pressure: [0.35, 0.55], angleJitter: 10, curve: 0.05, ...o });
  }
  // little loops and ovals: foliage, smoke, froth, crowds of tiny things
  scumble(region, o = {}) {
    const r = o.r || this.r.fork(this.ops.length);
    const [x0, y0, x1, y1] = region.bbox, sp = o.spacing ?? 10;
    for (let y = y0; y <= y1; y += sp) for (let x = x0; x <= x1; x += sp) {
      const cx = x + (r() - 0.5) * sp, cy = y + (r() - 0.5) * sp;
      if ((o.coverage ?? 1) < 1 && r() > o.coverage) continue;
      if (o.where && !o.where(cx, cy, r)) continue;
      if (!region.inside(cx, cy)) continue;
      const rad = val(o.size ?? [3, 7], r), turns = val(o.turns ?? [1, 2], r), a0 = r() * 6.283, sq = val(o.squash ?? 0.7, r);
      const pts = [], n = Math.ceil(turns * 10);
      for (let k = 0; k <= n; k++) { const a = a0 + (k / n) * turns * 6.283, rr = rad * (0.8 + 0.3 * r()); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq + (k / n) * rad * 0.4]); }
      this.push(pts, { ...o, mask: o.clip ? region : null }, r);
    }
    return this;
  }
  // form hatching around round masses: clouds, crowns of trees, rocks, bushes, fruit.
  //   lobes [[cx,cy,r],…] back to front · light [x,y,z] · shade(t, x, y) → colour (t = 0 shadow … 1 lit)
  //   lobe (0..1: how much each lobe's own roundness shows; low = one body, high = bubbles) · floor (y: flat underside)
  //   spacing, length, width, pressure · around (0..1: how many marks near the rim follow the form; inside, marks hatch at
  //   angle ± angleJitter) · wrap (light wrap) · shadeAt(t, x, y, ny) → t (darken the underside, warm the side facing a light)
  form(lobes, o = {}) {
    const r = o.r || this.r.fork(this.ops.length);
    let [lx, ly, lz] = o.light ?? [-0.5, -0.6, 0.6];
    const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln;
    const sp = o.spacing ?? 9;
    // the mass as a whole (one big rounded form): a cloud is lit as one body, its lobes only nudge the shading
    let mx = 0, my = 0, mw = 0;
    for (const [cx, cy, rad] of lobes) { mx += cx * rad * rad; my += cy * rad * rad; mw += rad * rad; }
    mx /= mw; my /= mw;
    let mr = 1; for (const [cx, cy, rad] of lobes) mr = Math.max(mr, Math.hypot(cx - mx, cy - my) + rad);
    const lobeMix = o.lobe ?? 0.35;
    for (const [cx, cy, rad] of lobes) {
      let reg = R.circle(cx, cy, rad * (o.clipScale ?? 1.02));
      if (o.floor != null) reg = R.minus(reg, R.rect(cx - rad - 2, o.floor, rad * 2 + 4, rad * 2 + 4)); // flat underside
      const n = Math.max(3, Math.round((Math.PI * rad * rad) / (sp * sp)));
      const marks = [];
      for (let i = 0; i < n; i++) {
        const rr = rad * Math.sqrt(r()) * 0.98, th = r() * 6.283;
        marks.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
      }
      // a hand works a form from its shadow side toward its light
      marks.sort((a, b) => ((a[0] - cx) * lx + (a[1] - cy) * ly) - ((b[0] - cx) * lx + (b[1] - cy) * ly));
      for (const [px, py] of marks) {
        const nx = (px - cx) / rad, ny = (py - cy) / rad, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const gx = (px - mx) / mr, gy = (py - my) / mr, gz = Math.sqrt(Math.max(0, 1 - gx * gx - gy * gy));
        const lam = (gx * lx + gy * ly + gz * lz) * (1 - lobeMix) + (nx * lx + ny * ly + nz * lz) * lobeMix;
        let tt = clamp((lam + (o.wrap ?? 0.35)) / (1 + (o.wrap ?? 0.35)) + (r() - 0.5) * (o.shadeJitter ?? 0.12));
        if (o.shadeAt) tt = clamp(o.shadeAt(tt, px, py, gy));
        const c = o.shade ? o.shade(tt, px, py, r) : o.color;
        const len = val(o.length ?? [10, 22], r);
        const rho = Math.hypot(px - cx, py - cy) || 1;
        // near the rim the hand follows the form; inside it hatches in one loose direction (no target rings)
        const around = (o.around ?? 0.5) * smooth(0.45, 0.95, rho / rad);
        let pts;
        if (r() >= around) {
          const ang = (val(o.angle ?? 35, r) + (r() - 0.5) * 2 * (o.angleJitter ?? 14)) * D2R, bow = (r() - 0.5) * len * 0.2;
          const ux = Math.cos(ang), uy = Math.sin(ang);
          pts = [];
          for (let k = 0; k <= 4; k++) { const t = k / 4 - 0.5, b = bow * (1 - 4 * t * t); pts.push([px + ux * t * len - uy * b, py + uy * t * len + ux * b]); }
        } else {
          const th0 = Math.atan2(py - cy, px - cx), span = len / rho;
          pts = [];
          for (let k = 0; k <= 5; k++) { const th = th0 + (k / 5 - 0.5) * span, rk = rho * (1 + (r() - 0.5) * 0.04); pts.push([cx + Math.cos(th) * rk, cy + Math.sin(th) * rk]); }
        }
        this.push(wobble(pts, r, 0.6, 0.06), { ...o, color: c, mask: o.clip === false ? null : reg }, r);
      }
    }
    return this;
  }
  // finger blending over a region (soften a sky, push a distance back)
  blend(region, o = {}) { return this.hatch(region, { tool: 'blender', width: [20, 34], length: [40, 80], spacing: 26, pressure: [0.6, 0.9], color: '#000', vary: 0, ...o }); }
  // lift pigment back toward the paper (shafts of light, mist)
  lift(region, o = {}) { return this.hatch(region, { tool: 'eraser', color: '#fff', vary: 0, ...o }); }
  // escape hatch: fn(drawing, r) can call push / stroke directly
  custom(fn) { fn(this, this.r.fork(this.ops.length)); return this; }
}
export { R } from './region.js';
export { tool, TOOLS } from './tools.js';
export * as core from './core.js';
