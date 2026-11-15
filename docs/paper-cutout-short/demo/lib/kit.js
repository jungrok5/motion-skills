// paper-cutout-short · kit.js — set pieces cut from paper, for painting into layers and props (F.layer / F.prop). They are
// examples of the style's grammar, not a menu: compose new things for each topic from P.piece and the shapes in paper.js the
// same way (torn coloured paper with a white rim, flat colour, one soft light, details as smaller pieces or thin ink).
//
//   K.backdrop(c, w, h, { stops })        the big painted sheet behind everything (a dyed / watercolour-washed sky)
//   K.cloud(c, x, y, w, h, col)           torn cloud, flat bottom          K.hills(c, x0, x1, y, { amp, col })
//   K.waves(c, x0, x1, y, { col })         a scalloped sea strip (slide strips against each other)
//   K.house(c, x, y, spec) → { windows, door }   walls, scalloped tile roof, chimney, windows, door, a flower box …
//   K.cobbles(c, x0, x1, y, h, { palette })     K.grass(c, x0, x1, y, { flowers })
//   K.sun(c, r) · K.moon(c, r) · K.starPiece(c, r)   (origin = centre)    K.string(c, x, y0, y1) · K.stick(c, x, y0, y1)
//   K.lamp(c, spec) · K.boat(c, spec) · K.lighthouse(c, spec) · K.tree(c, spec)   (origin = where it stands)
//   K.flame(c, r) · K.beam(c, len, spread) · K.pane(c, rect, shape) · K.label(c, title, sub, spec)
import { piece, ink, dot, dab, rect, rrect, arch, ellipse, capsule, blob, cloudShape, crescent, star, burst, shift, tear, rng, hash, mix, tone, rgba, CREAM, TAU } from './paper.js';

export const FONT = 'PaperSerif, "Source Serif 4", "Noto Serif CJK KR", "Noto Serif KR", "Nanum Myeongjo", Georgia, serif';

/** the backdrop sheet: gradient stops top → bottom, mottled like watercolour on rag paper, with a few crumple shadows */
export function backdrop(c, w, h, o = {}) {
  const stops = o.stops || ['#f0a35e', '#e4877a', '#9a6fa6', '#5d4f8c'], R = rng(o.seed || 5);
  piece(c, rect(-20, -20, w + 40, h + 40), stops[0], { grad: stops, edge: 'cut', tex: .75, light: .25, rough: 0 });
  // watercolour blooms
  for (let i = 0; i < (o.blooms ?? 18); i++) { const x = R() * w, y = R() * h, r = 80 + R() * 260; dab(c, x, y, r, R() < .5 ? '#ffffff' : '#2a1838', .05 + R() * .05); }
  // crumple: soft creases
  c.save(); c.globalCompositeOperation = 'soft-light';
  for (let i = 0; i < (o.creases ?? 7); i++) {
    const x = R() * w, y = R() * h, a = R() * Math.PI, L = 300 + R() * 600, g = c.createLinearGradient(x, y, x + Math.cos(a + Math.PI / 2) * 40, y + Math.sin(a + Math.PI / 2) * 40);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.18)'); g.addColorStop(.52, 'rgba(0,0,0,.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = g; c.translate(-x, -y); c.fillRect(x - L / 2, y - 40, L, 80); c.restore();
  }
  c.restore();
}
export function cloud(c, x, y, w, h, col = '#c7b2cf', o = {}) { return piece(c, cloudShape(x, y, w, h, o.bumps ?? 4, o.seed ?? Math.round(x + y)), col, { light: .45, ...o }); }
/** a hill strip: wavy top at y (± amp), filled down to y + depth */
export function hills(c, x0, x1, y, o = {}) {
  const amp = o.amp ?? 40, depth = o.depth ?? 300, wl = o.wave ?? 520, ph = o.phase ?? 0, pts = [];
  for (let x = x0; x <= x1; x += 24) pts.push([x, y - amp * (.5 + .5 * Math.sin((x / wl) * TAU + ph)) - amp * .3 * Math.sin((x / wl) * TAU * 2.3 + ph * 2)]);
  pts.push([x1, y + depth], [x0, y + depth]);
  return piece(c, pts, o.col || '#6f8a5e', { light: .3, ...o });
}
/** a sea strip: scallops along the top (crest every `wl` px), depth below */
export function waves(c, x0, x1, y, o = {}) {
  const wl = o.wave ?? 90, amp = o.amp ?? 16, depth = o.depth ?? 160, pts = [];
  for (let x = x0; x <= x1; x += wl) for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; pts.push([x + wl / 2 + Math.cos(a) * wl / 2, y + Math.sin(a) * amp]); }
  pts.push([x1 + wl, y + depth], [x0, y + depth]);
  piece(c, pts, o.col || '#4f7aa0', { light: .35, rim: o.rim ?? 3, ...o });
  if (o.foam) for (let x = x0; x <= x1; x += wl) ink(c, [[x + wl * .25, y - amp * .55], [x + wl * .5, y - amp * .9], [x + wl * .72, y - amp * .6]], { col: CREAM, w: 3, a: .7 });
}
/** a window pane piece (lit or dark) at rect r = [x, y, w, h] (y = top), shape 'arch' | 'square' | 'round' */
export function pane(c, r, shape = 'arch', col = '#ffd27a', o = {}) {
  const [x, y, w, h] = r;
  const pts = shape === 'round' ? ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 24) : shape === 'square' ? rrect(x, y, w, h, 3) : arch(x, y + h, w, h);
  piece(c, pts, col, { edge: 'cut', light: .2, tex: .35, ...o });
  if (o.bars !== false) { ink(c, [[x + w / 2, y + (shape === 'arch' ? w * .18 : 3)], [x + w / 2, y + h - 3]], { col: o.barCol || '#7a5a3a', w: 2.6, a: .85 }); ink(c, [[x + 3, y + h * .55], [x + w - 3, y + h * .55]], { col: o.barCol || '#7a5a3a', w: 2.6, a: .85 }); }
}
/**
 * a house standing on (x, y) = bottom-left. spec = { w: 230, h: 260 (walls), wall, roof, roofH: 150, tiles: true (scalloped rows) | false,
 *   trim: cream window frames, door: { x: .5 (centre, 0…1), w: 70, h: 110, col, shape: 'arch' }, windows: [[cx (0…1), cy (0…1 from the top), w, h, shape]…],
 *   chimney: .72 | null, flowers: index of a window with a flower box, bucket, lit: '#ffd27a' (pane colour) | null (dark panes) }
 * → { windows: [[x, y, w, h, shape]…], door: [x, y, w, h], roofTop: [x, y] } in the same px, for lit panes and glows
 */
