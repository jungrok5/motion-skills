// torn-page-journey · media.js — the art media. Each medium is one way of putting marks on a page, behind one interface,
// so the kit (scenery) and the rider are written once and come out in any medium:
//
//   M.page(ctx, w, h, seed)                the bare page / board / canvas the chapter is painted on
//   M.col(c, role)                         a nominal colour → the colour this medium would make of it ('hero' keeps more of it)
//   M.shape(ctx, pts, o)                   a closed area: o = { fill, line (true | colour | false), lw, smooth, seed, dir, role, a }
//   M.line(ctx, pts, o)                    a stroke: o = { col, w, seed, role, closed, smooth, a }
//   M.wash(ctx, x, y, w, h, top, bottom, o) a large field (sky, sea, a wall) in this medium's way
//   M.post(ctx, W, H, seed)                over the finished chapter frame (wax tooth, chalk grain, canvas weave …)
//   M.ink, M.paper, M.light               outline colour, page colour, the light direction (radians, world space)
//
// Shading is in WORLD space (light from the upper left), so a mirrored rider is still lit from the same side.
// Seeds: plates pass a stable seed per shape; the rider passes part-seed + boil frame, so its marks re-draw a few times a second.
// To add a medium for a topic, write an object with the same members (references/MEDIA.md) and register it: MEDIA.myInk = {...}.
import { TAU, clamp, lerp, rng, hash, n1, mix, rgba, lum, grey, shade, tweak, rgb, hex, bounds, jitter, resample, trace, canvas } from './core.js';

// ── shared helpers ──
const tiles = new Map();
/** a repeating speckle tile of one colour (made once per key) */
function speckle(key, col, n, rmin, rmax, size = 192, seed = 3) {
  if (tiles.has(key)) return tiles.get(key);
  const c = canvas(size, size), x = c.getContext('2d'), R = rng(seed); x.fillStyle = col;
  for (let i = 0; i < n; i++) { const r = rmin + R() * (rmax - rmin), px = R() * size, py = R() * size; x.globalAlpha = .35 + R() * .65; x.beginPath(); x.ellipse(px, py, r, r * (.4 + R() * .6), R() * TAU, 0, TAU); x.fill(); }
  tiles.set(key, c); return c;
}
/** a weave / fibre tile (lines) */
function fibres(key, col, n, len, size = 256, seed = 5, cross = false) {
  if (tiles.has(key)) return tiles.get(key);
  const c = canvas(size, size), x = c.getContext('2d'), R = rng(seed); x.strokeStyle = col; x.lineCap = 'round';
  if (cross) { x.globalAlpha = .5; for (let i = 0; i < size; i += 3) { x.lineWidth = 1 + R() * .6; x.beginPath(); x.moveTo(0, i + R()); x.lineTo(size, i + R()); x.stroke(); x.beginPath(); x.moveTo(i + R(), 0); x.lineTo(i + R(), size); x.stroke(); } }
  for (let i = 0; i < n; i++) { const px = R() * size, py = R() * size, a = R() * TAU, l = len * (.3 + R()); x.globalAlpha = .2 + R() * .5; x.lineWidth = .5 + R(); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .6) * l * .5, py + Math.sin(a + .6) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  tiles.set(key, c); return c;
}
function overlay(ctx, tile, W, H, a, op = 'source-over', seed = 0) {
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = op;
  const p = ctx.createPattern(tile, 'repeat'), ox = Math.floor(hash(seed, 1) * tile.width), oy = Math.floor(hash(seed, 2) * tile.height);
  ctx.translate(-ox, -oy); ctx.fillStyle = p; ctx.fillRect(0, 0, W + ox, H + oy); ctx.restore();
}
function clip(ctx, pts, smooth, fn) { ctx.save(); ctx.beginPath(); trace(ctx, pts, true, smooth); ctx.clip(); fn(bounds(pts)); ctx.restore(); }
function fillPath(ctx, pts, smooth, style, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = style; ctx.beginPath(); trace(ctx, pts, true, smooth); ctx.fill(); ctx.restore(); }
function strokePath(ctx, pts, closed, smooth, style, w, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath(); trace(ctx, pts, closed, smooth); ctx.stroke(); ctx.restore(); }
/** parallel lines across bounds b at angle a, gap apart → fn(x0, y0, x1, y1, i) */
function hatch(b, a, gap, fn, pad = 4) {
  const c = Math.cos(a), s = Math.sin(a), cx = b.cx, cy = b.cy, L = Math.hypot(b.w, b.h) / 2 + pad;
  for (let i = 0, d = -L; d <= L; d += gap, i++) { const px = cx - s * d, py = cy + c * d; fn(px - c * L, py - s * L, px + c * L, py + s * L, i); }
}
const area = b => b.w * b.h;
/** light-side factor of a point inside bounds: +1 lit (upper left) … −1 shadow */
const litAt = (b, x, y, la = -2.3) => clamp(((x - b.cx) * Math.cos(la) + (y - b.cy) * Math.sin(la)) / (Math.max(b.w, b.h) * .5 + 1), -1, 1);
const lineCol = (M, o) => o.line === true || o.line === undefined ? M.col(M.ink, 'ink') : M.col(o.line, 'ink');

