// engine.js — prompt-sprite-game runtime.
//
// A small pixel game built from data (game.json): a cast of 16×16 sprites (painted from a prompt by Tessera-small in
// the player's browser, or hand-drawn pixel grids in the data), a tile level, a backdrop, a tune and rules.
// Two kinds: "platform" (side view: run, jump, stomp, reach the goal) and "arena" (top-down: collect, dodge, pounce).
//
// Bodies are single-frame sprites, so the motion is in how the whole sprite is carried (references/MOTION.md):
//   - ground movement is a hop gait: the body only travels while it is off the ground, so a planted body never slides;
//   - mass sets timing (contact frames, hop length, squat, landing squash, turn length, lean spring);
//   - a jump / pounce gathers (squat, feet planted) before it leaves and squashes + settles after it lands;
//   - the top of the sprite lags the base (a sheared lean on a spring: follow-through and overshoot);
//   - a turn is stepped: the body stays planted and narrows through the flip with a one-pixel hop;
//   - every idle breathes (1 px height on an irregular period) and shifts its weight now and then.
// Everything steps at a fixed 60 Hz from a seeded RNG, so a run is a pure function of (data, seed, inputs).

import { spriteFor, allCached, cachedSprite, paint, loadTessera, webgpuLikely, tesseraWasLoaded, TESSERA_CREDIT } from './tessera-link.js';

export const TILE = 16;
const DT = 1 / 60;

// ---------------------------------------------------------------- utilities
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const hexRGB = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---------------------------------------------------------------- 3×5 pixel font (HUD, cast sheet labels)
const FONT = (() => {
  const src = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', ':': '000010000010000', '/': '001001010100100', '-': '000000111000000', '.': '000000000000010',
    '×': '000101010101000', '+': '000010111010000', '!': '010010010000010', '?': '110001010000010', ' ': '000000000000000',
    '·': '000000010000000', '<': '001010100010001', '>': '100010001010100', '%': '101001010100101', '(': '010100100100010', ')': '010001001001010',
  };
  const out = {};
  for (const k in src) out[k] = src[k].split('').map(Number);
  return out;
})();
export function text(ctx, str, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    const g = FONT[ch] || FONT['?'];
    for (let i = 0; i < 15; i++) if (g[i]) ctx.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    cx += 4 * scale;
  }
  return cx - x;
}
export const textWidth = (str, scale = 1) => String(str).length * 4 * scale - scale;

// ---------------------------------------------------------------- sprites
/** A 16×16 sprite from RGBA bytes: canvas, opaque bounds, foot row. */
export function makeSprite(rgba, source) {
  const c = mkCanvas(16, 16);
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 16, 16), 0, 0);
  let x0 = 16, y0 = 16, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rgba[(y * 16 + x) * 4 + 3] > 40) {
    n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (!n) { x0 = 0; y0 = 0; x1 = 15; y1 = 15; }
  // per-row opaque extents (used to draw a sheared lean without resampling)
  return { canvas: c, rgba, source, opaque: n, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1 + 1) / 2 };
}

/** Parse a hand-drawn grid: 16 strings of 16 characters, '.' = transparent, others keyed in colors. */
export function handRGBA(member, globalColors = {}) {
  const colors = { ...globalColors, ...(member.colors || {}) };
  const rows = member.pixels || [];
  const rgba = new Uint8ClampedArray(16 * 16 * 4);
  const problems = [];
  if (rows.length !== 16) problems.push(`pixels: ${rows.length} rows (needs 16)`);
  for (let y = 0; y < 16; y++) {
    const row = rows[y] || '';
    if (row.length !== 16) problems.push(`pixels row ${y}: ${row.length} chars (needs 16)`);
    for (let x = 0; x < 16; x++) {
      const ch = row[x] || '.';
      if (ch === '.' || ch === ' ') continue;
      const hex = colors[ch];
      if (!hex) { problems.push(`pixels row ${y}: colour '${ch}' is not defined`); continue; }
      const [r, g, b] = hexRGB(hex);
      rgba.set([r, g, b, 255], (y * 16 + x) * 4);
    }
  }
  return { rgba, problems: [...new Set(problems)] };
}

// ---------------------------------------------------------------- mass → timing (one place, so check.mjs can read it)
export function timing(m = 1) {
  m = clamp(m, 0.4, 4);
  const r = Math.sqrt(m);
  return {
    contact: Math.round(1 + r * 1.4),          // frames planted between hops
    hop: Math.round(7 + r * 3),                // frames in the air per hop
    hopH: Math.max(1, Math.round(4 / r)),      // px of hop height
    squat: Math.round(2 + r * 2),              // jump / pounce anticipation frames (feet planted)
    recover: Math.round(4 + r * 4),            // landing recovery frames (squash settling)
    turn: Math.round(3 + r * 3),               // stepped turn frames
    landSquash: 0.12 + 0.1 * r,                // how flat a landing goes
    lag: 0.09 / r, leanK: 0.2 / r, leanD: 0.32,  // follow-through: lag of the top, spring that carries it
    accel: 1 / r,                              // first hops are shorter for heavy bodies
    breath: 1.7 + 0.5 * r,                     // seconds per breath (irregular around this)
    qK: 0.22 / r, qD: 0.24 / Math.sqrt(r),     // squash spring: heavy bodies sink deeper and settle slower
  };
}

// ---------------------------------------------------------------- the carried body (shared by every actor)
class Body {
  constructor(member, rand) {
    this.m = member.mass ?? 1;
    this.T = timing(this.m);
    this.gait = member.gait || 'hop';            // 'hop' | 'glide' | 'still'
    this.faces = member.faces || 'front';        // which way the drawing faces: 'right' | 'left' | 'front'
    this.facing = 1;                             // which way the actor faces in the world
    this.shown = 1;                              // drawn horizontal scale sign through a turn
    this.turnT = 0;                              // frames left in a turn
    this.phase = 'rest';                         // rest | contact | hop | squat | air | land | turn
    this.pt = 0;                                 // frames in phase
    this.hopY = 0;                               // visual hop height (px, up)
    this.q = 0; this.qv = 0;                     // squash spring (−: flatter, +: taller)
    this.lean = 0; this.leanV = 0; this.vLag = 0; // top offset spring (px at the top row)
    this.breathPh = rand() * 6.28; this.breathRate = 6.28 / (this.T.breath * 60);
    this.shift = 0; this.shiftT = 120 + Math.floor(rand() * 200); this.shiftTo = 0;
    this.idleFrames = 0;
    this.rand = rand;
    this.hops = 0;                               // hops since the start of a move (heavy bodies ramp up)
    this.flat = 0;                               // stomped / stunned flattening 0..1
  }
  /** called every frame with the base acceleration (px/frame²) so the top can lag it */
  carry(v, idle) {
    // follow-through: the top of the sprite follows the base's mean velocity with a lag (heavier = later),
    // so it leans back when the body sets off and swings forward past upright when it stops, then settles.
    this.vLag += (v - this.vLag) * this.T.lag;
    const target = clamp((this.vLag - v) * 1.4, -2.2, 2.2);
    this.leanV += (target - this.lean) * this.T.leanK - this.T.leanD * this.leanV;
    this.lean += this.leanV;
    this.lean = clamp(this.lean, -3, 3);
    // squash spring
    this.qv += -this.T.qK * this.q - this.T.qD * this.qv;
    this.q += this.qv;
    this.q = clamp(this.q, -0.5, 0.45);
    // breathing on an irregular period
    this.breathPh += this.breathRate * (1 + 0.35 * Math.sin(this.breathPh * 0.37 + 1.3));
    if (idle) {
      this.idleFrames++;
      if (--this.shiftT <= 0) { this.shiftTo = this.shiftTo ? 0 : (this.rand() < 0.5 ? -1 : 1); this.shiftT = 90 + Math.floor(this.rand() * 240); }
    } else { this.idleFrames = 0; this.shiftTo = 0; }
    this.shift += (this.shiftTo - this.shift) * 0.08;
    if (this.turnT > 0) {
      this.turnT--;
      const k = 1 - this.turnT / this.T.turn;              // 0 → 1 through the turn
      this.shown = k < 0.5 ? -this.facing * (1 - k * 2) : this.facing * (k * 2 - 1);
      this.hopY = Math.round(Math.sin(k * Math.PI) * 1);  // the step of the turn
    } else this.shown = this.facing;
  }
  /** begin a stepped turn toward dir */
  turnTo(dir) {
    if (!dir || dir === this.facing) return false;
    this.facing = dir;
    if (this.faces === 'front') { this.lean += dir * 1.5; return false; }  // a front-facing drawing turns by weight only
    this.turnT = this.T.turn;
    return true;
  }
  get turning() { return this.turnT > 0; }
  /** drawn transform, integer pixels: width/height scales, shear at the top row, extra lift */
  pose() {
    // a breath is at least one drawn pixel of height, whatever the sprite's size
    const breathe = this.gait === 'still' ? 0 : Math.sin(this.breathPh) * Math.max(0.035, 0.9 / (this.pxH || 16));
    const sy = (1 + this.q + breathe) * (1 - this.flat * 0.7);
    const sx = (1 - this.q * 0.6 - breathe * 0.4) * (1 + this.flat * 0.35);
    const mirror = this.faces === 'left' ? -1 : 1;
    const flip = this.faces === 'front' ? 1 : this.shown * mirror;
    const bob = this.gait === 'glide' ? Math.round(1.5 + Math.sin(this.breathPh * 1.4) * 1.5) : 0; // a flyer is never still
    return { sx, sy, flip, lean: this.lean + this.shift, lift: this.hopY + bob };
  }
}

