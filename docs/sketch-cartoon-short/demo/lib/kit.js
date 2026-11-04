// sketch-cartoon-short · kit.js — set pieces and effects in the same pencil: buildings drawn in line with colour that stops
// short of the edges, a one-point perspective street, a far skyline, an arched bridge, rooftops, lamps, a door, contact
// shadows; and the moving things — speed lines, dust puffs, flying paper sheets, rain, gusts, scribble masses, a glow ring.
// Every piece takes a seed so the same call draws the same thing; lines still boil (pen.boil) unless o.still.
// Positions are stage px; a piece's base is where it touches the ground (y grows downward).
import * as S from './sketch.js';
const { TAU, clamp, lerp, tone, mix, rng } = S;

/** a cool contact shadow under a character or prop: flat ellipse + a couple of loose strokes (nothing floats) */
export function shadow(ctx, x, y, rx, o = {}) {
  const col = o.col || '#5c6a5f';
  ctx.save(); ctx.globalAlpha *= o.a ?? .35; S.fill(ctx, S.ellipse(x + (o.dx ?? 12), y + 2, rx, rx * (o.flat ?? .12), 18), col, { off: [0, 0], wob: 2 }); ctx.restore();
  S.line(ctx, [[x - rx * .9, y + 3], [x + rx * 1.1, y + 1]], { w: 1.4, a: .45, passes: 1, over: 10 });
}
/** a ground line across the frame, broken in places, with a few floor strokes */
export function ground(ctx, x0, x1, y, o = {}) {
  const r = rng(o.seed || 3);
  let x = x0; while (x < x1) { const l = 120 + r() * 380; S.line(ctx, [[x, y + (r() - .5) * 3], [Math.min(x1, x + l), y + (r() - .5) * 3]], { w: o.w ?? 1.8, a: o.a ?? .7, passes: 1 }); x += l + 20 + r() * 90; }
  if (o.strokes !== false) S.strokes(ctx, Array.from({ length: 6 }, () => { const sx = lerp(x0, x1, r()), sy = y + 14 + r() * 50; return [[sx, sy], [sx + 60 + r() * 120, sy + (r() - .5) * 4]]; }), { w: 1.3, a: .35 });
}

/**
 * facade(ctx, x, y, w, h, o) — a building front standing on y. o: { floors, cols, wall, trim, awning (accent colour or null),
 * roof: 'cornice' | 'flat' | 'pitched' | 'tower', seed, wash (0…1 how much of the wall gets colour; the rest stays line),
 * door (true), shade (shadow side width 0…1), windowFill, base (an opaque under-colour — the paper tone — so what is behind
 * does not show through the unpainted part of the wall) }
 */
