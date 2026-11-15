// 「연못」 — a pond seen from above, in seven words. The smallest complete world: one landform (돌), one thing that
// drifts on the fluid (연잎), one creature (잉어), one weather (비), time (밤, 낮) and the clearing word (비움), with the
// rules that tie them together and a 40-second performance. Read it top to bottom, then replace it with your topic:
//   1 the world   2 how each thing is drawn (pure functions, so cast.html can pose them)   3 words → things
//   4 rules       5 the performance
import { InkWorld, brush, life, things, INK, TAU, clamp, lerp } from 'inkworld/index.js';
const { stroke, wash, dot, leaf, glow, hash, rgba } = brush;

// ── 1 the world ──────────────────────────────────────────────────────────────────────────────────────────────────
export const world = new InkWorld({
  seed: 11, title: '연못', subtitle: '글자 하나가 못 하나', lang: 'ko',
  paper: { paperDay: [.925, .905, .84], paperNight: [.03, .045, .055] },
  sound: { music: { root: 50, day: [0, 2, 4, 7, 9], night: [0, 2, 3, 7, 8], bpm: 60, density: .5 } }
});

// ── 2 drawing ────────────────────────────────────────────────────────────────────────────────────────────────────
// A carp from above. `body` is a life.Chain (or anything with pts / ang / h): the head is pts[0] and it faces `h`.
// Seen from above its left and right are its own, so nothing is mirrored; the fins and tail hang off the spine.
const CARP = { n: 6, len: 25, limit: .42 };
export function drawCarp(ink, body, t, { red = true, seed = 1 } = {}) {
  const P = body.pts, n = P.length - 1, wid = [.62, 1, .96, .8, .56, .3, .12], beat = Math.sin(t * 6 + seed);
  const tailA = body.ang[n - 1] + Math.PI + beat * .35;
  const S = brush.curve(P, 4), m = S.length - 1, at = u => wid[Math.min(n, Math.floor(u * n))] + (wid[Math.min(n, Math.floor(u * n) + 1)] - wid[Math.min(n, Math.floor(u * n))]) * (u * n % 1);
  for (const s of [-1, 1]) leaf(ink, P[n][0], P[n][1], tailA + s * .42, 52, 12, { alpha: .5, bend: s * 7 });                 // tail fan
  for (const s of [-1, 1]) leaf(ink, P[1][0], P[1][1], body.ang[0] + Math.PI + s * (1.05 + beat * .12), 38, 10, { alpha: .45 });   // pectoral fins, swept back
  stroke(ink, S, { w: 46, press: at, alpha: red ? .3 : .82, seed });
  if (red) { stroke(ink, S.slice(2, Math.round(m * .55)), { w: 34, color: INK.red, alpha: .9, taper: [.5, .4], seed: seed + 2 }); stroke(ink, S.slice(Math.round(m * .62), Math.round(m * .85)), { w: 17, color: INK.red, alpha: .8, taper: [.6, .3], seed: seed + 3 }); }
  stroke(ink, S, { w: 5, alpha: .55, dry: .5, seed: seed + 5, taper: [.2, .1] });                                               // the dorsal line
  const c = Math.cos(body.h), s = Math.sin(body.h);
  for (const k of [-1, 1]) dot(ink, P[0][0] + c * 2 - s * k * 10, P[0][1] + s * 2 + c * k * 10, 3, { seed: seed + k });       // eyes, one each side
}
function drawLeaf(ink, x, y, r, a, { drops = 0, seed = 1 } = {}) {
  ink.save(); ink.translate(x, y); ink.rotate(a);
  ink.fillStyle = rgba(INK.black, .5); ink.beginPath(); ink.moveTo(0, 0);
  for (let i = 0; i <= 28; i++) { const u = .22 + i / 28 * (TAU - .44), k = r * (.93 + hash(seed, i) * .12); ink.lineTo(Math.cos(u) * k, Math.sin(u) * k); }
  ink.closePath(); ink.fill();
  wash(ink, r * .2, 0, r * .7, r * .7, { color: INK.blue, alpha: .5, seed });
  for (let i = 0; i < 9; i++) { const u = .5 + i / 8 * (TAU - 1); stroke(ink, [[0, 0], [Math.cos(u) * r * .5, Math.sin(u) * r * .5], [Math.cos(u) * r * .9, Math.sin(u) * r * .9]], { w: 2.2, alpha: .45, dry: .3, seed: seed + i, taper: [.8, .1] }); }
  for (let i = 0; i < drops; i++) { const u = hash(seed + 40, i) * TAU, d = hash(seed + 41, i) * r * .7; dot(ink, Math.cos(u) * d, Math.sin(u) * d, 2.6, { color: '#f4efe0', alpha: .9, seed: i }); }
  ink.restore();
}
function drawStone(ink, x, y, r, seed) {
  wash(ink, x + r * .12, y + r * .16, r * 1.5, r * 1.3, { alpha: .22, seed });                                                  // its shadow in the water
  const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14 * TAU, k = r * (.8 + hash(seed, i % 14) * .4); pts.push([x + Math.cos(u) * k, y + Math.sin(u) * k * .82]); }
  ink.fillStyle = rgba(INK.black, .62); ink.beginPath(); pts.forEach((p, i) => i ? ink.lineTo(p[0], p[1]) : ink.moveTo(p[0], p[1])); ink.fill();
  stroke(ink, pts, { w: 7, alpha: .8, dry: .55, seed, taper: [.5, .5] });
  for (let i = 0; i < 7; i++) dot(ink, x + (hash(seed + 3, i) - .5) * r * 1.2, y + (hash(seed + 4, i) - .5) * r * .9, 2.5 + hash(seed, i) * 2.5, { color: INK.blue, alpha: .7, seed: i });   // moss
}
/** the cast sheet (cast.html): every creature of this world, with how to pose it */
export const cast = [{ word: '잉어', view: 'above', chain: CARP, about: '척추 6마디 · 마디당 굽힘 0.42 rad 이내', draw: (ink, body, t) => drawCarp(ink, body, t, { red: true, seed: 3 }) }];

