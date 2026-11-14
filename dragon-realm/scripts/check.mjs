// dragon-realm · check.mjs — does the film load, is every frame a pure function of time, does every shot read,
// and can the creature's body take every pose it is asked for?
//   node <skill>/scripts/check.mjs <film-dir> [--scale .25] [--q "…"]
// For each shot: light level, blown / black share, how much moves in 0.5 s, the same instant rendered twice.
// Plus the checks the film's parts registered (DR.checks): rail kinks, flips, backward motion, …  Exit code 1 on FAIL.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const dir = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.');
if (!existsSync(join(dir, 'src'))) { console.error('usage: check.mjs <film-dir> [--scale .25]'); process.exit(1); }
build(dir, { quiet: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [], warns = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { const t = m.text(); if (/GPU stall|ReadPixels|Automatic fallback/.test(t)) return; if (m.type() === 'error' || /not compiled|program not valid|anchor not found/.test(t)) errors.push('console: ' + t.slice(0, 500)); else if (m.type() === 'warning') warns.push('console: ' + t.slice(0, 200)); });
const extra = opt('q', '');
await page.goto(pathToFileURL(join(dir, 'index.html')).href + '?render=1&scale=' + opt('scale', '.25') + (extra ? '&' + extra : ''), { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) { if (errors.length || (await page.evaluate(() => window.FAILED))) break; if (Date.now() - t0 > 600000) { errors.push('never set window.READY'); break; } await new Promise((r) => setTimeout(r, 200)); }
const failed = await page.evaluate(() => window.FAILED || null); if (failed) errors.push(failed);
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film, W = 192, H = 108, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const grab = (t) => { F.renderAt(t); g.drawImage(F.canvas, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
  const stat = (d) => { let s = 0, s2 = 0, blown = 0, murk = 0, h = 0; const n = d.length / 4; for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; if (l > 0.97) blown++; if (l < 0.03) murk++; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; } return { mean: s / n, sd: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)), blown: blown / n, murk: murk / n, hash: h }; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const rows = F.shots.map((s) => { const t = (s.t0 + s.t1) / 2, A = grab(t), st = stat(A), B = grab(Math.min(s.t1 - 0.04, t + 0.5)), other = grab(s.t0 + 0.01); const again = stat(grab(t)).hash === st.hash; return { name: s.name, t, len: s.t1 - s.t0, ...st, move: diff(A, B), det: again, i: F.info() }; });
  return { dur: F.DURATION, fps: F.FPS, gpu: F.gpu, rules: F.runChecks(), rows };
});
const fail = [...info.rules.fail], warn = [...info.rules.warn];
console.log(`${info.gpu}\n${info.dur} s · ${info.fps} fps · ${info.rows.length} shots`);
for (const l of info.rules.info) console.log(l);
for (const r of info.rows) {
  console.log(`  ${r.name.slice(0, 44).padEnd(44)} @${r.t.toFixed(1).padStart(5)} s  light ${r.mean.toFixed(2)} ± ${r.sd.toFixed(2)}  blown ${(r.blown * 100).toFixed(1)}%  black ${(r.murk * 100).toFixed(0)}%  moves ${r.move.toFixed(1)}  ${r.i.tris.toLocaleString('en')} tris${r.det ? '' : '  NOT DETERMINISTIC'}`);
  if (!r.det) fail.push(`${r.name}: not deterministic (same t, different pixels — Math.random, a clock, or state kept between frames?)`);
  if (r.blown > 0.18) warn.push(`${r.name}: ${(r.blown * 100).toFixed(0)}% of the frame is blown white — lower exposure, glow or mist in that look`);
  if (r.murk > 0.55) warn.push(`${r.name}: ${(r.murk * 100).toFixed(0)}% of the frame is near black — a night still needs a readable sky and a lit subject`);
  if (r.sd < 0.045) warn.push(`${r.name}: flat picture (light ± ${r.sd.toFixed(2)}) — haze too thick, or nothing lit against shade`);
  if (r.move < 0.15) warn.push(`${r.name}: hardly anything moves in 0.5 s — a drifting lens, wind, water or the creature`);
  if (r.len > 14) warn.push(`${r.name}: ${r.len.toFixed(1)} s is a long shot — it needs a move or an event to carry it`);
}
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
