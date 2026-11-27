// color-cycle-breakdown · pixel.js — the indexed picture: a palette of ramps and cycles, layers of palette indices,
// and the painting kit (dithered shading, ridges, rocks, pines, stars, flow fields, wind-rigged plants).
// Every pixel of every layer is an index into ONE palette. Colour cycling never moves a pixel: it rotates the colours
// inside a cycle's slots. Everything is a function of the seed and of t (no Math.random, no Date).

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const mod = (a, n) => ((a % n) + n) % n;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };   // quintic: C2 at both ends

export function hex(c) {
  if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] ?? 255];
  if (c === 'transparent') return [0, 0, 0, 0];
  const h = c.replace('#', '');
  const v = h.length <= 4 ? h.split('').map(x => x + x).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), v.length >= 8 ? parseInt(v.slice(6, 8), 16) : 255];
}
export function rng(seed) {                       // mulberry32
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash(x, y = 0, s = 0) {
  let h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + 0x9e3779b9, 0x85ebca77) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export function noise(x, y, s = 0) {               // value noise, smooth, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s = 0, oct = 4) {
  let v = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += amp * noise(x * f, y * f, s + i * 17); n += amp; amp *= .5; f *= 2.03; }
  return v / n;
}

// ── palette ────────────────────────────────────────────────────────────────────────────────────────────────────────
// pal.ramp(name, colours) → ramp { name, start, len, i(k), pick(v, x, y) }   (index 0 is always transparent)
// pal.cycle(ramp, { rate, dir, blend, name }) → the ramp's slots rotate `rate` steps a second
export class Palette {
  constructor() { this.cols = [[0, 0, 0, 0]]; this.ramps = {}; this.cycles = []; }
  ramp(name, colours) {
    if (this.ramps[name]) throw new Error(`ramp "${name}" defined twice`);
    const start = this.cols.length;
    if (start + colours.length > 256) throw new Error(`palette full: ramp "${name}" would pass 256 colours`);
    colours.forEach(c => this.cols.push(hex(c)));
    const len = colours.length;
    const r = {
      name, start, len, colours: colours.slice(),
      i: k => start + clamp(Math.round(k), 0, len - 1),
      pick: (v, x = 0, y = 0) => start + clamp(Math.floor(clamp(v) * (len - 1) + bayer(x, y)), 0, len - 1),
    };
    this.ramps[name] = r; return r;
  }
  cycle(ramp, o = {}) {
    const r = typeof ramp === 'string' ? this.ramps[ramp] : ramp;
    if (!r) throw new Error(`cycle: no ramp ${ramp}`);
    const c = { name: o.name || r.name, ramp: r.name, start: r.start, len: r.len, rate: o.rate ?? 8, dir: o.dir ?? 1, blend: !!o.blend };
    if (this.cycles.some(x => x.start === c.start)) throw new Error(`ramp "${r.name}" cycles twice`);
    this.cycles.push(c); return c;
  }
  cycleOf(i) { return this.cycles.find(c => i >= c.start && i < c.start + c.len); }
  shift(c, t) { return t * c.rate * c.dir; }
  // RGBA colours at time t as an array of [r,g,b,a]
  at(t) {
    const out = this.cols.map(c => c.slice());
    for (const c of this.cycles) {
      const s = this.shift(c, t), f = Math.floor(s), w = c.blend ? s - f : 0;
      for (let k = 0; k < c.len; k++) {
        const a = this.cols[c.start + mod(k - f, c.len)], b = this.cols[c.start + mod(k - f - 1, c.len)];
        out[c.start + k] = w ? a.map((v, j) => Math.round(v + (b[j] - v) * w)) : a.slice();
      }
    }
    return out;
  }
}
export function packed(cols) {                    // [r,g,b,a][] → Uint32Array (little-endian ABGR) for ImageData
  const u = new Uint32Array(256);
  cols.forEach((c, i) => { u[i] = ((c[3] & 255) << 24 | (c[2] & 255) << 16 | (c[1] & 255) << 8 | (c[0] & 255)) >>> 0; });
  return u;
}