// ── crayon: a child's wax crayon on folded white paper — joy ──
const crayon = {
  name: 'crayon', paper: '#f3f0e8', ink: '#3b2b22', light: -2.3, boil: 6,
  page(ctx, w, h, seed = 1) {
    ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h);
    const R = rng(seed);
    for (let i = 0; i < 2; i++) { const x = w * (.3 + R() * .4); const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(90,80,60,.07)'); g.addColorStop(.52, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 30, 0, 60, h); }
    overlay(ctx, speckle('cr-dirt', '#b9ad95', 260, .4, 1.2), w, h, .25, 'source-over', seed);
  },
  col(c, role) { return role === 'ink' ? c : tweak(c, 0, 1.18, .02); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false;
    if (o.fill) {
      const col = this.col(o.fill, o.role), P = jitter(pts, 2.5, o.seed || 1), b = bounds(P), dir = (o.dir ?? -.7) + (R() - .5) * .3;
      clip(ctx, P, sm, () => {
        ctx.lineCap = 'round';
        const gap = area(b) > 60000 ? 5.5 : 4.2;
        for (const [ang, a, w] of [[dir, .78, 3.4], [dir + 1.1, .38, 2.6]]) hatch(b, ang, gap, (x0, y0, x1, y1, i) => {
          const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
          for (let s = -R() * 40; s < L;) {   // a child's strokes: short runs, each at its own slant and pressure, little gaps between
            const seg = 50 + R() * 130, da = (R() - .5) * .16, c2 = Math.cos(da), s2 = Math.sin(da), vx = ux * c2 - uy * s2, vy = ux * s2 + uy * c2, sx = x0 + ux * s + (R() - .5) * 2, sy = y0 + uy * s + (R() - .5) * 2;
            ctx.strokeStyle = tweak(col, (R() - .5) * 8, 1, (R() - .5) * .08); ctx.globalAlpha = a * (.55 + R() * .45); ctx.lineWidth = w * (.75 + R() * .5);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + vx * seg / 2 - vy * (R() - .5) * 5, sy + vy * seg / 2 + vx * (R() - .5) * 5, sx + vx * seg, sy + vy * seg); ctx.stroke();
            s += seg + (R() < .25 ? 4 + R() * 12 : -6);
          }
        });
        ctx.globalAlpha = 1;
      });
    }
    if (o.line !== false) this.line(ctx, pts, { col: lineCol(this, o), w: o.lw || 3, seed: (o.seed || 1) + 7, closed: true, smooth: sm });
  },
  line(ctx, pts, o = {}) {
    const col = o.col ? this.col(o.col, o.role || 'ink') : this.ink, w = o.w || 3;
    for (let k = 0; k < 2; k++) strokePath(ctx, jitter(pts, 1.4, (o.seed || 1) + k * 31), o.closed, o.smooth !== false, col, w * (k ? .6 : 1), (o.a ?? 1) * (k ? .5 : .85));
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {   // a child's sky: a scribbled band across the top, the rest is paper
    const band = o.full ? h : h * (o.band || .3), P = [[x - 20, y - 20], [x + w + 20, y - 20]];
    for (let i = 0; i <= 40; i++) P.push([x + w + 20 - i * (w + 40) / 40, y + band + n1(i * .7, o.seed || 2) * 26]);
    this.shape(ctx, P, { fill: top, line: false, seed: o.seed || 2, dir: -.15, smooth: false });
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('cr-tooth', this.paper, 2600, .3, 1.1, 192, 11), W, H, .55, 'source-over', seed); },
};

