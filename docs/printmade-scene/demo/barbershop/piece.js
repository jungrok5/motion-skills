// printmade-scene · starter 「문 닫은 이발소」 — one example of the style, not a menu. Replace the place, the two
// printings, the cast, the beats and the sound with what your BRIEF.md designs.
// Now (A): a rainy night in a barbershop closed for years; a granddaughter walks in and touches the old chair.
// Then (B): the same plate printed again on a warm afternoon; her grandfather snaps a crimson cape, ready for the next child.
// Back to A: the crimson cape now lies over the chair. She recoils, then turns to us.
import * as P from 'pms/print.js';
import * as K from 'pms/plate.js';
import { Figure } from 'pms/figure.js';
import { Scene, walk, turn, stand, keyed, seq } from 'pms/scene.js';
import { makeScore } from 'pms/score.js';

const PI = Math.PI, CRIMSON = '#b3161d';

// ── the cast ──
const girl = new Figure({
  name: '수연 (손녀)', h: 372, mass: .9, skin: '#ecc9ae', blush: '#dc7a72',
  hair: { style: 'long', color: '#2e2320', len: .15 },
  top: { kind: 'coat', color: '#8a7058', inner: '#e3dccb', pattern: 'plain', length: .13 },
  bottom: { kind: 'pants', color: '#4c5a3c', pattern: 'speckle' }, shoes: '#2a2422',
});
const grandpa = new Figure({
  name: '할아버지 (이발사)', h: 356, mass: 1.15, skin: '#e2b99c', blush: '#cf766c',
  hair: { style: 'short', color: '#bdb7ab' }, mustache: true, glasses: '#6c5a4a',
  top: { kind: 'coat', color: '#e4dfd2', inner: '#56636e', pattern: 'plain', length: .16 },
  bottom: { kind: 'pants', color: '#3b3634', pattern: 'plain' }, shoes: '#2a2422',
});
export const ACTORS = [girl, grandpa];

