// printmade-scene · plate.js — the folded view and the kit that builds a place in it.
// The view is the one East Asian painting uses and a 3D camera cannot: the back wall stands straight up, seen face on
// (elevation); the floor is laid out flat below it, seen from above (plan), its tiles in rows parallel to the frame
// with no vanishing point; a side wall, when there is one, is a sheared panel; furniture shows its top as a plan and its
// front and legs as an elevation; a figure stays the same size wherever it stands. Depth is "higher on the floor".
// Every kit function paints with print.js, so whatever you add in a project from the same media matches.
import * as P from './print.js';

export const FONT = 'Pretendard';
export const PALETTE = {
  paper: '#ece4d0', cream: '#e4dbc4', bone: '#d9cfb6', slate: '#8597a0', slateDk: '#56636e', steel: '#a9b7bd',
  sage: '#879670', olive: '#5f6c48', moss: '#4c5a3c', ochre: '#cdb98a', straw: '#ddcd9c', rose: '#d6928a',
  dusty: '#c4716c', umber: '#5b4535', wood: '#7b5b41', woodDk: '#4a3527', ink: '#2a2422', night: '#3f405e',
  dusk: '#5d5b78', crimson: '#b5161d',
};

/** makePlate(o) — the stage for one place. o: W, H, floorY (where the back wall meets the floor), seed, paper, accent. */
export function makePlate(o = {}) {
  const K = { W: 1440, H: 1080, floorY: 600, seed: 1, paper: PALETTE.paper, accent: PALETTE.crimson, pal: { ...PALETTE, ...(o.pal || {}) }, ...o };
  K.rand = s => P.rng(K.seed * 1009 + s);
  return K;
}

// ── surfaces ──
/**
 * wall(ctx, K, o) — a back wall in elevation. o: x0, x1, y0, y1, color, kind ('plain' | 'stripe' | 'damask' | 'brick' |
 * 'plank' | 'tile' | 'sky'), color2 (pattern ink), size (pattern step), seed.
 */
