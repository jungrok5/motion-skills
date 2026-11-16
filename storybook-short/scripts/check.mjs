// storybook-short · check.mjs — proves a film before you render it. Prints ok / FAIL lines with numbers.
//   node <skill>/scripts/check.mjs index.html [--step .5] [--scale .35]
// 1. page: loads with no errors; BRIEF.md beside it with its sections filled
// 2. determinism: the same t gives the same pixels in any order
// 3. every shot draws at every sampled t, no blank frame outside the fades, every shot alive (frames 0.5 s apart differ)
// 4. style: ink present, the paper's tooth shows (no flat digital fills), a palette of strong families (≤ 9 per shot)
// 5. body (film.rig()): knees fold the right way and within range, feet reached, planted feet do not drift, elbows in
//    range, walkers face the way they move
// 6. motion (film.motionReport()): every actor has a head motion (breath, blinks), big keyed moves have a gather and a
//    recovery, walks make footsteps
// 7. sound (score.renderWav): renders, no NaN, peak ≤ 0.99, not silent, every shot has sound, one footstep per heel strike
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html> [--step .5]'); process.exit(1); }
const step = +opt('step', .5), scale = opt('scale', '.35');
let bad = 0;
const ok = m => console.log('ok   ' + m), fail = m => { bad++; console.log('FAIL ' + m); };

const briefF = join(dirname(page$), 'BRIEF.md');
if (!existsSync(briefF)) fail('no BRIEF.md next to the page (references/BRIEF.md): write the brief before the code');
else { const b = readFileSync(briefF, 'utf8'), need = ['Topic', 'Cast', 'Shots', 'Motion', 'Sound', 'Review'], miss = need.filter(h => !new RegExp('^##\\s+' + h, 'mi').test(b)), todo = (b.match(/TODO|__FILL__/g) || []).length;
  if (miss.length) fail('BRIEF.md is missing sections: ' + miss.join(', ')); else if (todo) fail(`BRIEF.md still has ${todo} TODO`); else ok('BRIEF.md has Topic · Cast · Shots · Motion · Sound · Review'); }

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (errors.length || Date.now() - t0 > 240000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); } await new Promise(r => setTimeout(r, 100)); }
if (errors.length) fail('loading: ' + errors.join(' | ')); else ok('loads with no errors');
const { DUR, shots } = await page.evaluate(() => ({ DUR: window.DURATION, shots: window.__film.shots }));
console.log(`     ${shots.length} shots, ${DUR} s: ` + shots.map(s => `${s.name} ${s.start.toFixed(1)}+${s.dur}`).join(' · '));