export function facade(ctx, x, y, w, h, o = {}) {
  const r = rng(o.seed || 1), floors = o.floors || Math.max(2, Math.round(h / 95)), cols = o.cols || Math.max(2, Math.round(w / 80));
  const wall = o.wall || '#cfcdb0', trim = o.trim || tone(wall, -.2), top = y - h;
  const body = S.rect(x, top, w, h);
  // wall colour: a wash that covers the lower middle and fades out before the top corners
  const wk = o.wash ?? .8;
  if (o.base) S.fill(ctx, body, o.base, { off: [0, 0], smooth: false, wob: .5 });
  if (wk > 0) S.fill(ctx, [[x + 4, y], [x + w - 4, y], [x + w - 6, top + h * (1 - wk) + 20], [x + w * .7, top + h * (1 - wk) * .6], [x + w * .25, top + h * (1 - wk) * .8], [x + 6, top + h * (1 - wk) + 30]], wall, { smooth: false, tex: .6, seed: o.seed });
  if (o.shade) { ctx.save(); ctx.globalAlpha *= .55; S.fill(ctx, S.rect(x + w * (1 - o.shade), top + 10, w * o.shade, h - 10), tone(wall, -.3), { off: [0, 0], smooth: false }); ctx.restore(); }
  S.shape(ctx, body, { sharp: true, line: { w: 2.2 } });
  // roof line
  if (o.roof === 'pitched') { const ph = w * .32; S.shape(ctx, [[x - 12, top], [x + w / 2, top - ph], [x + w + 12, top]], { sharp: true, fill: o.roofCol || tone(wall, -.35), w: 2.2 }); }
  else if (o.roof === 'tower') { S.shape(ctx, S.rect(x + w * .3, top - h * .25, w * .4, h * .25), { sharp: true, fill: tone(wall, -.1), w: 2 }); S.line(ctx, [[x + w / 2, top - h * .25], [x + w / 2, top - h * .42]], { w: 1.6 }); }
  else if (o.roof !== 'flat') { S.line(ctx, [[x - 10, top + 2], [x + w + 10, top - 2]], { w: 2.4 }); S.line(ctx, [[x - 6, top + 14], [x + w + 6, top + 12]], { w: 1.5, passes: 1 }); }
  // windows: a grid of loose rects, a few with bars, some left unfinished (two sides only)
  const gx = w / cols, gy = (h - (o.door !== false ? 90 : 20)) / floors, wins = [];
  for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) {
    const wx = x + c * gx + gx * .22, wy = top + 24 + fl * gy + gy * .12, ww = gx * .56, wh = gy * .62, q = r();
    if (o.windowFill && q < .5) { ctx.save(); ctx.globalAlpha *= .5; S.fill(ctx, S.rect(wx, wy, ww, wh), o.windowFill, { off: [3, 2], smooth: false }); ctx.restore(); }
    if (q < .82) wins.push(S.rect(wx, wy, ww, wh).concat([[wx, wy]])); else wins.push([[wx, wy + wh], [wx, wy], [wx + ww, wy]]);
    if (q < .3) wins.push([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]]);
    if (fl < floors - 1 && q > .6) wins.push([[wx - 4, wy + wh + 4], [wx + ww + 4, wy + wh + 4]]);   // sill
  }
  S.strokes(ctx, wins, { w: 1.6, smooth: false, over: 4 });
  if (o.door !== false) {
    const dx = x + w * (.3 + r() * .3), dw = Math.min(70, w * .22);
    S.shape(ctx, [[dx, y], [dx, y - 78], [dx + dw / 2, y - 92], [dx + dw, y - 78], [dx + dw, y]], { sharp: true, fill: tone(wall, -.38), w: 1.8 });
    if (o.awning) {
      const ax = x + 8, aw = w - 16, ay = y - 110;
      S.shape(ctx, [[ax, ay], [ax + aw, ay], [ax + aw + 10, ay + 34], [ax - 10, ay + 34]], { sharp: true, fill: o.awning, shade: false, w: 2 });
      S.strokes(ctx, Array.from({ length: Math.round(aw / 28) }, (_, i) => [[ax + i * 28 + 8, ay + 2], [ax + i * 28 + 2, ay + 32]]), { w: 1.2, col: tone(o.awning, -.4) });
    }
  }
  S.hatch(ctx, S.rect(x + w * .72, top + 4, w * .28, h - 4), { sharp: true, angle: -1.1, gap: 9, a: .22, len: .8, still: true });
}

/** a row of facades of varying widths and heights along y, from x0 to x1 (o: { pal: [walls…], hmin, hmax, awnings: [cols], seed, base }) */
export function street(ctx, x0, x1, y, o = {}) {
  const r = rng(o.seed || 7), pal = o.pal || ['#cdcbaa', '#c4c6a4', '#d3ccb0', '#bcc3a8'], aw = o.awnings || ['#d49384'];
  let x = x0;
  while (x < x1) {
    const w = 150 + r() * 170, h = (o.hmin ?? 330) + r() * ((o.hmax ?? 620) - (o.hmin ?? 330));
    facade(ctx, x, y, w, h, { seed: Math.floor(r() * 1e6), wall: pal[Math.floor(r() * pal.length)], awning: r() < (o.awningP ?? .35) ? aw[Math.floor(r() * aw.length)] : null, roof: r() < .2 ? 'pitched' : r() < .15 ? 'tower' : 'cornice', wash: (o.wash ?? .75) * (.6 + r() * .5), shade: r() < .4 ? .2 : 0, base: o.base });
    x += w + (r() < .25 ? 10 + r() * 30 : -2);
  }
}

