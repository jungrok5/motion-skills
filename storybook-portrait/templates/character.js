// 「Rain Collector」 — the starter of storybook-portrait (BRIEF.md beside this file).
// A boy in a yellow raincoat who goes out to count raindrops. One example of the style, not a menu: for a new topic,
// write the brief, then redesign every value below (hair, clothes, palette, extras, beats) from it.
import * as P from '../lib/paint.js';

export const meta = { title: 'Rain Collector' };

const YELLOW = '#f2c21c', HOOD = '#e6b012', RAIN = '#6f9fc8', INK = '#241c22';

export const design = {
  seed: 21,
  canvas: { paper: '#fbf8f1' },
  head: { x: 540, y: 600, a: 215, jaw: .15, chin: .95, top: 1.02, skin: '#f2cdb4', shadow: '#d9a088' },
  face: {
    eyeX: .42, eyeY: .33, eyeR: .15, pupil: .4, gaze: [.15, -.7], freckles: 26,
    nose: { type: 'line', color: '#ea8a78' },
    mouth: { y: .64, w: .12, curve: .3 },
    brows: { show: [true, true], y: .5, tilt: .2, thick: .9, len: .9 },
    blush: { color: '#f0866e', x: .56, r: .23, strength: 1.1 },
  },
  ears: { color: '#eb9278', earring: { type: 'none' } },
  hair: { style: 'short', bangs: 'full', length: .3, volume: .16, flare: .02, part: .05,
    base: '#24180f', colors: [['#1c120c', 5], ['#35231a', 2], ['#c8772c', 1.8], ['#e7a04a', .7]], strands: 30, strays: 14 },
  neck: { w: .3, len: .62 },
  body: { shoulders: 1.5, slope: .42, garment: { type: 'collar', color: YELLOW, collarColor: '#f7d64e', pattern: { type: 'solid' } } },
  extras: [
    { // the hood, bunched behind the neck (rides the body)
      layer: 'behind', ops: A => {
        const [nx, ny] = A.neck, a = A.a, hood = P.spline([[nx - a * .95, ny + a * .25], [nx - a * .78, ny - a * .45], [nx, ny - a * .62], [nx + a * .78, ny - a * .45], [nx + a * .95, ny + a * .25]], 6, true);
        return [{ name: 'hood', bb: P.bounds(hood, 8), dir: [0, 1], draw: (ctx, s) => {
          P.crayon(ctx, hood, { color: HOOD, angle: -1.1, seed: s, under: HOOD, underAlpha: .6, cross: .3 });
          P.ink(ctx, hood.slice(0, Math.floor(hood.length * .5)), { width: 1.5, color: INK, seed: s + 1, alpha: .7 });
        } }];
      } },
    { // the coat's folds: a deeper ochre crayon down the sides and under the collar, so the yellow has a form
      layer: 'body', ops: A => {
        const [[lx, ly], [rx, ry]] = A.shoulders, a = A.a, H = A.H;
        const L = [[lx - 6, ly + a * .3], [lx + a * .28, ly + a * .4], [lx + a * .22, H + 10], [lx - 10, H + 10]];
        const R = [[rx + 6, ry + a * .3], [rx - a * .28, ry + a * .4], [rx - a * .22, H + 10], [rx + 10, H + 10]];
        return [L, R].map((poly, i) => ({ name: 'folds', bb: P.bounds(poly, 8), dir: [0, 1], draw: (ctx, s) =>
          P.crayon(ctx, P.spline(poly, 8, true), { color: '#d89a12', angle: i ? -1.25 : 1.25, gap: 4.5, width: 2, alpha: .45, under: false, tooth: .55, seed: s }) }));
      } },
    { // toggles down the front, and the seam of the coat
      layer: 'body', ops: A => {
        const x = A.front, y0 = A.neck[1] + A.a * .45, pts = [0, 1, 2].map(i => [x + A.a * .03 * i, y0 + i * A.a * .38]);
        return [{ name: 'toggles', bb: [x - 40, y0 - 30, x + 60, y0 + A.a * 1.2], dir: [0, 1], draw: (ctx, s) => {
          P.ink(ctx, [[x - 4, A.neck[1] + A.a * .25], [x + A.a * .04, A.H + 10]], { width: 1.4, color: INK, seed: s, alpha: .55 });
          for (const [px, py] of pts) { P.gouache(ctx, P.ellipse(px + 10, py, 13, 7, 18), { color: '#8b4a2b', seed: s + py, mottle: .3, edge: .5 }); P.ink(ctx, [[px - 6, py], [px + 26, py]], { width: 1.3, color: INK, seed: s + px, alpha: .8 }); }
        } }];
      } },
    { // the rain: thin blue pencil strokes falling on a slant, a few splash ticks on the shoulders
      layer: 'front', live: (ctx, A, pose, t) => {
        const r = P.rng(5), n = 46;
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const x0 = r() * (A.W + 300) - 150, sp = 520 + r() * 260, ph = r(), len = 22 + r() * 26;
          const y = ((t * sp / A.H + ph) % 1) * (A.H + 200) - 100, x = x0 - y * .18;
          if (Math.abs(x - A.hx) < A.a * 1.2 && y > A.hy - A.a * 1.2 && y < A.hy + A.a * 1.1) continue; // not across the face
          ctx.strokeStyle = P.css(RAIN, .55 + r() * .3); ctx.lineWidth = 1.6 + r() * 1.2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * .18, y + len); ctx.stroke();
        }
        for (const [sx, sy] of A.shoulders) { const k = (t * 1.7 + sx * .01) % 1; if (k < .35) { ctx.strokeStyle = P.css(RAIN, .8 * (1 - k / .35)); ctx.lineWidth = 1.5; for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(sx + d * 6, sy - 6); ctx.lineTo(sx + d * (10 + k * 30), sy - 10 - k * 24); ctx.stroke(); } } }
        ctx.restore();
      } },
  ],
};

export const motion = {
  draw: 7, live: 10, mass: 'light', expression: 'pleased', seed: 21,
  breath: { period: 3.6 },
  // keys set by hand (BRIEF.md · Motion): a child following raindrops — the eyes jump first, the head follows a beat later
  beats: [
    { t: .9, gaze: [.1, -.95] },
    { t: 2.3, gaze: [.75, -.4], head: { yaw: .12, tilt: .07 } },
    { t: 4.6, gaze: [.6, .5], expression: 'surprised' },
    { t: 5.4, gaze: [-.5, .1], head: { yaw: -.09, tilt: -.04 }, expression: 'pleased' },
    { t: 8.0, gaze: [.15, -.8], head: { yaw: 0, tilt: .02 } },
  ],
};
