// cursor-swarm · core.js — palette, fonts, seeded randomness, easing, text wrapping, the 5×7 pixel font, cursors.
// Everything here is pure: the same input draws the same pixels.

// ── the editor around the page (fixed: this is the style) ──
export const ED = {
  bg: '#0b0b11', dot: 'rgba(255,255,255,.075)', ruler: '#121219', rulerLine: '#24242f', rulerTick: '#3a3a4a', rulerText: '#62627a',
  sel: '#3d8bff', selSoft: 'rgba(61,139,255,.10)', tag: '#2f7bf5', tagText: '#ffffff', guide: '#ff3d6e',
  frameText: '#7c7c92', hud: 'rgba(19,19,27,.94)', hudLine: 'rgba(255,255,255,.09)', hudText: '#d6d6e2', hudDim: '#7c7c92',
  ok: '#3ddc84', build: '#3d8bff', shadow: 'rgba(0,0,0,.45)',
};
// agent cursor colours: vivid, readable on a dark editor and on most light pages (each gets a thin outline)
export const AGENT_COLORS = ['#ff5d6c', '#ffb02e', '#ffe14d', '#7ee26b', '#2fd4a3', '#3cc8e0', '#4da3ff', '#7a8cff',
  '#b48cff', '#f77fbe', '#ff8a5c', '#b5e34b', '#5fe0ef', '#ffa8d6', '#c9f06b', '#9fb4ff'];

// font families: every family falls back to Noto Sans KR for Hangul. `pixel` is the bitmap font below.
export const FAMILY = {
  sans: "'Inter','Noto Sans KR',sans-serif",
  serif: "'Source Serif 4','Noto Sans KR',serif",
  mono: "'JetBrains Mono','Noto Sans KR',monospace",
  hand: "'Caveat','Noto Sans KR',cursive",
  kr: "'Noto Sans KR',sans-serif",
};
export const FONT_FILES = [
  ['Inter', 'Inter-500', '500', 'normal'], ['Inter', 'Inter-600', '600', 'normal'], ['Inter', 'Inter-700', '700', 'normal'],
  ['Source Serif 4', 'SourceSerif4-Variable', '200 900', 'normal'], ['Source Serif 4', 'SourceSerif4-Italic-Variable', '200 900', 'italic'],
  ['JetBrains Mono', 'JetBrainsMono', '100 800', 'normal'], ['Noto Sans KR', 'NotoSansKR-500', '500', 'normal'], ['Caveat', 'Caveat-500', '500', 'normal'],
];

// ── numbers ──
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
export const easeInOut = k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
export const easeIn = k => Math.pow(clamp(k), 3);
export const easeOutBack = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** a seeded generator: rng(seed)() → [0, 1) */
export function rng(seed) { let a = typeof seed === 'number' ? seed >>> 0 : hash(seed); return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const h1 = (i, s) => { let x = Math.imul(i ^ s, 0x27d4eb2d); x ^= x >>> 15; x = Math.imul(x, 0x165667b1); x ^= x >>> 13; return (x >>> 0) / 4294967296; };
/** smooth 1D value noise in [0, 1) */
export function n1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h1(i, seed), h1(i + 1, seed), u); }