export function wall(ctx, K, o = {}) {
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? K.W, y0 = o.y0 ?? 0, y1 = o.y1 ?? K.floorY, w = x1 - x0, h = y1 - y0, s = o.seed ?? 21;
  const c = o.color ?? K.pal.straw, c2 = o.color2 ?? P.shade(c, -.25), kind = o.kind ?? 'plain', z = o.size ?? 60, r = P.rng(s);
  P.ink(ctx, P.rect(x0, y0, w, h), c, { seed: s, amp: .6, mottle: .7, speck: .45 });
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  if (kind === 'stripe') {
    ctx.strokeStyle = c2; ctx.lineWidth = 2.2;
    for (let x = x0 + z / 2; x < x1; x += z) { ctx.beginPath(); for (let y = y0; y <= y1; y += 8) { const X = x + Math.sin((y - y0) / z * Math.PI * 1.3) * z * .16; y === y0 ? ctx.moveTo(X, y) : ctx.lineTo(X, y); } ctx.stroke(); }
    ctx.fillStyle = c2; for (let x = x0; x < x1; x += z) for (let y = y0 + z * .4; y < y1; y += z * 1.1) { const X = x + ((y / z | 0) % 2) * z / 2; ctx.fillRect(X - 1, y - 6, 2, 12); ctx.fillRect(X - 6, y - 1, 12, 2); }
  } else if (kind === 'damask') {
    for (let x = x0; x < x1 + z; x += z) for (let y = y0; y < y1 + z; y += z) { const X = x + ((y / z | 0) % 2) * z / 2; ctx.fillStyle = P.alpha(c2, .55); ctx.beginPath(); ctx.ellipse(X, y, z * .12, z * .22, 0, 0, P.TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(X, y, z * .22, z * .08, 0, 0, P.TAU); ctx.fill(); }
  } else if (kind === 'brick') {
    const bh = z * .38, bw = z;
    for (let y = y0, row = 0; y < y1; y += bh, row++) for (let x = x0 - (row % 2) * bw / 2; x < x1; x += bw) { P.ink(ctx, P.rect(x + 2, y + 2, bw - 4, bh - 4), P.mix(c, c2, r() * .5), { seed: s + row * 31 + (x | 0), amp: .8, mottle: .3, speck: .4 }); }
  } else if (kind === 'plank') {
    const ph = z * .45;
    for (let y = y0, i = 0; y < y1; y += ph, i++) { const pc = P.mix(c, c2, (r() - .3) * .5); const pts = P.rect(x0, y, w, ph - 2); P.ink(ctx, pts, pc, { seed: s + i, amp: .7, mottle: .5, speck: .3 }); P.grain(ctx, pts, { seed: s + i * 3, dir: 'h', gap: 5, color: P.alpha(P.shade(pc, -.45), .6) }); }
  } else if (kind === 'tile') {
    ctx.strokeStyle = P.alpha('#ffffff', .55); ctx.lineWidth = 2;
    for (let x = x0; x <= x1; x += z) { ctx.beginPath(); ctx.moveTo(x + (r() - .5) * 2, y0); ctx.lineTo(x + (r() - .5) * 2, y1); ctx.stroke(); }
    for (let y = y0; y <= y1; y += z) { ctx.beginPath(); ctx.moveTo(x0, y + (r() - .5) * 2); ctx.lineTo(x1, y + (r() - .5) * 2); ctx.stroke(); }
  } else if (kind === 'sky') {
    for (let i = 0; i < 9; i++) { const y = y0 + h * (.08 + r() * .7), cw = w * (.15 + r() * .3), x = x0 + r() * w; P.ink(ctx, P.ellipsePts(x, y, cw / 2, 10 + r() * 16, 30), P.mix(c, c2, .35 + r() * .4), { seed: s + i * 7, amp: 4, mottle: .4, speck: .2 }); }
    P.hatch(ctx, { x: x0, y: y0, w, h }, { angle: -.05, gap: 9, len: 40, density: .25, color: P.alpha(P.shade(c, .2), .35) });
  }
  ctx.restore();
}
/** wainscot(ctx, K, o) — a lower panel band of upright boards. o: x0, x1, y0, y1 (default floorY), color. */
export function wainscot(ctx, K, o = {}) {
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? K.W, y1 = o.y1 ?? K.floorY, y0 = o.y0 ?? y1 - 70, c = o.color ?? K.pal.woodDk, s = o.seed ?? 23;
  P.ink(ctx, P.rect(x0, y0, x1 - x0, y1 - y0), c, { seed: s, mottle: .5 });
  ctx.strokeStyle = P.alpha(P.shade(c, -.4), .7); ctx.lineWidth = 2; for (let x = x0 + 18; x < x1; x += 36) { ctx.beginPath(); ctx.moveTo(x, y0 + 6); ctx.lineTo(x, y1 - 2); ctx.stroke(); }
  P.ink(ctx, P.rect(x0, y0 - 6, x1 - x0, 8), P.shade(c, .12), { seed: s + 1, mottle: .2 });
}
/**
 * sideWall(ctx, K, o) — a side wall as a sheared panel (oblique, not perspective). The inner edge stands at o.x from
 * o.top to K.floorY; the panel runs out to the frame edge, its top rising and its foot falling by o.slope per px.
 * Returns map(u, v) → [x, y]: u 0 (inner edge) … 1 (frame edge), v 0 (floor) … 1 (top). o: side, x, top, slope, color, kind.
 */
export function sideWall(ctx, K, o = {}) {
  const left = (o.side ?? 'left') === 'left', xi = o.x ?? (left ? 220 : K.W - 220), xo = left ? 0 : K.W, top = o.top ?? 0, sl = o.slope ?? .45, d = Math.abs(xo - xi);
  const map = (u, v) => { const x = P.lerp(xi, xo, u), dy = d * u * sl; return [x, P.lerp(K.floorY + dy, top - dy, v)]; };
  const pts = [map(0, 0), map(0, 1), map(1, 1), map(1, 0)];
  P.ink(ctx, pts, o.color ?? P.shade(K.pal.straw, -.08), { seed: o.seed ?? 25, amp: .6 });
  if (o.kind === 'brick') { ctx.save(); P.path(ctx, pts); ctx.clip(); ctx.strokeStyle = P.alpha(P.shade(o.color ?? K.pal.straw, -.35), .6); ctx.lineWidth = 1.5; for (let v = 0; v < 1; v += .025) { ctx.beginPath(); const a = map(0, v), b = map(1, v); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } ctx.restore(); }
  ctx.strokeStyle = P.alpha(K.pal.ink, .35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...map(0, 0)); ctx.lineTo(...map(0, 1)); ctx.stroke();
  return map;
}
/** quad(ctx, map, u0, v0, u1, v1, color, o) — paint a rectangle in a side wall's own (u, v) space (a shelf, a door on it). */
export function quad(ctx, map, u0, v0, u1, v1, color, o = {}) { const pts = [map(u0, v0), map(u0, v1), map(u1, v1), map(u1, v0)]; return P.ink(ctx, pts, color, { seed: o.seed ?? 27, amp: .6, mottle: o.mottle ?? .5 }); }

/**
 * floor(ctx, K, o) — the floor in plan, rows parallel to the frame. o: y0 (floorY), y1 (H), x0, x1, kind ('tile' |
 * 'check' | 'brick' | 'plank' | 'grass' | 'earth' | 'stone'), color, color2, size, seed. The edge where it meets a
 * sheared side wall is that wall's business: paint the side wall after the floor.
 */
export function floor(ctx, K, o = {}) {
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? K.W, y0 = o.y0 ?? K.floorY, y1 = o.y1 ?? K.H, w = x1 - x0, h = y1 - y0, s = o.seed ?? 31, r = P.rng(s);
  const kind = o.kind ?? 'tile', c = o.color ?? K.pal.bone, c2 = o.color2 ?? P.shade(c, -.2), z = o.size ?? 80;
  P.ink(ctx, P.rect(x0, y0, w, h), c, { seed: s, amp: .4, mottle: .6, speck: .4 });
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  if (kind === 'tile' || kind === 'check' || kind === 'stone' || kind === 'brick') {
    const tw = kind === 'brick' ? z * 1.3 : z, th = kind === 'brick' ? z * .55 : z;
    for (let y = y0, row = 0; y < y1; y += th, row++) for (let x = x0 - (kind === 'brick' ? (row % 2) * tw / 2 : 0), col = 0; x < x1; x += tw, col++) {
      const tc = kind === 'check' ? ((row + col) % 2 ? c2 : c) : P.mix(c, c2, r() * (kind === 'stone' ? .5 : .25));
      P.ink(ctx, P.rect(x + 2, y + 2, tw - 4, th - 4), tc, { seed: s + row * 57 + col, amp: .9, mottle: .35, speck: .35 });
    }
  } else if (kind === 'plank') {
    for (let x = x0, i = 0; x < x1; x += z * .5, i++) { const pc = P.mix(c, c2, r() * .4), pts = P.rect(x + 1, y0, z * .5 - 2, h); P.ink(ctx, pts, pc, { seed: s + i, amp: .6, mottle: .4 }); P.grain(ctx, pts, { seed: s + i * 5, dir: 'v', gap: 5, color: P.alpha(P.shade(pc, -.45), .55) }); }
  } else if (kind === 'grass') {
    ctx.strokeStyle = P.alpha(P.shade(c, -.3), .8); ctx.lineWidth = 1.3;
    for (let i = 0; i < w * h / 700; i++) { const x = x0 + r() * w, y = y0 + r() * h, l = 5 + r() * 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 - r() * 3, y - l); ctx.moveTo(x + 2, y); ctx.lineTo(x + 3 + r() * 3, y - l * .8); ctx.stroke(); }
    P.speckle(ctx, { x: x0, y: y0, w, h }, P.shade(c, .2), .3, { seed: s + 2 });
  } else if (kind === 'earth') {
    for (let i = 0; i < w * h / 9000; i++) { const x = x0 + r() * w, y = y0 + r() * h; P.blot(ctx, x, y, 14 + r() * 30, 4 + r() * 6, P.shade(c, r() < .5 ? -.15 : .1), { seed: s + i, alpha: .6 }); }
  }
  ctx.restore();
  // a soft dark band where the floor meets the wall
  const g = ctx.createLinearGradient(0, y0, 0, y0 + 26); g.addColorStop(0, 'rgba(30,22,18,.28)'); g.addColorStop(1, 'rgba(30,22,18,0)'); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, 26);
}