// ── things the kit doesn't have, painted with the same media ──
function barberChair(ctx, k, x, G, leather) {
  const steel = '#b8c2c4';
  ctx.save(); ctx.globalAlpha = .45; P.blot(ctx, x, G + 4, 92, 16, '#1d1715', { seed: 4 }); ctx.restore();
  P.ink(ctx, P.ellipsePts(x, G, 66, 14, 30), P.shade(steel, -.25), { seed: 201 });
  P.ink(ctx, P.rect(x - 13, G - 120, 26, 112), steel, { seed: 202, mottle: .3 });
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 6, G - 116, 3, 100);
  P.ink(ctx, P.rect(x - 52, G - 58, 104, 10), P.shade(steel, -.15), { seed: 203 });             // footrest
  P.ink(ctx, P.rect(x - 70, G - 160, 140, 44), leather, { seed: 204 });                         // seat
  P.ink(ctx, P.rect(x - 60, G - 330, 120, 175), leather, { seed: 205 });                        // back
  P.ink(ctx, P.rect(x - 34, G - 368, 68, 34), P.shade(leather, -.1), { seed: 206 });           // headrest
  for (const s of [-1, 1]) { P.ink(ctx, P.rect(x + s * 70 - (s > 0 ? 0 : 26), G - 222, 26, 14), P.shade(leather, -.15), { seed: 207 + s }); P.ink(ctx, P.rect(x + s * 80 - 4, G - 210, 8, 56), steel, { seed: 209 + s, mottle: .2 }); }
  ctx.strokeStyle = P.alpha(P.shade(leather, -.45), .8); ctx.lineWidth = 1.5; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 60 + i * 24, G - 322); ctx.lineTo(x - 60 + i * 24, G - 162); ctx.stroke(); }
  P.speckle(ctx, { x: x - 60, y: G - 330, w: 120, h: 210 }, '#f4ead6', .25, { seed: 210, alpha: .5 });
}
function pole(ctx, k, x, y, h, red) {
  P.ink(ctx, P.rect(x - 15, y, 30, h), '#e9e3d6', { seed: 211, mottle: .2 });
  ctx.save(); ctx.beginPath(); ctx.rect(x - 15, y, 30, h); ctx.clip(); ctx.fillStyle = red;
  for (let yy = y - 60; yy < y + h + 60; yy += 34) { ctx.beginPath(); ctx.moveTo(x - 15, yy); ctx.lineTo(x + 15, yy - 22); ctx.lineTo(x + 15, yy - 10); ctx.lineTo(x - 15, yy + 12); ctx.fill(); }
  ctx.restore();
  P.ink(ctx, P.rect(x - 19, y - 16, 38, 18), '#9aa3a3', { seed: 212 }); P.ink(ctx, P.rect(x - 19, y + h - 2, 38, 18), '#9aa3a3', { seed: 213 });
}
function clock(ctx, k, x, y, swing) {
  P.ink(ctx, P.rect(x - 34, y - 40, 68, 150), k.pal.woodDk, { seed: 214 });
  P.ink(ctx, P.ellipsePts(x, y - 4, 26, 26, 30), '#ece4d2', { seed: 215, mottle: .2 });
  ctx.strokeStyle = k.pal.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 2, y - 22); ctx.moveTo(x, y - 4); ctx.lineTo(x + 14, y + 2); ctx.stroke();
  P.ink(ctx, P.rect(x - 22, y + 30, 44, 70), P.shade(k.pal.ink, .1), { seed: 216, mottle: .1 });
  if (swing != null) { const a = swing * .35, px = x + Math.sin(a) * 50, py = y + 34 + Math.cos(a) * 50; ctx.strokeStyle = '#c9a85e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 34); ctx.lineTo(px, py); ctx.stroke(); ctx.fillStyle = '#c9a85e'; ctx.beginPath(); ctx.arc(px, py, 8, 0, P.TAU); ctx.fill(); }
}
function mirror(ctx, k, b, tone) {
  P.ink(ctx, P.rect(b.x - 16, b.y - 16, b.w + 32, b.h + 32), k.pal.woodDk, { seed: 217 });
  P.ink(ctx, P.rect(b.x, b.y, b.w, b.h), tone, { seed: 218, mottle: .5 });
  ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
  P.ink(ctx, P.rect(b.x + b.w * .62, b.y + b.h * .1, b.w * .2, b.h * .62), P.shade(tone, .12), { seed: 219 });   // the window, reflected
  P.scratches(ctx, b, { seed: 220, angle: -1.0, n: 60, len: 70, color: 'rgba(255,255,255,.28)', width: 1.4 });
  ctx.restore();
}
function rack(ctx, k, x, G, hat) {
  P.ink(ctx, P.rect(x - 4, G - 290, 8, 290), k.pal.woodDk, { seed: 221 }); P.ink(ctx, P.ellipsePts(x, G, 30, 7, 20), k.pal.woodDk, { seed: 222 });
  ctx.strokeStyle = k.pal.woodDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, G - 270); ctx.lineTo(x - 26, G - 296); ctx.moveTo(x, G - 270); ctx.lineTo(x + 26, G - 296); ctx.stroke();
  if (hat) { P.ink(ctx, [[x - 40, G - 266], [x + 6, G - 280], [x + 2, G - 140], [x - 44, G - 150]], '#6a6d63', { seed: 223 }); P.ink(ctx, P.ellipsePts(x + 22, G - 300, 28, 7, 20), '#3b3634', { seed: 224 }); P.ink(ctx, P.rect(x + 6, G - 324, 32, 24), '#3b3634', { seed: 225 }); }
}
const CH = { x: 640, G: 800 };     // the chair
const capeOn = (ctx, k, kk) => {    // the clue: the crimson cape thrown over the chair's back and right arm (kk 0 → 1 prints it in, top first)
  if (kk <= 0) return; const { x, G } = CH, top = G - 372, L = 300 * P.smooth(kk);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 140, top - 10, 280, L + 10); ctx.clip();
  P.ink(ctx, [[x - 40, top], [x + 38, top + 4], [x + 64, G - 250], [x + 72, G - 160], [x + 112, G - 118], [x + 104, G - 62], [x + 82, G - 70], [x + 60, G - 128], [x - 10, G - 150], [x - 62, G - 156], [x - 66, G - 260]], CRIMSON, { seed: 230, mottle: .5, speck: .4 });
  ctx.strokeStyle = 'rgba(60,8,10,.55)'; ctx.lineWidth = 1.6; for (const dx of [-30, 0, 30]) { ctx.beginPath(); ctx.moveTo(x + dx * .5, top + 14); ctx.quadraticCurveTo(x + dx, G - 250, x + dx * 1.2, G - 158); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x + 78, G - 150); ctx.lineTo(x + 94, G - 72); ctx.stroke();
  ctx.restore();
};

