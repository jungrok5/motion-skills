// shadow-critter-vignette · check.mjs — proves a vignette before you render it. Prints ok / FAIL lines with numbers.
//   node <skill>/scripts/check.mjs index.html [--step .25] [--scale .3]
// 1. page: loads with no errors; BRIEF.md beside it with its sections filled
// 2. determinism: the same t gives the same pixels in any order
// 3. every sampled moment draws; no blank frame outside the fades; alive in every beat (frames 0.25 s apart differ, even
//    in the wait, where only breath, blinks and the room move)
// 4. style (film.styleReport()): the room is painted (no flat blocks), the window is the brightest place, the body is ink,
//    one accent colour
// 5. body (film.rig()): knees fold back, in range; elbows in range; feet reached; planted feet do not drift on screen;
//    neck within range; walkers face their way; hands arrive at what they press
// 6. motion (film.motionReport()): blinks, big move gathers and recovers, stepped turns, footsteps; the gag's beats (try,
//    wait, after), a bigger second try, one line of caption, 7–16 s
// 7. sound (score.renderWav): renders, no NaN, peak ≤ 0.99, not silent, every second has sound, one footstep per heel strike
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
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html> [--step .25]'); process.exit(1); }
const step = +opt('step', .25), scale = opt('scale', '.3');
let bad = 0;
const ok = m => console.log('ok   ' + m), fail = m => { bad++; console.log('FAIL ' + m); };

const briefF = join(dirname(page$), 'BRIEF.md');
if (!existsSync(briefF)) fail('no BRIEF.md next to the page (references/BRIEF.md): write the brief before the code');
else { const b = readFileSync(briefF, 'utf8'), need = ['Topic', 'Critter', 'Room', 'Beats', 'Motion', 'Sound', 'Review'], miss = need.filter(h => !new RegExp('^##\\s+' + h, 'mi').test(b)), todo = (b.match(/TODO|__FILL__/g) || []).length;
  if (miss.length) fail('BRIEF.md is missing sections: ' + miss.join(', ')); else if (todo) fail(`BRIEF.md still has ${todo} TODO`); else ok('BRIEF.md has Topic · Critter · Room · Beats · Motion · Sound · Review'); }

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) { if (errors.length || Date.now() - t0 > 240000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); } await new Promise(r => setTimeout(r, 100)); }
if (errors.length) fail('loading: ' + errors.join(' | ')); else ok('loads with no errors');
const { DUR, beats, fadeIn, fadeOut } = await page.evaluate(() => ({ DUR: window.DURATION, beats: window.__film.film.beats, fadeIn: window.__film.film.fadeIn, fadeOut: window.__film.film.fadeOut }));
console.log(`     ${DUR} s · beats: ` + beats.map(b => `${b.name} ${b.t}`).join(' · '));

const frameStats = await page.evaluate(({ DUR, step }) => {
  const c = document.querySelector('canvas'), g = c.getContext('2d'), out = []; let prev = null;
  for (let t = 0; t < DUR; t += step) {
    let err = null; try { window.seek(t); } catch (e) { err = e.message; }
    const d = g.getImageData(0, 0, c.width, c.height).data; let mn = 765, mx = 0, ch = 0;
    for (let i = 0; i < d.length; i += 4 * 5) { const L = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, L); mx = Math.max(mx, L); }
    if (prev) for (let i = 0; i < d.length; i += 4 * 3) if (Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]) > 6) ch++;
    out.push({ t: +t.toFixed(2), err, range: mx - mn, change: prev ? ch / (d.length / 12) : null }); prev = d;
  }
  return out;
}, { DUR, step });
const thrown = frameStats.filter(f => f.err);
if (thrown.length) fail(`frames threw: ${thrown.map(f => `${f.t}s ${f.err}`).slice(0, 3).join(' | ')}`); else ok(`every sampled moment draws (${frameStats.length} frames)`);
const inside = f => f.t > fadeIn + .1 && f.t < DUR - fadeOut - .1;
const blank = frameStats.filter(f => inside(f) && f.range < 80);
if (blank.length) fail(`blank frames at ${blank.map(f => f.t).join(', ')}`); else ok('no blank frame outside the fades');
const frozen = frameStats.filter(f => inside(f) && f.change != null && f.t > fadeIn + step + .1 && f.change < .00015);
const minCh = Math.min(...frameStats.filter(f => inside(f) && f.change != null && f.t > fadeIn + step + .1).map(f => f.change));
if (frozen.length) fail(`frozen at ${frozen.map(f => f.t).join(', ')} (something breathes, blinks or drifts at every moment)`); else ok(`alive at every moment (min change ${(minCh * 100).toFixed(3)} % of pixels per ${step} s)`);
{ const ts = [DUR * .2, DUR * .5, DUR * .8], h = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.reduce((s, v, i) => (s * 31 + v * (i % 7 + 1)) >>> 0, 0); }, t);
  const a = []; for (const t of ts) a.push(await h(t)); const b = []; for (const t of [...ts].reverse()) b.unshift(await h(t));
  if (a.every((x, i) => x === b[i])) ok('deterministic: the same t gives the same pixels in any order'); else fail('not deterministic (Math.random? state kept between frames?)'); }

for (const r of await page.evaluate(() => window.__film.style())) (r.ok ? ok : fail)(`style: ${r.name} = ${r.value} (${r.limit})`);
for (const r of await page.evaluate(() => window.__film.rig())) (r.ok ? ok : fail)(`body: ${r.name} = ${r.value} (${r.limit})`);
for (const r of await page.evaluate(() => window.__film.motion())) (r.ok ? ok : fail)(`motion: ${r.name} = ${r.value} (${r.limit})`);

const snd = await page.evaluate(async () => { const F = window.__film; if (!F.score) return null; const r = await F.score.renderWav(F.film); const steps = F.events().filter(e => e.type === 'step').length; const contacts = F.film.cast.reduce((n, c) => n + (c.pose.contacts || []).filter(k => k.t >= 0 && k.t < F.film.dur).length, 0); return { peak: r.peak, rms: r.rms, nan: r.nan, perSec: r.perSec, steps, contacts, fi: F.film.fadeIn, fo: F.film.fadeOut }; });
if (!snd) fail('no score: export a makeScore(…) and pass it to mount (every sound is Web Audio code)');
else {
  if (snd.nan) fail(`sound has ${snd.nan} NaN samples`); else ok('sound renders, no NaN');
  if (snd.peak > .99) fail(`sound clips: peak ${snd.peak.toFixed(3)}`); else if (snd.rms < .004) fail(`sound nearly silent: rms ${snd.rms.toFixed(4)}`); else ok(`sound level: peak ${snd.peak.toFixed(3)}, rms ${snd.rms.toFixed(4)}`);
  const quiet = snd.perSec.map((v, i) => [i, v]).filter(([i, v]) => i >= Math.ceil(snd.fi) && i < Math.floor(DUR - snd.fo) && v < .0015);
  if (quiet.length) fail(`seconds with no sound at all: ${quiet.map(q => q[0]).join(', ')} (keep the room tone under the silence)`); else ok('room tone under every second');
  if (snd.contacts !== snd.steps) fail(`footsteps ${snd.steps} ≠ heel strikes ${snd.contacts}`); else ok(`one footstep per heel strike (${snd.contacts})`);
}
await browser.close();
console.log(bad ? `\n${bad} problem${bad > 1 ? 's' : ''}` : '\nall checks pass');
process.exit(bad ? 1 : 0);
