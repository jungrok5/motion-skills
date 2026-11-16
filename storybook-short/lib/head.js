// storybook-short · head.js — a character's head (and, for portraits, a bust) as data → strokes on layers.
// Same code as storybook-portrait's figure.js; the film builds heads with body.none = true and puts them on full-body
// rigs (body.js). The face, hair styles, ears, turned views and live face are identical, so a film's close-up and its
// wide shots are one character.
// The figure is a bust: an oversized head on a long neck, cropped at the chest. Layers composite back to front and each
// one moves as a whole in the live loop (see motion.js): the body breathes about its planted bottom edge, the head turns
// and tilts about the base of the neck, the hair follows the head late, earrings swing, the eyes and mouth are redrawn
// every frame. `build(design, view)` gives the ops (static strokes), the live drawers and the geometry the checks read.
import * as P from './paint.js';
const { clamp, lerp, ellipse, bezier, bounds, union } = P;

export const DEFAULTS = {
  seed: 7,
  canvas: { W: 1080, H: 1350, paper: '#fbf8f2' },
  ink: '#241c22',
  head: { x: 540, y: 560, a: 220, top: 1.06, chin: .98, jaw: .2, skin: '#f5d6c8', shadow: '#e2ab9c', line: .9 },
  face: {
    eyeX: .43, eyeY: .3, eyeR: .155, pupil: .38, eyeShape: 1.0, sclera: '#fdfbf6', gaze: [.6, 0], lids: 0, lashes: 0,
    nose: { type: 'button', y: .45, size: 1, color: '#e98798' },
    mouth: { y: .66, w: .15, curve: -.5, open: 0, color: '#7c2c38' },
    brows: { show: [true, true], y: .55, tilt: .1, thick: 1, len: 1 },
    blush: { color: '#ee8088', x: .58, y: .5, r: .25, strength: 1.25 },
    freckles: 0,
  },
  ears: { show: true, over: true, y: .34, size: 1, color: '#e98f7e', earring: { type: 'none', color: '#ecc43a', size: 1 } },
  // a neutral default (every brief replaces it): dark hair with one cool streak colour, a plain sweater
  hair: {
    style: 'straight', bangs: 'curtain', part: -.08, length: 1.7, volume: .1, flare: .1, curl: 0,
    base: '#16151a', colors: [['#100f13', 6], ['#1d1b22', 2], ['#3d7f7a', 2], ['#68a9a0', .7]],
    strands: 32, strays: 16, back: false, backColor: '#1a2335',
  },
  neck: { w: .3, len: .78 },
  body: {
    shoulders: 1.42, slope: .5,
    garment: { type: 'sweater', color: '#e7765c', pattern: { type: 'solid' },
      inner: { color: '#fbf8f2', pattern: { type: 'solid' } }, opening: .42, collar: false },
  },
  extras: [],
};

export function merge(a, b) {
  if (b === undefined) return a;
  if (Array.isArray(b) || typeof b !== 'object' || b === null || typeof a !== 'object' || a === null || Array.isArray(a)) return b;
  const o = { ...a }; for (const k of Object.keys(b)) o[k] = merge(a[k], b[k]); return o;
}

/** sphere mapping for a point on the face at unit x (−1..1) when the head is turned by yaw (radians, + = facing screen right) */
export function onSphere(x0, yaw) { const al = Math.asin(clamp(x0, -1, 1)) + yaw; return { x: Math.sin(al), k: Math.cos(al) }; }

// yaw: the style draws front and 3/4 faces (to ~43°); a true profile is outside it. tilt: neck roll. twist: head vs chest.
export const LIMITS = { yaw: .75, tilt: .35, twist: .79, liveYaw: .25 };