// draw a sprite with its foot row at (fx, fy): bottom-anchored squash, horizontal flip, sheared lean
export function drawSprite(ctx, spr, fx, fy, pose, alpha = 1) {
  const { sx, sy, flip, lean, lift } = pose;
  const h = Math.max(1, Math.round(spr.h * sy));
  const w = Math.max(2, Math.round(spr.w * Math.abs(flip) * sx)); // edge-on mid-turn is still a sliver of body
  ctx.globalAlpha = alpha;
  const left = Math.round(fx - w / 2);
  const bottom = Math.round(fy - lift);
  for (let r = 0; r < h; r++) {
    const srcRow = spr.y0 + Math.min(spr.h - 1, Math.floor((r / h) * spr.h));
    const fromBottom = h - 1 - r;
    const off = Math.round(lean * (fromBottom / Math.max(1, h - 1)));
    const y = bottom - h + r;
    if (flip >= 0) ctx.drawImage(spr.canvas, spr.x0, srcRow, spr.w, 1, left + off, y, w, 1);
    else {
      ctx.save(); ctx.translate(left + off + w, y); ctx.scale(-1, 1);
      ctx.drawImage(spr.canvas, spr.x0, srcRow, spr.w, 1, 0, 0, w, 1); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- tiles
const SOLID_LOOKS = new Set(['brick', 'stone', 'grass', 'dirt', 'plank', 'sand', 'ice', 'rock', 'hedge', 'snow', 'metal']);
function tileArt(look, colors, seed, exposed) {
  const c = mkCanvas(TILE, TILE), x = c.getContext('2d');
  const [base, dark, light] = [colors[0], colors[1] || mix(colors[0], '#000000', 0.35), colors[2] || mix(colors[0], '#ffffff', 0.3)];
  const r = rng(seed);
  const px = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
  x.fillStyle = base; x.fillRect(0, 0, TILE, TILE);
  const speckle = (n, col) => { for (let k = 0; k < n; k++) px(Math.floor(r() * 16), Math.floor(r() * 16), col); };
  switch (look) {
    case 'brick': {
      x.fillStyle = dark;
      for (let j = 0; j < 16; j += 4) { x.fillRect(0, j + 3, 16, 1); const o = (j / 4) % 2 ? 0 : 8; x.fillRect(o, j, 1, 3); x.fillRect((o + 8) % 16 === 0 ? 15 : o + 8, j, 1, 3); }
      speckle(6, light); break;
    }
    case 'rock': {
      speckle(14, dark); speckle(8, light);
      for (let k = 0; k < 2; k++) { let cx = Math.floor(r() * 16), cy = Math.floor(r() * 10); for (let n = 0; n < 5; n++) { px(cx, cy, dark); cx += r() < 0.5 ? 1 : 0; cy++; } }
      break;
    }
    case 'stone': {
      speckle(18, dark); speckle(10, light);
      x.fillStyle = dark; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
      x.fillStyle = light; x.fillRect(0, 0, 15, 1); break;
    }
    case 'plank': case 'wood': {
      x.fillStyle = dark; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(5, 0, 1, 7); x.fillRect(11, 8, 1, 7);
      x.fillStyle = light; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1); speckle(4, dark); break;
    }
    case 'pond': { // seamless open water (solid in an arena: you walk round it)
      for (let k = 0; k < 4; k++) { const wx = Math.floor(r() * 12), wy = 2 + Math.floor(r() * 12); x.fillStyle = light; x.fillRect(wx, wy, 3 + Math.floor(r() * 2), 1); }
      speckle(5, dark); break;
    }
    case 'stump': { // a cut tree trunk seen from above: rings on a round top, the floor shows round it
      x.clearRect(0, 0, 16, 16);
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        const d = Math.hypot(i - 7.5, j - 7.5);
        if (d > 7.4) continue;
        x.fillStyle = d > 6.3 ? dark : (Math.floor(d) % 2 ? base : light); x.fillRect(i, j, 1, 1);
      }
      x.fillStyle = dark; x.fillRect(7, 7, 2, 2); break;
    }
    case 'ice': { speckle(6, light); x.fillStyle = light; for (let i = 0; i < 6; i++) px(3 + i, 9 - i, light); x.fillRect(0, 0, 16, 1); break; }
    case 'metal': { x.fillStyle = dark; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16); px(2, 2, light); px(13, 2, light); px(2, 13, light); px(13, 13, light); x.fillStyle = light; x.fillRect(0, 0, 15, 1); break; }
    case 'hedge': { speckle(40, dark); speckle(24, light); break; }
    case 'cloud': { x.clearRect(0, 0, 16, 16); x.fillStyle = base; x.fillRect(0, 2, 16, 6); x.fillRect(2, 0, 12, 9); x.fillStyle = light; x.fillRect(2, 0, 12, 2); x.fillStyle = dark; x.fillRect(0, 8, 16, 1); break; }
    case 'spikes': {
      x.clearRect(0, 0, 16, 16);
      for (let k = 0; k < 4; k++) for (let j = 0; j < 7; j++) {
        const w = Math.max(1, Math.round((j + 1) / 1.5));
        x.fillStyle = j === 0 ? light : j < 4 ? base : dark;
        x.fillRect(k * 4 + 2 - Math.floor(w / 2), 9 + j, w, 1);
      }
      break;
    }
    case 'water': case 'lava': { x.fillStyle = dark; x.fillRect(0, 10, 16, 6); x.fillStyle = light; x.fillRect(0, 4, 16, 1); x.clearRect(0, 0, 16, 4); speckle(4, light); x.clearRect(0, 0, 16, 4); break; }
    default: speckle(16, dark); speckle(8, light);
  }
  if (exposed && ['grass', 'snow', 'sand', 'hedge'].includes(look)) {
    const cap = look === 'grass' ? colors[3] || '#5fbf4a' : look === 'snow' ? '#f4f8ff' : light;
    const capD = mix(cap, '#000000', 0.3);
    x.fillStyle = cap; x.fillRect(0, 0, 16, 3);
    for (let i = 0; i < 16; i++) if (r() < 0.5) px(i, 3, cap); else px(i, 3, capD);
    for (let i = 0; i < 16; i++) if (r() < 0.25) px(i, 0, mix(cap, '#ffffff', 0.35));
  } else if (exposed && SOLID_LOOKS.has(look)) { x.fillStyle = light; x.fillRect(0, 0, 16, 1); }
  return c;
}

// an arena's ground: the floor look plus small decor scattered per tile (flowers, tufts, pebbles), from the topic
function floorArt(f, seed) {
  const c = tileArt(f.look || 'grass', f.colors || ['#4a8a3a'], seed, false), x = c.getContext('2d'), r = rng(seed ^ 0x9e37);
  for (const d of f.decor || []) {
    if (r() > (d.density ?? 0.3)) continue;
    const px = 2 + Math.floor(r() * 11), py = 2 + Math.floor(r() * 11), col = d.color || '#ffffff', dark = d.dark || mix(col, '#000000', 0.35);
    x.fillStyle = col;
    if (d.kind === 'flower') { x.fillRect(px, py - 1, 1, 1); x.fillRect(px - 1, py, 3, 1); x.fillRect(px, py + 1, 1, 1); x.fillStyle = d.center || '#ffe060'; x.fillRect(px, py, 1, 1); }
    else if (d.kind === 'tuft') { x.fillRect(px, py, 1, 2); x.fillRect(px - 1, py + 1, 1, 1); x.fillRect(px + 1, py - 1, 1, 3); x.fillStyle = dark; x.fillRect(px - 1, py + 2, 3, 1); }
    else if (d.kind === 'pebble') { x.fillRect(px, py, 2, 1); x.fillStyle = dark; x.fillRect(px, py + 1, 2, 1); }
    else if (d.kind === 'patch') { for (let n = 0; n < 9; n++) x.fillRect(px - 2 + Math.floor(r() * 5), py - 2 + Math.floor(r() * 5), 1, 1); }
  }
  return c;
}

