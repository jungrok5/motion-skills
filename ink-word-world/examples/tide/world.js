// 「물때」 — the sea at the turn of the tide, in seventeen Hangul words. The worked example of ink-word-world: a topic
// that is not in the piece the style comes from (that one was a Chinese-character mountain landscape), designed from
// BRIEF.md with the same form — write a word, it melts into the ink and becomes the thing, and the things act on each
// other. Sections: 1 the world and its sea · 2 drawing (pure functions, posed on cast.html) · 3 words → things ·
// 4 rules · 5 the performance.
import { InkWorld, brush, life, things, INK, TAU, clamp, lerp, smooth } from 'inkworld/index.js';
const { stroke, wash, ridge, dot, leaf, glow, hash, noise, rgba, curve, angDiff } = brush;

// ── 1 the world ──────────────────────────────────────────────────────────────────────────────────────────────────
export const world = new InkWorld({
  seed: 23, title: '물때', subtitle: '글자 하나가 바다 하나', lang: 'ko',
  ink: { blue: '#27566e', red: '#b8301f', gold: '#b08a3a' },                 // 먹 · 주 · 쪽, and the ochre of a hemp sail
  pigments: [{ name: 'ink', label: '먹', color: '#16130f' }, { name: 'red', label: '주', color: '#b8301f' }, { name: 'blue', label: '쪽', color: '#27566e' }],
  labels: { hint: '글자를 치면 살아납니다 · 끌어서 먹을 젓기 · Shift 누르고 끌면 물 · 1 먹 2 주 3 쪽' },
  paper: { paperDay: [.918, .905, .86], paperNight: [.022, .038, .06], pale: [.9, .94, .93] },
  sound: { music: { root: 50, day: [0, 2, 5, 7, 9], night: [0, 3, 5, 7, 10], bpm: 54, density: .5, bright: 8 } },
  env: () => ({ tide: 0, swell: .25, fog: 0, storm: 0, level: 0 }),
  // the sea's own clockwork: the moon pulls the tide in, wind and storm raise the swell
  tick(w, dt) {
    const e = w.env; e.tide = lerp(e.tide, w.has('달') ? 46 : 0, 1 - Math.exp(-dt * .35)); e.storm = Math.max(0, e.storm - dt);
    e.swell = lerp(e.swell, .25 + e.level * .45 + Math.abs(w.wind.x) / 420 * .7 + (e.storm > 0 ? 1.1 : 0), 1 - Math.exp(-dt * .8));
    const f = w.first('안개'); e.fog = f ? f.presence || 0 : 0;
  }
});
/** the waterline (y), and how far the surface is lifted at x by the swell */
const sea = w => w.H * .56 - w.env.tide;
const wave = (w, x) => w.env.swell * (Math.sin(x * .011 - w.t * 1.5) * 9 + Math.sin(x * .023 + w.t * 1.1) * 4);

world.sound.voice('sea', (au, t, p) => au.loop(t, 'sea', { on: p.on, type: 'low', f: 420, q: .4, v: .13, lfo: .11, wet: .3 }));
world.sound.voice('whale', (au, t, p) => { au.tone(t, { f: 150, to: 290, type: 'sine', a: .5, d: 2.2, v: .13, vib: .02, vibRate: 4, wet: .8, pan: p.pan, hold: .4 }); au.tone(t + 1.6, { f: 300, to: 120, type: 'triangle', a: .4, d: 2.6, v: .07, vib: .03, wet: .8, pan: p.pan }); });
world.sound.voice('gull', (au, t, p) => { for (let i = 0; i < 3; i++) au.tone(t + i * .17, { f: 1500 - i * 130, to: 950, type: 'triangle', a: .012, d: .13, v: .05, wet: .5, pan: p.pan, glide: 1 }); });
world.sound.voice('spout', (au, t, p) => au.noise(t, { type: 'band', f: 700, to: 2600, q: .7, a: .05, d: .9, v: .16, wet: .45, pan: p.pan }));
world.sound.voice('splash', (au, t, p) => { au.noise(t, { type: 'band', f: 2200, to: 500, q: .5, a: .01, d: .45, v: .13, wet: .4, pan: p.pan }); au.tone(t, { f: 320, to: 700, a: .01, d: .1, v: .05, wet: .5, pan: p.pan }); });

// ── 2 drawing ────────────────────────────────────────────────────────────────────────────────────────────────────
// Each creature is one function that draws a body however it is posed; cast.html poses them all eight ways.
// Side views take their back from body.frame() (a spine) or life.side() (a single agent): the back is always up.