/**
 * avenue(ctx, o) — one-point perspective street: two walls of buildings receding to a vanishing point, pavements, lamps.
 * o: { vp: [x, y] (vanishing point / horizon), W, H (frame), half (street half-width at the picture plane, px), near (y of the
 * near ground edge), depth (how many buildings each side), pal, awning, seed, wash }
 */
export function avenue(ctx, o = {}) {
  const W = o.W || 1920, H = o.H || 1080, vp = o.vp || [W / 2, H * .46], r = rng(o.seed || 11), pal = o.pal || ['#cfcdae', '#c3c7a6', '#d4cdb2'];
  const eye = H - vp[1], f = 1;                     // the ground is `eye` px below the horizon at depth 1
  const P = (X, Y, Z) => [vp[0] + X / Z * f * 400, vp[1] + Y / Z * f * 400];   // X across, Y down from eye level (ground Y = eyeY), Z depth
  const gY = eye / 400 * 1.0, half = (o.half ?? 520) / 400;
  // ground: pavement edges and a few joints converging
  for (const side of [-1, 1]) {
    S.line(ctx, [P(side * half, gY, .9), P(side * half, gY, 40)], { w: 2.2 });
    S.line(ctx, [P(side * half * .72, gY, .9), P(side * half * .72, gY, 40)], { w: 1.4, a: .6 });
  }
  S.strokes(ctx, [1.2, 1.6, 2.3, 3.4, 5.5].map(z => [P(-half * .72, gY, z), P(half * .72, gY, z)]), { w: 1.1, a: .35 });
  // buildings each side, near to far; draw far first so near overlaps
  for (const side of [-1, 1]) {
    const blds = []; let z = .95;
    for (let i = 0; i < (o.depth || 7); i++) { const dz = .5 + r() * .9, h = (1.6 + r() * 1.8) * (o.tall ?? 1); blds.push({ z0: z, z1: z + dz, h, wall: pal[Math.floor(r() * pal.length)], aw: r() < .45, seed: Math.floor(r() * 1e6) }); z += dz + (r() < .3 ? .15 : 0); }
    for (const b of blds.reverse()) {
      const X = side * half, q = [P(X, gY, b.z0), P(X, gY - b.h, b.z0), P(X, gY - b.h, b.z1), P(X, gY, b.z1)];
      const near = b.z0 < 2;
      S.fill(ctx, [q[0], L(q[0], q[1], .75), L(q[3], q[2], .55), q[3]], b.wall, { smooth: false, tex: .5, seed: b.seed });
      S.shape(ctx, q, { sharp: true, line: { w: near ? 2.4 : 1.6 } });
      // window rows: lines converging to the vp, cut into window ticks
      const rows = Math.max(2, Math.round(b.h / .42)), cols = Math.max(2, Math.round((b.z1 - b.z0) / .22)), wl = [];
      for (let ri = 0; ri < rows; ri++) for (let ci = 0; ci < cols; ci++) {
        const y0 = gY - b.h + .18 + ri * (b.h - .55) / rows, y1 = y0 + (b.h - .55) / rows * .55, za = b.z0 + (ci + .25) / cols * (b.z1 - b.z0), zb = b.z0 + (ci + .7) / cols * (b.z1 - b.z0);
        wl.push([P(X, y1, za), P(X, y0, za), P(X, y0, zb), P(X, y1, zb), P(X, y1, za)]);
      }
      S.strokes(ctx, wl, { w: near ? 1.5 : 1.1, smooth: false, over: 3 });
      S.line(ctx, [P(X, gY - b.h - .05, b.z0 - .02), P(X, gY - b.h - .05, b.z1 + .02)], { w: near ? 2.2 : 1.4 });   // cornice
      if (b.aw && o.awning !== null) {
        const a = [P(X, gY - .55, b.z0 + .05), P(X, gY - .55, b.z1 - .05), P(X - side * .18, gY - .38, b.z1 - .05), P(X - side * .18, gY - .38, b.z0 + .05)];
        S.shape(ctx, a, { sharp: true, fill: o.awning || '#d39585', w: near ? 1.8 : 1.2 });
      }
    }
  }
  // lamps along the pavement
  for (const z of o.lamps || [1.3, 2.6, 5]) for (const side of [-1, 1]) { const b = P(side * half * .8, gY, z), t = P(side * half * .8, gY - 1.25, z); lamp(ctx, b[0], b[1], b[1] - t[1], { face: -side }); }
  return { P, vp, gY };
}
const L = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