// ── the plate, printed twice ──
const room = (ctx, k, then) => {
  const wallC = then ? '#cdbb8c' : '#8c9a96', floorA = then ? '#e2d6b8' : '#b9bdb3', floorB = then ? '#a3ab95' : '#788684';
  K.wall(ctx, k, { color: wallC, kind: 'stripe', color2: P.shade(wallC, -.16), size: 70, seed: 21 });
  K.wainscot(ctx, k, { y0: k.floorY - 170, color: then ? '#7a5d43' : '#4d4440' });
  K.floor(ctx, k, { kind: 'check', color: floorA, color2: floorB, size: 92, seed: 31 });
  K.door(ctx, k, { x: 70, y: k.floorY + 6, w: 150, h: 330, color: then ? '#6e4f37' : '#3f3833', seed: 53 });
  clock(ctx, k, 146, 160, then ? null : 0);
  mirror(ctx, k, { x: 340, y: 150, w: 480, h: 280 }, then ? '#c9cfc6' : '#6d7b80');
  K.counter(ctx, k, { x: 320, y: k.floorY + 4, w: 520, h: 120, color: then ? '#856446' : '#544740', seed: 75 });
  const r = P.rng(then ? 9 : 8); for (let bx = 350; bx < 800; bx += 34 + r() * 30) { const c = [k.pal.steel, k.pal.sage, k.pal.ochre, '#e6e0d0'][r() * 4 | 0], bh = 26 + r() * 30; P.ink(ctx, P.rect(bx, k.floorY - 142 - bh, 14, bh), then ? c : P.mix(c, '#56636e', .5), { seed: 240 + bx | 0 }); }
  pole(ctx, k, 905, 200, 250, then ? CRIMSON : '#b9a39d');
  K.win(ctx, k, { x: 1040, y: 120, w: 300, h: 360, cols: 2, rows: 2, cross: true, frame: then ? '#6e4f37' : '#3f3833', sill: true, curtain: { color: then ? '#e6dcc2' : '#a9ada5' }, seed: 51,
    view: (c, b) => then
      ? (K.wall(c, k, { x0: b.x, x1: b.x + b.w, y0: b.y, y1: b.y + b.h, color: '#cfdcd8', kind: 'sky', color2: '#ffffff', seed: 61 }), P.ink(c, P.rect(b.x, b.y + b.h * .55, b.w, b.h * .45), '#a4ad86', { seed: 62 }), P.ink(c, P.rect(b.x + 30, b.y + b.h * .3, 110, b.h * .4), '#d7b98d', { seed: 63 }), K.tree(c, k, { x: b.x + 230, y: b.y + b.h, h: 260, w: 16, bare: false, color: '#5d5240', seed: 64 }))
      : (K.wall(c, k, { x0: b.x, x1: b.x + b.w, y0: b.y, y1: b.y + b.h, color: '#3d4560', kind: 'sky', color2: '#59617c', seed: 61 }), P.ink(c, P.rect(b.x, b.y + b.h * .5, 120, b.h * .5), '#2a2e3e', { seed: 65 }), P.ink(c, P.rect(b.x + 170, b.y + b.h * .38, 140, b.h * .62), '#272a39', { seed: 66 }), c.fillStyle = 'rgba(255,236,190,.8)', c.fillRect(b.x + 200, b.y + b.h * .5, 14, 18), c.fillRect(b.x + 240, b.y + b.h * .62, 14, 18)) });
  K.lamp(ctx, k, { x: 640, y: 120, len: 120, kind: 'pendant' });
  rack(ctx, k, 270, k.floorY + 40, then);
  K.rug(ctx, k, { x: 62, y: k.floorY + 18, w: 168, h: 58, colors: then ? ['#9a6b52', '#3f3833', '#cdb98a', '#e4dbc4'] : ['#6b5a52', '#2f2a28', '#9b927c', '#b9b3a3'], pattern: 'band', seed: 41 });
  for (const cx of [1110, 1215]) K.chair(ctx, k, { x: cx, y: k.floorY + 96, facing: 'front', kind: 'plain', h: 150, color: then ? '#7a5d43' : '#4a403b', seed: 80 + cx });
  if (then) P.ink(ctx, P.rect(1180, k.floorY + 20, 60, 12), '#e8e2d2', { seed: 82 });
  if (then) { const q = P.rng(5); ctx.fillStyle = 'rgba(60,44,34,.8)'; for (let i = 0; i < 70; i++) { const a = q() * P.TAU, d = 40 + q() * 130; ctx.beginPath(); ctx.ellipse(CH.x + Math.cos(a) * d * 1.4, CH.G + 10 + Math.sin(a) * d * .35, 4 + q() * 4, 1.4, q() * 3, 0, P.TAU); ctx.fill(); } }   // the morning's hair on the floor
  else { P.blot(ctx, 1180, 900, 120, 22, '#4b5658', { alpha: .35, seed: 70 }); K.slip(ctx, k, { x: 1330, y: 500, text: '아직도 그 냄새가 난다', seed: 71 }); }   // rain come in under the window; a note
  barberChair(ctx, k, CH.x, CH.G, then ? '#6e4038' : '#5c4a46');
};