/** 고래 — a whale on a spine (life.Chain). Fins and flukes hang off frames along the body; `roll` lets it turn over. */
const WHALE = { n: 7, len: 46, limit: .3 };
const whaleWidth = u => u < .2 ? lerp(.3, 1, Math.pow(u / .2, .45)) : lerp(1, .1, smooth(.2, 1, u) * .92 + (u - .2) * .1);   // a blunt round head, a long taper to the tail
export function drawWhale(ink, c, t, { seed = 1 } = {}) {
  const S = curve(c.pts, 4), roll = Math.abs(c.roll), tail = c.frame(1), beat = Math.sin(t * 2.2 + seed) * .2;
  for (const s of [-1, 1]) leaf(ink, tail.x, tail.y, tail.a + Math.PI + s * (.62 + beat * s * .3), 70, 17, { alpha: .82, bend: s * 9 });          // flukes
  const f = c.frame(.3), fa = Math.atan2(-Math.sin(f.a) * .55 - f.by * .85, -Math.cos(f.a) * .55 - f.bx * .85);
  leaf(ink, f.x - f.bx * 30, f.y - f.by * 30, fa, 96 * (.35 + .65 * roll), 17, { alpha: .8, bend: -8 * c.roll });                                // long pectoral fin, on the belly side
  const nose = c.frame(0); S.unshift([nose.x + Math.cos(nose.a) * 16, nose.y + Math.sin(nose.a) * 16]);                                          // the snout, rounded off ahead of the first joint
  stroke(ink, S, { w: 104, press: whaleWidth, alpha: .88, seed });
  const belly = S.map((p, i) => { const fr = c.frame(i / (S.length - 1)), k = whaleWidth(i / (S.length - 1)) * 30; return [p[0] - fr.bx * k, p[1] - fr.by * k]; });
  stroke(ink, belly.slice(1, Math.round(belly.length * .62)), { w: 26, color: '#cfc8b6', alpha: .55 * roll, dry: .35, seed: seed + 3, taper: [.2, .1] });   // pale throat, ventral side
  const d = c.frame(.66), da = Math.atan2(-Math.sin(d.a) * .8 + d.by * .6, -Math.cos(d.a) * .8 + d.bx * .6), dk = whaleWidth(.66) * 44;
  leaf(ink, d.x + d.bx * dk, d.y + d.by * dk, da, 30 * roll, 9, { alpha: .85 });                                                                // small dorsal fin, on the back
  stroke(ink, S.map((p, i) => { const fr = c.frame(i / (S.length - 1)), k = whaleWidth(i / (S.length - 1)) * 34; return [p[0] + fr.bx * k, p[1] + fr.by * k]; }), { w: 9, alpha: .5, dry: .7, seed: seed + 5, taper: [.3, .1] });
  const e = c.frame(.11); dot(ink, e.x - e.bx * 6 + Math.cos(e.a) * 4, e.y - e.by * 6 + Math.sin(e.a) * 4, 4.2, { color: '#efe9d8', seed });           // eye, below the midline
}
/** 멸치 — one anchovy, side view (a single agent: x, y, h) */
export function drawFish(ink, a, t) {
  life.side(ink, a.x, a.y, a.h, x => {
    for (const s of [-1, 1]) leaf(x, -11, 0, Math.PI + s * .5, 9, 2.6, { alpha: .6 });
    leaf(x, -12, 0, 0, 27, 4.6, { alpha: .66 }); stroke(x, [[-9, -1.6], [2, -2.6], [11, -1.2]], { w: 2.6, alpha: .75, taper: [.5, .2] });     // dark back, on top
    dot(x, 9.5, -.3, 1.2, { color: '#efe9d8' });
  });
}
/** 갈매기 — a gull, side view. Wings beat with a.ph; a.rest folds them and stands it on its legs. */
export function drawGull(ink, a, t, { flap } = {}) {
  life.side(ink, a.x, a.y, a.rest ? (Math.cos(a.h) < 0 ? Math.PI : 0) : a.h, x => {
    const u = flap != null ? flap : Math.sin(t * 8.5 * (a.k || 1) + (a.ph || 0)) * (a.glide ? .25 : 1);
    if (a.rest) { for (const lx of [-1, 4]) stroke(x, [[lx, 6], [lx, 15]], { w: 1.6, color: INK.red, taper: [1, .6] }); }
    else stroke(x, [[6, -2], [0, -4 - 15 * u], [-17, -28 * u + 3]], { w: 5.5, color: INK.grey, alpha: .5, taper: [.9, .05] });                            // far wing
    leaf(x, -15, 1, Math.PI + .1, 13, 4.4, { alpha: .7 }); leaf(x, -16, 0, 0, 36, 7.6, { color: INK.grey, alpha: .5 }); dot(x, 19, -3, 4.4, { color: INK.grey, alpha: .75 }); dot(x, 20.5, -3.6, 1.1);   // tail, pale body, head, eye
    leaf(x, 22, -2, .2, 9, 1.8, { color: INK.red });                                                                                   // beak
    if (a.rest) leaf(x, 6, -3, Math.PI + .12, 30, 5.2, { alpha: .9 });
    else { const E = [-5, -4 - 18 * u], T = [-27, -33 * u + 5]; stroke(x, [[2, -2], E, T], { w: 7.5, color: INK.grey, alpha: .92, taper: [.9, .05] });           // near wing: long, narrow, grey
      stroke(x, [[lerp(E[0], T[0], .45), lerp(E[1], T[1], .45)], T], { w: 4.6, alpha: .95, taper: [.9, .05] }); }                                          // with a black tip
  });
}
/** 해파리 — a jellyfish: bell toward its heading, tentacles trailing behind (j.tendrils, or straight ones when posed) */
export function drawJelly(ink, j, t, light, dark = 0) {
  const R = j.r || 34, p = ((t * .8 * (j.k || 1) + (j.ph || 0)) % 1 + 1) % 1, sq = Math.sin(Math.min(1, p / .35) * Math.PI), ax = j.h + Math.PI / 2;
  const rim = (u) => { const c = Math.cos(ax), s = Math.sin(ax), lx = u * R * (1 - .2 * sq); return [j.x + c * lx, j.y + s * lx]; };
  for (let i = 0; i < 5; i++) {
    const u = (i - 2) / 2.4, pts = j.tendrils ? j.tendrils[i].pts : Array.from({ length: 7 }, (_, k) => { const b = rim(u), back = j.h + Math.PI; return [b[0] + Math.cos(back) * k * 15 + Math.cos(ax) * Math.sin(k * .9 + i) * 5, b[1] + Math.sin(back) * k * 15 + Math.sin(ax) * Math.sin(k * .9 + i) * 5]; });
    stroke(ink, pts, { w: 3, color: INK.blue, alpha: .5, taper: [1, .1], seed: i });
  }
  ink.save(); ink.translate(j.x, j.y); ink.rotate(ax); const wf = 1 - .2 * sq, hf = 1 + .16 * sq;
  ink.fillStyle = rgba(INK.blue, .3); ink.beginPath(); ink.moveTo(-R * wf, 0); ink.bezierCurveTo(-R * wf * 1.05, -R * 1.25 * hf, R * wf * 1.05, -R * 1.25 * hf, R * wf, 0);
  ink.quadraticCurveTo(R * wf * .5, R * .16, 0, R * .05); ink.quadraticCurveTo(-R * wf * .5, R * .16, -R * wf, 0); ink.fill();
  wash(ink, 0, -R * .45, R * .55, R * .4, { color: INK.blue, alpha: .5, seed: 3 });
  const arc = []; for (let i = 0; i <= 12; i++) { const v = i / 12 * Math.PI; arc.push([-Math.cos(v) * R * wf, -Math.sin(v) * R * .93 * hf]); }
  stroke(ink, arc, { w: 4.5, color: INK.blue, alpha: .7, dry: .3, seed: 7, taper: [.4, .4] });
  for (const s of [-1, 1]) stroke(ink, [[s * R * .14, 2], [s * R * .2, R * .5], [s * R * .08, R * .95]], { w: 5, color: INK.blue, alpha: .45, taper: [.9, .1], seed: 9 + s });   // oral arms
  ink.restore();
  if (light && dark > .05) glow(light, j.x - Math.cos(j.h) * 0 + Math.cos(j.h) * R * .4, j.y + Math.sin(j.h) * R * .4, R * 2.4, { color: '#7fe3da', alpha: (.3 + .25 * sq) * dark });
}
/** 배 — a hemp-sailed fishing boat, facing +x at the origin on the waterline; fill 0…1 bellies the sail */
export function drawBoat(ink, t, { fill = .2, flag = -1 } = {}) {
  const sail = [[5, -128], [5 + 30 + 46 * fill, -100], [5 + 40 + 58 * fill, -62], [5 + 26 + 40 * fill, -30], [5, -26]];
  ink.fillStyle = rgba(INK.gold, .62); ink.beginPath(); sail.forEach((p, i) => i ? ink.lineTo(p[0], p[1]) : ink.moveTo(p[0], p[1])); ink.fill();
  stroke(ink, curve(sail, 5), { w: 3.5, alpha: .7, dry: .3, seed: 2, taper: [.6, .6] });
  for (const k of [.3, .55, .8]) stroke(ink, [[5, lerp(-128, -26, k)], [5 + (34 + 50 * fill) * Math.sin(k * Math.PI) + 4, lerp(-116, -30, k)]], { w: 2, alpha: .5, dry: .4, seed: 5 + k * 10 });   // battens
  stroke(ink, [[5, -4], [4, -70], [5, -140]], { w: 5.5, alpha: .92, taper: [1, .5], seed: 3 });                                           // mast
  leaf(ink, 5, -138, flag > 0 ? 0 : Math.PI, 26, 5, { color: INK.red, alpha: .9, bend: 3 });                                              // pennant streams downwind
  ink.fillStyle = rgba(INK.black, .86); ink.beginPath(); ink.moveTo(-64, -13); ink.quadraticCurveTo(-46, 14, -8, 14); ink.lineTo(30, 13); ink.quadraticCurveTo(58, 8, 76, -19); ink.lineTo(52, -7); ink.lineTo(-48, -6); ink.closePath(); ink.fill();
  stroke(ink, [[-64, -13], [-48, -6], [52, -7], [76, -19]], { w: 4, alpha: .9, dry: .25, seed: 8, taper: [.5, .4] });
  stroke(ink, [[58, -12], [64, -30]], { w: 2.5, alpha: .8 }); dot(ink, 64, -33, 4.5, { color: INK.red });                                  // lantern post at the bow
}
const jellyPose = (x, y, h) => ({ x, y, h, r: 34, ph: .1, k: 1 });
/** the cast sheet: every creature, and the boat (it also has a front and a back) */
export const cast = [
  { word: '고래', view: 'side', chain: WHALE, scale: .6, about: '척추 7마디 · 마디당 0.30 rad 이내 · 등지느러미는 등, 가슴지느러미와 흰 목은 배 쪽', draw: (ink, body, t) => drawWhale(ink, body, t, { seed: 2 }) },
  { word: '갈매기', view: 'side', scale: 2.4, about: '붉은 부리가 앞 · 날개는 몸 위에서 아래로', draw: (ink, a, t) => drawGull(ink, a, t),
    poses: [{ label: '날개 올림', draw: ink => drawGull(ink, { x: 0, y: 10, h: 0 }, 0, { flap: 1 }) }, { label: '날개 내림', draw: ink => drawGull(ink, { x: 0, y: -10, h: 0 }, 0, { flap: -1 }) },
      { label: '앉음 →', draw: ink => drawGull(ink, { x: 0, y: 0, h: 0, rest: true }, 0) }, { label: '앉음 ←', draw: ink => drawGull(ink, { x: 0, y: 0, h: Math.PI, rest: true }, 0) }] },
  { word: '멸치', view: 'side', scale: 4, about: '검은 등이 위 · 꼬리 두 갈래가 뒤', draw: (ink, a, t) => drawFish(ink, a, t) },
  { word: '해파리', view: 'side', scale: 1.5, about: '갓이 가는 쪽 · 촉수는 뒤로 끌림 · 좌우 대칭', draw: (ink, a, t) => drawJelly(ink, jellyPose(a.x, a.y, a.h), t) },
  { word: '배', view: 'side', scale: 1, standard: false, about: '뱃머리(등불)가 가는 쪽 · 돛과 깃발은 바람이 가는 쪽으로',
    poses: [{ label: '→ 순풍 (깃발도 앞으로)', draw: ink => { ink.translate(0, 70); drawBoat(ink, 0, { fill: .8, flag: 1 }) } }, { label: '← 순풍 (좌우를 돌려 그림)', draw: ink => { ink.translate(0, 70); ink.scale(-1, 1); drawBoat(ink, 0, { fill: .8, flag: 1 }); } },
      { label: '→ 바람 없음', draw: ink => { ink.translate(0, 70); drawBoat(ink, 0, { fill: .05, flag: -1 }) } }, { label: '돌아서는 중 (세로로 좁아짐)', draw: ink => { ink.translate(0, 70); ink.scale(.3, 1); drawBoat(ink, 0, { fill: .2 }); } }] }
];

