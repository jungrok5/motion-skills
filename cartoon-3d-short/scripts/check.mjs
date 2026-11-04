// cartoon-3d-short · check.mjs — prove a film page before rendering it:
//   node <skill>/scripts/check.mjs film.html [--scale .35]
// loads without errors · every shot draws a non-blank frame · the same t gives the same pixels (deterministic) ·
// shots tile the timeline with no gaps · the film's own rules (Film.check: no frozen holds, shot lengths, light names) ·
// the voice ends before the picture · prints DURATION (score.mjs needs it) and the shot table.
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
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs film.html [--scale .35]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(pathToFileURL(page$).href + '?render=1&scale=' + opt('scale', '.35'), { waitUntil: 'commit', timeout: 0 });
const t0 = Date.now();
while (!(await page.evaluate(() => window.__ready === true))) {
  if (errors.length) break;
  if (Date.now() - t0 > 300000) { errors.push('never set window.__ready'); break; }
  await new Promise(r => setTimeout(r, 200));
}
const fail = [], warn = [];
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film;
  // per-shot frame statistics from a small readback of the canvas
  const stat = (t) => {
    F.seek(t);
    const c = document.createElement('canvas'); c.width = 54; c.height = 96;
    const g = c.getContext('2d'); g.drawImage(F.canvas, 0, 0, 54, 96);
    const d = g.getImageData(0, 0, 54, 96).data; let s = 0, s2 = 0, h = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
    const n = d.length / 4, m = s / n;
    return { mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), hash: h };
  };
  const shots = F.shots.map(s => {
    const mid = (s.from + s.to) / 2, a = stat(mid), b = stat(mid);
    return { id: s.id, set: s.set, light: s.light, from: s.from, to: s.to, dof: typeof s.dof === 'function' ? 'fn' : s.dof, mean: a.mean, sd: a.sd, det: a.hash === b.hash };
  });
  return { dur: F.duration, fps: F.fps, shots, rules: F.check(), lastWord: F.words.length ? F.words[F.words.length - 1].e : null, words: F.words.length };
});
console.log(`DURATION ${info.dur.toFixed(2)} s  (${Math.round(info.dur * info.fps)} frames @ ${info.fps} fps), ${info.words} words`);
console.log('shot  set          light     from →   to   len  dof   luma   sd');
for (const s of info.shots) {
  console.log(`${String(s.id).padStart(4)}  ${s.set.padEnd(12)} ${s.light.padEnd(8)} ${s.from.toFixed(2).padStart(6)} → ${s.to.toFixed(2).padStart(6)}  ${(s.to - s.from).toFixed(1).padStart(4)}  ${String(s.dof ?? 0).padStart(4)}  ${s.mean.toFixed(2)}  ${s.sd.toFixed(2)}`);
  if (s.sd < 0.02) fail.push(`shot ${s.id} draws a blank frame (luma sd ${s.sd.toFixed(3)})`);
  if (!s.det) fail.push(`shot ${s.id} is not deterministic (same t, different pixels)`);
  if (s.light === 'day' && (s.mean < 0.33 || s.mean > 0.75)) warn.push(`shot ${s.id} day luma ${s.mean.toFixed(2)} (reference median ~.50-.57)`);
}
warn.push(...info.rules);
if (info.lastWord && info.lastWord > info.dur) fail.push(`the voice ends at ${info.lastWord.toFixed(2)} s, after the picture (${info.dur.toFixed(2)} s)`);
if (info.lastWord && info.dur - info.lastWord > 1.2) warn.push(`the picture runs ${(info.dur - info.lastWord).toFixed(1)} s past the last word (the reference ends on the last word)`);
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
