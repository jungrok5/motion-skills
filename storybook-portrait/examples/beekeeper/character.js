// 「The Beekeeper」 — worked example of storybook-portrait (BRIEF.md beside this file).
// A grandmother who keeps bees on her roof: grey curls, round glasses, an olive cardigan dotted like pollen, one bee
// that will not leave her alone. Designed from the topic, not from the starter: curly hair, glasses and the bee are
// extras drawn in the same media; her motion is heavy (slow head, longer counter-move) and her eyes track the bee.
import * as P from '../../lib/paint.js';

export const meta = { title: 'The Beekeeper' };

const OLIVE = '#7d8a3a', HONEY = '#e9a91f', INK = '#241c22';

// the bee's flight: a lazy figure of eight round her head; the gaze beats below follow it (keys read off this path)
export const beeAt = (t, A) => {
  const w = .62, x = A.hx + Math.sin(t * w * 2 + .6) * A.a * 1.55, y = A.hy - A.a * .55 + Math.sin(t * w * 4 + 1.1) * A.a * .32 + Math.sin(t * 1.3) * A.a * .05;
  return [x, y];
};

export const design = {
  seed: 33,
  canvas: { paper: '#fbf8f0' },
  head: { x: 540, y: 600, a: 205, jaw: .26, chin: .95, top: 1.0, skin: '#f1cfbd', shadow: '#d6a08e' },
  face: {
    eyeX: .4, eyeY: .3, eyeR: .13, pupil: .45, gaze: [.7, -.4], lids: .25,
    nose: { type: 'button', y: .47, size: 1.25, color: '#e3828e' },
    mouth: { y: .7, w: .14, curve: .45 },
    brows: { show: [true, true], y: .75, tilt: .25, thick: .75, len: 1, color: '#8d8a93' },
    blush: { color: '#ec8590', x: .6, y: .54, r: .22, strength: 1.15 },
  },
  ears: { color: '#e88f80', y: .36, earring: { type: 'stud', color: '#f4efe2', size: 1.2 } },
  hair: { style: 'curly', volume: .32, base: '#9c98a6', colors: [['#8a8597', 4], ['#e4e1e8', 3], ['#615c73', 2], ['#a3b4d8', 1.2]], strays: 12 },
  neck: { w: .31, len: .46 },
  body: {
    shoulders: 1.62, slope: .55,
    garment: { type: 'cardigan', color: OLIVE, opening: .5, pattern: { type: 'dots', colors: [HONEY, '#f3c74d'], width: .045, gap: .26 },
      inner: { color: '#f6efe0', pattern: { type: 'solid' } } },
  },
  extras: [
    { // round glasses, riding the face (pushed down her nose a little)
      layer: 'head', ops: A => {
        const vis = A.eyes.filter(e => e.vis);
        return [{ name: 'glasses', bb: P.union(...vis.map(e => [e.cx - e.rx * 1.8, e.cy - e.ry * 1.8, e.cx + e.rx * 1.8, e.cy + e.ry * 1.9])), dir: [1, 0], draw: (ctx, s) => {
          for (const e of vis) { const rim = P.ellipse(e.cx, e.cy + e.ry * .15, e.rx * 1.55, e.ry * 1.5, 40); P.ink(ctx, [...rim, rim[0], rim[1]], { width: 3.2, color: '#5b3a2a', seed: s + e.side, taper: [0, 0] }); }
          if (vis.length === 2) { const [l, r] = vis; P.ink(ctx, [[l.cx + l.rx * 1.5, l.cy], [(l.cx + r.cx) / 2, l.cy - l.ry * .35], [r.cx - r.rx * 1.5, r.cy]], { width: 2.4, color: '#5b3a2a', seed: s + 9 }); }
          // a glint on each lens: two white strokes
          ctx.save(); ctx.strokeStyle = 'rgba(255,253,248,.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          for (const e of vis) { ctx.beginPath(); ctx.moveTo(e.cx + e.rx * .6, e.cy - e.ry * .9); ctx.lineTo(e.cx + e.rx * 1.05, e.cy - e.ry * .35); ctx.stroke(); }
          ctx.restore();
        } }];
      } },
    { // a little wooden honey dipper pinned on the cardigan, the story object
      layer: 'body', ops: A => {
        const [x, y] = [A.front - A.a * .75, A.neck[1] + A.a * .85], body = P.ellipse(x, y, A.a * .1, A.a * .14, 24, .5);
        return [{ name: 'dipper brooch', bb: [x - A.a * .3, y - A.a * .3, x + A.a * .3, y + A.a * .45], dir: [0, 1], draw: (ctx, s) => {
          P.ink(ctx, [[x + A.a * .05, y + A.a * .05], [x + A.a * .2, y + A.a * .4]], { width: 6, color: '#a0653a', seed: s, taper: [0, .1] });
          P.gouache(ctx, body, { color: '#c98a4a', seed: s + 1, mottle: .4, edge: .5 });
          for (let i = -1; i <= 1; i++) P.ink(ctx, [[x - A.a * .1 + i * 5, y + i * A.a * .07 - 6], [x + A.a * .08 + i * 5, y + i * A.a * .07 + 2]], { width: 1.4, color: '#6d3f22', seed: s + 3 + i });
          P.blush(ctx, x - A.a * .02, y + A.a * .16, A.a * .06, A.a * .05, { color: HONEY, seed: s + 7, strength: 1.4, scribbles: 4 });
        } }];
      } },
    { // the bee: gouache body, crayon stripes, wings that blur, a dotted pencil trail
      layer: 'front', live: (ctx, A, pose, t) => {
        ctx.save(); ctx.lineCap = 'round';
        ctx.fillStyle = P.css('#3a2a20', .35);
        for (let i = 1; i < 18; i++) { const [x, y] = beeAt(t - i * .07, A); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
        const [x, y] = beeAt(t, A), [px] = beeAt(t - .03, A), dir = x >= px ? 1 : -1, flap = Math.sin(t * 90) * .5 + .5;
        ctx.translate(x, y); ctx.scale(dir * 1.7, 1.7);
        ctx.fillStyle = P.css('#f5f3ee', .55 + flap * .25); ctx.strokeStyle = P.css(INK, .6); ctx.lineWidth = 1.2;
        for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-3 + k * 2, -12 - flap * 4, 7, 11 - flap * 3, k * .5, 0, 7); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = P.css(HONEY); ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0, 0, 7); ctx.fill();
        ctx.fillStyle = P.css('#2a1c18'); for (const sx of [-5, 3]) { ctx.beginPath(); ctx.ellipse(sx, 0, 2.6, 9.4, 0, 0, 7); ctx.fill(); }
        ctx.beginPath(); ctx.arc(12, -2, 2.2, 0, 7); ctx.fill();
        ctx.strokeStyle = P.css(INK, .9); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-20, 2); ctx.stroke();
        ctx.restore();
      } },
  ],
};