// ── 3 words → things ─────────────────────────────────────────────────────────────────────────────────────────────
world.word('섬', { keys: ['seom', 'island'], home: [.22, .5], note: 0, max: 2, about: '바다 위로 솟는 산등성이. 밀물이면 발치가 잠긴다', spawn(w, x) {
  const r = w.rand, s0 = sea(w), half = 250 + r() * 90, k1 = .25 + r() * .2, top = [], far = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, e = Math.sin(u * Math.PI), h = e * (120 + 90 * Math.exp(-Math.pow((u - k1) / .16, 2)) + 60 * Math.exp(-Math.pow((u - .7) / .2, 2))) * (.85 + noise(i * .7, x) * .3); top.push([x - half + u * half * 2, s0 - h]); far.push([x - half * 1.5 + u * half * 3 + 70, s0 - h * .6 - 8]); }
  const pines = [4, 7, 10, 15, 18].map(i => ({ p: top[i], s: .8 + r() * .5, seed: r() * 99 | 0 }));
  w.mark(x, s0 - 30, { r: 150, amount: .1 });
  return { z: 10, grow: 2.2, x, y: s0 - 80, top, perch: i => top[5 + (i * 3) % 15],
    draw(w, ink) {
      const s = sea(w); ink.save(); ink.beginPath(); ink.rect(0, 0, w.W, s + 3); ink.clip();                       // the tide covers its foot
      ridge(ink, far, { depth: 150, alpha: .2, rim: .3, seed: 3 }); ridge(ink, top, { depth: 230, alpha: .66, rim: .75, seed: 5 });
      for (const pn of pines) { const [px, py] = pn.p; stroke(ink, [[px, py + 4], [px + 2, py - 22 * pn.s]], { w: 3, taper: [1, .5], seed: pn.seed }); for (let k = 0; k < 5; k++) leaf(ink, px + 2, py - (10 + k * 4) * pn.s, Math.PI * (k % 2) + (hash(pn.seed, k) - .5) * .5 - .15, (16 - k * 2) * pn.s, 3.2, { alpha: .85 }); }
      ink.restore();
      for (let k = 0; k < 5; k++) { const yy = s + 14 + k * 13, hw = (half * .8) * (1 - k * .16); stroke(ink, [[x - hw + hash(k, 3) * 40, yy], [x, yy + 2], [x + hw - hash(k, 5) * 60, yy]], { w: 4, alpha: .16 - k * .025, dry: .65, seed: 20 + k, taper: [.1, .1] }); }   // its reflection
      if (w.env.swell > .6) for (let k = 0; k < 9; k++) { const fx = x - half + k / 8 * half * 2, up = Math.max(0, Math.sin(w.t * 1.6 + k * 1.3)); dot(ink, fx, s - 4 - up * 12 * w.env.swell, 2 + up * 2.5, { alpha: .5 * up, seed: k }); }      // surf at its foot
    } };
} });

