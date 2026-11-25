// trail-texture-world · lib/trail.js — the engine (window.TT). Code only: no image, model or video files.
// A top-down pixel world (480×270, scaled up nearest-neighbour) with one walker. ONE trail texture remembers where the
// walker went — when each texel was last pressed by a foot, when the body last covered it and which way it was pushed,
// and the ripple height of every splash still spreading — and every terrain reads that same texture in its own way:
// snow keeps dents, tall grass bends and springs back, water rings out, leaves stay pushed aside, moss glows and fades.
// The film is one walk integrated at 120 Hz from a route; the texture is rebuilt every frame from the stamp log (the
// newest press wins, so the rebuild equals an accumulating texture), which keeps every frame a pure function of t.
// The live page runs the same walker from the keyboard / pointer and the same texture.
(function () {
'use strict';
const TT = {};
const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
TT.clamp = clamp; TT.lerp = lerp; TT.smooth = smooth; TT.TAU = TAU;
const NONE = -1e9;

// ---------- numbers: seeded rng, hash, value noise (not wrapping) ----------
TT.rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (x, y, s = 0) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
TT.hash = hash;
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(xi, yi, seed), hash(xi + 1, yi, seed), u), lerp(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), u), v);
}
TT.noise = seed => ({
  value: (x, y, cell = 32, k = 0) => vnoise(x / cell, y / cell, seed + 999 + k * 71),
  fbm(x, y, cell = 96, oct = 4, gain = .5, k = 0) { let f = 1 / cell, a = 1, s = 0, t = 0; for (let o = 0; o < oct; o++) { s += a * vnoise(x * f, y * f, seed + k * 53 + o * 101); t += a; a *= gain; f *= 2; } return s / t; },
  rnd: (x, y, k = 0) => hash(x, y, seed + 31 + k),
  // a wandering line: the x of a north–south line (or y of an east–west one) at coordinate v
  wander: (v, base, amp, cell = 120, k = 0) => base + (vnoise(v / cell, k * 7.3, seed + 404) * .7 + vnoise(v / (cell / 3), k * 7.3 + 3, seed + 405) * .3 - .5) * 2 * amp,
});

// ---------- colour: packed ABGR uint32 (ImageData order on little-endian) ----------
const pack = (r, g, b) => ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
const R = c => c & 255, G = c => (c >>> 8) & 255, B = c => (c >>> 16) & 255;
const hex = h => { if (typeof h === 'number') return h >>> 0; h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const v = parseInt(h, 16); return pack(v >> 16, (v >> 8) & 255, v & 255); };
const mix = (a, b, t) => pack(lerp(R(a), R(b), t), lerp(G(a), G(b), t), lerp(B(a), B(b), t));
TT.hex = hex; TT.mix = mix; TT.pack = pack; TT.R = R; TT.G = G; TT.B = B;
TT.shade = (c, k) => pack(R(c) * k, G(c) * k, B(c) * k);
TT.css = c => `rgb(${R(c)},${G(c)},${B(c)})`;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
TT.bayer = bayer;
// pick from a list of tones with ordered dither: v in 0..1
TT.tone = (tones, v, x, y) => { const f = clamp(v, 0, .9999) * (tones.length - 1), i = Math.floor(f); return tones[Math.min(tones.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))]; };
TT.tones = list => list.map(hex);

// ---------- pixel font 3×5 ----------
const GLYPH = {};
('A010101111101101B110101110101110C011100100100011D110101101101110E111100110100111F111100110100100G011100101101011H101101111101101I111010010010111J001001001101010K101101110101101L100100100100111M101111111101101N110101101101101O010101101101010P110101110100100Q010101101110011R110101110101101S011100010001110T111010010010010U101101101101111V101101101101010W101101111111101X101101010101101Y101101010010010Z111001010100111' +
 '0111101101101111101011001001011121100010101001113110001010001110410110111100100151111001100011106011100111101111711100101001001081111011111011119111101111001110.000000000000010,000000000010100:000010000010000-000000111000000+000010111010000/001001010100100\'010010000000000!010010010000010?110001010000010%101001010100101*010101010000000·000000010000000=000111000111000#101111101111101(010100100100010)010001001001010>100010001010100<001010100010001 000000000000000')
  .replace(/(.)([01]{15})/g, (_, ch, bits) => { GLYPH[ch] = bits; return ''; });
TT.textWidth = (s, k = 1) => s.length ? (s.length * 4 - 1) * k : 0;
// 5×5 for titles and captions
const GLYPH5 = {'A': '0111010001111111000110001', 'B': '1111010001111101000111110', 'C': '0111110000100001000001111', 'D': '1111010001100011000111110', 'E': '1111110000111101000011111', 'F': '1111110000111101000010000', 'G': '0111110000100111000101111', 'H': '1000110001111111000110001', 'I': '1111100100001000010011111', 'J': '0011100001000011000101110', 'K': '1000110010111001001010001', 'L': '1000010000100001000011111', 'M': '1000111011101011000110001', 'N': '1000111001101011001110001', 'O': '0111010001100011000101110', 'P': '1111010001111101000010000', 'Q': '0111010001101011001001101', 'R': '1111010001111101001010001', 'S': '0111110000011100000111110', 'T': '1111100100001000010000100', 'U': '1000110001100011000101110', 'V': '1000110001100010101000100', 'W': '1000110001101011101110001', 'X': '1000101010001000101010001', 'Y': '1000101010001000010000100', 'Z': '1111100010001000100011111', '0': '0111010011101011100101110', '1': '0010001100001000010001110', '2': '1111000001011101000011111', '3': '1111000001001100000111110', '4': '1001010010111110001000010', '5': '1111110000111100000111110', '6': '0111010000111101000101110', '7': '1111100001000100010000100', '8': '0111010001011101000101110', '9': '0111010001011110000101110', ' ': '0000000000000000000000000', '.': '0000000000000000000000100', ',': '0000000000000000010001000', ':': '0000000100000000010000000', '-': '0000000000011100000000000', '!': '0010000100001000000000100', '?': '0111010001001100000000100', "'": '0010000100000000000000000', '·': '0000000000001000000000000', '/': '0000100010001000100010000', '(': '0001000100001000010000010', ')': '0100000100001000010001000', '+': '0000000100011100010000000', '=': '0000001110000000111000000', '&': '0110010010011011001001101', '"': '0101001010000000000000000'};
TT.bigWidth = (s, k = 1) => s.length ? (s.length * 6 - 1) * k : 0;

// ---------- a painter on a Uint32 buffer ----------
function painter(buf, W, H) {
  const P = {
    W, H, buf, glow: null,
    px(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; },
    get: (x, y) => (x |= 0, y |= 0, x >= 0 && y >= 0 && x < W && y < H ? buf[y * W + x] : 0),
    rect(x, y, w, h, c) { x |= 0; y |= 0; const x0 = Math.max(0, x), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h); if (x1 <= x0) return; for (let j = Math.max(0, y); j < y1; j++) buf.fill(c, j * W + x0, j * W + x1); },
    blend(x, y, c, a) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; buf[i] = mix(buf[i], c, a); },
    dither(x, y, w, h, c, a) { for (let j = Math.max(0, y | 0); j < Math.min(H, (y | 0) + h); j++) for (let i = Math.max(0, x | 0); i < Math.min(W, (x | 0) + w); i++) if (bayer(i, j) < a) buf[j * W + i] = c; },
    line(x0, y0, x1, y1, c, w = 1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) { const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n)); if (w === 1) P.px(x, y, c); else P.rect(x - (w >> 1), y, w, 1, c); } },
    ell(cx, cy, rx, ry, c, a = 1) { for (let y = Math.ceil(-ry); y <= ry; y++) for (let x = Math.ceil(-rx); x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) a < 1 ? P.blend(cx + x, cy + y, c, a) : P.px(cx + x, cy + y, c); },
    text(s, x, y, c, k = 1, align = 'left', shadow) {
      s = String(s).toUpperCase(); const w = TT.textWidth(s, k); if (align === 'center') x -= w >> 1; else if (align === 'right') x -= w;
      if (shadow != null) P.text(s, x + k, y + k, shadow, k);
      const col = hex(c); for (let n = 0; n < s.length; n++) { const g = GLYPH[s[n]] || GLYPH['?']; for (let i = 0; i < 15; i++) if (g[i] === '1') P.rect(x + n * 4 * k + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, col); }
    },
    big(s, x, y, c, k = 1, align = 'left', shadow) {
      s = String(s).toUpperCase(); const w = TT.bigWidth(s, k); if (align === 'center') x -= w >> 1; else if (align === 'right') x -= w;
      if (shadow != null) P.big(s, x + k, y + k, shadow, k);
      const col = hex(c); for (let n = 0; n < s.length; n++) { const g = GLYPH5[s[n]] || GLYPH5['?']; for (let i = 0; i < 25; i++) if (g[i] === '1') P.rect(x + n * 6 * k + (i % 5) * k, y + Math.floor(i / 5) * k, k, k, col); }
    },
    // a pixel map: rows of characters, pal = { ch: packed colour }, '.' = empty. flip mirrors it. Returns nothing.
    sprite(rows, pal, x, y, flip = false, clipY = 1e9, glowSet = null) {
      x |= 0; y |= 0; const w = rows[0].length;
      for (let j = 0; j < rows.length; j++) { const yy = y + j; if (yy > clipY || yy < 0 || yy >= H) continue; const row = rows[j];
        for (let i = 0; i < w; i++) { const ch = row[i]; if (ch === '.' || ch === ' ') continue; const c = pal[ch]; if (c == null) continue;
          const xx = x + (flip ? w - 1 - i : i); if (xx < 0 || xx >= W) continue; buf[yy * W + xx] = c; if (glowSet && P.glow && glowSet.has(ch)) P.glow[yy * W + xx] = 1; } }
    },
  };
  return P;
}
TT.painter = painter;

