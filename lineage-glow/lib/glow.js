// lineage-glow · glow.js — the painter handed to every world layer: glowing lines, nodes, flares, the horizon line,
// labels and cached fibre fields, all in WORLD coordinates (the root at 0,0, up is −y) seen through the camera.
// Everything is drawn additively ('lighter') on a near-black ground, so overlaps brighten like light, never paint over.
import { clamp, rgba, mixc, bez, bezSeg, sCurve } from './core.js';

// the palette of the style. A project may override any key (new Film({ palette: {...} })), but keep it warm-on-black.
export const PALETTE = {
  bg: '#090605',        // ground
  bg2: '#1a110a',       // warm haze behind the root
  core: '#fff4dc',      // white-hot centre of a lit node / line
  line: '#f3c27c',      // a lit line
  halo: '#d98a32',      // glow around lit things
  deep: '#8a4d17',      // far, faint fibres
  off: '#9a958e',       // a switched-off node / line (grey, cool)
  offHalo: '#5d5a56',
  text: '#f5efe4',      // captions
  mute: '#a49d92',      // axis, small labels
  gold: '#f6c46a',      // counter label, highlighted words, a gold climax number
};

// sprites: soft round glows drawn once, stamped many times (fast for hundreds of nodes)
function sprite(inner, mid, outer, size = 128, hot = .16) {
  const c = new OffscreenCanvas(size, size), x = c.getContext('2d'), r = size / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgba(inner, 1)); g.addColorStop(hot, rgba(inner, .95)); g.addColorStop(hot * 1.9, rgba(mid, .55));
  g.addColorStop(.45, rgba(outer, .16)); g.addColorStop(1, rgba(outer, 0));
  x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
}
export function makeSprites(P) {
  return {
    lit: sprite(P.core, P.line, P.halo),
    off: sprite('#d8d4ce', P.off, P.offHalo, 128, .12),
    flare: sprite(P.core, P.line, P.halo, 256, .05),
    soft: sprite(P.line, P.halo, P.deep, 256, .01),
  };
}

export class Glow {
  constructor(film, ctx, cam, opts = {}) {
    this.film = film; this.ctx = ctx; this.cam = cam; this.P = film.P; this.S = film.sprites;
    this.W = opts.W ?? film.W; this.H = opts.H ?? film.H;
    this.cx = opts.cx ?? film.center[0]; this.cy = opts.cy ?? film.center[1];
    this.labels = opts.labels ?? [];
    this.t = opts.t ?? 0;
  }
  // world → screen
  X(x) { return this.cx + (x - this.cam.x) * this.cam.zoom; }
  Y(y) { return this.cy + (y - this.cam.y) * this.cam.zoom; }
  P2(p) { return [this.X(p[0]), this.Y(p[1])]; }
  // screen → world
  wx(sx) { return (sx - this.cx) / this.cam.zoom + this.cam.x; }
  wy(sy) { return (sy - this.cy) / this.cam.zoom + this.cam.y; }
  // line width on screen: thins as the camera pulls back, never vanishes
  lw(w, fixed) { return fixed ? w : w * clamp(Math.sqrt(this.cam.zoom), .4, 1.6); }
  visibleY(y, pad = 40) { const s = this.Y(y); return s > -pad && s < this.H + pad; }

  _bez(c) { const x = this.ctx, a = this.P2(c[0]), b = this.P2(c[1]), d = this.P2(c[2]), e = this.P2(c[3]); x.moveTo(a[0], a[1]); x.bezierCurveTo(b[0], b[1], d[0], d[1], e[0], e[1]); }
  _stroke(color, a, w) { const x = this.ctx; x.strokeStyle = rgba(color, a); x.lineWidth = w; x.stroke(); }
  _style(o) { const on = o.on ?? 1; return { core: o.color ? o.color : mixc(this.P.off, this.P.line, on), halo: typeof o.halo === 'string' ? o.halo : mixc(this.P.offHalo, this.P.halo, on) }; }