world.word('등대', { keys: ['deungdae', 'lighthouse'], home: [.2, .34], note: 1, unique: true, about: '섬이 있으면 그 위에, 없으면 여 위에 선다. 빛줄기가 돈다', spawn(w, x) {
  const isle = w.all('섬').find(t => Math.abs(t.x - x) < 330), s0 = sea(w); let bx = x, by = s0 - 8;
  if (isle) { const p = isle.top.reduce((a, b) => Math.abs(a[0] - x) < Math.abs(b[0] - x) ? a : b); bx = p[0]; by = p[1] + 6; }
  const Ht = 132;
  return { z: 12, grow: 1.8, x: bx, y: by - Ht - 14, onIsle: !!isle,
    draw(w, ink, light) {
      const dark = w.dark, th = w.t * .85, c = Math.cos(th), lx = bx, ly = by - Ht - 14;
      if (!isle) { wash(ink, bx, by + 8, 70, 22, { alpha: .6, seed: 4 }); stroke(ink, [[bx - 56, by + 10], [bx - 20, by - 4], [bx + 24, by - 2], [bx + 60, by + 10]], { w: 9, alpha: .8, dry: .4, seed: 6 }); }
      ink.fillStyle = '#e9e3d2'; ink.beginPath(); ink.moveTo(bx - 17, by); ink.lineTo(bx - 11, by - Ht); ink.lineTo(bx + 11, by - Ht); ink.lineTo(bx + 17, by); ink.fill();
      ink.fillStyle = rgba(INK.red, .8); ink.beginPath(); ink.moveTo(bx - 15, by - Ht * .38); ink.lineTo(bx - 13, by - Ht * .68); ink.lineTo(bx + 13, by - Ht * .68); ink.lineTo(bx + 15, by - Ht * .38); ink.fill();
      for (const s of [-1, 1]) stroke(ink, [[bx + s * 17, by], [bx + s * 11, by - Ht]], { w: 4, alpha: .9, dry: .2, seed: 8 + s, taper: [1, .7] });
      stroke(ink, [[bx - 15, by - Ht], [bx + 15, by - Ht]], { w: 4.5, alpha: .9 }); stroke(ink, [[bx - 9, by - Ht], [bx - 9, by - Ht - 22], [bx + 9, by - Ht - 22], [bx + 9, by - Ht]], { w: 3, alpha: .85, taper: [1, 1] });
      leaf(ink, bx - 14, by - Ht - 22, -.5, 17, 4, {}); leaf(ink, bx + 14, by - Ht - 22, Math.PI + .5, 17, 4, {});
      glow(light, lx, ly, 22 + 30 * dark, { color: '#ffe9a8', alpha: .5 + .5 * dark });
      if (Math.abs(c) > .1) {                                                                                       // the beam, swinging round: seen from the side it reaches out, shortens, and comes back the other way
        const a0 = (.07 + .5 * dark + .4 * w.env.fog) * Math.pow(Math.abs(c), .5), L = 900 * Math.abs(c), sgn = Math.sign(c), ex = lx + sgn * L, ey = ly + L * .13, sp = 50 + L * .13;
        const g = light.createLinearGradient(lx, ly, ex, ey); g.addColorStop(0, rgba('#ffe9a8', a0)); g.addColorStop(1, rgba('#ffe9a8', 0));
        light.fillStyle = g; light.beginPath(); light.moveTo(lx, ly - 4); light.lineTo(ex, ey - sp); light.lineTo(ex, ey + sp); light.lineTo(lx, ly + 4); light.fill();
      }
    } };
} });

function shimmer(w, layer, x, color, alpha) {                                 // a light's road on the water
  const s = sea(w); layer.fillStyle = rgba(color, alpha);
  for (let k = 0; k < 9; k++) { const hw = (26 + k * 9) * (.6 + .4 * Math.sin(w.t * 1.7 + k * 1.9)), yy = s + 12 + k * 15 + wave(w, x + k * 40) * .5; layer.beginPath(); layer.ellipse(x + Math.sin(w.t * .9 + k) * 6, yy, hw, 2.6, 0, 0, TAU); layer.fill(); }
}
world.word('해', { keys: ['hae', 'sun'], home: [.82, .2], note: 2, pigment: 1, unique: true, about: '붉은 해. 밤에 쓰면 날이 밝고 안개가 걷힌다', spawn(w, x, y) {
  y = Math.min(y, sea(w) - 90); w.mark(x, y, { r: 150, amount: .22, pigment: 1 });
  return { z: 3, grow: 2, x, y, tags: ['sky-light'],
    draw(w, ink, light) { wash(ink, x, y, 150, 150, { color: INK.red, alpha: .22, seed: 2 }); dot(ink, x, y, 56, { color: INK.red, alpha: .9, seed: 5 }); glow(light, x, y, 300, { color: '#ffd9a0', alpha: .2 * (1 - w.dark) }); shimmer(w, ink, x, INK.red, .32); } };
} });
world.word('달', { keys: ['dal', 'moon'], home: [.8, .18], note: 3, unique: true, about: '달이 뜨면 물이 든다 (밀물)', spawn(w, x, y) {
  y = Math.min(y, sea(w) - 110);
  return { z: 3, grow: 2.2, x, y, tags: ['sky-light'],
    draw(w, ink, light) {
      const g = ink.createRadialGradient(x, y, 44, x, y, 190); g.addColorStop(0, rgba(INK.black, 0)); g.addColorStop(.12, rgba(INK.black, .3)); g.addColorStop(1, rgba(INK.black, 0)); ink.fillStyle = g; ink.beginPath(); ink.arc(x, y, 190, 0, TAU); ink.fill();   // a halo of thin ink, the disc left as paper
      light.fillStyle = rgba('#fffbe6', .92); light.beginPath(); light.arc(x, y, 47, 0, TAU); light.fill(); glow(light, x, y, 230, { color: '#fff6d2', alpha: .12 + .3 * w.dark });
      shimmer(w, light, x, '#fff6d2', .1 + .32 * w.dark);
    } };
} });