/** rug(ctx, K, o) — a patterned rug laid flat (plan). o: x, y, w, h, colors [ground, a, b, c], pattern ('diamond' | 'scroll' | 'band'), fringe. */
export function rug(ctx, K, o = {}) {
  const { x, y, w, h } = o, [bg, a, b, c] = o.colors ?? [K.pal.rose, K.pal.slateDk, K.pal.straw, K.pal.cream], s = o.seed ?? 41, r = P.rng(s);
  P.ink(ctx, P.rect(x, y, w, h), bg, { seed: s, amp: 1.2 });
  const m = Math.min(w, h) * .07;
  ctx.save(); ctx.strokeStyle = a; ctx.lineWidth = 3; ctx.strokeRect(x + m * .5, y + m * .5, w - m, h - m); ctx.lineWidth = 1.6; ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m);
  ctx.fillStyle = c; for (let t = 0; t < 1; t += 1 / 48) { ctx.beginPath(); ctx.arc(x + m * .75 + (w - 1.5 * m) * t, y + m * .75, 2.2, 0, P.TAU); ctx.arc(x + m * .75 + (w - 1.5 * m) * t, y + h - m * .75, 2.2, 0, P.TAU); ctx.fill(); }
  ctx.beginPath(); ctx.rect(x + m, y + m, w - 2 * m, h - 2 * m); ctx.clip();
  const pat = o.pattern ?? 'diamond';
  if (pat === 'diamond') {
    const n = Math.max(2, Math.round((w - 2 * m) / (h - 2 * m) * 2)), cw = (w - 2 * m) / n, ch = (h - 2 * m) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const cx = x + m + cw * (i + .5), cy = y + m + ch * (j + .5); for (let k = 0; k < 4; k++) { const f = 1 - k * .24; P.path(ctx, [[cx, cy - ch * .5 * f], [cx + cw * .5 * f, cy], [cx, cy + ch * .5 * f], [cx - cw * .5 * f, cy]]); ctx.fillStyle = [a, b, bg, c][k]; ctx.fill(); } }
  } else if (pat === 'scroll') {
    ctx.strokeStyle = P.alpha(P.shade(bg, -.35), .9); ctx.lineWidth = 2.4;
    for (let yy = y + m; yy < y + h; yy += 46) for (let xx = x + m + ((yy / 46 | 0) % 2) * 23; xx < x + w; xx += 46) { ctx.beginPath(); for (let t = 0; t < 3.6; t += .2) { const R = 3 + t * 4; ctx.lineTo(xx + Math.cos(t * 2.2) * R, yy + Math.sin(t * 2.2) * R); } ctx.stroke(); }
  } else if (pat === 'band') {
    for (let yy = y + m, i = 0; yy < y + h; yy += 18, i++) { ctx.fillStyle = [a, b, c, bg][i % 4]; ctx.fillRect(x, yy, w, 9); }
  }
  ctx.restore();
  if (o.fringe !== false) { ctx.strokeStyle = P.shade(c, -.1); ctx.lineWidth = 1.2; ctx.beginPath(); for (let yy = y + 2; yy < y + h; yy += 5) { ctx.moveTo(x, yy); ctx.lineTo(x - 9 - r() * 3, yy + (r() - .5) * 2); ctx.moveTo(x + w, yy); ctx.lineTo(x + w + 9 + r() * 3, yy + (r() - .5) * 2); } ctx.stroke(); }
}

// ── openings ──
/**
 * win(ctx, K, o) — a window: o.view(ctx, box) paints what is outside (clipped), then the frame and mullions.
 * o: x, y, w, h, cols, rows, frame (colour), cross (X braces in the top row), sill, curtain ({ color, side: 'both' }).
 * Returns the glass box — hand it to rain() / scratches() for live weather.
 */
