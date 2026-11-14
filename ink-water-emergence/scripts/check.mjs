// ink-water-emergence · check.mjs — the automatic checks. Prints `ok` and the shot table, or every problem found.
//   node <skill>/scripts/check.mjs film.html            (a project folder works too: its index.html)
// Checks: the page loads with no errors or 404s · every shot draws (no blank or flat frames) · the creature is on screen
// once it has condensed (e ≥ .5) · every frame is a pure function of t (same t → same pixels, in any order) · the body
// passes checkPose on EVERY frame (joints inside LIM, planted paws on the ground and not sliding, head leading the way)
// · the film's own checks · score.js (next to the page) renders without NaN · cast.html (next to the page), if present,
// reports no out-of-range joints.
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { args, openFilm, pageOf } from './_lib.mjs';

const { a } = args(process.argv);
const target = a.find(x => !x.startsWith('--'));
if (!target) { console.error('usage: check.mjs <film.html | project dir>'); process.exit(1); }
const page$ = resolve(pageOf(target)), dir = dirname(page$), problems = [];
const f = await openFilm(page$, 'render=1&scale=.25');
const { page } = f;
const info = await page.evaluate(() => ({ D: window.DURATION, FPS: window.FPS, shots: window.film.shots.map(s => ({ name: s.name, t0: s.t0, t1: s.t1 })) }));
// pixels: mean/std of luminance, coverage of the form inside the screen, and a hash
const probe = (t) => page.evaluate((t) => {
  const fr = window.seek(t), c = document.querySelector('canvas'), g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0); const d = x.getImageData(0, 0, g.width, g.height).data;
  let s = 0, s2 = 0, h = 2166136261; for (let i = 0; i < d.length; i += 4) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += l; s2 += l * l; h = Math.imul(h ^ d[i] ^ (d[i + 1] << 8), 16777619); }
  const n = d.length / 4, fm = window.film.form, M = .12, fx = fm.getContext('2d').getImageData(Math.round(fm.width * M / (1 + 2 * M)), Math.round(fm.height * M / (1 + 2 * M)), Math.round(fm.width / (1 + 2 * M)), Math.round(fm.height / (1 + 2 * M))).data;
  let cov = 0; for (let i = 1; i < fx.length; i += 16) if (fx[i] > 128) cov++;
  return { mean: s / n, std: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), cov: cov / (fx.length / 16), hash: h >>> 0, e: Math.max(0, ...fr.creatures.map(c => c.e)) };
}, t);
for (const s of info.shots) {
  for (const k of [.1, .5, .9]) {
    const t = +(s.t0 + (s.t1 - s.t0) * k).toFixed(3), p = await probe(t);
    if (p.std < 1.2 && p.e > .05) problems.push(`${s.name} @${t}s: flat frame (std ${p.std.toFixed(2)})`);
    if (p.mean < 40) problems.push(`${s.name} @${t}s: frame almost black (mean ${p.mean.toFixed(0)}) — the ground should stay paper-light`);
    if (p.e >= .5 && p.cov < .01) problems.push(`${s.name} @${t}s: the creature is off screen (coverage ${(p.cov * 100).toFixed(1)}%) — aim the camera with on: 'name.head|body|paws'`);
  }
}
// determinism: the same t gives the same pixels, whatever was drawn before
for (const t of [info.D * .23, info.D * .61, info.D * .87].map(x => +x.toFixed(3))) {
  const a1 = (await probe(t)).hash; await probe(+(info.D * .05).toFixed(3)); const a2 = (await probe(t)).hash;
  if (a1 !== a2) problems.push(`not deterministic at ${t}s (a frame depends on what was drawn before it, or on Math.random/Date)`);
}
// the body, on every frame
const body = await page.evaluate(() => { const out = new Map(), n = Math.round(window.DURATION * window.FPS); for (let i = 0; i < n; i++) for (const e of window.runChecks(i / window.FPS)) { const k = e.replace(/-?\d+(\.\d+)?/g, '#'); if (!out.has(k)) out.set(k, { first: (i / window.FPS).toFixed(2), msg: e, n: 0 }); out.get(k).n++; } return [...out.values()]; });
for (const b of body) problems.push(`body: ${b.msg} (first at ${b.first}s, ${b.n} frames)`);
problems.push(...f.errors.map(e => 'console: ' + e), ...f.misses.map(m => '404: ' + m));
await f.close();
// the score
const score$ = join(dir, 'score.js');
if (existsSync(score$)) {
  try {
    const spec = (await import(pathToFileURL(score$).href)).SCORE;
    const local = join(dir, 'lib', 'score.js'), lib$ = existsSync(local) ? local : join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js');
    const { renderScore } = await import(pathToFileURL(lib$).href);
    const [L] = renderScore(spec, 8000, info.D);
    if (L.some(v => !Number.isFinite(v))) problems.push('score: NaN in the output');
    let pk = 0; for (const v of L) pk = Math.max(pk, Math.abs(v)); if (pk < .05) problems.push('score: silent');
  } catch (e) { problems.push('score: ' + e.message); }
}
// the cast sheet
const cast$ = join(dir, 'cast.html');
if (existsSync(cast$)) {
  const c = await openFilm(cast$, '');
  const cp = await c.page.evaluate(() => window.castProblems || []);
  problems.push(...cp.map(p => 'cast: ' + p), ...c.errors.map(e => 'cast console: ' + e));
  await c.close();
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('ok');
console.log(`DURATION ${info.D} s @ ${info.FPS} fps · shots: ` + info.shots.map(s => `${s.name} ${s.t0.toFixed(1)}`).join(' · '));
