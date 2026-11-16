// 「Dawn Baker」 — worked example of storybook-portrait (BRIEF.md beside this file).
// The apprentice at the corner bakery, 4:50 in the morning: auburn hair in a bun, a navy apron over a cream shirt, a red
// kerchief, flour on her cheek and nose, flour dust drifting in the oven light. Her big move is a yawn — gathered with
// a breath in, the head going back, held, then let go and shaken off with two blinks.
import * as P from '../../lib/paint.js';

export const meta = { title: 'Dawn Baker' };

const NAVY = '#2c3e6b', RED = '#d8432f', CREAM = '#f5ecda', FLOUR = '#fffdf6', INK = '#241c22';

export const design = {
  seed: 48,
  canvas: { paper: '#fbf7ef' },
  head: { x: 540, y: 590, a: 212, jaw: .2, chin: .97, top: 1.04, skin: '#f4d2c0', shadow: '#dca592' },
  face: {
    eyeX: .43, eyeY: .31, eyeR: .15, pupil: .4, gaze: [-.55, .2], lids: .3, lashes: 2,
    nose: { type: 'button', y: .46, size: 1.05, color: '#ea8a94' },
    mouth: { y: .66, w: .13, curve: .1 },
    brows: { show: [true, true], y: .55, tilt: .15, thick: .85, color: '#5a2414' },
    blush: { color: '#f08a84', x: .58, r: .24, strength: 1.2 },
    freckles: 10,
  },
  ears: { color: '#ea927f', earring: { type: 'hoop', color: '#e6b33a', size: 1 } },
  hair: { style: 'bun', volume: .1, base: '#6e2c18', colors: [['#5a2312', 4], ['#7d3418', 2.5], ['#d9692a', 2], ['#f09a4a', .8]], strays: 16,
    bun: { x: .12, y: -1.22, r: .4 } },
  neck: { w: .3, len: .62 },
  body: { shoulders: 1.5, slope: .5, garment: { type: 'collar', color: CREAM, collarColor: '#fbf3e3', pattern: { type: 'stripes', colors: ['#c9d4e6'], width: .03, gap: .14 } } },
  extras: [
    { // the apron bib and straps, navy crayon over the shirt
      layer: 'body', ops: A => {
        const x = A.front, a = A.a, y0 = A.neck[1] + a * .62, H = A.H;
        const bib = P.spline([[x - a * .62, y0], [x + a * .62, y0], [x + a * .7, H + 20], [x - a * .7, H + 20]], 10, true);
        const [[lx, ly], [rx, ry]] = A.shoulders;
        // straps from the top corners of the bib up over the shoulders, beside the collar
        const [nx, ny] = A.neck;
        const strapL = [[x - a * .62, y0 + 6], [x - a * .46, y0 + 6], [nx - a * .5, ny + a * .02], [nx - a * .68, ny + a * .06]];
        const strapR = [[x + a * .62, y0 + 6], [x + a * .46, y0 + 6], [nx + a * .5, ny + a * .02], [nx + a * .68, ny + a * .06]];
        void lx; void ly; void rx; void ry;
        return [{ name: 'apron', bb: P.union(P.bounds(bib, 8), P.bounds(strapL, 8), P.bounds(strapR, 8)), dir: [0, 1], draw: (ctx, s) => {
          for (const [i, st] of [strapL, strapR].entries()) P.crayon(ctx, st, { color: NAVY, angle: i ? -.6 : .6, gap: 2.6, alpha: .9, underAlpha: .8, seed: s + i, tooth: .35 });
          P.crayon(ctx, bib, { color: NAVY, angle: -1.1, gap: 2.8, alpha: .9, underAlpha: .85, seed: s + 3, tooth: .4, cross: .4 });
          P.ink(ctx, [bib[0], ...bib.filter(p => p[1] < H).slice(1, 8)], { width: 1.3, color: INK, seed: s + 4, alpha: .5 });
          // a flour handprint on the bib, rubbed in
          P.blush(ctx, x + a * .25, y0 + a * .55, a * .16, a * .12, { color: FLOUR, seed: s + 5, strength: 1.6, scribbles: 10, tooth: .2 });
        } }];
      } },
    { // the kerchief knotted at the throat
      layer: 'body', ops: A => {
        const [nx, ny] = A.neck, a = A.a, knot = P.ellipse(nx + a * .02, ny + a * .12, a * .09, a * .07, 18);
        const tails = [[nx - a * .02, ny + a * .14], [nx - a * .2, ny + a * .44], [nx - a * .05, ny + a * .4], [nx + a * .04, ny + a * .16], [nx + a * .22, ny + a * .4], [nx + a * .12, ny + a * .46]];
        const band = P.spline([[nx - a * .36, ny - a * .06], [nx, ny + a * .08], [nx + a * .36, ny - a * .06], [nx + a * .3, ny + a * .06], [nx, ny + a * .2], [nx - a * .3, ny + a * .06]], 6, true);
        return [{ name: 'kerchief', bb: [nx - a * .45, ny - a * .15, nx + a * .45, ny + a * .55], dir: [1, 0], draw: (ctx, s) => {
          P.crayon(ctx, band, { color: RED, angle: .4, gap: 2.6, alpha: .9, underAlpha: .85, seed: s, tooth: .35 });
          P.crayon(ctx, P.spline(tails.slice(0, 3), 4, true), { color: RED, angle: 1.1, gap: 2.6, alpha: .9, underAlpha: .85, seed: s + 1, tooth: .35 });
          P.crayon(ctx, P.spline(tails.slice(3), 4, true), { color: P.shade(RED, -.1), angle: -1.1, gap: 2.6, alpha: .9, underAlpha: .85, seed: s + 2, tooth: .35 });
          P.gouache(ctx, knot, { color: P.shade(RED, -.08), seed: s + 3, mottle: .4, edge: .5 });
          P.dabs(ctx, [[nx - a * .15, ny + a * .3], [nx + a * .15, ny + a * .3], [nx - a * .2, ny + a * .02], [nx + a * .22, ny + a * .03]], { color: FLOUR, r: 3, seed: s + 4 });
          P.ink(ctx, [...knot, knot[0]], { width: 1.2, color: INK, seed: s + 5, alpha: .6 });
        } }];
      } },
    { // flour on her face: a smear on the left cheek, a dab on the nose (rides the face)
      layer: 'head', ops: A => {
        const e = A.eyes[0], [nx, ny] = A.nose, a = A.a;
        return [{ name: 'flour', bb: [e.cx - a * .4, ny - a * .2, nx + a * .2, e.cy + a * .5], dir: [1, 0], draw: (ctx, s) => {
          ctx.save(); ctx.lineCap = 'round';
          for (let i = 0; i < 5; i++) { ctx.strokeStyle = P.css(FLOUR, .55 - i * .06); ctx.lineWidth = 9 - i; ctx.beginPath(); ctx.moveTo(e.cx - a * .28 + i * 3, e.cy + a * .2 + i * 5); ctx.lineTo(e.cx + a * .02 + i * 4, e.cy + a * .3 + i * 3); ctx.stroke(); }
          ctx.restore();
          P.tooth(ctx, [e.cx - a * .35, e.cy + a * .1, e.cx + a * .1, e.cy + a * .45], .5, 1, s);
          P.blush(ctx, nx - a * .03, ny - a * .06, a * .05, a * .035, { color: FLOUR, seed: s + 1, strength: 1.8, scribbles: 2, tooth: .2 });
        } }];
      } },
    { // flour dust drifting up through the warm light from the ovens below
      layer: 'front', live: (ctx, A, pose, t) => {
        const r = P.rng(9);
        ctx.save();
        for (let i = 0; i < 38; i++) {
          const x0 = r() * A.W, sp = 18 + r() * 30, ph = r() * A.H, sz = 1.4 + r() * 2.6;
          const y = A.H - ((t * sp + ph) % (A.H + 40)), x = x0 + Math.sin(t * .6 + i) * 22;
          ctx.fillStyle = P.css(r() < .5 ? '#f3d9a6' : '#e9c48b', .45 + .3 * Math.sin(t * 1.3 + i)); ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fill();
        }
        ctx.restore();
      } },
  ],
};

