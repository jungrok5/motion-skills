// surface.js — the sheet of paper. Holds colour, how full the grain is, and the grain itself, at output resolution.
// apply(op) lays one stroke. Pure JS on typed arrays: the same code runs in Node (render, check) and in the browser (live page).
import { rgb, hash2, vnoise, clamp, smooth } from './core.js';
import { feather } from './region.js';

export class Surface {
  // W, H: virtual size; scale: output px per virtual px; paper: { color, grain (virtual px), tooth (contrast 0..1.5), fibre, seed }
  constructor(W, H, scale = 1, paper = {}) {
    this.W = W; this.H = H; this.s = scale;
    const w = (this.w = Math.round(W * scale)), h = (this.h = Math.round(H * scale));
    this.paper = { color: '#efe5d3', grain: 1.3, tooth: 1, fibre: 0.25, seed: 7, ...paper };
    this.rgb = new Float32Array(w * h * 3);
    this.fill = new Float32Array(w * h);
    this.tooth = new Float32Array(w * h);
    this.maskCache = new Map();
    this.tmpCov = new Float32Array(1 << 16);
    this.tmpTex = new Float32Array(1 << 16);
    this.dirty = null;
    this.makePaper();
  }
  makePaper() {
    const { w, h, s } = this, p = this.paper, base = rgb(p.color), seed = p.seed;
    const g = Math.max(0.9, p.grain * s); // grain cell in output px (never below a pixel)
    let sum = 0, sum2 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // fine tooth + honeycomb-ish medium tooth + slow felt + laid fibres
      const fine = vnoise(x / g, y / g, seed);
      const med = vnoise(x / (g * 3.1) + 0.5 * vnoise(x / (g * 9), y / (g * 9), seed + 3), y / (g * 2.6), seed + 1);
      const felt = vnoise(x / (g * 22), y / (g * 18), seed + 2);
      const fib = vnoise(x / (g * 1.2), y / (g * 14), seed + 4);
      const v = 0.46 * fine + 0.32 * med + 0.12 * felt + p.fibre * 0.3 * fib;
      this.tooth[y * w + x] = v; sum += v; sum2 += v * v;
    }
    const n = w * h, mean = sum / n, sd = Math.sqrt(Math.max(1e-9, sum2 / n - mean * mean));
    const k = (0.17 * p.tooth) / sd;
    for (let i = 0; i < n; i++) {
      const t = clamp(0.5 + (this.tooth[i] - mean) * k);
      this.tooth[i] = t;
      const shade = 0.965 + 0.06 * t; // paper itself is a little mottled
      this.rgb[i * 3] = base[0] * shade; this.rgb[i * 3 + 1] = base[1] * shade; this.rgb[i * 3 + 2] = base[2] * shade;
    }
    this.paperRGB = base;
  }
  mask(region, fe) {
    const key = region.id + ':' + fe;
    let m = this.maskCache.get(key);
    if (!m) {
      m = feather(region.rasterAt(this.s), fe * this.s);
      if (this.maskCache.size > 400) this.maskCache.clear();
      this.maskCache.set(key, m);
    }
    return m;
  }
  markDirty(x0, y0, x1, y1) {
    const d = this.dirty;
    if (!d) this.dirty = [x0, y0, x1, y1];
    else { d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1); }
  }

  // op: { pts:[[x,y]…] (virtual), tool, col:[r,g,b], width, pressure, seed, mask?, feather, rag }
  apply(op) {
    const t = op.tool, s = this.s, { w, h } = this;
    const pts = op.pts;
    if (!pts || pts.length < 1) return;
    const R = Math.max(0.55, (op.width * s) / 2);
    // resample the path into stamps
    const stepPx = Math.max(0.5, R * 0.3);
    const P = [];
    let L = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * s; segL.push(d); L += d; }
    if (pts.length === 1 || L < 0.01) {
      P.push([pts[0][0] * s, pts[0][1] * s, 1, 0, 0.5]);
    } else {
      const n = Math.max(2, Math.ceil(L / stepPx));
      let si = 0, acc = 0;
      for (let k = 0; k <= n; k++) {
        const target = (k / n) * L;
        while (si < segL.length - 1 && acc + segL[si] < target) { acc += segL[si]; si++; }
        const f = segL[si] ? (target - acc) / segL[si] : 0;
        const a = pts[si], b = pts[si + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        P.push([(a[0] + dx * f) * s, (a[1] + dy * f) * s, dx / d, dy / d, k / n]);
      }
    }
    // bbox
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const p of P) { if (p[0] < bx0) bx0 = p[0]; if (p[1] < by0) by0 = p[1]; if (p[0] > bx1) bx1 = p[0]; if (p[1] > by1) by1 = p[1]; }
    bx0 = Math.max(0, Math.floor(bx0 - R - 2)); by0 = Math.max(0, Math.floor(by0 - R - 2));
    bx1 = Math.min(w - 1, Math.ceil(bx1 + R + 2)); by1 = Math.min(h - 1, Math.ceil(by1 + R + 2));
    if (bx1 < bx0 || by1 < by0) return;
    const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, N = bw * bh;
    if (this.tmpCov.length < N) { this.tmpCov = new Float32Array(N * 1.5); this.tmpTex = new Float32Array(N * 1.5); }
    const cov = this.tmpCov, tex = this.tmpTex;
    cov.fill(0, 0, N);
    const seed = op.seed | 0;
    const [tin, tout] = op.taper || t.taper;
    const pr = op.pressure;
    const soft = Math.min(0.6, 1.3 / R);
    const edge = t.edge;

    if (t.kind === 'blend') return this.blendStroke(op, P, R, bx0, by0, bx1, by1);

    for (const [cx, cy, tx, ty, u] of P) {
      // pressure profile along the stroke: builds in, lifts out, wavers with the hand
      const prof = smooth(0, tin || 1e-3, u) * (1 - smooth(1 - (tout || 1e-3), 1, u)) * (0.82 + 0.36 * vnoise(u * 5, 0.5, seed));
      const prw = Math.max(0.15, prof);
      const rr = R * (0.7 + 0.3 * prw);
      const x0 = Math.max(bx0, Math.floor(cx - rr - 1)), x1 = Math.min(bx1, Math.ceil(cx + rr + 1));
      const y0 = Math.max(by0, Math.floor(cy - rr - 1)), y1 = Math.min(by1, Math.ceil(cy + rr + 1));
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx;
          let d = Math.sqrt(dx * dx + dy * dy) / rr;
          if (d > 1.15) continue;
          d += (vnoise(x * 0.55, y * 0.55, seed) - 0.5) * edge * 0.5;
          const c = (1 - smooth(1 - soft, 1, d)) * prof;
          if (c <= 0) continue;
          const k = (y - by0) * bw + (x - bx0);
          if (c > cov[k]) { cov[k] = c; tex[k] = (-ty * dx + tx * dy) / R; }
        }
      }
    }
    // tip striations: a fixed random profile across the tip
    const nStreak = Math.max(2, R / 1.25);
    const streak = t.streak, powder = t.powder, tooth = t.tooth, gain = t.gain, opac = t.opacity * (op.opacity ?? 1);
    const lev = t.level, sat = t.sat, fr = t.fillRate, smear = t.smear;
    const col = op.col, lift = t.kind === 'lift', paper = this.paperRGB;
    let m = null, rag = op.rag ?? 0.35;
    if (op.mask) m = this.mask(op.mask, op.feather ?? 1.2);
    const T = this.tooth, F = this.fill, C = this.rgb, gs = 1 / Math.max(1, this.paper.grain * s * 1.1);
    for (let j = 0; j < bh; j++) {
      const y = by0 + j;
      for (let i = 0; i < bw; i++) {
        const k = j * bw + i, c = cov[k];
        if (c <= 0) continue;
        const x = bx0 + i, p = y * w + x;
        let mv = 1;
        if (m) {
          const mx = x - m.x0, my = y - m.y0;
          if (mx < 0 || my < 0 || mx >= m.w || my >= m.h) continue;
          mv = m.data[my * m.w + mx];
          if (mv <= 0.001) continue;
          if (mv < 0.999 && rag > 0) mv = smooth(0.5 - rag * 0.5, 0.5 + rag * 0.5, mv + (T[p] - 0.5) * rag);
          if (mv <= 0) continue;
        }
        const st = vnoise((tex[k] + 1) * nStreak, 0.5, seed + 11);
        const P0 = pr * c * (1 - streak * (1 - st) * 1.2);
        const H = T[p], Fv = F[p];
        const He = H + Fv * (1 - H) * lev;
        let a = clamp((P0 - (1 - He) * tooth) * gain) * opac * (1 - Fv * sat);
        if (powder > 0) { const r = vnoise(x * gs, y * gs, seed + 5); a *= 1 - powder * smooth(0.35, 0.95, r); }
        a *= mv;
        if (a <= 0.002) continue;
        const q = p * 3;
        if (lift) {
          C[q] += (paper[0] - C[q]) * a; C[q + 1] += (paper[1] - C[q + 1]) * a; C[q + 2] += (paper[2] - C[q + 2]) * a;
          F[p] = Math.max(0, Fv - a * 0.8);
          continue;
        }
        let r0 = col[0], g0 = col[1], b0 = col[2];
        if (smear > 0) { const sm = smear * c; r0 += (C[q] - r0) * sm; g0 += (C[q + 1] - g0) * sm; b0 += (C[q + 2] - b0) * sm; }
        C[q] += (r0 - C[q]) * a; C[q + 1] += (g0 - C[q + 1]) * a; C[q + 2] += (b0 - C[q + 2]) * a;
        F[p] = Math.min(1, Fv + a * fr);
      }
    }
    this.markDirty(bx0, by0, bx1, by1);
  }

  // finger / stump: carry a little colour along the path and lay it down, softening edges and filling grain
  blendStroke(op, P, R, bx0, by0, bx1, by1) {
    const { w } = this, C = this.rgb, F = this.fill, T = this.tooth, t = op.tool, seed = op.seed | 0;
    const str = t.opacity * (op.opacity ?? 1) * op.pressure;
    let m = null;
    if (op.mask) m = this.mask(op.mask, op.feather ?? 2);
    let car = null;
    for (const [cx, cy] of P) {
      // sample under the finger
      let sr = 0, sg = 0, sb = 0, n = 0;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * R * 0.5), y = Math.round(cy + Math.sin(a) * R * 0.5);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const q = (y * w + x) * 3; sr += C[q]; sg += C[q + 1]; sb += C[q + 2]; n++;
      }
      if (!n) continue;
      const smp = [sr / n, sg / n, sb / n];
      car = car ? [car[0] + (smp[0] - car[0]) * 0.3, car[1] + (smp[1] - car[1]) * 0.3, car[2] + (smp[2] - car[2]) * 0.3] : smp;
      const x0 = Math.max(bx0, Math.floor(cx - R)), x1 = Math.min(bx1, Math.ceil(cx + R)), y0 = Math.max(by0, Math.floor(cy - R)), y1 = Math.min(by1, Math.ceil(cy + R));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R;
        if (d >= 1) continue;
        const p = y * w + x;
        let mv = 1;
        if (m) { const mx = x - m.x0, my = y - m.y0; if (mx < 0 || my < 0 || mx >= m.w || my >= m.h) continue; mv = m.data[my * m.w + mx]; }
        const a = (1 - d * d) * str * 0.25 * mv * (0.7 + 0.6 * T[p]) * (0.8 + 0.4 * hash2(x, y, seed));
        if (a <= 0.002) continue;
        const q = p * 3;
        C[q] += (car[0] - C[q]) * a; C[q + 1] += (car[1] - C[q + 1]) * a; C[q + 2] += (car[2] - C[q + 2]) * a;
        F[p] = Math.min(1, F[p] + a * 0.3);
      }
    }
    this.markDirty(bx0, by0, bx1, by1);
  }

  // write into an RGBA byte buffer (ImageData.data or a PNG row buffer); optional sub-rect
  toRGBA(out, rect) {
    const { w } = this, C = this.rgb;
    const [x0, y0, x1, y1] = rect || [0, 0, this.w - 1, this.h - 1];
    const rw = x1 - x0 + 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = y * w + x, q = p * 3, o = rect ? ((y - y0) * rw + (x - x0)) * 4 : p * 4;
      out[o] = C[q] * 255 + 0.5; out[o + 1] = C[q + 1] * 255 + 0.5; out[o + 2] = C[q + 2] * 255 + 0.5; out[o + 3] = 255;
    }
    return out;
  }
}