// per-frame stats computed in the page
const frameStats = await page.evaluate(({ DUR, step }) => {
  const c = document.querySelector('canvas'), g = c.getContext('2d'), out = [];
  let prev = null;
  for (let t = 0; t < DUR; t += step) {
    let err = null; try { window.seek(t); } catch (e) { err = e.message; }
    const d = g.getImageData(0, 0, c.width, c.height).data; let mn = 765, mx = 0, ink = 0, n = 0, sum = 0, ch = 0; const hue = new Array(12).fill(0); let hn = 0;
    for (let i = 0; i < d.length; i += 4 * 5) { const r = d[i], gg = d[i + 1], b = d[i + 2], L = r + gg + b; n++; sum = (sum * 31 + r * 3 + gg * 5 + b * 7) >>> 0; mn = Math.min(mn, L); mx = Math.max(mx, L); if (L < 330) ink++;
      const M = Math.max(r, gg, b), m = Math.min(r, gg, b); if (M - m > 60) { let h = M === r ? ((gg - b) / (M - m)) % 6 : M === gg ? (b - r) / (M - m) + 2 : (r - gg) / (M - m) + 4; hue[Math.floor(((h * 60 + 360) % 360) / 30)]++; hn++; } }
    if (prev) for (let i = 0; i < d.length; i += 4 * 9) if (Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]) > 8) ch++;
    // flat blocks: 8×8 cells with one value, away from the paper
    let blocks = 0, flat = 0; for (let y = 0; y + 8 < c.height; y += 20) for (let x = 0; x + 8 < c.width; x += 20) { let lo = 1e9, hi = -1e9; for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const i = ((y + yy) * c.width + x + xx) * 4, L = d[i] + d[i + 1] + d[i + 2]; lo = Math.min(lo, L); hi = Math.max(hi, L); } if (lo > 700) continue; blocks++; if (hi - lo < 3) flat++; }
    out.push({ t: +t.toFixed(2), err, range: mx - mn, ink: ink / n, sum, change: prev ? ch / (d.length / 36) : null, fam: hue.filter(x => x / Math.max(1, hn) > .03).length, flat: flat / Math.max(1, blocks) });
    prev = d;
  }
  return out;
}, { DUR, step });
const thrown = frameStats.filter(f => f.err);
if (thrown.length) fail(`frames threw: ${thrown.map(f => `${f.t}s ${f.err}`).slice(0, 3).join(' | ')}`); else ok(`every sampled moment draws (${frameStats.length} frames)`);
const blank = frameStats.filter(f => f.t > .8 && f.t < DUR - 1.2 && f.range < 60);
if (blank.length) fail(`blank frames at ${blank.map(f => f.t).join(', ')}`); else ok('no blank frame outside the fades');
const inkLow = frameStats.filter(f => f.t > .8 && f.t < DUR - 1.2 && f.ink < .0015);
if (inkLow.length) fail(`no ink / darks at ${inkLow.map(f => f.t).join(', ')}`); else ok('ink and darks in every frame');
const flatHi = frameStats.filter(f => f.flat > .1);
if (flatHi.length) fail(`flat digital fills (> 10 % of blocks) at ${flatHi.map(f => `${f.t}s ${(f.flat * 100).toFixed(0)}%`).join(', ')}`); else ok(`no flat digital fills (max ${(Math.max(...frameStats.map(f => f.flat)) * 100).toFixed(1)} % of blocks)`);
const famHi = frameStats.filter(f => f.fam > 9);
if (famHi.length) fail(`palette too wide (> 9 hue families) at ${famHi.map(f => f.t).join(', ')}`); else ok(`palette: ≤ ${Math.max(...frameStats.map(f => f.fam))} hue families per frame`);
for (const s of shots) {
  const fr = frameStats.filter(f => f.t > s.start + .9 && f.t < s.start + s.dur - .1 && f.change != null), frozen = fr.filter(f => f.change < .0006);
  if (frozen.length) fail(`${s.name}: frozen at ${frozen.map(f => f.t).join(', ')} (every shot stays alive)`); else ok(`${s.name}: alive (min change ${fr.length ? (Math.min(...fr.map(f => f.change)) * 100).toFixed(2) : '–'} % of pixels per ${step} s)`);
}
{ const ts = [DUR * .2, DUR * .55, DUR * .85], a = []; for (const t of ts) a.push(await page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return c.toDataURL().length + ':' + c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 40, 40).data.reduce((s, v, i) => (s * 31 + v * (i % 7 + 1)) >>> 0, 0); }, t));
  const b = []; for (const t of [...ts].reverse()) b.unshift(await page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return c.toDataURL().length + ':' + c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 40, 40).data.reduce((s, v, i) => (s * 31 + v * (i % 7 + 1)) >>> 0, 0); }, t));
  if (a.every((x, i) => x === b[i])) ok('deterministic: the same t gives the same pixels in any order'); else fail('not deterministic (Math.random? state kept between frames?)'); }

for (const r of await page.evaluate(() => window.__film.rig())) (r.ok ? ok : fail)(`body: ${r.name} = ${r.value} (${r.limit})`);
for (const r of await page.evaluate(() => window.__film.motion())) (r.ok ? ok : fail)(`motion: ${r.name} = ${r.value} (${r.limit})`);

const snd = await page.evaluate(async () => { const F = window.__film; if (!F.score) return null; const r = await F.score.renderWav(F.film); const steps = F.events().filter(e => e.type === 'step').length; return { peak: r.peak, rms: r.rms, nan: r.nan, perSec: r.perSec, steps }; });
if (!snd) fail('no score: export a makeScore(…) and pass it to mount (every sound is Web Audio code)');
else {
  if (snd.nan) fail(`sound has ${snd.nan} NaN samples`); else ok('sound renders, no NaN');
  if (snd.peak > .99) fail(`sound clips: peak ${snd.peak.toFixed(3)}`); else if (snd.rms < .01) fail(`sound nearly silent: rms ${snd.rms.toFixed(4)}`); else ok(`sound level: peak ${snd.peak.toFixed(3)}, rms ${snd.rms.toFixed(4)}`);
  const quiet = shots.filter(s => { const secs = snd.perSec.slice(Math.ceil(s.start + .5), Math.floor(s.start + s.dur - .3)); return secs.length && Math.max(...secs) < .004; });
  if (quiet.length) fail(`shots with no sound: ${quiet.map(s => s.name).join(', ')}`); else ok('every shot has sound');
  const contacts = await page.evaluate(() => window.__film.film.shots.reduce((n, S) => n + S.cast.reduce((m, c) => m + (c.pose.contacts || []).filter(k => k.t >= 0 && k.t < S.dur).length, 0), 0));
  if (contacts !== snd.steps) fail(`footsteps ${snd.steps} ≠ heel strikes ${contacts}`); else ok(`one footstep per heel strike (${contacts})`);
}
await browser.close();
console.log(bad ? `\n${bad} problem${bad > 1 ? 's' : ''}` : '\nall checks pass');
process.exit(bad ? 1 : 0);
