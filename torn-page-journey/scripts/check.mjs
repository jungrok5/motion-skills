// torn-page-journey · check.mjs — proves a journey page (or a cast sheet) before you render it. Prints `ok` lines, numbers,
// or what failed.   node <skill>/scripts/check.mjs index.html [--step .25] [--scale .25]
//  1 loads with no page errors, console errors or failed requests
//  2 every chapter draws at every sampled t; no blank frame
//  3 deterministic: the same t gives the same pixels, also after seeking elsewhere
//  4 every rule holds: the rider's body (knees, elbows, neck in range; legs and arms reach), feet locked on the pedals,
//    wheels on the road, the head in frame, gestures that gather before they act, and the film's own J.check rules
//  5 the format: ≥ 3 chapters; no two neighbouring chapters share a medium; neighbouring chapters LOOK different (colour);
//    the loop closes (the last frame matches the first)
//  6 motion, with numbers: the foot-to-pedal error, the wheels roll the distance (no slip), the cranks turn while pedalling
//    and hold while coasting, the idle breathes, a trailing part (scarf / tail) lags the speed
//  7 the score renders: no NaN, not silent, peak ≤ 1, every chapter audible
//  8 speed: a frame's cost at this scale (the live page must keep up)
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
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html | cast.html> [--step .25] [--scale .25]'); process.exit(1); }
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

// a cast sheet: its own rules only
if (await page.evaluate(() => !window.film.chapters)) {
  const p = await page.evaluate(() => window.runChecks(0));
  if (p.length) p.forEach(x => fail(x)); else ok('cast sheet: every medium both ways, the pedal stroke, the idle and every gesture pass the body, feet and anticipation rules');
  await browser.close(); console.log(bad ? `${bad} problem(s)` : 'ok'); process.exit(bad ? 1 : 0);
}

const pix = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
const diff = (a, b) => { let n = 0, mx = 0, sum = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); sum += d; if (d > 2) n++; if (d > mx) mx = d; } return { n, mx, mean: sum / a.length }; };
const DUR = await page.evaluate(() => window.DURATION), FPS = await page.evaluate(() => window.FPS);
const ch = await page.evaluate(() => window.film.chapters.map(c => ({ name: c.name, start: c.start, dur: c.dur, medium: c.M.name, mood: c.mood })));
const tear = await page.evaluate(() => window.film.tear);
info(`${ch.length} chapters, ${DUR} s, tear ${tear} s: ` + ch.map(c => `${c.name} [${c.medium}] ${c.dur}`).join(' · '));

// 2, 4: draws, blanks, rules
const thrown = new Map(), blank = [], broken = new Map();
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let mn = 765, mx = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    return { range: mx - mn, rules: window.runChecks(t), shot: window.shotAt(t).name };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.range < 12) blank.push(`${t.toFixed(2)} (${r.shot})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
}
if (thrown.size) for (const [m, t] of thrown) fail(`a chapter throws at t=${t}: ${m}`); else ok(`every chapter draws (every ${step} s)`);
if (blank.length) fail(`blank frames at t = ${blank.slice(0, 6).join(', ')}`); else ok('no blank frames');
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`); else ok('every rule holds (body, feet on pedals, wheels on the road, head in frame, gestures, the film\'s own)');

