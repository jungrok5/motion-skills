// cursor-swarm · check.mjs — proves a build page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs build.html [--step .25] [--scale .5] [--steps]
// 1. loads with no page errors, console errors or failed requests (fonts, your defineArt pictures)
// 2. every moment draws without throwing, at every sampled t
// 3. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 4. no blank frames
// 5. the layout holds: no overlapping blocks, nothing sticking out of the page, text big enough and in the bundled font,
//    every op on screen while it is built, no op waiting for a free agent — and every B.check rule
// 6. reports the agents (how many worked) and, with --steps, the sections (start, length) to cut a soundtrack to
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
if (!existsSync(page$)) { console.error('usage: check.mjs <build.html> [--step .25] [--steps]'); process.exit(1); }
const step = +opt('step', .25), scale = opt('scale', '.5');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 540, height: 675 } });
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
const ag = await page.evaluate(() => ({ n: window.film.agents.length, busy: window.film.agents.filter(a => a.jobs.length).length, jobs: window.film.agents.reduce((s, a) => s + a.jobs.length, 0), ops: window.film.ops.length }));
console.log(`     ${shots.length} sections, ${DUR.toFixed(1)} s · ${ag.ops} ops → ${ag.jobs} jobs · ${ag.busy} of ${ag.n} agents work (--steps lists the sections)`);

// draws, blank frames, rules
const thrown = new Map(), blank = [], broken = new Map();
for (let t = 0; t < DUR; t += step) {
  const r = await page.evaluate(t => {
    try { window.seek(t); } catch (e) { return { err: e.message }; }
    const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let mn = 255, mx = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] + d[i + 1] + d[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    return { range: mx - mn, rules: window.runChecks(t), shot: window.shotAt(t).name };
  }, +t.toFixed(3));
  if (r.err) { if (!thrown.has(r.err)) thrown.set(r.err, +t.toFixed(2)); continue; }
  if (r.range < 12 && t > fades[0] && t < DUR - fades[1]) blank.push(`${t.toFixed(2)} (${r.shot})`);
  for (const n of r.rules) if (!broken.has(n)) broken.set(n, +t.toFixed(2));
}
if (thrown.size) for (const [m, t] of thrown) fail(`a frame throws at t=${t}: ${m}`); else console.log(`ok   every moment draws (every ${step} s)`);
if (blank.length) fail(`blank frames at t = ${blank.slice(0, 6).join(', ')}${blank.length > 6 ? ' …' : ''}`); else console.log('ok   no blank frames outside the fades');
if (broken.size) for (const [n, t] of broken) fail(n.startsWith('layout · ') ? n : `rule "${n}" first broken at t=${t}`); else console.log(`ok   layout holds: no overlaps, all on the page, readable, in view while built, no waiting`);

// determinism
const ts = [DUR * .13, DUR * .41, DUR * .66, DUR * .88].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — Math.random, Date or state between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);

// steps, for cutting a soundtrack (or narration) to them
if (args.includes('--steps')) for (const s of shots) console.log(`     ${s.start.toFixed(2).padStart(6)}  ${s.dur.toFixed(2)}  ${s.name}`);
if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
