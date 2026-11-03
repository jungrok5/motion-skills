// knit-diorama · check.mjs — proves a scene page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs scene.html [--step .25] [--scale .25]
// 1. loads with no page errors or console errors
// 2. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 3. loop seam (scenes with unravel): frame DURATION equals frame 0
// 4. every rule (D.check(...) plus the built-in ones) holds at every sampled t
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
if (!existsSync(page$)) { console.error('usage: check.mjs <scene.html> [--step .25]'); process.exit(1); }
const step = +opt('step', .25), scale = opt('scale', '.25');

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 240000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
// pixels of frame t as a digest of the raw RGBA (readPixels is exact; PNG encoding is not needed)
const pix = t => page.evaluate(t => {
  window.seek(t); const gl = document.querySelector('canvas').getContext('webgl2');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, a = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a);
  return Array.from(a);
}, t);
const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > 2) n++; if (d > mx) mx = d; } return { n, mx, frac: n / a.length }; };

if (errors.length) fail('loading: ' + errors.join(' | ')); else console.log('ok   loads with no errors');
const DUR = await page.evaluate(() => window.DURATION), loop = await page.evaluate(() => !!(window.D && window.D.loop));

// determinism: a few times, each seen twice with other frames in between
const ts = [0, DUR * .27, DUR * .5, DUR * .73].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — state carried between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);

if (loop) {
  const d = diff(await pix(0), await pix(DUR));
  if (d.frac > .002) fail(`loop seam: frame ${DUR} differs from frame 0 (${(d.frac * 100).toFixed(2)}% of values, max ${d.mx})`);
  else console.log(`ok   loop seam: frame ${DUR} = frame 0`);
}

const broken = new Map();
for (let t = 0; t <= DUR + 1e-6; t += step) {
  const b = await page.evaluate(t => window.runChecks(t), +t.toFixed(3));
  for (const name of b) if (!broken.has(name)) broken.set(name, +t.toFixed(2));
}
if (broken.size) for (const [n, t] of broken) fail(`rule "${n}" first broken at t=${t}`);
else console.log(`ok   every rule holds at every ${step} s`);
if (errors.length && !bad) fail('errors during the run: ' + errors.join(' | '));
await browser.close();
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
