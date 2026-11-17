// sprite-stack-short · check.mjs — proves a short (or a model sheet) before you render it. Prints `ok` lines, numbers, or
// what failed.   node <skill>/scripts/check.mjs index.html [--step .25] [--scale .25]      (sheet.html: the models only)
//  1 loads with no page errors, console errors or failed requests
//  2 every beat draws at every sampled t; no blank frame
//  3 deterministic: the same t gives the same pixels, also after seeking elsewhere
//  4 the models: the four views agree (no view pixel carves to nothing), each view faces the right way (front-only colours
//    at the right end of the side and top views), no empty slice
//  5 the rules at every t: the mover stays on its surface (boat on water, car on road), in frame in world beats; captions fit
//  6 pixels stay pixels: every art pixel is one flat block of the beat's block size (no smoothing), text switched off
//  7 motion, with numbers: turn rate, skid vs the model's drift, acceleration within its mass, body roll that lags the turn
//    (follow-through), the stack breathes (idle) in the explainer beats
//  8 the score renders: no NaN, not silent, peak ≤ 1
//  9 speed: a frame's cost at this scale
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html | sheet.html> [--step .25] [--scale .25]'); process.exit(1); }
const step = +opt('step', .25), scale = opt('scale', '.25');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 180000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m), info = m => console.log('     ' + m);
if (errors.length) fail('loading: ' + errors.join(' | ')); else ok('loads with no errors');

const models = A => { for (const m of A) { for (const p of m.problems) fail(p); for (const n of m.notes) info(n); if (!m.problems.length && m.lost) ok(`${m.name}: views agree (lost pixels — top ${(m.lost.top * 100).toFixed(1)} %, side ${(m.lost.side * 100).toFixed(1)} %, front ${(m.lost.front * 100).toFixed(1)} %, back ${(m.lost.back * 100).toFixed(1)} %)`); } };

// a model sheet: the models only
if (await page.evaluate(() => !!(window.film && window.film.sheet))) {
  models(await page.evaluate(() => window.auditAll()));
  await browser.close(); console.log(bad ? `${bad} problem(s)` : 'ok'); process.exit(bad ? 1 : 0);
}

const pix = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 2) n++; return n; };
const DUR = await page.evaluate(() => window.DURATION);
const beats = await page.evaluate(() => window.film.beats.map(b => ({ i: b.i, kind: b.kind, start: b.start, dur: b.dur, caption: b.caption || '' })));
info(`${beats.length} beats, ${DUR} s: ` + beats.map(b => `${b.kind} ${b.dur}`).join(' · '));
const kinds = new Set(beats.map(b => b.kind));
for (const k of ['views', 'slices', 'stack', 'world']) if (!kinds.has(k)) fail(`no "${k}" beat — the form is: draw the views, slice, stack and turn, then the world`);

// 2, 5: draws, blanks, rules
const thrown = new Map(), blank = [], broken = new Map();
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    let rules; try { rules = window.runChecks(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let mn = 765, mx = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    return { range: mx - mn, rules, shot: window.shotAt(t).name };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.range < 12) blank.push(`${t.toFixed(2)} (${r.shot})`);
  for (const n of r.rules) { const key = n.replace(/\(at .*\)/, ''); if (!broken.has(key)) broken.set(key, [+t.toFixed(2), n]); }
}
if (thrown.size) for (const [m, t] of thrown) fail(`a beat throws at t=${t}: ${m}`); else ok(`every beat draws (every ${step} s)`);
if (blank.length) fail(`blank frames at t = ${blank.slice(0, 6).join(', ')}`); else ok('no blank frames');
if (broken.size) for (const [, [t, n]] of broken) fail(`rule "${n}" first broken at t=${t}`); else ok('every rule holds (mover on its surface and in frame, captions fit)');

// 3: determinism
const ts = [DUR * .13, DUR * .41, DUR * .66, DUR * .88].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d) { det = false; fail(`t=${ts[i]} renders differently the second time (${d} values differ) — Math.random, Date or state between frames?`); } }
if (det) ok(`deterministic at t = ${ts.join(', ')}`);

