// storybook-short · wear.js — hats and other things worn on the head, as head extras (layer 'hair': they ride the hair,
// lagging the head a little). Each returns an extras entry for a head design: head: { extras: [W.beanie({…})] }.
// Drawn in the same media as everything else: crayon knit, gouache brims, ink edges.
import * as P from './paint.js';

const knitRows = (ctx, poly, color, seed, rows = 6) => {
  P.gouache(ctx, poly, { color, seed, mottle: .35, edge: .25 });
  P.crayon(ctx, poly, { color, angle: 1.45, gap: 3, width: 2.2, alpha: .75, under: false, tooth: .4, seed: seed + 1 });
  const bb = P.bounds(poly); ctx.save(); P.path(ctx, poly); ctx.clip();
  for (let i = 1; i < rows; i++) { const y = P.lerp(bb[1], bb[3], i / rows); P.ink(ctx, [[bb[0], y], [(bb[0] + bb[2]) / 2, y + 3], [bb[2], y]], { width: 1, color: P.shade(color, -.35), seed: seed + i, alpha: .45 }); }
  ctx.restore();
};

/** a knitted beanie with a turned-up band and a pompom */
export const beanie = ({ color = '#2f8f6a', band = null, pom = '#e7b93a', stripe = null, height = .95, tilt = 0 } = {}) => ({ layer: 'hair', ops: A => {
  const { a, top } = A, [tx, ty] = top, w = 1.12 * a, y0 = ty + .55 * a;
  const crown = []; for (let i = 0; i <= 24; i++) { const t = Math.PI + i / 24 * Math.PI; crown.push([tx + Math.cos(t) * w * .92 + tilt * a * (Math.sin(t) + 1) * .3, y0 + Math.sin(t) * height * a]); }
  const bandP = [[tx - w * 1.02, y0 - .02 * a], [tx + w * 1.02, y0 - .02 * a], [tx + w * 1.04, y0 + .32 * a], [tx - w * 1.04, y0 + .32 * a]];
  const pomC = [tx + tilt * a * .3, y0 - height * a - .12 * a];
  return [{ name: 'beanie', bb: [tx - w * 1.2, pomC[1] - .35 * a, tx + w * 1.2, y0 + .45 * a], dir: [0, 1], draw: (ctx, s) => {
    knitRows(ctx, crown, color, s, 5);
    if (stripe) { ctx.save(); P.path(ctx, crown); ctx.clip(); P.crayon(ctx, [[tx - w * 1.2, y0 - height * a * .55], [tx + w * 1.2, y0 - height * a * .55], [tx + w * 1.2, y0 - height * a * .35], [tx - w * 1.2, y0 - height * a * .35]], { color: stripe, angle: 1.4, gap: 2.6, alpha: .9, underAlpha: .8, seed: s + 5 }); ctx.restore(); }
    P.ink(ctx, crown, { width: 1.5, color: '#241c22', seed: s + 2, alpha: .7 });
    const bp = P.spline(bandP, 6, true); knitRows(ctx, bp, band || P.shade(color, -.12), s + 3, 2);
    for (let i = 0; i < 14; i++) { const x = P.lerp(tx - w, tx + w, i / 13); P.ink(ctx, [[x, y0 + .02 * a], [x + 1, y0 + .3 * a]], { width: 1, color: P.shade(band || color, -.4), seed: s + 10 + i, alpha: .5 }); }
    P.ink(ctx, [...bp, bp[0]], { width: 1.4, color: '#241c22', seed: s + 4, alpha: .65, taper: [0, 0] });
    if (pom) { const pp = P.ellipse(pomC[0], pomC[1], .26 * a, .24 * a, 22); P.gouache(ctx, pp, { color: pom, seed: s + 6, mottle: .5, edge: .4, roughness: 2.2 }); for (let i = 0; i < 10; i++) { const r = P.rng(s + 60 + i), an = r() * 6.3; P.ink(ctx, [[pomC[0] + Math.cos(an) * .12 * a, pomC[1] + Math.sin(an) * .12 * a], [pomC[0] + Math.cos(an) * .3 * a, pomC[1] + Math.sin(an) * .28 * a]], { width: 1, color: P.shade(pom, -.35), seed: s + 70 + i, alpha: .6 }); } }
  } }];
} });