/** a street lamp of height h standing on (x, y) */
export function lamp(ctx, x, y, h, o = {}) {
  const f = o.face || 1, w = Math.max(1.2, h / 120);
  S.line(ctx, [[x, y], [x - f * h * .01, y - h * .5], [x, y - h]], { w: w * 1.6 });
  S.line(ctx, [[x, y - h], [x + f * h * .08, y - h * 1.04], [x + f * h * .14, y - h * .98]], { w: w * 1.4 });
  S.shape(ctx, [[x + f * h * .1, y - h * .98], [x + f * h * .18, y - h * .98], [x + f * h * .16, y - h * .93], [x + f * h * .12, y - h * .93]], { sharp: true, fill: o.glow || '#e8e0bf', w });
}

/** a far skyline: towers in flat dusty colour, sparse window ticks; base on y. o: { col, n, hmin, hmax, seed, a, spires } */
export function skyline(ctx, x0, x1, y, o = {}) {
  const r = rng(o.seed || 5), col = o.col || '#86a29b';
  let x = x0; const ticks = [];
  ctx.save(); ctx.globalAlpha *= o.a ?? 1;
  while (x < x1) {
    const w = 40 + r() * 110, h = (o.hmin ?? 120) + r() * ((o.hmax ?? 420) - (o.hmin ?? 120)) * (r() < .15 ? 1.6 : 1), c = mix(col, '#c9d3c2', r() * .3);
    const pts = r() < (o.spires ?? .15) ? [[x, y], [x, y - h], [x + w * .3, y - h], [x + w * .5, y - h - 60 - r() * 80], [x + w * .7, y - h], [x + w, y - h], [x + w, y]] : S.rect(x, y - h, w, h);
    S.shape(ctx, pts, { sharp: true, fill: c, line: { w: 1.2, a: .5, still: true }, tex: .3 });
    for (let i = 0; i < h / 22; i++) if (r() < .5) { const wy = y - h + 12 + i * 22, wx = x + 6 + r() * (w - 20); ticks.push([[wx, wy], [wx + 6 + r() * 10, wy]]); }
    x += w + (r() < .3 ? r() * 30 : -6);
  }
  S.strokes(ctx, ticks, { w: 1, a: .4, still: true });
  ctx.restore();
}

/** an arched viaduct: deck from x0 to x1 at y (top), arches below down to yb. o: { col, n (arches), seed, rise (deck curve) } */
export function bridge(ctx, x0, x1, y, yb, o = {}) {
  const n = o.n || 4, col = o.col || '#6f8f88', w = (x1 - x0) / n, rise = o.rise || 0, dy = x => -rise * Math.sin(Math.PI * clamp((x - x0) / (x1 - x0)));
  const top = Array.from({ length: 13 }, (_, i) => { const x = lerp(x0, x1, i / 12); return [x, y + dy(x)]; });
  const body = [...top, [x1, yb], ...Array.from({ length: n }, (_, k) => {
    const cx = x1 - (k + .5) * w, a = []; a.push([cx + w * .38, yb]); for (let j = 0; j <= 10; j++) { const t = j / 10 * Math.PI; a.push([cx + Math.cos(t) * w * .38, yb - Math.sin(t) * (yb - y) * .62 + dy(cx) * .5]); } a.push([cx - w * .38, yb]); return a;
  }).flat(), [x0, yb]];
  S.shape(ctx, body, { sharp: true, fill: col, shade: tone(col, -.2), tex: .6, w: 2.4 });
  S.line(ctx, top.map(p => [p[0], p[1] + 16]), { w: 1.6, passes: 1 });           // parapet line
  S.strokes(ctx, Array.from({ length: Math.round((x1 - x0) / 40) }, (_, i) => { const x = x0 + 20 + i * 40; return [[x, y + dy(x) + 2], [x, y + dy(x) + 15]]; }), { w: 1.1, a: .6 });
}