// ── pencil: graphite on a spiral-bound sketchbook, colour pencil only for the hero — curiosity, quiet ──
const pencil = {
  name: 'pencil', paper: '#efe8d8', ink: '#4a4844', light: -2.3, boil: 6,
  page(ctx, w, h, seed = 1) {
    ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h);
    overlay(ctx, fibres('pe-fib', '#cdbf9f', 500, 18), w, h, .35, 'multiply', seed);
    if (this.rings !== false) {
      ctx.save(); for (let x = 40; x < w; x += 44) { ctx.fillStyle = '#3c3a36'; ctx.beginPath(); ctx.ellipse(x, 22, 5, 6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8b8a86'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, 14, 9, Math.PI * .95, Math.PI * 2.05); ctx.stroke(); } ctx.restore();
    }
  },
  col(c, role) { return role === 'ink' ? '#4a4844' : role === 'hero' ? tweak(c, 0, .78, .04) : mix(grey(c, .85), this.paper, .25); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false, b = bounds(pts);
    if (o.fill) {
      const col = this.col(o.fill, o.role), hero = o.role === 'hero';
      clip(ctx, pts, sm, () => {
        ctx.lineCap = 'round';
        hatch(b, (o.dir ?? -.9) + (R() - .5) * .2, hero ? 2.6 : 3.4, (x0, y0, x1, y1) => { ctx.strokeStyle = col; ctx.globalAlpha = hero ? .55 : .3 + R() * .2; ctx.lineWidth = hero ? 2 : 1.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
        hatch(b, .9, 3.2, (x0, y0, x1, y1) => {          // graphite shading on the shadow side only
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, k = -litAt(b, mx, my);
          if (k < .05) return; ctx.strokeStyle = '#5a5751'; ctx.globalAlpha = k * .35; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      });
    }
    if (o.line !== false) this.line(ctx, pts, { col: lineCol(this, o), w: o.lw ? o.lw * .55 : 1.5, seed: (o.seed || 1) + 5, closed: true, smooth: sm });
  },
  line(ctx, pts, o = {}) {
    const w = o.w || 1.5, col = o.col && o.role === 'hero' ? this.col(o.col, 'hero') : '#47453f';
    for (let k = 0; k < 2; k++) strokePath(ctx, jitter(pts, 1.1 + k, (o.seed || 1) + k * 17), o.closed, o.smooth !== false, col, w * (k ? .7 : 1), (o.a ?? 1) * (k ? .35 : .8));
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {   // a sketchbook has no sky: a few soft graphite smudges
    const R = rng(o.seed || 4);
    for (let i = 0; i < 6; i++) { const cx = x + R() * w, cy = y + R() * h * .5, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 + R() * 160); g.addColorStop(0, 'rgba(90,88,82,.06)'); g.addColorStop(1, 'rgba(90,88,82,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('pe-grain', '#6d6658', 1400, .3, .8, 192, 13), W, H, .12, 'multiply', seed); },
};

// ── gouache: flat opaque colour, dry-brush streaks, no hard outline — bustle, belonging ──
const gouache = {
  name: 'gouache', paper: '#ebe2cf', ink: '#2f2d2a', light: -2.3, boil: 4,
  page(ctx, w, h, seed = 1) { ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); overlay(ctx, speckle('go-g', '#b7a789', 900, .3, 1), w, h, .3, 'multiply', seed); },
  col(c, role) { return role === 'ink' ? '#33302c' : tweak(c, 0, role === 'hero' ? .95 : .78, 0); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false, col = o.fill && this.col(o.fill, o.role), P = jitter(pts, 1.2, o.seed || 1);
    if (o.fill) {
      fillPath(ctx, P, sm, col, o.a ?? 1);
      clip(ctx, P, sm, b => {
        const dir = o.dir ?? (b.w > b.h ? 0 : Math.PI / 2), n = clamp(Math.round(area(b) / 900), 4, 60);
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const x = b.x + R() * b.w, y = b.y + R() * b.h, L = 20 + R() * Math.max(b.w, b.h) * .5, lit = litAt(b, x, y);
          ctx.strokeStyle = shade(col, lit > 0 ? .1 : -.1); ctx.globalAlpha = .12 + R() * .1; ctx.lineWidth = 4 + R() * 7;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(dir) * L, y + Math.sin(dir) * L); ctx.stroke();
        }
        // one soft shadow side
        const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w * .6, b.y + b.h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,30,20,.12)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
      });
    }
    if (o.line) strokePath(ctx, P, true, sm, o.line === true ? shade(col || this.ink, -.35) : this.col(o.line, 'ink'), (o.lw || 2) * .7, .7);
  },
  line(ctx, pts, o = {}) { strokePath(ctx, jitter(pts, .8, o.seed || 1), o.closed, o.smooth !== false, o.col ? this.col(o.col, o.role) : this.ink, o.w || 2.4, (o.a ?? 1) * .9); },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, this.col(top)); g.addColorStop(1, this.col(bottom || top)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const R = rng(o.seed || 3); ctx.lineCap = 'round';
    for (let i = 0; i < w * h / 6000; i++) { const px = x + R() * w, py = y + R() * h; ctx.strokeStyle = shade(this.col(top), (R() - .5) * .14); ctx.globalAlpha = .12; ctx.lineWidth = 6 + R() * 10; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 60 + R() * 120, py + (R() - .5) * 4); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('go-t', '#fffaf0', 900, .3, .9, 192, 17), W, H, .18, 'source-over', seed); },
};

// ── woodcut: carved block, three inks on ochre paper, gouge lines — triumph, resolve ──
const WOOD = ['#f0dcae', '#e0a63c', '#c4432a', '#1e1a16', '#6f4424', '#3d6a55'];
const nearest = (c, pal) => { const p = rgb(c); let best = pal[0], bd = 1e9; for (const q of pal) { const r = rgb(q), d = 2 * (p[0] - r[0]) ** 2 + 4 * (p[1] - r[1]) ** 2 + 3 * (p[2] - r[2]) ** 2; if (d < bd) { bd = d; best = q; } } return best; };
const woodcut = {
  name: 'woodcut', paper: '#ecd39c', ink: '#1e1a16', light: -2.3, boil: 4, palette: WOOD,
  page(ctx, w, h, seed = 1) { ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); overlay(ctx, fibres('wo-f', '#b98b45', 700, 26), w, h, .35, 'multiply', seed); },
  col(c, role) { return role === 'ink' ? this.ink : nearest(c, this.palette); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false, P = jitter(pts, 1.8, o.seed || 1);
    if (o.fill) {
      const col = this.col(o.fill, o.role), cut = lum(col) < .35 ? '#efd9a6' : lum(col) > .75 ? '#c58b32' : '#f1dcae';
      fillPath(ctx, P, sm, col, o.a ?? 1);
      clip(ctx, P, sm, b => {   // gouges: tapered cuts, thick on the lit edge, fading inward
        const dir = o.dir ?? (b.w > b.h * 1.6 ? 0 : -.35), gap = clamp(Math.min(b.w, b.h) / 7, 5, 11);
        ctx.fillStyle = cut;
        hatch(b, dir, gap, (x0, y0, x1, y1) => {
          const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
          for (let s = 0; s < L;) {
            const seg = 14 + R() * 40, x = x0 + ux * s, y = y0 + uy * s, lit = litAt(b, x + ux * seg / 2, y + uy * seg / 2);
            if (lit > -.15 && R() < .55 + lit * .4) { const th = (1.2 + R() * 1.6) * (.5 + lit); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * seg / 2 - uy * th, y + uy * seg / 2 + ux * th); ctx.lineTo(x + ux * seg, y + uy * seg); ctx.lineTo(x + ux * seg / 2 + uy * th * .4, y + uy * seg / 2 - ux * th * .4); ctx.fill(); }
            s += seg + 4 + R() * 14;
          }
        });
      });
    }
    if (o.line !== false) this.line(ctx, pts, { w: o.lw ? o.lw * 1.2 : 4.2, seed: (o.seed || 1) + 3, closed: true, smooth: sm });
  },
  line(ctx, pts, o = {}) {   // a chiselled line: width swells and pinches
    const P = resample(o.closed ? [...pts, pts[0]] : pts, 7), w = o.w || 4, col = o.col && o.role === 'hero' ? this.col(o.col) : this.ink;
    ctx.save(); ctx.fillStyle = col; ctx.globalAlpha *= o.a ?? 1;
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], k = w * (.55 + .5 * (n1(i * .35, o.seed || 1) * .5 + .5)), L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L * k / 2, ny = (x1 - x0) / L * k / 2; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx, y1 + ny); ctx.lineTo(x1 - nx, y1 - ny); ctx.lineTo(x0 - nx, y0 - ny); ctx.fill(); ctx.beginPath(); ctx.arc(x1, y1, k / 2, 0, TAU); ctx.fill(); }
    ctx.restore();
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {
    ctx.fillStyle = this.col(top); ctx.fillRect(x, y, w, h);
    const R = rng(o.seed || 5); ctx.fillStyle = '#f2dfb2';
    for (let yy = y + 6; yy < y + h; yy += 9 + R() * 5) for (let xx = x - 40 + R() * 60; xx < x + w; xx += 80 + R() * 140) { const L = 40 + R() * 120, th = 1 + R() * 1.8; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + L / 2, yy - th * 2, xx + L, yy); ctx.quadraticCurveTo(xx + L / 2, yy + th, xx, yy); ctx.fill(); }
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('wo-s', '#f1dcae', 900, .5, 1.6, 192, 19), W, H, .35, 'source-over', seed); },
};