  // one glowing curve. c = [p0,p1,p2,p3]; u0/u1 draw part of it (growth). on: 1 lit gold … 0 switched-off grey.
  curve(c, o = {}) {
    const a = o.a ?? 1; if (a <= .002) return;
    const u0 = o.u0 ?? 0, u1 = o.u1 ?? 1; if (u1 <= u0) return;
    const seg = (u0 > 0 || u1 < 1) ? bezSeg(c, u0, u1) : c, x = this.ctx, w = this.lw(o.w ?? 2.2, o.fixed), st = this._style(o);
    x.lineCap = 'round';
    x.beginPath(); this._bez(seg);
    if (o.halo !== false) { this._stroke(st.halo, a * .10, w * 7); this._stroke(st.halo, a * .22, w * 3); }
    this._stroke(st.core, a, w);
    if (o.tip && u1 < 1) this.node(...bez(c, u1), { r: (o.w ?? 2.2) * 2.6, a: a * o.tip, on: o.on });
  }
  // the lineage S-curve from child to parent (grows from the child when u < 1)
  link(child, parent, o = {}) { this.curve(sCurve(child, parent, o.k ?? .5), o); }
  line(x0, y0, x1, y1, o = {}) { this.curve([[x0, y0], [x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 3], [x0 + 2 * (x1 - x0) / 3, y0 + 2 * (y1 - y0) / 3], [x1, y1]], o); }
  // many thin curves in ONE stroke call (fast). list: array of curves. o.a is per-fibre alpha (keep it low: .03–.2)
  fibers(list, o = {}) {
    if (!list.length || (o.a ?? .1) <= .002) return;
    const x = this.ctx, w = this.lw(o.w ?? 1, o.fixed), st = this._style(o);
    x.lineCap = 'round'; x.beginPath();
    for (const c of list) this._bez(c);
    if (o.halo) this._stroke(st.halo, (o.a ?? .1) * .25, w * 4);
    this._stroke(st.core, o.a ?? .1, w);
  }
  // a glowing node. r = core radius in screen px at zoom 1; on: lit ↔ off; flare adds a big soft bloom
  node(x, y, o = {}) {
    const a = o.a ?? 1; if (a <= .002) return;
    const on = o.on ?? 1, r = (o.r ?? 6) * (o.fixed ? 1 : clamp(Math.sqrt(this.cam.zoom), .35, 1.6)), sx = this.X(x), sy = this.Y(y), cx = this.ctx;
    if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) return;
    const d = r * 8;
    if (on > .001) { cx.globalAlpha = a * on; cx.drawImage(this.S.lit, sx - d / 2, sy - d / 2, d, d); }
    if (on < .999) { cx.globalAlpha = a * (1 - on) * .8; cx.drawImage(this.S.off, sx - d * .4, sy - d * .4, d * .8, d * .8); }
    if (o.flare) { const f = r * 8 * (2 + o.flare * 4); cx.globalAlpha = a * clamp(o.flare) * on * .9; cx.drawImage(this.S.flare, sx - f / 2, sy - f / 2, f, f); }
    cx.globalAlpha = 1;
  }
  // a soft radial light (screen radius R px), e.g. the warm pool under the root or the sun-burst of a climax
  flare(x, y, R, a = 1, kind = 'flare') {
    if (a <= .002) return; const sx = this.X(x), sy = this.Y(y), c = this.ctx;
    c.globalAlpha = clamp(a); c.drawImage(this.S[kind], sx - R, sy - R, R * 2, R * 2); c.globalAlpha = 1;
  }
  // the horizon: a thin bright line across the whole frame at world y, with haze rising above it (the reference's "edge
  // of the past"). width: screen px; haze: height of the glow above, px
  horizon(y, o = {}) {
    const a = o.a ?? 1; if (a <= .002) return; const sy = this.Y(y), c = this.ctx, haze = o.haze ?? 120;
    const x0 = o.x0 != null ? this.X(o.x0) : 0, x1 = o.x1 != null ? this.X(o.x1) : this.W;
    let g = c.createLinearGradient(0, sy - haze, 0, sy + haze * .25);
    g.addColorStop(0, rgba(this.P.halo, 0)); g.addColorStop(.78, rgba(this.P.halo, .16 * a)); g.addColorStop(.8, rgba(this.P.line, .22 * a)); g.addColorStop(1, rgba(this.P.halo, 0));
    c.fillStyle = g; c.fillRect(x0, sy - haze, x1 - x0, haze * 1.25);
    g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba(this.P.line, 0)); g.addColorStop(.12, rgba(this.P.line, .7 * a)); g.addColorStop(.5, rgba(this.P.core, a)); g.addColorStop(.88, rgba(this.P.line, .7 * a)); g.addColorStop(1, rgba(this.P.line, 0));
    c.fillStyle = g; c.fillRect(x0, sy - (o.w ?? 2.5) / 2, x1 - x0, o.w ?? 2.5);
  }
  // a label pinned to a world point, drawn AFTER bloom at a fixed screen size (it does not shrink with the camera)
  label(x, y, text, o = {}) {
    const a = o.a ?? 1; if (a <= .01 || !text) return;
    this.labels.push({ x: this.X(x) + (o.dx ?? 0), y: this.Y(y) + (o.dy ?? 0), text, a, size: o.size ?? 28, color: o.color ?? this.P.text, align: o.align ?? 'center', weight: o.weight ?? 600, glow: o.glow ?? 0 });
    this.film._texts?.add(text);
  }
  // a spark travelling along a curve (u 0..1)
  spark(c, u, o = {}) { if (u < 0 || u > 1) return; const p = bez(c, u); this.node(p[0], p[1], { r: o.r ?? 3.2, a: o.a ?? 1, flare: o.flare ?? .15 }); }

  // cache: paint a world-space region ONCE into an offscreen canvas, then stamp it every frame through the camera.
  // box = {x0, y0, x1, y1} (world), res = canvas px per world unit. painter(g2) draws with a Glow at zoom = res.
  cached(key, box, res, painter) {
    const store = this.film._cache;
    if (!store.has(key)) {
      const w = Math.ceil((box.x1 - box.x0) * res), h = Math.ceil((box.y1 - box.y0) * res), cv = new OffscreenCanvas(w, h), cx = cv.getContext('2d');
      cx.globalCompositeOperation = 'lighter';
      const g2 = new Glow(this.film, cx, { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2, zoom: res }, { W: w, H: h, cx: w / 2, cy: h / 2, labels: [] });
      g2.lw = (wd) => wd;                                   // widths in a cache are canvas px, the camera scales them later
      painter(g2); store.set(key, { cv, box });
    }
    return store.get(key);
  }
  // stamp a cached region. clip = {y0, y1} world rows to show (growth reveals), a = alpha
  stamp(entry, o = {}) {
    const a = o.a ?? 1; if (a <= .002) return; const { cv, box } = entry, c = this.ctx;
    const sx = this.X(box.x0), sy = this.Y(box.y0), sw = (box.x1 - box.x0) * this.cam.zoom, sh = (box.y1 - box.y0) * this.cam.zoom;
    c.save(); c.globalAlpha = clamp(a);
    if (o.clip) { const y0 = this.Y(Math.min(o.clip.y0, o.clip.y1)), y1 = this.Y(Math.max(o.clip.y0, o.clip.y1)); c.beginPath(); c.rect(0, y0, this.W, y1 - y0); c.clip(); }
    c.drawImage(cv, sx, sy, sw, sh); c.restore();
  }
}
