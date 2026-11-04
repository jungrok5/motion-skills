// sketchnote-explainer · kit.js — drawings any topic can use, all in the same hand: each is a function (o, K) → strokes in
// local coordinates around (0, 0), placed on the sheet by F.sketch(name, { x, y, s, flip, rot, … }).
// Strokes are drawn in the order they are listed: construction guides first, then the line, then the colour, then notes —
// the way the reference builds a drawing. Your topic's own drawings go in your film with defineSketch (board.js), written
// the same way (references/KIT.md).
import { C, circle, ellipse, arc, rect, roundRect, polygon, curve, lens, squiggle, rng, n1, clamp, lerp, easeOut, easeInOut, pencil, wash, write, mix } from './hand.js';

export const SKETCHES = {};
const def = (name, fn) => { SKETCHES[name] = fn; };

/** a bumpy cloud outline: circles along an ellipse */
export function cloudPts(w, h, seed = 1, bumps = 7) {
  const r = rng(seed), p = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = Math.PI + i / bumps * Math.PI * 2, a1 = a0 + Math.PI * 2 / bumps, R = .9 + r() * .3;
    for (let j = 0; j <= 6; j++) {
      const a = lerp(a0, a1, j / 6), bulge = Math.sin(j / 6 * Math.PI) * .3 * R;
      p.push([Math.cos(a) * w / 2 * (1 + bulge * .55), Math.sin(a) * h / 2 * (1 + bulge) * (Math.sin(a) > 0 ? .62 : 1)]);
    }
  }
  return p;
}
/** a rounded petal from near the centre out to r along angle a, w wide */
export function petal(a, r, w) {
  const ca = Math.cos(a), sa = Math.sin(a), P = ([u, v]) => [ca * u - sa * v, sa * u + ca * v];
  return curve([[r * .12, 0], [r * .4, w * .5], [r * .8, w * .46], [r, 0], [r * .8, -w * .46], [r * .4, -w * .5]].map(P), true, 6);
}
/** a teardrop, point up, centred on the round part */
export function dropPts(r) {
  const p = [];
  for (let i = 0; i <= 28; i++) { const a = -Math.PI / 2 + i / 28 * Math.PI * 2, s = Math.sin(a); p.push([Math.cos(a) * r * (s < 0 ? (1 + s) ** 1.4 * .95 + .05 : 1), s < 0 ? s * r * 1.9 : s * r]); }
  return p;
}

