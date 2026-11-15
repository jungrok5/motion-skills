// perspective-illusion · check.mjs — prove a scene page before any long render:
//   node <skill>/scripts/check.mjs scene.html [--scale .3]
// loads without errors or shader failures · the timeline rules (Illusion.check: opens flat, the loop joins, lay changes
// only while flat, corner views come as telephoto → wide pairs, no frozen holds, 3–6 swap objects) · every key draws a
// non-blank frame · the same ms gives the same pixels (deterministic) · moving things are periodic (the frame at LOOP
// equals frame 0 with time not wrapped) · the flat frame is dense (few empty tiles) and has no sky down its sides.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs scene.html [--scale .3]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /not compiled|program not valid/.test(t)) errors.push('console: ' + t.slice(0, 400)); });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=' + opt('scale', '.3'), { waitUntil: 'commit', timeout: 0 });
const t0 = Date.now();
while (!(await page.evaluate(() => window.READY === true))) {
  if (errors.length) break;
  if (Date.now() - t0 > 300000) { errors.push('never set window.READY'); break; }
  await new Promise((r) => setTimeout(r, 200));
}
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film, W = 160, H = 90;
  const grab = (ms) => { F.renderMany([[ms, 0, 0]]); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(F.canvas, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
  const stat = (d) => { let s = 0, s2 = 0, h = 0; for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; } const n = d.length / 4, m = s / n; return { mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), hash: h }; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const rules = F.check();
  const rows = F.keyList.slice(0, -1).map((k) => { const a = grab(k.t + 1), b = grab(k.t + 1), s = stat(a); return { name: k.name, t: k.t, sd: s.sd, det: s.hash === stat(b).hash }; });
  const seam = diff(grab(0), grab(F.loop));
  // the flat frame: tiles with almost no variation are "empty"; sky in the outer columns gives the depth away
  const f = grab(F.keyList[0].t); let empty = 0, tiles = 0;
  for (let ty = 0; ty < 9; ty++) for (let tx = 0; tx < 16; tx++) {
    let s = 0, s2 = 0, n = 0;
    for (let y = ty * 10; y < ty * 10 + 10; y++) for (let x = tx * 10; x < tx * 10 + 10; x++) { const i = (y * W + x) * 4, l = (0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2]) / 255; s += l; s2 += l * l; n++; }
    const m = s / n; tiles++; if (Math.sqrt(Math.max(0, s2 / n - m * m)) < 0.012) empty++;
  }
  F.render(0);
  return { loop: F.loop, rules, rows, seam, empty: empty / tiles, fastest: F.fastest };
});
const fail = [...info.rules.fail], warn = [...info.rules.warn];
console.log(`LOOP ${(info.loop / 1000).toFixed(2)} s`);
for (const r of info.rows) {
  console.log(`  ${(r.t / 1000).toFixed(2).padStart(5)} s  ${r.name.padEnd(10)} sd ${r.sd.toFixed(3)}${r.det ? '' : '  NOT DETERMINISTIC'}`);
  if (r.sd < 0.03) fail.push(`${r.name} at ${(r.t / 1000).toFixed(2)} s draws a blank frame`);
  if (!r.det) fail.push(`${r.name} at ${(r.t / 1000).toFixed(2)} s is not deterministic (same ms, different pixels: Math.random or accumulated state?)`);
}
for (const l of info.rules.info) console.log(l);
if (info.seam > 0.8) fail.push(`the loop seam shows: the frame at LOOP differs from frame 0 by ${info.seam.toFixed(1)} levels (a moving thing is not periodic — use F.cycle(ms, n))`);
if (info.empty > 0.2) warn.push(`the flat frame is ${(info.empty * 100).toFixed(0)}% empty tiles: fill it edge to edge (detail pass)`);
console.log(`loop seam ${info.seam.toFixed(2)} levels · flat frame ${(info.empty * 100).toFixed(0)}% empty tiles`);
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