export function build(design, view = {}) {
  const D = merge(DEFAULTS, design);
  const yaw = view.yaw ?? D.view?.yaw ?? 0, bodyYaw = view.bodyYaw ?? yaw * .45;
  const { W, H } = D.canvas, a = D.head.a, hx = D.head.x, hy = D.head.y, INK = D.ink;
  const ops = [], live = {}, geo = { yaw, bodyYaw, problems: [] };
  let sn = (D.seed || 1) * 7919;
  const op = (layer, name, bb, dir, draw, w) => { const seed = ++sn; if (D.body.none && (layer === 'body' || layer === 'x:body' || layer === 'x:behind')) return; ops.push({ layer, name, bb, dir, seed, w, draw: ctx => draw(ctx, seed) }); };
  const U = (x, y) => [hx + x * a, hy + y * a]; // unit → canvas

  // ── head shape ──
  const sy = Math.sin(yaw);
  const headPts = [];
  for (let i = 0; i < 96; i++) {
    const t = i / 96 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    let x, y;
    if (s < 0) { x = c; y = s * D.head.top; } else { x = c * (1 - D.head.jaw * Math.pow(s, 2.2)); y = s * D.head.chin; }
    x += sy * (.16 * Math.max(0, s) - .05 * Math.max(0, -s)) * (1 - .5 * Math.abs(c));
    headPts.push(U(x, y));
  }
  geo.head = { x: hx, y: hy, a, pts: headPts };
  const neckTop = hy + a * .72, neckBase = hy + a * (D.head.chin + D.neck.len);
  const ncx = hx + sy * a * .1, nb = (bodyYaw) * a * .25;
  const bcx = hx + Math.sin(bodyYaw) * a * .5;          // the body's front centre line at the neckline
  geo.neckBase = [hx + nb, neckBase];
  geo.pivot = { neck: [hx + nb, neckBase], body: [hx, H], crown: [hx + sy * a * .3, hy - a * D.head.top] };

  // ── body ──
  const S = D.body.shoulders, g = D.body.garment, slope = D.body.slope;
  const bodyPoly = (() => {
    const nw = D.neck.w * a * 1.25, y0 = neckBase - a * .05, cb = Math.cos(bodyYaw);
    const near = 1 + Math.sin(Math.abs(bodyYaw)) * .1, far = cb;               // the shoulder turning away gets shorter
    const L = bodyYaw > 0 ? near : far, R = bodyYaw > 0 ? far : near;
    const sx = (k, s) => hx + nb + s * k * a;
    // neck → a sloping shoulder line → the round of the shoulder → the arm falling straight off the sheet
    const side = (s, K) => [
      ...bezier([sx(nw / a, s), y0], [sx(S * .45 * K, s), y0 + a * slope * .25], [sx(S * .8 * K, s), y0 + a * slope * .55], [sx(S * .97 * K, s), y0 + a * slope * 1.05], 14),
      ...bezier([sx(S * .97 * K, s), y0 + a * slope * 1.05], [sx(S * 1.05 * K, s), y0 + a * slope * 1.5], [sx(S * 1.06 * K, s), y0 + a * slope * 2.6], [sx(S * 1.08 * K, s), H + 30], 14).slice(1)];
    return [...side(-1, L), ...side(1, R).reverse()];
  })();
  const bodySmooth = bodyPoly;
  geo.body = { pts: bodySmooth, front: bcx, y0: neckBase };
  geo.shoulders = [bodyPoly[13], bodyPoly[bodyPoly.length - 14]];
  const pattern = (poly, spec, base, seedBase, ang = -1) => (ctx, seed) => {
    const bb = bounds(poly);
    P.crayon(ctx, poly, { color: base, angle: ang, gap: 3, width: 2.4, alpha: .8, under: base, underAlpha: seedBase === 2 ? .92 : .55, tooth: seedBase === 2 ? .3 : .45, seed, cross: .35 });
    if (!spec || spec.type === 'solid') return;
    const cols = spec.colors || ['#333'];
    ctx.save(); P.path(ctx, P.rough(poly, 1.6, seed + 3)); ctx.clip();
    if (spec.type === 'stripes') {
      const bw = (spec.width || .3) * a, gap = (spec.gap ?? spec.width ?? .3) * a, cx = (bb[0] + bb[2]) / 2, half = (bb[2] - bb[0]) / 2 || 1;
      let y = bb[1] + (spec.offset || .15) * a, i = 0;
      while (y < bb[3] + bw) {
        const band = [];
        // bands bow with the body: lower at the sides, as a sweater wraps round a chest
        for (let x = bb[0] - 10; x <= bb[2] + 10; x += 12) band.push([x, y + Math.pow((x - cx) / half, 2) * a * .1 + P.noise1(x / 70, i + seed) * 3]);
        for (let x = bb[2] + 10; x >= bb[0] - 10; x -= 12) band.push([x, y + bw + Math.pow((x - cx) / half, 2) * a * .1 + P.noise1(x / 70, i + seed + 9) * 3]);
        P.crayon(ctx, band, { color: cols[i % cols.length], angle: ang + .15, gap: 2.8, width: 2.4, alpha: .85, underAlpha: .6, tooth: .4, seed: seed + 20 + i, cross: .4 });
        y += bw + gap; i++;
      }
    } else if (spec.type === 'dots') {
      const r = P.rng(seed), step = (spec.gap || .3) * a, pts = [];
      for (let y = bb[1]; y < bb[3]; y += step) for (let x = bb[0] + ((y / step) % 2 ? step / 2 : 0); x < bb[2]; x += step) pts.push([x + (r() - .5) * 6, y + (r() - .5) * 6]);
      P.dabs(ctx, pts, { colors: cols, r: (spec.width || .05) * a, seed: seed + 5 });
    } else if (spec.type === 'checks') {
      const step = (spec.gap || .3) * a;
      for (let x = bb[0] - step; x < bb[2]; x += step * 2) P.crayon(ctx, [[x, bb[1]], [x + step, bb[1]], [x + step, bb[3]], [x, bb[3]]], { color: cols[0], gap: 3.4, width: 2, alpha: .5, under: false, tooth: .5, seed: seed + x, angle: .9 });
      for (let y = bb[1]; y < bb[3]; y += step * 2) P.crayon(ctx, [[bb[0], y], [bb[2], y], [bb[2], y + step], [bb[0], y + step]], { color: cols[1] || cols[0], gap: 3.4, width: 2, alpha: .45, under: false, tooth: .5, seed: seed + y, angle: -.9 });
    }
    ctx.restore();
  };
  op('body', 'garment', bounds(bodySmooth, 8), [0, 1], pattern(bodySmooth, g.pattern, g.color, 1, -.95), 3);
  // the opening / neckline: inner shirt in a V, a crew neck, or a collar
  const y0 = neckBase - a * .06;
  if (g.type === 'cardigan') {
    const ow = (g.opening || .42) * a, nw = D.neck.w * a * 1.15;
    const vee = [[bcx - nw, y0 - 4], [bcx + nw, y0 - 4], [bcx + ow * .55, y0 + a * .9], [bcx + ow, H + 20], [bcx - ow, H + 20], [bcx - ow * .55, y0 + a * .9]];
    const veeS = P.spline(vee, 6, true);
    op('body', 'inner shirt', bounds(veeS, 6), [0, 1], (ctx, s) => {
      pattern(veeS, g.inner?.pattern, g.inner?.color || '#fbf8f2', 2, -.5)(ctx, s);
    }, 1.2);
    // the crew neck of the shirt underneath, and the cardigan's front edges
    const crew = P.bezier([bcx - nw * 1.05, y0 - 2], [bcx - nw * .6, y0 + a * .2], [bcx + nw * .6, y0 + a * .2], [bcx + nw * 1.05, y0 - 2], 24);
    op('body', 'edges', union(bounds(crew, 8), bounds(vee, 8)), [0, 1], (ctx, s) => {
      P.ink(ctx, crew, { width: 1.6, color: INK, seed: s, alpha: .75 });
      P.ink(ctx, [vee[0], vee[5], vee[4]], { width: 1.5, color: INK, seed: s + 1, alpha: .55, taper: [.1, .5] });
      P.ink(ctx, [vee[1], vee[2], vee[3]], { width: 1.5, color: INK, seed: s + 2, alpha: .55, taper: [.1, .5] });
    }, .6);
  } else if (g.type === 'collar') {
    const nw = D.neck.w * a * 1.2, cl = g.collarColor || '#fbf8f2';
    const left = [[bcx - nw * 1.1, y0 - 6], [bcx - nw * .1, y0 + a * .32], [bcx - nw * 1.6, y0 + a * .42], [bcx - nw * 1.9, y0 + a * .1]];
    const right = left.map(([x, y]) => [2 * bcx - x, y]);
    for (const [name, c] of [['collar left', left], ['collar right', right]]) {
      op('body', name, bounds(c, 6), [0, 1], (ctx, s) => { P.gouache(ctx, P.spline(c, 4, true), { color: cl, seed: s, mottle: .3, edge: .2 }); P.ink(ctx, [...c, c[0]], { width: 1.5, color: INK, seed: s + 1, alpha: .8, taper: [.05, .05] }); }, .6);
    }
  } else {
    const nw = D.neck.w * a * 1.2;
    const crew = P.bezier([bcx - nw, y0 - 4], [bcx - nw * .7, y0 + a * .22], [bcx + nw * .7, y0 + a * .22], [bcx + nw, y0 - 4], 24);
    const rib = [...crew, ...P.bezier([bcx + nw * 1.25, y0 - 6], [bcx + nw * .8, y0 + a * .34], [bcx - nw * .8, y0 + a * .34], [bcx - nw * 1.25, y0 - 6], 24)];
    op('body', 'neckband', bounds(rib, 6), [1, 0], (ctx, s) => { P.crayon(ctx, rib, { color: g.bandColor || P.shade(g.color, -.15), angle: 1.4, gap: 3, alpha: .8, seed: s }); P.ink(ctx, crew, { width: 1.5, color: INK, seed: s + 1, alpha: .7 }); }, .5);
  }
  op('body', 'shoulder lines', bounds(bodySmooth, 6), [0, 1], (ctx, s) => {
    const L = bodySmooth.slice(0, Math.floor(bodySmooth.length * .45));
    const half = Math.floor(bodySmooth.length / 2);
    P.ink(ctx, bodySmooth.filter((p, i) => i < half && p[1] < H - 4), { width: 1.4, color: INK, seed: s, alpha: .45, taper: [.05, .4] });
    P.ink(ctx, bodySmooth.filter((p, i) => i >= half && p[1] < H - 4), { width: 1.4, color: INK, seed: s + 3, alpha: .45, taper: [.4, .05] });
    void L;
  }, .5);

  // ── hair, back mass (behind the neck and body) ──
  const hs = D.hair, L = hs.length;
  // hair on a turned head: the whole mass slides a little towards the turn, the side going away (the back of the skull)
  // widens so the skull never shows bald behind it
  const hx2 = (x, y) => { const k = clamp((y + 1.1) / 3); let xs = x * Math.cos(yaw * .4); if (xs * sy < 0) xs *= 1 + Math.abs(sy) * .16; return hx + (xs + sy * lerp(.24, .07, k)) * a; };
  const HU = (x, y) => [hx2(x, y), hy + y * a];
  const sideCurves = [];
  if (hs.style === 'straight' && hs.back) {
    const back = [HU(-1.08, -.2), HU(-1.12 - hs.flare * .6, L - .12), HU(-.5, L - .02), HU(.5, L - .02), HU(1.12 + hs.flare * .6, L - .12), HU(1.08, -.2), HU(.6, -1.0), HU(-.6, -1.0)];
    const backS = P.spline(back, 6, true);
    op('hairBack', 'back of the hair', bounds(backS, 8), [0, 1], (ctx, s) => {
      P.gouache(ctx, backS, { color: hs.backColor, seed: s, mottle: .4, edge: .1, dir: 1.5, long: 2 });
      for (let i = 0; i < 16; i++) { const r = P.rng(s + i), x = lerp(-1.05, 1.05, (i + r() * .6) / 16); P.dryBrush(ctx, [HU(x * .7, -.4), HU(x, .6), HU(x * 1.08, L - .1)], { width: 22, colors: hs.colors, load: .55, alpha: .55, seed: s + 30 + i }); }
    }, 1.4);
  }

  // ── neck ──
  const nw = D.neck.w * a;
  const neckPoly = [[ncx - nw * .95, neckTop], [ncx + nw * .95, neckTop], [hx + nb + nw * 1.06, neckBase + a * .04], [hx + nb - nw * 1.06, neckBase + a * .04]];
  op('neck', 'neck', bounds(neckPoly, 6), [0, 1], (ctx, s) => {
    P.gouache(ctx, neckPoly, { color: P.mix(D.head.skin, D.head.shadow, .25), seed: s, mottle: .5, edge: .25, dir: 1.5, roughness: .8 });
    ctx.save(); P.path(ctx, neckPoly); ctx.clip();
    const gr = ctx.createLinearGradient(0, neckTop, 0, neckTop + a * .55); gr.addColorStop(0, P.css(D.head.shadow, .75)); gr.addColorStop(1, P.css(D.head.shadow, 0));
    ctx.fillStyle = gr; ctx.fillRect(ncx - nw * 2, neckTop, nw * 4, a * .6); ctx.restore();
    P.ink(ctx, [neckPoly[0], [lerp(neckPoly[0][0], neckPoly[3][0], .5) + 2, lerp(neckTop, neckBase, .5)], neckPoly[3]], { width: 1.4, color: INK, seed: s + 1, alpha: .6, taper: [.3, .4] });
    P.ink(ctx, [neckPoly[1], [lerp(neckPoly[1][0], neckPoly[2][0], .5) - 2, lerp(neckTop, neckBase, .5)], neckPoly[2]], { width: 1.4, color: INK, seed: s + 2, alpha: .6, taper: [.3, .4] });
  }, .8);

  // ── head ──
  op('head', 'face', bounds(headPts, 6), [0, 1], (ctx, s) => {
    P.gouache(ctx, headPts, { color: D.head.skin, seed: s, mottle: .9, edge: .3, dir: -.4, tooth: .12,
      shadow: [hx - sy * a * .6, hy + a * .95, .28, a * .9], light: [hx + sy * a * .4 - a * .15, hy - a * .2, .22, a * .8] });
  }, 2);
  op('head', 'face outline', bounds(headPts, 6), [1, 0], (ctx, s) => {
    const n = headPts.length, seg = (i0, i1) => { const o = []; for (let i = i0; i <= i1; i++) o.push(headPts[(i + n) % n]); return o; };
    // the jaw in two strokes that do not quite meet, the skull lighter (the hair covers it)
    P.ink(ctx, seg(-4, Math.round(n * .27)), { width: 1.7 * D.head.line, color: INK, seed: s, taper: [.15, .2] });
    P.ink(ctx, seg(Math.round(n * .23), Math.round(n * .54)), { width: 1.7 * D.head.line, color: INK, seed: s + 1, taper: [.2, .15] });
    P.ink(ctx, seg(Math.round(n * .54), n - 2), { width: 1.1 * D.head.line, color: INK, seed: s + 2, alpha: .5, taper: [.2, .2] });
  }, .7);

  // ── face (static part) ──
  const F = D.face, eyes = [];
  for (const side of [-1, 1]) {
    const m = onSphere(side * F.eyeX, yaw), vis = m.k > .28;
    const cx = hx + m.x * a * .93 + sy * a * .04, cy = hy + F.eyeY * a, ry = F.eyeR * a * F.eyeShape, rx = F.eyeR * a * (.3 + .7 * m.k);
    eyes.push({ side, cx, cy, rx, ry, k: m.k, vis });
  }
  geo.eyes = eyes;
  const noseS = onSphere(0, yaw), nose = [hx + noseS.x * a * 1.12 + sy * a * .04, hy + F.nose.y * a];
  const mouthS = onSphere(0, yaw * .95), mouth = [hx + mouthS.x * a * .9 + sy * a * .05, hy + F.mouth.y * a];
  geo.nose = nose; geo.mouth = mouth;
  for (const e of eyes) if (e.vis) {
    const ep = ellipse(e.cx, e.cy, e.rx, e.ry, 40, 0);
    op('face', `eye ${e.side < 0 ? 'left' : 'right'}`, bounds(ep, 8), [1, 0], (ctx, s) => {
      P.gouache(ctx, ep, { color: F.sclera, seed: s, mottle: .25, edge: .15, roughness: .5 });
      const top = [], bot = [];
      for (let i = 0; i <= 24; i++) { const t = Math.PI + i / 24 * Math.PI; top.push([e.cx + Math.cos(t) * e.rx, e.cy + Math.sin(t) * e.ry]); }
      for (let i = 0; i <= 20; i++) { const t = .15 + i / 20 * (Math.PI - .3); bot.push([e.cx + Math.cos(t) * e.rx, e.cy + Math.sin(t) * e.ry]); }
      P.ink(ctx, top, { width: 2.3, color: INK, seed: s + 1, taper: [.12, .12] });
      P.ink(ctx, bot, { width: 1.3, color: INK, seed: s + 2, alpha: .75, taper: [.3, .3] });
    }, .5);
  }
  for (const side of [-1, 1]) {
    const m = onSphere(side * F.blush.x, yaw); if (m.k < .2) continue;
    const bx = hx + m.x * a + sy * a * .05, by = hy + F.blush.y * a, rx = F.blush.r * a * (.35 + .65 * m.k), ry = F.blush.r * a * .8;
    op('face', 'blush', [bx - rx, by - ry, bx + rx, by + ry], [1, 0], (ctx, s) => P.blush(ctx, bx, by, rx, ry, { color: F.blush.color, seed: s, strength: F.blush.strength }), .5);
  }
  if (F.freckles) {
    const r = P.rng(D.seed + 99), pts = [];
    for (let i = 0; i < F.freckles; i++) { const side = i % 2 ? 1 : -1, m = onSphere(side * (.35 + r() * .35), yaw); if (m.k > .3) pts.push([hx + m.x * a + sy * a * .05, hy + (.4 + r() * .18) * a, .6 + r() * .5]); }
    op('face', 'freckles', bounds(pts, 8), [1, 0], (ctx, s) => P.dabs(ctx, pts, { color: '#b9705c', r: 2.2, seed: s, alpha: .7 }), .3);
  }
  {
    const ns = F.nose.size, [nx, ny] = nose, rx = a * .075 * ns * (.75 + .25 * noseS.k), ry = a * .055 * ns;
    op('face', 'nose', [nx - rx * 2, ny - a * .2, nx + rx * 2, ny + ry * 2], [0, 1], (ctx, s) => {
      if (F.nose.type === 'button' || F.nose.type === 'dot') {
        P.gouache(ctx, ellipse(nx, ny, rx, ry, 24, 0), { color: F.nose.color, seed: s, mottle: .4, edge: .4, roughness: .8 });
        if (F.nose.type === 'button') P.dabs(ctx, [[nx - rx * .38 + sy * rx * .3, ny + ry * .25, 1], [nx + rx * .38 + sy * rx * .3, ny + ry * .25, 1]], { color: '#5a2430', r: a * .012 * ns, seed: s + 1 });
      } else if (F.nose.type === 'line') {
        const d = yaw >= 0 ? 1 : -1;
        P.ink(ctx, [[nx - d * rx * .2, ny - a * .16], [nx + d * rx * .5, ny - a * .02], [nx + d * rx * .3, ny + ry * .7], [nx - d * rx * .6, ny + ry * .6]], { width: 1.6, color: INK, seed: s, taper: [.4, .3] });
        P.blush(ctx, nx, ny, rx * 1.1, ry * 1.1, { color: F.nose.color, seed: s + 3, strength: .6, scribbles: 4 });
      }
    }, .4);
  }

  // ── face (live part): pupils, lids, brows, mouth ──
  const skinFlat = P.css(D.head.skin);
  const pupilShape = eyes.map((e, i) => { const r = P.rng(D.seed * 31 + i), o = []; for (let j = 0; j < 30; j++) { const t = j / 30 * Math.PI * 2, k = 1 + P.noise1(j * .35 + i * 9, 77) * .06; o.push([Math.cos(t) * k, Math.sin(t) * k]); } return o; });
  live.face = (ctx, pose) => {
    const gz = pose.gaze || F.gaze, lid = clamp(Math.max(pose.lids ?? F.lids, pose.blink || 0));
    eyes.forEach((e, i) => {
      if (!e.vis) return;
      const pr = Math.min(e.rx * .92, F.pupil * F.eyeR * a);
      const px = e.cx + clamp(gz[0]) * (e.rx - pr - 1.5), py = e.cy + clamp(gz[1], -1, 1) * (e.ry - pr - 1.5) * .8;
      ctx.save(); P.path(ctx, ellipse(e.cx, e.cy, e.rx - .6, e.ry - .6, 32)); ctx.clip();
      ctx.beginPath(); pupilShape[i].forEach(([x, y], j) => j ? ctx.lineTo(px + x * pr, py + y * pr) : ctx.moveTo(px + x * pr, py + y * pr)); ctx.closePath();
      ctx.fillStyle = P.css(F.pupilColor || '#141217'); ctx.fill();
      ctx.fillStyle = 'rgba(255,253,248,.9)'; ctx.beginPath(); ctx.arc(px - pr * .3, py - pr * .35, Math.max(1.2, pr * .2), 0, Math.PI * 2); ctx.fill();
      if (lid > .01) {
        const yl = e.cy - e.ry + 2 * e.ry * lid;
        ctx.fillStyle = skinFlat; ctx.fillRect(e.cx - e.rx - 4, e.cy - e.ry - 6, e.rx * 2 + 8, yl - (e.cy - e.ry - 6));
        ctx.restore();
        const ylc = Math.min(yl, e.cy + e.ry * .55), w = Math.sqrt(Math.max(0, 1 - Math.pow((ylc - e.cy) / e.ry, 2))) * e.rx;
        if (w > 1) {
          ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = P.css(INK); ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(e.cx - w, ylc); ctx.quadraticCurveTo(e.cx, ylc + e.ry * (.18 + lid * .25), e.cx + w, ylc); ctx.stroke(); ctx.restore();
        }
      } else ctx.restore();
      if (F.lashes) { ctx.save(); ctx.strokeStyle = P.css(INK); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; const yl = e.cy - e.ry + 2 * e.ry * lid; for (let j = 0; j < F.lashes; j++) { const sx = e.side * (j + 1) / (F.lashes + 1); const x = e.cx + sx * e.rx * .95, y = lid > .5 ? yl : e.cy - Math.sqrt(1 - sx * sx) * e.ry; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + e.side * 5, y - 5 + lid * 6); ctx.stroke(); } ctx.restore(); }
    });
    // brows
    const B = F.brows, lift = pose.browLift || 0, tilt = (pose.browTilt ?? B.tilt);
    eyes.forEach((e, i) => {
      if (!B.show[i] || e.k < .3) return;
      const by = e.cy - e.ry - a * .07 * B.y * 2 - lift * a * .06, inner = e.cx - e.side * e.rx * .55 * B.len, outer = e.cx + e.side * e.rx * .95 * B.len;
      const iy = by - tilt * a * .05, oy = by + tilt * a * .02;
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = P.css(B.color || '#1a1619');
      for (let j = 0; j < 3; j++) { ctx.lineWidth = a * (.034 - j * .009) * B.thick * (e.k * .5 + .5); ctx.beginPath(); ctx.moveTo(inner, iy + j * .8); ctx.quadraticCurveTo((inner + outer) / 2, Math.min(iy, oy) - a * .025, outer, oy + j * .5); ctx.stroke(); }
      ctx.restore();
    });
    // mouth
    const M = F.mouth, curve = pose.mouthCurve ?? M.curve, open = pose.mouthOpen ?? M.open, [mx, my] = mouth, w = M.w * a * (.45 + .55 * mouthS.k);
    const h = curve * a * .045;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (open > .02) {
      // an open mouth: the top lip follows the curve, the jaw drops (a yawn is a tall oval, a laugh a wide one)
      const ow = w * (.75 - open * .2), drop = open * a * .2, top = my - h * .3 - open * a * .03;
      ctx.beginPath(); ctx.moveTo(mx - ow, my - h * .3); ctx.bezierCurveTo(mx - ow * .5, top - a * .01, mx + ow * .5, top - a * .01, mx + ow, my - h * .3);
      ctx.bezierCurveTo(mx + ow * .9, my + drop, mx - ow * .9, my + drop, mx - ow, my - h * .3); ctx.closePath();
      ctx.fillStyle = P.css(P.shade(M.color, -.15)); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = P.css('#e0727e'); ctx.beginPath(); ctx.ellipse(mx, my + drop * .78, ow * .7, drop * .32 + 2, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = P.css(INK, .9); ctx.lineWidth = 1.8; ctx.stroke();
    } else {
      ctx.strokeStyle = P.css(M.color); ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(mx - w, my - h * .2); ctx.quadraticCurveTo(mx - w * .1, my + h * 1.4, mx + w, my - h * .1); ctx.stroke();
      ctx.strokeStyle = P.css(INK, .55); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(mx - w * .9, my - h * .15); ctx.quadraticCurveTo(mx - w * .1, my + h * 1.3, mx + w * .85, my - h * .05); ctx.stroke();
    }
    ctx.restore();
  };

  // ── hair, front ──
  const strays = [];
  const hairBox = [];
  if (hs.style === 'straight' || hs.style === 'short') {
    const Lh = hs.style === 'short' ? Math.min(L, .55) : L, fl = hs.flare, vol = hs.volume, part = hs.part;
    const bangs = hs.bangs;
    const inner = s => bangs === 'curtain' ? [[part + s * .03, -D.head.top - .02], [s * .4, -.86], [s * .8, .06], [s * .9, Lh]]
      : bangs === 'full' ? [[s * .2, -D.head.top + .05], [s * .8, -.75], [s * .93, -.1], [s * .96, Lh]]
      : [[part + s * .03, -D.head.top - .02], [s * .7, -.95], [s * .97, -.2], [s * 1.0, Lh]];
    const outer = s => [[part + s * .06, -D.head.top - .04 - vol * .5], [s * (1.08 + vol), -1.22 - vol * .4], [s * (1.2 + vol), .1], [s * (1.2 + vol + fl), Lh + .04]];
    for (const s of [-1, 1]) {
      const N = Math.round(hs.strands / 2), curves = [];
      for (let j = 0; j < N; j++) {
        const r = P.rng(D.seed * 13 + j * 7 + (s + 1) * 101), u = Math.pow((j + .3 + r() * .4) / N, .85);
        const I = inner(s), O = outer(s), cp = I.map((p, k) => [lerp(p[0], O[k][0], u) + (r() - .5) * .04, lerp(p[1], O[k][1], u) + (k === 3 ? (r() - .5) * .14 : 0)]);
        if (hs.curl) for (let k = 2; k < 4; k++) cp[k][0] += Math.sin(j * 1.7 + k) * hs.curl * .12;
        curves.push(bezier(...cp.map(([x, y]) => HU(x, y)), 36));
      }
      sideCurves.push({ s, curves, inner: bezier(...inner(s).map(([x, y]) => HU(x, y)), 40), outer: bezier(...outer(s).map(([x, y]) => HU(x, y)), 40) });
    }
    const [Ls, Rs] = sideCurves;
    // the mass: right inner down, the ragged ends (each strand's own tip), right outer up, left outer down, left ends, left inner up
    const ends = side => side.curves.map(c => c[c.length - 1]);
    const mass = [...Rs.inner, ...ends(Rs), ...[...Rs.outer].reverse(), ...Ls.outer, ...ends(Ls).reverse(), ...[...Ls.inner].reverse()];
    hairBox.push(...mass);
    op('hairFront', 'hair mass', bounds(mass, 10), [0, 1], (ctx, s) => P.gouache(ctx, mass, { color: hs.base, seed: s, mottle: .5, edge: .1, dir: 1.5, long: 2.2, roughness: 2.2 }), 2.4);
    if (bangs === 'full') {
      const fringe = [];
      for (let i = 0; i <= 20; i++) { const x = lerp(-1.0, 1.0, i / 20); fringe.push(HU(x * (1 + vol * .5), -D.head.top * Math.sqrt(Math.max(0, 1 - x * x)) - .06)); }
      for (let i = 20; i >= 0; i--) { const x = lerp(-1.0, 1.0, i / 20); fringe.push(HU(x * .96, -.12 - .1 * x * x + P.noise1(i * .9, 4) * .03)); }
      hairBox.push(...fringe);
      op('hairFront', 'fringe', bounds(fringe, 10), [0, 1], (ctx, s) => {
        P.gouache(ctx, fringe, { color: hs.base, seed: s, mottle: .5, edge: .1, dir: 1.5, roughness: 2 });
        for (let i = 0; i < 22; i++) { const r = P.rng(s + i), x = lerp(-.95, .95, (i + r()) / 22); P.dryBrush(ctx, [HU(x * .3, -D.head.top + .02), HU(x * .8, -.6), HU(x * .96, -.14 - .1 * x * x)], { width: 20, colors: hs.colors, load: .75, alpha: .8, seed: s + 10 + i, taper: [.3, .15] }); }
      }, 1.2);
    }
    // strands in bundles, dark first, then the coloured streaks, then a few light ones on top
    for (const side of sideCurves) {
      const N = side.curves.length;
      for (let b = 0; b < N; b += 5) {
        const group = side.curves.slice(b, b + 5);
        op('hairFront', 'strands', bounds(group.flat(), 16), [0, 1], (ctx, s) => {
          group.forEach((c, i) => P.dryBrush(ctx, c, { width: a * .16, colors: hs.colors.slice(0, 2), load: .85, alpha: .9, seed: s + i, taper: [.12, .2], lw: [1.2, 3] }));
        }, 1);
      }
      for (let b = 0; b < N; b += 6) {
        // the coloured streaks sit in a few bands, not everywhere: every fourth strand, one band in three skipped
        const group = side.curves.slice(b, b + 6).filter((_, i) => (i + b) % 4 === 1 && P.hash(b, side.s, D.seed) > .25);
        if (!group.length) continue;
        op('hairFront', 'streaks', bounds(group.flat(), 16), [0, 1], (ctx, s) => {
          group.forEach((c, i) => P.dryBrush(ctx, c.slice(Math.floor(c.length * .08 * P.hash(i, s))), { width: a * .085, bristles: 9, colors: hs.colors.slice(2), load: .62, alpha: .9, seed: s + 40 + i, taper: [.3, .3], lw: [1, 2.8], grain: .03 }));
        }, .8);
      }
    }
    // flyaways: thin ink hairs that leave the mass and curl, the hand's signature in this style
    const r = P.rng(D.seed * 3 + 5);
    for (let i = 0; i < hs.strays; i++) {
      const top = i < hs.strays * .45, s = r() < .5 ? -1 : 1;
      const root = top ? HU(part + (r() - .5) * .5, -D.head.top - .02) : HU(s * (1.05 + vol + r() * .1), -.6 + r() * (Lh + .4));
      const ang = top ? -Math.PI / 2 + (r() - .5) * 2.2 : Math.PI / 2 - s * (.25 + r() * .6);
      strays.push({ root, ang, len: a * (.3 + r() * .7), bend: (r() - .5) * 2.8, bend2: (r() - .5) * 3.2, w: .7 + r() * .8, ph: r() * 10, sp: .6 + r() * .8 });
    }
  } else if (hs.style === 'bun' || hs.style === 'curly') {
    const vol = hs.volume, curly = hs.style === 'curly';
    const cap = [];
    for (let i = 0; i <= 40; i++) { const t = Math.PI + i / 40 * Math.PI; cap.push(HU(Math.cos(t) * (1.05 + vol), Math.sin(t) * (D.head.top + vol * .8) + (curly ? 0 : 0))); }
    const capLow = curly ? .35 : .12;   // curls come down over the ears; pulled-back hair tucks behind them
    // the hairline: a rounded forehead in the middle, easing down to the temples (curls come lower, over the ears)
    const hl = curly ? x => lerp(-.58 - .14 * (1 - x * x), capLow, P.smooth(clamp((Math.abs(x) - .45) / .5)))
      : x => lerp(-.66 - .12 * (1 - x * x), capLow, Math.pow(P.smooth(clamp((Math.abs(x) - .5) / .55)), 1.6));
    const hairline = []; for (let i = 0; i <= 30; i++) { const x = lerp(1.04 + vol, -1.04 - vol, i / 30); hairline.push(HU(x, hl(x) + (curly ? P.noise1(i * .8, 3) * .05 : 0))); }
    const mass = P.spline([...cap.filter((_, i) => i % 4 === 0), ...hairline.filter((_, i) => i % 3 === 0)], 5, true);
    hairBox.push(...mass);
    op('hairFront', 'hair mass', bounds(mass, 12), [0, 1], (ctx, s) => P.gouache(ctx, mass, { color: hs.base, seed: s, mottle: .5, edge: .1, roughness: curly ? 4 : 2 }), 1.8);
    if (curly) {
      // curls fill the mass: sampled over the cap and down the sides, the ones underneath darker, the top ones lighter
      const r = P.rng(D.seed + 3), blobs = [], top = D.head.top + vol * .7;
      for (let i = 0; i < 150 && blobs.length < 95; i++) {
        const x = (r() * 2 - 1) * (1.02 + vol * .85), ytop = -top * Math.sqrt(Math.max(0, 1 - Math.pow(x / (1.06 + vol), 2))), y = lerp(ytop + .06, hl(x) + .02, r());
        if (Math.abs(x) < .5 && y > hl(x) - .05) continue;
        blobs.push([x, y, y > -.4 ? 0 : y > -.85 ? 1 : 2]);
      }
      blobs.sort((p, q) => p[2] - q[2] || p[0] - q[0]);
      const tone = [hs.colors.filter((_, i) => i !== 1), hs.colors, hs.colors.filter((_, i) => i !== 2)];
      for (let b = 0; b < blobs.length; b += 16) {
        const grp = blobs.slice(b, b + 16);
        op('hairFront', 'curls', bounds(grp.map(([x, y]) => HU(x, y)), a * .25), [1, 0], (ctx, s) => {
          grp.forEach(([x, y, k], i) => {
            const rr0 = P.rng(s + i), [cx, cy] = HU(x, y), rr = a * (.08 + rr0() * .06), turn = rr0() < .5 ? 1 : -1, ph = rr0() * 6, pts = [];
            for (let j = 0; j <= 30; j++) { const t = ph + turn * j / 30 * Math.PI * 2.2, q = 1 - j / 75; pts.push([cx + Math.cos(t) * rr * q, cy + Math.sin(t) * rr * q * .9]); }
            P.dryBrush(ctx, pts, { width: a * .085, colors: tone[k], load: .8, alpha: .85, seed: s + i, taper: [.25, .25], lw: [1, 2.2] });
          });
        }, .6);
      }
    } else {
      // pulled back: strands sweep from the hairline to the crown, then the bun
      for (let b = 0; b < 4; b++) {
        op('hairFront', 'combed strands', bounds(mass, 10), [0, -1], (ctx, s) => {
          for (let i = 0; i < 9; i++) { const r = P.rng(s + i), x = lerp(-1, 1, (b * 9 + i + r()) / 36); P.dryBrush(ctx, [HU(x * (1.02 + vol), hl(x * (1.02 + vol)) - .02), HU(x * .9, -.85), HU(x * .25, -D.head.top - vol * .7)], { width: a * .12, colors: hs.colors, load: .75, alpha: .8, seed: s + 9 + i, taper: [.1, .3] }); }
        }, .6);
      }
      const bun = hs.bun || { x: .1, y: -1.25, r: .42 };
      const [bx, by] = HU(bun.x, bun.y), br = bun.r * a, bunP = ellipse(bx, by, br, br * .9, 40, 0);
      hairBox.push(...bunP);
      op('hairFront', 'bun', bounds(bunP, 10), [1, 0], (ctx, s) => {
        P.gouache(ctx, bunP, { color: hs.base, seed: s, mottle: .5, edge: .1, roughness: 2 });
        for (let i = 0; i < 9; i++) { const pts = []; const r0 = br * (1 - i / 11); for (let k = 0; k <= 30; k++) { const t = i * .7 + k / 30 * Math.PI * 1.5; pts.push([bx + Math.cos(t) * r0, by + Math.sin(t) * r0 * .9]); } P.dryBrush(ctx, pts, { width: a * .1, colors: hs.colors, load: .7, alpha: .8, seed: s + i, taper: [.2, .2] }); }
      }, .8);
    }
    const r = P.rng(D.seed * 3 + 5);
    for (let i = 0; i < hs.strays; i++) {
      const t = Math.PI * (1.05 + r() * .9), [x, y] = [Math.cos(t) * (1.05 + vol), Math.sin(t) * (D.head.top + vol * .7)];
      strays.push({ root: HU(x, y), ang: t + (r() - .5) * .9, len: a * (.2 + r() * .45), bend: (r() - .5) * 2.4, bend2: (r() - .5) * 3, w: .7 + r() * .8, ph: r() * 10, sp: .6 + r() * .8 });
    }
  }
  geo.hair = { box: bounds(hairBox.length ? hairBox : headPts), strays: strays.length };
  live.strays = (ctx, pose, t) => {
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = P.css(INK, .85);
    for (const h of strays) {
      const sw = Math.sin(t * h.sp * 1.7 + h.ph) * .06 + (pose.hairVel || 0) * -.6;
      // a hair leaves the mass, bends one way, then the other near its tip (gravity takes the long ones down)
      const a0 = h.ang + sw * .3, a1 = a0 + h.bend * .5 + sw, a2 = a1 + h.bend2 * .6 + sw * 1.5, [x0, y0] = h.root, l = h.len / 3;
      const x1 = x0 + Math.cos(a0) * l, y1 = y0 + Math.sin(a0) * l, x2 = x1 + Math.cos(a1) * l, y2 = y1 + Math.sin(a1) * l + l * .15, x3 = x2 + Math.cos(a2) * l, y3 = y2 + Math.sin(a2) * l + l * .35;
      ctx.lineWidth = h.w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3); ctx.stroke();
    }
    ctx.restore();
  };

  // ── ears and earrings ──
  geo.ears = [];
  if (D.ears.show) for (const side of [-1, 1]) {
    const facingAway = side * yaw;                             // > 0: this ear is on the side the face turns towards (far side)
    const wk = facingAway > 0 ? 1 - Math.sin(facingAway) * 2.2 : 1 + Math.sin(-facingAway) * .9;
    if (wk < .2) { geo.ears.push({ side, vis: false }); continue; }
    const ex = hx + side * a * (.99 - (facingAway < 0 ? Math.sin(-facingAway) * .22 : Math.sin(facingAway) * .05)) + sy * a * .02, ey = hy + D.ears.y * a;
    const ew = a * .13 * D.ears.size * wk, eh = a * .2 * D.ears.size;
    const earP = []; for (let i = 0; i <= 24; i++) { const t = -Math.PI / 2 + i / 24 * Math.PI; earP.push([ex + side * Math.cos(t) * ew * (1 + .25 * Math.sin(t)), ey + Math.sin(t) * eh]); }
    earP.push([ex - side * ew * .2, ey + eh * .6], [ex - side * ew * .2, ey - eh * .7]);
    const lobe = [ex + side * ew * .35, ey + eh * .92];
    geo.ears.push({ side, vis: true, x: ex, y: ey, w: ew, lobe });
    op('ears', `ear ${side < 0 ? 'left' : 'right'}`, bounds(earP, 6), [0, 1], (ctx, s) => {
      P.gouache(ctx, earP, { color: D.ears.color, seed: s, mottle: .4, edge: .45, roughness: .7 });
      P.ink(ctx, earP.slice(0, 25), { width: 1.5, color: INK, seed: s + 1, taper: [.2, .3] });
      P.ink(ctx, [[ex + side * ew * .2, ey - eh * .45], [ex + side * ew * .6, ey - eh * .1], [ex + side * ew * .3, ey + eh * .35]], { width: 1.2, color: INK, seed: s + 2, alpha: .6 });
    }, .4);
    const er = D.ears.earring;
    if (er && er.type !== 'none') {
      const [lx, ly] = lobe, sz = a * (er.size || 1);
      let shape;
      if (er.type === 'drop') { shape = []; for (let i = 0; i <= 14; i++) { const t = i / 14; shape.push([lx + Math.sin(t * Math.PI * 3) * sz * .035 - sz * .02, ly + t * sz * .3]); } for (let i = 14; i >= 0; i--) { const t = i / 14; shape.push([lx + Math.sin(t * Math.PI * 3) * sz * .035 + sz * .025, ly + t * sz * .3]); } }
      else if (er.type === 'hoop') shape = ellipse(lx, ly + sz * .09, sz * .07, sz * .09, 30, 0);
      else shape = ellipse(lx, ly + sz * .015, sz * .028, sz * .028, 16, 0);
      op('earring' + (side < 0 ? 'L' : 'R'), 'earring', bounds(shape, 6), [0, 1], (ctx, s) => {
        if (er.type === 'hoop') P.ink(ctx, [...shape, shape[0]], { width: 3.2, color: er.color, seed: s, taper: [0, 0], smooth: false });
        else P.gouache(ctx, shape, { color: er.color, seed: s, mottle: .3, edge: .6, roughness: .5 });
        P.ink(ctx, er.type === 'hoop' ? shape.map(([x, y]) => [x + 1.5, y + 1.5]).slice(8, 22) : shape.slice(0, 15), { width: 1, color: P.shade(er.color, -.45), seed: s + 1, alpha: .7 });
      }, .25);
    }
  }

  // ── extras: what the topic adds (hats, glasses, a bee, a flower, steam…) ──
  const A = { W, H, hx, hy, a, yaw, bodyYaw, eyes, nose, mouth, ears: geo.ears, top: [hx + sy * a * .3, hy - a * D.head.top], crown: geo.pivot.crown,
    neck: geo.neckBase, shoulders: geo.shoulders, chest: [bcx, neckBase + a * .7], front: bcx, U, HU, hair: hairBox, ink: INK, design: D };
  live.extras = [];
  for (const [i, x] of (D.extras || []).entries()) {
    const layer = 'x:' + (x.layer || 'front');
    for (const o of (x.ops ? x.ops(A) : [])) op(layer, o.name || x.name || 'extra', o.bb, o.dir || [0, 1], (ctx, s) => o.draw(ctx, s, A), o.w);
    if (x.live) live.extras.push({ layer, fn: x.live, i });
  }
  geo.anchors = A;
  return { D, W, H, ops, live, geo, yaw, bodyYaw };
}

// composite order, back to front; `attach` says which transform each layer rides on (motion.js / portrait.js)
export const LAYERS = [
  ['x:back', 'none'], ['hairBack', 'hair'], ['x:behind', 'body'], ['body', 'body'], ['x:body', 'body'], ['neck', 'head'], ['head', 'head'], ['face', 'face'], ['@face', 'face'],
  ['x:head', 'face'], ['hairFront', 'hair'], ['ears', 'head'], ['earringL', 'earL'], ['earringR', 'earR'], ['@strays', 'hair'], ['x:hair', 'hair'], ['x:front', 'none'],
];
