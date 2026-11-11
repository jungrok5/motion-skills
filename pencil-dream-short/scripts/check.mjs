// pencil-dream-short · check.mjs — proves a film page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs film.html [--step .25] [--scale .25]
// 1. loads with no page errors, console errors or failed requests
// 2. every beat draws without throwing, at every sampled t (a broken mark otherwise shows up as a blank frame in the MP4)
// 3. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 4. no frame is blank (one flat colour) except inside the opening fade-in / closing fade-out
// 5. every rule (F.check(...)) holds at every sampled t, and the body rules the rig reports ("body: …": a joint out of its
//    range, a pencil that is not on the line the hero draws)
// 6. the style: graphite + ONE spot colour until the wash starts (every saturated pixel within ±30° of the spot hue), the
//    paper shows (a light page), and the lines boil (two boil frames differ)
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
if (await page.evaluate(() => !!window.film.cast)) {   // a cast sheet: the body rules only
  const rules = await page.evaluate(() => window.runChecks(0));
  for (const r of rules) fail(r); if (!rules.length) console.log('ok   cast sheet: every view and pose passes the body rules');
  await browser.close(); console.log(bad ? `${bad} problem(s)` : 'ok'); process.exit(bad ? 1 : 0);
}
const DUR = await page.evaluate(() => window.DURATION), fades = await page.evaluate(() => [window.film.fadeIn || 0, window.film.fadeOut || 0]);
const shots = await page.evaluate(() => window.film.shots.map(s => ({ name: s.name, start: s.start, dur: s.dur })));
console.log(`     ${shots.length} beats, ${DUR} s: ` + shots.map(s => `${s.name} ${+s.start.toFixed(2)}`).join(' · '));

// draws, blank frames, rules, the spot colour
const spotHue = await page.evaluate(() => window.film.spotHue ?? null), washAt = await page.evaluate(() => window.film.washes ? Math.min(...window.film.washes.map(w => w.at), 1e9) : 1e9);
const thrown = new Map(), blank = [], broken = new Map(), offHue = [], dark = [];
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(([t, sh]) => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let mn = 765, mx = 0, n = 0, sat = 0, off = 0, lum = 0;
    for (let i = 0; i < d.length; i += 4 * 53) {
      const r = d[i], g = d[i + 1], b = d[i + 2], v = r + g + b, M = Math.max(r, g, b), m = Math.min(r, g, b), s = M ? (M - m) / M : 0; mn = Math.min(mn, v); mx = Math.max(mx, v); lum += v / 765; n++;
      if (s > .35 && M > 70) { sat++; let h = M === r ? ((g - b) / (M - m)) % 6 : M === g ? (b - r) / (M - m) + 2 : (r - g) / (M - m) + 4; h = (h * 60 + 360) % 360; const dh = Math.min(Math.abs(h - sh), 360 - Math.abs(h - sh)); if (dh > 30) off++; }
    }
    return { range: mx - mn, off: sat ? off / n : 0, lum: lum / n, rules: window.runChecks(t), shot: window.shotAt(t).name, desk: window.film.deskShows ? window.film.deskShows(t) : false };
  }, [+t.toFixed(3), spotHue]);
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.range < 12 && t > fades[0] && t < DUR - fades[1]) blank.push(`${t.toFixed(2)} (${r.shot})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
  if (spotHue !== null && t < washAt && !r.desk && r.off > .002) offHue.push(`${t.toFixed(2)} (${r.shot}: ${(r.off * 100).toFixed(2)} % of pixels)`);
  if (t < washAt && t > fades[0] && !r.desk && r.lum < .55) dark.push(`${t.toFixed(2)} (${r.shot})`);
}
if (thrown.size) for (const [m, t] of thrown) fail(`a mark throws at t=${t}: ${m}`); else console.log(`ok   every beat draws (every ${step} s)`);
if (blank.length) fail(`blank frames at t = ${blank.slice(0, 6).join(', ')}${blank.length > 6 ? ' …' : ''}`); else console.log('ok   no blank frames outside the fades');
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`); else console.log(`ok   every rule holds (body: joints in range, the pencil on its line)`);
if (offHue.length) fail(`a second colour before the wash (only graphite + the spot colour, hue ${Math.round(spotHue)}° ± 30°) at t = ${offHue.slice(0, 4).join(', ')}${offHue.length > 4 ? ' …' : ''}`); else console.log(`ok   graphite + one spot colour (hue ${Math.round(spotHue)}°) until the wash at ${washAt < 1e9 ? washAt + ' s' : 'the end'}`);
if (dark.length) fail(`the page is too dark (paper must show) at t = ${dark.slice(0, 4).join(', ')}`); else console.log('ok   the paper shows');
// boil: lines change between boil frames, and hold within one
const bf = await page.evaluate(() => window.film.boilFps);
const tb = +(1.5 / bf).toFixed(4), a1 = await pix(tb), a3 = await pix(+(tb + 1 / bf).toFixed(4)), dBoil = diff(a1, a3);
if (!dBoil.n) fail('the lines never boil (two boil frames are identical) — is the painter boilAmp 0?'); else console.log(`ok   the lines boil (${dBoil.n} values change between boil frames)`);

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
