// pixel-diorama · loop-check.mjs — prove the scene loops: run it before every render.
//   node <skill>/scripts/loop-check.mjs scene.html
// 1. seek(LOOP) must draw exactly the pixels of seek(0). If not, something moves with a period that does not divide the
//    loop (Math.random, a raw Math.sin(t), a speed that is not snapped …) and the 10-hour video will jump every loop.
// 2. The seam step (last frame → first frame) must look like any other step: its pixel change is compared with the
//    median change between neighbouring frames elsewhere in the loop.
// 3. The same t must draw the same pixels twice (no state carried between frames).
// Exit code 1 when a check fails.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const page$ = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: loop-check.mjs <scene.html>'); process.exit(1); }
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(page$).href + '?render=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

const res = await page.evaluate(() => {
  const c = document.querySelector('canvas'), x = c.getContext('2d');
  const at = t => { window.seek(t); return x.getImageData(0, 0, c.width, c.height).data.slice(); };
  const diff = (a, b) => { let n = 0, s = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); if (d) { n++; s += d; } } return { px: n, sum: s }; };
  const L = window.DURATION, F = window.FPS, dt = 1 / F;
  const f0 = at(0), fL = at(L), wrap = diff(f0, fL);
  const again = diff(at(L / 3), at(L / 3));
  const seam = diff(at(L - dt), f0);
  const steps = [];
  for (let k = 1; k <= 24; k++) { const t = (L * k / 25) - ((L * k / 25) % dt); steps.push(diff(at(t), at(t + dt)).sum); }
  steps.sort((a, b) => a - b);
  return { L, F, W: c.width, H: c.height, wrap, again, seam: seam.sum, median: steps[12], max: steps[steps.length - 1] };
});
await browser.close();

let ok = true;
const line = (pass, msg) => { console.log(`${pass ? 'ok  ' : 'FAIL'}  ${msg}`); if (!pass) ok = false; };
console.log(`${res.W}×${res.H}, loop ${res.L} s @ ${res.F} fps (${Math.round(res.L * res.F)} frames)`);
line(res.wrap.px === 0, `seek(${res.L}) === seek(0)` + (res.wrap.px ? `: ${res.wrap.px} pixels differ — something is not periodic in the loop` : ''));
line(res.again.px === 0, 'same t, same pixels' + (res.again.px ? `: ${res.again.px} pixels differ — state is carried between frames or Math.random is used` : ''));
const ratio = res.seam / Math.max(1, res.median);
line(ratio < 3, `seam step ${ratio.toFixed(2)}× the median frame step (largest elsewhere ${(res.max / Math.max(1, res.median)).toFixed(2)}×)`);
process.exit(ok ? 0 : 1);
