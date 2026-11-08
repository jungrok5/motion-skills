// paper-cutout-short · check.mjs — proves a film page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs film.html [--step .25] [--scale .25]
// 1. loads with no page errors, console errors or failed requests (a missing part image fails here)
// 2. every shot draws without throwing, at every sampled t
// 3. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 4. no frame is blank (one flat colour) except inside the opening fade-in / closing fade-out
// 5. every rule (F.check(...)) holds at every sampled t — the film's own rules (faces the way it walks, in frame, the prop
//    touches what it lights …) — and the body rules the rig reports ("body: …": a joint out of its range, an empty part)
// 6. stop motion: the two frames of one step are identical (each drawing held for 2 frames at 24 fps) and consecutive steps
//    differ while something moves; the hand-placed jitter is on (two steps of a still moment are not pixel-identical)
// 7. the score (if any) renders: no NaN, not silent, peak ≤ 1
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <film.html> [--step .25]'); process.exit(1); }
const step = +opt('step', .25), scale = opt('scale', '.25');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 120000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
const pix = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > 2) n++; if (d > mx) mx = d; } return { n, mx }; };

if (errors.length) fail('loading: ' + errors.join(' | ')); else console.log('ok   loads with no errors');
const DUR = await page.evaluate(() => window.DURATION), fades = await page.evaluate(() => [window.film.fadeIn || 0, window.film.fadeOut || 0]);
const shots = await page.evaluate(() => window.film.shots.map(s => ({ name: s.name, start: s.start, dur: s.dur })));
console.log(`     ${shots.length} shots, ${DUR} s: ` + shots.map(s => `${s.name} ${s.dur}`).join(' · '));

// draws, blank frames, rules
const thrown = new Map(), blank = [], broken = new Map();
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let mn = 765, mx = 0;
    for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    return { range: mx - mn, rules: window.runChecks(t), shot: window.shotAt(t).name };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.range < 12 && t > fades[0] && t < DUR - fades[1]) blank.push(`${t.toFixed(2)} (${r.shot})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
}
if (thrown.size) for (const [m, t] of thrown) fail(`a shot throws at t=${t}: ${m}`); else console.log(`ok   every shot draws (every ${step} s)`);
if (blank.length) fail(`blank frames at t = ${blank.slice(0, 6).join(', ')}${blank.length > 6 ? ' …' : ''}`); else console.log('ok   no blank frames outside the fades');
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`); else console.log(`ok   every rule holds`);
// stop motion: frames inside one step are identical; the next step is a new drawing
const STEP = await page.evaluate(() => window.STEP || 0);
if (STEP) {
  let held = true, moved = 0;
  for (const k of [.21, .47, .73]) {
    const t0 = Math.floor(DUR * k * STEP) / STEP + .002, a = await pix(+t0.toFixed(4)), b = await pix(+(t0 + 1 / STEP / 2).toFixed(4)), c = await pix(+(t0 + 1 / STEP).toFixed(4));
    if (diff(a, b).n) { held = false; fail(`frames inside one step differ at t=${t0.toFixed(3)} — something reads raw time instead of the stepped g.lt (Date, performance.now, a CSS animation?)`); }
    if (diff(a, c).n) moved++;
  }
  if (held) console.log(`ok   each drawing is held for one step (${STEP} steps a second, 2 frames each at 24 fps)`);
  if (!moved) fail('nothing changes from one step to the next — no motion and no jitter?'); else console.log(`ok   consecutive steps are new drawings (${moved}/3 samples)`);
} else console.log('     smooth timing (step 0): stop-motion checks skipped');

// determinism
const ts = [DUR * .13, DUR * .41, DUR * .66, DUR * .88].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — Math.random, Date or state between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);

// score
const sc = await page.evaluate(async () => {
  const f = window.film; if (!f.score) return null;
  const [L, R] = f.renderScore(f.score, 22050, f.dur); let peak = 0, nan = 0, rms = 0;
  for (const ch of [L, R]) for (let i = 0; i < ch.length; i++) { const v = ch[i]; if (!Number.isFinite(v)) nan++; else { peak = Math.max(peak, Math.abs(v)); rms += v * v; } }
  return { peak, nan, rms: Math.sqrt(rms / (L.length * 2)) };
});
if (sc === null) console.log('     no score (silent film, or bring your own --audio)');
else if (sc.nan || sc.peak > 1.001 || sc.rms < .005) fail(`score: peak ${sc.peak.toFixed(3)}, rms ${sc.rms.toFixed(4)}, ${sc.nan} NaN`);
else console.log(`ok   score renders (peak ${sc.peak.toFixed(2)}, rms ${sc.rms.toFixed(3)})`);

if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