// ── objects ──
/** a cup on a saucer (≈ 340 × 230): liquid (colour or null), band (a coloured stripe across the cup), steam (true) */
def('cup', (o, K) => {
  const liquid = o.liquid === undefined ? C.coffee : o.liquid;
  const body = curve([[-110, -60], [-102, 8], [-66, 66], [0, 80], [66, 66], [102, 8], [110, -60]]);
  return [
    K.guide([[0, -120], [0, 128]]), K.guide(ellipse(0, -60, 118, 26)),
    K.line(ellipse(0, -60, 110, 22), { closed: true }),
    K.line(body),
    K.curve([[106, -34], [150, -40], [162, -4], [134, 30], [94, 36]]),
    K.line(arc(0, 96, 172, 28, 5.14, 10.56)),                                         // the saucer, behind the cup where it should be
    o.band && K.wash([[-104, 4], [104, 4], [94, 30], [-94, 30]], o.band, { off: [0, 2] }),
    liquid && K.wash(ellipse(0, -58, 100, 16), liquid, { off: [0, 2] }),
    liquid && K.dot(-40, -62, 7, mix(liquid, '#ffffff', .45), { off: [0, 0] }),
    o.steam && K.anim([-60, -230, 60, -80], (g, lt, k) => steam(g, lt, k, -60, -90, 120, 130, 3)),
  ];
});
/** a jar (≈ 170 × 240): fill colour, level (0…1), lid colour, tag (a word on the label) */
def('jar', (o, K) => {
  const fill = o.fill ?? C.honey, lvl = o.level ?? .72, top = -80, bot = 110, y = lerp(bot - 6, top + 6, lvl);
  return [
    K.guide([[0, -150], [0, 140]]),
    K.line(roundRect(-60, -126, 120, 46, 8), { closed: true }),
    K.line(roundRect(-82, -80, 164, 190, 26), { closed: true }),
    o.lid !== null && K.wash(roundRect(-60, -126, 120, 46, 8), o.lid || C.red),
    fill && K.wash([[-76, y], [76, y], ...arc(0, bot - 32, 76, 32, 0, Math.PI).map(([x, yy]) => [x, Math.max(y, yy)])], fill),
    K.line(curve([[-64, -50], [-66, 40], [-60, 80]]), { w: 1.4, color: '#fffaf0', alpha: .9, dur: .2 }),
    o.tag && K.line(roundRect(-52, -10, 104, 54, 6), { closed: true, w: 2 }),
    o.tag && K.wash(roundRect(-52, -10, 104, 54, 6), C.white, { off: [0, 0], alpha: .95 }),
    o.tag && K.text(o.tag, 0, -2, { size: 34, align: 'center', font: /[가-힣]/.test(o.tag) ? 'k' : undefined }),
  ];
});
/** a spoon lying left to right (≈ 300 × 80): fill (what is in the bowl) */
def('spoon', (o, K) => [
  K.line(lens(-150, 6, 40, 0, 16, .1), { closed: true }),
  K.line(ellipse(92, 0, 62, 34), { closed: true }),
  K.wash(ellipse(92, 0, 62, 34), C.grey, { alpha: .6 }),
  o.fill && K.wash(ellipse(98, 4, 40 * (o.amount ?? 1), 20 * (o.amount ?? 1)), o.fill),
]);
/** a leaf from (0, 0) along +x (≈ len × w): color, bend, veins */
def('leaf', (o, K) => {
  const L = o.len || 130, w = o.w || 56, b = o.bend ?? .3, out = [K.line(lens(0, 0, L, 0, w, b), { closed: true })];
  if (o.veins !== false) { out.push(K.line(curve([[4, 0], [L * .5, -b * w * .25], [L * .95, 0]]), { w: 1.6 })); for (let i = 1; i < 5; i++) { const x = L * i / 5.5; out.push(K.line([[x, -b * w * .2], [x + L * .1, -w * .36 * Math.sin(i / 5.5 * Math.PI)]], { w: 1.1, dur: .08 }), K.line([[x, -b * w * .2], [x + L * .1, w * .3 * Math.sin(i / 5.5 * Math.PI)]], { w: 1.1, dur: .08 })); } }
  out.push(K.wash(lens(0, 0, L, 0, w, b), o.color || C.leaf, { angle: 0 }));
  return out;
});
/** a flower seen from the front (≈ 2r across) on a stem: petals, color, center, stem (length, 0 = none) */
def('flower', (o, K) => {
  const n = o.petals || 6, r = o.r || 90, stem = o.stem ?? 170, out = [K.guide(circle(0, 0, r * 1.04)), K.guide([[-r * 1.2, 0], [r * 1.2, 0]])];
  const pet = i => petal(i / n * Math.PI * 2 - Math.PI / 2, r, r * 3.1 / n);
  if (stem) out.push(K.curve([[0, r * .96], [8, r + stem * .4], [-6, r + stem]]), K.line(lens(2, r + stem * .55, 70, r + stem * .32, 30, -.4), { closed: true }), K.wash(lens(2, r + stem * .55, 70, r + stem * .32, 30, -.4), C.leaf, { angle: 0 }));
  for (let i = 0; i < n; i++) out.push(K.line(pet(i), { closed: true, dur: .22 }));
  out.push(K.line(circle(0, 0, r * .24), { closed: true }));
  for (let i = 0; i < n; i++) out.push(K.wash(pet(i), o.color || C.pink, { dur: .12, angle: i / n * 6.28 }));
  out.push(K.wash(circle(0, 0, r * .24), o.center || C.yellow));
  return out;
});
/** a sun (≈ 2.6 r across): r, rays */
def('sun', (o, K) => {
  const r = o.r || 34, n = o.rays ?? 8, out = [K.line(circle(0, 0, r), { closed: true }), K.wash(circle(0, 0, r), C.yellow)];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - .3; out.push(K.line([[Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4], [Math.cos(a) * r * 1.85, Math.sin(a) * r * 1.85]], { color: C.red, w: 2.2, dur: .07 })); }
  return out;
});
/** a cloud (≈ w × h): color, rain (true: drops fall from it) */
def('cloud', (o, K) => {
  const w = o.w || 240, h = o.h || 110, p = cloudPts(w, h, o.seed || 3);
  return [K.line(p, { closed: true }), K.wash(p, o.color || '#e4e9ec', { off: [5, 4] }),
    o.rain && K.anim([-w * .4, h * .3, w * .4, h * .3 + (o.rainH || 160)], (g, lt, k) => rain(g, lt, k, -w * .38, h * .35, w * .76, o.rainH || 160))];
});
/** a water drop (≈ 2r × 3r): r, color */
def('drop', (o, K) => {
  const r = o.r || 26, p = dropPts(r);
  return [K.line(p, { closed: true }), K.wash(p, o.color || C.blue), K.line(arc(0, 0, r * .55, r * .55, 3.5, 4.4), { w: 2, color: '#ffffff', dur: .1, pen: false })];
});
/** a mountain (≈ w × h): color, snow */
def('mountain', (o, K) => {
  const w = o.w || 360, h = o.h || 220, p = [[-w / 2, 0], [-w * .2, -h * .62], [-w * .06, -h * .5], [w * .08, -h], [w / 2, 0]];
  const snow = [[w * .08, -h], [-w * .02, -h * .78], [w * .05, -h * .82], [w * .1, -h * .74], [w * .18, -h * .8]];
  return [K.line(p), K.wash([...p], o.color || C.leaf, { angle: -1.2 }), o.snow !== false && K.line(snow), o.snow !== false && K.wash([...snow, [w * .08, -h]], C.white, { off: [0, 0] })];
});
/** sea or a river (≈ w × 90): rows of waves over a blue band */
def('waves', (o, K) => {
  const w = o.w || 420, rows = o.rows || 3, out = [K.wash([[-w / 2, 0], [w / 2, 0], [w / 2, rows * 26 + 14], [-w / 2, rows * 26 + 14]], o.color || C.sky, { off: [0, 6] })];
  for (let i = 0; i < rows; i++) out.unshift(K.line(squiggle(-w / 2 + i * 14, i * 26, w / 2 - (rows - i) * 10, i * 26, Math.round(w / 70), 5), { w: 2.2, color: i ? C.navy : C.line }));
  return out;
});
/** red heat lines rising (≈ w × 70): n */
def('heat', (o, K) => {
  const n = o.n || 3, w = o.w || 110, out = [];
  for (let i = 0; i < n; i++) { const x = -w / 2 + i * w / (n - 1); out.push(K.line(squiggle(x, 34, x, -34, 1.5, 7), { color: C.red, w: 2.6, dur: .18 })); }
  return out;
});
/** a magnified cross-section: a circle with crosshair guides and a leader line to `to` ([x, y], local); inner: strokes
 *  around (0, 0) drawn inside it (write them with K) */