/** a beret, pushed back and to one side */
export const beret = ({ color = '#7b3fa6', band = '#e7623a', side = 1 } = {}) => ({ layer: 'hair', ops: A => {
  const { a, top } = A, [tx, ty] = top, cy = ty + .25 * a;
  const body = P.ellipse(tx + side * .15 * a, cy, 1.2 * a, .5 * a, 32, side * .08);
  const bandP = [[tx - 1.02 * a, cy + .2 * a], [tx + 1.02 * a, cy + .2 * a], [tx + 1.02 * a, cy + .42 * a], [tx - 1.02 * a, cy + .42 * a]];
  return [{ name: 'beret', bb: [tx - 1.5 * a, cy - .8 * a, tx + 1.5 * a, cy + .6 * a], dir: [1, 0], draw: (ctx, s) => {
    P.gouache(ctx, body, { color, seed: s, mottle: .5, edge: .35 }); P.crayon(ctx, body, { color, angle: .3, gap: 3, alpha: .55, under: false, seed: s + 1 });
    P.ink(ctx, [...body, body[0]], { width: 1.5, color: '#241c22', seed: s + 2, alpha: .6, taper: [0, 0] });
    P.crayon(ctx, P.spline(bandP, 5, true), { color: band, angle: 1.4, gap: 2.6, alpha: .9, underAlpha: .85, seed: s + 3 });
    P.ink(ctx, [[tx + side * .15 * a, cy - .5 * a], [tx + side * .2 * a, cy - .72 * a]], { width: 3, color: P.shade(color, -.4), seed: s + 4 });
  } }];
} });

/** a bucket hat, two-tone panels */
export const bucket = ({ colors = ['#3c6fc4', '#2f9c86'], brim = '#7a46b8' } = {}) => ({ layer: 'hair', ops: A => {
  const { a, top } = A, [tx, ty] = top, y0 = ty + .45 * a;
  const crown = [[tx - .95 * a, y0], [tx - .85 * a, y0 - .75 * a], [tx, y0 - .9 * a], [tx + .85 * a, y0 - .75 * a], [tx + .95 * a, y0]];
  const brimP = P.ellipse(tx, y0 + .05 * a, 1.45 * a, .32 * a, 36);
  return [{ name: 'bucket hat', bb: [tx - 1.6 * a, y0 - a, tx + 1.6 * a, y0 + .45 * a], dir: [0, 1], draw: (ctx, s) => {
    const cp = P.spline(crown, 5, true);
    P.gouache(ctx, cp, { color: colors[0], seed: s, mottle: .4 }); ctx.save(); P.path(ctx, cp); ctx.clip(); P.crayon(ctx, [[tx, y0 - a], [tx + a, y0 - a], [tx + a, y0], [tx, y0]], { color: colors[1], angle: 1.2, gap: 2.6, alpha: .9, underAlpha: .85, seed: s + 1 }); ctx.restore();
    P.ink(ctx, cp, { width: 1.4, color: '#241c22', seed: s + 2, alpha: .65 });
    P.gouache(ctx, brimP, { color: brim, seed: s + 3, mottle: .4, edge: .4 }); P.crayon(ctx, brimP, { color: brim, angle: .2, gap: 3, alpha: .5, under: false, seed: s + 4 });
    P.ink(ctx, [...brimP, brimP[0]], { width: 1.5, color: '#241c22', seed: s + 5, alpha: .6, taper: [0, 0] });
  } }];
} });

/** round glasses on the face (layer 'head': they ride the face) */
export const glasses = ({ color = '#5b3a2a', lens = null } = {}) => ({ layer: 'head', ops: A => {
  const vis = A.eyes.filter(e => e.vis); if (!vis.length) return [];
  return [{ name: 'glasses', bb: P.union(...vis.map(e => [e.cx - e.rx * 1.9, e.cy - e.ry * 1.9, e.cx + e.rx * 1.9, e.cy + e.ry * 1.9])), dir: [1, 0], draw: (ctx, s) => {
    for (const e of vis) { const rim = P.ellipse(e.cx, e.cy + e.ry * .1, e.rx * 1.5, e.ry * 1.45, 36); if (lens) { ctx.fillStyle = P.css(lens, .25); P.path(ctx, rim); ctx.fill(); } P.ink(ctx, [...rim, rim[0], rim[1]], { width: Math.max(2, A.a * .028), color, seed: s + e.side, taper: [0, 0] }); }
    if (vis.length === 2) { const [l, r] = vis; P.ink(ctx, [[l.cx + l.rx * 1.45, l.cy], [(l.cx + r.cx) / 2, l.cy - l.ry * .3], [r.cx - r.rx * 1.45, r.cy]], { width: Math.max(1.6, A.a * .02), color, seed: s + 9 }); }
  } }];
} });
