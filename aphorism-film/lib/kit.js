// aphorism-film · kit.js — the illustration language: flat colour, one cel shadow, ink outlines, and pattern everywhere.
// Painters draw in stage units (the film is 1920 × 1080) and take o.seed (or o.R) so the same call paints the same picture.
// They are meant for plates (painted once at build time); the few marked "per frame" are cheap enough to call in a shot.
//
//   ink basics: INK, path, shape, outline, smoothPath, leafPath
//   surfaces:   pattern (damask · checker · diamond · stripes · rosette · botanical · dots · scales · tiles · grid),
//               stoneWall, cracks, marble, collage (pinned papers), wallpaper (a pattern with a frame rail)
//   nature:     leaf, foliage (mound or hanging), flowers (rose · hydrangea · daisy · tulip), vine, grassEdge, sun
//   things:     frame (poster · portrait · abstract · clockface), paper (a printed sheet), microtext, clock (per frame),
//               hourglass (per frame), books, lamp, door, window, chair
//   space:      room (one-point perspective box: floor, walls, ceiling — returns where things go), floorTiles
import { TAU, clamp, lerp, rng, hash, noise2, mix, rgba, shade, vary } from './core.js';

export const INK = '#17121c';
export const PALETTES = {
  // the reference look: vermilion, cobalt, emerald, cream, black, with saffron and pink accents
  pop: { red: '#d8322a', red2: '#a8231f', blue: '#2346b8', blue2: '#162a78', cyan: '#3aa6c9', green: '#1f7a45', green2: '#0f4f33', lime: '#8fc24a', cream: '#f1e6cc', cream2: '#dccdaa', yellow: '#f2b51d', pink: '#ec6f9b', purple: '#5a3a9a', black: '#17121c', white: '#fbf7ee', skin: '#f4cdb0' },
};
const R0 = o => o.R || rng(o.seed ?? 1);