world.word('파도', { keys: ['pado', 'wave'], home: [.5, .62], note: 4, pigment: 2, about: '물금을 따라 이는 물결. 다시 쓰면 높아진다 (세 번까지)', spawn(w, x) {
  const old = w.first('파도'); if (old) { w.env.level = Math.min(3, w.env.level + 1); return null; }
  w.env.level = 1; w.cue('sea', { on: true });
  return { z: 14, grow: 2.5, fade: 3, x, y: sea(w),
    update(w, dt) { this.y = sea(w); if (w.frame % 6 === 0) { const px = w.rand() * w.W; w.push(px, this.y + 14, (w.wind.x * .4 + Math.sin(w.t * .5) * 70) * (.5 + w.env.swell), Math.cos(px * .01 + w.t) * 40 * w.env.swell, 100); } },
    leave(w) { w.cue('sea', { on: false }); }, gone(w) { w.env.level = 0; },
    draw(w, ink) {
      const s = sea(w), g = ink.createLinearGradient(0, s, 0, s + 260); g.addColorStop(0, rgba(INK.blue, .13)); g.addColorStop(1, rgba(INK.blue, 0)); ink.fillStyle = g; ink.fillRect(0, s + 4, w.W, 260);   // the body of the water, a thin indigo wash
      for (let k = 0; k < 4; k++) { const pts = [], amp = (.8 + w.env.swell) * (1 - k * .2);
        for (let px = -40; px <= w.W + 40; px += 24) pts.push([px, s + 5 + k * 27 + amp * (Math.sin(px * .011 - w.t * (1.5 - k * .2) + k * 1.7) * 9 + Math.sin(px * .023 + w.t * 1.1 + k) * 4)]);
        stroke(ink, pts, { w: 10 - k * 2, color: k ? INK.blue : INK.black, alpha: .62 - k * .12, dry: .5 + k * .1, seed: 4 + k, taper: [.2, .2] }); }
    } };
} });

world.word('고래', { keys: ['gorae', 'whale'], home: [.28, .82], note: 5, max: 2, about: '물 아래를 돌다 숨 쉬러 올라와 물을 뿜는다. 붓을 따라온다', spawn(w, x, y) {
  const r = w.rand, s = sea(w); y = Math.max(y, s + 150);
  const c = new life.Chain(x, y, r() < .5 ? 0 : Math.PI, Object.assign({ kind: '고래' }, WHALE)); c.sideView = true; c.zoneGrad = () => [0, 1];
  const spray = new life.Drift(80);
  return { tags: ['whale'], z: 22, grow: 2, chain: c, seed: r() * 99 | 0, goal: [x, y], next: 0, breath: 6 + r() * 3, mode: 'cruise', modeT: 0, lunge: 0, sing: 4, x, y,
    update(w, dt) {
      const s = sea(w), p = w.ptr; this.next -= dt; this.breath -= dt; this.modeT += dt; this.lunge -= dt; this.sing -= dt; let speed = 74, turn = .85;
      if (this.next <= 0) { this.next = 4 + r() * 4; this.goal = [clamp(c.x + (r() - .5) * 1100, 240, w.W - 240), s + 130 + r() * Math.max(40, w.H - s - 330)]; }
      let [gx, gy] = this.goal;
      if (this.mode === 'cruise') {
        const school = w.first('멸치');
        if (this.lunge > 0 && school) { [gx, gy] = school.flock.centre(); speed = 150; turn = 1.1; }                 // through the school
        else if (p.seen && p.y > s + 60 && Math.hypot(p.x - c.x, p.y - c.y) < 560 && Math.hypot(p.x - c.x, p.y - c.y) > 120) { gx = p.x; gy = p.y; speed = 100; }   // it follows the brush
        if (this.breath <= 0) { this.mode = 'rise'; this.modeT = 0; }
      } else if (this.mode === 'rise') {
        gx = c.x + Math.cos(c.h) * 320; gy = s + 20; speed = 110; turn = 1.1;
        if (c.y < s + 62 || this.modeT > 7) { this.mode = 'dive'; this.modeT = 0; this.breath = 11 + r() * 5; w.env.spouts = (w.env.spouts || 0) + 1;      // the blow
          for (let i = 0; i < 34; i++) spray.spawn(c.x + (r() - .5) * 14, s - 6, (r() - .5) * 230, -330 - r() * 330, 1.5 + r() * .5, 1.5 + r() * 2.5);
          w.ink(c.x, s - 30, { r: 34, amount: .5 }); w.push(c.x, s - 20, 0, -700, 60); w.cue('spout', { x: c.x }); }
      } else { gx = c.x + Math.cos(c.h) * 360; gy = Math.min(s + 400, w.H - 200); speed = 96; if (this.modeT > 2.6) { this.mode = 'cruise'; this.next = 0; } }
      gx = clamp(gx, 230, w.W - 230); gy = clamp(gy, s + (this.mode === 'rise' ? 20 : 96), w.H - 170);                // goals stay on the sheet and in the water
      c.swim(w, dt, gx, gy, { speed, turn, flow: .25, wiggle: 2.1, zone: (zx, zy) => zy > sea(w) + (this.mode === 'rise' ? 4 : 34) });
      this.x = c.x; this.y = c.y;
      if (w.frame % 4 === 0) { const t = c.frame(1), beat = Math.sin(w.t * 2.2 + this.seed); w.push(t.x, t.y, -c.vx * .6 + t.bx * beat * 180, -c.vy * .6 + t.by * beat * 180, 80); w.push(c.x, c.y, c.vx * .5, c.vy * .5, 70); }
      if (this.sing <= 0) { this.sing = 13 + r() * 8; w.cue('whale', { x: c.x }); }
      spray.update(w, dt, { gravity: 620, wind: .6, floor: q => q.vy > 0 && q.y > sea(w) });
    },
    draw(w, ink) { drawWhale(ink, c, w.t, this); spray.each((q, k) => dot(ink, q.x, q.y, q.size * (.6 + k * .6), { alpha: .6 * k + .15, seed: q.size * 9 | 0 })); } };
} });