/** pitched rooftops in a row on y (eaves line), for rooftop chases. o: { pal, roof, n, seed, chimneys } → [{ x0, x1, peak, y }] */
export function roofs(ctx, x0, x1, y, o = {}) {
  const r = rng(o.seed || 9), pal = o.pal || ['#c9c7a8', '#bfc5a5'], rc = o.roof || '#7d8f84', out = [];
  let x = x0;
  while (x < x1) {
    const w = 220 + r() * 260, ph = 70 + r() * 110, wall = pal[Math.floor(r() * pal.length)], ey = y + (r() - .5) * 40;
    S.shape(ctx, [[x, ey], [x + w, ey], [x + w, ey + 600], [x, ey + 600]], { sharp: true, fill: wall, tex: .5, w: 2 });
    const roof = [[x - 18, ey + 6], [x + w * .5, ey - ph], [x + w + 18, ey + 6]];
    S.shape(ctx, roof, { sharp: true, fill: rc, shade: tone(rc, -.2), tex: .5, w: 2.4 });
    S.hatch(ctx, roof, { sharp: true, angle: .2, gap: 11, a: .35, len: .9 });
    if (o.chimneys !== false && r() < .7) { const cx = x + w * (.6 + r() * .2), cy = ey - ph * .5; S.shape(ctx, S.rect(cx, cy - 70, 34, 80), { sharp: true, fill: tone(wall, -.2), w: 2 }); }
    const wins = []; for (let i = 0; i < Math.round(w / 90); i++) { const wx = x + 30 + i * 90; wins.push(S.rect(wx, ey + 50, 34, 48).concat([[wx, ey + 50]])); }
    S.strokes(ctx, wins, { w: 1.5, smooth: false });
    out.push({ x0: x, x1: x + w, peak: ey - ph, y: ey });
    x += w + 40 + r() * 120;
  }
  return out;
}

/** a door in a frame standing on (x, y), opened k (0 shut … 1 open toward the viewer), w × h */
export function door(ctx, x, y, w, h, k = 0, o = {}) {
  S.line(ctx, [[x - w / 2, y], [x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2, y]], { w: o.w ?? 2.4, smooth: false });
  if (o.light && k > 0) { ctx.save(); ctx.globalAlpha *= k; S.fill(ctx, S.rect(x - w / 2 + 3, y - h + 3, w - 6, h - 3), o.light, { off: [0, 0], smooth: false }); ctx.restore(); }
  const ex = x - w / 2 + w * Math.cos(k * 1.35);   // the free edge swings toward the hinge side, a little toward us
  S.shape(ctx, [[x - w / 2, y], [x - w / 2, y - h], [ex, y - h - k * h * .06], [ex, y + k * h * .04]], { sharp: true, fill: o.col || null, w: 2 });
  S.fill(ctx, S.ellipse(lerp(x - w / 2, ex, .85), y - h * .48, 4, 4, 6), '#2b2c29', { off: [0, 0] });
}