export function win(ctx, K, o = {}) {
  const { x, y, w, h } = o, fr = o.frame ?? K.pal.woodDk, cols = o.cols ?? 2, rows = o.rows ?? 2, s = o.seed ?? 51, fw = o.fw ?? 9;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (o.view) o.view(ctx, { x, y, w, h }); else P.ink(ctx, P.rect(x, y, w, h), K.pal.steel, { seed: s });
  ctx.restore();
  ctx.fillStyle = fr; const R = P.rng(s);
  const bar = (X, Y, W, H) => P.ink(ctx, P.rect(X, Y, W, H), fr, { seed: s + (R() * 1e3 | 0), amp: .5, mottle: .2, speck: .3 });
  bar(x - fw, y - fw, w + 2 * fw, fw); bar(x - fw, y + h, w + 2 * fw, fw); bar(x - fw, y - fw, fw, h + 2 * fw); bar(x + w, y - fw, fw, h + 2 * fw);
  for (let i = 1; i < cols; i++) bar(x + w * i / cols - fw * .4, y, fw * .8, h);
  for (let j = 1; j < rows; j++) bar(x, y + h * j / rows - fw * .4, w, fw * .8);
  if (o.cross) { ctx.strokeStyle = fr; ctx.lineWidth = fw * .6; const ch = h / rows; for (let i = 0; i < cols; i++) { const X0 = x + w * i / cols, X1 = x + w * (i + 1) / cols; ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y + ch); ctx.moveTo(X1, y); ctx.lineTo(X0, y + ch); ctx.stroke(); } }
  if (o.sill) bar(x - fw * 2.5, y + h + fw, w + fw * 5, fw * 1.2);
  if (o.curtain) { const cc = o.curtain.color ?? K.pal.cream, cw = o.curtain.w ?? 34; for (const X of [x - fw - cw * .6, x + w + fw - cw * .4]) { const pts = P.rect(X, y - fw * 2, cw, h + fw * 3); P.ink(ctx, pts, cc, { seed: s + X | 0, amp: 1.5 }); ctx.strokeStyle = P.alpha(P.shade(cc, -.3), .6); ctx.lineWidth = 1.3; for (let k = 4; k < cw; k += 6) { ctx.beginPath(); ctx.moveTo(X + k, y - fw * 2); ctx.lineTo(X + k + Math.sin(k) * 2, y + h + fw); ctx.stroke(); } } }
  return { x, y, w, h };
}
/** door(ctx, K, o) — a door in elevation, its bottom on o.y. o: x, y, w, h, color, frame, open (0 shut … 1 ajar: dark gap), knob. */
export function door(ctx, K, o = {}) {
  const { x, y, w } = o, h = o.h ?? 300, c = o.color ?? K.pal.woodDk, fr = o.frame ?? P.shade(c, .15), s = o.seed ?? 53;
  P.ink(ctx, P.rect(x - 12, y - h - 12, w + 24, h + 12), fr, { seed: s, mottle: .3 });
  P.ink(ctx, P.rect(x, y - h, w, h), P.shade(K.pal.ink, .05), { seed: s + 1, mottle: .2 });
  const ow = w * (1 - (o.open ?? 0) * .55), pts = P.rect(x, y - h, ow, h);
  P.ink(ctx, pts, c, { seed: s + 2 }); P.grain(ctx, pts, { seed: s + 3, dir: 'v', gap: 7, color: P.alpha(P.shade(c, -.5), .5) });
  ctx.strokeStyle = P.alpha(P.shade(c, -.45), .8); ctx.lineWidth = 2; ctx.strokeRect(x + ow * .14, y - h * .9, ow * .72, h * .36); ctx.strokeRect(x + ow * .14, y - h * .48, ow * .72, h * .4);
  if (o.knob !== false) { ctx.fillStyle = P.shade(K.pal.ochre, -.2); ctx.beginPath(); ctx.arc(x + ow * .86, y - h * .47, 4.5, 0, P.TAU); ctx.fill(); }
}

// ── furniture (top as plan, front as elevation) ──
/** shelf(ctx, K, o) — a tall case of shelves; o.fill 'books' | 'bottles' | 'jars' | fn(ctx, box, i). o: x, y (bottom), w, h, rows, color. */
export function shelf(ctx, K, o = {}) {
  const { x, y, w, h } = o, rows = o.rows ?? 5, c = o.color ?? K.pal.woodDk, s = o.seed ?? 61, r = P.rng(s), top = y - h, rh = h / rows;
  P.ink(ctx, P.rect(x, top, w, h), c, { seed: s, mottle: .4 });
  for (let i = 0; i < rows; i++) {
    const by = top + i * rh + 8, box = { x: x + 8, y: by, w: w - 16, h: rh - 14 };
    P.ink(ctx, P.rect(box.x, box.y, box.w, box.h), P.shade(c, -.35), { seed: s + i, mottle: .2, speck: .2 });
    const fill = o.fill ?? 'books';
    if (typeof fill === 'function') fill(ctx, box, i);
    else if (fill === 'books') { let bx = box.x + 2; while (bx < box.x + box.w - 6) { const bw = 6 + r() * 9, bh = box.h * (.72 + r() * .26), bc = [K.pal.dusty, K.pal.slateDk, K.pal.cream, K.pal.olive, K.pal.rose, K.pal.umber][r() * 6 | 0]; P.ink(ctx, P.rect(bx, box.y + box.h - bh, bw, bh), bc, { seed: s + (bx | 0), amp: .4, mottle: .2, speck: .3 }); ctx.fillStyle = P.alpha(K.pal.paper, .6); ctx.fillRect(bx + 1, box.y + box.h - bh * .8, bw - 2, 1.5); bx += bw + .8; } }
    else if (fill === 'bottles' || fill === 'jars') { let bx = box.x + 6; while (bx < box.x + box.w - 18) { const bw = fill === 'jars' ? 20 + r() * 10 : 10 + r() * 7, bh = box.h * (fill === 'jars' ? .5 + r() * .25 : .6 + r() * .35), bc = [K.pal.steel, K.pal.sage, K.pal.ochre, K.pal.cream, K.pal.slate][r() * 5 | 0]; const by2 = box.y + box.h - bh; P.ink(ctx, P.rect(bx, by2 + (fill === 'bottles' ? bh * .25 : 0), bw, bh * (fill === 'bottles' ? .75 : 1)), bc, { seed: s + (bx | 0), amp: .5, mottle: .3 }); if (fill === 'bottles') P.ink(ctx, P.rect(bx + bw * .3, by2, bw * .4, bh * .27), bc, { seed: s + 7 + (bx | 0), amp: .3 }); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(bx + 2, by2 + bh * .35, 2, bh * .4); bx += bw + 6 + r() * 6; } }
  }
}
/**
 * table(ctx, K, o) — a table: the top laid out as a plan (o.depth tall on screen), the apron and legs in elevation.
 * o: x, y (where the front legs stand), w, depth, legH, color, shape ('rect' | 'oval'). Returns the top box to set things on.
 */