// ---------- ink basics ----------
export function path(ctx, pts, close = true) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (close) ctx.closePath(); }
export function smoothPath(ctx, pts, close = true) {
  const n = pts.length; ctx.beginPath();
  if (close) {
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const a = pts[i], b = pts[i + 1]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
// fill the current path, then ink it. lw 0 = no line.
export function outline(ctx, fill, lw = 3, col = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
export function shape(ctx, pts, fill, lw = 3, o = {}) { (o.smooth ? smoothPath : path)(ctx, pts, o.open ? false : true); outline(ctx, o.open ? null : fill, lw, o.col); }
// a pointed leaf from its base along angle a
export function leafPath(ctx, x, y, len, wid, a, bend = 0) {
  const c = Math.cos(a), s = Math.sin(a), P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const tip = P(len, bend * len * .2), l1 = P(len * .35, -wid), l2 = P(len * .75, -wid * .55 + bend * len * .12), r1 = P(len * .35, wid), r2 = P(len * .75, wid * .55 + bend * len * .12);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(l1[0], l1[1], l2[0], l2[1], tip[0], tip[1]); ctx.bezierCurveTo(r2[0], r2[1], r1[0], r1[1], x, y); ctx.closePath();
  return { tip, mid: P(len * .5, bend * len * .06) };
}

// ---------- nature ----------
export function leaf(ctx, x, y, len, wid, a, fill, o = {}) {
  const L = leafPath(ctx, x, y, len, wid, a, o.bend || 0); outline(ctx, fill, o.lw ?? Math.max(1, len * .05), o.col);
  if (o.rib !== false && len > 18) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(L.mid[0], L.mid[1], lerp(x, L.tip[0], .8), lerp(y, L.tip[1], .8)); ctx.lineWidth = Math.max(.8, len * .025); ctx.strokeStyle = o.ribCol || rgba(INK, .55); ctx.stroke(); }
}
// a mound (or, hang:true, a hanging mass) of flat leaves inside the ellipse box x, y, w, h: shadow leaves first, lit last.
// o.pal = [deep, mid, light, highlight], o.shadow = a blue/purple shadow tone, o.size = leaf length, o.n = count
export function foliage(ctx, x, y, w, h, o = {}) {
  const R = R0(o), pal = o.pal || ['#0f4f33', '#1f7a45', '#3f9a4f', '#8fc24a'], sz = o.size || 34, n = o.n || Math.round(w * h / (sz * sz) * 1.6);
  const cx = x + w / 2, cy = y + h / 2, hang = o.hang;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, r = Math.sqrt(R());
    let px = cx + Math.cos(a) * r * w / 2, py = cy + Math.sin(a) * r * h / 2;
    if (o.flat) py = Math.max(py, cy - h / 2 + (1 - Math.abs(px - cx) / (w / 2)) * 0); // keep it a mound
    const lit = hang ? clamp((py - y) / h) : clamp(1 - (py - y) / h);  // mounds: top lit; hanging: the bottom fringe lit
    pts.push({ px, py, lit: clamp(lit * .8 + R() * .35 - (Math.abs(px - cx) / w) * .3) });
  }
  pts.sort((a, b) => a.lit - b.lit);
  for (const p of pts) {
    const k = p.lit, col = o.shadow && k < .18 ? o.shadow : pal[Math.min(pal.length - 1, Math.floor(k * pal.length))];
    const ang = hang ? Math.PI / 2 + (R() - .5) * 1.8 : -Math.PI / 2 + (R() - .5) * 2.4 + (p.px - cx) / w * 1.2;
    const L = sz * (.7 + R() * .6);
    leaf(ctx, p.px, p.py, L, L * (o.wide || .32), ang, vary(col, R, .04), { lw: o.lw ?? Math.max(1.2, L * .045), rib: o.rib ?? L > 26, bend: (R() - .5) * 1.2 });
  }
}
// blossoms scattered in a box. kind: rose | hydrangea | daisy | tulip | star
export function flowers(ctx, x, y, w, h, o = {}) {
  const R = R0(o), n = o.n || 12, kind = o.kind || 'rose', cols = o.cols || ['#d8322a', '#ec6f9b'], s0 = o.size || 22, lw = o.lw ?? 2;
  for (let i = 0; i < n; i++) {
    const px = x + R() * w, py = y + R() * h, s = s0 * (.75 + R() * .5), c = cols[Math.floor(R() * cols.length)];
    if (kind === 'rose') {
      ctx.beginPath(); ctx.arc(px, py, s, 0, TAU); outline(ctx, c, lw);
      ctx.strokeStyle = shade(c, -.45); ctx.lineWidth = lw * .9;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(px + (R() - .5) * s * .3, py + (R() - .5) * s * .3, s * (.75 - k * .22), R() * TAU, R() * TAU + 3.6); ctx.stroke(); }
    } else if (kind === 'hydrangea') {
      for (let k = 0; k < 9; k++) { const a = R() * TAU, r = Math.sqrt(R()) * s * 1.3, fx = px + Math.cos(a) * r, fy = py + Math.sin(a) * r * .8, q = s * .38;
        ctx.beginPath(); for (let j = 0; j < 4; j++) { const b = j * TAU / 4 + a; ctx.ellipse(fx + Math.cos(b) * q * .55, fy + Math.sin(b) * q * .55, q * .55, q * .4, b, 0, TAU); }
        outline(ctx, vary(c, R, .06), lw * .7); }
    } else if (kind === 'daisy') {
      for (let j = 0; j < 9; j++) { const b = j * TAU / 9; ctx.beginPath(); ctx.ellipse(px + Math.cos(b) * s * .6, py + Math.sin(b) * s * .6, s * .5, s * .2, b, 0, TAU); outline(ctx, '#fbf7ee', lw * .7); }
      ctx.beginPath(); ctx.arc(px, py, s * .32, 0, TAU); outline(ctx, '#f2b51d', lw * .7);
    } else if (kind === 'tulip') {
      ctx.beginPath(); ctx.moveTo(px, py + s * 2.2); ctx.lineTo(px, py + s * .6); ctx.lineWidth = lw * 1.4; ctx.strokeStyle = '#1f7a45'; ctx.stroke();
      shape(ctx, [[px - s * .7, py - s * .2], [px - s * .5, py + s * .8], [px + s * .5, py + s * .8], [px + s * .7, py - s * .2], [px + s * .3, py + s * .1], [px, py - s * .5], [px - s * .3, py + s * .1]], c, lw);
    } else {
      ctx.beginPath(); for (let j = 0; j < 10; j++) { const b = j * TAU / 10 - Math.PI / 2, r = j % 2 ? s * .45 : s; j ? ctx.lineTo(px + Math.cos(b) * r, py + Math.sin(b) * r) : ctx.moveTo(px + Math.cos(b) * r, py + Math.sin(b) * r); } ctx.closePath(); outline(ctx, c, lw);
    }
  }
}
export function vine(ctx, x, y, len, o = {}) {
  const R = R0(o), pts = []; let px = x, py = y, a = o.a ?? Math.PI / 2;
  for (let i = 0; i < 14; i++) { pts.push([px, py]); a += (R() - .5) * .5; px += Math.cos(a) * len / 14; py += Math.sin(a) * len / 14; }
  smoothPath(ctx, pts, false); ctx.lineWidth = o.lw ?? 3; ctx.strokeStyle = o.stem || '#0f4f33'; ctx.stroke();
  pts.forEach((p, i) => { if (i % 1 === 0 && i) leaf(ctx, p[0], p[1], (o.size || 22) * (.7 + R() * .5), (o.size || 22) * .35, a + (i % 2 ? 1 : -1) * (.6 + R() * .6) + (R() - .5), vary((o.pal || ['#1f7a45', '#3f9a4f'])[i % 2], R), { lw: 1.6 }); });
}
// a strip of grass blades along y (the front of a lawn, a ledge, the edge of a floor)
export function grassEdge(ctx, x, y, w, o = {}) {
  const R = R0(o), h = o.h || 24, n = Math.round(w / (o.gap || 7));
  ctx.lineWidth = o.lw ?? 1.6; ctx.strokeStyle = INK;
  for (let i = 0; i < n; i++) {
    const px = x + (i + R()) * w / n, bh = h * (.5 + R() * .8), lean = (R() - .5) * h * .6;
    ctx.beginPath(); ctx.moveTo(px - 3, y); ctx.quadraticCurveTo(px + lean * .4, y - bh * .6, px + lean, y - bh); ctx.quadraticCurveTo(px + lean * .3, y - bh * .5, px + 3, y); ctx.closePath();
    ctx.fillStyle = vary((o.pal || ['#1f7a45', '#3f9a4f', '#8fc24a'])[Math.floor(R() * 3)], R); ctx.fill(); ctx.stroke();
  }
}
// a flat poster sun: disc + concentric rings (per frame ok)
export function sun(ctx, x, y, r, o = {}) {
  const cols = o.cols || ['#f2b51d', '#ec6f9b', '#d8322a'];
  for (let i = cols.length - 1; i >= 0; i--) { ctx.beginPath(); ctx.arc(x, y, r * (1 + i * .35), 0, TAU); ctx.fillStyle = i ? rgba(cols[i], o.ringA ?? .55) : cols[0]; ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); outline(ctx, null, o.lw ?? 4);
}

