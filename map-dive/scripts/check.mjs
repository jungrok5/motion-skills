// map-dive · check.mjs — proves a film page before you render it. Prints `ok` lines, or what failed.
//   node <skill>/scripts/check.mjs film.html [--step .25] [--scale .25]
// 1. loads with no page errors, console errors or missing files
// 2. the text has its fonts: every character the film writes is in fonts/chars.txt (run fonts.mjs after changing text)
// 3. deterministic: the same t gives the same pixels, also after seeking elsewhere (no state between frames)
// 4. no blank frames: every sampled frame has detail (a stage that failed to draw shows as one flat colour)
// 5. every rule holds at every sampled t: built-ins (a shot covers every moment, labels on screen while shown, the camera
//    above the ground) plus the film's own S.check(...) / F.check(...)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/GPU stall|GL Driver/.test(m.text())) errors.push('console error: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('failed to load: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}&msaa=0`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.__ready === true));) {
  if (errors.length || Date.now() - t0 > 240000) { console.error(errors.join('\n') || 'never ready'); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };
if (errors.length) fail('loading: ' + errors.join(' | ')); else console.log('ok   loads with no errors');

const text = await page.evaluate(() => window.FILM.allText());
const charsF = join(dirname(page$), 'fonts', 'chars.txt');
const have = existsSync(charsF) ? new Set([...readFileSync(charsF, 'utf8')]) : null;
const missing = [...new Set([...text])].filter(c => c.trim() && (!have || !have.has(c)));
if (!have && missing.length) fail(`no fonts/ next to the page — run: node <skill>/scripts/fonts.mjs ${page$.split('/').pop()}`);
else if (missing.length) fail(`${missing.length} character(s) not in fonts/ (${missing.slice(0, 20).join('')}) — run fonts.mjs again`);
else console.log(`ok   fonts hold all ${new Set(text).size} characters`);

const pix = t => page.evaluate(t => {
  window.seek(t); const gl = document.querySelector('canvas').getContext('webgl2');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, a = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a);
  return Array.from(a);
}, t);
const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > 2) n++; if (d > mx) mx = d; } return { n, mx }; };
const spread = a => { let s = 0, s2 = 0, n = 0; for (let i = 0; i < a.length; i += 4 * 7) { const v = a[i] + a[i + 1] + a[i + 2]; s += v; s2 += v * v; n++; } return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)); };

const DUR = await page.evaluate(() => window.DURATION);
const ts = [0, DUR * .21, DUR * .47, DUR * .73, DUR * .96].map(t => +t.toFixed(2)), first = [];
for (const t of ts) first.push(await pix(t));
let det = true;
for (let i = ts.length - 1; i >= 0; i--) { const d = diff(first[i], await pix(ts[i])); if (d.n) { det = false; fail(`t=${ts[i]} renders differently the second time (${d.n} values differ, max ${d.mx}) — state carried between frames?`); } }
if (det) console.log(`ok   deterministic at t = ${ts.join(', ')}`);

let blank = [];
for (let t = 0; t <= DUR + 1e-6; t += 1) { const s = spread(await pix(+t.toFixed(2))); if (s < 6) blank.push(t); }
if (blank.length) fail(`flat (blank-looking) frames at t = ${blank.join(', ')}`); else console.log('ok   no blank frames (every 1 s)');

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