// ── effects ──
/** speed lines streaming away from motion: o: { dir (angle the thing moves), n, len, spread, seed } around (x, y) */
export function speed(ctx, x, y, o = {}) {
  const r = rng(o.seed || 1), a = (o.dir ?? 0) + Math.PI, n = o.n || 7, list = [];
  for (let i = 0; i < n; i++) { const off = (r() - .5) * (o.spread ?? 160), l = (o.len ?? 220) * (.5 + r() * .6), sx = x + Math.cos(a) * (40 + r() * 60) - Math.sin(a) * off, sy = y + Math.sin(a) * (40 + r() * 60) + Math.cos(a) * off; list.push([[sx, sy], [sx + Math.cos(a) * l, sy + Math.sin(a) * l]]); }
  S.strokes(ctx, list, { w: o.w ?? 1.8, a: o.a ?? .6 });
}
/** a dust puff at (x, y), k 0…1 (grows and thins), drawn on twos by the caller */
export function puff(ctx, x, y, k, o = {}) {
  if (k <= 0 || k >= 1) return;
  const r = rng(o.seed || 2), n = o.n || 5, R = (o.r || 40) * (.5 + k);
  ctx.save(); ctx.globalAlpha *= (1 - k) * (o.a ?? .8);
  for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI * (o.up ? 1 : .9) + (r() - .5) * .3, d = R * (.6 + k * .9); S.shape(ctx, S.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .5 - R * .3, R * (.45 - k * .2), R * (.38 - k * .15), 10), { fill: o.col || '#d8d6c0', w: 1.6 }); }
  ctx.restore();
}
/** a loose sheet of paper with a doodle on it, centred on (x, y), turned rot, bent by flap (−1…1); s = width */
export function sheet(ctx, x, y, s, rot = 0, o = {}) {
  const fl = o.flap || 0, h = s * 1.3, c = Math.cos(rot), sn = Math.sin(rot), T = ([u, v]) => [x + u * c - v * sn, y + u * sn + v * c];
  const pts = [[-s / 2, -h / 2], [s / 2 + fl * s * .1, -h / 2 + fl * s * .2], [s / 2, h / 2], [-s / 2 - fl * s * .08, h / 2 - fl * s * .15]].map(T);
  S.shape(ctx, pts, { sharp: true, fill: o.col || '#eeead9', shade: tone(o.col || '#eeead9', -.12), w: 1.8 });
  const r = rng(o.seed || 4);
  if (o.doodle !== false) { if (r() < .5) S.scribble(ctx, x, y, s * .22, s * .18, { n: 6, w: 1.2, a: .7, still: true }); else S.strokes(ctx, [0, 1, 2].map(i => [T([-s * .3, -h * .25 + i * h * .2]), T([s * (.1 + r() * .2), -h * .25 + i * h * .2 + 2])]), { w: 1.2 }); }
}
/** a pencil (the one that draws the film): tip at (x, y), pointing along ang, length l */
export function pencil(ctx, x, y, ang, l = 160, o = {}) {
  const c = Math.cos(ang), s = Math.sin(ang), T = ([u, v]) => [x - u * c - v * s, y - u * s + v * c], w = l * .07;
  S.shape(ctx, [[0, 0], [l * .16, -w], [l, -w], [l, w], [l * .16, w]].map(T), { sharp: true, fill: o.col || '#d9b55a', w: 1.8 });
  S.shape(ctx, [[0, 0], [l * .16, -w], [l * .16, w]].map(T), { sharp: true, fill: '#e5cfa4', w: 1.4 });
  S.shape(ctx, [[l * .88, -w], [l, -w], [l, w], [l * .88, w]].map(T), { sharp: true, fill: o.eraser || '#d58f86', w: 1.4 });
}
/** a glowing ring (the one warm accent of magic) at (x, y), radius r, strength k */
export function ring(ctx, x, y, r, k = 1, o = {}) {
  if (k <= 0) return;
  const col = o.col || '#f2c96a';
  ctx.save(); ctx.globalAlpha *= k; ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, r * .7, x, y, r * 1.35); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, S.rgba(col, .55)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 1.4 * (o.squash ?? 1), 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha *= k; S.loop(ctx, S.ellipse(x, y, r, r * (o.squash ?? 1), 28), { col: mix(col, '#fff6d8', .4), w: 3.4, wob: 2.4 }); S.loop(ctx, S.ellipse(x, y, r * .94, r * .94 * (o.squash ?? 1), 28), { col, w: 1.6, wob: 3 }); ctx.restore();
}
/** slanted pencil rain over a W × H area at time t (falls on twos). o: { n, len, slant, a, seed } */
export function rain(ctx, W, H, t, o = {}) {
  const r = rng(o.seed || 8), n = o.n || 140, len = o.len || 46, sl = o.slant ?? .25, list = [], tt = Math.floor(t * 12) / 12;
  for (let i = 0; i < n; i++) { const x0 = r() * (W + 300) - 150, sp = 900 + r() * 500, y = ((r() * H + tt * sp) % (H + 120)) - 60, x = x0 - (y * sl); list.push([[x, y], [x - len * sl, y + len]]); }
  S.strokes(ctx, list, { w: o.w ?? 1.3, a: o.a ?? .5, col: o.col });
}
/** a gust: curling wind lines around (x, y), k 0…1 sweeps them through; dir = 1 blows to the right */
export function gust(ctx, x, y, s, k, o = {}) {
  if (k <= 0) return;
  const d = o.dir || 1, list = [];
  for (let i = 0; i < (o.n || 3); i++) {
    const yy = y + (i - 1) * s * .35, x0 = x - d * s * (1 - k * 2), pts = [];
    for (let j = 0; j <= 14; j++) { const u = j / 14, a = u * Math.PI * 1.6; pts.push(j < 10 ? [x0 + d * u * s * 1.4, yy + Math.sin(u * 7 + i) * s * .04] : [x0 + d * (s * 1.0 + Math.sin(a) * s * .12), yy - (1 - Math.cos(a)) * s * .1]); }
    list.push(S.sub(pts, clamp(k * 1.6 - .6), clamp(k * 1.6)));
  }
  S.strokes(ctx, list.filter(p => p.length > 1), { w: o.w ?? 2, a: o.a ?? .7 });
}
/**
 * mass(ctx, x, y, rx, ry, o) — a living scribble mass (a storm cloud, a shadow beast, smoke, a hole in the page). o: { col, core,
 * eyes: null | { shape: 'slit' | 'round' | 'moon', look: [x, y], open (0…1), col }, k (0…1 grows in), n, stray }
 */