// ---------------------------------------------------------------- backdrop
function drawBackdrop(ctx, layers, W, H, camX, camY, t, seed) {
  for (const L of layers) {
    const sc = L.scroll ?? 0;
    const ox = -camX * sc, oy = -camY * sc * 0.5;
    const r = rng((seed ^ (L.seed || 0) ^ hashStr(L.kind)) >>> 0);
    switch (L.kind) {
      case 'gradient': {
        const cols = L.colors; const bands = (cols.length - 1) * 8;
        for (let y = 0; y < H; y++) {
          const f = (y / H) * (cols.length - 1); const i = Math.min(cols.length - 2, Math.floor(f)); const k = f - i;
          for (let xq = 0; xq < 4; xq++) { // dithered between two neighbours
            const th = BAYER[(y % 4) * 4 + xq] / 16;
            ctx.fillStyle = k > th ? cols[i + 1] : cols[i];
            for (let x = xq; x < W; x += 4) ctx.fillRect(x, y, 1, 1);
          }
        }
        void bands; break;
      }
      case 'stars': {
        const n = L.count || 60;
        for (let i = 0; i < n; i++) {
          const x = Math.floor(((r() * W * 2 + ox) % (W * 2) + W * 2) % (W * 2)) - W * 0.0; const y = Math.floor(r() * (L.bottom || H * 0.6));
          const tw = Math.sin(t * (1 + r() * 2) + i) > 0.6;
          if (x < W) { ctx.fillStyle = tw ? (L.color2 || '#ffffff') : (L.color || '#c8c8ff'); ctx.fillRect(x, y, 1, 1); }
        }
        break;
      }
      case 'moon': case 'sun': {
        const cx = Math.round((L.x ?? W * 0.8) + ox), cy = Math.round((L.y ?? H * 0.2) + oy), R = L.r || 10;
        for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
          const d = x * x + y * y; if (d > R * R) continue;
          ctx.fillStyle = d > (R - 2) * (R - 2) ? L.rim || mix(L.color, '#000000', 0.15) : L.color; ctx.fillRect(cx + x, cy + y, 1, 1);
        }
        if (L.kind === 'moon') for (let k = 0; k < 3; k++) { ctx.fillStyle = mix(L.color, '#000000', 0.12); ctx.fillRect(cx - 4 + k * 4, cy - 2 + (k % 2) * 4, 2, 2); }
        break;
      }
      case 'hills': case 'mountains': case 'waves': case 'dunes': {
        const base = L.y ?? H * 0.7, amp = L.amp ?? 12, per = L.period ?? 80;
        const sharp = L.kind === 'mountains';
        for (let x = 0; x < W; x++) {
          const wx = x - ox;
          let h;
          if (sharp) { const p = ((wx / per) % 1 + 1) % 1; const k = Math.floor(wx / per); const rr = rng(k * 7919 + 13); h = (1 - Math.abs(p * 2 - 1)) * amp * (0.6 + rr() * 0.6); }
          else if (L.kind === 'waves') h = Math.sin(wx / per * 6.28 + t * (L.speed ?? 1.2)) * amp * 0.5 + amp * 0.5;
          else h = (Math.sin(wx / per * 6.28) * 0.6 + Math.sin(wx / per * 2.3 + 1.7) * 0.4) * amp * 0.5 + amp * 0.5;
          const top = Math.round(base - h + oy);
          ctx.fillStyle = L.color; ctx.fillRect(x, top, 1, H - top);
          if (L.rim) { ctx.fillStyle = L.rim; ctx.fillRect(x, top, 1, 1); }
        }
        break;
      }
      case 'city': case 'trees': {
        const base = Math.round((L.y ?? H * 0.75) + oy);
        const span = W * 3; let x = 0;
        const rr = rng(hashStr(L.kind) + (L.seed || 0));
        while (x < span) {
          const w = L.kind === 'city' ? 10 + Math.floor(rr() * 18) : 7 + Math.floor(rr() * 8);
          const h = L.kind === 'city' ? 14 + Math.floor(rr() * (L.amp || 40)) : 10 + Math.floor(rr() * (L.amp || 18));
          const sx = Math.round(((x + ox) % span + span) % span) - 20;
          if (sx < W + 20) {
            ctx.fillStyle = L.color;
            if (L.kind === 'city') {
              ctx.fillRect(sx, base - h, w, H - base + h);
              if (L.lit) for (let wy = base - h + 3; wy < base - 2; wy += 4) for (let wx = sx + 2; wx < sx + w - 2; wx += 3) if (rr() < 0.3) { ctx.fillStyle = L.lit; ctx.fillRect(wx, wy, 1, 2); ctx.fillStyle = L.color; }
            } else {
              for (let j = 0; j < h; j++) { const ww = Math.max(1, Math.round(w * (j / h))); ctx.fillRect(sx + Math.round((w - ww) / 2), base - h + j, ww, 1); }
              ctx.fillRect(sx + Math.floor(w / 2), base, 1, 3);
            }
          }
          x += w + Math.floor(rr() * (L.gap ?? 6));
        }
        ctx.fillStyle = L.color; ctx.fillRect(0, base + 2, W, H - base);
        break;
      }
      case 'clouds': {
        const n = L.count || 6;
        for (let i = 0; i < n; i++) {
          const w = 18 + Math.floor(r() * 26), y = Math.floor(r() * (L.bottom || H * 0.45));
          const span = W + 60; const x = Math.round((((r() * span + ox + t * (L.drift ?? 2)) % span) + span) % span) - 40;
          ctx.fillStyle = L.color; ctx.fillRect(x, y, w, 4); ctx.fillRect(x + 4, y - 3, w - 10, 3);
          if (L.rim) { ctx.fillStyle = L.rim; ctx.fillRect(x + 4, y - 3, w - 10, 1); }
        }
        break;
      }
      case 'fill': { ctx.fillStyle = L.color; ctx.fillRect(0, Math.round((L.y ?? 0) + oy), W, H); break; }
    }
  }
}
function hashStr(s = '') { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// ---------------------------------------------------------------- sound (WebAudio, code-made)
class Sound {
  constructor(tune) { this.tune = tune; this.on = true; this.ctx = null; }
  wake() {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try { this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.gain.value = 0.18; this.master.connect(this.ctx.destination); this.startTune(); } catch { this.ctx = null; }
  }
  tone(f0, f1, dur, wave = 'square', vol = 0.6, when = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.4, hp = 400) {
    if (!this.ctx || !this.on) return;
    const n = Math.floor(this.ctx.sampleRate * dur), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(this.master); s.start();
  }
  play(name, m = 1) {
    const p = 1 / Math.sqrt(m);
    switch (name) {
      case 'squat': this.tone(160 * p, 120 * p, 0.06, 'triangle', 0.3); break;
      case 'jump': this.tone(300 * p, 720 * p, 0.14, 'square', 0.35); break;
      case 'land': this.noise(0.07 + 0.03 * m, 0.25 * m, 200); this.tone(110 * p, 60 * p, 0.08, 'triangle', 0.4); break;
      case 'hop': this.tone(520 * p, 640 * p, 0.03, 'triangle', 0.08); break;
      case 'pick': this.tone(880, 880, 0.06, 'square', 0.3); this.tone(1320, 1320, 0.1, 'square', 0.3, 0.06); break;
      case 'stomp': this.noise(0.12, 0.5, 300); this.tone(220, 90, 0.16, 'square', 0.4); break;
      case 'hurt': this.tone(440, 110, 0.3, 'sawtooth', 0.35); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.16, 'square', 0.3, i * 0.11)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.98, 0.22, 'triangle', 0.4, i * 0.16)); break;
      case 'pounce': this.tone(200 * p, 500 * p, 0.12, 'sawtooth', 0.25); break;
    }
  }
  startTune() {
    const T = this.tune; if (!T || !this.ctx) return;
    const note = (n) => { if (!n || n === '.' || n === '-') return 0; const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 0; const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (k - 9) / 12 + (Number(m[3]) - 4)); };
    const tracks = ['lead', 'bass', 'arp'].filter((k) => T[k]).map((k) => ({ k, notes: T[k].trim().split(/\s+/), wave: (T.waves || {})[k] || (k === 'bass' ? 'triangle' : 'square'), vol: (T.vols || {})[k] ?? (k === 'lead' ? 0.12 : k === 'bass' ? 0.2 : 0.06) }));
    const step = 60 / (T.bpm || 110) / 2; let i = 0;
    const tick = () => {
      if (this.on) for (const tr of tracks) { const f = note(tr.notes[i % tr.notes.length]); if (f) this.tone(f, f, step * 0.9, tr.wave, tr.vol); }
      i++;
    };
    this.tuneTimer = setInterval(tick, step * 1000);
  }
}

// ---------------------------------------------------------------- the world
export class Game {
  constructor(data, sprites, { seed = 1, sound } = {}) {
    this.data = data; this.sprites = sprites; this.seed = seed; this.sound = sound;
    this.W = data.view?.w || 320; this.H = data.view?.h || 192;
    this.kind = data.kind || 'platform';
    this.physics = { gravity: 0.32, jump: 5.6, speed: 1.6, airAccel: 0.18, maxFall: 6, pounce: 3.2, ...(data.physics || {}) };
    this.reset();
  }
  member(k) { return this.data.cast[k]; }
  reset(level = this.data.level) {
    const d = this.data;
    this.rand = rng(this.seed);
    this.t = 0; this.frame = 0; this.state = 'play'; this.shake = 0; this.particles = []; this.events = [];
    this.lives = d.rules?.lives ?? 3; this.timeLeft = (d.rules?.time ?? 0) * 60;
    this.rows = level.map((r) => r.split(''));
    this.mapW = Math.max(...this.rows.map((r) => r.length)); this.mapH = this.rows.length;
    this.legend = d.legend || {};
    this.actors = []; this.items = []; this.goal = null; this.player = null;
    for (let j = 0; j < this.mapH; j++) for (let i = 0; i < this.mapW; i++) {
      const ch = this.rows[j][i] || ' ';
      const key = this.legend[ch];
      if (!key) continue;
      this.rows[j][i] = '.';
      const mem = this.member(key);
      if (!mem) continue;
      const x = i * TILE + TILE / 2, y = (j + 1) * TILE; // foot point
      const a = this.spawn(key, x, y);
      a.grounded = this.kind === 'arena' || this.groundBelow(a);
      if (mem.role === 'player') this.player = a, this.start = { x, y };
      else if (mem.role === 'item') this.items.push(a);
      else if (mem.role === 'goal') this.goal = a;
      else this.actors.push(a);
    }
    this.need = d.rules?.need ?? this.items.length;
    this.got = 0;
    this.tileCache = new Map();
    this.cam = { x: 0, y: 0 };
    if (this.player) this.snapCam();
  }
  spawn(key, x, y) {
    const mem = this.member(key);
    const body = new Body(mem, rng(hashStr(key) ^ Math.floor(x * 31 + y)));
    body.pxH = this.sprites[key]?.h || 16;
    const bw = mem.body?.[0] ?? (mem.role === 'item' ? 10 : 12), bh = mem.body?.[1] ?? (mem.role === 'item' ? 10 : 13);
    const a = { key, mem, body, x, y, vx: 0, vy: 0, w: bw, h: bh, grounded: false, alive: true, dir: 0, dirY: 0, hurtT: 0, coyote: 0, buffer: 0,
      planted: true, z: 0, vz: 0, stunT: 0, spawnX: x, spawnY: y, plan: { want: 0, wantY: 0 }, popT: 0, think: 0 };
    if (mem.role === 'enemy') { a.dir = mem.startDir ?? -1; a.body.facing = a.dir; }
    if (this.kind === 'arena' && mem.gait === 'glide') a.z = 6;
    return a;
  }
  // ---- tiles
  tileAt(i, j) {
    if (j < 0) return this.kind === 'arena' ? '#' : '.';
    if (i < 0 || i >= this.mapW) return '#';
    if (j >= this.mapH) return '.';
    return this.rows[j][i] || '.';
  }
  tileDef(ch) { return (this.data.tiles || {})[ch]; }
  solidAt(i, j) { const d = this.tileDef(this.tileAt(i, j)); return !!d && !d.hazard && !d.oneway && d.solid !== false; }
  onewayAt(i, j) { const d = this.tileDef(this.tileAt(i, j)); return !!d && d.oneway; }
  hazardAt(i, j) { const d = this.tileDef(this.tileAt(i, j)); return !!d && d.hazard; }
  boxHits(x0, y0, x1, y1, fn) {
    for (let j = Math.floor(y0 / TILE); j <= Math.floor((y1 - 0.001) / TILE); j++)
      for (let i = Math.floor(x0 / TILE); i <= Math.floor((x1 - 0.001) / TILE); i++) if (fn(i, j)) return true;
    return false;
  }
  // ---- movement with tile collision (foot point x,y; box w×h above the foot)
  moveX(a, dx) {
    if (!dx) return false;
    const nx = a.x + dx;
    const x0 = nx - a.w / 2, x1 = nx + a.w / 2, y0 = a.y - a.h, y1 = a.y;
    const top = this.kind === 'arena' ? a.y - a.h * 0.5 : y0;
    if (this.boxHits(x0, top, x1, y1, (i, j) => this.solidAt(i, j))) {
      a.x = dx > 0 ? Math.floor(x1 / TILE) * TILE - a.w / 2 - 0.001 : Math.ceil(x0 / TILE) * TILE + a.w / 2 + 0.001;
      return true;
    }
    a.x = nx; return false;
  }
  moveY(a, dy) {
    if (!dy) return false;
    const ny = a.y + dy;
    const x0 = a.x - a.w / 2, x1 = a.x + a.w / 2;
    if (this.kind === 'arena') {
      const y0 = ny - a.h * 0.5;
      if (this.boxHits(x0, y0, x1, ny, (i, j) => this.solidAt(i, j))) {
        a.y = dy > 0 ? Math.floor(ny / TILE) * TILE - 0.001 : Math.ceil(y0 / TILE) * TILE + a.h * 0.5 + 0.001;
        return true;
      }
      a.y = ny; return false;
    }
    if (dy > 0) {
      const j = Math.floor(ny / TILE), was = Math.floor((a.y - 0.001) / TILE);
      for (let i = Math.floor(x0 / TILE); i <= Math.floor((x1 - 0.001) / TILE); i++) {
        if (this.solidAt(i, j) || (this.onewayAt(i, j) && was < j && !a.dropT)) { a.y = j * TILE; return true; }
      }
      a.y = ny; return false;
    }
    const y0 = ny - a.h;
    if (this.boxHits(x0, y0, x1, y0 + 1, (i, j) => this.solidAt(i, j))) { a.y = (Math.floor(y0 / TILE) + 1) * TILE + a.h; return true; }
    a.y = ny; return false;
  }
  groundBelow(a) {
    const j = Math.floor((a.y + 0.5) / TILE), x0 = a.x - a.w / 2, x1 = a.x + a.w / 2;
    if (Math.abs(a.y - j * TILE) > 0.6) return false;
    for (let i = Math.floor(x0 / TILE); i <= Math.floor((x1 - 0.001) / TILE); i++) if (this.solidAt(i, j) || this.onewayAt(i, j)) return true;
    return false;
  }