// ── charcoal: grey paper, smudged tone, rough dark strokes, eraser lights — sorrow, struggle ──
const charcoal = {
  name: 'charcoal', paper: '#c9c4ba', ink: '#24221f', light: -2.3, boil: 6,
  page(ctx, w, h, seed = 1) { ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); overlay(ctx, speckle('ch-p', '#8d877c', 1500, .4, 1.4), w, h, .3, 'multiply', seed); },
  col(c, role) { if (role === 'ink') return this.ink; const g = grey(c, role === 'hero' ? .72 : .94), l = lum(g); return shade(g, l > .6 ? -.08 : -.2); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false;
    if (o.fill) {
      const col = this.col(o.fill, o.role);
      strokePath(ctx, pts, true, sm, col, 9, .18);     // the smudge halo
      fillPath(ctx, pts, sm, col, (o.a ?? 1) * .92);
      clip(ctx, pts, sm, b => {
        ctx.lineCap = 'round'; const n = clamp(Math.round(area(b) / 500), 6, 160);
        for (let i = 0; i < n; i++) {
          const x = b.x + R() * b.w, y = b.y + R() * b.h, lit = litAt(b, x, y), a = (o.dir ?? -.5) + (R() - .5) * .5, L = 10 + R() * 40;
          ctx.strokeStyle = lit > .25 ? '#e9e5dc' : '#1f1d1a'; ctx.globalAlpha = lit > .25 ? .16 * lit : .14 * (1 - lit * .5); ctx.lineWidth = 2 + R() * 4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
        }
      });
    }
    if (o.line !== false) this.line(ctx, pts, { w: o.lw || 2.6, seed: (o.seed || 1) + 9, closed: true, smooth: sm });
  },
  line(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), P = resample(o.closed ? [...pts, pts[0]] : pts, 10), col = o.col && o.role === 'hero' ? this.col(o.col, 'hero') : this.ink;
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 1; i < P.length; i++) { ctx.globalAlpha = (o.a ?? 1) * (.45 + R() * .45); ctx.lineWidth = (o.w || 2.6) * (.6 + R() * .7); ctx.beginPath(); ctx.moveTo(P[i - 1][0] + R() - .5, P[i - 1][1] + R() - .5); ctx.lineTo(P[i][0] + R() - .5, P[i][1] + R() - .5); ctx.stroke(); }
    ctx.restore();
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, this.col(top)); g.addColorStop(1, this.col(bottom || top)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const R = rng(o.seed || 6); ctx.lineCap = 'round';
    for (let i = 0; i < w * h / 2500; i++) { const px = x + R() * w, py = y + R() * h, d = R() < .5; ctx.strokeStyle = d ? '#1d1b18' : '#e8e4da'; ctx.globalAlpha = d ? .07 : .05; ctx.lineWidth = 10 + R() * 30; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 80 + R() * 200, py + (R() - .5) * 20); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('ch-t', '#d8d3c8', 2400, .3, 1, 192, 23), W, H, .32, 'source-over', seed); },
};