// ── colour ──
export function rgbOf(c) {
  if (Array.isArray(c)) return c;
  if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const v = parseInt(h.slice(0, 6), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
export function mix(a, b, k) { const A = rgbOf(a), B = rgbOf(b); return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`; }
export const alpha = (c, a) => { const [r, g, b] = rgbOf(c); return `rgba(${r},${g},${b},${a})`; };
export const luma = c => { const [r, g, b] = rgbOf(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

// ── text ──
/** a text style → canvas font string. st: { font: 'sans'|'serif'|'mono'|'hand'|'kr', size, weight, italic } */
export function fontOf(st) { return `${st.italic ? 'italic ' : ''}${st.weight || (st.font === 'serif' ? 600 : 500)} ${st.size}px ${FAMILY[st.font || 'sans'] || st.font}`; }
export function setFont(g, st) { g.font = fontOf(st); if ('letterSpacing' in g) g.letterSpacing = (st.track || 0) * st.size + 'px'; }
export function measure(g, s, st) { if (st.font === 'pixel') return pixelWidth(s, st.size / 7); setFont(g, st); return g.measureText(s).width; }
/** wrap text to maxW (no maxW: split on \n only). Breaks on spaces; a word longer than a line breaks between characters. */
export function wrap(g, s, st, maxW) {
  const out = [];
  for (const para of String(s).split('\n')) {
    if (!maxW) { out.push(para); continue; }
    const words = para.split(/(?<=\s)/); let line = '';
    for (const w of words) {
      if (measure(g, line + w, st) <= maxW || !line && measure(g, w, st) <= maxW) { line += w; continue; }
      if (line) { out.push(line.trimEnd()); line = ''; }
      if (measure(g, w, st) <= maxW) { line = w; continue; }
      for (const ch of w) { if (measure(g, line + ch, st) > maxW && line) { out.push(line); line = ''; } line += ch; }
    }
    out.push(line.trimEnd());
  }
  return out;
}

// ── the pixel font: 5×7 capitals, digits and a little punctuation (lower case is drawn as capitals) ──
const G = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.',
  D: '####.#...##...##...##...##...#####.', E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#', I: '.###...#....#....#....#....#...###.',
  J: '..###...#....#....#....#.#..#..##..', K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...##...###..##.#.##..###...##...#', O: '.###.#...##...##...##...##...#.###.',
  P: '####.#...##...#####.#....#....#....', Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..', U: '#...##...##...##...##...##...#.###.',
  V: '#...##...##...##...##...#.#.#...#..', W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####', "0": '.###.#...##..###.#.###..##...#.###.',
  "1": '..#...##....#....#....#....#...###.', "2": '.###.#...#....#...#...#...#...#####', "3": '#####...#...#.....#.....##...#.###.',
  "4": '...#...##..#.#.#..#.#####...#....#.', "5": '######....####.....#....##...#.###.', "6": '..##..#...#....####.#...##...#.###.',
  "7": '#####....#...#...#...#....#....#...', "8": '.###.#...##...#.###.#...##...#.###.', "9": '.###.#...##...#.####....#...#..##..',
  " ": '...................................', ".": '..........................##...##..', ",": '.....................##....#...#...',
  "!": '..#....#....#....#....#.........#..', "?": '.###.#...#....#...#...#.........#..', ":": '......##...##........##...##.......',
  "-": '...............#####...............', "+": '.......#....#..#####..#....#.......', "'": '..#....#...#.......................',
  "/": '....#....#...#...#...#...#....#....', "&": '.##..#..#.#.#...#...#.#.##..#..##.#', "#": '.#.#..#.#.#####.#.#.#####.#.#..#.#.',
  "*": '.......#..#.#.#.###.#.#.#..#.......', "%": '##...##..#...#...#...#...#..##...##', "(": '...#...#...#....#....#.....#.....#.',
  ")": '.#.....#.....#....#....#...#...#...', "♥": '......#.#.##########.###...#.......', "·": '.................#.................',
  "×": '.....#...#.#.#...#...#.#.#...#.....', "$": '..#...#####.#...###...#.#####...#..', "\"": '.#.#..#.#..........................',
  "=": '..........#####.....#####..........', "<": '...#...#...#...#.....#.....#.....#.', ">": '.#.....#.....#.....#...#...#...#...',
};
const NARROW = new Set(['.', ',', ':', "'", '!', '·', '(', ')', ' ']);
const glyph = ch => G[ch] || G[ch.toUpperCase()] || G['?'];
const adv = ch => (NARROW.has(ch) ? 3 : 6);
const off = ch => (NARROW.has(ch) && ch !== ' ' ? -1 : 0);
export const pixelWidth = (s, cell) => { let w = 0; for (const ch of s) w += adv(ch); return Math.max(0, (w - 1) * cell); };
/** draw pixel text with its top-left at (x, y); cell = size of one pixel. Returns the width. */
export function pixelText(g, s, x, y, cell, color) {
  g.fillStyle = color; let cx = x;
  for (const ch of s) {
    const gl = glyph(ch), o = off(ch);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r * 5 + c] === '#') g.fillRect(cx + (c + o) * cell, y + r * cell, cell + .02, cell + .02);
    cx += adv(ch) * cell;
  }
  return cx - x - cell;
}

// ── shapes ──
export function rrect(g, x, y, w, h, r = 0) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  g.beginPath(); if (!r) { g.rect(x, y, w, h); return; }
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ── cursors (drawn in screen px; s = UI scale) ──
const ARROW = [[0, 0], [0, 17.5], [4.6, 13.4], [7.9, 20.8], [10.9, 19.5], [7.6, 12.3], [13.2, 12.3]];
export function drawArrow(g, x, y, color, s = 1, a = 1) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 4 * s; g.shadowOffsetY = 1.5 * s;
  g.beginPath(); ARROW.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  g.fillStyle = color; g.fill(); g.shadowColor = 'transparent';
  g.lineJoin = 'round'; g.lineWidth = 1.3; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
  g.restore();
}
export function drawBeam(g, x, y, color, s = 1, a = 1) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); g.lineCap = 'round';
  const path = () => { g.beginPath(); g.moveTo(-3.5, -10); g.lineTo(-1, -10); g.lineTo(0, -8.5); g.lineTo(1, -10); g.lineTo(3.5, -10); g.moveTo(0, -8.5); g.lineTo(0, 8.5); g.moveTo(-3.5, 10); g.lineTo(-1, 10); g.lineTo(0, 8.5); g.lineTo(1, 10); g.lineTo(3.5, 10); };
  path(); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 4; g.stroke();
  path(); g.strokeStyle = color; g.lineWidth = 2; g.stroke();
  g.restore();
}
/** a name tag pill beside a cursor */
export function drawTag(g, x, y, label, color, s = 1, a = 1) {
  g.save(); g.globalAlpha = a; const st = { font: 'mono', size: 10.5 * s, weight: 600 }; setFont(g, st);
  const w = g.measureText(label).width + 10 * s, h = 16 * s;
  rrect(g, x, y, w, h, 4 * s); g.fillStyle = color; g.fill();
  g.fillStyle = luma(color) > .55 ? '#111118' : '#ffffff'; g.textBaseline = 'middle'; g.fillText(label, x + 5 * s, y + h / 2 + .5 * s);
  g.restore();
}
