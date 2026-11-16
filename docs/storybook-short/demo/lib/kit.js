// storybook-short · kit.js — painters for picture-book backgrounds, in the same media as the characters.
// Each paints into a plate (world coordinates) once; nothing here runs per frame. Crayon for big areas (sky, hills,
// walls, water), gouache for small solid forms (windows, clouds, fruit), ink for edges and grass blades, dry brush for
// trunks. The paper always shows a little through the crayon (tooth). Mix and extend: a topic that needs a lighthouse,
// a tram window or a greenhouse writes its own painter in the film's folder with the same calls.
import * as P from './paint.js';
const INK = '#2a1f24';
const R = (s) => P.rng(s);

/** sky: horizontal crayon strokes from `top` to `bottom` colour, the paper speckling through */
export function sky(ctx, bb, { top = '#7fb3e0', bottom = '#e8eff2', seed = 1, alpha = .75 } = {}) {
  const [x0, y0, x1, y1] = bb, n = 7;
  for (let i = 0; i < n; i++) {
    const ya = P.lerp(y0, y1, i / n) - 6, yb = P.lerp(y0, y1, (i + 1) / n) + 6, col = P.mix(top, bottom, (i + .5) / n);
    P.crayon(ctx, [[x0, ya], [x1, ya], [x1, yb], [x0, yb]], { color: col, angle: -.05, gap: 3.6, width: 2.6, alpha, underAlpha: .45, tooth: .5, seed: seed + i, roughness: 0, wobble: 2 });
  }
}
/** a cloud: overlapping gouache lobes on a flat belly, a lavender crayon shade underneath, a broken ink edge on top */
export function cloud(ctx, x, y, w, { seed = 1, shade = '#c9cde6', ink = true } = {}) {
  const r = R(seed), n = 4 + Math.floor(r() * 3), lobes = [];
  for (let i = 0; i < n; i++) { const u = (i + .5) / n, rr = w * (.13 + Math.sin(u * Math.PI) * .12 + r() * .05); lobes.push([x + (u - .5) * w * .8, y - rr * (.35 + r() * .3), rr]); }
  const clip = [[x - w, y - w], [x + w, y - w], [x + w, y + 2], [x - w, y + 2]];
  ctx.save(); P.path(ctx, clip); ctx.clip();
  lobes.forEach(([lx, ly, lr], i) => P.gouache(ctx, P.ellipse(lx, ly, lr, lr * .92, 30), { color: '#fbfaf6', seed: seed + i, mottle: .25, edge: .08, roughness: 1.5 }));
  P.crayon(ctx, [[x - w, y - w * .12], [x + w, y - w * .12], [x + w, y + 4], [x - w, y + 4]], { color: shade, angle: -.05, gap: 3.2, alpha: .55, under: false, seed: seed + 9 });
  ctx.restore();
  if (ink) lobes.forEach(([lx, ly, lr], i) => { const arc = []; for (let k = 0; k <= 12; k++) { const t = Math.PI * (1.15 + k / 12 * .7); arc.push([lx + Math.cos(t) * lr, ly + Math.sin(t) * lr * .92]); } P.ink(ctx, arc, { width: 1.1, color: '#7d88a8', seed: seed + 20 + i, alpha: .45 }); });
}
/** a hill or bank: a crayon field under a curve, then grass blades and a few flowers */
export function hill(ctx, curve, bottom, { colors = ['#8cbf5a', '#6aa14a'], blades = ['#4f8a3a', '#7fb550', '#a9cf68'], flowers = ['#f2a7c3', '#fbf3e0', '#f2c94c'], density = 1, seed = 1 } = {}) {
  const poly = [...curve, [curve[curve.length - 1][0], bottom], [curve[0][0], bottom]], r = R(seed);
  P.gouache(ctx, poly, { color: colors[0], seed, mottle: .3, edge: 0, roughness: 1 });
  P.crayon(ctx, poly, { colors, angle: -.25, gap: 3, width: 2.4, alpha: .7, under: false, tooth: .45, seed: seed + 1, cross: .3 });
  const C = P.resample(curve, 3), bb = P.bounds(poly);
  ctx.save(); P.path(ctx, poly); ctx.clip(); ctx.lineCap = 'round';
  const n = Math.round((bb[2] - bb[0]) * (bb[3] - bb[1]) / 900 * density);
  for (let i = 0; i < n; i++) {
    const x = bb[0] + r() * (bb[2] - bb[0]), yTop = C.reduce((m, p) => Math.abs(p[0] - x) < Math.abs(m[0] - x) ? p : m, C[0])[1], y = yTop + Math.pow(r(), 1.6) * (bottom - yTop);
    const k = .4 + (y - yTop) / (bottom - yTop + 1) * .9, h = (8 + r() * 14) * k;
    ctx.strokeStyle = P.css(blades[Math.floor(r() * blades.length)], .55 + r() * .4); ctx.lineWidth = .9 + r() * 1.2 * k;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (r() - .5) * 4, y - h * .6, x + (r() - .5) * 8, y - h); ctx.stroke();
  }
  ctx.restore();
  // tall grass along the top edge, leaning in the wind
  for (let i = 0; i < C.length; i += 2) { if (r() > .55 * density) continue; const [x, y] = C[i], h = 10 + r() * 26; ctx.strokeStyle = P.css(blades[Math.floor(r() * blades.length)], .8); ctx.lineWidth = 1.1 + r(); ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + 3, y - h * .5, x + 6 + r() * 6, y - h); ctx.stroke(); }
  const fl = []; for (let i = 0; i < n * .03; i++) { const x = bb[0] + r() * (bb[2] - bb[0]), yTop = C.reduce((m, p) => Math.abs(p[0] - x) < Math.abs(m[0] - x) ? p : m, C[0])[1]; fl.push([x, yTop + 6 + r() * (bottom - yTop) * .7, .7 + r() * .6]); }
  if (flowers.length) P.dabs(ctx, fl, { colors: flowers, r: 3, seed: seed + 4 });
}
/** water: horizontal crayon bands with lighter streaks and glints; `ripple` ink ticks */
export function water(ctx, bb, { colors = ['#5f93c6', '#3f74ad', '#86b6d9'], seed = 1, glints = 60 } = {}) {
  const [x0, y0, x1, y1] = bb, r = R(seed);
  P.gouache(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { color: colors[0], seed, mottle: .2, edge: 0, roughness: 0 });
  P.crayon(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { colors, angle: 0, gap: 3, width: 2.4, alpha: .75, under: false, tooth: .4, seed: seed + 1, roughness: 0 });
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < glints; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 6 + r() * 26; ctx.strokeStyle = `rgba(250,250,245,${.35 + r() * .45})`; ctx.lineWidth = 1.2 + r() * 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + (r() - .5) * 2); ctx.stroke(); }
  ctx.restore();
}
/** ground / a path: crayon band with pebbles */
export function ground(ctx, poly, { colors = ['#e8d3a6', '#d9bf8a'], pebbles = ['#b9a27a', '#cdb68c', '#9c8a6a'], seed = 1, n = 120 } = {}) {
  P.gouache(ctx, poly, { color: colors[0], seed, mottle: .3, edge: 0, roughness: 1 });
  P.crayon(ctx, poly, { colors, angle: -.15, gap: 3.2, alpha: .65, under: false, tooth: .5, seed: seed + 1 });
  const bb = P.bounds(poly), r = R(seed + 2), pts = []; for (let i = 0; i < n; i++) pts.push([bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), .5 + r()]);
  ctx.save(); P.path(ctx, poly); ctx.clip(); P.dabs(ctx, pts, { colors: pebbles, r: 2.4, seed: seed + 3, alpha: .7 }); ctx.restore();
}
/** a tree. kind: 'round' (lobed crown), 'poplar' (tall flame), 'pine' (umbrella pine). colors: foliage ramp */
export function tree(ctx, x, y, h, { kind = 'round', colors = ['#6aa84f', '#4f8a3a', '#9cc95e'], trunk = '#8a5a3a', seed = 1 } = {}) {
  const r = R(seed), tw = h * .045;
  P.dryBrush(ctx, [[x, y], [x + (r() - .5) * tw, y - h * .35], [x + (r() - .5) * tw * 2, y - h * .62]], { width: tw * 2, colors: [[trunk, 3], [P.shade(trunk, -.3), 1]], load: .9, alpha: .95, seed, taper: [.05, .3] });
  let crown;
  if (kind === 'poplar') crown = P.spline([[x, y - h], [x + h * .13, y - h * .7], [x + h * .12, y - h * .4], [x, y - h * .28], [x - h * .12, y - h * .4], [x - h * .13, y - h * .7]], 6, true);
  else if (kind === 'pine') crown = P.spline([[x - h * .32, y - h * .72], [x - h * .2, y - h * .9], [x + h * .05, y - h * .95], [x + h * .3, y - h * .86], [x + h * .36, y - h * .74], [x, y - h * .68]], 6, true);
  else { crown = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2, k = 1 + .12 * Math.sin(t * 5 + seed); crown.push([x + Math.cos(t) * h * .3 * k, y - h * .66 + Math.sin(t) * h * .3 * k]); } }
  if (kind !== 'poplar') for (let i = 0; i < 3; i++) P.ink(ctx, [[x, y - h * .5], [x + (i - 1) * h * .12, y - h * .62], [x + (i - 1) * h * .18, y - h * .75]], { width: tw * .6, color: P.shade(trunk, -.2), seed: seed + 10 + i });
  P.gouache(ctx, crown, { color: colors[0], seed: seed + 1, mottle: .4, edge: .2, roughness: 2.5, shadow: [x + h * .1, y - h * .5, .35, h * .4] });
  P.crayon(ctx, crown, { colors, angle: kind === 'poplar' ? 1.45 : -.6, gap: 2.8, alpha: .75, under: false, tooth: .45, seed: seed + 2, scribble: kind === 'poplar' ? 0 : .6 });
  P.ink(ctx, crown.slice(0, Math.floor(crown.length * .7)), { width: 1.2, color: P.shade(colors[1], -.4), seed: seed + 3, alpha: .5 });
}
/** a house front. o: wall, roof ('gable' | 'flat'), roofColor, rows, cols, shutters, door, awning [c1, c2], boxes (flower boxes) */
export function house(ctx, x, y, w, h, o = {}) {
  const s = o.seed || 1, r = R(s), wall = o.wall || '#e9a46a', roofC = o.roofColor || '#c0573a';
  const facade = [[x, y], [x + w, y], [x + w, y - h], [x, y - h]];
  P.gouache(ctx, facade, { color: wall, seed: s, mottle: .4, edge: .25, roughness: 1.4 });
  P.crayon(ctx, facade, { color: wall, angle: 1.35, gap: 3.2, alpha: .6, under: false, tooth: .5, seed: s + 1 });
  P.crayon(ctx, [[x + w * .78, y], [x + w, y], [x + w, y - h], [x + w * .78, y - h]], { color: P.shade(wall, -.2), angle: 1.3, gap: 4, alpha: .35, under: false, seed: s + 2 });
  if (o.roof !== 'flat') { const roof = [[x - w * .06, y - h], [x + w * .5, y - h - w * .42], [x + w * 1.06, y - h]]; P.gouache(ctx, roof, { color: roofC, seed: s + 3, mottle: .4, edge: .35 }); P.crayon(ctx, roof, { color: roofC, angle: .2, gap: 3, alpha: .6, under: false, seed: s + 4 }); P.ink(ctx, roof, { width: 1.4, color: INK, seed: s + 5, alpha: .6 }); }
  else { const lip = [[x - 6, y - h - 12], [x + w + 6, y - h - 12], [x + w + 6, y - h], [x - 6, y - h]]; P.gouache(ctx, lip, { color: roofC, seed: s + 3, mottle: .3, edge: .4 }); }
  const rows = o.rows ?? 2, cols = o.cols ?? 2, ww = w / (cols * 2 + 1) * 1.1, wh = Math.min(h / (rows * 2 + 1) * 1.3, ww * 1.6);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const cx = x + w * (j + .5) / cols, cy = y - h + (i + .55) * (h - (o.door ? h * .32 : 0)) / rows, win = [[cx - ww / 2, cy - wh / 2], [cx + ww / 2, cy - wh / 2], [cx + ww / 2, cy + wh / 2], [cx - ww / 2, cy + wh / 2]];
    if (o.arch) { win[0][1] += ww * .2; win[1][1] += ww * .2; }
    P.gouache(ctx, win, { color: o.glass || '#3c4a72', seed: s + 10 + i * 9 + j, mottle: .3, edge: .4, roughness: .8 });
    if (r() < .5) P.gouache(ctx, [[cx - ww / 2 + 2, cy - wh / 2 + 2], [cx - ww / 2 + ww * .35, cy - wh / 2 + 2], [cx - ww / 2 + ww * .35, cy + wh / 2 - 2], [cx - ww / 2 + 2, cy + wh / 2 - 2]], { color: '#f3d98a', seed: s + 40 + i * 9 + j, mottle: .2, edge: .2 }); // a curtain / lit pane
    if (o.shutters) for (const sd of [-1, 1]) P.crayon(ctx, [[cx + sd * ww / 2, cy - wh / 2], [cx + sd * ww * .95, cy - wh / 2], [cx + sd * ww * .95, cy + wh / 2], [cx + sd * ww / 2, cy + wh / 2]], { color: o.shutters, angle: 1.4, gap: 2.6, alpha: .9, underAlpha: .8, seed: s + 60 + i * 9 + j + sd });
    P.ink(ctx, [...win, win[0]], { width: 1.2, color: INK, seed: s + 80 + i * 9 + j, alpha: .55, taper: [0, 0] });
    if (o.boxes && i === rows - 1) { P.gouache(ctx, [[cx - ww * .6, cy + wh / 2], [cx + ww * .6, cy + wh / 2], [cx + ww * .55, cy + wh / 2 + 8], [cx - ww * .55, cy + wh / 2 + 8]], { color: '#8a5a3a', seed: s + 90 + j }); P.dabs(ctx, Array.from({ length: 6 }, (_, k) => [cx - ww * .5 + k * ww * .2, cy + wh / 2 - 3 + (k % 2) * 2, .9]), { colors: o.boxes, r: 4, seed: s + 95 + j }); }
  }
  if (o.door) { const dw = w * .22, dx = x + w * (o.doorX ?? .5) - dw / 2, door = [[dx, y], [dx + dw, y], [dx + dw, y - h * .3], [dx + dw / 2, y - h * .34], [dx, y - h * .3]]; P.gouache(ctx, P.spline(door, 4, true), { color: o.door, seed: s + 100, mottle: .4, edge: .4 }); P.ink(ctx, door, { width: 1.3, color: INK, seed: s + 101, alpha: .6 }); }
  if (o.awning) { const ay = y - h * .38, aw = [[x - 4, ay], [x + w + 4, ay], [x + w + 14, ay + 34], [x - 14, ay + 34]]; stripes(ctx, aw, o.awning, 14, s + 110); scallop(ctx, x - 14, x + w + 14, ay + 34, o.awning[0], s + 111); }
  P.ink(ctx, [[x, y - h], [x, y]], { width: 1.3, color: INK, seed: s + 120, alpha: .45 }); P.ink(ctx, [[x + w, y - h], [x + w, y]], { width: 1.3, color: INK, seed: s + 121, alpha: .45 });
}
/** vertical stripes clipped to a shape (awnings, deckchairs, tablecloths) */
export function stripes(ctx, poly, colors, width, seed = 1) {
  const bb = P.bounds(poly); ctx.save(); P.path(ctx, poly); ctx.clip();
  let i = 0; for (let x = bb[0] - width; x < bb[2] + width; x += width) { P.crayon(ctx, [[x, bb[1] - 4], [x + width, bb[1] - 4], [x + width + 10, bb[3] + 4], [x + 10, bb[3] + 4]], { color: colors[i++ % colors.length], angle: 1.3, gap: 2.6, alpha: .9, underAlpha: .85, seed: seed + i, tooth: .35 }); }
  ctx.restore(); P.ink(ctx, [...poly, poly[0]], { width: 1.3, color: INK, seed: seed + 50, alpha: .55, taper: [0, 0] });
}
export function scallop(ctx, x0, x1, y, color, seed = 1) {
  const n = Math.max(3, Math.round((x1 - x0) / 26)), w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10 * Math.PI; pts.push([x0 + i * w + w / 2 - Math.cos(t) * w / 2, y + Math.sin(t) * w * .4]); } P.gouache(ctx, pts, { color: i % 2 ? '#fbf6ec' : color, seed: seed + i, mottle: .2, edge: .4 }); P.ink(ctx, pts, { width: 1, color: INK, seed: seed + 30 + i, alpha: .5 }); }
}
/** a market stall: a table with crates of fruit under a striped awning on two poles */
export function stall(ctx, x, y, w, { awning = ['#e0503a', '#fbf3e3'], fruit = [['#f08a24', '#e9b13a'], ['#d6402e', '#b83226'], ['#9cc34a', '#f2d24a']], cloth = '#3f74ad', seed = 1 } = {}) {
  const h = w * .9, r = R(seed);
  for (const sx of [x + 8, x + w - 8]) P.ink(ctx, [[sx, y], [sx, y - h]], { width: 4, color: '#6a4a32', seed: seed + sx });
  const aw = [[x - 10, y - h], [x + w + 10, y - h], [x + w + 26, y - h + 50], [x - 26, y - h + 50]];
  stripes(ctx, aw, awning, 18, seed + 1); scallop(ctx, x - 26, x + w + 26, y - h + 50, awning[0], seed + 2);
  const table = [[x - 8, y - h * .38], [x + w + 8, y - h * .38], [x + w + 4, y], [x - 4, y]];
  P.gouache(ctx, table, { color: cloth, seed: seed + 3, mottle: .4, edge: .3 }); P.crayon(ctx, table, { color: cloth, angle: 1.3, gap: 3, alpha: .55, under: false, seed: seed + 4 });
  const nb = fruit.length, cw = w / nb;
  fruit.forEach((cols, i) => {
    const cx = x + cw * i + 6, crate = [[cx, y - h * .38], [cx + cw - 12, y - h * .38], [cx + cw - 12, y - h * .38 - 34], [cx, y - h * .38 - 34]];
    P.gouache(ctx, crate, { color: '#c89a62', seed: seed + 10 + i, mottle: .3, edge: .5 }); P.ink(ctx, [[cx, y - h * .38 - 17], [cx + cw - 12, y - h * .38 - 17]], { width: 1, color: '#7a5a3a', seed: seed + 20 + i, alpha: .6 });
    const pts = []; for (let k = 0; k < 9; k++) pts.push([cx + 10 + (k % 5) * (cw - 30) / 4 + (r() - .5) * 4, y - h * .38 - 36 - Math.floor(k / 5) * 12 + (r() - .5) * 3, 1]);
    P.dabs(ctx, pts, { colors: cols, r: Math.min(11, cw * .09), seed: seed + 30 + i });
  });
}
/** a park bench (front view): slats, an iron frame; returns the seat height above y */
export function bench(ctx, x, y, w, { wood = '#c98d4f', iron = '#3a3236', seed = 1, seat = 70 } = {}) {
  const sk = seat / 70;
  for (const sx of [x + w * .1, x + w * .9]) P.ink(ctx, [[sx, y], [sx, y - seat], [sx + 4, y - seat - 70 * sk]], { width: 5 * sk, color: iron, seed: seed + sx });
  for (let i = 0; i < 3; i++) { const yy = y - seat - (22 + i * 20) * sk, sl = [[x, yy], [x + w, yy], [x + w, yy - 13 * sk], [x, yy - 13 * sk]]; P.gouache(ctx, sl, { color: wood, seed: seed + i, mottle: .4, edge: .4 }); P.crayon(ctx, sl, { color: wood, angle: .05, gap: 2.6, alpha: .6, under: false, seed: seed + 5 + i }); P.ink(ctx, [...sl, sl[0]], { width: 1, color: INK, seed: seed + 9 + i, alpha: .5, taper: [0, 0] }); }
  const st = [[x - 6, y - seat], [x + w + 6, y - seat], [x + w + 4, y - seat + 12 * sk], [x - 4, y - seat + 12 * sk]]; P.gouache(ctx, st, { color: P.shade(wood, -.08), seed: seed + 20, mottle: .4, edge: .4 }); P.ink(ctx, [...st, st[0]], { width: 1.1, color: INK, seed: seed + 21, alpha: .5, taper: [0, 0] });
  return seat;
}
export function lamp(ctx, x, y, h, { color = '#2f3a3a', seed = 1 } = {}) {
  P.ink(ctx, [[x, y], [x, y - h]], { width: 5, color, seed }); P.ink(ctx, [[x - 10, y], [x + 10, y]], { width: 6, color, seed: seed + 1 });
  const g = [[x - 11, y - h], [x + 11, y - h], [x + 7, y - h - 26], [x - 7, y - h - 26]]; P.gouache(ctx, g, { color: '#f4dc8a', seed: seed + 2, mottle: .3, edge: .5 }); P.ink(ctx, [...g, g[0]], { width: 1.5, color, seed: seed + 3, taper: [0, 0] });
  P.ink(ctx, [[x - 14, y - h - 26], [x, y - h - 38], [x + 14, y - h - 26]], { width: 3, color, seed: seed + 4 });
}
export function fence(ctx, x0, x1, y, { color = '#b58a5c', h = 46, gap = 34, seed = 1 } = {}) {
  for (let x = x0; x <= x1; x += gap) P.ink(ctx, [[x, y], [x + 1, y - h]], { width: 5, color, seed: seed + x, taper: [0, 0] });
  for (const yy of [y - h * .35, y - h * .8]) P.ink(ctx, [[x0 - 6, yy], [x1 + 6, yy + 1]], { width: 4, color: P.shade(color, -.1), seed: seed + yy, taper: [0, 0] });
}
/** a window seen from inside: frame, the view (a callback paints it), curtains, sill. Returns the sill y. */
export function window_(ctx, x, y, w, h, { view, frame = '#f6f1e6', curtain = ['#e9867a', '#fbf1e2'], seed = 1 } = {}) {
  const glass = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  ctx.save(); P.path(ctx, glass); ctx.clip(); if (view) view(ctx, [x, y, x + w, y + h]); ctx.restore();
  for (const [fx, fy, fw, fh] of [[x - 14, y - 14, w + 28, 16], [x - 14, y + h - 2, w + 28, 18], [x - 14, y - 14, 16, h + 30], [x + w - 2, y - 14, 16, h + 30], [x + w / 2 - 6, y, 12, h]]) { const rr = [[fx, fy], [fx + fw, fy], [fx + fw, fy + fh], [fx, fy + fh]]; P.gouache(ctx, rr, { color: frame, seed: seed + fx + fy, mottle: .3, edge: .3, roughness: .8 }); P.ink(ctx, [...rr, rr[0]], { width: 1.1, color: INK, seed: seed + fx * 3, alpha: .45, taper: [0, 0] }); }
  for (const sd of [-1, 1]) { const cx = sd < 0 ? x - 30 : x + w + 30, c = [[cx - 40 * sd, y - 30], [cx + 40 * sd * .2, y - 30], [cx + sd * 30, y + h * .6], [cx + sd * 10, y + h + 20], [cx - 40 * sd, y + h + 20]]; stripes(ctx, P.spline(c, 6, true), curtain, 13, seed + 200 + sd); }
  const sill = [[x - 40, y + h + 14], [x + w + 40, y + h + 14], [x + w + 46, y + h + 34], [x - 46, y + h + 34]]; P.gouache(ctx, sill, { color: P.shade(frame, -.06), seed: seed + 300, mottle: .3, edge: .4 }); P.ink(ctx, [...sill, sill[0]], { width: 1.2, color: INK, seed: seed + 301, alpha: .5, taper: [0, 0] });
  return y + h + 14;
}
/** a potted plant on a surface at y */
export function pot(ctx, x, y, s, { pot: pc = '#d9734e', leaves = ['#5f9e4a', '#8cc05a'], seed = 1, flowers = null } = {}) {
  const r = R(seed);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .32 + (r() - .5) * .2, L = s * (.9 + r() * .7); const tip = [x + Math.cos(a) * L, y - s * .5 + Math.sin(a) * L]; P.gouache(ctx, P.spline([[x, y - s * .5], [(x + tip[0]) / 2 + 8, (y - s * .5 + tip[1]) / 2], tip, [(x + tip[0]) / 2 - 8, (y - s * .5 + tip[1]) / 2]], 3, true), { color: leaves[i % leaves.length], seed: seed + i, mottle: .3, edge: .5 }); if (flowers && i % 2) P.dabs(ctx, [[tip[0], tip[1], 1]], { colors: flowers, r: s * .12, seed: seed + 20 + i }); }
  const pp = [[x - s * .45, y - s * .55], [x + s * .45, y - s * .55], [x + s * .34, y], [x - s * .34, y]]; P.gouache(ctx, pp, { color: pc, seed: seed + 9, mottle: .4, edge: .4 }); P.crayon(ctx, pp, { color: pc, angle: .2, gap: 3, alpha: .5, under: false, seed: seed + 10 }); P.ink(ctx, [...pp, pp[0]], { width: 1.2, color: INK, seed: seed + 11, alpha: .55, taper: [0, 0] });
}
/** a wall: crayon over a tint, an optional skirting line */
export function wall(ctx, bb, { color = '#f2dcae', stripe = null, seed = 1 } = {}) {
  const [x0, y0, x1, y1] = bb, poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  P.gouache(ctx, poly, { color, seed, mottle: .3, edge: 0, roughness: 0 }); P.crayon(ctx, poly, { color, angle: 1.4, gap: 3.4, alpha: .55, under: false, tooth: .5, seed: seed + 1, roughness: 0 });
  if (stripe) for (let x = x0; x < x1; x += 60) P.crayon(ctx, [[x, y0], [x + 14, y0], [x + 14, y1], [x, y1]], { color: stripe, angle: 1.45, gap: 3, alpha: .35, under: false, seed: seed + x });
}
/** the painted area's ragged edge: the paper comes in over the corners, as in a picture-book spread */
export function vignette(ctx, W, H, { paper = '#fbf8f2', seed = 1, inset = 40 } = {}) {
  const r = R(seed); ctx.save(); ctx.fillStyle = P.css(paper);
  for (let side = 0; side < 4; side++) for (let i = 0; i < 46; i++) {
    const u = r(), along = side % 2 ? H : W, d = inset * (.25 + r() * .7) * (1 + 1.4 * Math.pow(Math.abs(u - .5) * 2, 6));
    const x = side === 0 ? u * W : side === 1 ? W - d / 2 : side === 2 ? u * W : d / 2, y = side === 0 ? d / 2 : side === 1 ? u * H : side === 2 ? H - d / 2 : u * H;
    P.dryBrush(ctx, side % 2 ? [[x, y - 50], [x, y + 50]] : [[x - 50, y], [x + 50, y]], { width: d, colors: [[paper, 1]], load: .95, alpha: 1, seed: seed + side * 100 + i, lw: [2, 4] });
    void along;
  }
  ctx.restore();
}