  // ---- the hop gait: decide one frame of ground travel for actor a wanting to go (wx, wy) at speed s
  gait(a, wx, wy, s) {
    const B = a.body, T = B.T;
    const want = wx || wy;
    if (B.gait === 'glide') {
      const tx = wx * s, ty = wy * s, k = 0.06 / Math.sqrt(B.m);
      a.vx += (tx - a.vx) * k; a.vy += (ty - a.vy) * k;
      B.phase = want ? 'glide' : 'rest'; a.planted = false;
      if (wx) B.turnTo(sign(wx));
      return { dx: a.vx, dy: this.kind === 'arena' ? a.vy : 0, v: a.vx };
    }
    // a stepped turn holds the body in place
    if (wx && sign(wx) !== B.facing && (B.phase === 'rest' || B.phase === 'contact')) {
      if (B.turnTo(sign(wx))) { B.phase = 'turn'; a.planted = true; return { dx: 0, dy: 0, v: 0 }; }
    }
    if (B.phase === 'turn') { if (B.turning) { a.planted = true; return { dx: 0, dy: 0, v: 0 }; } B.phase = 'contact'; B.pt = 0; }
    if (B.phase === 'rest') { if (!want) { a.planted = true; B.hopY = 0; return { dx: 0, dy: 0, v: 0 }; } B.phase = 'contact'; B.pt = 0; B.hops = 0; }
    if (B.phase === 'land') { B.pt++; a.planted = true; B.hopY = 0; if (B.pt >= (want ? T.contact + 1 : T.recover)) { B.phase = want ? 'contact' : 'rest'; B.pt = 0; } return { dx: 0, dy: 0, v: 0 }; }
    if (B.phase === 'contact') {
      B.pt++; a.planted = true; B.hopY = 0;
      const need = B.hops === 0 ? T.contact + Math.round(T.squat / 2) : T.contact; // the first push gathers a little more
      if (B.pt < need) return { dx: 0, dy: 0, v: want && B.hops ? B.meanV : 0 };
      if (!want) { B.phase = 'rest'; return { dx: 0, dy: 0, v: 0 }; }
      B.phase = 'hop'; B.pt = 0; B.hopDir = [sign(wx) || 0, sign(wy) || 0]; B.qv += 0.05;
      const ramp = Math.min(1, 0.45 + B.hops * 0.3 * T.accel);
      B.hopV = s * ramp * (T.hop + T.contact) / T.hop; B.hops++;
      B.meanV = (sign(wx) || 0) * s * ramp;
      if (this.sound && a === this.player) this.sound.play('hop', B.m);
    }
    if (B.phase === 'hop') {
      // travel only in the air, eased: fastest at the top of the hop, zero at take-off and touch-down
      B.pt++; a.planted = false;
      const k = B.pt / T.hop;
      B.hopY = Math.round(Math.sin(Math.PI * Math.min(1, k)) * T.hopH);
      let [hx, hy] = B.hopDir;
      if (hx && hy) { hx *= 0.7071; hy *= 0.7071; }
      const v = B.hopV * (Math.PI / 2) * Math.sin(Math.PI * (B.pt - 0.5) / T.hop);
      const prev = a.vx;
      a.vx = hx * v; if (this.kind === 'arena') a.vy = hy * v;
      const out = { dx: hx * v, dy: this.kind === 'arena' ? hy * v : 0, v: B.meanV };
      void prev;
      if (B.pt >= T.hop) { B.phase = 'contact'; B.pt = 0; B.hopY = 0; B.qv -= 0.06 * Math.sqrt(B.m); a.vx = 0; if (this.kind === 'arena') a.vy = 0; }
      return out;
    }
    a.planted = true; return { dx: 0, dy: 0, v: 0 };
  }