// ---------- surfaces ----------
// fill a rect with a pattern. o.pal = [ground, a, b, c] colours; o.s = cell size
export function pattern(ctx, kind, x, y, w, h, o = {}) {
  const R = R0(o), p = o.pal || ['#d8322a', '#f2b51d', '#2346b8', '#17121c'], s = o.s || 90, lw = o.lw ?? 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = p[0]; ctx.fillRect(x, y, w, h);
  const cells = (fn, sx = s, sy = s, off = 0) => { for (let j = -1, row = 0; y + j * sy < y + h + sy; j++, row++) for (let i = -1; x + i * sx < x + w + sx; i++) fn(x + i * sx + (row % 2 ? off : 0), y + j * sy, i, j); };
  if (kind === 'checker') cells((cx, cy, i, j) => { if ((i + j) % 2 === 0) { ctx.fillStyle = p[1]; ctx.fillRect(cx, cy, s, s); } });
  else if (kind === 'tiles') cells((cx, cy) => { ctx.fillStyle = vary(p[1], R, .05); ctx.fillRect(cx + 2, cy + 2, s - 4, s - 4); ctx.strokeStyle = p[3] || INK; ctx.lineWidth = lw; ctx.strokeRect(cx + 2, cy + 2, s - 4, s - 4); ctx.fillStyle = rgba('#ffffff', .18); ctx.fillRect(cx + 6, cy + 6, (s - 12) * .5, 4); });
  else if (kind === 'diamond') cells((cx, cy) => { shape(ctx, [[cx + s / 2, cy], [cx + s, cy + s / 2], [cx + s / 2, cy + s], [cx, cy + s / 2]], p[1], lw, { col: p[3] }); ctx.beginPath(); ctx.arc(cx + s / 2, cy + s / 2, s * .12, 0, TAU); outline(ctx, p[2], lw * .7, p[3]); });
  else if (kind === 'stripes') { for (let i = 0, X = x; X < x + w; i++, X += s / 2) { ctx.fillStyle = p[1 + i % 3] || p[1]; if (i % 2) ctx.fillRect(X, y, s / 2, h); } }
  else if (kind === 'dots') cells((cx, cy) => { ctx.beginPath(); ctx.arc(cx + s / 2, cy + s / 2, s * .16, 0, TAU); outline(ctx, p[1], lw * .6, p[3]); }, s, s, s / 2);
  else if (kind === 'scales') cells((cx, cy, i, j) => { ctx.beginPath(); ctx.arc(cx + s / 2, cy + s / 2, s / 2, Math.PI, 0); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx, cy + s); ctx.closePath(); outline(ctx, j % 2 ? p[1] : p[2], lw, p[3]); }, s, s * .5, s / 2);
  else if (kind === 'grid') { ctx.strokeStyle = p[1]; ctx.lineWidth = lw; for (let X = x; X < x + w; X += s) { ctx.beginPath(); ctx.moveTo(X, y); ctx.lineTo(X, y + h); ctx.stroke(); } for (let Y = y; Y < y + h; Y += s) { ctx.beginPath(); ctx.moveTo(x, Y); ctx.lineTo(x + w, Y); ctx.stroke(); } }
  else if (kind === 'rosette') cells((cx, cy) => {
    const X = cx + s / 2, Y = cy + s / 2;
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * s * .26, Y + Math.sin(a) * s * .26, s * .17, s * .07, a, 0, TAU); outline(ctx, k % 2 ? p[1] : p[2], lw * .6, p[3]); }
    ctx.beginPath(); ctx.arc(X, Y, s * .12, 0, TAU); outline(ctx, p[2], lw * .7, p[3]); ctx.beginPath(); ctx.arc(X, Y, s * .45, 0, TAU); outline(ctx, null, lw * .6, p[3]);
  }, s, s);
  else if (kind === 'damask') cells((cx, cy) => {
    const X = cx + s / 2, Y = cy + s / 2, q = s * .42;
    const m = [[0, -q], [q * .35, -q * .45], [q * .75, -q * .15], [q * .35, q * .2], [q * .2, q * .7], [0, q], [-q * .2, q * .7], [-q * .35, q * .2], [-q * .75, -q * .15], [-q * .35, -q * .45]];
    shape(ctx, m.map(([a, b]) => [X + a, Y + b]), p[1], lw * .8, { smooth: true, col: p[3] });
    shape(ctx, m.map(([a, b]) => [X + a * .5, Y + b * .5]), p[2], lw * .6, { smooth: true, col: p[3] });
    ctx.beginPath(); ctx.arc(X + s / 2, Y + s / 2, s * .08, 0, TAU); outline(ctx, p[2], lw * .5, p[3]);
  }, s, s * 1.1, s / 2);
  else if (kind === 'botanical') cells((cx, cy) => {
    const X = cx + s * (.3 + R() * .4), Y = cy + s * (.3 + R() * .4);
    for (let k = 0; k < 5; k++) leaf(ctx, X, Y, s * (.32 + R() * .2), s * .1, -Math.PI / 2 + (k - 2) * .55 + (R() - .5) * .3, p[1 + (k % 2)], { lw: lw * .7, rib: false });
    if (R() < .5) { ctx.beginPath(); ctx.arc(X + s * .25, Y + s * .2, s * .07, 0, TAU); outline(ctx, p[3] === INK ? '#f2b51d' : p[3], lw * .6); }
  }, s, s, s / 2);
  ctx.restore();
}
// a wall of dressed stone blocks: cream faces, ink joints, chipped corners, a few hairline cracks
export function stoneWall(ctx, x, y, w, h, o = {}) {
  const R = R0(o), bh = o.bh || 110, bw = o.bw || 260, base = o.col || '#efe2c2', lw = o.lw ?? 3;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = shade(base, -.35); ctx.fillRect(x, y, w, h);
  for (let j = 0, Y = y; Y < y + h; j++, Y += bh) {
    let X = x - (j % 2 ? bw * .5 : bw * (.1 + R() * .2));
    while (X < x + w) {
      const ww = bw * (.6 + R() * .8), g = 4;
      const pts = [[X + g, Y + g], [X + ww - g, Y + g + (R() - .5) * 3], [X + ww - g + (R() - .5) * 3, Y + bh - g], [X + g, Y + bh - g + (R() - .5) * 3]];
      shape(ctx, pts, vary(base, R, .035), lw);
      ctx.fillStyle = rgba(shade(base, -.25), .55); ctx.fillRect(X + g + 2, Y + bh - g - 10, ww - 2 * g - 4, 8);   // under-shadow (cel)
      ctx.strokeStyle = rgba(INK, .5); ctx.lineWidth = lw * .5;
      for (let k = 0; k < 3; k++) { const cx = X + g + R() * (ww - 2 * g), cy = Y + g + R() * (bh - 2 * g); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (R() - .5) * 14, cy + (R() - .5) * 8); ctx.stroke(); }
      if (R() < (o.crack ?? .12)) cracks(ctx, X + ww * R(), Y + g, bh * (.6 + R() * .6), { R, lw: lw * .6 });
      X += ww;
    }
  }
  ctx.restore();
}
// a branching ink crack starting at x, y going down-ish (also used by the crack transition)
export function cracks(ctx, x, y, len, o = {}) {
  const R = R0(o); ctx.strokeStyle = o.col || INK; ctx.lineCap = 'round';
  const go = (px, py, a, l, w, d) => {
    let cx = px, cy = py; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy);
    const n = 5; for (let i = 0; i < n; i++) { a += (R() - .5) * .9; cx += Math.cos(a) * l / n; cy += Math.sin(a) * l / n; ctx.lineTo(cx, cy); if (d < 2 && R() < .3) { ctx.stroke(); go(cx, cy, a + (R() < .5 ? -1 : 1) * (.6 + R() * .5), l * .45, w * .6, d + 1); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); } }
    ctx.stroke();
  };
  go(x, y, o.a ?? Math.PI / 2 + (R() - .5) * .6, len, o.lw ?? 2.5, 0);
}
// white marble: pale ground, grey veins
export function marble(ctx, x, y, w, h, o = {}) {
  const R = R0(o); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = o.col || '#f3efe6'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(o.vein || '#7d7a84', .5);
  for (let i = 0; i < (o.n || Math.round(w * h / 9000)); i++) { let px = x + R() * w, py = y + R() * h, a = R() * TAU; ctx.lineWidth = .6 + R() * 1.4; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 6; k++) { a += (R() - .5) * 1.2; px += Math.cos(a) * 14; py += Math.sin(a) * 14; ctx.lineTo(px, py); } ctx.stroke(); }
  ctx.restore();
}
// a wall of pinned papers, posters and clippings, overlapping at slight angles (the "collage" ground behind a bust)
export function collage(ctx, x, y, w, h, o = {}) {
  const R = R0(o), cols = o.cols || ['#f1e6cc', '#e9d39b', '#d8322a', '#f2b51d', '#fbf7ee', '#2346b8'], n = o.n || Math.round(w * h / 26000);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = o.ground || '#a8231f'; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < n; i++) {
    const pw = 120 + R() * 220, ph = 150 + R() * 240, px = x + R() * w, py = y + R() * h, c = cols[Math.floor(R() * cols.length)];
    ctx.save(); ctx.translate(px, py); ctx.rotate((R() - .5) * .35);
    ctx.fillStyle = rgba(INK, .25); ctx.fillRect(-pw / 2 + 6, -ph / 2 + 8, pw, ph);
    ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); outline(ctx, c, 2);
    const dark = c === '#d8322a' || c === '#2346b8';
    microtext(ctx, -pw / 2 + 12, -ph / 2 + 16, pw - 24, Math.floor((ph - 30) / 13), { R, col: dark ? rgba('#fbf7ee', .6) : rgba(INK, .55), head: R() < .6, gap: 13 });
    if (R() < .35) { ctx.beginPath(); ctx.arc(0, ph * .1, Math.min(pw, ph) * .2, 0, TAU); outline(ctx, dark ? '#f2b51d' : '#d8322a', 2); }
    ctx.restore();
  }
  ctx.restore();
}

