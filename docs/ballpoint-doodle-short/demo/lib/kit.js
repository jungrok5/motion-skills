// ballpoint-doodle-short · kit.js — the world: one red ballpoint line the whole story walks along (it tilts into slopes,
// turns blue where it is water, drops straight down at a cliff), the little things that stand on it, and the pen effects
// that act (rays, speed lines, sweat, notes, stars, puffs, splashes, gusts). Everything is drawn with pen.js in the same two
// hands. Coordinates are world units (the film's camera looks at them); y grows downward; the line is the ground.
//
//   const L = K.track([[0, 700], [900, 700], [1500, 880], [1500, 1600], [2600, 1600]], { water: [[1800, 2300]] });
//   L.y(x) → ground height at x · L.slope(x) → dy/dx · L.draw(ctx, x0, x1) (draws only what is between x0 and x1)
import * as P from './pen.js';
const { TAU, ink, crayon, shape, hatch, hash, clamp, lerp, INK, CRAYON, rgba, mix } = P;

/** the ground: a polyline left → right. Two points with the same x make a cliff (the drop is drawn and hatched). */
export function track(pts, o = {}) {
  const water = o.water || [], col = o.col || INK.red, wcol = o.wcol || INK.blue;
  const segAt = x => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0] && pts[i][0] > pts[i - 1][0] && x >= pts[i - 1][0]) return i; return x < pts[0][0] ? 1 : pts.length - 1; };
  const y = x => { const i = segAt(x), a = pts[i - 1], b = pts[i]; if (b[0] === a[0]) return b[1]; return lerp(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0]))); };
  const slope = x => { const i = segAt(x), a = pts[i - 1], b = pts[i]; return b[0] === a[0] ? 0 : (b[1] - a[1]) / (b[0] - a[0]); };
  const isWater = x => water.some(([a, b]) => x >= a && x <= b);
  function draw(ctx, x0 = -1e9, x1 = 1e9) {
    // split the polyline into dry and wet runs at the water edges, then ink each run in its own colour
    const cuts = [...new Set([...pts.map(p => p[0]), ...water.flat()])].sort((a, b) => a - b).filter(x => x >= pts[0][0] && x <= pts[pts.length - 1][0]);
    let run = [], wet = null;
    const flush = () => { if (run.length > 1) { const vis = run.some(p => p[0] >= x0 - 40 && p[0] <= x1 + 40) || (run[0][0] < x0 && run[run.length - 1][0] > x1); if (vis) ink(ctx, run, { col: wet ? wcol : col, w: o.w ?? 2.6, amp: 1.2, over: 0, step: 18 }); } run = []; };
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i && p[0] === pts[i - 1][0]) {   // a cliff: finish the top run, draw the face, start below
        flush(); const fx = p[0], top = pts[i - 1][1], bot = p[1];
        if (fx > x0 - 300 && fx < x1 + 300) {
          const face = []; for (let j = 0; j <= 10; j++) face.push([fx + (hash(fx, j) - .5) * 10 + (j ? 6 : 0), lerp(top, bot, j / 10)]);
          ink(ctx, face, { col, w: o.w ?? 2.6, over: 0 });
          for (let yy = top + 20; yy < bot - 20; yy += 46) hatch(ctx, fx - 20, yy, 22, 34 * (.6 + hash(yy, fx) * .4), { col, a: .45, gap: 4, ang: 1.2, seed: yy });
        }
        run = [p]; wet = isWater(p[0] + 1); continue;
      }
      if (i) {   // insert water-edge cut points inside this segment
        const a = pts[i - 1];
        for (const c of cuts) if (c > a[0] && c < p[0]) { const q = [c, lerp(a[1], p[1], (c - a[0]) / (p[0] - a[0]))]; run.push(q); const w2 = isWater(c + 1); if (w2 !== wet) { flush(); run = [q]; wet = w2; } }
      } else wet = isWater(p[0] + 1);
      run.push(p);
    }
    flush();
    for (const [a, b] of water) {   // little ~ marks under the water line
      for (let x = a + 30; x < b - 30; x += 70) { if (x < x0 - 60 || x > x1 + 60) continue; const yy = y(x) + 22 + hash(x, 3) * 22, xx = x + (hash(x, 1) - .5) * 30; ink(ctx, [[xx - 12, yy], [xx - 6, yy - 4], [xx, yy], [xx + 6, yy - 4], [xx + 12, yy]], { col: wcol, w: 1.8, second: .2, over: 0 }); }
    }
  }
  return { pts, water, y, slope, isWater, draw, x0: pts[0][0], x1: pts[pts.length - 1][0] };
}