def('callout', (o, K) => {
  const r = o.r || 100, out = [K.guide([[-r * 1.25, 0], [r * 1.25, 0]]), K.guide([[0, -r * 1.25], [0, r * 1.25]]), K.line(circle(0, 0, r), { closed: true, w: 2.8 })];
  if (o.ring) out.push(K.wash(circle(0, 0, r), o.ring, { off: [3, 3] }));
  if (o.to) { const a = Math.atan2(o.to[1], o.to[0]); out.push(K.curve([[Math.cos(a) * r, Math.sin(a) * r], [(Math.cos(a) * r + o.to[0]) / 2 + 10, (Math.sin(a) * r + o.to[1]) / 2], o.to], { w: 1.8 })); }
  return [...out, ...(o.inner || [])];
});
/** a row of colour swatches filling in one after another, with labels under them */
def('swatches', (o, K) => {
  const cs = o.colors || [C.green, C.yellow, C.cinnamon, C.brown], ls = o.labels || [], s = o.size || 58, gap = o.gap || 50, out = [];
  cs.forEach((c, i) => { const x = i * (s + gap); out.push(K.line(rect(x, 0, s, s), { closed: true, w: 2, dur: .22 })); });
  cs.forEach((c, i) => { const x = i * (s + gap); out.push(K.wash(rect(x, 0, s, s), c, { off: [3, 3], wait: o.step || 0 })); if (ls[i]) out.push(K.text(ls[i], x + s / 2, s + 12, { size: o.labelSize || 28, align: 'center', font: /[가-힣]/.test(ls[i]) ? 'k' : undefined })); });
  return out;
});
/** a measuring tube whose level moves from `from` to `to` (0…1): h, w, color, label (fmt(v) → text), delay (s after it is
 *  drawn), dur (s the change takes), hold (s its beat waits for it) — the value is written in red beside it. A long delay
 *  with a short hold lets the level fall during the next beat. */