// ── watercolour: transparent layered washes, dark wet edges, blooms, granulation — relief, hope ──
const watercolour = {
  name: 'watercolour', paper: '#f6f3ea', ink: '#5b4a3c', light: -2.3, boil: 4,
  page(ctx, w, h, seed = 1) { ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); overlay(ctx, speckle('wc-p', '#d9d0bd', 1200, .5, 2.2), w, h, .22, 'multiply', seed); },
  col(c, role) { return role === 'ink' ? this.ink : tweak(c, 0, .92, role === 'hero' ? 0 : .05); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false;
    if (o.fill) {
      const col = this.col(o.fill, o.role), hero = o.role === 'hero';
      for (let k = 0; k < 3; k++) fillPath(ctx, jitter(pts, 2.6, (o.seed || 1) + k * 11), sm, col, (o.a ?? 1) * (hero ? .42 : .3));
      strokePath(ctx, jitter(pts, 1.5, (o.seed || 1) + 40), true, sm, shade(col, -.3), 2.2, .3);   // pigment pools at the edge
      clip(ctx, pts, sm, b => {
        ctx.fillStyle = shade(col, -.35); const n = clamp(Math.round(area(b) / 260), 6, 260);
        for (let i = 0; i < n; i++) { ctx.globalAlpha = .05 + R() * .1; const r = .6 + R() * 1.4; ctx.beginPath(); ctx.arc(b.x + R() * b.w, b.y + R() * b.h, r, 0, TAU); ctx.fill(); }
        const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w * .5, b.y + b.h); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, rgba(shade(col, -.4), .18));
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
      });
    }
    if (o.line) this.line(ctx, pts, { w: (o.lw || 2) * .6, seed: (o.seed || 1) + 3, closed: true, smooth: sm, a: .55 });
  },
  line(ctx, pts, o = {}) {   // a pen line that breaks here and there
    const R = rng(o.seed || 1), P = resample(o.closed ? [...pts, pts[0]] : pts, 6), col = o.col ? this.col(o.col, o.role) : this.ink;
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = o.w || 1.6; ctx.globalAlpha = (o.a ?? 1) * .8; ctx.beginPath();
    let on = true; for (let i = 0; i < P.length; i++) { if (o.role !== 'hero' && R() < .05) on = !on; if (on && i) ctx.lineTo(P[i][0], P[i][1]); else ctx.moveTo(P[i][0], P[i][1]); }
    ctx.stroke(); ctx.restore();
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {
    const R = rng(o.seed || 7), g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(this.col(top), .75)); g.addColorStop(1, rgba(this.col(bottom || top), .35));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 9; i++) {   // blooms: paler cauliflower patches with a darker rim
      const cx = x + R() * w, cy = y + R() * h * .8, r = 60 + R() * 140, P = Array.from({ length: 18 }, (_, j) => { const a = j / 18 * TAU, k = 1 + .25 * n1(j * 1.3 + i, 3); return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * .7]; });
      fillPath(ctx, P, true, this.paper, .18); strokePath(ctx, P, true, true, shade(this.col(top), -.2), 2, .15);
    }
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('wc-g', '#8a7f6a', 1600, .3, 1, 192, 29), W, H, .1, 'multiply', seed); },
};