world.word('멸치', { keys: ['myeolchi', 'anchovy'], home: [.48, .8], note: 6, max: 2, about: '서른 마리 떼. 고래와 붓질을 피하고 밤에는 불빛에 모인다', spawn(w, x, y) {
  y = clamp(y, sea(w) + 90, w.H - 230); const home = [x, y];
  const flock = new life.Flock(w, x, y, { n: 30, speed: 104, turn: 3.6, sep: 21, view: 115, flow: .7, spread: 150, kind: '멸치', range: 210, home: () => home,
    bottom: 150,
    zone: (zx, zy, w) => zy > sea(w) + 24, zoneGrad: () => [0, 1], element: (zx, zy, w) => zy > sea(w) - 2 });
  return { tags: ['flock', 'school'], z: 18, grow: 1.6, flock, x, y,
    update(w, dt) {
      const p = w.ptr, boat = w.first('배'); home[1] = Math.max(home[1], sea(w) + 90);
      for (const wh of w.all('고래')) flock.flee.push([wh.chain.x + Math.cos(wh.chain.h) * 40, wh.chain.y + Math.sin(wh.chain.h) * 40, 250, 3.2]);
      if (p.seen && p.down) flock.flee.push([p.x, p.y, 190, 2.6]);
      if (w.dark > .5 && boat) flock.seek = [boat.x + boat.face * 60, sea(w) + 95, 1];                               // to the lantern
      flock.update(w, dt); [this.x, this.y] = flock.centre();
      for (const a of flock.a) a.y = Math.max(a.y, sea(w) + 7);                                                       // the surface is a wall to a fish
    },
    draw(w, ink, light) { for (const a of flock.a) { drawFish(ink, a, w.t); if (a.scare > .25) glow(light, a.x, a.y, 11, { color: '#f4f7ff', alpha: Math.min(.7, a.scare) }); } } };
} });

world.word('갈매기', { keys: ['galmaegi', 'gull'], home: [.66, .3], note: 7, max: 2, about: '일곱 마리. 배를 따르고, 멸치 떼로 내리꽂히고, 밤에는 섬에 앉는다', spawn(w, x, y) {
  y = Math.min(y, sea(w) - 150); const r = w.rand, home = [x, y], rings = [];
  const flock = new life.Flock(w, x, y, { n: 7, speed: 122, turn: 2.3, sep: 64, view: 280, flow: .12, spread: 240, kind: '갈매기', range: 230, wander: 1.1, home: () => home,
    zone: (zx, zy, w, a) => a.dive ? true : zy < sea(w) - 44 && zy > 36, zoneGrad: (zx, zy, w) => [0, zy > sea(w) - 44 ? -1 : 1] });
  return { tags: ['flock', 'birds'], z: 40, grow: 1.6, flock, x, y, diveT: 3 + r() * 2, cry: 2,
    update(w, dt) {
      const s = sea(w), boat = w.first('배'), school = w.first('멸치'), isle = w.first('섬'), low = w.has('rain');
      const tx = boat ? boat.x - boat.face * 40 : x, ty = boat ? s - (low ? 120 : 230) : Math.min(y, s - (low ? 110 : 150)); home[0] = lerp(home[0], tx, dt * .8); home[1] = lerp(home[1], ty, dt * .8);
      const roost = w.dark > .6 && isle;
      flock.a.forEach((a, i) => {
        a.glide = Math.abs(w.wind.x) > 120;
        if (roost) { const p = isle.perch(i); if (!a.rest) { a.goal = [p[0], p[1] - 9, 2.6]; if (Math.hypot(a.x - p[0], a.y - p[1] + 9) < 16) { a.rest = true; a.x = p[0]; a.y = p[1] - 9; a.h = i % 2 ? Math.PI : 0; } } }
        else if (a.rest || (a.goal && !a.dive)) { a.rest = false; a.goal = null; a.h = -Math.PI / 2 + (i % 2 ? -.5 : .5); }
        if (a.dive) { a.goal = [a.dive[0], s - 6, 3.4]; a.scare = Math.max(a.scare, .5); a.fx = a.x; a.fy = a.y - 200;
          if (a.y > s - 20) { rings.push({ x: a.x, age: 0 }); w.push(a.x, s + 10, 0, 300, 50); w.ink(a.x, s + 8, { r: 16, amount: .22 }); w.cue('splash', { x: a.x }); if (school) school.flock.startle(a.x, s + 60, 260, 1.4); a.dive = null; a.goal = null; a.scare = 1; a.fx = a.x; a.fy = s + 200; } }
      });
      this.diveT -= dt;
      if (school && !roost && this.diveT <= 0) { this.diveT = 4.5 + r() * 4; const a = flock.a[Math.floor(r() * flock.a.length)], c = school.flock.centre(); if (!a.dive && Math.abs(c[0] - a.x) < 700) a.dive = [c[0] + (r() - .5) * 120]; }
      this.cry -= dt; if (this.cry <= 0 && !roost) { this.cry = 5 + r() * 7; w.cue('gull', { x: home[0] }); }
      flock.update(w, dt); [this.x, this.y] = flock.centre();
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].age += dt; if (rings[i].age > 1.2) rings.splice(i, 1); }
    },
    draw(w, ink) { for (const a of flock.a) drawGull(ink, a, w.t); const s = sea(w); for (const g of rings) { const k = g.age / 1.2; ink.strokeStyle = rgba(INK.black, .45 * (1 - k)); ink.lineWidth = 2; ink.beginPath(); ink.ellipse(g.x, s + 4, 10 + k * 46, 3 + k * 9, 0, 0, TAU); ink.stroke(); } } };
} });

world.word('해파리', { keys: ['haepari', 'jelly'], home: [.76, .84], note: 8, pigment: 2, max: 2, about: '다섯 마리. 물결에 실려 다니고 밤에는 빛난다. 달이 뜨면 떠오른다', spawn(w, x, y) {
  const r = w.rand; y = Math.max(y, sea(w) + 120);
  const J = Array.from({ length: 5 }, (_, i) => { const jx = x + (r() - .5) * 320, jy = y + (r() - .5) * 180, rr = 26 + r() * 16;
    return { i, x: jx, y: jy, h: -Math.PI / 2 + (r() - .5), vx: 0, vy: 0, r: rr, ph: r(), k: .8 + r() * .5, out: 0, tendrils: Array.from({ length: 5 }, (_, k) => new life.Tendril(jx, jy, { n: 6, len: rr * .42, rest: Math.PI / 2, stiff: .16, flow: 1, seed: i * 7 + k })) }; });
  return { tags: ['jelly'], z: 16, grow: 2, x, y, J, f: [0, 0],
    update(w, dt) {
      const s = sea(w), moon = w.first('달');
      for (const j of J) {
        let want = -Math.PI / 2 + Math.sin(w.t * .23 * j.k + j.ph * 9) * 1.1;                                         // mostly upward, wandering
        if (moon) want = Math.atan2(s + 80 + j.i * 26 - j.y, moon.x + (j.i - 2) * 120 - j.x); if (j.y < s + 80) want = Math.atan2(.5, Math.cos(want) || 1); if (j.y > w.H - 90) want = -Math.PI / 2;
        if (j.x < 90) want = -.6; if (j.x > w.W - 90) want = Math.PI + .6;
        j.h = life.turnTo(j.h, want, .7, dt);
        const p = ((w.t * .8 * j.k + j.ph) % 1 + 1) % 1; if (p < .3) { j.vx += Math.cos(j.h) * 210 * dt; j.vy += Math.sin(j.h) * 210 * dt; }   // each squeeze pushes it bell-first
        j.vx *= Math.exp(-1.5 * dt); j.vy = j.vy * Math.exp(-1.5 * dt) + 9 * dt;
        w.flow(j.x, j.y, this.f); j.x = clamp(j.x + (j.vx + this.f[0]) * dt, 30, w.W - 30); j.y = clamp(j.y + (j.vy + this.f[1]) * dt, s + 34, w.H - 30);
        j.out = j.y <= s + 35 ? j.out + dt : 0;
        j.tendrils.forEach((t, k) => { const u = (k - 2) / 2.4 * j.r, ax = j.h + Math.PI / 2; t.update(w, dt, j.x + Math.cos(ax) * u, j.y + Math.sin(ax) * u, j.h + Math.PI); });
        life.report(w, '해파리', { h: j.h, vx: j.vx, vy: j.vy, minSpeed: 34, slip: 1.2, inZone: j.out < 4 });
      }
      this.x = J[0].x; this.y = J[0].y;
    },
    draw(w, ink, light) { for (const j of J) drawJelly(ink, j, w.t, light, w.dark); } };
} });

