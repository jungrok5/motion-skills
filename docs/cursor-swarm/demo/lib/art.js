// cursor-swarm · art.js — the "images" the agents drop into the page. Every one is drawn in code (no files, no AI images),
// seeded, so it is the same every frame. An art is fn(g, w, h, a, R): draw into a w × h box in page px; a = the args you
// passed, R = a seeded rng. Add the topic's own with defineArt(name, fn) in your page — the kit stays as it is.
import { rng, lerp, mix, alpha, rrect, pixelText, pixelWidth, setFont, n1 } from './core.js';

export const ART = {};
export const defineArt = (name, fn) => { ART[name] = fn; return name; };

/** pixel art from strings: rows of characters, palette maps a character to a colour ('.' or ' ' = transparent).
 *  Scaled to fill the box with square-ish pixels. */
defineArt('pixel', (g, w, h, a) => {
  const rows = a.rows, R = rows.length, Cn = Math.max(...rows.map(r => r.length)), cw = w / Cn, ch = h / R;
  if (a.bg) { g.fillStyle = a.bg; g.fillRect(0, 0, w, h); }
  for (let y = 0; y < R; y++) for (let x = 0; x < rows[y].length; x++) {
    const c = a.palette[rows[y][x]]; if (!c) continue; g.fillStyle = c; g.fillRect(x * cw, y * ch, cw + .3, ch + .3);
  }
});