export function table(ctx, K, o = {}) {
  const { x, y, w } = o, d = o.depth ?? 160, L = o.legH ?? 90, c = o.color ?? K.pal.wood, s = o.seed ?? 71, ap = 14;
  const topY = y - L - d - ap, legs = [[x + 14, y - L - ap], [x + w - 26, y - L - ap]];
  for (const [lx, ly] of legs) { P.ink(ctx, P.rect(lx, ly, 12, L + ap), P.shade(c, -.25), { seed: s + lx | 0, amp: .6 }); }
  P.blot(ctx, x + w / 2, y + 4, w * .45, 9, K.pal.ink, { alpha: .25, seed: s + 4 });
  let pts;
  if (o.shape === 'oval') { pts = P.ellipsePts(x + w / 2, topY + d / 2, w / 2, d / 2, 56); P.ink(ctx, P.ellipsePts(x + w / 2, topY + d / 2 + ap, w / 2, d / 2, 56), P.shade(c, -.35), { seed: s + 1 }); }
  else { P.ink(ctx, P.rect(x, topY + d, w, ap), P.shade(c, -.35), { seed: s + 1 }); pts = P.rect(x, topY, w, d); }
  P.ink(ctx, pts, c, { seed: s + 2 }); P.grain(ctx, pts, { seed: s + 3, dir: 'h', gap: 9, color: P.alpha(P.shade(c, -.45), .5) });
  if (o.shape === 'oval') { ctx.strokeStyle = P.alpha(P.shade(c, .3), .6); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + w / 2, topY + d / 2, w / 2 - 10, d / 2 - 8, 0, 0, P.TAU); ctx.stroke(); }
  return { x, y: topY, w, h: d };
}
/** counter(ctx, K, o) — a run of cabinets along the back wall: a thin plan top, doors in elevation. o: x, y (foot), w, h, color, doors. */
export function counter(ctx, K, o = {}) {
  const { x, y, w } = o, h = o.h ?? 130, c = o.color ?? K.pal.wood, s = o.seed ?? 75, n = o.doors ?? Math.max(1, Math.round(w / 110));
  P.ink(ctx, P.rect(x, y - h, w, h), c, { seed: s }); P.ink(ctx, P.rect(x - 6, y - h - 22, w + 12, 24), P.shade(c, -.25), { seed: s + 1 });
  for (let i = 0; i < n; i++) { const dx = x + 8 + i * (w - 16) / n, dw = (w - 16) / n - 8, pts = P.rect(dx, y - h + 12, dw, h - 22); P.ink(ctx, pts, P.shade(c, -.08), { seed: s + 2 + i, mottle: .3 }); P.hatch(ctx, P.bounds(pts), { angle: -.9, gap: 6, len: 14, density: .2, color: P.alpha(P.shade(c, -.5), .5), seed: s + i }); ctx.fillStyle = P.shade(K.pal.ochre, -.3); ctx.fillRect(dx + dw / 2 - 6, y - h + 20, 12, 3); }
  P.blot(ctx, x + w / 2, y + 2, w * .52, 7, K.pal.ink, { alpha: .25, seed: s + 9 });
  return { x: x - 6, y: y - h - 22, w: w + 12, h: 24 };
}
/** chair(ctx, K, o) — a chair seen straight on. o: x (centre), y (feet), facing ('front' | 'back' | 'left' | 'right'), color, h, kind ('spindle' | 'plain' | 'arm'). */
export function chair(ctx, K, o = {}) {
  const { x, y } = o, c = o.color ?? K.pal.woodDk, h = o.h ?? 150, f = o.facing ?? 'front', s = o.seed ?? 81, seatY = y - h * .45, w = o.w ?? h * .42;
  P.blot(ctx, x, y + 2, w * .55, 6, K.pal.ink, { alpha: .3, seed: s });
  const leg = (lx, top) => P.ink(ctx, P.rect(lx - 3, top, 6, y - top), P.shade(c, -.1), { seed: s + lx | 0, amp: .4, mottle: .1 });
  if (f === 'left' || f === 'right') {
    const dir = f === 'right' ? 1 : -1, back = x - dir * w * .4;
    leg(x - w * .4, seatY); leg(x + w * .4, seatY);
    P.ink(ctx, P.rect(x - w * .5, seatY - 8, w, 12), c, { seed: s + 1 });
    P.ink(ctx, P.rect(back - 4, y - h, 8, h * .55), c, { seed: s + 2 });
    if (o.kind === 'spindle') for (let k = 0; k < 4; k++) P.ink(ctx, P.rect(back - 2 + dir * 0, y - h + 10 + k * 12, dir * w * .02 + 4, 3), c, { seed: s + 3 + k, rough: false, mottle: 0, speck: 0 });
    return;
  }
  leg(x - w * .42, seatY); leg(x + w * .42, seatY);
  if (f === 'back') { P.ink(ctx, P.rect(x - w * .5, seatY - 6, w, 10), P.shade(c, -.15), { seed: s + 1 }); }
  const bt = y - h, bb = seatY - (f === 'front' ? 2 : -6);
  if (o.kind === 'plain') P.ink(ctx, P.rect(x - w * .45, bt, w * .9, bb - bt), c, { seed: s + 4 });
  else { ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - w * .45, bb); ctx.quadraticCurveTo(x - w * .5, bt - 6, x, bt - 8); ctx.quadraticCurveTo(x + w * .5, bt - 6, x + w * .45, bb); ctx.stroke(); ctx.lineWidth = 3; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * w * .15, bt + 4); ctx.lineTo(x + k * w * .17, bb); ctx.stroke(); } }
  if (f === 'front') P.ink(ctx, [[x - w * .5, seatY - 4], [x + w * .5, seatY - 4], [x + w * .44, seatY + 12], [x - w * .44, seatY + 12]], P.shade(c, .08), { seed: s + 5 });
}