export function mass(ctx, x, y, rx, ry, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  S.scribble(ctx, x, y, rx * k, ry * k, { col: o.col || '#1c1d1b', core: o.core ?? '#252623', n: o.n ?? 70, w: o.w ?? 2.6, stray: o.stray ?? .5, a: .9 });
  S.scribble(ctx, x, y, rx * k * 1.06, ry * k * 1.06, { col: o.col || '#1c1d1b', core: null, n: Math.round((o.n ?? 70) * .3), w: 1.4, stray: .9, a: .7 });
  const e = o.eyes; if (!e || k < .8) return;
  const ec = e.col || '#f2eee0', lk = e.look || [0, 0], op = e.open ?? 1;
  for (const sd of [-1, 1]) {
    const ex = x + sd * rx * .32 + lk[0] * rx * .08, ey = y - ry * .12 + lk[1] * ry * .08;
    const pts = e.shape === 'round' ? S.ellipse(ex, ey, rx * .12, ry * .14 * op, 14)
      : e.shape === 'moon' ? [...S.arc(ex, ey, rx * .14, ry * .12 * op, Math.PI, TAU, 8), ...S.arc(ex, ey - ry * .04 * op, rx * .14, ry * .04 * op, TAU, Math.PI, 8)]
        : S.rot(S.ellipse(ex, ey, rx * .16, ry * .07 * op, 14), sd * -.45, ex, ey);
    S.fill(ctx, pts, ec, { off: [0, 0], wob: 1 });
  }
}
/** a pencil trail being drawn along pts up to k (0…1): the line that runs ahead of the hero, a circle on the ground … */
export function trail(ctx, pts, k, o = {}) { if (k > 0) S.line(ctx, S.sub(S.curve(pts, 8), 0, clamp(k)), { w: o.w ?? 3.2, over: 0, col: o.col, smooth: false }); }