// keys set by hand from how a yawn goes (BRIEF.md · Motion; no video reference was generated for this example): eyes
// droop, a breath in with the head going back and over, the mouth opens slowly, held, lets go; a small shake after
export const motion = {
  draw: 7.5, live: 10, mass: 'medium', expression: 'sleepy', seed: 48,
  breath: { period: 4.6 },
  beats: [
    { t: .6, gaze: [-.6, .3] },
    { t: 1.8, gaze: [.2, .1], face: { lids: .6 } },
    { t: 2.6, gaze: [.1, -.5], head: { yaw: .06, tilt: -.14 }, face: { mouthOpen: .95, mouthCurve: 0, lids: .92, browLift: .7, browTilt: .3 }, ease: .45, breathe: 2.2, blink: false },
    { t: 4.4, head: { yaw: 0, tilt: .03 }, face: { mouthOpen: 0, mouthCurve: .1, lids: .35, browLift: 0, browTilt: .15 }, ease: .2, breathe: 1 },
    { t: 5.2, gaze: [.6, .1], head: { yaw: .1, tilt: .05 }, expression: 'calm' },
    { t: 6.0, gaze: [-.5, .05], head: { yaw: -.08, tilt: -.02 } },
    { t: 7.2, gaze: [.5, -.2], head: { yaw: 0, tilt: 0 }, expression: 'pleased' },
    { t: 8.8, gaze: [-.6, .3], expression: 'sleepy' },
  ],
};