def('gauge', (o, K) => {
  const h = o.h || 240, w = o.w || 64, from = o.from ?? .8, to = o.to ?? .2, delay = o.delay ?? .5, dur = o.dur ?? 2.2;
  const fmt = o.label || (v => `${Math.round(v * 100)}%`), color = o.color || C.blue, size = o.size || 44;
  const out = [K.line(roundRect(-w / 2, -h, w, h, w / 2.4), { closed: true })];
  for (let i = 1; i < 5; i++) out.push(K.line([[-w / 2, -h * i / 5], [-w / 2 + 14, -h * i / 5]], { w: 1.6, dur: .06 }));
  out.push(K.anim([-w / 2, -h, w / 2 + 30 + size * 2.6, 0], (g, lt, k) => {
    const u = easeInOut((lt - delay) / dur), v = lerp(from, to, u), y = -h * v;
    if (v > .01) wash(g, [[-w / 2 + 4, y], [w / 2 - 4, y], ...arc(0, -w / 2.4, w / 2 - 4, w / 2.4 - 4, 0, Math.PI).map(([x, yy]) => [x, Math.max(y, yy)])], { color, k: clamp(k * 1.5), seed: 9, off: [0, 0] });
    if (k > .3) write(g, fmt(v), w / 2 + 24, y - size * .6, { size, color: C.red, k: clamp((k - .3) / .5) });
  }, { reveal: .6, hold: o.hold ?? delay + dur * .4 }));
  return out;
});
/** a burst of short ticks around a circle (something pops or cracks): r, n, color */
def('burst', (o, K) => {
  const r = o.r || 120, n = o.n || 10, out = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .2; out.push(K.line([[Math.cos(a) * r, Math.sin(a) * r], [Math.cos(a) * r * 1.16, Math.sin(a) * r * 1.16]], { color: o.color || C.red, w: 2.4, dur: .05 })); }
  return out;
});
/** brackets around something (≈ w × h) */
def('bracket', (o, K) => {
  const w = o.w || 220, h = o.h || 100;
  return [K.curve([[-w / 2 + 16, -h / 2], [-w / 2, 0], [-w / 2 + 16, h / 2]], { w: 3.4, dur: .2 }), K.curve([[w / 2 - 16, -h / 2], [w / 2, 0], [w / 2 - 16, h / 2]], { w: 3.4, dur: .2 })];
});
/** a honeycomb-like grid of hexagons: r, cols, rows, fills { 'col,row': colour }, skip ['col,row'] */
def('hexgrid', (o, K) => {
  const r = o.r || 40, cols = o.cols || 4, rows = o.rows || 3, fills = o.fills || {}, skip = new Set(o.skip || []), cells = [], out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (skip.has(`${i},${j}`)) continue; const x = i * r * Math.sqrt(3) + (j % 2) * r * Math.sqrt(3) / 2, y = j * r * 1.5; cells.push([i, j, x, y]); }
  for (const [, , x, y] of cells) out.push(K.line(polygon(x, y, r, 6), { closed: true, dur: .1, w: 2.2 }));
  for (const [i, j, x, y] of cells) if (fills[`${i},${j}`]) out.push(K.wash(polygon(x, y, r * .86, 6), fills[`${i},${j}`], { dur: .12, off: [2, 2] }));
  return out;
});
/** steam rising (≈ w × h, base at y = 0) */
def('steam', (o, K) => [K.anim([-(o.w || 120) / 2, -(o.h || 140), (o.w || 120) / 2, 0], (g, lt, k) => steam(g, lt, k, -(o.w || 120) / 2, 0, o.w || 120, o.h || 140, o.n || 3))]);
/** rain falling in a box (w × h, top at y = 0) */
def('rain', (o, K) => [K.anim([-(o.w || 200) / 2, 0, (o.w || 200) / 2, o.h || 160], (g, lt, k) => rain(g, lt, k, -(o.w || 200) / 2, 0, o.w || 200, o.h || 160))]);

// ── moving parts (anim draw functions, local coordinates) ──
/** n wavy lines rising from y0, drifting and fading, looping */
export function steam(g, lt, k, x0, y0, w, h, n = 3) {
  for (let i = 0; i < n; i++) {
    const x = x0 + w * (i + .5) / n, ph = lt * .7 + i * .37, pts = [];
    for (let j = 0; j <= 14; j++) { const u = j / 14; pts.push([x + Math.sin(u * 5 + ph * 4 + i) * 9 * (.4 + u), y0 - u * h * (.75 + .25 * Math.sin(ph + i))]); }
    pencil(g, pts, { w: 1.8, color: C.soft, k: clamp(k * 1.3 - i * .15), seed: 40 + i, alpha: .65 });
  }
}
/** short slanted strokes falling, looping */
export function rain(g, lt, k, x0, y0, w, h) {
  const r = rng(77), n = Math.round(w / 18);
  g.save(); g.globalAlpha *= clamp(k * 2); g.strokeStyle = C.blue; g.lineCap = 'round'; g.lineWidth = 2.2;
  for (let i = 0; i < n; i++) { const x = x0 + r() * w, sp = .7 + r() * .5, y = y0 + ((r() + lt * sp) % 1) * h; g.globalAlpha = clamp(k * 2) * (1 - (y - y0) / h) * .9; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.stroke(); }
  g.restore();
}