  // ---------------------------------------------------------------- one frame
  step(input = {}) {
    this.frame++; this.t += DT; this.events.length = 0;
    if (this.state !== 'play') { this.updateParticles(); for (const a of this.everyone()) a.body.carry(0, true); return; }
    if (this.timeLeft > 0 && --this.timeLeft <= 0) { if (this.kind === 'arena' && (this.data.rules?.win || 'collect') === 'survive') this.finish('win'); else this.finish('lose'); }
    const p = this.player;
    if (p) (this.kind === 'platform' ? this.stepPlatformPlayer : this.stepArenaPlayer).call(this, p, input);
    for (const e of this.actors) if (e.alive) (this.kind === 'platform' ? this.stepPlatformEnemy : this.stepArenaEnemy).call(this, e);
    for (const it of this.items) this.stepItem(it);
    if (this.goal) { this.goal.body.carry(0, true); }
    this.interact();
    this.updateParticles();
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.35);
    this.followCam();
  }
  everyone() { return [this.player, ...this.actors, ...this.items, this.goal].filter(Boolean); }

  stepPlatformPlayer(p, I) {
    const B = p.body, T = B.T, P = this.physics;
    const wx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (p.hurtT > 0) p.hurtT--;
    if (p.dropT) p.dropT--;
    if (I.jumpPressed) p.buffer = 7; else if (p.buffer > 0) p.buffer--;
    let mv = 0;
    if (p.grounded) {
      p.coyote = 6;
      if (B.phase === 'squat') {
        B.pt++; p.planted = true; B.hopY = 0;
        if (B.pt >= T.squat) { // leave the ground
          p.vy = -P.jump * (I.jump || B.pt > T.squat ? 1 : 1); p.grounded = false; B.phase = 'air'; B.pt = 0; B.qv += 0.16; B.q = 0.05;
          p.vx = wx * P.speed * 0.9; this.emit('jump', p); this.sound?.play('jump', B.m);
          if (wx) B.turnTo(wx);
        }
      } else if (p.buffer > 0 && B.phase !== 'turn') {
        p.buffer = 0; B.phase = 'squat'; B.pt = 0; B.qv -= 0.12 + 0.03 * B.m; p.planted = true; B.hopY = 0; this.emit('squat', p); this.sound?.play('squat', B.m);
      } else if (I.down && I.jumpPressed === false && this.onewayAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) {
        p.dropT = 10;
      } else {
        const g = this.gait(p, wx, 0, P.speed);
        mv = g.v;
        const hitWall = this.moveX(p, g.dx);
        if (hitWall) { B.phase = 'contact'; B.pt = 0; B.hopY = 0; p.vx = 0; }
      }
      if (B.phase !== 'air' && !this.groundBelow(p)) { p.grounded = false; B.phase = 'air'; B.hopY = 0; p.vy = 0; p.vx = wx * P.speed * 0.8; }
    } else {
      if (p.coyote > 0) p.coyote--;
      if (p.buffer > 0 && p.coyote > 0 && p.vy >= 0) { // a late press just after leaving a ledge
        p.buffer = 0; p.vy = -P.jump; p.coyote = 0; B.qv += 0.16; this.emit('jump', p); this.sound?.play('jump', B.m);
      }
      const prev = p.vx;
      p.vx += clamp(wx * P.speed - p.vx, -P.airAccel, P.airAccel);
      mv = p.vx; void prev;
      if (wx) B.turnTo(wx);
      if (!I.jump && p.vy < -1.5) p.vy += P.gravity * 0.9; // short hop when the button is let go
      p.vy = Math.min(P.maxFall, p.vy + P.gravity);
      if (this.moveX(p, p.vx)) p.vx = 0;
      const hit = this.moveY(p, p.vy);
      B.q += p.vy < 0 ? 0.004 : 0;
      p.planted = false; B.hopY = 0;
      if (hit && p.vy > 0) this.land(p);
      else if (hit && p.vy < 0) { p.vy = 0.5; }
    }
    B.carry(mv, p.grounded && B.phase === 'rest' && !wx);
    if (p.y > this.mapH * TILE + 48) this.hurt(p, true);
    const hz = this.hazardTouch(p);
    if (hz) this.hurt(p, !!hz.pit);
    // remember the last safe footing (respawn point after a fall)
    if (p.grounded && B.phase === 'rest' && !hz && this.frame % 20 === 0) {
      const i = Math.floor(p.x / TILE), j = Math.floor(p.y / TILE);
      if (this.solidAt(i, j) && !this.hazardAt(i - 1, j - 1) && !this.hazardAt(i + 1, j - 1)) this.safe = { x: p.x, y: p.y };
    }
  }
  land(a) {
    const B = a.body, impact = Math.min(1.3, Math.abs(a.vy) / this.physics.jump);
    a.grounded = true; a.vy = 0; B.phase = 'land'; B.pt = 0; B.hopY = 0; a.planted = true;
    B.qv -= B.T.landSquash * (0.3 + 0.5 * impact); a.vx = 0;
    if (impact > 0.5) { this.dust(a.x, a.y, 3 + Math.round(B.m * 2)); if (B.m >= 2) this.shake = Math.max(this.shake, 1.5 * B.m * impact); }
    this.emit('land', a); if (a === this.player) this.sound?.play('land', B.m);
  }
  hazardTouch(a) {
    let hit = null;
    this.boxHits(a.x - a.w / 2 + 2, a.y - a.h + 4, a.x + a.w / 2 - 2, a.y - 0.5, (i, j) => { if (this.hazardAt(i, j)) { hit = this.tileDef(this.tileAt(i, j)); return true; } return false; });
    return hit;
  }
  stepPlatformEnemy(e) {
    const B = e.body, mem = e.mem, s = mem.speed ?? 0.7;
    if (e.stunT > 0) { e.stunT--; B.carry(0, true); if (e.stunT === 0) { e.alive = false; this.poof(e); } return; }
    let mv = 0;
    if (B.gait === 'glide') {
      const range = (mem.range ?? 4) * TILE;
      if ((e.x > e.spawnX + range && e.dir > 0) || (e.x < e.spawnX - range && e.dir < 0)) e.dir = -e.dir;
      const g = this.gait(e, e.dir, 0, s);
      if (this.moveX(e, g.dx)) { e.dir = -e.dir; e.vx = 0; }
      B.carry(g.v, false); e.planted = false;
      return;
    }
    if (!e.grounded) {
      e.vy = Math.min(this.physics.maxFall, e.vy + this.physics.gravity);
      if (this.moveY(e, e.vy) && e.vy > 0) this.land(e);
      e.planted = false;
    } else if (mem.move === 'still') { B.phase = 'rest'; e.planted = true; }
    else {
      // patrol: turn (stepped) at walls and ledges, decided while planted
      if (B.phase === 'contact' || B.phase === 'rest') {
        const ahead = e.x + e.dir * (e.w / 2 + 2);
        const wall = this.solidAt(Math.floor(ahead / TILE), Math.floor((e.y - 4) / TILE));
        const ledge = !this.solidAt(Math.floor(ahead / TILE), Math.floor((e.y + 2) / TILE)) && !this.onewayAt(Math.floor(ahead / TILE), Math.floor((e.y + 2) / TILE));
        const hazard = this.hazardAt(Math.floor(ahead / TILE), Math.floor((e.y - 4) / TILE));
        if (wall || hazard || (ledge && mem.turnAtLedge !== false)) e.dir = -e.dir;
      }
      const g = this.gait(e, e.dir, 0, s);
      mv = g.v;
      if (this.moveX(e, g.dx)) { e.dir = -e.dir; B.phase = 'contact'; B.pt = 0; B.hopY = 0; }
      if (!this.groundBelow(e) && B.gait !== 'glide') { e.grounded = false; B.phase = 'air'; }
    }
    B.carry(mv, B.phase === 'rest');
  }
  stepArenaPlayer(p, I) {
    const B = p.body, T = B.T, P = this.physics;
    const wx = (I.right ? 1 : 0) - (I.left ? 1 : 0), wy = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    if (p.hurtT > 0) p.hurtT--;
    if (wx || wy) p.lastDir = [wx, wy];
    let mv = 0;
    if (B.phase === 'squat') {
      B.pt++; p.planted = true; B.hopY = 0;
      if (B.pt >= T.squat) {
        const [dx, dy] = p.lastDir || [B.facing, 0]; const n = Math.hypot(dx, dy) || 1;
        p.vx = (dx / n) * P.pounce; p.vy = (dy / n) * P.pounce; p.vz = 3.2; p.z = 0.01; B.phase = 'air'; B.pt = 0; B.qv += 0.18;
        this.emit('jump', p); this.sound?.play('pounce', B.m);
      }
    } else if (B.phase === 'air') {
      p.vz -= 0.3; p.z += p.vz; B.hopY = Math.round(Math.max(0, p.z));
      if (this.moveX(p, p.vx)) p.vx = 0; if (this.moveY(p, p.vy)) p.vy = 0;
      p.planted = false;
      if (p.z <= 0) { p.z = 0; p.vz = -4; this.land(p); p.vy = 0; this.emit('pounceLand', p); }
    } else if (I.jumpPressed && B.phase !== 'turn' && B.phase !== 'land') {
      B.phase = 'squat'; B.pt = 0; B.qv -= 0.14 + 0.03 * B.m; p.planted = true; this.emit('squat', p); this.sound?.play('squat', B.m);
      if (wx) B.turnTo(wx);
    } else {
      const g = this.gait(p, wx, wy, P.speed);
      mv = g.v;
      const hx = this.moveX(p, g.dx), hy = this.moveY(p, g.dy);
      if ((hx || hy) && B.phase === 'hop') { /* slide along the wall: the hop keeps its free axis */ }
    }
    B.carry(mv, B.phase === 'rest' && !wx && !wy);
    if (this.hazardTouch(p) && B.phase !== 'air') this.hurt(p);
  }
  stepArenaEnemy(e) {
    const B = e.body, mem = e.mem, s = mem.speed ?? 0.6, p = this.player;
    if (e.stunT > 0) {
      e.stunT--; e.flatT = (e.flatT || 0) + 1;
      B.flat = e.stunT > 40 ? Math.min(1, B.flat + 0.25) : Math.max(0, B.flat - 0.04);  // flattened, then pulls itself back up
      B.carry(0, true); e.planted = true; return;
    }
    // decide only while planted (a hop, once begun, finishes)
    if (B.phase !== 'hop' || B.gait === 'glide') {
      if (--e.think <= 0) {
        e.think = 30 + Math.floor(this.rand() * 60);
        const chase = mem.move === 'chase' && p && Math.hypot(p.x - e.x, p.y - e.y) < (mem.sight ?? 96);
        if (chase) { e.plan.want = sign(Math.round(p.x - e.x) / 8 | 0) || 0; e.plan.wantY = sign(Math.round(p.y - e.y) / 8 | 0) || 0; e.think = 18; }
        else if (mem.move === 'still') { e.plan.want = 0; e.plan.wantY = 0; }
        else { const r = Math.floor(this.rand() * 6); const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0], [0, 0]]; [e.plan.want, e.plan.wantY] = dirs[r]; }
      }
    }
    const g = this.gait(e, e.plan.want, e.plan.wantY, s);
    if (B.gait === 'glide') { e.z = 6; B.hopY = e.z; }
    const hx = this.moveX(e, g.dx), hy = this.moveY(e, g.dy);
    if (hx) { e.plan.want = -e.plan.want; e.vx = 0; }
    if (hy) { e.plan.wantY = -e.plan.wantY; e.vy = 0; }
    B.carry(g.v, B.phase === 'rest');
  }
  stepItem(it) {
    const B = it.body;
    if (!it.alive) { if (it.popT > 0) it.popT--; return; }
    B.hopY = Math.round(2 + Math.sin(this.t * 2.6 + it.spawnX * 0.3) * 2); // a float, with a shadow
    B.carry(0, true);
  }
  interact() {
    const p = this.player; if (!p) return;
    const box = (a, inset = 0) => [a.x - a.w / 2 + inset, a.y - a.h + inset, a.x + a.w / 2 - inset, a.y - inset];
    const over = (A, Bb) => A[0] < Bb[2] && A[2] > Bb[0] && A[1] < Bb[3] && A[3] > Bb[1];
    const pb = box(p, 1);
    for (const it of this.items) if (it.alive && over(pb, box(it))) {
      it.alive = false; it.popT = 12; this.got++; this.sparkle(it.x, it.y - 8, it.mem.sparkle || '#fff6b0'); this.emit('pick', it); this.sound?.play('pick');
      if ((this.data.rules?.win || (this.kind === 'arena' ? 'collect' : 'goal')) === 'collect' && this.got >= this.need) this.finish('win');
    }
    for (const e of this.actors) {
      if (!e.alive || e.stunT > 0) continue;
      const eb = box(e, 1);
      if (this.kind === 'arena' && e.body.gait === 'glide') { /* a flyer only hits a body on the ground */ if (p.body.phase === 'air') continue; }
      if (!over(pb, eb)) continue;
      if (this.kind === 'platform' && p.vy > 0.5 && p.y - e.y < -e.h * 0.35 && e.mem.stompable !== false) {
        e.stunT = 24; e.body.qv -= 0.6; e.body.flat = 1; p.vy = -this.physics.jump * 0.65; p.body.qv += 0.15;
        this.shake = Math.max(this.shake, 2 * e.body.m); this.emit('stomp', e); this.sound?.play('stomp');
      } else if (this.kind === 'arena' && p.body.phase === 'air' && p.z < 6 && e.body.gait !== 'glide') {
        e.stunT = 140; this.shake = Math.max(this.shake, 2); this.emit('stomp', e); this.sound?.play('stomp');
      } else this.hurt(p);
    }
    if (this.goal && over(pb, box(this.goal)) && (this.data.rules?.win || 'goal') === 'goal' && this.kind === 'platform') {
      if (this.got >= (this.data.rules?.need ?? 0)) this.finish('win');
      else if (!this.goalNag) { this.goalNag = 90; this.emit('needMore', this.goal); }
    }
    if (this.goalNag) this.goalNag--;
  }
  hurt(p, fell = false) {
    if (p.hurtT > 0 && !fell) return;
    if (!(fell && p.hurtT > 40)) this.lives--;
    p.hurtT = 100; this.shake = 4; this.emit('hurt', p); this.sound?.play('hurt');
    if (this.lives <= 0) { this.finish('lose'); return; }
    if (fell) { const at = this.safe || this.start; p.x = at.x; p.y = at.y; p.vx = 0; p.vy = 0; p.grounded = this.kind === 'arena' || this.groundBelow(p); p.body.phase = 'rest'; this.snapCam(); }
    else if (this.kind === 'platform') { p.vy = -3.2; p.vx = -p.body.facing * 1.4; p.grounded = false; p.body.phase = 'air'; }
    else { p.body.qv -= 0.3; }
  }
  finish(how) {
    if (this.state !== 'play') return;
    this.state = how; this.emit(how, this.player); this.sound?.play(how);
    if (how === 'win' && this.player) { this.player.body.qv += 0.4; this.sparkle(this.player.x, this.player.y - 10, '#ffffff', 18); }
  }
  emit(type, a) { this.events.push({ type, key: a?.key, frame: this.frame }); }
  // ---- particles
  dust(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ x: x + (this.rand() - 0.5) * 8, y: y - 1, vx: (this.rand() - 0.5) * 1.2, vy: -this.rand() * 0.6, life: 14 + this.rand() * 10, col: this.data.palette?.dust || '#d8d0c0' }); }
  sparkle(x, y, col, n = 8) { for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; this.particles.push({ x, y, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, life: 18, col }); } }
  poof(e) { for (let i = 0; i < 10; i++) this.particles.push({ x: e.x + (this.rand() - 0.5) * 10, y: e.y - 6 + (this.rand() - 0.5) * 8, vx: (this.rand() - 0.5) * 0.8, vy: -this.rand() * 0.9, life: 20, col: this.data.palette?.poof || '#ffffff' }); }
  updateParticles() { this.particles = this.particles.filter((q) => { q.x += q.vx; q.y += q.vy; q.vy += 0.03; q.vx *= 0.96; return --q.life > 0; }); }
  // ---- camera
  snapCam() { this.cam.x = this.camTarget().x; this.cam.y = this.camTarget().y; }
  camTarget() {
    const p = this.player;
    const maxX = Math.max(0, this.mapW * TILE - this.W), maxY = Math.max(0, this.mapH * TILE - this.H);
    return { x: clamp(p.x - this.W / 2 + p.body.facing * 24, 0, maxX), y: clamp(p.y - this.H * 0.55, 0, maxY) };
  }
  followCam() { if (!this.player) return; const t = this.camTarget(); this.cam.x += (t.x - this.cam.x) * 0.1; this.cam.y += (t.y - this.cam.y) * 0.08; }

  // ---------------------------------------------------------------- drawing
  tileCanvas(ch, i, j) {
    const def = this.tileDef(ch); if (!def) return null;
    const exposed = !this.tileDef(this.tileAt(i, j - 1)) || this.tileDef(this.tileAt(i, j - 1)).hazard;
    // arena walls show a front face where open floor lies below them (a little depth, light from above)
    const front = this.kind === 'arena' && def.look !== 'stump' && !def.hazard && (!this.tileDef(this.tileAt(i, j + 1)) || this.tileDef(this.tileAt(i, j + 1)).hazard) && j + 1 < this.mapH;
    const k = ch + (exposed ? '^' : '') + (front ? 'v' : '') + ((i * 7 + j * 13) % 3);
    if (!this.tileCache.has(k)) {
      const c = tileArt(def.look || 'stone', def.colors || ['#888888'], hashStr(k) ^ this.seed, exposed && this.kind !== 'arena');
      if (front) { const x = c.getContext('2d'), cols = def.colors || ['#888888'], dk = cols[1] || mix(cols[0], '#000000', 0.35);
        x.fillStyle = mix(dk, '#000000', 0.25); x.fillRect(0, 12, 16, 4); x.fillStyle = dk; for (let n = 0; n < 16; n += 2) x.fillRect(n, 11 + (n % 4 ? 1 : 0), 1, 1); }
      this.tileCache.set(k, c);
    }
    return this.tileCache.get(k);
  }
  draw(ctx) {
    const W = this.W, H = this.H;
    ctx.imageSmoothingEnabled = false;
    const sh = this.shake > 0 ? [Math.round((this.rand() - 0.5) * this.shake * 2), Math.round((this.rand() - 0.5) * this.shake * 2)] : [0, 0];
    const cx = Math.round(this.cam.x) - sh[0], cy = Math.round(this.cam.y) - sh[1];
    ctx.fillStyle = this.data.palette?.bg || '#101018'; ctx.fillRect(0, 0, W, H);
    drawBackdrop(ctx, this.data.backdrop || [], W, H, cx, cy, this.t, this.seed);
    // floor (arena)
    if (this.kind === 'arena' && this.data.floor) {
      const f = this.data.floor;
      for (let j = Math.floor(cy / TILE); j <= Math.floor((cy + H) / TILE); j++) for (let i = Math.floor(cx / TILE); i <= Math.floor((cx + W) / TILE); i++) {
        if (i < 0 || j < 0 || i >= this.mapW || j >= this.mapH) continue;
        const k = 'floor' + (hashStr(`${i},${j}`) % 8);
        if (!this.tileCache.has(k)) this.tileCache.set(k, floorArt(f, hashStr(k)));
        ctx.drawImage(this.tileCache.get(k), i * TILE - cx, j * TILE - cy);
      }
    }
    // tiles
    for (let j = Math.floor(cy / TILE); j <= Math.floor((cy + H) / TILE); j++) for (let i = Math.floor(cx / TILE); i <= Math.floor((cx + W) / TILE); i++) {
      const ch = this.tileAt(i, j); if (ch === '.' || ch === ' ' || j < 0 || j >= this.mapH || i < 0 || i >= this.mapW) continue;
      const c = this.tileCanvas(ch, i, j); if (c) ctx.drawImage(c, i * TILE - cx, j * TILE - cy);
    }
    // actors, sorted by foot y (arena) so nearer bodies overlap farther ones
    const list = [this.goal, ...this.items.filter((a) => a.alive || a.popT > 0), ...this.actors.filter((a) => a.alive), this.player].filter(Boolean);
    if (this.kind === 'arena') list.sort((a, b) => a.y - b.y);
    for (const a of list) this.drawActor(ctx, a, cx, cy);
    for (const q of this.particles) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 1, 1); }
    this.drawHUD(ctx);
  }
  drawActor(ctx, a, cx, cy) {
    const spr = this.sprites[a.key]; if (!spr) return;
    const pose = a.body.pose();
    if (a.popT > 0) { const k = a.popT / 12; pose.sx *= 1 + (1 - k) * 0.8; pose.sy *= 1 + (1 - k) * 0.8; }
    const fx = a.x - cx + (spr.cx - 8) * 0, fy = a.y - cy;
    // shadow for anything off the ground
    if (pose.lift > 0 || this.kind === 'arena') {
      const w = Math.max(4, Math.round(spr.w * 0.7 - pose.lift * 0.4));
      ctx.fillStyle = this.data.palette?.shadow || 'rgba(0,0,0,0.28)';
      ctx.fillRect(Math.round(fx - w / 2), Math.round(fy - 1), w, 2);
    }
    let alpha = 1;
    if (a.hurtT > 0 && Math.floor(a.hurtT / 4) % 2) alpha = 0.35;
    if (a.popT > 0) alpha = a.popT / 12;
    drawSprite(ctx, spr, fx, fy + 0, pose, alpha);
  }
  drawHUD(ctx) {
    const pal = this.data.palette || {}, ink = pal.ink || '#ffffff', W = this.W;
    ctx.fillStyle = pal.hudBg || 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, 11);
    // lives as pixel hearts
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      const x = 4 + i * 9, y = 3; ctx.fillStyle = pal.heart || '#ff5a6e';
      ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + 3, y, 2, 2); ctx.fillRect(x - 0, y + 1, 5, 2); ctx.fillRect(x + 1, y + 3, 3, 1); ctx.fillRect(x + 2, y + 4, 1, 1);
    }
    // item count with the item's own sprite, 8 px
    const firstItem = this.items[0];
    if (firstItem) {
      const spr = this.sprites[firstItem.key];
      const x = Math.round(W / 2) - 16;
      if (spr) ctx.drawImage(spr.canvas, spr.x0, spr.y0, spr.w, spr.h, x, 1, Math.max(1, Math.round(spr.w / 2)), Math.max(1, Math.round(spr.h / 2)));
      text(ctx, `${this.got}/${this.need}`, x + 11, 3, ink);
    }
    if (this.timeLeft > 0) { const s = Math.ceil(this.timeLeft / 60); text(ctx, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W - 24, 3, s <= 10 && Math.floor(this.t * 4) % 2 ? (pal.heart || '#ff5a6e') : ink); }
    if (this.goalNag) { const m = this.data.text?.needMore || 'MORE!'; if (/^[\x20-\x7e×]+$/.test(m)) text(ctx, m, Math.round(W / 2 - textWidth(m) / 2), 16, ink); }
  }
  // ---------------------------------------------------------------- probes for check.mjs
  snap() {
    const one = (a) => a && { key: a.key, x: +a.x.toFixed(3), y: +a.y.toFixed(3), vx: +a.vx.toFixed(3), vy: +a.vy.toFixed(3), grounded: a.grounded, planted: a.planted, phase: a.body.phase,
      facing: a.body.facing, pose: (({ sx, sy, flip, lean, lift }) => ({ sx: +sx.toFixed(4), sy: +sy.toFixed(4), flip: +flip.toFixed(3), lean: +lean.toFixed(3), lift }))(a.body.pose()), alive: a.alive, gait: a.body.gait, faces: a.body.faces };
    return { frame: this.frame, state: this.state, lives: this.lives, got: this.got, need: this.need, player: one(this.player), actors: this.actors.map(one), events: this.events.slice() };
  }
  hash() {
    let h = 2166136261;
    const feed = (v) => { h = Math.imul(h ^ (Math.round(v * 1000) | 0), 16777619); };
    for (const a of this.everyone()) { feed(a.x); feed(a.y); feed(a.alive ? 1 : 0); feed(a.body.q); }
    feed(this.got); feed(this.lives); feed(this.frame);
    return (h >>> 0).toString(16);
  }
}

