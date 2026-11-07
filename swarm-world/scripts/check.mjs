// swarm-world · check.mjs — proves a world page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs world.html [--step .5] [--scale .25]
// 1. loads with no page errors, console errors or missing files
// 2. the fonts hold every string the film draws (Latin + the 2,350 common Hangul syllables of the bundled Noto Sans KR)
// 3. the schedule: every job has a cursor in time, every crew member works, nothing beside the line is still going up
//    when the traveller passes, the world is finished when the build ends (FILM.audit())
// 4. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 5. no blank frames, and every rule holds at every sampled t (camera above the ground, the crew at work is on screen,
//    plus the page's own W.check(name, fn))
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <world.html> [--step .5] [--scale .25]'); process.exit(1); }
const step = +opt('step', 0.5), scale = opt('scale', '.25');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver/.test(m.text())) errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', (r) => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}&q=low`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 240000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 100));
}
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
if (errors.length) fail('loading: ' + errors.join(' | ')); else console.log('ok   loads with no errors');

// fonts
const text = await page.evaluate(() => window.FILM.allText());
const lib = [join(dirname(page$), 'lib'), resolve(dirname(fileURLToPath(import.meta.url)), '..', 'lib')].find((d) => existsSync(join(d, 'fonts', 'hangul-ksx1001.txt')));
const hangul = new Set([...readFileSync(join(lib, 'fonts', 'hangul-ksx1001.txt'), 'utf8')]);
const odd = [...new Set([...text])].filter((c) => { const n = c.codePointAt(0); return n >= 0xac00 && n <= 0xd7a3 ? !hangul.has(c) : n > 0x2bff && !(n >= 0x3130 && n <= 0x318f) && !(n >= 0xff00 && n <= 0xffef); });
if (odd.length) fail(`${odd.length} character(s) the bundled fonts do not have (${odd.slice(0, 20).join('')}) — reword them`);
else console.log(`ok   fonts hold all ${new Set(text).size} characters`);

// the schedule
const audit = await page.evaluate(() => window.FILM.audit());
const facts = await page.evaluate(() => { const F = window.FILM; return { jobs: F.jobs.length, live: F.live.length, crew: F.names.length, items: F.allB.length, dur: F.DURATION, log: F.log.length }; });
for (const a of audit) if (a.level === 'warn') console.log('warn ' + a.msg); else fail(a.msg);
if (!audit.some((a) => a.level === 'fail')) console.log(`ok   schedule: ${facts.live}/${facts.jobs} jobs on ${facts.crew} cursors, ${facts.items} things, ${facts.log} log lines, all built before the traveller and by the end`);

// determinism and blank frames
const pix = (t) => page.evaluate((t) => { window.seek(t); const c = document.querySelector('canvas'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); }, t);
const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > 2) n++; if (d > mx) mx = d; } return { n, mx }; };
const spread = (a) => { let s = 0, s2 = 0, n = 0; for (let i = 0; i < a.length; i += 4 * 7) { const v = a[i] + a[i + 1] + a[i + 2]; s += v; s2 += v * v; n++; } return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)); };
const DUR = facts.dur;
const ts = [0.6, DUR * 0.21, DUR * 0.47, DUR * 0.73, DUR * 0.96].map((t) => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — state carried between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);
const blank = [];
for (let t = 0; t <= DUR + 1e-6; t += 2) { const s = spread(await pix(+t.toFixed(2))); if (s < 6) blank.push(+t.toFixed(2)); }
if (blank.length) fail(`flat (blank-looking) frames at t = ${blank.join(', ')}`); else console.log('ok   no blank frames (every 2 s)');

// rules
const broken = new Map();
for (let t = 0; t <= DUR + 1e-6; t += step) {
  const b = await page.evaluate((t) => window.runChecks(t), +t.toFixed(3));
  for (const name of b) { const e = broken.get(name); if (e) e.n++; else broken.set(name, { t: +t.toFixed(2), n: 1 }); }
}
const samples = Math.floor(DUR / step) + 1;
for (const [n, e] of broken) {   // a rule named "~…" is soft: a few samples are allowed (≤ 15 %)
  if (n.startsWith('~') && e.n <= samples * 0.15) console.log(`warn rule "${n.slice(1)}" broken at ${e.n}/${samples} samples, first at t=${e.t}`);
  else fail(`rule "${n.replace(/^~/, '')}" broken at ${e.n}/${samples} sample(s), first at t=${e.t}`);
}
if (![...broken.keys()].some((n) => !n.startsWith('~') || broken.get(n).n > samples * 0.15)) console.log(`ok   every rule holds at every ${step} s`);
if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