// 4 + 7: models and motion
const A = await page.evaluate(() => window.film.audit());
models(A.models);
if (A.motion) {
  const m = A.motion;
  info(`motion: ${m.len.toFixed(0)} px loop, top speed ${m.maxV.toFixed(1)} of ${m.cruise} px/s · turn ≤ ${m.turnRate.toFixed(0)}°/s · skid ≤ ${m.skid.toFixed(1)}° (drift ${m.drift}°) · accel ≤ ${m.accel.toFixed(1)} px/s² (limit ${m.accelLimit.toFixed(1)}, mass ${m.mass}) · roll ≤ ${m.roll.toFixed(2)} px, peaks ${(m.lag * 1000).toFixed(0)} ms after the turn`);
  if (m.turnRate > 150) fail(`the mover turns ${m.turnRate.toFixed(0)}°/s — a snap, not a turn (≤ 150°/s; widen the curve or lower the speed)`); else ok('turns are turns (no heading snaps)');
  if (m.skid > m.drift + .5) fail(`the mover skids ${m.skid.toFixed(1)}° off its course (drift allowed ${m.drift}°) — wheels must point where they go`); else ok(`heading follows the course within its drift (${m.skid.toFixed(1)}° ≤ ${m.drift}°)`);
  if (m.accel > m.accelLimit * 1.05) fail(`acceleration ${m.accel.toFixed(1)} px/s² exceeds what its mass allows (${m.accelLimit.toFixed(1)})`); else ok('speeds up and slows down within its mass (no instant starts or stops)');
  if (m.roll < .3) fail('no body roll in the turns — weight does not show (raise mover.roll)'); else if (m.lag < .04) fail('the roll does not lag the turn (no follow-through) — lower mover.stiff'); else ok(`the body rolls out of the turns and lags them (${(m.lag * 1000).toFixed(0)} ms)`);
  if (m.maxV < m.cruise * .5) fail(`the mover never gets near its cruise speed (${m.maxV.toFixed(1)} of ${m.cruise}) — the course is too tight or too short`);
}
// idle: the stacked object is never frozen on the stack / turn beats (it breathes, rocks or turns)
for (const b of beats.filter(b => b.kind === 'stack' || b.kind === 'turn')) {
  const a = +(b.start + b.dur * .55).toFixed(2), c = +(b.start + b.dur * .55 + .4).toFixed(2), d = diff(await pix(a), await pix(c));
  if (!d) fail(`the ${b.kind} beat is frozen between t=${a} and ${c} (no idle, no turn)`);
}
ok('the stack moves in every stack / turn beat (turning or breathing)');

// 6: blocks — every art pixel a flat block (labels and captions switched off for this)
const blk = await page.evaluate(DUR => {
  const c = document.querySelector('canvas'), ctx = c.getContext('2d'), out = []; window.film.off.add('labels'); window.film.off.add('captions');
  for (const b of window.film.beats) {
    const t = b.start + b.dur * .5; window.seek(t); const z = window.film.last.z, k = window.PIXEL.block * z; if (k < 2 || k % 1) continue;
    const d = ctx.getImageData(0, 0, c.width, c.height).data, W = c.width; let badPx = 0, n = 0;
    for (let y = 0; y < c.height - k; y += Math.round(k * 3.3)) for (let x = 0; x < W - k; x += Math.round(k * 2.7)) {
      const o = window.film.last.map(0, 0), ox = ((o[0] % k) + k) % k, oy = ((o[1] % k) + k) % k, x0 = x - (((x - ox) % k) + k) % k, y0 = y - (((y - oy) % k) + k) % k; if (x0 + k > W || y0 + k > c.height) continue;
      const i0 = (y0 * W + x0) * 4, i1 = ((y0 + k - 1) * W + x0 + k - 1) * 4; n++;
      if (Math.abs(d[i0] - d[i1]) + Math.abs(d[i0 + 1] - d[i1 + 1]) + Math.abs(d[i0 + 2] - d[i1 + 2]) > 6) badPx++;
    }
    out.push({ kind: b.kind, i: b.i, z, k, bad: n ? badPx / n : 0 });
  }
  window.film.off.delete('labels'); window.film.off.delete('captions');
  return out;
}, DUR);
const smeared = blk.filter(b => b.bad > .04 && b.kind !== 'title');
if (!blk.length) info(`block check skipped at scale ${scale} (needs a block size ≥ 2: use --scale .5)`);
else if (smeared.length) fail(`smoothed pixels in ${smeared.map(b => `${b.kind} #${b.i} (${(b.bad * 100).toFixed(0)} % of blocks not flat)`).join(', ')}`);
else ok(`pixels stay pixels (flat ${blk.map(b => b.k).filter((v, i, a) => a.indexOf(v) === i).join(' / ')} px blocks in every beat)`);

// 8: score
const sc = await page.evaluate(() => {
  const f = window.film; if (!f.score || !window.SSScore) return null;
  const [L, R] = SSScore.render(f.score, 8000, f.dur); let peak = 0, nan = 0, rms = 0;
  for (const c of [L, R]) for (let i = 0; i < c.length; i++) { const v = c[i]; if (!Number.isFinite(v)) nan++; else { peak = Math.max(peak, Math.abs(v)); rms += v * v; } }
  return { peak, nan, rms: Math.sqrt(rms / (L.length * 2)), notes: f.score.notes.length, sfx: f.score.sfx.length, engine: !!f.score.engine };
});
if (sc === null) info('no score (silent, or bring your own --audio)');
else if (sc.nan || sc.peak > 1.001 || sc.rms < .005) fail(`score: peak ${sc.peak.toFixed(3)}, rms ${sc.rms.toFixed(4)}, ${sc.nan} NaN`);
else ok(`score renders (peak ${sc.peak.toFixed(2)}, rms ${sc.rms.toFixed(3)}; ${sc.notes} notes, ${sc.sfx} sounds${sc.engine ? ', engine' : ''})`);

// 9: cost
const ms = await page.evaluate(DUR => { const t0 = performance.now(); let n = 0; for (let t = 0; t < DUR; t += DUR / 40) { window.seek(t); n++; } return (performance.now() - t0) / n; }, DUR);
info(`a frame costs ${ms.toFixed(1)} ms at scale ${scale}`);

if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