// ── 3 words → things ─────────────────────────────────────────────────────────────────────────────────────────────
// A thing is { z, update(w, dt), draw(w, ink, light) } added with w.add(); x and y are world units (the sheet is
// about 1778 × 1000 at 16:9). Use w.rand, never Math.random; use w.t, never the wall clock.
world.word('돌', { keys: ['dol', 'stone'], home: [.27, .6], note: 0, spawn(w, x, y) {
  const r = w.rand, stones = [0, 1, 2].map(i => ({ x: x + (i - 1) * 110 + (r() - .5) * 40, y: y + (r() - .5) * 60, r: 46 + r() * 34, seed: r() * 999 | 0 }));
  w.mark(x, y + 10, { r: 120, amount: .12 });
  return { z: 5, grow: 1.6, x, y, stones, draw(w, ink) { for (const s of stones) drawStone(ink, s.x, s.y, s.r, s.seed); } };
} });

world.word('연잎', { keys: ['yeonip', 'leaf'], home: [.63, .38], note: 2, pigment: 2, max: 3, spawn(w, x, y) {
  const r = w.rand, pads = [0, 1, 2, 3].map(i => ({ x: x + (r() - .5) * 330, y: y + (r() - .5) * 230, r: 54 + r() * 30, a: r() * TAU, seed: r() * 999 | 0, drops: 0 }));
  return { z: 30, grow: 1.4, x, y, pads, f: [0, 0],
    update(w, dt) {                                             // pads ride the fluid: stir the water and they drift and turn
      for (const p of pads) { w.flow(p.x, p.y, this.f); p.x = clamp(p.x + this.f[0] * .8 * dt, 60, w.W - 60); p.y = clamp(p.y + this.f[1] * .8 * dt, 60, w.H - 60); p.a += (this.f[0] * .004 + Math.sin(w.t * .5 + p.seed) * .02) * dt * 8;
        p.drops = w.has('비') ? Math.min(7, p.drops + dt * 1.5) : Math.max(0, p.drops - dt * .4); }
    },
    draw(w, ink) { for (const p of pads) drawLeaf(ink, p.x, p.y, p.r, p.a, { drops: Math.floor(p.drops), seed: p.seed }); } };
} });

world.word('잉어', { keys: ['ingeo', 'carp'], home: [.45, .56], note: 4, pigment: 1, max: 6, spawn(w, x, y) {
  const r = w.rand;
  return [0, 1, 2].map(i => w.add({
    tags: ['fish'], z: 20, grow: 1.2, red: i !== 1, seed: r() * 99 | 0, goal: [x, y], next: 0, home: [x, y],
    chain: new life.Chain(x + (r() - .5) * 120, y + (r() - .5) * 120, r() * TAU, Object.assign({ kind: '잉어' }, CARP)),
    update(w, dt) {
      const c = this.chain, p = w.ptr; this.next -= dt; let speed = 62;
      if (this.next <= 0) { this.next = 2.5 + r() * 3; this.goal = [clamp(this.home[0] + (r() - .5) * 700, 120, w.W - 120), clamp(this.home[1] + (r() - .5) * 460, 120, w.H - 120)]; }
      let [gx, gy] = this.goal;
      const pads = w.has('비') ? w.all('연잎').flatMap(t => t.pads) : [];           // in rain they shelter under the nearest pad
      if (pads.length) { const n = pads.reduce((a, b) => Math.hypot(a.x - c.x, a.y - c.y) < Math.hypot(b.x - c.x, b.y - c.y) ? a : b); gx = n.x + Math.cos(this.seed) * 20; gy = n.y + Math.sin(this.seed) * 20; }
      else if (p.seen && Math.hypot(p.x - c.x, p.y - c.y) < 300) { if (p.down) { gx = c.x * 2 - p.x; gy = c.y * 2 - p.y; speed = 170; } else { gx = p.x; gy = p.y; speed = 90; } }   // curious about the brush, shy of the stroke
      for (const s of w.all('돌').flatMap(t => t.stones)) { const d = Math.hypot(c.x - s.x, c.y - s.y); if (d < s.r + 70) { gx += (c.x - s.x) / d * 260; gy += (c.y - s.y) / d * 260; } }   // around stones, never through
      if (Math.hypot(gx - c.x, gy - c.y) < 40) speed *= .35;
      c.swim(w, dt, gx, gy, { speed, turn: 2, flow: .5, wiggle: 5 }); this.x = c.x; this.y = c.y;
      if (w.frame % 5 === 0) w.push(c.x, c.y, c.vx * .35, c.vy * .35, 34);                // a wake in the ink
    },
    draw(w, ink) { drawCarp(ink, this.chain, w.t, this); }
  }));
} });