// ---------- things ----------
// grey bars that read as printed text. lines = number of lines; o.head = a heavy first line; o.cols = 1 or 2 columns
export function microtext(ctx, x, y, w, lines, o = {}) {
  const R = R0(o), gap = o.gap || 12, th = o.th || Math.max(2, gap * .35); ctx.fillStyle = o.col || rgba(INK, .55);
  let Y = y;
  if (o.head) { ctx.fillRect(x, Y, w * (.5 + R() * .4), th * 2.2); Y += gap * 1.8; }
  for (let i = 0; i < lines; i++, Y += gap) { const end = i % 6 === 5 ? .4 + R() * .3 : .9 + R() * .1; let X = x; while (X < x + w * end) { const ww = 6 + R() * 26; ctx.fillRect(X, Y, Math.min(ww, x + w * end - X), th); X += ww + th * 1.4; } }
}
// a printed sheet (for flying papers and pinned pages), drawn at 0,0 → w,h
export function paper(ctx, w, h, o = {}) {
  const R = R0(o);
  ctx.beginPath(); ctx.rect(0, 0, w, h); outline(ctx, o.col || '#fbf7ee', o.lw ?? Math.max(1, w * .012));
  if (o.text !== false) microtext(ctx, w * .1, h * .1, w * .8, Math.floor(h * .78 / Math.max(4, h * .055)), { R, gap: Math.max(4, h * .055), head: true, col: rgba(INK, .5) });
}
// a framed picture. kind: poster | portrait | abstract | mirror; o.frame colour, o.pal for the content
export function frame(ctx, x, y, w, h, o = {}) {
  const R = R0(o), f = o.frame || '#c99a2e', pal = o.pal || ['#2346b8', '#d8322a', '#f2b51d', '#f1e6cc'], b = o.border ?? Math.min(w, h) * .08, lw = o.lw ?? 2.5;
  ctx.fillStyle = rgba(INK, .3); ctx.fillRect(x + 6, y + 8, w, h);
  ctx.beginPath(); ctx.rect(x, y, w, h); outline(ctx, f, lw);
  const ix = x + b, iy = y + b, iw = w - 2 * b, ih = h - 2 * b;
  ctx.beginPath(); ctx.rect(ix, iy, iw, ih); outline(ctx, pal[3], lw * .8);
  ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
  const k = o.kind || 'poster';
  if (k === 'poster') { ctx.fillStyle = pal[0]; ctx.fillRect(ix, iy, iw, ih * .62); ctx.beginPath(); ctx.arc(ix + iw * .5, iy + ih * .36, Math.min(iw, ih) * .22, 0, TAU); outline(ctx, pal[2], lw * .8); ctx.fillStyle = pal[1]; ctx.fillRect(ix + iw * .1, iy + ih * .7, iw * .8, ih * .07); microtext(ctx, ix + iw * .1, iy + ih * .82, iw * .8, 2, { R, gap: Math.max(5, ih * .06) }); }
  else if (k === 'portrait') { ctx.fillStyle = pal[0]; ctx.fillRect(ix, iy, iw, ih); ctx.beginPath(); ctx.ellipse(ix + iw / 2, iy + ih * .42, iw * .2, ih * .17, 0, 0, TAU); outline(ctx, pal[1], lw * .7); ctx.beginPath(); ctx.ellipse(ix + iw / 2, iy + ih, iw * .42, ih * .36, 0, 0, TAU); outline(ctx, pal[1], lw * .7); }
  else if (k === 'abstract') { ctx.fillStyle = pal[3]; ctx.fillRect(ix, iy, iw, ih); for (let i = 0; i < 6; i++) { const c = pal[i % 3]; if (R() < .5) { ctx.beginPath(); ctx.arc(ix + R() * iw, iy + R() * ih, Math.min(iw, ih) * (.1 + R() * .25), 0, TAU); outline(ctx, c, lw * .7); } else { ctx.save(); ctx.translate(ix + R() * iw, iy + R() * ih); ctx.rotate(R() * TAU); ctx.beginPath(); ctx.rect(-iw * .2, -ih * .06, iw * .4, ih * .12); outline(ctx, c, lw * .7); ctx.restore(); } } }
  else if (k === 'mirror') { const g = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih); g.addColorStop(0, '#cfe3ea'); g.addColorStop(1, '#7fa9bd'); ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih); ctx.strokeStyle = rgba('#ffffff', .7); ctx.lineWidth = iw * .05; ctx.beginPath(); ctx.moveTo(ix + iw * .2, iy + ih); ctx.lineTo(ix + iw * .8, iy); ctx.stroke(); }
  ctx.restore();
}
// a clock face (per frame — hands from o.h, o.m in hours/minutes, or o.time in seconds). style: wall | mural | station
export function clock(ctx, x, y, r, o = {}) {
  const lw = o.lw ?? Math.max(2, r * .03), face = o.face || '#fbf7ee', rim = o.rim || '#c99a2e', ink = o.ink || INK;
  if (o.shadow !== false) { ctx.beginPath(); ctx.arc(x + r * .05, y + r * .07, r * 1.08, 0, TAU); ctx.fillStyle = rgba(INK, .3); ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, TAU); outline(ctx, rim, lw);
  ctx.beginPath(); ctx.arc(x, y, r * .94, 0, TAU); outline(ctx, face, lw);
  if (o.ring) { ctx.beginPath(); ctx.arc(x, y, r * .62, 0, TAU); outline(ctx, o.ring, lw * .7); }
  for (let i = 0; i < 60; i++) { const a = i * TAU / 60, big = i % 5 === 0, r1 = r * (big ? .76 : .84), r2 = r * .9; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.lineWidth = big ? lw * 1.4 : lw * .5; ctx.strokeStyle = ink; ctx.stroke(); }
  if (o.numerals !== false && r > 40) {
    const N = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.fillStyle = ink; ctx.font = `700 ${r * .15}px "Playfair Display", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2; ctx.save(); ctx.translate(x + Math.cos(a) * r * .63, y + Math.sin(a) * r * .63); ctx.rotate(a + Math.PI / 2); ctx.fillText(N[i], 0, 0); ctx.restore(); }
  }
  const tm = o.time ?? ((o.h ?? 10) * 3600 + (o.m ?? 10) * 60), hA = (tm / 43200) * TAU - Math.PI / 2, mA = ((tm % 3600) / 3600) * TAU - Math.PI / 2, sA = ((tm % 60) / 60) * TAU - Math.PI / 2;
  const hand = (a, l, w, c) => { const c2 = Math.cos(a), s2 = Math.sin(a); shape(ctx, [[x - c2 * l * .15 - s2 * w, y - s2 * l * .15 + c2 * w], [x + c2 * l, y + s2 * l], [x - c2 * l * .15 + s2 * w, y - s2 * l * .15 - c2 * w]], c, lw * .6); };
  hand(hA, r * .48, r * .06, o.hand || INK); hand(mA, r * .74, r * .04, o.hand || INK);
  if (o.seconds !== false) { ctx.beginPath(); ctx.moveTo(x - Math.cos(sA) * r * .2, y - Math.sin(sA) * r * .2); ctx.lineTo(x + Math.cos(sA) * r * .82, y + Math.sin(sA) * r * .82); ctx.lineWidth = lw * .6; ctx.strokeStyle = o.sec || '#d8322a'; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(x, y, r * .05, 0, TAU); outline(ctx, rim, lw * .5);
}
// an hourglass standing on its base at x, y (bottom centre), height h; k = 0 … 1 of the sand fallen (per frame)
export function hourglass(ctx, x, y, h, k = .5, o = {}) {
  const w = h * .5, lw = o.lw ?? Math.max(2, h * .012), wood = o.wood || '#7a3b1d', sand = o.sand || '#f2b51d';
  const top = y - h, nk = y - h / 2, cap = h * .07;
  ctx.beginPath(); ctx.rect(x - w * .62, top, w * 1.24, cap); outline(ctx, wood, lw); ctx.beginPath(); ctx.rect(x - w * .62, y - cap, w * 1.24, cap); outline(ctx, wood, lw);
  const bulb = s => [[x - w * .48, s ? top + cap : y - cap], [x - w * .08, nk], [x + w * .08, nk], [x + w * .48, s ? top + cap : y - cap]];
  shape(ctx, bulb(1), rgba('#dff1f4', .45), lw, { smooth: false }); shape(ctx, bulb(0), rgba('#dff1f4', .45), lw);
  const k1 = clamp(1 - k), sTop = nk - (nk - top - cap) * .8 * Math.sqrt(k1);
  if (k1 > .01) shape(ctx, [[x - w * .08 - w * .4 * Math.sqrt(k1), sTop], [x + w * .08 + w * .4 * Math.sqrt(k1), sTop], [x + w * .06, nk - 4], [x - w * .06, nk - 4]], sand, lw * .5);
  const pile = (y - cap) - (h / 2 - cap) * .75 * Math.sqrt(clamp(k));
  shape(ctx, [[x - w * .45, y - cap - 2], [x, pile], [x + w * .45, y - cap - 2]], sand, lw * .5);
  if (k > 0 && k < 1) { ctx.beginPath(); ctx.moveTo(x, nk); ctx.lineTo(x, pile); ctx.lineWidth = lw * .7; ctx.strokeStyle = sand; ctx.stroke(); }
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.rect(x + s * w * .56 - lw * 2, top + cap, lw * 4, h - 2 * cap); outline(ctx, wood, lw * .6); }
}
// a row of book spines standing on y (bottom), filling width w
export function books(ctx, x, y, w, h, o = {}) {
  const R = R0(o), cols = o.cols || ['#d8322a', '#2346b8', '#1f7a45', '#f2b51d', '#5a3a9a', '#f1e6cc', '#17121c'];
  let X = x; while (X < x + w - 10) { const bw = 14 + R() * 26, bh = h * (.7 + R() * .3), c = cols[Math.floor(R() * cols.length)], lean = R() < .08 ? .12 : 0;
    ctx.save(); ctx.translate(X, y); ctx.rotate(lean); ctx.beginPath(); ctx.rect(0, -bh, bw, bh); outline(ctx, c, 2);
    ctx.fillStyle = rgba(c === '#f1e6cc' ? INK : '#fbf7ee', .7); ctx.fillRect(3, -bh * .8, bw - 6, 3); ctx.fillRect(3, -bh * .25, bw - 6, 3); ctx.restore(); X += bw + (lean ? 8 : 0); }
}
export function lamp(ctx, x, y, h, o = {}) { // table lamp standing on y
  const sh = o.shade || '#d8322a', lw = o.lw ?? 3;
  shape(ctx, [[x - h * .18, y], [x + h * .18, y], [x + h * .1, y - h * .08], [x - h * .1, y - h * .08]], '#c99a2e', lw);
  ctx.beginPath(); ctx.rect(x - h * .025, y - h * .62, h * .05, h * .55); outline(ctx, '#c99a2e', lw);
  shape(ctx, [[x - h * .32, y - h * .55], [x + h * .32, y - h * .55], [x + h * .2, y - h], [x - h * .2, y - h]], sh, lw);
  if (o.on) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, y - h * .5, 0, x, y - h * .5, h * 1.2); g.addColorStop(0, rgba('#ffd98a', .45)); g.addColorStop(1, rgba('#ffd98a', 0)); ctx.fillStyle = g; ctx.fillRect(x - h * 1.2, y - h * 1.7, h * 2.4, h * 2.4); ctx.restore(); }
}
export function door(ctx, x, y, w, h, o = {}) { // a door standing on y (bottom-left x)
  const c = o.col || '#d8322a', lw = o.lw ?? 3;
  ctx.beginPath(); ctx.rect(x - w * .08, y - h - w * .08, w * 1.16, h + w * .08); outline(ctx, o.frame || '#17121c', lw);
  ctx.beginPath(); ctx.rect(x, y - h, w, h); outline(ctx, c, lw);
  if (o.open) { ctx.fillStyle = o.inside || '#0d0a10'; ctx.fillRect(x + 2, y - h + 2, w * o.open, h - 4); }
  ctx.beginPath(); ctx.rect(x + w * .14, y - h * .9, w * .72, h * .35); outline(ctx, null, lw * .6, shade(c, -.4)); ctx.beginPath(); ctx.rect(x + w * .14, y - h * .48, w * .72, h * .38); outline(ctx, null, lw * .6, shade(c, -.4));
  ctx.beginPath(); ctx.arc(x + w * .85, y - h * .5, w * .04, 0, TAU); outline(ctx, '#f2b51d', lw * .5);
}
export function chair(ctx, x, y, h, o = {}) { // a buttoned armchair seen from the front, standing on y
  const c = o.col || '#5a3a9a', lw = o.lw ?? 3, w = h * .9;
  shape(ctx, [[x - w * .45, y - h * .35], [x - w * .48, y - h * .95], [x - w * .2, y - h * 1.05], [x + w * .2, y - h * 1.05], [x + w * .48, y - h * .95], [x + w * .45, y - h * .35]], c, lw, { smooth: true });
  for (let i = 0; i < 9; i++) { const bx = x - w * .3 + (i % 3) * w * .3, by = y - h * .9 + Math.floor(i / 3) * h * .17; ctx.beginPath(); ctx.arc(bx, by, h * .02, 0, TAU); outline(ctx, shade(c, -.4), lw * .5); }
  shape(ctx, [[x - w * .62, y - h * .2], [x - w * .62, y - h * .6], [x - w * .42, y - h * .65], [x - w * .4, y - h * .2]], shade(c, -.15), lw, { smooth: true });
  shape(ctx, [[x + w * .62, y - h * .2], [x + w * .62, y - h * .6], [x + w * .42, y - h * .65], [x + w * .4, y - h * .2]], shade(c, -.15), lw, { smooth: true });
  ctx.beginPath(); ctx.rect(x - w * .45, y - h * .4, w * .9, h * .25); outline(ctx, shade(c, .1), lw);
}
export function window_(ctx, x, y, w, h, o = {}) { // a sash window: sky inside, frame, sill
  const lw = o.lw ?? 3; ctx.beginPath(); ctx.rect(x, y, w, h); outline(ctx, o.sky || '#8fd0e0', lw);
  if (o.inside) o.inside(ctx, x, y, w, h);
  ctx.strokeStyle = o.frame || '#fbf7ee'; ctx.lineWidth = w * .05; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  ctx.beginPath(); ctx.rect(x, y, w, h); outline(ctx, null, lw); ctx.beginPath(); ctx.rect(x - w * .06, y + h, w * 1.12, h * .06); outline(ctx, o.frame || '#fbf7ee', lw);
}
export { window_ as window };

// ---------- space ----------
// A one-point perspective box. The back wall is the rect b = [x0, y0, x1, y1]; the frame edges are the near opening.
// o.floor: (ctx, quad) painter or a kind ('marble' | 'checker' | 'tiles'), o.walls: colours, o.ceiling, o.panels
// Returns helpers: vp (vanishing point), at(u, depth) → stage point on the floor (u = -1 … 1 across, depth 0 near … 1 back),
// scaleAt(depth) (how big a thing of unit height looks there).
export function room(ctx, W, H, o = {}) {
  const R = R0(o), b = o.back || [W * .42, H * .34, W * .58, H * .56], lw = o.lw ?? 3, vp = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  const nearL = -W * .05, nearR = W * 1.05, nearT = -H * .05, nearB = H * 1.05;
  const lerpP = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  // depth d in 0 … 1 maps to a perspective-correct fraction toward the back wall
  const persp = d => { const z = 1 + d * (o.deep || 7); return (1 - 1 / z) / (1 - 1 / (1 + (o.deep || 7))); };
  const corner = { nl: [nearL, nearB], nr: [nearR, nearB], bl: [b[0], b[3]], br: [b[2], b[3]], tl: [nearL, nearT], tr: [nearR, nearT], btl: [b[0], b[1]], btr: [b[2], b[1]] };
  // floor
  const floorQ = [corner.nl, corner.nr, corner.br, corner.bl];
  ctx.save(); path(ctx, floorQ); ctx.clip();
  if (typeof o.floor === 'function') o.floor(ctx, floorQ, persp);
  else {
    const fk = o.floor || 'marble', pal = o.floorPal || ['#f3efe6', '#d9d2c4', '#17121c'];
    if (fk === 'marble') marble(ctx, nearL, b[3], nearR - nearL, nearB - b[3], { R, n: 120 }); else { ctx.fillStyle = pal[0]; ctx.fillRect(nearL, b[3], nearR - nearL, nearB - b[3]); }
    const nx = o.tilesX || 10, nz = o.tilesZ || 14;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const d0 = persp(j / nz), d1 = persp((j + 1) / nz), u0 = i / nx, u1 = (i + 1) / nx;
      const P = (u, d) => lerpP(lerpP(corner.nl, corner.nr, u), lerpP(corner.bl, corner.br, u), d);
      const q = [P(u0, d0), P(u1, d0), P(u1, d1), P(u0, d1)];
      if (fk === 'checker' && (i + j) % 2) { path(ctx, q); ctx.fillStyle = pal[1]; ctx.fill(); }
      if (fk === 'marble' && R() < .08) { path(ctx, q); ctx.fillStyle = rgba(pal[2], .8); ctx.fill(); }
      path(ctx, q); ctx.lineWidth = lw * .5; ctx.strokeStyle = rgba(INK, .55); ctx.stroke();
    }
  }
  ctx.restore();
  // walls and ceiling
  const wc = o.walls || ['#f1e6cc', '#e8dcc0'], cc = o.ceiling || '#e9e2d0';
  shape(ctx, [corner.tl, corner.btl, corner.bl, corner.nl], wc[0], lw);
  shape(ctx, [corner.tr, corner.btr, corner.br, corner.nr], wc[1] || wc[0], lw);
  shape(ctx, [corner.tl, corner.tr, corner.btr, corner.btl], cc, lw);
  ctx.beginPath(); ctx.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); outline(ctx, o.backCol || shade(wc[0], -.1), lw);
  const H2 = { vp, b, persp, corner, lerpP,
    // a point on the floor: u = -1 (left wall) … 1 (right wall), d = 0 (near) … 1 (back)
    at: (u, d) => { const k = persp(d), uu = (u + 1) / 2; return lerpP(lerpP(corner.nl, corner.nr, uu), lerpP(corner.bl, corner.br, uu), k); },
    scaleAt: d => lerp(1, (b[3] - b[1]) / (nearB - nearT), persp(d)),
    // a quad on a side wall between depths d0 … d1 and heights v0 … v1 (0 floor … 1 ceiling); side = -1 left, 1 right
    wallQuad: (side, d0, d1, v0, v1) => {
      const nb = side < 0 ? corner.nl : corner.nr, nt = side < 0 ? corner.tl : corner.tr, bb = side < 0 ? corner.bl : corner.br, bt = side < 0 ? corner.btl : corner.btr;
      const P = (d, v) => lerpP(lerpP(nb, nt, v), lerpP(bb, bt, v), persp(d));
      return [P(d0, v0), P(d1, v0), P(d1, v1), P(d0, v1)];
    },
    ceilQuad: (u0, u1, d0, d1) => { const P = (u, d) => lerpP(lerpP(corner.tl, corner.tr, (u + 1) / 2), lerpP(corner.btl, corner.btr, (u + 1) / 2), persp(d)); return [P(u0, d0), P(u1, d0), P(u1, d1), P(u0, d1)]; },
  };
  if (o.panels) for (const side of [-1, 1]) for (let i = 0; i < o.panels; i++) { const d0 = i / o.panels + .02, d1 = (i + 1) / o.panels - .02; o.panel ? o.panel(ctx, H2.wallQuad(side, d0, d1, o.panelV?.[0] ?? .08, o.panelV?.[1] ?? .72), side, i, R) : shape(ctx, H2.wallQuad(side, d0, d1, .08, .72), o.panelCol || '#a8231f', lw * .8); }
  if (o.lights) for (let i = 0; i < o.lights; i++) { const d0 = i / o.lights + .03, d1 = d0 + .55 / o.lights; shape(ctx, H2.ceilQuad(-.35, .35, d0, d1), o.lightCol || '#d9f0e4', lw * .6); }
  return H2;
}