// ---------------------------------------------------------------- reachability (platform): can the goal and every item be reached?
export function reach(data) {
  const P = { gravity: 0.32, jump: 5.6, speed: 1.6, airAccel: 0.18, maxFall: 6, ...(data.physics || {}) };
  // jump envelope: highest point and the farthest horizontal reach at each height, from a running start
  let y = 0, vy = -P.jump, x = 0; const env = [];
  while (vy < P.maxFall * 2 && y < 16 * 12) { vy = Math.min(P.maxFall, vy + P.gravity); y += vy; x += P.speed; env.push([x, -y]); if (y > 0 && vy > 0 && env.length > 400) break; }
  const apex = Math.max(...env.map((e) => e[1]));
  const reachAt = (dyUp) => { let best = 0; for (const [ex, ey] of env) if (ey >= dyUp) best = Math.max(best, ex); return best; };
  const rows = data.level.map((r) => r.split('')); const H = rows.length, W = Math.max(...rows.map((r) => r.length));
  const legend = data.legend || {}, tiles = data.tiles || {};
  const solid = (i, j) => { if (i < 0 || i >= W) return true; if (j < 0 || j >= H) return false; const d = tiles[rows[j][i]]; return !!d && !d.hazard && d.solid !== false; };
  const platformTop = (i, j) => { if (j < 0 || j >= H) return false; const d = tiles[rows[j][i]]; return !!d && !d.hazard; };
  const hazard = (i, j) => { const d = tiles[rows[j]?.[i]]; return !!d && d.hazard; };
  // standable cells: empty cell with a top below it, not a hazard
  const stand = []; const key = (i, j) => j * W + i;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!solid(i, j) && !hazard(i, j) && platformTop(i, j + 1) && !hazard(i, j + 1)) stand.push([i, j]);
  let start = null; const targets = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = legend[rows[j][i]]; if (!k) continue; const role = data.cast[k]?.role;
    if (role === 'player') start = [i, j]; else if (role === 'item' || role === 'goal') targets.push({ key: k, role, at: [i, j] });
  }
  if (!start) return { ok: false, problems: ['no player start in the level'] };
  // drop the start to its ground
  while (start[1] < H - 1 && !platformTop(start[0], start[1] + 1)) start[1]++;
  const standSet = new Set(stand.map(([i, j]) => key(i, j)));
  const seen = new Set([key(...start)]), q = [start];
  const covered = new Set(); // cells the body passes through (for items in the air)
  const mark = (i, j, up) => { for (let k = 0; k <= up; k++) covered.add(key(i, j - k)); };
  while (q.length) {
    const [i, j] = q.shift();
    const upTiles = Math.floor((apex - 2) / TILE);
    mark(i, j, upTiles);
    for (let di = -6; di <= 6; di++) for (let dj = -upTiles; dj <= 12; dj++) {
      const ni = i + di, nj = j + dj; if (!standSet.has(key(ni, nj)) || seen.has(key(ni, nj))) continue;
      const dx = Math.max(0, Math.abs(di) * TILE - 10), dyUp = -dj * TILE;
      if (dyUp > apex - 2) continue;
      if (dx > reachAt(Math.max(dyUp, -400)) + (dj > 0 ? dj * 4 : 0)) continue;
      // headroom: the column above the start must be open as high as the jump goes
      let blocked = false; for (let k = 1; k <= Math.max(0, -dj) + 1; k++) if (solid(i, j - k)) { blocked = true; break; }
      if (blocked && dj < 0) continue;
      seen.add(key(ni, nj)); q.push([ni, nj]);
      // cells crossed in between count as covered (coarse)
      const steps = Math.abs(di); for (let s = 0; s <= steps; s++) mark(i + Math.round((di * s) / Math.max(1, steps)), Math.min(j, nj), upTiles);
    }
  }
  const problems = [];
  const out = targets.map((t) => { const ok = seen.has(key(...t.at)) || covered.has(key(...t.at)); if (!ok) problems.push(`${t.role} "${t.key}" at column ${t.at[0]}, row ${t.at[1]} cannot be reached`); return { ...t, ok }; });
  return { ok: !problems.length, problems, apexPx: +apex.toFixed(1), apexTiles: +(apex / TILE).toFixed(2), standable: stand.length, reached: seen.size, targets: out };
}
// arena: flood fill from the player over open floor
export function reachArena(data) {
  const rows = data.level.map((r) => r.split('')); const H = rows.length, W = Math.max(...rows.map((r) => r.length));
  const tiles = data.tiles || {}, legend = data.legend || {};
  const open = (i, j) => i >= 0 && j >= 0 && i < W && j < H && !(tiles[rows[j][i]] && !tiles[rows[j][i]].hazard && tiles[rows[j][i]].solid !== false);
  let start = null; const targets = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = legend[rows[j][i]]; if (!k) continue; const role = data.cast[k]?.role; if (role === 'player') start = [i, j]; else if (role === 'item' || role === 'goal') targets.push({ key: k, role, at: [i, j] }); }
  if (!start) return { ok: false, problems: ['no player start in the level'] };
  const seen = new Set([start[1] * W + start[0]]), q = [start];
  while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (!open(ni, nj) || seen.has(nj * W + ni)) continue; seen.add(nj * W + ni); q.push([ni, nj]); } }
  const problems = []; targets.forEach((t) => { if (!seen.has(t.at[1] * W + t.at[0])) problems.push(`${t.role} "${t.key}" at column ${t.at[0]}, row ${t.at[1]} is walled off`); });
  return { ok: !problems.length, problems, reached: seen.size, targets };
}