// ── layers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// A layer holds palette indices (0 = transparent). Paint calls write the base buffer once; `draw(fn)` and `rig(...)`
// repaint on top of a copy of it every frame (spray, a beam drawn by hand, plants in the wind).
export class Layer {
  constructor(name, w, h, o = {}) {
    Object.assign(this, { name, w, h, label: o.label || name, color: o.color || '#cfd8dc' });
    this.base = new Uint8Array(w * h); this.work = new Uint8Array(w * h); this.buf = this.base;
    this.dyn = []; this.rigs = []; this.flows = [];
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, i) { x = Math.floor(x); y = Math.floor(y); if (i != null && x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = i; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return this.in(x, y) ? this.buf[y * this.w + x] : 0; }
  fill(fn, box = [0, 0, this.w, this.h]) {        // fn(x, y, current) → index | null (skip)
    const [x0, y0, x1, y1] = [Math.max(0, box[0] | 0), Math.max(0, box[1] | 0), Math.min(this.w, Math.ceil(box[2])), Math.min(this.h, Math.ceil(box[3]))];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = fn(x, y, this.buf[y * this.w + x]); if (v != null) this.buf[y * this.w + x] = v; }
  }
  rect(x, y, w, h, i) { this.fill(() => i, [x, y, x + w, y + h]); }
  line(x0, y0, x1, y1, i) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (let n = 0; n < 4000; n++) { this.set(x0, y0, typeof i === 'function' ? i(x0, y0) : i); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  poly(pts, i) {                                  // even-odd scanline fill; i may be fn(x, y)
    const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const yc = y + .5, xs = [];
      for (let k = 0; k < pts.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(this.w, Math.round(xs[k + 1])); x++) this.set(x, y, typeof i === 'function' ? i(x, y) : i);
    }
  }
  disc(cx, cy, r, i) { this.fill((x, y) => ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) ? (typeof i === 'function' ? i(x, y) : i) : null, [cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1]); }
  draw(fn) { this.dyn.push(fn); return this; }
  rig(r) { r.layer = this.name; this.rigs.push(r); return r; }
  get dynamic() { return this.dyn.length > 0 || this.rigs.length > 0; }
  frame(t) {                                      // the indices at time t (base + per-frame painting)
    if (!this.dynamic) return this.base;
    this.work.set(this.base); this.buf = this.work;
    for (const fn of this.dyn) fn(this, t);
    for (const r of this.rigs) r.paint(this, t);
    this.buf = this.base; return this.work;
  }
}

// ── wind ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// One shared gust for the whole picture, travelling across it; every plant reads it at its own x, every joint later
// than the one below it (follow-through: the tip lags the base).
export function makeWind(o = {}) {
  const strength = o.strength ?? 1, speed = o.speed ?? 70, seed = o.seed ?? 3;
  const ph = [hash(1, 0, seed), hash(2, 0, seed), hash(3, 0, seed), hash(4, 0, seed)].map(v => v * Math.PI * 2);
  const g = t => .52 * Math.sin(t * 1.15 + ph[0]) + .28 * Math.sin(t * 2.45 + ph[1]) + .14 * Math.sin(t * 4.9 + ph[2]) + .06 * Math.sin(t * 9.3 + ph[3]);
  return { strength, speed, at: (t, x = 0) => strength * (.35 + .65 * g(t - x / speed)) };
}

