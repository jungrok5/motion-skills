// lineage-glow · check.mjs — proves a film page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs film.html [--step .25] [--scale .25]
// 1. loads with no page errors, console errors or failed requests
// 2. every world layer draws without throwing at every sampled t
// 3. no frame is black outside the fades, and light is never blown out (the style is glow on black: a frame whose mean
//    luminance passes .55 has lost its black)
// 4. every rule (F.check(...)) holds at every sampled t
// 5. every caption and the counter: inside the safe area (6 % sides, 9 % top, 18 % bottom — vertical-video UI) and
//    readable: the picture under white type has mean luminance ≤ .38; caption and counter never overlap
// 6. every character drawn is in the bundled font (no silent fallback to a system font)
// 7. deterministic: the same t gives the same pixels, also after seeking elsewhere
// 8. the score renders: no NaN, not silent, peak ≤ 1
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
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
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
const info = await page.evaluate(() => ({ DUR: window.DURATION, fades: [window.film.fadeIn, window.film.fadeOut], beats: window.film.beats, W: window.SIZE.W, H: window.SIZE.H }));
const { DUR, fades, W, H } = info;
console.log(`     ${info.beats.length} beats, ${DUR} s: ` + info.beats.map(b => `${b.name} ${b.start}–${+(b.start + b.dur).toFixed(2)}`).join(' · '));

const thrown = new Map(), dark = [], blown = [], broken = new Map();
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let mx = 0, sum = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 37) { const v = (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; mx = Math.max(mx, v); sum += v; n++; }
    return { mx, mean: sum / n, rules: window.runChecks(t), beat: window.shotAt(t).name };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.mx < .12 && t > fades[0] && t < DUR - fades[1]) dark.push(`${t.toFixed(2)} (${r.beat})`);
  if (r.mean > .55) blown.push(`${t.toFixed(2)} (${r.beat}, mean ${r.mean.toFixed(2)})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
}
if (thrown.size) for (const [m, t] of thrown) fail(`a layer throws at t=${t}: ${m}`); else console.log(`ok   every layer draws (every ${step} s)`);
if (dark.length) fail(`frames with nothing lit at t = ${dark.slice(0, 6).join(', ')}${dark.length > 6 ? ' …' : ''}`); else console.log('ok   something glows in every frame outside the fades');
if (blown.length) fail(`blown-out frames (the black is gone) at t = ${blown.slice(0, 5).join(', ')}`); else console.log('ok   no blown-out frames');
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`); else console.log('ok   every rule holds');

// type: safe area + legibility + no overlap, sampled every .5 s
const safe = { x0: W * .06, x1: W * .94, y0: H * .09, y1: H * .82 };
const seen = new Set(); let tbad = 0, nType = new Set();
for (let t = 0; t < DUR; t += .5) {
  const boxes = await page.evaluate(t => window.textCheck(t), +t.toFixed(2));
  for (const b of boxes) {
    nType.add(b.name);
    const key = (k) => { if (seen.has(b.name + k)) return false; seen.add(b.name + k); return true; };
    if ((b.x < safe.x0 || b.x + b.w > safe.x1 || b.y < safe.y0 || b.y + b.h > safe.y1) && key('safe')) { tbad++; fail(`${b.kind} "${b.name}" at t=${t.toFixed(1)} leaves the safe area (box ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)})`); }
    if (b.lum > .38 && key('lum')) { tbad++; fail(`${b.kind} "${b.name}" at t=${t.toFixed(1)} is hard to read: the light under it has mean luminance ${b.lum.toFixed(2)} (white type wants ≤ .38) — move the type, or keep the bright lines lower`); }
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h && !seen.has('ov' + a.name + b.name)) { seen.add('ov' + a.name + b.name); tbad++; fail(`"${a.name}" and "${b.name}" overlap at t=${t.toFixed(1)}`); }
  }
}
if (!tbad) console.log(`ok   ${nType.size} captions / counters inside the safe area, readable, never overlapping`);
const miss = await page.evaluate(() => window.glyphCheck());
if (miss.length) fail(`characters missing from the bundled font (they fall back to a system face): ${miss.join(' ')}`); else console.log('ok   every character is in the bundled font');

const ts = [DUR * .13, DUR * .41, DUR * .66, DUR * .88].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — Math.random, Date or state between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);

const sc = await page.evaluate(() => {
  const f = window.film; if (!f.score) return null;
  const [L, R] = f.renderScore(f.score, 22050, f.dur); let peak = 0, nan = 0, rms = 0;
  for (const ch of [L, R]) for (let i = 0; i < ch.length; i++) { const v = ch[i]; if (!Number.isFinite(v)) nan++; else { peak = Math.max(peak, Math.abs(v)); rms += v * v; } }
  return { peak, nan, rms: Math.sqrt(rms / (L.length * 2)) };
});
if (sc === null) console.log('     no score (silent film, or bring your own --audio)');
else if (sc.nan || sc.peak > 1.001 || sc.rms < .004) fail(`score: peak ${sc.peak.toFixed(3)}, rms ${sc.rms.toFixed(4)}, ${sc.nan} NaN`);
else console.log(`ok   score renders (peak ${sc.peak.toFixed(2)}, rms ${sc.rms.toFixed(3)})`);

if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