world.word('비', { keys: ['bi', 'rain'], home: [.5, .2], note: 5, spawn: (w, x, y) => things.rain(w, x, y, { seconds: 14, flat: 1, wash: .12 }) });

world.word('밤', { keys: ['bam', 'night'], home: [.82, .22], note: 7, spawn: (w, x, y) => things.night(w, x, y) });
world.word('낮', { keys: ['nat', 'day'], home: [.2, .22], note: 8, spawn: (w, x, y) => things.day(w, x, y) });
world.word('비움', { keys: ['bium', 'clear'], home: [.5, .5], note: 9, spawn: w => things.clear(w) });

function fireflies(w) {
  const r = w.rand.fork(5), flies = Array.from({ length: 14 }, () => ({ x: r() * w.W, y: r() * w.H, ph: r() * TAU, k: .6 + r() * .8 }));
  return w.add({ tags: ['firefly'], z: 70, grow: 2.5, fade: 2,
    update(w, dt) { if (!w.night && this.leaving == null) w.dismiss(this); const pads = w.all('연잎').flatMap(t => t.pads);
      flies.forEach((f, i) => { const p = pads.length ? pads[i % pads.length] : { x: w.W / 2, y: w.H / 2 }; f.x += ((p.x - f.x) * .25 + Math.cos(w.t * f.k + f.ph) * 60) * dt; f.y += ((p.y - f.y) * .25 + Math.sin(w.t * f.k * 1.3 + f.ph) * 60) * dt; }); },
    draw(w, ink, light) { for (const f of flies) glow(light, f.x, f.y, 26, { color: '#d8f29a', alpha: .35 + .6 * Math.max(0, Math.sin(w.t * 2.2 * f.k + f.ph)) }); } });
}

// ── 4 rules: what the things do to each other ───────────────────────────────────────────────────────────────────
// `when` lists the words that must be on the sheet; `line` is shown at the side when it happens; `then` is the event.
// Continuous reactions (carp steering around stones) live in update() above; a rule marks the moment and says it.
world.rule({ id: 'stone-carp', when: ['돌', '잉어'], line: '돌 틈으로 잉어가 돈다', then(w) { const s = w.first('돌'); for (const f of w.all('잉어')) { f.home = [s.x, s.y]; f.next = 0; } } });
world.rule({ id: 'leaf-rain', when: ['연잎', '비'], line: '연잎에 빗방울이 구른다' });
world.rule({ id: 'carp-rain', when: ['잉어', '비', '연잎'], line: '비 오면 잉어는 잎 아래로' });
world.rule({ id: 'night-leaf', when: ['밤', '연잎'], line: '잎 사이로 반딧불이 뜬다', then: w => { if (!w.has('firefly')) fireflies(w); } });
world.rule({ id: 'dawn', when: ['낮'], line: '물이 다시 밝다' });

// ── 5 the performance: what the sheet does when nobody is writing (and what check / render play) ────────────────
world.perform([
  ['돌', .27, .6], ['연잎', .63, .38], ['잉어', .46, .56, { wait: 3 }],
  ['stir', [[.36, .42], [.5, .62], [.68, .52], [.6, .32], [.44, .36]], 3, { ink: false }],
  ['비', .5, .22, { wait: 5 }],
  ['stir', [[.2, .3], [.34, .24], [.3, .4]], 1.6, { pigment: 0 }],
  ['밤', .82, .24, { wait: 5 }],
  ['stir', [[.7, .7], [.8, .6], [.74, .5]], 1.4, { pigment: 1 }],
  ['낮', .2, .22, { wait: 3 }],
  ['비움', .5, .5, { wait: 2 }]
]);
