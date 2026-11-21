// engraving-collage-film · engrave.js — the engraver. A Plate is a sheet of paper you paint TONES on (not pixels):
// every fill carries a tone (0 = paper white … 1 = solid ink), a line angle, a line gap and a wave. When the plate is
// finished, one pixel pass turns those tone maps into a 19th-century wood / steel engraving: parallel lines whose
// width swells with the tone (the burin cuts deeper where it is darker), a second crossing set in the shadows, broken
// dashes in the lightest greys, a hair of hand wobble. Outlines are just fills at tone 1, so later fills cover earlier
// lines the way an engraver works front over back. The result is cut out along its drawing (optionally with a white
// paper margin) — a card, ready to stand in the 3D world.
//
//   const P = new Plate(900, 1400, { seed: 7, gap: 5 })
//   P.fill(P.rect(0, 200, 900, 1200), { tone: 0.3, angle: 0 })                 // a wall: light horizontal lines
//   P.fill(P.rect(80, 300, 120, 220), { tone: { from: 0.9, to: 0.55, y0: 300, y1: 520 }, angle: 90 })   // a window
//   P.stroke(P.rect(80, 300, 120, 220), 2.4)                                    // its frame
//   const card = P.done({ margin: 6 })   → { canvas, blur, shadow, w, h, ink, cover }
//
// Angles in degrees: 0 = horizontal lines, 90 = vertical. Gap in px between line centres (4–7 is the engraving range
// at 90 px per metre; finer for small far things). Wave 0…1 bends the lines (water, cloth, cloud). All deterministic.
import { clamp, hash01, sid } from './core.js';

export const PAPER = [247, 245, 239];
export const INK = [26, 25, 24];
export const PAPER_CSS = `rgb(${PAPER})`;

// a tiled value-noise field (bilinear), built once: the engraver's hand wobble
const NN = 256, NOISE = (() => {
  const g = new Float32Array(NN * NN), cell = 32, h = (i, j) => hash01(i & 7, j & 7, 911) * 2 - 1;
  for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    g[y * NN + x] = (h(i, j) * (1 - su) + h(i + 1, j) * su) * (1 - sv) + (h(i, j + 1) * (1 - su) + h(i + 1, j + 1) * su) * sv;
  }
  return g;
})();
const COS = new Float32Array(256), SIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const a = (i / 255) * Math.PI; COS[i] = Math.cos(a); SIN[i] = Math.sin(a); }

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