// ── the clue in grandpa's hands: the cape, hanging between them; snapped flat on the big key ──
function capeHeld(snap) {
  return (ctx, hand, F, p, J) => {
    const L = J.screen.hands.L, R = J.screen.hands.R, s = snap(p), drop = 150 * (1 - s * .7), fl = (p.flow || 0) * 2 + s * -90;
    P.path(ctx, [[R.x ?? R[0], R[1]], [L[0], L[1]], [L[0] + fl * .6 - 10, L[1] + drop], [R[0] + fl - 30, R[1] + drop * 1.1]]); ctx.fillStyle = CRIMSON; ctx.fill();
    ctx.strokeStyle = 'rgba(60,8,10,.5)'; ctx.lineWidth = 1.3; ctx.stroke();
  };
}

const T = { walk0: .7, walk1: 2.5, s1: 4.3, s2: 8.4, turn0: 11.0, turn1: 11.8, dur: 13.4 };
// 수연: walks in, looks down at the chair, touches its arm; after the return: gather, recoil, settle, then a stepped turn to us
const gStand = stand(girl, { at: [462, 870], yaw: PI / 2, t0: T.walk1, t1: T.turn0 });
const girlPose = seq(
  walk(girl, { from: [140, 870], to: [462, 870], t0: T.walk0, t1: T.walk1 }),
  keyed(gStand, [
    { t: 2.9, head: { pitch: .22 } },
    { t: 3.5, reach: { R: [62, 2, -96] }, head: { pitch: .3 } },
    { t: 4.2, reach: { R: [64, 2, -100] }, head: { pitch: .26 } },
    { t: 9.45, tag: 'antic', drop: 6, lean: .1, head: { pitch: .1 }, reach: { R: [40, 2, -120] } },
    { t: 9.8, tag: 'big', ease: 'snap', drop: -2, lean: -.12, head: { pitch: -.12 }, reach: { R: [40, 4, -24], L: [36, -2, -34] } },
    { t: 10.5, tag: 'settle', ease: 'back', drop: 2, lean: -.02, head: { pitch: 0 }, reach: { R: [18, 2, -60], L: [16, -2, -70] } },
    { t: 10.85, arms: { R: { sh: 0, el: .18 }, L: { sh: 0, el: .18 } }, lean: 0, drop: 0 },
  ]),
  turn(girl, { at: [462, 870], from: PI / 2, to: 0, t0: T.turn0, t1: T.turn1 }),
  keyed(stand(girl, { at: [462, 870], yaw: 0, t0: T.turn1, t1: T.dur + 1 }), [{ t: 12.3, head: { yaw: .08, pitch: .04 } }]),
);
// 할아버지: behind the chair's right arm, cape held low; gather it back, snap it out flat, let it settle; then looks up at us
const keysB = [
  { t: 5.5, reach: { R: [48, 6, -70], L: [44, -8, -80] } },
  { t: 6.0, tag: 'antic', drop: 10, lean: .12, reach: { R: [-40, 10, -78], L: [-34, -8, -86] } },
  { t: 6.38, tag: 'big', ease: 'snap', drop: -2, lean: -.05, reach: { R: [86, 6, 24], L: [80, -8, 14] } },
  { t: 7.05, tag: 'settle', ease: 'back', drop: 4, lean: .04, reach: { R: [62, 6, -52], L: [58, -8, -62] } },
  { t: 7.7, head: { yaw: .95, pitch: .05 } },
];
const gpBase = keyed(stand(grandpa, { at: [790, 812], yaw: -PI / 2, t0: 0, t1: T.dur + 1 }), keysB);
const snapK = p => { void p; return 0; };
const grandpaPose = Object.assign(t => { const p = gpBase(t), s = P.smooth((t - 6.15) / .25) * (1 - P.smooth((t - 6.6) / .5)); return { ...p, hold: { R: capeHeld(() => s) } }; }, gpBase);
void snapK;