// her eyes follow the bee: gaze keys are read off beeAt every .55 s (eyes track in small jumps, as eyes do), and the
// head goes along only when the bee swings far to one side — then it turns slowly (heavy) and comes back
// (a heavy body needs a second to land a turn, so the head changes its mind at most once every 1.1 s)
const HEAD = { hx: 540, hy: 600, a: 205 }, beats = [];
let side = 0, lastHead = -9;
for (let t = .3; t < 10; t += .55) {
  const [x, y] = beeAt(t + .15, HEAD), gx = P.clamp((x - HEAD.hx) / (HEAD.a * 1.3), -1, 1), gy = P.clamp((y - (HEAD.hy + HEAD.a * .3)) / (HEAD.a * 1.1), -1, 1);
  const b = { t: +t.toFixed(2), gaze: [+gx.toFixed(2), +gy.toFixed(2)] }, s = gx > .6 ? 1 : gx < -.6 ? -1 : 0;
  if (s !== side && t - lastHead >= 1.1 && t < 8.8) { b.head = { yaw: s * .12, tilt: s * .05 }; side = s; lastHead = t; }
  beats.push(b);
}
beats[Math.floor(beats.length / 2)].expression = 'pleased';
export const motion = { draw: 7.5, live: 10, mass: 'heavy', expression: 'calm', seed: 33, breath: { period: 4.8 }, beats };