// ---------------------------------------------------------------- the test yard: one actor on flat ground (motion checks, cast sheet)
export function yard(data, sprites, key, { seed = 3, width = 40 } = {}) {
  const kind = data.kind || 'platform';
  const groundCh = Object.keys(data.tiles || {}).find((c) => { const d = data.tiles[c]; return !d.hazard && !d.oneway && d.solid !== false; }) || '#';
  const mid = Math.floor(width / 2);
  const row = (fill, edge, at) => { const r = (edge + fill.repeat(width - 2) + edge).split(''); if (at != null) r[at] = 'Y'; return r.join(''); };
  const level = kind === 'arena'
    ? [groundCh.repeat(width), ...Array.from({ length: 9 }, (_, j) => row('.', groundCh, j === 4 ? mid : null)), groundCh.repeat(width)]
    : [...Array.from({ length: 9 }, (_, j) => row('.', '.', j === 8 ? mid : null)), groundCh.repeat(width), groundCh.repeat(width)];
  const mem = { ...data.cast[key], role: 'player' };
  const d2 = { ...data, level, legend: { Y: key }, cast: { ...data.cast, [key]: mem }, rules: { lives: 99 }, backdrop: data.backdrop };
  const g = new Game(d2, sprites, { seed });
  g.player.grounded = true;
  return g;
}

// ---------------------------------------------------------------- boot: page, sprites, title screen, loop
const DEFAULT_UI = {
  paint: 'Tessera로 스프라이트 그리기', paintNote: '처음 한 번 모델 115 MB를 내려받습니다 · 브라우저 안에서만 그립니다',
  hand: '손그림 스프라이트로 시작', start: '시작', again: '다시', own: '내 주인공 그리기', ownPlaceholder: '예: astronaut cat',
  ownGo: '4개 그리기', ownPick: '하나를 고르세요', painting: '그리는 중', loading: '모델 받는 중', noGpu: 'WebGPU가 없어 손그림 스프라이트로 시작합니다 (CPU로 그리면 한 벌에 수십 초 걸립니다)',
  controls: '← → 이동 · Space 점프 · M 소리', controlsArena: '← ↑ ↓ → 이동 · Space 덮치기 · M 소리', cpu: 'CPU로 그리기 (느림)',
};

