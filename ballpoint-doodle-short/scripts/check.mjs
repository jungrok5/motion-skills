// ballpoint-doodle-short · check.mjs — proves a film page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs film.html [--step .25] [--scale .25]
// 1. loads with no page errors, console errors or failed requests (the handwriting font included)
// 2. every shot draws without throwing, at every sampled t
// 3. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 4. no blank frame (one flat colour) outside the opening / closing fades
// 5. every rule (F.check(...)) holds at every sampled t — the film's own rules (on the line, facing the way it moves, in
//    frame …) — and the body rules the rig reports ("body: …": an arm, tilt, squash or stride out of its range)
// 6. the style: the paper shows (≥ 35 % of each frame is bare sheet), there is ink (ballpoint lines are drawn), colour is
//    crayon not paint (no frame filled with one saturated colour), and the lines breathe (two boil frames differ)
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
const page = await browser.newPage({ viewport: { width: 540, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /font/.test(m.text()))) errors.push(`console ${m.type()}: ` + m.text().slice(0, 300)); });
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
const fontOk = await page.evaluate(() => document.fonts.check('40px DoodleHand'));
if (!fontOk) fail('the handwriting font (DoodleHand) is not loaded — is lib/fonts/Caveat-500.woff2 next to film.js?'); else console.log('ok   handwriting font loaded');
const DUR = await page.evaluate(() => window.DURATION), fades = await page.evaluate(() => [window.film.fadeIn || 0, window.film.fadeOut || 0]);
const shots = await page.evaluate(() => window.film.shots.map(s => ({ name: s.name, start: s.start, dur: s.dur })));
console.log(`     ${shots.length} shots, ${DUR} s: ` + shots.map(s => `${s.name} ${s.start.toFixed(2)}+${s.dur}`).join(' · '));

const thrown = new Map(), blank = [], broken = new Map(), noPaper = [], noInk = [], painted = [];
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    // the sheet's own colour, sampled in a corner of the paper plate
    const sh = window.film.sheet.c[0].getContext('2d').getImageData(4, 4, 1, 1).data;
    let mn = 765, mx = 0, paper = 0, inkN = 0, sat = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 53) {
      const r = d[i], g = d[i + 1], b = d[i + 2], v = r + g + b, M = Math.max(r, g, b), m = Math.min(r, g, b), s = M ? (M - m) / M : 0;
      mn = Math.min(mn, v); mx = Math.max(mx, v); n++; sat += s;
      if (Math.abs(r - sh[0]) + Math.abs(g - sh[1]) + Math.abs(b - sh[2]) < 70) paper++;
      if (v < sh[0] + sh[1] + sh[2] - 150) inkN++;   // clearly darker than the sheet: a pen line, even thinned by preview scale
    }
    return { range: mx - mn, paper: paper / n, ink: inkN / n, sat: sat / n, rules: window.runChecks(t), shot: window.shotAt(t).name };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  const inside = t > fades[0] && t < DUR - fades[1];
  if (r.range < 12 && inside) blank.push(`${t.toFixed(2)} (${r.shot})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
  if (inside && r.paper < .35) noPaper.push(`${t.toFixed(2)} (${r.shot}: ${(r.paper * 100).toFixed(0)} %)`);
  if (inside && r.ink < .001) noInk.push(`${t.toFixed(2)} (${r.shot})`);
  if (r.sat > .4) painted.push(`${t.toFixed(2)} (${r.shot}: mean saturation ${r.sat.toFixed(2)})`);
}
if (thrown.size) for (const [m, t] of thrown) fail(`a shot throws at t=${t}: ${m}`); else console.log(`ok   every shot draws (every ${step} s)`);
if (blank.length) fail(`blank frames at t = ${blank.slice(0, 6).join(', ')}${blank.length > 6 ? ' …' : ''}`); else console.log('ok   no blank frames outside the fades');
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`); else console.log('ok   every rule holds (the film\'s and the body\'s)');
if (noPaper.length) fail(`too little bare paper (the style lives on the sheet: ≥ 35 %) at t = ${noPaper.slice(0, 4).join(', ')}${noPaper.length > 4 ? ' …' : ''}`); else console.log('ok   the paper shows in every frame');
if (noInk.length) fail(`no ballpoint ink in frame at t = ${noInk.slice(0, 4).join(', ')}`); else console.log('ok   ink in every frame');
if (painted.length) fail(`colour too heavy for crayon (mean saturation > .4) at t = ${painted.slice(0, 4).join(', ')}`); else console.log('ok   colour stays crayon-light');
const bf = await page.evaluate(() => window.film.boilFps);
const tb = +(Math.max(fades[0] + .1, 1.5 / bf)).toFixed(4), a1 = await pix(tb), a3 = await pix(+(tb + 1 / bf).toFixed(4)), dBoil = diff(a1, a3);
if (!dBoil.n) fail('the lines never breathe (two boil frames are identical) — is P.pen.amp 0?'); else console.log(`ok   the lines breathe (${dBoil.n} values change between boil frames)`);

const ts = [DUR * .13, DUR * .41, DUR * .66, DUR * .88].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — Math.random, Date or state between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);

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