/** a linear gradient: stops ['#a', '#b', …], angle in degrees (0 = left → right, 90 = top → bottom) */
defineArt('gradient', (g, w, h, a) => {
  const ang = (a.angle ?? 90) * Math.PI / 180, cx = w / 2, cy = h / 2, L = Math.abs(w * Math.cos(ang)) / 2 + Math.abs(h * Math.sin(ang)) / 2;
  const gr = g.createLinearGradient(cx - Math.cos(ang) * L, cy - Math.sin(ang) * L, cx + Math.cos(ang) * L, cy + Math.sin(ang) * L);
  const st = a.stops || ['#1b1b2f', '#e94560']; st.forEach((c, i) => gr.addColorStop(i / (st.length - 1), c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

/** a soft "photo": a background with blurred colour blobs (for a mood picture where a real photo would go) */
defineArt('blobs', (g, w, h, a, R) => {
  g.fillStyle = a.bg || '#222'; g.fillRect(0, 0, w, h);
  const cols = a.colors || ['#f4a261', '#e76f51', '#2a9d8f'], n = a.n || 7;
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = (.25 + R() * .45) * Math.max(w, h) * .6, c = cols[i % cols.length];
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, alpha(c, .85)); gr.addColorStop(1, alpha(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
});

/** a tiny screenshot of a web page (nav, hero, text lines, cards) — for "projects" or "case studies" */
defineArt('site', (g, w, h, a, R) => {
  const bg = a.bg || '#f4f1ea', fg = a.fg || '#1d1d1f', ac = a.accent || '#ff6b3d', u = w / 100;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = alpha(fg, .85); g.fillRect(6 * u, 5 * u, 14 * u, 2.6 * u);
  for (let i = 0; i < 4; i++) { g.fillStyle = alpha(fg, .35); g.fillRect((58 + i * 9) * u, 5.4 * u, 6 * u, 1.8 * u); }
  g.fillStyle = ac; rrect(g, 6 * u, 14 * u, 88 * u, h * .34, 2 * u); g.fill();
  g.fillStyle = alpha(fg, .9); g.fillRect(6 * u, 16 * u + h * .34, 46 * u, 3.6 * u);
  for (let i = 0; i < 3; i++) { g.fillStyle = alpha(fg, .3); g.fillRect(6 * u, 23 * u + h * .34 + i * 4 * u, (70 - R() * 30) * u, 1.8 * u); }
  const cy = h * .78; for (let i = 0; i < 3; i++) { g.fillStyle = mix(bg, fg, .08 + i * .03); rrect(g, (6 + i * 30) * u, cy, 27 * u, h * .16, 1.5 * u); g.fill(); }
});

/** a monogram avatar: text on a disc/square (a: text, bg, fg, font) */
defineArt('monogram', (g, w, h, a) => {
  g.fillStyle = a.bg || '#ffcf5c'; g.fillRect(0, 0, w, h);
  const st = { font: a.font || 'serif', size: Math.min(w, h) * (a.k || .46), weight: 700 }; setFont(g, st);
  g.fillStyle = a.fg || '#1b1b1f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a.text || 'A', w / 2, h / 2 + st.size * .04);
});

/** a pattern: kind 'dots' | 'stripes' | 'checker' | 'grid' (a: a, b colours, size) */
defineArt('pattern', (g, w, h, a) => {
  const s = a.size || 16, A = a.a || '#1d1d1f', B = a.b || '#f5d547'; g.fillStyle = A; g.fillRect(0, 0, w, h); g.fillStyle = B;
  for (let y = 0, j = 0; y < h + s; y += s, j++) for (let x = 0, i = 0; x < w + s; x += s, i++) {
    if (a.kind === 'stripes') { if (i % 2 === 0) g.fillRect(x, 0, s / 2, h); }
    else if (a.kind === 'checker') { if ((i + j) % 2 === 0) g.fillRect(x, y, s, s); }
    else if (a.kind === 'grid') { g.fillRect(x, 0, 1, h); g.fillRect(0, y, w, 1); }
    else { g.beginPath(); g.arc(x + s / 2, y + s / 2, s * .18, 0, 7); g.fill(); }
  }
});

/** a stylised street map with a pin (a: land, water, road, pin, river: true) */
defineArt('map', (g, w, h, a, R) => {
  g.fillStyle = a.land || '#ece6da'; g.fillRect(0, 0, w, h);
  if (a.river !== false) { g.strokeStyle = a.water || '#a9cfe0'; g.lineWidth = h * .12; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, h * .78); g.bezierCurveTo(w * .3, h * .62, w * .55, h * 1.02, w + 10, h * .82); g.stroke(); }
  g.strokeStyle = a.road || '#ffffff'; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) { const vert = i % 2, p = (.12 + R() * .76); g.lineWidth = i < 2 ? 7 : 3.5; g.beginPath(); if (vert) { g.moveTo(w * p, -5); g.lineTo(w * (p + (R() - .5) * .1), h + 5); } else { g.moveTo(-5, h * p); g.lineTo(w + 5, h * (p + (R() - .5) * .1)); } g.stroke(); }
  g.fillStyle = alpha(a.park || '#a8d5a2', .9); rrect(g, w * .08, h * .1, w * .2, h * .22, 4); g.fill();
  const px = w * (a.px ?? .58), py = h * (a.py ?? .42), pr = Math.min(w, h) * .07;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(px, py + pr * 1.9, pr * .7, pr * .25, 0, 0, 7); g.fill();
  g.fillStyle = a.pin || '#e2572b'; g.beginPath(); g.arc(px, py, pr, Math.PI * .85, Math.PI * .15); g.lineTo(px, py + pr * 1.9); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, pr * .38, 0, 7); g.fill();
});

/** a bar chart (a: values 0..1, color, bg, gap) */
defineArt('bars', (g, w, h, a) => {
  g.fillStyle = a.bg || 'transparent'; g.fillRect(0, 0, w, h);
  const v = a.values || [.3, .5, .8, .6, .9], n = v.length, gap = a.gap ?? .25, bw = w / (n + (n - 1) * gap);
  v.forEach((x, i) => { g.fillStyle = Array.isArray(a.color) ? a.color[i % a.color.length] : (a.color || '#4da3ff'); rrect(g, i * bw * (1 + gap), h * (1 - x), bw, h * x, bw * .18); g.fill(); });
});

/** pixel lettering on a background (a: text, bg, fg, cell) — a banner made of square pixels */
defineArt('pixel-text', (g, w, h, a) => {
  if (a.bg) { g.fillStyle = a.bg; g.fillRect(0, 0, w, h); }
  const cell = a.cell || Math.floor(Math.min(h / 9, w / (pixelWidth(a.text, 1) + 2)));
  pixelText(g, a.text, Math.round((w - pixelWidth(a.text, cell)) / 2 / cell) * cell, Math.round((h - 7 * cell) / 2 / cell) * cell, cell, a.fg || '#fff');
});

/** render an art into its own canvas at `res` device px per page px (cached by the caller) */
export function renderArt(name, args, w, h, res, seed) {
  const fn = typeof name === 'function' ? name : ART[name];
  if (!fn) throw new Error(`unknown art "${name}" — defineArt('${name}', (g, w, h, a, R) => { … }) first`);
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * res)); c.height = Math.max(1, Math.round(h * res));
  const g = c.getContext('2d'); g.scale(c.width / w, c.height / h); fn(g, w, h, args || {}, rng(seed)); return c;
}
export { n1, lerp };