// ── oil: impasto dabs of broken colour on canvas — awe, nostalgia ──
const oil = {
  name: 'oil', paper: '#d8cbb0', ink: '#2b2219', light: -2.3, boil: 4,
  page(ctx, w, h, seed = 1) { ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); overlay(ctx, fibres('oi-w', '#a8987a', 0, 0, 96, 3, true), w, h, .25, 'multiply', seed); },
  col(c, role) { return role === 'ink' ? this.ink : tweak(c, 0, 1.06, 0); },
  dabs(ctx, b, col, R, dir, size, density, a = 1) {
    const n = clamp(Math.round(area(b) / (size * size * density)), 4, 9000); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = b.x + R() * b.w, y = b.y + R() * b.h, lit = litAt(b, x, y), ang = dir + (R() - .5) * .9, L = size * (.8 + R() * .9);
      ctx.strokeStyle = tweak(col, (R() - .5) * 26, .85 + R() * .35, lit * .09 + (R() - .5) * .09); ctx.globalAlpha = a * (.75 + R() * .25); ctx.lineWidth = size * (.5 + R() * .4);
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * L / 2, y - Math.sin(ang) * L / 2); ctx.lineTo(x + Math.cos(ang) * L / 2, y + Math.sin(ang) * L / 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false, P = jitter(pts, 2, o.seed || 1);
    if (o.fill) {
      const col = this.col(o.fill, o.role), b0 = bounds(P), size = clamp(Math.sqrt(area(b0)) / 9, 5, 15);
      fillPath(ctx, P, sm, shade(col, -.06), o.a ?? 1);
      clip(ctx, P, sm, b => this.dabs(ctx, b, col, R, o.dir ?? (b.w > b.h ? 0 : 1.2), size, 1.1, o.a ?? 1));
    }
    if (o.line) this.line(ctx, pts, { seed: (o.seed || 1) + 2, closed: true, w: o.lw || 3, smooth: sm });
  },
  line(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), P = resample(o.closed ? [...pts, pts[0]] : pts, 6), col = o.col ? this.col(o.col, o.role) : this.ink, w = o.w || 3;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 1; i < P.length; i++) { ctx.strokeStyle = tweak(col, 0, 1, (R() - .5) * .08); ctx.globalAlpha = (o.a ?? 1) * (.7 + R() * .3); ctx.lineWidth = w * (.7 + R() * .6); ctx.beginPath(); ctx.moveTo(P[i - 1][0], P[i - 1][1]); ctx.lineTo(P[i][0] + R() - .5, P[i][1] + R() - .5); ctx.stroke(); }
    ctx.restore();
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {
    const R = rng(o.seed || 8), bands = 14;
    for (let i = 0; i < bands; i++) { const y0 = y + h * i / bands, c = mix(this.col(top), this.col(bottom || top), i / (bands - 1)); ctx.fillStyle = c; ctx.fillRect(x, y0, w, h / bands + 1); this.dabs(ctx, { x, y: y0 - 6, w, h: h / bands + 12, cx: x + w / 2, cy: y0 }, c, R, 0, 18, 1.4, .9); }
  },
  post(ctx, W, H, seed) { overlay(ctx, fibres('oi-w2', '#fff6e0', 0, 0, 96, 4, true), W, H, .07, 'soft-light', seed); },
};