// ── things on walls and in corners ──
/** frame(ctx, K, o) — a framed picture. o: x, y, w, h, color, art: fn(ctx, box) | 'portrait' | 'landscape', mat. */
export function frame(ctx, K, o = {}) {
  const { x, y, w, h } = o, c = o.color ?? P.shade(K.pal.ochre, -.25), s = o.seed ?? 91, b = o.border ?? Math.max(6, Math.min(w, h) * .07);
  P.blot(ctx, x + w / 2 + 4, y + h / 2 + 6, w / 2, h / 2, K.pal.ink, { alpha: .18, seed: s, amp: 1 });
  P.ink(ctx, P.rect(x, y, w, h), c, { seed: s, mottle: .4 });
  const box = { x: x + b, y: y + b, w: w - 2 * b, h: h - 2 * b };
  ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  const art = o.art ?? 'portrait';
  if (typeof art === 'function') art(ctx, box);
  else if (art === 'portrait') portrait(ctx, K, box, { seed: s, bg: o.bg, dress: o.dress });
  else { P.ink(ctx, P.rect(box.x, box.y, box.w, box.h), K.pal.steel, { seed: s + 1 }); P.ink(ctx, [[box.x, box.y + box.h * .7], [box.x + box.w * .4, box.y + box.h * .45], [box.x + box.w, box.y + box.h * .65], [box.x + box.w, box.y + box.h], [box.x, box.y + box.h]], K.pal.sage, { seed: s + 2 }); }
  ctx.restore();
  ctx.strokeStyle = P.alpha(P.shade(c, .35), .7); ctx.lineWidth = 1.5; ctx.strokeRect(x + b * .45, y + b * .45, w - b * .9, h - b * .9);
}
/** portrait(ctx, K, box, o) — the long-necked, long-faced sitter of the style (for frames, posters, photographs). */
export function portrait(ctx, K, b, o = {}) {
  const s = o.seed ?? 93, r = P.rng(s);
  P.ink(ctx, P.rect(b.x, b.y, b.w, b.h), o.bg ?? [K.pal.slateDk, K.pal.olive, K.pal.dusk, K.pal.umber][r() * 4 | 0], { seed: s, mottle: .5 });
  const cx = b.x + b.w * (.42 + r() * .16), hw = b.w * .16, hh = b.h * .2, hy = b.y + b.h * .34;
  P.ink(ctx, [[b.x + b.w * .1, b.y + b.h], [cx - hw * 1.8, hy + hh * 2.1], [cx + hw * 1.8, hy + hh * 2.1], [b.x + b.w * .9, b.y + b.h]], o.dress ?? [K.pal.ink, K.pal.cream, K.pal.slate][r() * 3 | 0], { seed: s + 1 });
  P.ink(ctx, P.rect(cx - hw * .35, hy + hh * .6, hw * .7, hh * 1.4), '#e7c7ae', { seed: s + 2, mottle: .2 });
  P.ink(ctx, P.ellipsePts(cx, hy, hw, hh, 30), '#ead0b8', { seed: s + 3, mottle: .3 });
  P.ink(ctx, P.ellipsePts(cx, hy - hh * .45, hw * 1.15, hh * .7, 30, Math.PI, P.TAU), K.pal.ink, { seed: s + 4, mottle: .2 });
  ctx.fillStyle = K.pal.ink; ctx.fillRect(cx - hw * .5, hy - hh * .05, hw * .3, 2); ctx.fillRect(cx + hw * .2, hy - hh * .05, hw * .3, 2);
  ctx.fillStyle = P.alpha(K.pal.dusty, .55); ctx.beginPath(); ctx.arc(cx - hw * .45, hy + hh * .35, hw * .22, 0, P.TAU); ctx.arc(cx + hw * .45, hy + hh * .35, hw * .22, 0, P.TAU); ctx.fill();
  ctx.fillStyle = P.shade(K.pal.dusty, -.2); ctx.fillRect(cx - hw * .18, hy + hh * .55, hw * .36, 2.5);
}
/** lamp(ctx, K, o) — a small fixture: 'pendant' (a cord from the ceiling, o.len) or 'sconce'. Light cones are live: glow(). */
export function lamp(ctx, K, o = {}) {
  const { x, y } = o, c = o.color ?? K.pal.ink;
  if ((o.kind ?? 'pendant') === 'pendant') { ctx.strokeStyle = P.alpha(c, .8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - (o.len ?? 40)); ctx.lineTo(x, y); ctx.stroke(); P.ink(ctx, [[x - 9, y + 10], [x - 4, y], [x + 4, y], [x + 9, y + 10]], c, { seed: o.seed ?? 95, rough: false, mottle: 0 }); }
  else { P.ink(ctx, P.rect(x - 6, y - 4, 12, 16), P.shade(K.pal.ochre, -.3), { seed: o.seed ?? 96, rough: false, mottle: 0 }); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(x, y + 12, 5, 0, P.TAU); ctx.fill(); }
}
/** glow(ctx, K, o, t) — a live chalky cone under a lamp; flickers a little (o.flicker 0–1). o: x, y, w, h, a. */
export function glow(ctx, K, o, t = 0) {
  const f = o.flicker ?? .15, k = 1 - f * (.5 + .5 * Math.sin(t * 7.1 + (o.seed ?? 0))) * (P.noise(t * 3, o.seed ?? 0) > .82 ? 1.8 : .3);
  P.cone(ctx, o.x, o.y + 10, o.w ?? 140, o.h ?? 220, (o.a ?? .42) * k, o.seed ?? 97);
}
/** vine(ctx, K, o) — a creeping vine, the style's favourite way to carry the accent across a surface. o: x, y, len, angle, color, k (0–1 grown), seed, flowers. */
export function vine(ctx, K, o = {}) {
  const c = o.color ?? K.accent, s = o.seed ?? 101, k = o.k ?? 1, r = P.rng(s);
  const grow = (x, y, a, len, w, depth) => {
    let L = len * k; ctx.strokeStyle = c; ctx.lineCap = 'round';
    for (let i = 0; i < L; i += 6) { const nx = x + Math.cos(a) * 6, ny = y + Math.sin(a) * 6; ctx.lineWidth = Math.max(.8, w * (1 - i / (len + 1))); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke(); x = nx; y = ny; a += (P.noise(i * .03, depth * 7, s) - .5) * .5;
      if (r() < .14) { const la = a + (r() < .5 ? 1 : -1) * (.8 + r() * .5); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + Math.cos(la) * 5, y + Math.sin(la) * 5, 5.5, 2.4, la, 0, P.TAU); ctx.fill(); }
      if (o.flowers !== false && r() < .05) { ctx.fillStyle = c; for (let p = 0; p < 4; p++) { const pa = p / 4 * P.TAU + a; ctx.beginPath(); ctx.ellipse(x + Math.cos(pa) * 4, y + Math.sin(pa) * 4, 3.6, 2, pa, 0, P.TAU); ctx.fill(); } }
      if (depth < 2 && r() < .03) grow(x, y, a + (r() < .5 ? 1 : -1) * (.6 + r() * .5), len * .45, w * .7, depth + 1);
    }
  };
  grow(o.x, o.y, o.angle ?? -Math.PI / 2, o.len ?? 300, o.w ?? 2.6, 0);
}
/** plant(ctx, K, o) — 'vase' (a tall ribbed vase with a stem), 'pot' (a leafy pot), 'hanging' (trailing strands). o: x, y (foot), h, color. */
export function plant(ctx, K, o = {}) {
  const { x, y } = o, h = o.h ?? 120, s = o.seed ?? 111, r = P.rng(s), kind = o.kind ?? 'pot', c = o.color ?? K.pal.cream, leaf = o.leaf ?? K.pal.olive;
  if (kind === 'vase') { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, rw = h * (.18 + .1 * Math.sin(t * Math.PI)) * (t > .85 ? .7 : 1); pts.push([x + rw, y - h * t]); } for (let i = 20; i >= 0; i--) { const t = i / 20, rw = h * (.18 + .1 * Math.sin(t * Math.PI)) * (t > .85 ? .7 : 1); pts.push([x - rw, y - h * t]); } P.ink(ctx, pts, c, { seed: s }); ctx.strokeStyle = P.alpha(P.shade(c, -.25), .7); ctx.lineWidth = 1.3; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x + k * h * .05, y - 4); ctx.lineTo(x + k * h * .045, y - h * .86); ctx.stroke(); } ctx.strokeStyle = leaf; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y - h * .9); ctx.quadraticCurveTo(x + (r() - .5) * 60, y - h * 1.4, x + (r() - .5) * 90, y - h * (1.5 + r() * .4)); ctx.stroke(); } }
  else if (kind === 'hanging') { ctx.strokeStyle = leaf; for (let k = 0; k < 7; k++) { let X = x + (r() - .5) * 30, Y = y; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X, Y); for (let i = 0; i < h; i += 6) { X += Math.sin(i * .05 + k) * 1.5; Y += 6; ctx.lineTo(X, Y); } ctx.stroke(); for (let i = 0; i < h; i += 14) { ctx.fillStyle = leaf; ctx.beginPath(); ctx.ellipse(x + (r() - .5) * 36, y + i, 5, 2.4, r() * 3, 0, P.TAU); ctx.fill(); } } }
  else { P.ink(ctx, [[x - h * .2, y - h * .32], [x + h * .2, y - h * .32], [x + h * .15, y], [x - h * .15, y]], c, { seed: s }); for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (r() - .5) * 2.2, L = h * (.4 + r() * .5); ctx.fillStyle = P.mix(leaf, K.pal.sage, r() * .5); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * L * .5, y - h * .32 + Math.sin(a) * L * .5, L * .5, L * .12, a, 0, P.TAU); ctx.fill(); } }
}
/** tree(ctx, K, o) — a dark tree; o.bare for the style's leafless black trunks. o: x, y (foot), h, w (trunk), color. */
export function tree(ctx, K, o = {}) {
  const { x, y } = o, h = o.h ?? 600, w = o.w ?? 38, c = o.color ?? P.shade(K.pal.night, -.45), s = o.seed ?? 121, r = P.rng(s);
  P.ink(ctx, [[x - w / 2, y], [x - w * .32, y - h], [x + w * .32, y - h], [x + w / 2, y]], c, { seed: s, amp: 2, mottle: .4 });
  P.hatch(ctx, { x: x - w / 2, y: y - h, w, h }, { angle: -1.5, gap: 5, len: 30, density: .25, color: P.alpha(P.shade(c, .25), .5), seed: s });
  ctx.strokeStyle = c; ctx.lineCap = 'round';
  const br = (X, Y, a, L, lw, d) => { if (d > 4 || L < 8) return; const X2 = X + Math.cos(a) * L, Y2 = Y + Math.sin(a) * L; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo((X + X2) / 2 + (r() - .5) * L * .3, (Y + Y2) / 2, X2, Y2); ctx.stroke(); const n = 2 + (r() < .4 ? 1 : 0); for (let i = 0; i < n; i++) br(X2, Y2, a + (r() - .5) * 1.3, L * (.55 + r() * .2), lw * .6, d + 1); };
  for (let i = 0; i < 5; i++) br(x + (r() - .5) * w * .3, y - h * (.35 + r() * .6), -Math.PI / 2 + (r() < .5 ? -1 : 1) * (.5 + r() * .8), h * .18, w * .28, 0);
  if (!o.bare) for (let i = 0; i < 70; i++) { const X = x + (r() - .5) * h * .55, Y = y - h * (.55 + r() * .5); ctx.fillStyle = P.alpha(P.mix(o.leaf ?? K.pal.moss, K.pal.olive, r()), .85); ctx.beginPath(); ctx.ellipse(X, Y, 16 + r() * 18, 9 + r() * 10, r() * 3, 0, P.TAU); ctx.fill(); }
}
/** fence(ctx, K, o) — wrought 'iron' (diamonds and scrolls) or a 'picket' fence along o.y from o.x0 to o.x1, o.h tall. */
export function fence(ctx, K, o = {}) {
  const { x0, x1, y } = o, h = o.h ?? 90, c = o.color ?? K.pal.ink, s = o.seed ?? 131;
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y - h * .1); ctx.lineTo(x1, y - h * .1); ctx.moveTo(x0, y - h * .85); ctx.lineTo(x1, y - h * .85); ctx.stroke();
  if ((o.kind ?? 'iron') === 'iron') {
    for (let x = x0; x <= x1; x += 14) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 3, y - h + 4); ctx.lineTo(x, y - h - 6); ctx.lineTo(x + 3, y - h + 4); ctx.fill(); }
    ctx.lineWidth = 1.6; for (let x = x0 + 40; x < x1 - 20; x += 80) { ctx.beginPath(); ctx.moveTo(x, y - h * .78); ctx.lineTo(x + 30, y - h * .48); ctx.lineTo(x, y - h * .18); ctx.lineTo(x - 30, y - h * .48); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - h * .48, 9, 0, P.TAU); ctx.stroke(); }
  } else { for (let x = x0; x <= x1; x += 22) P.ink(ctx, [[x, y], [x, y - h], [x + 7, y - h - 8], [x + 14, y - h], [x + 14, y]], c, { seed: s + x | 0, amp: .6, mottle: .3 }); }
}
/** pool(ctx, K, o) — water seen from above, inside a tiled lip. o: x, y, w, h, color, lip (tile colour). Live ripples: ripple(). */
export function pool(ctx, K, o = {}) {
  const { x, y, w, h } = o, c = o.color ?? K.pal.slate, s = o.seed ?? 141;
  if (o.lip !== false) P.ink(ctx, P.rect(x - 14, y - 14, w + 28, h + 28), o.lip ?? K.pal.bone, { seed: s, mottle: .3 });
  P.ink(ctx, P.rect(x, y, w, h), c, { seed: s + 1, mottle: .7 });
  return { x, y, w, h };
}
/** ripple(ctx, box, t, o) — live wave marks on water (little white scallops drifting). o: color, n, speed. */
export function ripple(ctx, b, t, o = {}) {
  const r = P.rng(o.seed ?? 143), n = o.n ?? Math.round(b.w * b.h / 2600); ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  ctx.strokeStyle = o.color ?? 'rgba(240,244,240,.75)'; ctx.lineWidth = 1.3;
  for (let i = 0; i < n; i++) { const x = b.x + ((r() * b.w + t * (o.speed ?? 6) * (r() + .3)) % b.w), y = b.y + r() * b.h, w = 8 + r() * 10, ph = Math.sin(t * 1.4 + i) * .5 + .5; ctx.globalAlpha = .35 + ph * .55; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w / 2, y - 3, x, y); ctx.quadraticCurveTo(x + w / 2, y - 3, x + w, y); ctx.stroke(); }
  ctx.restore();
}
/** rain(ctx, box, t, o) — live rain as white scratches sliding down-right over glass or sky. o: angle, n, speed, color. */
export function rain(ctx, b, t, o = {}) { P.scratches(ctx, b, { seed: (o.seed ?? 151) + Math.floor(t * (o.rate ?? 12)), angle: o.angle ?? 1.2, n: o.n, len: o.len ?? 26, color: o.color ?? 'rgba(255,255,255,.5)', width: o.width ?? 1.1 }); }