world.word('배', { keys: ['bae', 'boat'], home: [.62, .55], note: 9, unique: true, about: '황포돛배. 바람을 받아 가고 물결에 흔들리며 밤에는 뱃머리에 불을 단다', spawn(w, x) {
  return { tags: ['boat'], z: 26, grow: 1.6, x, y: sea(w), dir: x < w.W / 2 ? 1 : -1, face: x < w.W / 2 ? 1 : -1, fill: .1, tilt: 0, vx: 0,
    update(w, dt) {
      const wx = w.wind.x; if (Math.abs(wx) > 50) this.dir = Math.sign(wx);
      if (this.x < 150) this.dir = Math.abs(wx) > 50 && wx < 0 ? this.dir : 1; if (this.x > w.W - 150) this.dir = Math.abs(wx) > 50 && wx > 0 ? this.dir : -1;
      this.face += clamp(this.dir - this.face, -1.6 * dt, 1.6 * dt);
      const turning = Math.abs(this.face) < .92; this.vx = turning ? 0 : this.dir * (13 + Math.abs(wx) * .17);
      this.x = clamp(this.x + this.vx * dt, 110, w.W - 110); this.y = sea(w) + wave(w, this.x) - 3;
      this.tilt = lerp(this.tilt, Math.atan2(wave(w, this.x + 40) - wave(w, this.x - 40), 80) * 1.6 + (w.env.storm > 0 ? Math.sin(w.t * 5) * .1 : 0), dt * 5);
      this.fill = lerp(this.fill, clamp(Math.abs(wx) / 380 + .08), dt * 1.5);
      if (w.frame % 6 === 0 && !turning) { w.push(this.x - this.dir * 70, this.y + 10, -this.vx * 2.2, 30, 46); if (Math.abs(this.vx) > 30) w.ink(this.x - this.dir * 74, this.y + 9, { r: 9, amount: .07 }); }
      if (!turning) life.report(w, '배', { h: this.dir > 0 ? 0 : Math.PI, vx: this.vx, vy: 0, minSpeed: 6 });
    },
    draw(w, ink, light) {
      ink.save(); ink.translate(this.x, this.y); ink.rotate(this.tilt); ink.scale(this.face || .01, 1); drawBoat(ink, w.t, { fill: this.fill, flag: w.wind.x * this.dir > 60 ? 1 : -1 }); ink.restore();
      if (w.dark > .15) { const lx = this.x + this.face * 64, ly = this.y - 33; glow(light, lx, ly, 120, { color: '#ffd98a', alpha: .75 * w.dark }); shimmer(w, light, lx, '#ffd98a', .2 * w.dark); }
    } };
} });

world.word('바람', { keys: ['baram', 'wind'], home: [.1, .26], note: 10, about: '쓴 쪽에서 반대쪽으로 분다. 돛이 부풀고 물결이 서고 안개가 밀린다', spawn: (w, x, y) => things.wind(w, x, y, { seconds: 13, speed: 400, band: [.06, .62] }) });
world.word('비', { keys: ['bi', 'rain'], home: [.5, .14], note: 11, about: '바다 위에 떨어져 동그라미를 남기고 먹을 씻는다', spawn: (w, x, y) => things.rain(w, x, y, { seconds: 15, wash: .1, floor: (px, w) => sea(w) + wave(w, px) + w.rand() * 30 }) });

world.word('안개', { keys: ['angae', 'fog'], home: [.5, .5], note: 12, unique: true, about: '물금을 덮는 흰 기운. 해가 나거나 바람이 불면 걷힌다', spawn(w, x) {
  const r = w.rand, B = Array.from({ length: 11 }, (_, i) => ({ x: (i + r()) / 11 * (w.W + 400) - 200, dy: -150 + r() * 250, r: 210 + r() * 170, sp: (5 + r() * 9) * (i % 2 ? 1 : -1) }));
  w.quiet = true;
  return { tags: ['fog', 'weather'], z: 50, grow: 4, fade: 5, x, y: sea(w), blow: 0,
    update(w, dt) { for (const b of B) { b.x += (b.sp + w.wind.x * .3 + this.blow * 160) * dt; if (this.leaving == null) { if (b.x > w.W + 380) b.x = -360; if (b.x < -380) b.x = w.W + 360; } } },
    leave(w) { w.quiet = false; },
    draw(w, ink, light) { const s = sea(w); for (const b of B) { light.save(); light.translate(b.x, s + b.dy); light.scale(1, .42); glow(light, 0, 0, b.r, { color: '#f4f0e4', alpha: .56, core: .5 }); light.restore(); } } };
} });