// ── the kit ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function makeKit(ctx) {
  const { W, H } = ctx;
  const kit = {
    bayer, noise, fbm, hash, clamp, lerp, mod, smooth,
    // vertical dithered gradient over rows y0..y1 (v goes 0 → 1 top to bottom unless flipped)
    gradient(L, ramp, y0, y1, o = {}) {
      const [x0, x1] = [o.x0 ?? 0, o.x1 ?? W], flip = !!o.flip, wob = o.wobble ?? 0;
      L.fill((x, y) => { let v = (y - y0) / Math.max(1, y1 - y0); if (wob) v += (noise(x * .05, y * .2, 5) - .5) * wob; return ramp.pick(flip ? 1 - v : v, x, y); }, [x0, y0, x1, y1]);
    },
    // a ridge line from noise: everything below it is filled, shaded by slope (light from `light`: -1 left, 1 right)
    ridge(L, ramp, o = {}) {
      const base = o.y ?? H * .5, amp = o.amp ?? 30, freq = o.freq ?? .02, seed = o.seed ?? 1, light = o.light ?? -1, peaks = o.peaks ?? 1.6;
      const h = x => base - amp * Math.pow(fbm(x * freq, 0, seed, 5), peaks) * 1.6 + amp * .3;
      const bottom = o.to ?? H;
      for (let x = 0; x < W; x++) {
        const top = h(x), slope = clamp((h(x + 2) - h(x - 2)) * .25 * -light, -.6, .6);
        for (let y = Math.max(0, Math.floor(top)); y < bottom; y++) {
          const depth = (y - top) / Math.max(1, bottom - top);
          const v = clamp(.55 + slope * (o.contrast ?? .9) * Math.exp(-(y - top) / (o.rim ?? 10)) - depth * (o.fade ?? .5) + (fbm(x * .15, y * .15, seed + 9, 3) - .5) * (o.grain ?? .35));
          L.set(x, y, ramp.pick(v, x, y));
        }
        if (o.snow && top < base - amp * o.snow) for (let y = Math.floor(top); y < top + 2 + slope * 3; y++) L.set(x, y, o.snowIdx);
      }
      return h;
    },
    // a lumpy rock with a lit top-left edge and a dark base
    rock(L, cx, cy, rx, ry, ramp, seed = 1, o = {}) {
      const light = o.light ?? [-.6, -.8];
      L.fill((x, y) => {
        const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry, a = Math.atan2(dy, dx);
        const rr = 1 + (noise(Math.cos(a) * 1.7 + seed, Math.sin(a) * 1.7, seed) - .5) * .5;
        const d = Math.hypot(dx, dy); if (d > rr || (o.flat && dy > .45)) return null;
        const nz = Math.sqrt(Math.max(0, 1 - (d / rr) ** 2)), lit = -(dx * light[0] + dy * light[1]) * .5 + nz * .5;
        return ramp.pick(clamp(.15 + lit * .85 + (noise(x * .4, y * .4, seed + 3) - .5) * .35), x, y);
      }, [cx - rx * 1.4, cy - ry * 1.4, cx + rx * 1.4, cy + ry * 1.4]);
    },
    // a pine: stacked tiers, lit on one side
    pine(L, x, yb, h, ramp, o = {}) {
      const w = o.width ?? h * .42, tiers = o.tiers ?? Math.max(3, Math.round(h / 7)), light = o.light ?? -1;
      L.rect(x - .5, yb - h * .2, 1.5, h * .2, ramp.i(0));
      for (let k = 0; k < tiers; k++) {
        const ty = yb - h * .15 - k * (h * .85 / tiers), tw = w * (1 - k / tiers) * .5 + 1, th = h * .85 / tiers * 1.7;
        L.poly([[x - tw, ty], [x + tw + 1, ty], [x + .5, ty - th]], (px, py) => ramp.pick(clamp(.35 + (px - x) / tw * .35 * -light - (ty - py) / th * -.2), px, py));
      }
    },
    // stars that twinkle by cycling: each star takes one slot of a cycle ramp
    stars(L, ramp, o = {}) {
      const n = o.count ?? 60, y1 = o.y1 ?? H * .45, r = rng(o.seed ?? 11);
      for (let k = 0; k < n; k++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * y1), i = ramp.start + Math.floor(r() * ramp.len);
        if (o.only && !o.only(x, y)) continue;
        L.set(x, y, i); if (r() < (o.big ?? .12)) { L.set(x - 1, y, i); L.set(x + 1, y, i); L.set(x, y - 1, i); L.set(x, y + 1, i); }
      }
    },
    // a shaded disc (moon, sun, lamp), lit from `light`
    orb(L, cx, cy, r, ramp, o = {}) {
      const light = o.light ?? [-.5, -.6];
      L.disc(cx, cy, r, (x, y) => { const dx = (x + .5 - cx) / r, dy = (y + .5 - cy) / r; return ramp.pick(clamp(.6 - (dx * light[0] + dy * light[1]) * .5 + (noise(x * .5, y * .5, 4) - .5) * .25), x, y); });
    },
    // flow: indices laid along a direction so that cycling makes the bands travel.
    //   along(x, y): grows in the direction the water / fire / light moves (one slot every `band` units)
    //   across(x, y): which streamline a pixel is on — each streamline gets its own offset (streaks)
    // Registers the flow so a "flow" panel can draw its vectors (the measured gradient of `along`).
    flow(L, o) {
      const c = o.cycle; if (!c) throw new Error('flow needs a cycle');
      const band = o.band ?? 3, streak = o.streak ?? 1, wob = o.wobble ?? 0, seed = o.seed ?? 7;
      L.fill((x, y) => {
        if (!o.mask(x, y)) return null;
        const a = o.along(x + .5, y + .5), s = o.across(x + .5, y + .5);
        const off = hash(Math.floor(s), 0, seed) * c.len * streak + (wob ? (noise(x * .3, y * .3, seed) - .5) * wob : 0);
        const k = mod(Math.floor(a / band + off), c.len);
        return o.slots ? o.slots(k, x, y) : c.start + k;
      });
      const f = { name: o.name || L.name, layer: L.name, cycle: c.name, mask: o.mask, along: o.along };
      L.flows.push(f); ctx.flows.push(f); return f;
    },
    // a wind-rigged plant. Each frond is a chain of joints of fixed length; the shared gust bends every joint, later
    // toward the tip. kind: 'fern' (leaflets both sides), 'blade' (grass), 'leaf' (broad), 'reed' (thin + seed head).
    plant(L, o) {
      const p = makePlant(o, ctx.wind, ctx.pal);
      L.rig(p); ctx.rigs.push(p); return p;
    },
  };
  return kit;
}