// ── things that stand on the line (x, y = the foot of the thing on the ground) ──
export function grass(ctx, x, y, s = 1, col = INK.green) {
  ink(ctx, [[x - 8 * s, y], [x - 12 * s, y - 20 * s]], { col, w: 2, second: .25 });
  ink(ctx, [[x - 2 * s, y], [x - 1 * s, y - 28 * s]], { col, w: 2, second: .25 });
  ink(ctx, [[x + 4 * s, y], [x + 11 * s, y - 18 * s]], { col, w: 2, second: .25 });
}
export function flower(ctx, x, y, s = 1, col = CRAYON.pink) {
  ink(ctx, [[x, y], [x + 3 * s, y - 25 * s], [x + 1 * s, y - 46 * s]], { col: INK.green, w: 2 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, cx = x + 1 * s + Math.cos(a) * 9 * s, cy = y - 52 * s + Math.sin(a) * 9 * s; shape(ctx, P.ellipse(cx, cy, 7 * s, 7 * s, 10), { fill: col, line: mix(col, INK.navy, .5), gap: 3, w: 1.6, second: 0 }); }
  shape(ctx, P.ellipse(x + 1 * s, y - 52 * s, 5 * s, 5 * s, 10), { fill: CRAYON.yellow, line: INK.orange, gap: 3, w: 1.5, second: 0 });
}
/** a fern: a stem with paired leaves, green crayon in green ink (the plant every scene can use) */
export function fern(ctx, x, y, h = 260, o = {}) {
  const lean = o.lean ?? .06, col = o.col || CRAYON.leaf, line = o.line || INK.green, sway = o.sway || 0;
  const stem = []; for (let i = 0; i <= 8; i++) { const k = i / 8; stem.push([x + Math.sin(k * 1.6) * h * lean + sway * k * k * 20, y - k * h]); }
  ink(ctx, stem, { col: line, w: 2.4 });
  const n = o.leaves ?? 9;
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 1.2), p = stem[Math.round(k * 8)], L = h * .26 * (1 - k * .6);
    for (const sd of [-1, 1]) {
      const a = sd > 0 ? -.55 - k * .3 : Math.PI + .55 + k * .3, pts = P.move(P.rot([[0, 0], [L * .45, -L * .16], [L, 0], [L * .45, L * .14]], a + sway * .08), p[0] + sway * k * k * 20, p[1]);
      shape(ctx, pts, { fill: col, line, gap: 3.6, w: 1.8, second: .2 });
      ink(ctx, [pts[0], pts[2]], { col: line, w: 1.2, second: 0, over: 0 });
    }
  }
}
export function mushroom(ctx, x, y, s = 1, col = CRAYON.red) {
  shape(ctx, [[x - 9 * s, y], [x - 7 * s, y - 40 * s], [x + 7 * s, y - 40 * s], [x + 9 * s, y]], { fill: CRAYON.cream, line: INK.red, gap: 3.4, w: 2 });
  const cap = [...P.arc(x, y - 40 * s, 44 * s, 36 * s, Math.PI, TAU, 14), [x + 40 * s, y - 36 * s], [x - 40 * s, y - 36 * s]];
  shape(ctx, cap, { fill: col, shade: true, line: INK.red, gap: 3.8 });
  for (const [dx, dy, r] of [[-18, -58, 6], [6, -66, 5], [22, -50, 5], [-4, -48, 4]]) shape(ctx, P.ellipse(x + dx * s, y + dy * s, r * s, r * s * .8, 10), { fill: CRAYON.white, line: false, gap: 2.6 });
}
export function rock(ctx, x, y, w = 70, h = 34, col = CRAYON.stone) {
  const pts = [[x - w / 2, y], [x - w * .42, y - h * .55], [x - w * .15, y - h], [x + w * .25, y - h * .9], [x + w * .48, y - h * .4], [x + w / 2, y]];
  shape(ctx, pts, { fill: col, shade: mix(col, '#2a2a33', .4), line: INK.red, gap: 4, sk: .5 });
}
export function stump(ctx, x, y, w = 110, h = 120) {
  const pts = [[x - w / 2, y], [x - w * .46, y - h], [x + w * .46, y - h], [x + w / 2, y]];
  shape(ctx, pts, { fill: CRAYON.brown, shade: true, line: INK.brown, gap: 4.4 });
  shape(ctx, P.ellipse(x, y - h, w * .46, 14, 20), { fill: CRAYON.tan, line: INK.brown, gap: 3.6 });
  ink(ctx, P.ellipse(x, y - h, w * .22, 6, 14), { col: INK.brown, w: 1.4, closed: true, second: 0 });
  for (const k of [-.25, .1, .3]) ink(ctx, [[x + k * w, y - h * .85], [x + k * w + 3, y - h * .2]], { col: INK.brown, w: 1.4, second: 0 });
}
export function tree(ctx, x, y, h = 420, col = CRAYON.leaf) {
  shape(ctx, [[x - 16, y], [x - 12, y - h * .5], [x + 12, y - h * .5], [x + 16, y]], { fill: CRAYON.brown, line: INK.brown, gap: 4 });
  const blobs = [[0, -.72, .32], [-.22, -.6, .22], [.22, -.6, .22], [0, -.95, .2]];
  for (const [dx, dy, r] of blobs) shape(ctx, P.ellipse(x + dx * h, y + dy * h, r * h, r * h * .85, 20), { fill: col, shade: true, line: INK.green, gap: 4.4 });
}
export function sun(ctx, x, y, r = 50, t = 0) {
  shape(ctx, P.ellipse(x, y, r, r, 22), { fill: CRAYON.yellow, line: INK.orange, gap: 3.6, a: .7, w: 2 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * .15, r0 = r * 1.3, r1 = r * (1.65 + .1 * Math.sin(t * 4 + i)); ink(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], { col: INK.orange, w: 2, second: .2, over: 0 }); }
}
export function cloud(ctx, x, y, s = 1) {
  const pts = []; const bumps = [[-60, 0, 34], [-25, -22, 38], [20, -26, 40], [58, -4, 32]];
  for (let i = 0; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI; let r = 0; for (const [bx, by, br] of bumps) { const px = Math.cos(a) * 95, d = Math.abs(px - bx); r = Math.max(r, br - d * .15 + 20 - by * .2); } pts.push([x + Math.cos(a) * 95 * s, y + Math.sin(a) * r * s]); }
  shape(ctx, [...pts, [x + 95 * s, y], [x - 95 * s, y]], { fill: CRAYON.sky, line: INK.blue, gap: 5, a: .35, base: .08, w: 2 });
}
export function lilypad(ctx, x, y, w = 90) {
  const pts = P.ellipse(x, y, w / 2, w * .11, 20); pts.splice(0, 2, [x + w * .12, y], [x + w / 2, y - 2]);
  shape(ctx, pts, { fill: CRAYON.green, line: INK.green, gap: 3.6, w: 2 });
}
/** a sign on a stick with handwriting — the only words in the film live on things like this */
export function sign(ctx, x, y, text, o = {}) {
  // o.layout: the text the box is sized and centred for (e.g. the text plus a letter added later), so it does not jump
  const size = o.size ?? 46, lay = o.layout || text, lines = String(lay).split('\n'), tw = P.handWidth(ctx, lay, size), w = o.w ?? tw + 50, h = o.h ?? lines.length * size * 1.05 + 30, top = y - (o.post ?? 150) - h;
  ink(ctx, [[x, y], [x + 2, top + h]], { col: INK.red, w: 2.4 });
  ink(ctx, P.rect(x - w / 2, top, w, h), { col: o.col || INK.blue, w: 2.6, closed: true });
  const x0 = x - tw / 2, y0 = top + size * .95 + 8;
  P.hand(ctx, text, x0, y0, { size, col: o.col || INK.blue });
  const tl = String(text).split('\n'), last = tl[tl.length - 1];
  // where a letter written later would go (the end of the last line): draw it with P.hand, inside g.drawOn to write it on
  return { endX: x0 + P.handWidth(ctx, last, size), endY: y0 + (tl.length - 1) * size * 1.05, size, top, w, h };
}
/** a contact shadow: ballpoint scribble under whatever stands there (k = 0…1 how near the ground it is) */
export function shadow(ctx, x, y, w = 90, k = 1) { if (k <= .05) return; hatch(ctx, x - w / 2 * k, y + 1, w * k, 12 * k, { col: INK.grey, a: .42 * k, gap: 4.5, ang: 1.25, taper: true, seed: Math.round(x / 6) }); }