export async function boot({ root = document.body, src = './game.json', data = null } = {}) {
  data = data || (await (await fetch(src)).json());
  const qs = new URLSearchParams(location.search);
  const ui = { ...DEFAULT_UI, ...(data.ui || {}) };
  const W = data.view?.w || 320, H = data.view?.h || 192;
  root.classList.add('psg');
  root.innerHTML = `
    <div class="psg-stage"><canvas class="psg-canvas" width="${W}" height="${H}"></canvas>
      <div class="psg-overlay" hidden></div>
      <div class="psg-touch" hidden>
        <div class="psg-pad"><button data-k="left" aria-label="left">◀</button>${data.kind === 'arena' ? '<button data-k="up" aria-label="up">▲</button><button data-k="down" aria-label="down">▼</button>' : ''}<button data-k="right" aria-label="right">▶</button></div>
        <button class="psg-a" data-k="jump" aria-label="jump">A</button>
      </div>
    </div>
    <p class="psg-credit"></p>`;
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d'), overlay = root.querySelector('.psg-overlay'), credit = root.querySelector('.psg-credit');
  ctx.imageSmoothingEnabled = false;
  const fit = () => {
    // whole-number scale when it fits (crisp pixels), otherwise the largest scale that fits
    const stage = root.querySelector('.psg-stage');
    const availW = stage.clientWidth || innerWidth, availH = Math.max(H, innerHeight - (Number(root.dataset.reserve) || 40));
    const free = Math.min(availW / W, availH / H);
    const s = free >= 2 ? Math.floor(free) : free; // below 2× a whole number would waste most of a phone screen
    canvas.style.width = `${Math.floor(W * s)}px`; canvas.style.height = `${Math.floor(H * s)}px`;
  };
  addEventListener('resize', fit); fit();

  const keys = Object.keys(data.cast);
  const hand = {};
  for (const k of keys) hand[k] = makeSprite(handRGBA(data.cast[k], data.colors).rgba, 'hand');
  let sprites = { ...hand };
  const sound = new Sound(data.tune);
  const seed = Number(qs.get('seed')) || data.seed || 1;
  let game = new Game(data, sprites, { seed, sound: null });
  let mode = 'title';

  // custom hero from a prompt the player typed (kept on this device)
  const OWN = `psg.own.${hashStr(data.title || '')}`;
  const heroKey = keys.find((k) => data.cast[k].role === 'player');
  const loadOwn = () => { try { const v = JSON.parse(localStorage.getItem(OWN) || 'null'); if (v) { const rgba = cachedSprite(v.prompt, v.seed, v.pick); if (rgba) sprites[heroKey] = makeSprite(rgba, 'tessera'); data.cast[heroKey].faces = 'front'; } } catch {} };

  const setCredit = () => {
    const used = Object.values(sprites).some((s) => s.source === 'tessera');
    credit.textContent = used ? TESSERA_CREDIT + ' · non-commercial' : (data.credit || 'Hand-drawn sprites from game.json');
  };
  const paintAll = async (device) => {
    overlay.hidden = false;
    overlay.innerHTML = `<div class="psg-card"><h1>${esc(data.title || '')}</h1><p class="psg-status">${esc(ui.loading)} …</p><div class="psg-paint"></div></div>`;
    const status = overlay.querySelector('.psg-status'), board = overlay.querySelector('.psg-paint');
    const tiles = {};
    for (const k of keys) { const c = mkCanvas(16, 16); c.className = 'psg-live'; board.append(c); tiles[k] = c; }
    await loadTessera({ device, onProgress: ({ stage, loaded, total }) => { status.textContent = `${ui.loading} · ${stage} ${total ? Math.round((loaded / total) * 100) : 0}%`; } });
    let n = 0;
    for (const k of keys) {
      const m = data.cast[k]; n++;
      status.textContent = `${ui.painting} ${n}/${keys.length} · ${m.prompt}`;
      const show = (rgba) => tiles[k].getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 16, 16), 0, 0);
      const hit = cachedSprite(m.prompt, m.seed ?? 7, m.pick ?? 0);
      const rgba = hit || (await spriteFor({ prompt: m.prompt, seed: m.seed ?? 7, pick: m.pick ?? 0 }, { device, onStep: (s, list) => show(list[Math.min(m.pick ?? 0, list.length - 1)]) }));
      show(rgba); sprites[k] = makeSprite(rgba, 'tessera');
    }
  };
  const useTesseraCache = () => { for (const k of keys) { const m = data.cast[k]; sprites[k] = makeSprite(cachedSprite(m.prompt, m.seed ?? 7, m.pick ?? 0), 'tessera'); } };

  function title() {
    mode = 'title'; overlay.hidden = false; game = new Game(data, sprites, { seed, sound: null });
    const cached = keys.every((k) => data.cast[k].prompt) && allCached(keys.map((k) => data.cast[k]));
    const gpu = webgpuLikely();
    overlay.innerHTML = `<div class="psg-card">
      <h1>${esc(data.title || '')}</h1>${data.text?.intro ? `<p>${esc(data.text.intro)}</p>` : ''}
      <div class="psg-cast">${keys.map((k) => `<figure><canvas data-k="${k}" width="16" height="16"></canvas><figcaption>${esc(data.cast[k].name || k)}</figcaption></figure>`).join('')}</div>
      <div class="psg-buttons">
        <button class="psg-go" data-act="${cached ? 'cached' : 'paint'}">${esc(cached ? ui.start + ' · Tessera' : ui.paint)}</button>
        <button data-act="hand">${esc(ui.hand)}</button>
      </div>
      ${cached ? '' : `<p class="psg-note">${esc(gpu ? ui.paintNote : ui.noGpu)}</p>`}
      <details class="psg-own"><summary>${esc(ui.own)}</summary><form><input maxlength="60" placeholder="${esc(ui.ownPlaceholder)}" aria-label="${esc(ui.own)}"><button>${esc(ui.ownGo)}</button></form><div class="psg-picks"></div></details>
      <p class="psg-keys">${esc(data.kind === 'arena' ? ui.controlsArena : ui.controls)}</p></div>`;
    const showCast = () => overlay.querySelectorAll('.psg-cast canvas').forEach((c) => c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sprites[c.dataset.k].rgba), 16, 16), 0, 0));
    showCast();
    overlay.querySelector('[data-act=hand]').onclick = () => { sprites = { ...hand }; loadOwn(); go(); };
    const goBtn = overlay.querySelector('.psg-go');
    goBtn.onclick = async () => {
      if (goBtn.dataset.act === 'cached') { useTesseraCache(); loadOwn(); return go(); }
      if (!gpu && !confirm(ui.cpu + '?')) return;
      try { await paintAll(gpu ? 'auto' : 'wasm'); loadOwn(); go(); }
      catch (e) { console.warn(e); sprites = { ...hand }; title(); overlay.querySelector('.psg-note').textContent = String(e.message || e); }
    };
    const form = overlay.querySelector('.psg-own form'), picks = overlay.querySelector('.psg-picks');
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const prompt = form.querySelector('input').value.trim(); if (!prompt) return;
      const s = 1 + Math.floor(Math.random() * 99999);
      picks.textContent = `${ui.loading} …`;
      try {
        const all = await paint(prompt, { seed: s, count: 4, device: gpu ? 'auto' : 'wasm', onStep: (_, list) => { picks.replaceChildren(...list.map((rgba) => { const c = mkCanvas(16, 16); c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 16, 16), 0, 0); return c; })); } });
        picks.replaceChildren(...all.map((rgba, i) => { const b = document.createElement('button'); const c = mkCanvas(16, 16); c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 16, 16), 0, 0); b.append(c); b.title = ui.ownPick;
          b.onclick = () => { try { localStorage.setItem(OWN, JSON.stringify({ prompt, seed: s, pick: i })); } catch {} sprites[heroKey] = makeSprite(rgba, 'tessera'); data.cast[heroKey].faces = 'front'; showCast(); }; return b; }));
      } catch (e) { picks.textContent = String(e.message || e); }
    };
    setCredit();
  }
  function go() {
    overlay.hidden = true; mode = 'play'; sound.wake(); setCredit();
    game = new Game(data, sprites, { seed, sound });
  }
  function end(how) {
    mode = 'end'; overlay.hidden = false;
    overlay.innerHTML = `<div class="psg-card"><h1>${esc(how === 'win' ? data.text?.win || 'CLEAR!' : data.text?.lose || 'GAME OVER')}</h1><div class="psg-buttons"><button class="psg-go" data-act="again">${esc(ui.again)}</button><button data-act="title">${esc(data.title || 'title')}</button></div></div>`;
    overlay.querySelector('[data-act=again]').onclick = go;
    overlay.querySelector('[data-act=title]').onclick = title;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // input
  const held = {}; let pressed = false;
  const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: data.kind === 'arena' ? 'up' : 'jump', KeyW: data.kind === 'arena' ? 'up' : 'jump', ArrowDown: 'down', KeyS: 'down', Space: 'jump', KeyZ: 'jump', KeyX: 'jump' };
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input')) return;
    if (e.code === 'KeyM') { sound.on = !sound.on; return; }
    if ((e.code === 'Enter' || e.code === 'Space') && mode === 'end') { go(); e.preventDefault(); return; }
    const k = map[e.code]; if (!k) return; e.preventDefault();
    if (k === 'jump' && !held.jump) pressed = true; held[k] = true; sound.wake();
  });
  addEventListener('keyup', (e) => { const k = map[e.code]; if (k) held[k] = false; });
  const touch = root.querySelector('.psg-touch');
  if (matchMedia('(pointer: coarse)').matches || qs.has('touch')) touch.hidden = false;
  touch.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (k === 'jump' && !held.jump) pressed = true; held[k] = true; sound.wake(); b.setPointerCapture(e.pointerId); });
    const up = () => { held[k] = false; }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });

  // test hooks: a harness steps the game itself
  window.GAME = {
    data, get game() { return game; }, sprites: () => sprites, hand,
    newGame: (opts = {}) => (game = new Game(data, opts.sprites || sprites, { seed: opts.seed ?? seed })),
    yard: (k, opts) => (game = yard(data, opts?.sprites || sprites, k, opts)),
    step: (input = {}, n = 1) => { for (let i = 0; i < n; i++) game.step(input); return game.snap(); },
    snap: () => game.snap(), hash: () => game.hash(), reach: () => (data.kind === 'arena' ? reachArena(data) : reach(data)),
    draw: () => game.draw(ctx), timing, start: go, title,
    useSprites: (which) => { sprites = which === 'hand' ? { ...hand } : sprites; },
  };
  if (qs.has('test')) { overlay.hidden = true; mode = 'test'; game.draw(ctx); return window.GAME; }

  // fixed-step loop
  let acc = 0, last = performance.now();
  const frame = (now) => {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= DT) {
      acc -= DT;
      if (mode === 'play') {
        game.step({ ...held, jumpPressed: pressed }); pressed = false;
        if (game.state !== 'play') { const how = game.state; setTimeout(() => mode === 'play' && game.state === how && end(how), 900); mode = 'ending'; }
      } else if (mode === 'ending') game.step({});
      else if (mode === 'title') {
        game.step(autopilot(game));
        if (game.state !== 'play' && (game.endF = (game.endF || 0) + 1) > 120) game = new Game(data, sprites, { seed, sound: null }); // the attract loop starts over
      }
    }
    game.draw(ctx);
    requestAnimationFrame(frame);
  };
  title();
  if (qs.get('sprites') === 'hand' || qs.has('autostart')) { sprites = { ...hand }; go(); }
  requestAnimationFrame(frame);
  return window.GAME;
}
// the title screen plays itself (also used for stills): walk toward the goal, jump at walls and gaps
export function autopilot(g) {
  const p = g.player; if (!p || g.state !== 'play') return {};
  const alive = g.items.filter((i) => i.alive);
  if (g.kind === 'arena') {
    const it = alive.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (!it) return {};
    const foe = g.actors.find((e) => e.alive && !e.stunT && e.body.gait !== 'glide' && Math.hypot(e.x - p.x, e.y - p.y) < 22);
    return { left: it.x < p.x - 4, right: it.x > p.x + 4, up: it.y < p.y - 4, down: it.y > p.y + 4, jumpPressed: !!foe && g.frame % 20 === 0 };
  }
  // platform: go for the nearest item left, then the goal; jump walls, gaps, hazards and enemies
  const ap = (g.ap ||= { lastX: p.x, still: 0 });
  ap.still = Math.abs(p.x - ap.lastX) < 0.5 ? ap.still + 1 : 0; ap.lastX = p.x;
  const t = alive.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0] || g.goal; if (!t) return {};
  const dir = Math.abs(t.x - p.x) < 4 ? 0 : Math.sign(t.x - p.x);
  const d = dir || p.body.facing;
  const ahead = Math.floor((p.x + d * 14) / TILE), foot = Math.floor((p.y + 2) / TILE), body = Math.floor((p.y - 4) / TILE);
  const enemy = g.actors.some((e) => e.alive && !e.stunT && Math.sign(e.x - p.x) === d && Math.abs(e.x - p.x) < 34 && Math.abs(e.y - p.y) < 20);
  const above = Math.abs(t.x - p.x) < 20 && t.y < p.y - 10;
  const jump = g.solidAt(ahead, body) || (!g.solidAt(ahead, foot) && !g.onewayAt(ahead, foot)) || g.hazardAt(ahead, foot) || g.hazardAt(ahead, body) || enemy || above || ap.still > 40;
  return { left: d < 0 && (dir !== 0 || !p.grounded), right: d > 0 && (dir !== 0 || !p.grounded), jump: true, jumpPressed: jump && p.grounded && g.frame % 3 === 0 };
}