export class Plate {
  /** w, h in px. o = { seed, gap: default line gap px, angle: default line angle, wave: default wave } */
  constructor(w, h, o = {}) {
    this.w = Math.round(w); this.h = Math.round(h);
    this.seed = typeof o.seed === 'string' ? sid(o.seed) : (o.seed ?? 1) >>> 0;
    this.gap = o.gap ?? 5; this.angle = o.angle ?? 0; this.wave = o.wave ?? 0;
    this.T = mk(this.w, this.h).getContext('2d', { willReadFrequently: true });   // R = tone, A = cut-out mask
    this.S = mk(this.w, this.h).getContext('2d', { willReadFrequently: true });   // R = angle, G = gap, B = wave
    for (const c of [this.T, this.S]) { c.lineJoin = 'round'; c.lineCap = 'round'; }
  }
  // ── shapes (Path2D builders, in px) ──
  rect(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
  poly(pts, close = true) { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); if (close) p.closePath(); return p; }
  ellipse(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); return p; }
  arch(x, y, w, h) { const p = new Path2D(), r = w / 2; p.moveTo(x, y + h); p.lineTo(x, y + r); p.arc(x + r, y + r, r, Math.PI, 0); p.lineTo(x + w, y + h); p.closePath(); return p; }
  path(fn) { const p = new Path2D(); fn(p); return p; }
  /** a soft lumpy blob (cloud, foliage, rock) from overlapping circles, seeded */
  blob(cx, cy, rx, ry, n = 9, seed = 1, rough = 0.35) {
    const p = new Path2D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(seed, i) * 0.5, rr = 0.55 + hash01(seed, i, 2) * rough;
      const x = cx + Math.cos(a) * rx * (1 - rr * 0.5), y = cy + Math.sin(a) * ry * (1 - rr * 0.5), r = Math.min(rx, ry) * rr;
      p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
    }
    p.moveTo(cx + rx * 0.6, cy); p.ellipse(cx, cy, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
    return p;
  }

  _style(o) {
    const a = (((o.angle ?? this.angle) % 180) + 180) % 180, g = clamp(o.gap ?? this.gap, 1.5, 15.9), wv = clamp(o.wave ?? this.wave, 0, 1);
    return `rgb(${Math.round((a / 180) * 255)},${Math.round(g * 16)},${Math.round(wv * 255)})`;
  }
  _tone(c, t) {
    if (typeof t === 'number') return `rgb(${Math.round(clamp(t) * 255)},0,0)`;
    const gr = t.r != null ? c.createRadialGradient(t.cx, t.cy, t.r0 ?? 0, t.cx, t.cy, t.r) : c.createLinearGradient(t.x0 ?? 0, t.y0 ?? 0, t.x1 ?? 0, t.y1 ?? 0);
    const stops = t.stops || [[0, t.from], [1, t.to]];
    for (const [k, v] of stops) gr.addColorStop(k, `rgb(${Math.round(clamp(v) * 255)},0,0)`);
    return gr;
  }
  /** fill a shape with a tone. o = { tone: 0.4 | { from, to, x0, y0, x1, y1 } | { cx, cy, r, from, to } | { stops: [[k, tone] …] … },
   *  angle, gap, wave, rule: 'nonzero' | 'evenodd' } */
  fill(shape, o = {}) {
    const rule = o.rule || 'nonzero';
    this.T.fillStyle = this._tone(this.T, o.tone ?? 0.3); this.T.fill(shape, rule);
    this.S.fillStyle = this._style(o); this.S.fill(shape, rule);
    return this;
  }
  /** paper white inside the cut-out (a highlight, a window frame, a sail) */
  white(shape, o = {}) { return this.fill(shape, { ...o, tone: 0 }); }
  /** fill a shape with only its OUTER outline inked (blobs made of overlapping circles: foliage, rocks, smoke) */
  solid(shape, o = {}, width = 1.8) { this.stroke(shape, width * 2, o); return this.fill(shape, o); }
  /** an engraved line: a stroke at tone 1 (solid ink), or o.tone for a grey line; widths ≥ 1.2 px */
  stroke(shape, width = 2, o = {}) {
    const c = this.T; c.lineWidth = Math.max(1.2, width); c.strokeStyle = `rgb(${Math.round(clamp(o.tone ?? 1) * 255)},0,0)`; c.stroke(shape);
    this.S.lineWidth = c.lineWidth; this.S.strokeStyle = this._style(o); this.S.stroke(shape);
    return this;
  }
  line(x0, y0, x1, y1, width = 2, o = {}) { return this.stroke(this.poly([[x0, y0], [x1, y1]], false), width, o); }
  /** many short parallel strokes along a path direction — for bark, grass, fur, rope (o.n, o.len, o.jit, o.width) */
  strokes(pts, o = {}) {
    const p = new Path2D(), len = o.len ?? 12, ang = (o.dir ?? 90) * Math.PI / 180;
    pts.forEach(([x, y], i) => { const j = (hash01(this.seed, i, 5) - 0.5) * (o.jit ?? 0.4), l = len * (0.6 + 0.6 * hash01(this.seed, i, 6)); p.moveTo(x, y); p.lineTo(x + Math.cos(ang + j) * l, y + Math.sin(ang + j) * l); });
    return this.stroke(p, o.width ?? 1.6, o);
  }

  /** the pixel pass: tone maps → engraved lines, cut out. o = { margin: white paper px around the cut, blur: px for the
   *  out-of-focus copy, light: false to skip the shadow silhouette } */
  done(o = {}) {
    const W = this.w, H = this.h, td = this.T.getImageData(0, 0, W, H).data, sd = this.S.getImageData(0, 0, W, H).data;
    const out = mk(W, H), oc = out.getContext('2d'), img = oc.createImageData(W, H), d = img.data;
    const ph = hash01(this.seed, 3) * 100, ph2 = hash01(this.seed, 4) * 100, ox = (this.seed % 97) * 7, oy = ((this.seed >>> 8) % 89) * 5;
    let inked = 0, cover = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, A = td[i + 3];
        if (A < 6) { d[i + 3] = 0; continue; }
        cover++;
        const T = td[i] / 255;
        let cov = 0;
        if (T > 0.94) cov = 1;
        else if (T > 0.025) {
          const ai = sd[i], gap = sd[i + 1] / 16 || this.gap, wave = sd[i + 2] / 255, c = COS[ai], s = SIN[ai];
          const n = NOISE[((y + oy) & (NN - 1)) * NN + ((x + ox) & (NN - 1))];
          const along = x * c + y * s, across = -x * s + y * c;
          let u = across / gap + n * 0.22 + wave * 1.1 * Math.sin(along / (gap * 7) + ph + across / (gap * 23));
          const li = Math.floor(u), f = u - li, dd = Math.abs(f - 0.5);
          // the burin swells with the tone, and a little along the line
          const sw = 1 + 0.18 * NOISE[((Math.floor(along / 3) + li * 37) & (NN - 1)) * NN + ((li * 13) & (NN - 1))];
          // never thinner than ~0.75 px (thinner lines alias into grit); light greys come from dashes instead
          const half = Math.max(0.5 * Math.pow(T, 0.82) * sw, Math.min(0.4, 0.38 / gap));
          // distance from the line centre (lines sit at f = 0.5) in gap units is |f − 0.5|; ink where it is under half,
          // with a 1 px antialiased edge
          cov = clamp((half - dd) * gap + 0.5);
          if (T < 0.24) {   // the lightest greys break into long dashes and flicks, tapering at their ends
            const L = gap * 9, a2 = along / L + hash01(li, this.seed) * 7, sg = Math.floor(a2), fr = a2 - sg;
            const keep = T / 0.24, on = hash01(li, sg, this.seed) < keep;
            const taper = Math.min(1, Math.min(fr, 1 - fr) * 6);
            cov = on ? cov * taper : 0;
          }
          if (T > 0.58) {  // shadows get a crossing set
            const a2 = (ai + 76) & 255, c2 = COS[a2], s2 = SIN[a2], u2 = (-x * s2 + y * c2) / (gap * 1.05) + n * 0.3 + ph2;
            const half2 = 0.5 * Math.pow((T - 0.58) / 0.36, 1.05) * 0.95;
            cov = Math.max(cov, clamp((half2 - Math.abs(u2 - Math.floor(u2) - 0.5)) * gap + 0.5));
          }
        }
        if (cov > 0.5) inked++;
        d[i] = PAPER[0] + (INK[0] - PAPER[0]) * cov; d[i + 1] = PAPER[1] + (INK[1] - PAPER[1]) * cov; d[i + 2] = PAPER[2] + (INK[2] - PAPER[2]) * cov;
        d[i + 3] = A;
      }
    }
    oc.putImageData(img, 0, 0);
    let canvas = out;
    if (o.margin) {   // a white paper margin around the cut, like scissors that stayed a little outside the drawing
      const m = o.margin, c2 = mk(W + 2 * m, H + 2 * m), x2 = c2.getContext('2d'), sil = mk(W, H), sx = sil.getContext('2d');
      sx.drawImage(out, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = PAPER_CSS; sx.fillRect(0, 0, W, H);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; x2.drawImage(sil, m + Math.cos(a) * m, m + Math.sin(a) * m); }
      x2.drawImage(sil, m, m); x2.drawImage(out, m, m); canvas = c2;
    }
    const res = { canvas, w: canvas.width, h: canvas.height, pad: o.margin || 0, ink: cover ? inked / cover : 0, cover: cover / (W * H) };
    // the out-of-focus copy (foreground cards in the comp) and the soft lift shadow (a quarter-size blurred silhouette)
    const br = o.blur ?? Math.max(4, Math.round(Math.min(res.w, res.h) / 90));
    res.blur = mk(res.w, res.h); { const b = res.blur.getContext('2d'); b.filter = `blur(${br}px)`; b.drawImage(canvas, 0, 0); }
    if (o.light !== false) {
      const q = 4, sh = mk(res.w / q + 24, res.h / q + 24), sx = sh.getContext('2d');
      sx.filter = 'blur(5px)'; sx.drawImage(canvas, 12, 12, res.w / q, res.h / q);
      sx.filter = 'none'; sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, sh.width, sh.height);
      res.shadow = sh; res.shadowPad = 12 * q;
    }
    return res;
  }
}