export function house(c, x, y, s = {}) {
  const w = s.w ?? 230, h = s.h ?? 260, rh = s.roofH ?? 150, wall = s.wall || '#e9b860', roof = s.roof || '#d9785a', trim = s.trim || '#f2e3c4', seed = s.seed ?? Math.round(x);
  const R = rng(seed), top = y - h, over = s.over ?? 26;
  if (s.chimney != null) piece(c, rect(x + w * s.chimney, top - rh * .9, 34, rh * .7), tone(roof, -.15), { light: .3 });
  if (s.chimney != null) piece(c, rect(x + w * s.chimney - 5, top - rh * .95, 44, 14), tone(roof, -.3), { light: .3 });
  piece(c, rect(x, top, w, h), wall, { light: .4, tex: .65 });
  // roof: a triangle cut, then rows of scalloped tiles laid from the eaves up (each row a strip of half-discs)
  const apex = [x + w / 2, top - rh], L = [x - over, top + 12], Rr = [x + w + over, top + 12];
  piece(c, [L, apex, Rr], tone(roof, -.12), { light: .35, lift: 4 });
  if (s.tiles !== false) {
    const rows = s.rows ?? 5;
    for (let r = 0; r < rows; r++) {
      const k0 = r / rows, k1 = (r + 1) / rows, yy = lerp(L[1], apex[1], k0), y1 = lerp(L[1], apex[1], k1);
      const xl = lerp(L[0], apex[0], k1), xr = lerp(Rr[0], apex[0], k1), xl0 = lerp(L[0], apex[0], k0), xr0 = lerp(Rr[0], apex[0], k0);
      const n = Math.max(2, Math.round((xr0 - xl0) / 40)), tw = (xr0 - xl0) / n, pts = [[xr, y1], [xl, y1]];
      for (let i = 0; i < n; i++) for (let j = 0; j <= 8; j++) { const a = Math.PI - j / 8 * Math.PI; pts.push([xl0 + tw * (i + .5) + Math.cos(a) * tw / 2, yy + Math.sin(a) * tw * .45]); }
      piece(c, pts, mix(roof, R() < .5 ? '#ffffff' : '#000000', R() * .12), { light: .45, lift: 3, rim: 2.2 });
    }
  }
  const out = { windows: [], door: null, roofTop: apex };
  const d = s.door === null ? null : { x: .5, w: 70, h: 112, col: '#8a4f3a', shape: 'arch', ...(s.door || {}) };
  if (d) {
    const dx = x + w * d.x - d.w / 2;
    piece(c, d.shape === 'arch' ? arch(dx - 7, y + 2, d.w + 14, d.h + 8) : rect(dx - 7, y - d.h - 7, d.w + 14, d.h + 9), trim, { light: .3, edge: 'cut' });
    piece(c, d.shape === 'arch' ? arch(dx, y + 2, d.w, d.h) : rect(dx, y - d.h, d.w, d.h + 2), d.col, { light: .4, lift: 2 });
    dot(c, dx + d.w * .78, y - d.h * .45, 5, '#e4c26a'); out.door = [dx, y - d.h, d.w, d.h];
  }
  for (const [cx, cy, ww, hh, shape = 'arch'] of s.windows || [[.25, .3, 44, 62], [.75, .3, 44, 62]]) {
    const wx = x + w * cx - ww / 2, wy = top + h * cy - hh / 2;
    piece(c, shape === 'arch' ? arch(wx - 6, wy + hh + 6, ww + 12, hh + 12) : shape === 'round' ? ellipse(wx + ww / 2, wy + hh / 2, ww / 2 + 6, hh / 2 + 6, 24) : rrect(wx - 6, wy - 6, ww + 12, hh + 12, 4), trim, { light: .3, edge: 'cut' });
    pane(c, [wx, wy, ww, hh], shape, s.lit || '#5a4a62', { bars: true, barCol: s.lit ? '#9a6a3a' : '#3a2e40' });
    piece(c, rect(wx - 9, wy + hh + 2, ww + 18, 9), trim, { light: .3, lift: 2 });
    out.windows.push([wx, wy, ww, hh, shape]);
  }
  if (s.flowers != null && out.windows[s.flowers]) {
    const [wx, wy, ww, hh] = out.windows[s.flowers];
    piece(c, rect(wx - 6, wy + hh - 4, ww + 12, 16), '#9a5a3a', { light: .3, lift: 3 });
    for (let i = 0; i < 4; i++) { const fx = wx + 2 + i * ww / 3.3; piece(c, ellipse(fx, wy + hh - 8, 7, 7, 12), ['#f08aa0', '#ffd27a', '#f6f0e0', '#e86a7a'][i], { rim: 1.5, light: .3 }); dot(c, fx, wy + hh - 8, 2.4, '#c9853a'); }
  }
  return out;
}
const lerp = (a, b, u) => a + (b - a) * u;
/** a road of rounded cobbles between y and y + h */
export function cobbles(c, x0, x1, y, h, o = {}) {
  const pal = o.palette || ['#d9b99a', '#c9a3b4', '#e4c9a0', '#b9a4c4', '#d6a98e'], R = rng(o.seed || 9);
  piece(c, rect(x0, y, x1 - x0, h + 40), o.base || '#b69a8c', { edge: 'cut', light: .2 });
  const rows = o.rows ?? 4, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = x0 - R() * 60; const sc = .75 + r / rows * .5;
    while (x < x1 + 40) { const sw = (60 + R() * 50) * sc; piece(c, rrect(x + 3, y + r * rh + 4, sw - 6, rh - 6, rh * .45), pal[Math.floor(R() * pal.length)], { light: .5, rim: 2.2, lift: 2 }); x += sw; }
  }
}
/** foreground grass: pointed blades with small cut flowers (paint into a blurred layer: o = { flowers: 14, cols, h }) */
export function grass(c, x0, x1, y, o = {}) {
  const R = rng(o.seed || 21), H = o.h ?? 70, cols = o.cols || ['#5e8a4e', '#79a05a', '#4a7445', '#8bb06a'];
  piece(c, rect(x0, y, x1 - x0, 400), o.ground || '#4a6e40', { edge: 'cut', light: .2 });
  for (let x = x0; x < x1; x += 12 + R() * 16) {
    const hh = H * (.5 + R() * .7), lean = (R() - .5) * 30, bw = 10 + R() * 10;
    piece(c, [[x - bw / 2, y + 30], [x + lean * .5 - bw * .2, y - hh * .6], [x + lean, y - hh], [x + lean * .5 + bw * .25, y - hh * .5], [x + bw / 2, y + 30]], cols[Math.floor(R() * cols.length)], { rim: 1.6, light: .4, rough: 1.4 });
  }
  const fl = o.flowers ?? 14, fc = o.flowerCols || ['#f6f0e0', '#ffd96a', '#b9c8f0', '#f6f0e0'];
  for (let i = 0; i < fl; i++) {
    const fx = x0 + R() * (x1 - x0), fy = y - 10 - R() * H * .6, r = 9 + R() * 7;
    piece(c, burst(fx, fy, r * .55, r, 5, R()), fc[i % fc.length], { rim: 1.5, light: .35, edge: 'cut' }); dot(c, fx, fy, r * .3, '#e0a43a');
  }
}
/** the sun (origin = centre): a ray ring and a disc */
export function sun(c, r = 60, o = {}) {
  piece(c, burst(0, 0, r * 1.02, r * 1.4, o.rays ?? 12, .1), o.ray || '#f2a33c', { light: .4 });
  piece(c, ellipse(0, 0, r, r, 40), o.col || '#f07a2a', { light: .5, lift: 3 });
  dab(c, -r * .3, -r * .3, r * .6, '#ffe6a0', .35);
}
export function moon(c, r = 60, o = {}) { piece(c, crescent(0, 0, r, o.dx ?? .42, o.dy ?? -.2), o.col || '#f6dc8a', { light: .5 }); }
export function starPiece(c, r = 14, o = {}) { piece(c, star(0, 0, r, .45), o.col || '#f6dc8a', { light: .4, rim: 1.6 }); }
/** a thread from y0 down to y1 at x (a hanging prop) — paint into the prop sprite above its top */
export function string(c, x, y0, y1, o = {}) { ink(c, [[x, y0], [x + (o.sag ?? .6), (y0 + y1) / 2], [x, y1]], { col: o.col || '#e9dcc4', w: o.w ?? 1.6, a: .9 }); }
/** a wooden dowel from y0 down to y1 (a prop held up from below the set) */
export function stick(c, x, y0, y1, o = {}) { piece(c, rect(x - (o.w ?? 5), y0, (o.w ?? 5) * 2, y1 - y0), o.col || '#c9a46a', { edge: 'cut', rough: .4, light: .5, tex: .4 }); }
/** a street lamp, origin = the foot of the post. spec = { h: 300, col: '#3d3b4a', glass: '#5a4a62' (or a lit colour) } → { light: [x, y] } */
export function lamp(c, s = {}) {
  const h = s.h ?? 300, col = s.col || '#3d3b4a';
  piece(c, rect(-16, -18, 32, 18), tone(col, -.1), { light: .3 });
  piece(c, rect(-6, -h + 30, 12, h - 40), col, { light: .35, edge: 'cut' });
  piece(c, [[-12, -h + 34], [12, -h + 34], [26, -h + 10], [-26, -h + 10]], col, { light: .3 });
  piece(c, [[-20, -h + 10], [20, -h + 10], [24, -h - 46], [-24, -h - 46]], s.glass || '#5a4a62', { light: .3, edge: 'cut' });
  piece(c, [[-34, -h - 44], [34, -h - 44], [0, -h - 78]], col, { light: .4, lift: 2 });
  dot(c, 0, -h - 80, 6, col);
  return { light: [0, -h - 18] };
}
/** a small paper flame, origin = its base */
export function flame(c, r = 18, o = {}) {
  piece(c, [[-r * .6, 0], [-r * .7, -r * .8], [-r * .2, -r * 1.6], [0, -r * 2.4], [r * .3, -r * 1.5], [r * .7, -r * .8], [r * .6, 0]], o.col || '#f39a3a', { rim: 1.8, light: .3 });
  piece(c, [[-r * .3, 0], [-r * .35, -r * .6], [0, -r * 1.4], [r * .35, -r * .6], [r * .3, 0]], o.core || '#ffe08a', { edge: 'cut', light: .1 });
}
/** a vellum light beam (translucent): from the origin out to len, spread px wide at the end, pointing +x */
export function beam(c, len = 700, spread = 260, o = {}) {
  const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba(o.col || '#fff0b8', o.a ?? .55)); g.addColorStop(1, rgba(o.col || '#fff0b8', 0));
  c.save(); c.fillStyle = g; c.beginPath(); const pts = tear([[0, -14], [len, -spread / 2], [len, spread / 2], [0, 14]], { rough: 3, seed: 4 }); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.fill(); c.restore();
}
/** a sailboat, origin = waterline centre. spec = { w: 220, hull, sail, sail2, flag } */
export function boat(c, s = {}) {
  const w = s.w ?? 220;
  piece(c, rect(-3, -w * .95, 7, w * .95), '#8a6a4a', { edge: 'cut', light: .4 });
  piece(c, [[6, -w * .9], [w * .42, -w * .14], [6, -w * .14]], s.sail || '#f3e6cc', { light: .5 });
  piece(c, [[-6, -w * .78], [-w * .34, -w * .16], [-6, -w * .16]], s.sail2 || '#e9c9a6', { light: .45 });
  piece(c, [[3, -w * .95], [w * .16, -w * .9], [3, -w * .85]], s.flag || '#d9604a', { rim: 1.4, light: .3 });
  piece(c, [[-w * .52, -w * .14], [w * .52, -w * .14], [w * .36, w * .06], [-w * .38, w * .06]], s.hull || '#b8574a', { light: .45, lift: 3 });
  piece(c, rect(-w * .44, -w * .1, w * .86, 9), s.stripe || '#f2e3c4', { edge: 'cut', light: .2 });
}
/** a lighthouse, origin = its foot. spec = { h: 520, w: 120, a: '#f2e3c4', b: '#c9574a', glass } → { lamp: [x, y] } */
export function lighthouse(c, s = {}) {
  const h = s.h ?? 520, w = s.w ?? 120, bands = s.bands ?? 4;
  for (let i = 0; i < bands; i++) {
    const y0 = -h * .82 * i / bands, y1 = -h * .82 * (i + 1) / bands, k0 = 1 - .28 * i / bands, k1 = 1 - .28 * (i + 1) / bands;
    piece(c, [[-w / 2 * k0, y0 + 2], [w / 2 * k0, y0 + 2], [w / 2 * k1, y1], [-w / 2 * k1, y1]], i % 2 ? (s.b || '#c9574a') : (s.a || '#f2e3c4'), { light: .45, lift: i ? 2 : 0 });
  }
  const top = -h * .82, gw = w * .62;
  piece(c, rect(-gw / 2 - 12, top - 12, gw + 24, 14), '#4a3a48', { light: .3, lift: 2 });
  piece(c, rect(-gw / 2, top - 76, gw, 64), s.glass || '#5a4a62', { edge: 'cut', light: .3 });
  ink(c, [[0, top - 76], [0, top - 12]], { col: '#3a2e40', w: 3 });
  piece(c, [[-gw / 2 - 14, top - 74], [gw / 2 + 14, top - 74], [0, top - 120]], s.b || '#c9574a', { light: .45, lift: 2 });
  piece(c, arch(-16, -2, 32, 52), '#6a4a3a', { light: .3, lift: 2 });
  return { lamp: [0, top - 44] };
}
/** a round tree, origin = the foot of the trunk. spec = { h: 260, r: 90, leaf, trunk } */
export function tree(c, s = {}) {
  const h = s.h ?? 260, r = s.r ?? 90;
  piece(c, [[-12, 0], [-8, -h * .55], [8, -h * .55], [12, 0]], s.trunk || '#8a6248', { light: .4 });
  piece(c, blob(0, -h + r * .7, r, r * .9, 6, s.seed ?? 3), s.leaf || '#6f9a58', { light: .5, lift: 3 });
  piece(c, blob(-r * .25, -h + r * .45, r * .55, r * .45, 5, (s.seed ?? 3) + 1), tone(s.leaf || '#6f9a58', .12), { light: .4, rim: 2 });
}
/**
 * the title label: a pinned paper tag with the title and a small spaced subtitle (the style's one piece of type).
 * origin = top-left. spec = { w: 380, h: 150, col: CREAM, ink: '#3a2b2e', size: 54, subSize: 15, tape: true } → [w, h]
 */
export function label(c, title, sub = '', s = {}) {
  const w = s.w ?? 380, h = s.h ?? (sub ? 150 : 110), size = s.size ?? 54;
  piece(c, rect(0, 0, w, h), s.col || '#f3ead8', { edge: 'cut', rough: .8, light: .35, tex: .7, lift: 4 });
  c.save(); c.fillStyle = s.ink || '#3a2b2e'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = `600 ${size}px ${FONT}`; c.fillText(title, w / 2, h * (sub ? .52 : .64));
  if (sub) { c.font = `500 ${s.subSize ?? 15}px ${FONT}`; c.letterSpacing = '3px'; c.globalAlpha = .8; c.fillText(sub.toUpperCase(), w / 2, h * .8); }
  c.restore();
  if (s.tape !== false) piece(c, rect(w / 2 - 34, -14, 68, 26), 'rgba(240,226,190,.75)', { edge: 'torn', rim: 0, alpha: .75, light: .1, tex: .3 });
  return [w, h];
}