world.word('번개', { keys: ['beongae', 'lightning'], home: [.55, .2], note: 13, about: '한 번 친다. 온 바다가 놀라고 물결이 일어선다', spawn(w, x) {
  const r = w.rand, s = sea(w), main = [[x + (r() - .5) * 200, -10]]; while (main[main.length - 1][1] < s - 10) { const p = main[main.length - 1]; main.push([p[0] + (r() - .5) * 110 + (x - p[0]) * .16, Math.min(s, p[1] + 50 + r() * 70)]); }
  const forks = [2, 4].filter(i => i < main.length - 1).map(i => { const f = [main[i]], d = r.sign(); for (let k = 0; k < 3; k++) f.push([f[k][0] + d * (40 + r() * 50), f[k][1] + 34 + r() * 40]); return f; });
  const hit = main[main.length - 1];
  w.flash(1); w.env.storm = 9; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; w.push(hit[0] + Math.cos(a) * 30, hit[1] + Math.sin(a) * 30, Math.cos(a) * 900, Math.sin(a) * 900, 90); }
  w.ink(hit[0], hit[1] + 6, { r: 40, amount: .6 }); w.mark(hit[0], hit[1] - 14, { r: 26, amount: .22 });
  for (const t of w.things) { if (t.flock) t.flock.startle(hit[0], hit[1], 1400, 1.6); if (t.chain && t.mode) { t.mode = 'dive'; t.modeT = 0; } }
  return { tags: ['bolt'], z: 80, grow: .01, fade: .2, x: hit[0], y: hit[1], boomed: false,
    update(w) { if (this.age > .2 && !this.again) { this.again = true; w.flash(.7); } if (this.age > .38 && !this.boomed) { this.boomed = true; w.cue('thunder', { x: hit[0] }); } if (this.age > 1.3) w.dismiss(this); },
    draw(w, ink, light) {
      const a = this.age, on = a < .13 || (a > .2 && a < .36) ? 1 : clamp(1 - (a - .36) / .7) * .5; if (on <= 0) return;
      stroke(ink, main, { w: 9, alpha: on * .95, dry: .15, seed: 3, taper: [.6, .9] }); for (const f of forks) stroke(ink, f, { w: 5, alpha: on * .8, dry: .3, seed: 6, taper: [1, .1] });
      light.strokeStyle = rgba('#f2f6ff', on); light.lineJoin = 'round'; for (const [pts, lw] of [[main, 5], ...forks.map(f => [f, 2.5])]) { light.lineWidth = lw; light.beginPath(); pts.forEach((p, i) => i ? light.lineTo(p[0], p[1]) : light.moveTo(p[0], p[1])); light.stroke(); }
      glow(light, hit[0], hit[1], 200, { color: '#e8f0ff', alpha: on * .6 });
    } };
} });

world.word('밤', { keys: ['bam', 'night'], home: [.5, .3], note: 14, about: '종이가 뒤집힌다. 등불이 켜지고 해파리가 빛나고 갈매기는 섬에 든다', spawn: (w, x, y) => things.night(w, x, y) });
world.word('낮', { keys: ['nat', 'day'], home: [.5, .3], note: 15, about: '다시 낮', spawn: (w, x, y) => things.day(w, x, y) });
world.word('비움', { keys: ['bium', 'clear'], home: [.5, .5], note: 16, about: '물이 한 번 지나가고 빈 종이로 돌아간다', spawn: w => things.clear(w) });

// ── 4 rules ──────────────────────────────────────────────────────────────────────────────────────────────────────
world.rule({ id: 'tide', when: ['달'], line: '달이 차니 물이 든다' });
world.rule({ id: 'sunrise', when: ['해', '밤'], line: '해가 뜨니 밤이 물러난다', then: w => { const s = w.first('해'); things.day(w, s.x, s.y); } });
world.rule({ id: 'sun-fog', when: ['해', '안개'], line: '해가 나니 안개가 걷힌다', then: w => w.dismiss(w.first('안개')) });
world.rule({ id: 'wind-fog', when: ['바람', '안개'], line: '바람이 안개를 민다', then: w => { const f = w.first('안개'); f.blow = Math.sign(w.first('wind').dir); w.dismiss(f); } });
world.rule({ id: 'wind-boat', when: ['바람', '배'], line: '바람을 받아 돛이 부푼다' });
world.rule({ id: 'wind-wave', when: ['바람', '파도'], line: '바람 따라 물결이 선다' });
world.rule({ id: 'isle-wave', when: w => w.has('섬') && w.has('파도') && w.env.swell > .6, needs: ['섬', '파도', '파도'], line: '섬 발치에 물결이 부서진다' });
world.rule({ id: 'gull-fish', when: ['갈매기', '멸치'], line: '갈매기가 멸치 떼로 내리꽂힌다', then: w => { for (const g of w.all('갈매기')) g.diveT = Math.min(g.diveT, 1.2); } });
world.rule({ id: 'gull-boat', when: ['갈매기', '배'], line: '갈매기가 배를 따른다' });
world.rule({ id: 'whale-fish', when: ['고래', '멸치'], line: '고래가 지나면 떼가 갈라진다', again: 12, then: w => { for (const wh of w.all('고래')) wh.lunge = 4; } });
world.rule({ id: 'spout', when: w => (w.env.spouts || 0) > 0, needs: ['고래'], line: '고래가 숨을 뿜는다' });
world.rule({ id: 'moon-jelly', when: ['달', '해파리'], line: '달빛 따라 해파리가 뜬다' });
world.rule({ id: 'night-light', when: ['밤', '등대'], line: '등대가 밤바다를 쓴다' });
world.rule({ id: 'fog-light', when: ['안개', '등대'], line: '안개 속에 등대만 보인다' });
world.rule({ id: 'lantern', when: ['밤', '배', '멸치'], line: '불 밝힌 배 아래 멸치가 모인다' });
world.rule({ id: 'roost', when: ['밤', '갈매기', '섬'], line: '밤이면 갈매기는 섬에 든다' });
world.rule({ id: 'rain-gull', when: ['비', '갈매기'], line: '비가 오면 갈매기는 낮게 난다' });
world.rule({ id: 'storm', when: ['번개'], line: '번개에 온 바다가 놀란다' });
world.rule({ id: 'dawn', when: ['낮'], line: '물빛이 돌아온다' });

// ── 5 the performance ────────────────────────────────────────────────────────────────────────────────────────────
world.perform([
  ['섬', .22, .5], ['파도', .52, .63], ['배', .6, .55], ['갈매기', .68, .28], ['멸치', .46, .8, { wait: 2.6 }],
  ['stir', [[.36, .74], [.5, .9], [.64, .78], [.52, .7]], 2.6, { ink: false }],
  ['고래', .24, .84, { wait: 6 }],
  ['안개', .5, .5, { wait: 3 }], ['등대', .19, .3, { wait: 3.2 }],
  ['바람', .08, .24, { wait: 5.5 }],
  ['밤', .5, .26, { wait: 5 }],
  ['달', .82, .17, { wait: 3 }], ['해파리', .78, .86, { wait: 3 }],
  ['stir', [[.7, .8], [.84, .9], [.9, .76], [.78, .7]], 2.4, { pigment: 2 }],
  ['비', .46, .12, { wait: 3.5 }], ['번개', .42, .2, { wait: 4.5 }],
  ['해', .84, .34, { wait: 6 }],
  ['비움', .5, .5, { wait: 2 }]
]);