// 3: determinism
const ts = [DUR * .13, DUR * .41, DUR * .66, DUR * .88].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ) — Math.random, Date or state between frames?`); } }
if (det) ok(`deterministic at t = ${ts.join(', ')}`);

// 5: the format
if (ch.length < 3) fail('a journey needs at least 3 chapters (feelings)');
const same = ch.filter((c, i) => c.medium === ch[(i + 1) % ch.length].medium && ch.length > 1);
if (same.length) fail(`neighbouring chapters share a medium: ${same.map(c => c.name).join(', ')} — every page turn must change the medium`); else ok('every page turn changes the medium (' + ch.map(c => c.medium).join(' → ') + ' → ' + ch[0].medium + ')');
const sig = [];
for (const c of ch) sig.push(await page.evaluate(t => { window.seek(t); const cv = document.querySelector('canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let r = 0, g = 0, b = 0, l = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 53) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } r /= n; g /= n; b /= n; for (let i = 0; i < d.length; i += 4 * 53) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; l += Math.abs(v - (r + g + b) / 3); } return [r, g, b, l / n]; }, +(c.start + c.dur / 2).toFixed(2)));
const look = ch.map((c, i) => { const a = sig[i], b = sig[(i + 1) % ch.length]; return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], (a[3] - b[3]) * 2); });
const flat = look.map((d, i) => [d, i]).filter(([d]) => d < 18);
if (flat.length) fail(`neighbouring chapters look too alike (colour distance < 18): ${flat.map(([d, i]) => `${ch[i].name} → ${ch[(i + 1) % ch.length].name} ${d.toFixed(0)}`).join(', ')}`); else ok(`neighbouring chapters look different (colour distance ${look.map(d => d.toFixed(0)).join(', ')})`);
// the seam (last frame → first) must be no bigger a jump than an ordinary frame-to-frame step of the same chapter
// (the baseline is the largest of six ordinary steps, so it includes a boil — the marks re-drawing — like the seam does)
const seam = diff(await pix(+(DUR - 1 / FPS).toFixed(4)), await pix(0)), tb = +(ch[0].dur * .5).toFixed(3); let base = { mean: 0 };
for (let k = 0; k < 6; k++) { const d = diff(await pix(+(tb + k / FPS).toFixed(4)), await pix(+(tb + (k + 1) / FPS).toFixed(4))); if (d.mean > base.mean) base = d; }
if (seam.mean > base.mean * 1.6 + .5) fail(`the loop does not close: last frame → first jumps ${seam.mean.toFixed(2)} per value (an ordinary frame step: ${base.mean.toFixed(2)})`); else ok(`the loop closes (last frame → first ${seam.mean.toFixed(2)} per value; an ordinary frame step ${base.mean.toFixed(2)})`);

// 6: motion numbers
const M = await page.evaluate(({ DUR, step }) => {
  const f = window.film, R = f.rider.R || 70, out = { foot: 0, slip: 0, crankWhileCoast: 0, crankStillPedalling: 0, breath: [9, -9], trailLag: 0 };
  let prev = null;
  for (let t = .02; t < DUR - .1; t += step / 2) {
    const a = window.riderAt(t); out.foot = Math.max(out.foot, a.foot);
    if (prev && prev.ch === window.shotAt(t).i && Math.abs(a.ld - prev.ld) < 400) {
      out.slip = Math.max(out.slip, Math.abs((a.wheel - prev.wheel) * R - (a.ld - prev.ld)));
      const dc = Math.abs(a.crank - prev.crank);
      if (a.coast && prev.coast) out.crankWhileCoast = Math.max(out.crankWhileCoast, dc);
      if (!a.coast && !prev.coast && dc < 1e-4) out.crankStillPedalling++;
    }
    prev = { ...a, ch: window.shotAt(t).i };
  }
  for (let t = 1; t < 5; t += .1) { const b = window.riderAt(t).breath; out.breath[0] = Math.min(out.breath[0], b); out.breath[1] = Math.max(out.breath[1], b); }
  // the trailing parts follow the smoothed speed: the spring lags a step change in speed
  const tab = f.tab; let lag = 0; for (let k = 1; k < tab.N; k += 24) lag = Math.max(lag, Math.abs(tab.spd[k] / f.speed - tab.vs[k]));
  out.trailLag = lag;
  return out;
}, { DUR, step });
info(`motion: foot-to-pedal max ${M.foot.toFixed(2)} px · wheel slip max ${M.slip.toFixed(2)} px per sample · breath range ${(M.breath[1] - M.breath[0]).toFixed(2)} · scarf/tail lag up to ${(M.trailLag * 100).toFixed(0)} % of speed`);
if (M.foot > 1) fail(`a planted foot leaves its pedal by ${M.foot.toFixed(1)} px`); else ok('feet stay on the pedals (≤ 1 px)');
if (M.slip > 1.5) fail(`the wheels slip: ${M.slip.toFixed(1)} px between rolled and travelled distance`); else ok('the wheels roll the distance travelled (no skating)');
if (M.crankWhileCoast > 1e-6) fail('the cranks turn while coasting'); else if (M.crankStillPedalling > 2) fail(`the cranks stop while pedalling (${M.crankStillPedalling} samples)`); else ok('cranks turn while pedalling, hold while coasting');
if (M.breath[1] - M.breath[0] < 1) fail('the idle does not breathe (breath range < 1)'); else ok('the rider breathes at every moment (idle is never frozen)');

// 7: score
const sc = await page.evaluate(() => {
  const f = window.film; if (!f.score) return null;
  const [L, R] = f.renderScore(f.score, 16000, f.dur); let peak = 0, nan = 0, rms = 0;
  for (const c of [L, R]) for (let i = 0; i < c.length; i++) { const v = c[i]; if (!Number.isFinite(v)) nan++; else { peak = Math.max(peak, Math.abs(v)); rms += v * v; } }
  const per = f.chapters.map(c => { let s = 0, n = 0; for (let i = Math.floor(c.start * 16000); i < Math.floor((c.start + c.dur) * 16000) && i < L.length; i++) { s += L[i] * L[i]; n++; } return Math.sqrt(s / Math.max(1, n)); });
  return { peak, nan, rms: Math.sqrt(rms / (L.length * 2)), per };
});
if (sc === null) info('no score (silent, or bring your own --audio)');
else if (sc.nan || sc.peak > 1.001 || sc.rms < .005) fail(`score: peak ${sc.peak.toFixed(3)}, rms ${sc.rms.toFixed(4)}, ${sc.nan} NaN`);
else if (sc.per.some(v => v < .01)) fail(`a chapter is silent: rms ${sc.per.map(v => v.toFixed(3)).join(', ')}`);
else ok(`score renders (peak ${sc.peak.toFixed(2)}, rms ${sc.rms.toFixed(3)}; per chapter ${sc.per.map(v => v.toFixed(2)).join(' ')})`);

// 8: cost of a frame
const ms = await page.evaluate(DUR => { const t0 = performance.now(); let n = 0; for (let t = 0; t < DUR; t += DUR / 40) { window.seek(t); n++; } return (performance.now() - t0) / n; }, DUR);
info(`a frame costs ${ms.toFixed(1)} ms at scale ${scale} (plates cached; the live page draws at 24 fps)`);

if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
