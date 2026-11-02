// paper-road · check.mjs — prove a scene page is safe to render. Run from the project root:
//   node <skill>/scripts/check.mjs scene.html
// 1. it loads with no page errors and sets the contract (seek, DURATION, FPS, frameKey);
// 2. same t → same pixels (no Math.random, no state carried between frames);
// 3. two frames in the same held pose are identical (the stop-motion hold is real, and render.mjs may reuse them);
// 4. every R.check(name, fn) the scene declares holds at every frame (e.g. the car never drives off the end of the road).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const file = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || '');
if (!existsSync(file)) { console.error('usage: check.mjs <scene.html>'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(file).href + '?render=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }).catch(() => {});
let fails = 0;
const report = (ok, what, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? '  ' + detail : ''}`); if (!ok) fails++; };

const contract = await page.evaluate(() => ({ seek: typeof window.seek, D: window.DURATION, F: window.FPS, key: typeof window.frameKey, steps: window.STEPS }));
report(!errors.length && contract.seek === 'function' && contract.key === 'function' && contract.D > 0, 'loads, sets seek / DURATION / FPS / frameKey', errors[0] || `${contract.D} s @ ${contract.F} fps, ${contract.steps} poses/s`);

const hashAt = t => page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 2166136261; for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; }, t);
const D = contract.D, F = contract.F, times = [0.4, D * 0.31, D * 0.57, D * 0.83];
let det = true; for (const t of times) { const a = await hashAt(t); await hashAt(t + 1.3 > D ? 0 : t + 1.3); if (a !== await hashAt(t)) { det = false; report(false, 'same t → same pixels', `t = ${t.toFixed(2)}`); break; } }
if (det) report(true, 'same t → same pixels', times.map(t => t.toFixed(1)).join(', ') + ' s');

let held = true, tested = 0;
for (const t of times) {
  let f = Math.floor(t * F), k0, k1;
  for (let j = 0; j < 4; j++, f++) { k0 = await page.evaluate(t => window.frameKey(t), f / F); k1 = await page.evaluate(t => window.frameKey(t), (f + 1) / F); if (k0 === k1) break; }
  if (k0 !== k1) continue; tested++;
  if (await hashAt(f / F) !== await hashAt((f + 1) / F)) { held = false; report(false, 'frames in one pose are identical', `frames ${f}, ${f + 1}`); break; }
}
if (held) report(true, 'frames in one pose are identical', `${tested} pairs`);

const checks = await page.evaluate(() => window.runChecks ? window.runChecks() : []);
for (const c of checks) report(c.bad === 0, c.name, c.bad ? `${c.bad} frames, first at t = ${c.first.join(', ')}` : '');
if (!checks.length) console.log('      (the scene declares no R.check rules)');
if (errors.length > 1) console.log(errors.slice(1, 5).join('\n'));
await browser.close();
process.exit(fails ? 1 : 0);