// ======================================================================================================
TT.create = function (opts = {}) {
  const W = opts.W || 320, H = opts.H || 180, SCALE = opts.scale || 6, FPS = opts.fps || 30, HZ = 120;
  const Q = new URLSearchParams(location.search), RENDER = Q.has('render');
  const OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));
  const F = { W, H, seed: opts.seed || 1, title: opts.title || '', sub: opts.sub || '', Q, OFF };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H), buf = new Uint32Array(img.data.buffer);
  const P = painter(buf, W, H); P.glow = new Uint8Array(W * H); F.P = P; F.canvas = cv;
  const n = TT.noise(F.seed); F.n = n;

  // ---------------- look ----------------
  let LOOK = { night: 0, ambient: '#ffffff', band: '#101018', text: '#f4efe2', shadow: '#000000',
    trail: { bg: '#05060a', foot: '#ffffff', body: '#2b3352', wave: '#57d0ff', you: '#3a4470', grid: '#0d0f18' }, wind: 1 };
  F.look = o => { LOOK = Object.assign(LOOK, o, { trail: Object.assign({}, LOOK.trail, o.trail || {}) }); return F; };

  // ---------------- world ----------------
  let WD = null;
  // materials: { name: def } (from the kit or your own); map(x, y, n) → name; deco(D, n) places decorations
  F.world = function (o) {
    const ww = o.w || 960, wh = o.h || 640, names = Object.keys(o.materials), mats = names.map((k, i) => Object.assign({ name: k, id: i }, o.materials[k]));
    const id = Object.fromEntries(names.map((k, i) => [k, i]));
    const mat = new Uint8Array(ww * wh);
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const k = o.map(x, y, n); const v = id[k]; if (v == null) throw new Error(`map(${x}, ${y}) gave "${k}", not a material (${names.join(', ')})`); mat[y * ww + x] = v; }
    // edges: distance (1–4) to the nearest pixel of another material, and which one
    const ed = new Uint8Array(ww * wh), eo = new Uint8Array(ww * wh);
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const i = y * ww + x, m = mat[i];
      const nb = [x > 0 ? i - 1 : -1, x < ww - 1 ? i + 1 : -1, y > 0 ? i - ww : -1, y < wh - 1 ? i + ww : -1];
      for (const j of nb) if (j >= 0 && mat[j] !== m) { ed[i] = 1; eo[i] = mat[j]; break; } }
    for (let d = 2; d <= 4; d++) for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const i = y * ww + x; if (ed[i]) continue; const m = mat[i];
      const nb = [x > 0 ? i - 1 : -1, x < ww - 1 ? i + 1 : -1, y > 0 ? i - ww : -1, y < wh - 1 ? i + ww : -1];
      for (const j of nb) if (j >= 0 && ed[j] === d - 1 && mat[j] === m) { ed[i] = d; eo[i] = eo[j]; break; } }
    const base = new Uint32Array(ww * wh), e = { d: 0, other: '', dx: 0, dy: 0 };
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const i = y * ww + x; e.d = ed[i]; e.other = ed[i] ? names[eo[i]] : '';
      // which side the other material is on (for rims lit from the top-left)
      e.dy = ed[i] === 1 ? (y > 0 && mat[i - ww] !== mat[i] ? -1 : y < wh - 1 && mat[i + ww] !== mat[i] ? 1 : 0) : 0;
      e.dx = ed[i] === 1 ? (x > 0 && mat[i - 1] !== mat[i] ? -1 : x < ww - 1 && mat[i + 1] !== mat[i] ? 1 : 0) : 0;
      base[i] = hex(mats[mat[i]].base(x, y, n, e)); }
    WD = { w: ww, h: wh, mat, base, mats, id, names, ed, props: [], solids: [], lights: [], blades: null, leaves: null };
    // decorations: flat ones are painted into the base now, tall ones are kept and y-sorted with the walker every frame
    const WP = painter(base, ww, wh);
    const D = { n, P: WP, w: ww, h: wh, matAt: (x, y) => names[mat[clamp(y | 0, 0, wh - 1) * ww + clamp(x | 0, 0, ww - 1)]],
      flat(fn) { fn(WP); },
      tall(x, y, draw, o = {}) { WD.props.push({ x, y, draw, glow: o.glow }); if (o.solid) WD.solids.push({ x, y, r: o.solid, name: o.name || 'prop' }); },
      light(x, y, o) { WD.lights.push(Object.assign({ x, y, r: 50, c: '#ffd890', k: 1 }, o)); },
    };
    if (o.deco) o.deco(D, n);
    WD.props.sort((a, b) => a.y - b.y);
    // tall blades (grass, reeds …) and loose litter (leaves …), scattered once, bucketed by row
    const blades = [], litter = [];
    for (const M of mats) {
      if (M.blades) { const b = M.blades, r = TT.rng(F.seed * 31 + M.id * 7 + 1), step = b.step || 1;
        for (let y = 0; y < wh; y += step) for (let x = 0; x < ww; x += step) { if (mat[y * ww + x] !== M.id) continue; if (ed[y * ww + x] === 1 && b.edgeGap !== false) continue;
          if (r() > b.density * (b.mask ? b.mask(x, y, n) : 1)) continue;
          const jx = x + Math.floor(r() * step), jy = y + Math.floor(r() * step); if (WD.solids.some(s => Math.hypot(s.x - jx, s.y - jy) < s.r)) continue;
          blades.push({ x: jx, y: jy, h: lerp(b.h[0], b.h[1], r()), k: r(), ph: r() * TAU, m: M.id }); } }
      if (M.litter) { const b = M.litter, r = TT.rng(F.seed * 37 + M.id * 11 + 3);
        for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { if (mat[y * ww + x] !== M.id) continue; if (r() > b.density) continue;
          litter.push({ x, y, c: Math.floor(r() * b.colors.length), k: r(), m: M.id, a: r() }); } }
    }
    const bucket = list => { const rows = Array.from({ length: wh }, () => []); for (const b of list) rows[clamp(b.y | 0, 0, wh - 1)].push(b); return rows; };
    WD.blades = bucket(blades); WD.nBlades = blades.length; WD.litter = bucket(litter); WD.nLitter = litter.length;
    F.worldInfo = { w: ww, h: wh, materials: names, blades: blades.length, litter: litter.length, solids: WD.solids };
    return F;
  };
  const matAt = (x, y) => WD.mats[WD.mat[clamp(Math.floor(y), 0, WD.h - 1) * WD.w + clamp(Math.floor(x), 0, WD.w - 1)]];
  F.matAt = (x, y) => matAt(x, y).name;

  // ---------------- the walker ----------------
  let CH = null;
  const DIRS = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
  F.walker = function (o) {
    const m = o.mass || 1, sq = Math.sqrt(m);
    CH = Object.assign({
      mass: m, speed: 34, step: 8, footW: 2, hipW: 2, hipH: 7, reach: 10, bob: 1, lift: 2, accel: 150, bodyR: 6, maxStepT: .42,
      ant: .13 * sq, hopAnt: .2 * sq, hopRec: .24 * sq, turnStep: .15 * sq, flare: .05, armSwing: 1.4,
      shadow: { rx: 5, ry: 2, a: .32, c: '#000000' }, legs: { w: 2, c: 'o', boot: 'o', bootW: 3 }, arms: null, follow: [], glow: '', blink: null, light: null,
    }, o);
    CH.pal = Object.fromEntries(Object.entries(o.palette || {}).map(([k, v]) => [k, hex(v)]));
    CH.glowSet = new Set((CH.glow || '').split(''));
    for (const d of ['down', 'up', 'right']) if (!o.art || !o.art[d]) throw new Error('walker.art needs down, up and right (left mirrors right unless given)');
    return F;
  };

  // one simulation of the walker at 120 Hz. drive(sim) → cmd = { vx, vy, face, hop: [x, y] }. Returns samples + stamps.
  const latOf = d => [d[1], -d[0]];                                      // the body's LEFT side when travelling along d
  const faceOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  function newSim(x, y, face) {
    const d = DIRS[face], S = { x, y, vx: 0, vy: 0, face, dir: d.slice(), mode: 'idle', mt: 0, t: 0, feet: [], sw: -1, sp: 0, from: null, nStep: 0,
      crouch: 0, cv: 0, ct: 0, lean: 0, lv: 0, lt: 0, z: 0, hop: null, queue: [], fo: CH.follow.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })), ax: 0, ay: 0,
      stamps: [], lastBody: -1, lastWake: -1, idleSince: 0, turnTo: null };
    for (let i = 0; i < 2; i++) S.feet.push(Object.assign({ pl: 1, lift: 0 }, home(S, i, 0)));
    return S;
  }
  function home(S, i, ahead, rx = S.x, ry = S.y, dir = S.dir) { const l = latOf(dir), side = i === 0 ? 1 : -1, sideView = Math.abs(dir[0]) > Math.abs(dir[1]);
    return { x: rx + dir[0] * ahead + l[0] * side * CH.footW, y: ry + dir[1] * ahead + l[1] * side * CH.footW * (sideView ? .6 : 1) }; }
  function stamp(S, kind, x, y, o = {}) { const M = matAt(x, y); S.stamps.push(Object.assign({ t: +S.t.toFixed(4), kind, x, y, dx: S.dir[0], dy: S.dir[1], s: 1, mat: M.name }, o)); return M; }
  function plant(S, i, s = 1) { const f = S.feet[i]; f.pl = 1; f.lift = 0;
    const M = stamp(S, 'foot', f.x, f.y, { s, foot: i }); if (M.step && M.step.wake) stamp(S, 'wake', f.x, f.y, { s: s * (M.step.wake === true ? 1 : M.step.wake) }); }
  function spring(S, k, target, w, z, dt) { const v = S[k + 'v'] || 0, x = S[k]; const a = w * w * (target - x) - 2 * z * w * v; S[k + 'v'] = v + a * dt; S[k] = x + S[k + 'v'] * dt; }

  function simStep(S, cmd, dt) {
    S.t += dt; S.mt += dt; const sq = Math.sqrt(CH.mass), M0 = matAt(S.x, S.y), slow = M0.step && M0.step.slow || 1;
    const vx0 = S.vx, vy0 = S.vy;
    let crouchT = 0, leanT = 0;
    const want = Math.hypot(cmd.vx || 0, cmd.vy || 0) > .5;
    const startStep = (i, timed) => { const f = S.feet[i]; S.sw = i; S.sp = 0; S.from = { x: f.x, y: f.y }; f.pl = 0; S.timed = timed || 0; };
    if (S.mode === 'idle') {
      S.vx = S.vy = 0;
      const wantFace = want ? faceOf(cmd.vx, cmd.vy) : cmd.face;
      const together = [0, 1].every(i => { const h = home(S, i, 0); return Math.hypot(S.feet[i].x - h.x, S.feet[i].y - h.y) < 1.2; });
      if (S.sw >= 0) { /* a settle step is in the air */ }
      else if (!together) { startStep(Math.hypot(S.feet[0].x - home(S, 0, 0).x, S.feet[0].y - home(S, 0, 0).y) > Math.hypot(S.feet[1].x - home(S, 1, 0).x, S.feet[1].y - home(S, 1, 0).y) ? 0 : 1, CH.turnStep); S.settle = 1; }
      else if (cmd.hop) { const dx = cmd.hop[0] - S.x, dy = cmd.hop[1] - S.y, f = faceOf(dx, dy);
        if (f !== S.face) { S.mode = 'turn'; S.turnTo = f; S.turnDir = [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)]; S.mt = 0; S.k = 0; }
        else { S.mode = 'hopAnt'; S.mt = 0; S.hop = { x0: S.x, y0: S.y, x1: cmd.hop[0], y1: cmd.hop[1] }; S.dir = [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)]; } }
      else if (wantFace && wantFace !== S.face) { S.mode = 'turn'; S.turnTo = wantFace; S.turnDir = want ? [cmd.vx / Math.hypot(cmd.vx, cmd.vy), cmd.vy / Math.hypot(cmd.vx, cmd.vy)] : DIRS[wantFace].slice(); S.mt = 0; S.k = 0; }
      else if (want) { S.mode = 'ant'; S.mt = 0; const h = Math.hypot(cmd.vx, cmd.vy); S.dir = [cmd.vx / h, cmd.vy / h]; }
    }
    if (S.mode === 'turn') {
      // the body turns over its feet: two quick steps, the facing changes as the first foot lifts
      if (S.sw < 0) { if (S.k >= 2) { S.mode = 'idle'; S.mt = 0; S.idleSince = S.t; }
        else { if (S.k === 0) { S.face = S.turnTo; S.dir = S.turnDir; } startStep(S.k === 0 ? 1 : 0, CH.turnStep); S.k++; } }
      crouchT = .5;
    }
    if (S.mode === 'ant') { crouchT = 1; leanT = -1; if (S.mt >= CH.ant) { S.mode = 'walk'; S.mt = 0; startStep(S.nStep % 2 ? 0 : 1); } }
    if (S.mode === 'walk') {
      // velocity: steer toward the command with an acceleration set by mass; facing follows at foot plants
      // the wanted velocity turns toward the command at a rate set by mass (corners become arcs a step or two long)
      let tvx = (cmd.vx || 0) * slow, tvy = (cmd.vy || 0) * slow; const tm = Math.hypot(tvx, tvy), cm = Math.hypot(S.vx, S.vy);
      if (tm > .5 && cm > 2) { const a0 = Math.atan2(S.vy, S.vx), a1 = Math.atan2(tvy, tvx); let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const mx = (CH.turnRate || 170) / CH.mass * Math.PI / 180 * dt; if (Math.abs(da) > mx) { const a = a0 + Math.sign(da) * mx; tvx = Math.cos(a) * tm; tvy = Math.sin(a) * tm; } }
      const ax = tvx - S.vx, ay = tvy - S.vy, am = Math.hypot(ax, ay), lim = CH.accel / CH.mass * dt;
      if (am > lim) { S.vx += ax / am * lim; S.vy += ay / am * lim; } else { S.vx += ax; S.vy += ay; }
      const v = Math.hypot(S.vx, S.vy); if (v > 2) { S.dir = [S.vx / v, S.vy / v]; }
      S.x += S.vx * dt; S.y += S.vy * dt;
      leanT = clamp(((S.vx - vx0) * S.dir[0] + (S.vy - vy0) * S.dir[1]) / dt / (CH.accel / CH.mass) * .8, -1, 1);
      if (!want && v < CH.speed * .3 && S.sw < 0) { S.mode = 'idle'; S.mt = 0; S.vx = S.vy = 0; S.idleSince = S.t; S.recover = CH.hopRec * .6; }
    }
    // swing foot (walk / turn / settle): locked feet never move; the swinging one travels to a target that follows the body
    if (S.sw >= 0) {
      const i = S.sw, f = S.feet[i], v = Math.hypot(S.vx, S.vy);
      const ahead = S.mode === 'walk' && want ? CH.step / 2 * clamp(v / CH.speed, .35, 1) : S.mode === 'walk' ? CH.step / 2 * clamp(v / CH.speed, 0, .6) : 0;
      const tg = home(S, i, ahead);
      const rate = S.timed ? 1 / S.timed : Math.max(v / CH.step, 1 / CH.maxStepT);
      S.sp = Math.min(1, S.sp + rate * dt);
      const e = S.sp * S.sp * (3 - 2 * S.sp);
      f.x = lerp(S.from.x, tg.x, e); f.y = lerp(S.from.y, tg.y, e); f.lift = Math.sin(Math.PI * S.sp) * CH.lift * (S.timed ? .6 : 1);
      if (S.sp >= 1) { f.x = tg.x; f.y = tg.y; plant(S, i); S.sw = -1; S.nStep++;
        if (S.mode === 'walk') { const nf = faceOf(S.dir[0], S.dir[1]); if (nf !== S.face && Math.abs(S.dir[nf === 'left' || nf === 'right' ? 0 : 1]) > .62) S.face = nf;
          if (want || v > CH.speed * .3) startStep(1 - i); else { S.mode = 'idle'; S.mt = 0; S.vx = S.vy = 0; S.idleSince = S.t; S.recover = CH.hopRec * .6; } }
        if (S.settle) { S.settle = 0; S.idleSince = S.t; } }
    }
    // hop: gather, fly, land on both feet, recover
    if (S.mode === 'hopAnt') { crouchT = 2.2; leanT = -.6; if (S.mt >= CH.hopAnt) { S.mode = 'hopAir'; S.mt = 0; const h = S.hop; h.d = Math.hypot(h.x1 - h.x0, h.y1 - h.y0); h.T = clamp(h.d / (CH.speed * 1.7), .26, .7); h.zh = 5 + h.d * .12; S.feet.forEach(f => f.pl = 0); } }
    if (S.mode === 'hopAir') { const h = S.hop, u = clamp(S.mt / h.T, 0, 1);
      const px = S.x, py = S.y; S.x = lerp(h.x0, h.x1, u); S.y = lerp(h.y0, h.y1, u); S.vx = (S.x - px) / dt; S.vy = (S.y - py) / dt; S.z = 4 * h.zh * u * (1 - u);
      crouchT = u < .5 ? -.5 : .5; leanT = .6;
      for (let i = 0; i < 2; i++) { const p = home(S, i, 0); S.feet[i].x = p.x; S.feet[i].y = p.y; S.feet[i].lift = S.z + 1.5; }
      if (u >= 1) { S.z = 0; S.vx = S.vy = 0; for (let i = 0; i < 2; i++) { const p = home(S, i, 0); S.feet[i].x = p.x; S.feet[i].y = p.y; plant(S, i, 2); }
        const M = matAt(S.x, S.y); if (M.step && M.step.wake) stamp(S, 'wake', S.x, S.y, { s: 2.2 }); stamp(S, 'land', S.x, S.y, { s: 2 });
        S.mode = 'hopLand'; S.mt = 0; S.crouch = 3; S.cv = 0; S.hop = null; } }
    if (S.mode === 'hopLand') { crouchT = S.mt < CH.hopRec * .35 ? 2.5 : 0; if (S.mt >= CH.hopRec) { S.mode = 'idle'; S.mt = 0; S.idleSince = S.t; } }
    if (S.recover > 0) { S.recover -= dt; leanT = .8; }
    // springs: crouch (hip lowering, px) and lean (px along the facing) — weight sets the frequency, a little overshoot
    const w = 22 / Math.sqrt(CH.mass); spring(S, 'crouch', crouchT, w, .55, dt); spring(S, 'lean', leanT, w * .8, .45, dt);
    // followers lag the body (inertia): pushed by the body's acceleration, pulled back by a spring, a little sway
    const ax = (S.vx - vx0) / dt, ay = (S.vy - vy0) / dt;
    CH.follow.forEach((fd, k) => { const o = S.fo[k], ww = TAU / (fd.lag || .5), z = fd.damp || .25, g = fd.inertia ?? .012;
      const tx = -S.vx * (fd.flare ?? CH.flare), ty = -S.vy * (fd.flare ?? CH.flare) * .5;
      o.vx += (ww * ww * (tx - o.x) - 2 * z * ww * o.vx - ax * g) * dt; o.vy += (ww * ww * (ty - o.y) - 2 * z * ww * o.vy - ay * g * .5) * dt;
      o.x = clamp(o.x + o.vx * dt, -(fd.max || 3), fd.max || 3); o.y = clamp(o.y + o.vy * dt, -(fd.max || 3), fd.max || 3); });
    // the body presses the ground it stands on (tall grass parts, leaves move); a wake behind it in water
    const moving = Math.hypot(S.vx, S.vy) > 1 && S.mode !== 'hopAir';
    if (S.mode !== 'hopAir' && S.t - S.lastBody >= (moving ? 1 / 20 : .25)) { S.lastBody = S.t; stamp(S, 'body', S.x, S.y, { r: CH.bodyR }); }
    if (moving && M0.step && M0.step.wake && S.t - S.lastWake >= .24) { S.lastWake = S.t; stamp(S, 'wake', S.x - S.dir[0] * 2, S.y - S.dir[1] * 2, { s: .55 }); }
  }

  // ---------------- route → film ----------------
  let ROUTE = null, TRACK = null, STEPS = [], DURATION = 10;
  F.route = list => { ROUTE = list; return F; };
  function simulateRoute(route, extraHold = 1.2) {
    const st0 = route[0]; if (!st0.at) throw new Error('route[0] must be { at: [x, y], face }');
    const S = newSim(st0.at[0], st0.at[1], st0.face || 'down'), out = [], steps = [];
    let i = 0, t0 = 0, waitFrom = null, hopSent = false, tEnd = null;
    steps.push({ i: 0, t0: 0, kind: 'at', view: st0.view || 'world', caption: st0.caption, title: !!F.title });
    const next = () => { steps[steps.length - 1].t1 = S.t; i++; t0 = S.t; waitFrom = null; hopSent = false;
      if (i < route.length) { const r = route[i]; steps.push({ i, t0: S.t, kind: r.to ? 'to' : r.hop ? 'hop' : 'wait', view: r.view || steps[steps.length - 1].view, caption: r.caption, to: r.to || r.hop, speed: r.speed }); } };
    // the first step is a short hold at the start (idle) unless it says wait
    let hold0 = st0.wait ?? 1.2;
    const sampleOf = () => ({ t: +S.t.toFixed(4), x: S.x, y: S.y, z: S.z, vx: S.vx, vy: S.vy, face: S.face, dir: S.dir.slice(), mode: S.mode, crouch: S.crouch, lean: S.lean,
      feet: S.feet.map(f => ({ x: f.x, y: f.y, lift: f.lift, pl: f.pl })), sw: S.sw, sp: S.sp, fo: S.fo.map(o => ({ x: o.x, y: o.y })), idle: S.mode === 'idle' ? S.t - S.idleSince : -1, step: i });
    out.push(sampleOf());
    const dt = 1 / HZ; let guard = 0;
    while (guard++ < HZ * 400) {
      let cmd = { vx: 0, vy: 0 };
      if (i === 0) { if (S.t >= hold0) next(); }
      else if (i < route.length) {
        const r = route[i];
        if (r.to) { const pass = route[i + 1] && route[i + 1].to, sp = r.speed || CH.speed, dx = r.to[0] - S.x, dy = r.to[1] - S.y, d = Math.hypot(dx, dy);
          const brake = (Math.hypot(S.vx, S.vy) ** 2) / (2 * CH.accel / CH.mass) + 3;
          const k = pass ? 1 : clamp(d / brake, .32, 1);
          if (pass ? d < 7 : d < 1.6) { if (pass) next(); else { cmd = { vx: 0, vy: 0 }; if (S.mode === 'idle' && S.sw < 0) next(); } }
          else cmd = { vx: dx / d * sp * k, vy: dy / d * sp * k };
          if (S.t - t0 > 60) throw new Error(`route step ${i} never reaches ${r.to}`); }
        else if (r.wait != null) { cmd = { vx: 0, vy: 0, face: r.face }; if (S.mode === 'idle' && S.sw < 0 && (!r.face || S.face === r.face)) { if (waitFrom == null) waitFrom = S.t; if (S.t - waitFrom >= r.wait) next(); } }
        else if (r.hop) { if (!hopSent) { if (S.mode === 'idle' && S.sw < 0) { cmd.hop = r.hop; if (S.mode === 'idle') {} } }
          if (S.mode === 'hopAnt' || S.mode === 'hopAir') hopSent = true;
          if (hopSent && S.mode === 'idle') next(); }
      } else { if (tEnd == null) tEnd = S.t + extraHold; if (S.t >= tEnd) break; }
      simStep(S, cmd, dt);
      // camera: a spring that leads a little in the direction of travel
      out.push(sampleOf());
    }
    if (steps[steps.length - 1].t1 == null) steps[steps.length - 1].t1 = S.t;
    return { samples: out, stamps: S.stamps, steps, dur: S.t };
  }
  // camera track (after the walk, so it can look ahead): critically damped spring on the walker + lead
  function cameraTrack(samples) {
    let cx = samples[0].x, cy = samples[0].y - 6, vx = 0, vy = 0; const w = 3.4, dt = 1 / HZ;
    for (const s of samples) { const tx = s.x + s.vx * .45, ty = s.y + s.vy * .35 - 6; vx += (w * w * (tx - cx) - 2 * w * vx) * dt; vy += (w * w * (ty - cy) - 2 * w * vy) * dt; cx += vx * dt; cy += vy * dt; s.cx = cx; s.cy = cy; }
  }
  const sampleAt = t => TRACK.samples[clamp(Math.round(t * HZ), 0, TRACK.samples.length - 1)];
  const stepAt = t => STEPS.find(s => t >= s.t0 && t < s.t1) || STEPS[STEPS.length - 1];
  F.sample = sampleAt;

  // ---------------- the trail texture ----------------
  // a window of the world around the camera (+ margin), rebuilt from the stamp log for time t.
  //   fT: time a foot last pressed this texel      fS: how hard (1 step, 2 landing)
  //   bT: time the body last covered it            bX, bY: which way the body pushed it (unit-ish)
  //   wv: ripple height now (sum of every ring still spreading)
  const MG = 48, TW = W + MG * 2, TH = H + MG * 2;
  const TX = { fT: new Float32Array(TW * TH), fS: new Float32Array(TW * TH), bT: new Float32Array(TW * TH), bX: new Float32Array(TW * TH), bY: new Float32Array(TW * TH), wv: new Float32Array(TW * TH), ox: 0, oy: 0 };
  let LIFE = { foot: 60, body: 12, wake: 3.2, max: 61 };
  F.trail = TX;
  function rebuild(stamps, t, ox, oy) {
    TX.ox = ox; TX.oy = oy; TX.fT.fill(NONE); TX.bT.fill(NONE); TX.wv.fill(0);
    if (OFF.has('trail')) return;
    for (let k = stamps.length - 1; k >= 0; k--) { const s = stamps[k]; if (s.t > t) continue; const age = t - s.t; if (age > LIFE.max) break;
      const lx = s.x - ox, ly = s.y - oy; if (lx < -60 || ly < -60 || lx > TW + 60 || ly > TH + 60) continue;
      if (s.kind === 'foot') { if (age > LIFE.foot) continue; const len = s.s > 1 ? 2.1 : 1.6, wid = s.s > 1 ? 1.3 : 1.05, a = s.dx, b = s.dy;
        for (let y = Math.floor(ly - 3); y <= ly + 3; y++) for (let x = Math.floor(lx - 3); x <= lx + 3; x++) { if (x < 0 || y < 0 || x >= TW || y >= TH) continue;
          const rx = x + .5 - lx, ry = y + .5 - ly, al = rx * a + ry * b, ac = -rx * b + ry * a; if (Math.abs(al) > len || Math.abs(ac) > wid) continue;
          const i = y * TW + x; if (s.t > TX.fT[i]) { TX.fT[i] = s.t; TX.fS[i] = s.s; } } }
      else if (s.kind === 'body') { if (age > LIFE.body) continue; const r = s.r || 6, ry = r * .6;
        for (let y = Math.floor(ly - ry); y <= ly + ry; y++) for (let x = Math.floor(lx - r); x <= lx + r; x++) { if (x < 0 || y < 0 || x >= TW || y >= TH) continue;
          const rx = x + .5 - lx, rr = y + .5 - ly, q = (rx * rx) / (r * r) + (rr * rr) / (ry * ry); if (q > 1) continue;
          const i = y * TW + x; if (s.t > TX.bT[i]) { const d = Math.hypot(rx, rr / .6) || 1; TX.bT[i] = s.t; TX.bX[i] = rx / d * .85 + s.dx * .45; TX.bY[i] = rr / .6 / d * .85 + s.dy * .45; } } }
      else if (s.kind === 'wake') { if (age > LIFE.wake) continue; const sp = 15 + 4 * s.s, rad = age * sp, amp = s.s * (1 - age / LIFE.wake) ** 1.4;
        for (const [rk, ak] of [[1, 1], [.62, .55]]) { const rr = rad * rk; if (rr < 1) continue; const R0 = Math.ceil(rr + 2);
          for (let y = Math.floor(ly - R0 * .62); y <= ly + R0 * .62; y++) for (let x = Math.floor(lx - R0); x <= lx + R0; x++) { if (x < 0 || y < 0 || x >= TW || y >= TH) continue;
            const d = Math.hypot(x + .5 - lx, (y + .5 - ly) / .62), u = Math.abs(d - rr); if (u > 1.25) continue; TX.wv[y * TW + x] += amp * ak * (1 - u / 1.25); } } }
    }
  }
  // the reader handed to every material, one texel at a time (reused object)
  const S = { x: 0, y: 0, sx: 0, sy: 0, t: 0, foot: 1e9, fs: 0, body: 1e9, px: 0, py: 0, wave: 0, emit: 0, glow: 0, ti: 0,
    footAt(dx, dy) { const x = this.sx + MG + dx, y = this.sy + MG + dy; if (x < 0 || y < 0 || x >= TW || y >= TH) return 1e9; const v = TX.fT[y * TW + x]; return v === NONE ? 1e9 : this.t - v; },
    bodyAt(dx, dy) { const x = this.sx + MG + dx, y = this.sy + MG + dy; if (x < 0 || y < 0 || x >= TW || y >= TH) return 1e9; const v = TX.bT[y * TW + x]; return v === NONE ? 1e9 : this.t - v; },
    waveAt(dx, dy) { const x = this.sx + MG + dx, y = this.sy + MG + dy; if (x < 0 || y < 0 || x >= TW || y >= TH) return 0; return TX.wv[y * TW + x]; },
    dither(v) { return bayer(this.x, this.y) < v; },
  };
  const tTex = (arr, wx, wy, t) => { const x = Math.floor(wx) - TX.ox, y = Math.floor(wy) - TX.oy; if (x < 0 || y < 0 || x >= TW || y >= TH) return 1e9; const v = arr[y * TW + x]; return v === NONE ? 1e9 : t - v; };
  const tPush = (wx, wy) => { const x = Math.floor(wx) - TX.ox, y = Math.floor(wy) - TX.oy; if (x < 0 || y < 0 || x >= TW || y >= TH) return [0, 0]; const i = y * TW + x; return [TX.bX[i], TX.bY[i]]; };
  F.tex = { foot: (x, y, t) => tTex(TX.fT, x, y, t), body: (x, y, t) => tTex(TX.bT, x, y, t), push: tPush };

  // ---------------- drawing ----------------
  const LIGHT = new Float32Array(W * H), EMIT_W = Math.ceil(W / 4) + 2, EMIT_H = Math.ceil(H / 4) + 2, EMIT = new Float32Array(EMIT_W * EMIT_H), EMIT2 = new Float32Array(EMIT_W * EMIT_H);
  const EMC = [new Float32Array(EMIT_W * EMIT_H), new Float32Array(EMIT_W * EMIT_H), new Float32Array(EMIT_W * EMIT_H)];
  let pts = [];                                       // light points for this frame: { x, y (screen), r, c, k }

  function drawWalker(Pp, s, camX, camY, o = {}) {
    if (!CH) return;
    const face = s.face, flip = face === 'left' && !CH.art.left, art = CH.art[face] || CH.art.right, rows = art.rows || art, org = art.origin || CH.origin[face === 'left' ? 'right' : face] || CH.origin.down;
    const aw = rows[0].length, sideV = face === 'left' || face === 'right';
    const gx = Math.round(s.x) - camX, gy = Math.round(s.y) - camY, sink = o.sink || 0, clipY = sink ? gy - sink : 1e9;
    const breathe = s.idle > .3 ? (Math.sin((s.t * TAU) / (2.6 * Math.sqrt(CH.mass)) + 1.3) > .25 ? 1 : 0) : 0;
    const blink = CH.blink && blinkAt(s.t);
    const sway = s.idle > 2.5 ? Math.round(Math.sin(s.t * TAU / 7.3) * .9) : 0;
    const bob = s.mode === 'walk' && s.sw >= 0 ? Math.round(Math.sin(Math.PI * s.sp) * CH.bob) : 0;
    const d = DIRS[face], lean = Math.round(clamp(s.lean, -1.4, 1.4));
    const hx = gx + d[0] * lean + (sideV ? 0 : sway), hy = gy - CH.hipH - Math.round(s.z) + Math.round(Math.max(-1, s.crouch)) - bob + (sideV ? 0 : d[1] * lean * 0) - (d[1] * lean > 0 ? 0 : 0);
    const pal = CH.pal, legC = pal[CH.legs.c], bootC = pal[CH.legs.boot], legFar = TT.shade(legC, .78);
    // shadow on the ground (stays down while the body hops)
    if (!o.noShadow) { const sh = CH.shadow, k = 1 - clamp(s.z / 18, 0, .6); Pp.ell(gx, gy, sh.rx * k, sh.ry * k, hex(sh.c), sh.a); }
    // legs: from the hip to the foot (feet are world-locked when planted)
    const l = latOf(d), hip = i => { const side = i === 0 ? 1 : -1; return sideV ? [hx, hy + (i === 0 ? (face === 'right' ? -0 : 0) : 0)] : [hx + l[0] * side * CH.hipW, hy]; };
    const nearLeg = face === 'right' ? 1 : face === 'left' ? 0 : -1;                // the leg on the camera side, drawn in front
    const order = nearLeg < 0 ? [0, 1] : [1 - nearLeg, nearLeg];
    const legW = CH.legs.w, bootW = CH.legs.bootW;
    for (const i of order) { const f = s.feet[i], [px, py] = hip(i), fx = Math.round(f.x) - camX, fy = Math.round(f.y) - camY - Math.round(f.lift);
      const c = nearLeg >= 0 && i !== nearLeg ? legFar : legC;
      const n2 = Math.max(Math.abs(fx - px), Math.abs(fy - py), 1);
      for (let k = 0; k <= n2; k++) { const x = Math.round(lerp(px, fx, k / n2)), y = Math.round(lerp(py, fy, k / n2)); if (y > clipY) continue;
        for (let w2 = 0; w2 < legW; w2++) Pp.px(x - (legW >> 1) + w2, y, c); }
      if (fy - 1 <= clipY) { const bx = sideV ? fx - (face === 'right' ? 1 : bootW - 2) : fx - (bootW >> 1); Pp.rect(bx, fy - 1, bootW, 2, nearLeg >= 0 && i !== nearLeg ? TT.shade(bootC, .8) : bootC); } }
    const ax = hx - org[0], ay = hy - org[1] - breathe;
    // arms: shoulder → hand, swinging against the legs; followers (cape, lantern, tail …) hang from their anchors and lag
    const arms = CH.arms, armPts = [];
    if (arms) { const sh = arms[face === 'left' && flip ? 'right' : face] || arms.down;
      for (let i = 0; i < 2; i++) { let p = sh[i]; if (!p) { armPts.push(null); continue; }
        const fx = flip ? aw - 1 - p[0] : p[0], f = s.feet[1 - i], fore = ((f.x - s.x) * s.dir[0] + (f.y - s.y) * s.dir[1]) / (CH.step / 2);
        const sw = s.mode === 'walk' ? clamp(fore, -1, 1) * CH.armSwing : s.mode === 'hopAir' ? -1.2 : s.mode === 'hopAnt' ? 1 : 0;
        const x0 = ax + fx, y0 = ay + p[1], x1 = x0 + Math.round(d[0] * sw), y1 = y0 + arms.len + Math.round(d[1] * sw * .7) - (s.mode === 'hopAir' ? 1 : 0);
        armPts.push({ x0, y0, x1, y1, near: sideV ? ((face === 'right') === (i === 1)) : true }); } }
    const drawArm = a => { if (!a) return; Pp.line(a.x0, a.y0, a.x1, a.y1 - 1, pal[arms.c]); if (arms.out && !sideV) Pp.line(a.x0 + (a.x0 < hx ? -1 : 1) * (sideV ? 0 : 1), a.y0, a.x1 + (a.x0 < hx ? -1 : 1) * (sideV ? 0 : 1), a.y1 - 1, pal[arms.out]); Pp.px(a.x1, a.y1, pal[arms.hand]); };
    const fol = CH.follow.map((fd, k) => { const at = fd.at === 'handR' ? armPts[1] : fd.at === 'handL' ? armPts[0] : null;
      const a2 = fd.art[face] || fd.art[face === 'left' ? 'right' : 'down'], fl = face === 'left' && !fd.art.left, rws = a2.rows || a2, og = a2.origin || [0, 0];
      let bx, by; if (at) { bx = at.x1; by = at.y1; } else { const p = (fd.anchor[face] || fd.anchor[face === 'left' ? 'right' : 'down']); bx = ax + (fl ? aw - 1 - p[0] : p[0]); by = ay + p[1]; }
      const o2 = s.fo[k], x = bx - (fl ? rws[0].length - 1 - og[0] : og[0]) + Math.round(o2.x), y = by - og[1] + Math.round(o2.y);
      const behind = at ? !at.near : (fd.behind || {})[face] ?? (fd.behind || {})[face === 'left' ? 'right' : 'x'] ?? false;
      return { fd, rws, fl, x, y, behind, k }; });
    for (const f of fol) if (f.behind) Pp.sprite(f.rws, pal, f.x, f.y, f.fl, clipY, CH.glowSet);
    for (const a of armPts) if (a && !a.near) drawArm(a);
    let r2 = rows; if (blink && CH.blink) r2 = rows.map(r => r.replaceAll(CH.blink[0], CH.blink[1]));
    Pp.sprite(r2, pal, ax, ay, flip, clipY, CH.glowSet);
    for (const a of armPts) if (a && a.near) drawArm(a);
    for (const f of fol) if (!f.behind) Pp.sprite(f.rws, pal, f.x, f.y, f.fl, clipY, CH.glowSet);
    // where the body meets the water: a bright line round it
    if (sink && o.line) { for (let x = -CH.shadow.rx - 1; x <= CH.shadow.rx + 1; x++) { const y = Math.round(Math.sqrt(Math.max(0, 1 - (x * x) / ((CH.shadow.rx + 1.5) ** 2))) * 2); Pp.px(gx + x, gy - sink + y, o.line); Pp.px(gx + x, gy - sink - y + 1, o.line); } }
    // the light it carries
    for (const f of fol) if (f.fd.light) { const L = f.fd.light; pts.push({ x: f.x + (f.fl ? f.rws[0].length - 1 - L.at[0] : L.at[0]), y: f.y + L.at[1], r: L.r, c: hex(L.c), k: L.k * (1 + (Math.sin(s.t * 23.1) + Math.sin(s.t * 13.7)) * (L.flicker ?? .04)) }); }
    return { hx, hy, top: ay };
  }
  let BLINKS = [];
  const blinkAt = t => { for (const b of BLINKS) if (t >= b && t < b + .11) return true; return false; };

  function blade(Pp, b, camX, camY, t) {
    const M = WD.mats[b.m], bd = M.blades, cols = M._bc || (M._bc = bd.colors.map(hex));
    const age = OFF.has('trail') ? 1e9 : F.tex.body(b.x, b.y, t);
    let bend = 0, px = 0, py = 0;
    if (age < (bd.life || 6)) { const sp = bd.spring || 1.2, w = TAU / (sp * .9); bend = Math.exp(-age / (sp * .45)) * Math.cos(w * age * .5) * (bd.give || 1); [px, py] = F.tex.push(b.x, b.y);
      const pm = Math.hypot(px, py) || 1; px /= pm; py /= pm; }
    const wind = OFF.has('wind') || OFF.has('still') ? 0 : Math.sin(t * (bd.windHz || 1.3) * TAU * .25 + b.x * .06 + b.y * .025) * (bd.wind ?? .6) * LOOK.wind;
    const h = b.h * (1 - .55 * Math.max(0, bend)), tipX = wind + px * bend * b.h * .85, tipY = -h + py * Math.max(0, bend) * b.h * .3;
    const sx = b.x - camX, sy = b.y - camY, n2 = Math.max(1, Math.round(Math.max(Math.abs(tipX), Math.abs(tipY))));
    const crushed = bend > .35;
    for (let k = 0; k <= n2; k++) { const u = k / n2, x = Math.round(sx + tipX * u * u), y = Math.round(sy + tipY * u);
      let ci = Math.min(cols.length - 1, Math.floor(u * cols.length * (.75 + b.k * .5))); if (crushed) ci = Math.max(0, ci - 1); Pp.px(x, y, cols[ci]); }
  }
  function leaf(Pp, b, camX, camY, t) {
    const M = WD.mats[b.m], lt = M.litter, cols = M._lc || (M._lc = lt.colors.map(hex));
    let dx = 0, dy = 0;
    if (!OFF.has('trail')) { const age = F.tex.body(b.x, b.y, t); if (age < (lt.life || 40)) { const [px, py] = F.tex.push(b.x, b.y), pm = Math.hypot(px, py) || 1, k = (lt.push || 4) * (1 - Math.exp(-age / .12)) * (1 - smooth((lt.life || 40) * .7, lt.life || 40, age));
      dx = px / pm * k * (.6 + b.k * .6); dy = py / pm * k * .7 * (.6 + b.k * .6); } }
    const x = Math.round(b.x + dx) - camX, y = Math.round(b.y + dy) - camY, c = cols[b.c];
    Pp.px(x, y, c); if (b.a > .45) Pp.px(x + (b.a > .7 ? 1 : 0), y + (b.a > .7 ? 0 : 1), b.a > .8 ? TT.shade(c, .8) : c);
  }

  function particles(Pp, stamps, t, camX, camY) {
    for (let k = stamps.length - 1; k >= 0; k--) { const s = stamps[k]; if (s.t > t) continue; const age = t - s.t; if (age > 1.2) break; if (s.kind !== 'foot' && s.kind !== 'land') continue;
      const M = WD.mats[WD.id[s.mat]], st = M.step || {}, pf = st.puff || st.splash; if (!pf || s.kind === 'land' && !st.splash) continue; if (age > (pf.life || .45)) continue;
      const nP = Math.round((pf.n || 4) * (s.s > 1 ? 1.8 : 1)), c = hex(pf.c), c2 = pf.c2 ? hex(pf.c2) : c;
      for (let j = 0; j < nP; j++) { const h1 = hash(k, j, 5), h2 = hash(k, j, 9), h3 = hash(k, j, 13), a = h1 * TAU, v = (pf.v || 12) * (.5 + h2 * .7) * (s.s > 1 ? 1.4 : 1);
        const up = (pf.up || 10) * (.6 + h3 * .8), g = pf.g || 60, z = up * age - g * age * age / 2; if (z < -1 && age > .08) continue;
        const x = Math.round(s.x + Math.cos(a) * v * age) - camX, y = Math.round(s.y + Math.sin(a) * v * age * .55 - Math.max(0, z)) - camY; Pp.px(x, y, age < (pf.life || .45) * .5 ? c : c2); } }
  }

  // light: ambient × (the lights it carries, lamps, glowing ground), banded and dithered so it stays pixel art
  function lightPass(t) {
    const nt = LOOK.night || 0; if (!nt || OFF.has('light')) return;
    const amb = hex(LOOK.ambient), aR = R(amb) / 255, aG = G(amb) / 255, aB = B(amb) / 255, lev = LOOK.levels || 4;
    // glow from the ground (emit map, quarter resolution, blurred)
    for (let c = 0; c < 3; c++) { const E = EMC[c]; for (let p = 0; p < 2; p++) { for (let y = 1; y < EMIT_H - 1; y++) for (let x = 1; x < EMIT_W - 1; x++) { const i = y * EMIT_W + x; EMIT2[i] = (E[i] * 4 + E[i - 1] + E[i + 1] + E[i - EMIT_W] + E[i + EMIT_W]) / 8; } E.set(EMIT2); } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (P.glow[i]) continue; const c = buf[i];
      let lr = 0, lg = 0, lb = 0;
      for (const L of pts) { const dx = x - L.x, dy = (y - L.y) * 1.15, d2 = dx * dx + dy * dy, r2 = L.r * L.r; if (d2 >= r2) continue; const f = (1 - Math.sqrt(d2) / L.r) ** 1.5 * L.k; lr += R(L.c) / 255 * f; lg += G(L.c) / 255 * f; lb += B(L.c) / 255 * f; }
      const ex = (x >> 2) + 1, ey = (y >> 2) + 1, ei = ey * EMIT_W + ex; lr += EMC[0][ei]; lg += EMC[1][ei]; lb += EMC[2][ei];
      const q = v => Math.min(1.15, Math.floor(v * lev + bayer(x, y)) / lev);
      const kr = lerp(1, q(aR + lr), nt), kg = lerp(1, q(aG + lg), nt), kb = lerp(1, q(aB + lb), nt);
      buf[i] = pack(R(c) * kr, G(c) * kg, B(c) * kb);
    }
  }
  const emitAdd = (sx, sy, c, k) => { const ex = (sx >> 2) + 1, ey = (sy >> 2) + 1; if (ex < 0 || ey < 0 || ex >= EMIT_W || ey >= EMIT_H) return; const i = ey * EMIT_W + ex; EMC[0][i] += R(c) / 255 * k; EMC[1][i] += G(c) / 255 * k; EMC[2][i] += B(c) / 255 * k; };

  let FORCE_VIEW = null;
  function render(t, opt = {}) {
    const s = opt.sample || sampleAt(t), stamps = opt.stamps || TRACK.stamps, view = opt.view || FORCE_VIEW || (Q.get('view')) || stepAt(t).view || 'world';
    let camX = Math.round(s.cx - W / 2), camY = Math.round(s.cy - H / 2);
    camX = clamp(camX, 0, WD.w - W); camY = clamp(camY, 0, WD.h - H);
    // 1 the ground as baked
    for (let y = 0; y < H; y++) buf.set(WD.base.subarray((camY + y) * WD.w + camX, (camY + y) * WD.w + camX + W), y * W);
    P.glow.fill(0); pts = []; for (const E of EMC) E.fill(0);
    // 2 the trail texture for this frame
    rebuild(stamps, t, camX - MG, camY - MG);
    // 3 every material reads it its own way (and animates if it wants: water)
    S.t = OFF.has('still') ? 0 : t;
    const mats = WD.mats;
    for (let y = 0; y < H; y++) { const wy = camY + y, row = wy * WD.w;
      for (let x = 0; x < W; x++) { const wx = camX + x, M = mats[WD.mat[row + wx]]; if (!M.px) continue;
        const ti = (y + MG) * TW + (x + MG), ft = TX.fT[ti], bt = TX.bT[ti], wv = TX.wv[ti];
        if (!M.always && ft === NONE && bt === NONE && wv === 0 && !(M.rim && (TX.fT[ti - TW] !== NONE || TX.fT[ti + TW] !== NONE))) continue;
        S.x = wx; S.y = wy; S.sx = x; S.sy = y; S.ti = ti; S.foot = ft === NONE ? 1e9 : t - ft; S.fs = TX.fS[ti]; S.body = bt === NONE ? 1e9 : t - bt; S.px = TX.bX[ti]; S.py = TX.bY[ti]; S.wave = wv; S.emit = 0; S.glow = 0; S.ed = WD.ed[row + wx];
        const o = y * W + x, c = M.px(buf[o], S);
        if (c != null) buf[o] = c;
        if (S.emit) emitAdd(x, y, S.emitC || hex(M.emitColor || '#8ff'), S.emit); if (S.glow) P.glow[o] = 1; } }
    // light the ground's own glow (step lights) from foot stamps on emitting materials
    if (LOOK.night) for (let k = stamps.length - 1; k >= 0; k--) { const st = stamps[k]; if (st.t > t) continue; const age = t - st.t; if (age > 8) break; if (st.kind !== 'foot') continue;
      const M = mats[WD.id[st.mat]]; if (!M.stepLight) continue; const L = M.stepLight; if (age > L.life) continue; const k2 = L.k * Math.exp(-age / (L.life * .35)) * smooth(0, .08, age);
      emitAdd(Math.round(st.x) - camX, Math.round(st.y) - camY, hex(L.c), k2 * 3); }
    for (const L of WD.lights) pts.push({ x: L.x - camX, y: L.y - camY, r: L.r, c: hex(L.c), k: L.k * (1 + Math.sin((OFF.has('still') ? 0 : t) * 9.7 + L.x) * (L.flicker || 0)) });
    // 4 everything that stands up, y-sorted: blades, litter, props, particles, the walker
    const wy0 = Math.max(0, camY - 2), wy1 = Math.min(WD.h - 1, camY + H + 18);
    const M0 = matAt(s.x, s.y), sink = M0.step && M0.step.sink ? M0.step.sink : 0, wkY = Math.round(s.y);
    const props = WD.props; let pi = 0; while (pi < props.length && props[pi].y < wy0) pi++;
    let walked = false;
    const walkerNow = () => { if (walked || OFF.has('walker')) return; walked = true; drawWalker(P, s, camX, camY, { sink: s.z > 1 ? 0 : sink, line: M0.step && M0.step.line ? hex(M0.step.line) : 0 }); particles(P, stamps, t, camX, camY); };
    for (let wy = wy0; wy <= wy1; wy++) {
      if (!OFF.has('litter')) for (const b of WD.litter[wy]) if (b.x >= camX - 6 && b.x < camX + W + 6) leaf(P, b, camX, camY, t);
      if (!OFF.has('blades')) for (const b of WD.blades[wy]) if (b.x >= camX - 8 && b.x < camX + W + 8) blade(P, b, camX, camY, t);
      while (pi < props.length && props[pi].y <= wy) { const p = props[pi++]; p.draw(P, p.x - camX, p.y - camY, t); }
      if (wy === wkY) walkerNow();
    }
    walkerNow();
    // 5 light, then the memory view and the words
    lightPass(t);
    if (view === 'split') { const half = W >> 1, q = half >> 1;
      // world: the middle half of the frame, moved right; memory: the same middle half, on the left
      const tmp = buf.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < half; x++) buf[y * W + half + x] = tmp[y * W + q + x];
      // the texture view is drawn in the left half with the same world → screen mapping shifted by q
      drawTrailViewShift(0, half, camX + q, camY, t, s, q); P.rect(half - 1, 0, 2, H, hex(LOOK.band)); if (LOOK.labels !== false) { P.text('TRAIL TEXTURE', 5, 5, '#7d86a8'); P.dither(half + 2, 2, 27, 11, hex(LOOK.band), .8); P.text('WORLD', half + 5, 5, '#ffffff'); } }
    else if (view === 'trail') { drawTrailViewShift(0, W, camX, camY, t, s, 0); }
    overlays(t, opt);
    ctx.putImageData(img, 0, 0);
  }
  // the memory view for a screen strip [x0, x1) that shows the world from camX (texture window was built for camX - shift)
  function drawTrailViewShift(x0, x1, camX, camY, t, s, shift) {
    const T = LOOK.trail, bg = hex(T.bg), fc = hex(T.foot), bc = hex(T.body), wc = hex(T.wave), gc = hex(T.grid);
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) { const i = (y + MG) * TW + (x + shift + MG), o = y * W + x;
      let c = ((x + camX) % 16 === 0 || (y + camY) % 16 === 0) ? gc : bg;
      const bt = TX.bT[i]; if (bt !== NONE) { const a = t - bt; if (a < LIFE.body) { const v = 1 - a / LIFE.body; c = mix(bg, bc, Math.ceil(v * 3) / 3); } }
      const w = TX.wv[i]; if (w > .16) c = mix(c, wc, clamp(w * 1.2, .35, 1));
      const ft = TX.fT[i]; if (ft !== NONE) { const a = t - ft, v = clamp(1 - a / 16, .15, 1); c = mix(bg, fc, Math.round(v * 5) / 5 * (TX.fS[i] > 1 ? 1 : .92)); }
      buf[o] = c; }
    const tmp = new Uint32Array(W * H), tp = painter(tmp, W, H); drawWalker(tp, s, camX, camY, { noShadow: true });
    const yc = hex(T.you); for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (tmp[y * W + x]) buf[y * W + x] = yc;
  }
  F.drawWalker = drawWalker;

  // title + captions (pixel font), live hint
  function overlays(t, opt) {
    if (opt.live) { P.rect(0, H - 9, W, 9, hex(LOOK.band)); P.text(opt.hint || 'ARROWS / WASD WALK · CLICK TO WALK THERE · SPACE HOP · V VIEW · ESC FILM', W / 2, H - 7, '#c9c6d6', 1, 'center'); return; }
    const st = stepAt(t), first = STEPS[0];
    if (F.title && !OFF.has('title') && t < first.t1 + 1.6) { const a = Math.min(1, t / .5, (first.t1 + 1.6 - t) / .6); if (a > .05) {
      const k = TT.bigWidth(F.title, 2) <= W - 16 ? 2 : 1, th = 5 * k + (F.sub ? 11 : 0) + 12; P.dither(0, 12, W, th, hex(LOOK.band), .8 * a);
      if (a > .25) { P.big(F.title, W / 2, 18, LOOK.text, k, 'center', LOOK.shadow); if (F.sub) P.text(F.sub, W / 2, 18 + 5 * k + 5, LOOK.text, 1, 'center', LOOK.shadow); } } }
    if (st.caption && !OFF.has('caption')) { let k0 = STEPS.indexOf(st), k1 = k0; while (k0 > 0 && STEPS[k0 - 1].caption === st.caption) k0--; while (k1 < STEPS.length - 1 && STEPS[k1 + 1].caption === st.caption) k1++;
      const a = Math.min(1, (t - STEPS[k0].t0) / .3, (STEPS[k1].t1 - t) / .3); if (a > .25) { const w = TT.bigWidth(st.caption) + 8; P.dither(5, H - 16, w, 11, hex(LOOK.band), .85); P.big(st.caption, 9, H - 13, LOOK.text); } }
  }

  // ---------------- the cast sheet: every facing, the walk both ways, idle, a stepped turn, a hop both ways ----------------
  // sheet and map draw into their own 640×360 page (render them at ×3)
  const SW = 640, SH = 360;
  function sheetPage(draw) { const sb = new Uint32Array(SW * SH), SP = painter(sb, SW, SH); draw(SP, sb); cv.width = SW; cv.height = SH; const im = ctx.createImageData(SW, SH); new Uint32Array(im.data.buffer).set(sb); ctx.putImageData(im, 0, 0); }
  function castSheet() { sheetPage((SP, sb) => {
    const ground = hex(LOOK.sheetGround || '#c9c3b3'), grid = TT.shade(ground, .92), dot = hex('#d0342c'), ink = hex('#3a3632');
    sb.fill(hex('#1a1a22'));
    SP.big((F.title || 'WALKER') + ' · CAST SHEET', 6, 5, '#ffffff');
    SP.text(`MASS ${CH.mass} · SPEED ${CH.speed} PX/S · STEP ${CH.step} PX · ${CH.art.left ? 'OWN LEFT ART' : 'LEFT = MIRRORED RIGHT'}`, SW - 6, 6, '#9a958a', 1, 'right');
    const cw = 40, chh = 48, cell = (col, row, label, s, cam) => { if (!s) return;
      const x0 = 6 + col * (cw + 2), y0 = 18 + row * (chh + 2); SP.rect(x0, y0, cw, chh, ground);
      for (let y = y0 + 2; y < y0 + chh; y += 4) for (let x = x0 + 2; x < x0 + cw; x += 4) SP.px(x, y, grid);
      const ox = x0 + (cw >> 1), oy = y0 + chh - 7;
      drawWalker(SP, s, cam[0] - ox, cam[1] - oy, {});
      for (const f of s.feet) if (f.pl) SP.px(Math.round(f.x) - cam[0] + ox, Math.round(f.y) - cam[1] + oy + 1, dot);
      if (label) SP.text(label, x0 + 2, y0 + 2, ink);
    };
    const run = (route, hold = .4) => simulateRoute(route, hold);
    const pickN = (list, n, from = .3) => { const l = list.slice(Math.floor(list.length * from)), out = []; for (let k = 0; k < n; k++) out.push(l[Math.min(l.length - 1, Math.round(k * Math.min(7, (l.length - 1) / Math.max(1, n - 1))))]); return out; };
    // row 0: standing every way, breathing in / out, a blink, the idle weight shift
    ['down', 'right', 'up', 'left'].forEach((f, k) => { const r = run([{ at: [100, 100], face: f, wait: .5 }], .1); cell(k, 0, f.toUpperCase(), r.samples[r.samples.length - 1], [100, 100]); });
    { const r = run([{ at: [100, 100], face: 'down', wait: 9 }], .1), ss = r.samples, per = 2.6 * Math.sqrt(CH.mass), br = q => Math.sin((q.t * TAU) / per + 1.3);
      cell(5, 0, 'IN', ss.find(q => q.idle > .5 && br(q) > .25), [100, 100]); cell(6, 0, 'OUT', ss.find(q => q.idle > .5 && br(q) < -.5), [100, 100]);
      cell(7, 0, 'BLINK', CH.blink ? ss.find(q => q.idle > .5 && blinkAt(q.t)) : null, [100, 100]);
      [3.2, 5.0, 6.4, 8.2].forEach((tt, k) => cell(9 + k, 0, k ? '' : 'SHIFT', ss[Math.round(tt * HZ)], [100, 100])); }
    // rows 1–3: one stride each way (planted feet red: they never move while planted)
    const walk = (row, col, face, to, n, label) => { const r = run([{ at: [200, 200], face, wait: .3 }, { to }], .1); const ss = r.samples.filter(q => q.mode === 'walk'); pickN(ss, n, .4).forEach((q, k) => cell(col + k, row, k ? '' : label, q, [Math.round(q.x), Math.round(q.y)])); };
    walk(1, 0, 'right', [400, 200], 15, 'WALK R'); walk(2, 0, 'left', [0, 200], 15, 'WALK L');
    walk(3, 0, 'down', [200, 400], 7, 'DOWN'); walk(3, 8, 'up', [200, 0], 7, 'UP');
    // row 4: the start (gather → first step) and the stop (overshoot → settle), then a stepped turn on the spot
    { const r = run([{ at: [200, 200], face: 'right', wait: .3 }, { to: [240, 200] }, { wait: .8 }], .1), ss = r.samples;
      const s0 = ss.findIndex(q => q.mode === 'ant'); [-6, 4, 10, 18].forEach((d, k) => cell(k, 4, k ? '' : 'START', ss[s0 + d], [ss[s0 + d].x | 0, 200]));
      const e0 = ss.findIndex((q, i) => i > s0 + 20 && q.mode === 'idle'); [-10, 0, 8, 30].forEach((d, k) => cell(4 + k, 4, k ? '' : 'STOP', ss[e0 + d], [ss[e0 + d].x | 0, 200])); }
    { const r = run([{ at: [200, 200], face: 'down', wait: .3 }, { wait: .3, face: 'right' }, { wait: .3, face: 'up' }, { wait: .3, face: 'left' }], .1);
      const ss = r.samples.filter(q => q.mode === 'turn'); pickN(ss, 7, 0).forEach((q, k) => cell(8 + k, 4, k ? '' : 'TURN', ss[Math.floor(ss.length * k / 7)], [200, 200])); }
    // row 5: a hop each way — gather, take off, fly, land, recover
    const hop = (col, face, to) => { const r = run([{ at: [200, 200], face, wait: .3 }, { hop: to }], .6), ss = r.samples;
      ['hopAnt', 'hopAnt', 'hopAir', 'hopAir', 'hopLand', 'hopLand', 'idle'].forEach((m, k) => { const l = ss.filter(q => q.mode === m && q.t > .3); const q = l[Math.floor(l.length * [.1, .9, .2, .75, .1, .7, .2][k])]; cell(col + k, 5, k ? '' : 'HOP ' + face[0].toUpperCase(), q, [q ? Math.round(q.x) : 200, 200]); }); };
    hop(0, 'right', [232, 200]); hop(7, 'left', [168, 200]);
    SP.text('RED DOT = A PLANTED FOOT: IT MUST NOT MOVE UNTIL IT LIFTS · FACE, CHEST, HIPS AND TOES POINT ONE WAY · THE NEAR LEG IS DRAWN IN FRONT', 6, SH - 9, '#cfc9bd');
  }); }

  // ---------------- the route map: the whole world, the path coloured by view, step numbers, solid props ----------------
  function routeMap() { sheetPage((SP, sb) => {
    const k = Math.min((SW - 8) / WD.w, (SH - 22) / WD.h), mw = Math.floor(WD.w * k), mh = Math.floor(WD.h * k), ox = (SW - mw) >> 1, oy = 12;
    sb.fill(hex('#111118'));
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) sb[(oy + y) * SW + ox + x] = WD.base[Math.floor(y / k) * WD.w + Math.floor(x / k)];
    for (const s of WD.solids) SP.ell(ox + s.x * k, oy + s.y * k, Math.max(1, s.r * k), Math.max(1, s.r * k), hex('#ff4040'), .7);
    const vc = { world: hex('#ffffff'), split: hex('#ffd23a'), trail: hex('#57d0ff') };
    for (let i = 0; i < TRACK.samples.length; i += 4) { const q = TRACK.samples[i], st = stepAt(q.t); SP.px(ox + q.x * k, oy + q.y * k, vc[st.view] || vc.world); }
    for (const st of TRACK.stamps) if (st.kind === 'foot') SP.px(ox + st.x * k, oy + st.y * k + 1, hex('#000000'));
    for (const st of STEPS) { const q = sampleAt(st.t0); SP.text(String(st.i), ox + q.x * k + 2, oy + q.y * k - 7, '#ffffff', 1, 'left', '#000'); }
    let mins = 1e9; for (const q of TRACK.samples) for (const s of WD.solids) mins = Math.min(mins, Math.hypot(q.x - s.x, q.y - s.y) - s.r);
    const use = {}; for (const s of TRACK.stamps) if (s.kind === 'foot') use[s.mat] = (use[s.mat] || 0) + 1;
    SP.text(`ROUTE MAP · ${DURATION.toFixed(1)} S · ${STEPS.length} STEPS · CLOSEST PROP ${mins === 1e9 ? '-' : mins.toFixed(1)} PX · FOOTPRINTS ` + Object.entries(use).map(([m, c]) => `${m} ${c}`).join(' · '), 4, 3, '#ffffff');
    SP.text('PATH: WHITE WORLD · YELLOW SPLIT · BLUE TRAIL VIEW · RED = SOLID PROPS', SW - 4, SH - 8, '#bbbbbb', 1, 'right');
  }); }

  // ---------------- page contract + live ----------------
  F.start = function () {
    if (!WD || !CH || !ROUTE) throw new Error('call F.world(), F.walker() and F.route() before F.start()');
    LIFE.foot = Math.min(120, Math.max(8, ...WD.mats.filter(m => (m.reads || []).includes('foot')).map(m => m.life || 0)));
    LIFE.body = Math.min(120, Math.max(12, ...WD.mats.filter(m => (m.reads || []).includes('body')).map(m => Math.max(m.life || 0, (m.litter || {}).life || 0, (m.blades || {}).life || 0))));
    LIFE.max = Math.max(LIFE.foot, LIFE.body, LIFE.wake) + 1;
    { const r = TT.rng(F.seed * 13 + 5); BLINKS = []; for (let t = 1 + r() * 2; t < 400; t += 1.6 + r() * 3.4) { BLINKS.push(t); if (r() < .18) BLINKS.push(t + .22); } }
    TRACK = simulateRoute(ROUTE); cameraTrack(TRACK.samples); STEPS = TRACK.steps; DURATION = +TRACK.dur.toFixed(3);
    window.DURATION = DURATION; window.FPS = FPS; window.PIXEL = { W, H, scale: SCALE };
    const matUse = {}; for (const s of TRACK.stamps) if (s.kind === 'foot') matUse[s.mat] = (matUse[s.mat] || 0) + 1;
    window.TRAIL = {
      HZ, samples: TRACK.samples, stamps: TRACK.stamps, steps: STEPS.map(s => ({ i: s.i, t0: s.t0, t1: s.t1, kind: s.kind, view: s.view, caption: s.caption || '' })),
      walker: { mass: CH.mass, speed: CH.speed, step: CH.step, reach: CH.reach, footW: CH.footW, hipH: CH.hipH, ant: CH.ant, hopAnt: CH.hopAnt, hopRec: CH.hopRec, accel: CH.accel, mirrored: !CH.art.left, followers: CH.follow.length },
      world: Object.assign({}, F.worldInfo, { materials: WD.mats.map(m => ({ name: m.name, kind: m.kind || 'custom', life: m.life || 0, sound: (m.step || {}).sound || 'tap', reads: m.reads || [] })) }),
      matUse, matAt: (x, y) => F.matAt(x, y), title: F.title, night: LOOK.night || 0,
      setOff(list) { OFF.clear(); for (const k of list) OFF.add(k); },
      setView(v) { FORCE_VIEW = v || null; },
      walkerBox(t) { const s = sampleAt(t); let camX = clamp(Math.round(s.cx - W / 2), 0, WD.w - W), camY = clamp(Math.round(s.cy - H / 2), 0, WD.h - H); return { x: Math.round(s.x) - camX, y: Math.round(s.y) - camY, camX, camY }; },
      matMask(t) { const s = sampleAt(t); const camX = clamp(Math.round(s.cx - W / 2), 0, WD.w - W), camY = clamp(Math.round(s.cy - H / 2), 0, WD.h - H); const out = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = WD.mat[(camY + y) * WD.w + camX + x]; return Array.from(out); },
    };
    const isSheet = Q.get('sheet') === 'cast', isMap = Q.has('map');
    if (isSheet || isMap) window.PIXEL = { W: SW, H: SH, scale: 3 };
    window.seek = t => { if (isSheet) return castSheet(); if (isMap) return routeMap(); render(clamp(t, 0, DURATION)); };
    document.body.style.cssText = 'margin:0;background:#000;display:grid;place-items:center;height:100vh;overflow:hidden';
    cv.style.imageRendering = 'pixelated'; cv.tabIndex = 0; cv.setAttribute('aria-label', (F.title || 'trail texture world') + ' — a walk across terrains that remember it'); document.body.appendChild(cv);
    const fit = () => { const f = Math.min(innerWidth / W, innerHeight / H), k = f >= 3 ? Math.floor(f) : f; cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px'; };
    fit(); addEventListener('resize', fit);
    const tq = Q.get('t');
    if (RENDER || tq != null || isSheet || isMap) { window.seek(+(tq || 0)); window.__ready = true; return F; }
    // live: the film loops; the first key / click hands the walker to the viewer
    let t0 = performance.now(), mode = 'film', live = null; const keys = {}; const views = ['world', 'split', 'trail'];
    const takeOver = () => { if (mode === 'play') return; const tt = Math.max(0, (performance.now() - t0) / 1000) % DURATION, sm = sampleAt(tt);
      const sim = newSim(sm.x, sm.y, sm.face); mode = 'play'; live = { sim, acc: 0, last: performance.now(), goal: null, hop: null, view: 'world', cx: sm.cx, cy: sm.cy, cvx: 0, cvy: 0 }; };
    const toWorld = e => { const r = cv.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * W, sy = (e.clientY - r.top) / r.height * H; const s = live.sim;
      const camX = clamp(Math.round(live.cx - W / 2), 0, WD.w - W), camY = clamp(Math.round(live.cy - H / 2), 0, WD.h - H); let x = sx, half = W >> 1;
      if (live.view === 'split') x = sx < half ? sx + (W >> 2) : sx - half + (W >> 2); return [x + camX, sy + camY]; };
    cv.addEventListener('pointerdown', e => { if (mode !== 'play') { takeOver(); } live.goal = toWorld(e); cv.focus(); });
    addEventListener('keydown', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (k === 'Escape') { mode = 'film'; live = null; t0 = performance.now(); return; }
      if (mode !== 'play') takeOver();
      if (k === 'v' || k === 'Tab') { e.preventDefault(); live.view = views[(views.indexOf(live.view) + 1) % 3]; return; }
      if (k === ' ') { const s = live.sim, d = DIRS[s.face]; live.hop = [s.x + d[0] * 26, s.y + d[1] * 26]; live.goal = null; return; }
      keys[k] = 1; live.goal = null; });
    addEventListener('keyup', e => { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = 0; });
    if (Q.has('play')) takeOver();
    const loop = now => {
      if (mode === 'film') { const tt = Math.max(0, (now - t0) / 1000) % DURATION; render(Math.floor(tt * FPS) / FPS); }
      else { const dt = Math.max(0, Math.min(.1, (now - live.last) / 1000)); live.last = now; live.acc += dt; const s = live.sim;
        while (live.acc >= 1 / HZ) { live.acc -= 1 / HZ;
          let kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
          if (!kx && !ky && live.goal) { const dx = live.goal[0] - s.x, dy = live.goal[1] - s.y, d = Math.hypot(dx, dy); if (d > 2) { kx = dx / d * clamp(d / 14, .3, 1); ky = dy / d * clamp(d / 14, .3, 1); } else live.goal = null; }
          const m = Math.hypot(kx, ky) || 1, sp = CH.speed * (m > 1 ? 1 / m : 1); let cmd = { vx: kx * sp, vy: ky * sp };
          if (live.hop && s.mode === 'idle' && s.sw < 0) { const hp = [clamp(live.hop[0], 8, WD.w - 8), clamp(live.hop[1], 8, WD.h - 8)]; if (!WD.solids.some(q => Math.hypot(q.x - hp[0], q.y - hp[1]) < q.r + 3)) cmd = { vx: 0, vy: 0, hop: hp }; live.hop = null; }
          else if (live.hop) cmd = { vx: 0, vy: 0 };
          const ox = s.x, oy = s.y; simStep(s, cmd, 1 / HZ);
          if (s.x < 6 || s.y < 10 || s.x > WD.w - 6 || s.y > WD.h - 4 || WD.solids.some(q => Math.hypot(q.x - s.x, q.y - s.y) < q.r)) { s.x = ox; s.y = oy; s.vx *= .2; s.vy *= .2; }
          const w = 3.4, tx = s.x + s.vx * .45, ty = s.y + s.vy * .35 - 6; live.cvx += (w * w * (tx - live.cx) - 2 * w * live.cvx) / HZ; live.cvy += (w * w * (ty - live.cy) - 2 * w * live.cvy) / HZ; live.cx += live.cvx / HZ; live.cy += live.cvy / HZ;
          if (s.stamps.length > 4000) s.stamps.splice(0, 1000); }
        const smp = { t: s.t, x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, face: s.face, dir: s.dir, mode: s.mode, crouch: s.crouch, lean: s.lean, feet: s.feet, sw: s.sw, sp: s.sp, fo: s.fo, idle: s.mode === 'idle' ? s.t - s.idleSince : -1, cx: live.cx, cy: live.cy };
        render(s.t, { sample: smp, stamps: s.stamps, view: live.view, live: true }); }
      requestAnimationFrame(loop);
    };
    window.__ready = true; requestAnimationFrame(loop);
    return F;
  };
  return F;
};
window.TT = TT;
})();