// ── words: the style's two small labels and its paper slips ──
/** label(ctx, K, text, o) — the place name, set vertically in the top-right corner (one syllable under another). */
export function label(ctx, K, text, o = {}) {
  const sz = o.size ?? 30, x = o.x ?? K.W - 58, y = o.y ?? 44;
  ctx.save(); ctx.font = `700 ${sz}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = o.color ?? K.pal.ink;
  [...text].forEach((ch, i) => ctx.fillText(ch, x, y + i * sz * 1.08)); ctx.restore();
}
/** caption(ctx, K, text, o) — the small title line centred near the foot of the plate ("가족형 공포게임 스릴러 · 마마" in the source). */
export function caption(ctx, K, text, o = {}) {
  const sz = o.size ?? 19; ctx.save(); ctx.font = `700 ${sz}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color ?? K.pal.ink;
  ctx.fillText(text, o.x ?? K.W / 2, o.y ?? K.H - 30); ctx.restore();
}
/** slip(ctx, K, o) — a narrow pale paper slip with a line of tiny vertical text (a thought, a note, a clue). o: x, y, text, size. */
export function slip(ctx, K, o = {}) {
  const sz = o.size ?? 13, n = [...o.text].length, w = sz * 1.9, h = n * sz * 1.12 + 16;
  P.ink(ctx, P.rect(o.x, o.y, w, h), o.color ?? '#e9e6da', { seed: o.seed ?? 161, amp: .6, mottle: .2, speck: .2 });
  ctx.save(); ctx.font = `700 ${sz}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = P.alpha(K.pal.ink, .85);
  [...o.text].forEach((ch, i) => ctx.fillText(ch, o.x + w / 2, o.y + 8 + i * sz * 1.12)); ctx.restore();
}