// ── effects (pen marks that act) ──
/** impact / surprise rays around a point: n strokes, radius r, k 0…1 grows */
export function rays(ctx, x, y, r = 90, k = 1, o = {}) {
  const n = o.n ?? 7, a0 = o.a0 ?? -Math.PI * .95, a1 = o.a1 ?? -Math.PI * .05, col = o.col || INK.black;
  for (let i = 0; i < n; i++) { const a = lerp(a0, a1, n === 1 ? .5 : i / (n - 1)), r0 = r * (.7 + .1 * hash(i, 3)), r1 = r0 + r * .45 * k; if (k > 0) ink(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], { col, w: 2.4, second: .2, over: 0 }); }
}
/** speed lines trailing behind a mover heading in dir (+1 right, −1 left) */
export function speed(ctx, x, y, h = 120, dir = 1, len = 80, n = 4) {
  for (let i = 0; i < n; i++) { const yy = y - h / 2 + (i + .5) / n * h, l = len * (.6 + .4 * hash(i, 7)), xx = x - dir * (20 + hash(i, 2) * 25); ink(ctx, [[xx, yy], [xx - dir * l, yy]], { col: INK.grey, w: 1.8, second: 0, over: 0 }); }
}
/** a drop: sweat (blue), a tear, a water drop */
export function drop(ctx, x, y, s = 1, col = CRAYON.sky) {
  const pts = [[x, y - 14 * s], [x + 7 * s, y], [x + 6 * s, y + 6 * s], [x, y + 9 * s], [x - 6 * s, y + 6 * s], [x - 7 * s, y]];
  shape(ctx, pts, { fill: col, line: INK.blue, gap: 2.6, w: 1.8, second: 0 });
}
/** music notes drifting up from a hummer: t in seconds */
export function notes(ctx, x, y, t, n = 2) {
  for (let i = 0; i < n; i++) {
    const k = ((t * .6 + i / n) % 1), nx = x + i * 46 + Math.sin(k * 6 + i) * 12, ny = y - k * 120, a = Math.sin(Math.PI * k);
    if (a < .1) continue; ctx.save(); ctx.globalAlpha = a;
    P.blot(ctx, P.ellipse(nx, ny, 9, 7, 10), INK.navy); ink(ctx, [[nx + 8, ny], [nx + 8, ny - 34]], { col: INK.navy, w: 2.4, second: 0, over: 0 });
    if (i % 2) ink(ctx, [[nx + 8, ny - 34], [nx + 20, ny - 26]], { col: INK.navy, w: 3, second: 0, over: 0 });
    ctx.restore();
  }
}
/** dizzy stars circling a head */
export function stars(ctx, x, y, t, r = 50) {
  for (let i = 0; i < 3; i++) { const a = t * 4 + i / 3 * TAU, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * .3; const pts = []; for (let j = 0; j < 10; j++) { const rr = j % 2 ? 5 : 12; pts.push([sx + Math.cos(j / 10 * TAU - Math.PI / 2) * rr, sy + Math.sin(j / 10 * TAU - Math.PI / 2) * rr]); } shape(ctx, pts, { fill: CRAYON.yellow, line: INK.orange, gap: 2.6, w: 1.6, second: 0 }); }
}
/** a dust puff where something lands or kicks off: k 0…1 */
export function puff(ctx, x, y, k, s = 1) {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 5; i++) { const a = Math.PI + i / 4 * Math.PI, d = (20 + 50 * k) * s, r = (12 + 10 * hash(i, 4)) * s * (1 - k * .6); ctx.save(); ctx.globalAlpha = 1 - k; ink(ctx, P.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .45 - 6, r, r * .8, 10), { col: INK.grey, w: 1.8, closed: true, second: 0 }); ctx.restore(); }
}
/** a splash of drops thrown up from (x, y): k 0…1 */
export function splash(ctx, x, y, k, s = 1) {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 7; i++) { const a = -Math.PI * (.15 + .7 * i / 6), v = (140 + 60 * hash(i, 9)) * s, px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k + 260 * k * k * s; drop(ctx, px, py, .8 * s * (1 - k * .4)); }
  ink(ctx, [[x - 40 * s * (1 + k), y], [x - 20 * s, y - 16 * s * (1 - k)], [x, y - 8 * s], [x + 20 * s, y - 16 * s * (1 - k)], [x + 40 * s * (1 + k), y]], { col: INK.blue, w: 2, second: .2, over: 0 });
}
/** wind: curly ballpoint gust lines blowing in dir, k = phase (they travel and curl) */
export function gust(ctx, x, y, k, dir = 1, len = 220) {
  for (let i = 0; i < 3; i++) {
    const p = (k + i * .27) % 1, ox = x + dir * (p - .5) * len * 1.4, oy = y + (i - 1) * 46, pts = [];
    for (let j = 0; j <= 16; j++) { const u = j / 16; let px = ox + dir * u * len * .6, py = oy; if (u > .65) { const a = (u - .65) / .35 * TAU * .85; px = ox + dir * (len * .39 + Math.sin(a) * 18); py = oy - (1 - Math.cos(a)) * 18; } pts.push([px, py]); }
    ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p); ink(ctx, pts, { col: INK.grey, w: 2, second: .2, over: 0 }); ctx.restore();
  }
}
/** a big pen mark: '!' or '?' above a head */
export function mark(ctx, ch, x, y, s = 1) {
  if (ch === '!') { ink(ctx, [[x, y - 50 * s], [x + 2, y - 14 * s]], { col: INK.black, w: 5 * s, second: .3 }); P.blot(ctx, P.ellipse(x + 2, y, 5 * s, 5 * s, 8)); }
  else { ink(ctx, [[x - 14 * s, y - 40 * s], [x - 8 * s, y - 52 * s], [x + 6 * s, y - 52 * s], [x + 12 * s, y - 40 * s], [x, y - 26 * s], [x, y - 14 * s]], { col: INK.black, w: 4.5 * s, second: .3 }); P.blot(ctx, P.ellipse(x, y, 4.5 * s, 4.5 * s, 8)); }
}
export function heart(ctx, x, y, s = 1) {
  const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, hx = 16 * Math.sin(a) ** 3, hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([x + hx * s, y + hy * s]); }
  shape(ctx, pts, { fill: CRAYON.red, line: INK.red, gap: 2.8, w: 1.8 });
}
/** zzz drifting up */
export function zzz(ctx, x, y, t) { for (let i = 0; i < 3; i++) { const k = (t * .5 + i / 3) % 1; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * k); P.hand(ctx, 'z', x + k * 40 + i * 6, y - k * 90, { size: 28 + i * 8, col: INK.navy }); ctx.restore(); } }
/** a wiggly "tremble" offset for a scared thing on twos: returns px */
export const tremble = (t, a = 2) => (hash(Math.floor(t * 12), 3) - .5) * 2 * a;