// ── the plant rig ──────────────────────────────────────────────────────────────────────────────────────────────────
export const BEND_LIMIT = 34;                       // ° per joint, whatever the gust
function makePlant(o, wind, pal) {
  const ramp = typeof o.ramp === 'string' ? pal.ramps[o.ramp] : o.ramp;
  const fronds = o.fronds.map((f, n) => ({
    a: f.a ?? 0, len: f.len ?? 24, segs: f.segs ?? 5, curl: f.curl ?? 0, width: f.width ?? 6, kind: f.kind || o.kind || 'fern',
    stiff: f.stiff ?? o.stiff ?? 1, lag: f.lag ?? .09, phase: f.phase ?? n * .23, amp: f.amp ?? o.amp ?? 9, tip: f.tip ?? o.tip,
  }));
  const rig = {
    name: o.name || 'plant', x: o.x, y: o.y, fronds, ramp: ramp.name, flowers: o.flowers || [],
    // joint angles (deg, 0 = straight up, + = clockwise / to the right) for every frond at t
    angles(t) {
      return fronds.map(f => {
        const out = []; let a = f.a;
        for (let j = 0; j < f.segs; j++) {
          const w = wind.at(t - f.phase - j * f.lag, rig.x);
          const bend = clamp(f.curl + f.amp / f.stiff * (.3 + .7 * j / Math.max(1, f.segs - 1)) * w, -BEND_LIMIT, BEND_LIMIT);
          a += bend; out.push({ a, bend });
        }
        return out;
      });
    },
    pose(t) {                                    // joints in art pixels, root first
      return rig.angles(t).map((as, n) => {
        const f = fronds[n], seg = f.len / f.segs; let x = rig.x, y = rig.y; const pts = [[x, y]];
        for (const { a } of as) { const r = a * Math.PI / 180; x += Math.sin(r) * seg; y -= Math.cos(r) * seg; pts.push([x, y]); }
        return pts;
      });
    },
    paint(L, t) {
      const poses = rig.pose(t), R = ramp, top = R.len - 1;
      poses.forEach((pts, n) => {
        const f = fronds[n]; let s = 0; const total = f.len;
        for (let j = 0; j + 1 < pts.length; j++) {
          const [ax, ay] = pts[j], [bx, by] = pts[j + 1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
          for (let d = 0; d < l; d += .7) {
            const x = ax + ux * d, y = ay + uy * d, u = (s + d) / total;
            if (f.kind === 'fern') {
              if (Math.round((s + d) / .7) % 3 === 0) {
                const ll = f.width * Math.pow(1 - u, .75) * Math.min(1, u * 5 + .35);
                for (const side of [-1, 1]) {
                  const ang = side * 58 * Math.PI / 180, vx = ux * Math.cos(ang) - uy * Math.sin(ang), vy = ux * Math.sin(ang) + uy * Math.cos(ang);
                  const lit = side * (ux >= 0 ? 1 : -1) < 0;   // the upper side catches the light
                  for (let q = 1; q <= ll; q += .8) L.set(x + vx * q, y + vy * q + q * .18, R.i((lit ? top : top - 2) - (q > ll * .7 ? 0 : 1) + (u > .75 ? 1 : 0)));
                }
              }
              L.set(x, y, R.i(top - 3));
            } else if (f.kind === 'leaf') {
              const ww = f.width * Math.sin(Math.PI * Math.min(1, u * 1.1)) * .5;
              for (let q = -ww; q <= ww; q += .7) L.set(x - uy * q, y + ux * q, R.i(q < 0 ? top - 1 : top - 2 - (Math.abs(q) > ww * .6 ? 1 : 0)));
              L.set(x, y, R.i(top));
            } else {                                // blade, reed
              const ww = f.kind === 'reed' ? 1 : Math.max(1, f.width * (1 - u) * .5);
              for (let q = 0; q < ww; q += .7) L.set(x - uy * q, y + ux * q, R.i(Math.min(top, Math.floor(u * (top + 1)) + (q > 0 ? -1 : 0))));
            }
          }
          s += l;
        }
        const tip = pts[pts.length - 1];
        if (f.kind === 'reed') { const t2 = pts[pts.length - 2]; for (let q = 0; q < 4; q++) { const k = q / 4; L.set(tip[0] + (t2[0] - tip[0]) * k * .6, tip[1] + (t2[1] - tip[1]) * k * .6, f.tip ?? R.i(top)); L.set(tip[0] + (t2[0] - tip[0]) * k * .6 + 1, tip[1] + (t2[1] - tip[1]) * k * .6, f.tip ?? R.i(top - 1)); } }
        else if (f.tip != null) { L.set(tip[0], tip[1], f.tip); L.set(tip[0] + 1, tip[1], f.tip); L.set(tip[0], tip[1] - 1, f.tip); }
      });
      for (const [dx, dy, i, r = 1] of rig.flowers) { for (let a = 0; a < 5; a++) { const an = a / 5 * Math.PI * 2; L.set(rig.x + dx + Math.cos(an) * r, rig.y + dy + Math.sin(an) * r, i); } L.set(rig.x + dx, rig.y + dy, i); }
    },
  };
  return rig;
}