// ── chalk: pastel chalk on a dark board, smudges and dust — wonder, dream ──
const chalk = {
  name: 'chalk', paper: '#25302b', ink: '#e8ebdf', light: -2.3, boil: 6,
  page(ctx, w, h, seed = 1) {
    ctx.fillStyle = this.paper; ctx.fillRect(0, 0, w, h); const R = rng(seed);
    for (let i = 0; i < 10; i++) { const cx = R() * w, cy = R() * h, r = 150 + R() * 300, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(220,230,220,.05)'); g.addColorStop(1, 'rgba(220,230,220,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    overlay(ctx, speckle('ck-d', '#cfd8cc', 500, .3, 1), w, h, .12, 'source-over', seed);
  },
  col(c, role) { return role === 'ink' ? this.ink : mix(tweak(c, 0, .8, 0), '#f4f2e6', lum(c) < .25 ? .1 : .32); },
  shape(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), sm = o.smooth !== false;
    if (o.fill) {
      const col = this.col(o.fill, o.role), dark = lum(o.fill) < .2;
      if (!dark) clip(ctx, pts, sm, b => {
        ctx.lineCap = 'round';
        const hero = o.role === 'hero';
        for (const [ang, a, gap] of [[o.dir ?? -.8, hero ? .85 : .55, hero ? 2.6 : 3.2], [(o.dir ?? -.8) + 1.3, hero ? .5 : .28, hero ? 3.4 : 4.5]]) hatch(b, ang, gap, (x0, y0, x1, y1) => {
          const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L; ctx.strokeStyle = col; ctx.lineWidth = 2.4;
          for (let s = 0; s < L; s += 10 + R() * 14) { ctx.globalAlpha = a * (.4 + R() * .6); const e = s + 8 + R() * 16; ctx.beginPath(); ctx.moveTo(x0 + ux * s, y0 + uy * s); ctx.lineTo(x0 + ux * e, y0 + uy * e); ctx.stroke(); }
        });
        ctx.globalAlpha = 1;
      });
    }
    if (o.line !== false) this.line(ctx, pts, { w: o.lw ? o.lw * .8 : 2.6, seed: (o.seed || 1) + 4, closed: true, smooth: sm, col: o.line && o.line !== true ? o.line : undefined, role: o.role });
  },
  line(ctx, pts, o = {}) {
    const R = rng(o.seed || 1), P = resample(o.closed ? [...pts, pts[0]] : pts, 5), col = o.col ? this.col(o.col, o.role) : this.ink, w = o.w || 2.6;
    strokePath(ctx, pts, o.closed, o.smooth !== false, col, w * 3.5, .05 * (o.a ?? 1));   // dust halo
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 1; i < P.length; i++) { ctx.globalAlpha = (o.a ?? 1) * (.35 + R() * .6); ctx.lineWidth = w * (.6 + R() * .6); ctx.beginPath(); ctx.moveTo(P[i - 1][0] + (R() - .5) * 1.2, P[i - 1][1] + (R() - .5) * 1.2); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); }
    ctx.restore();
  },
  wash(ctx, x, y, w, h, top, bottom, o = {}) {   // the board is the sky; a milky band of dust across it
    const R = rng(o.seed || 9); ctx.lineCap = 'round';
    for (let i = 0; i < 60; i++) { const px = x + R() * w, py = y + h * (.25 + .35 * (px - x) / w) + (R() - .5) * h * .25; ctx.strokeStyle = '#d9e2d6'; ctx.globalAlpha = .025; ctx.lineWidth = 30 + R() * 50; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 120, py + 30); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  post(ctx, W, H, seed) { overlay(ctx, speckle('ck-t', this.paper, 2600, .3, 1, 192, 31), W, H, .4, 'source-over', seed); },
};

export const MEDIA = { crayon, pencil, gouache, woodcut, charcoal, watercolour, oil, chalk };
/** a medium by name, or a medium object passed straight through */
export const medium = m => typeof m === 'string' ? (MEDIA[m] || (() => { throw new Error('no such medium: ' + m); })()) : m;
export { hatch, clip, fillPath, strokePath, overlay, speckle, fibres, litAt };