export const film = new Scene({
  title: '문 닫은 이발소', label: '이발소', caption: '가족 미스터리 · 문 닫은 이발소', dur: T.dur, seed: 3,
  plate: { floorY: 610 },
  A: { paint: (c, k) => room(c, k, false), live: (c, k, t) => { K.rain(c, { x: 1040, y: 120, w: 300, h: 360 }, t, { seed: 300 }); K.glow(c, k, { x: 640, y: 120, w: 330, h: 560, a: .34, flicker: .3, seed: 2 }, t); } },
  B: { paint: (c, k) => room(c, k, true), live: (c, k, t) => { clock(c, k, 146, 160, Math.sin(t * Math.PI)); K.glow(c, k, { x: 640, y: 120, w: 300, h: 520, a: .2, flicker: .05, seed: 4 }, t); P.speckle(c, { x: 1000, y: 480 + (t * 6 % 40), w: 280, h: 260 }, '#fff6dc', .05, { seed: Math.floor(t * 4), alpha: .5, size: 2 }); } },
  shifts: [{ t: T.s1, dur: .9 }, { t: T.s2, dur: .9 }],
  change: { dur: 1.4, draw: (c, k, kk) => capeOn(c, k, kk) },
  cast: [{ fig: girl, pose: girlPose, state: 'A', seed: 2 }, { fig: grandpa, pose: grandpaPose, state: 'B', seed: 5 }],
  sound: { amb: ['room', 'rain'], surface: 'tile', events: [
    { t: 3.55, type: 'rustle', x: 560, gain: .5 },
    ...Array.from({ length: 7 }, (_, i) => ({ t: 5.25 + i * .5, type: 'tick', x: 146, gain: .6 })),
    { t: 6.0, type: 'rustle', x: 760, gain: .6 }, { t: 6.38, type: 'thud', x: 720, gain: .35 }, { t: 6.4, type: 'rustle', x: 720, gain: .9 },
    { t: 9.8, type: 'sigh', x: 470, dur: .5, gain: .8 },
  ] },
});
export const score = makeScore({ seed: 3, music: 'piano', key: 196 });
