// shred-poster · check.mjs — the automatic review a film must pass before its stills are judged.
//   node <skill>/scripts/check.mjs <project>
// Checks: the page loads without errors · the poster has no issues (text off the sheet or over its box, fonts not
// loaded, ink/paper contrast < 4.5, ink on the accent band < 2, no hero mark) · every shot shows a picture (not blank,
// not blown out) · frames are deterministic (same t → same pixels, whatever was rendered before) · the loop is seamless
// (the last frame matches the first as closely as two neighbouring frames of the hold) · the rebuild lands before the
// end and holds · the sound hits its loudness target with headroom.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const dir = resolve(process.argv[2] || '.');
if (!existsSync(join(dir, 'src'))) { console.error('usage: check.mjs <project>'); process.exit(1); }
build(dir, { quiet: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
const errors = [];
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|ReadPixels/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(pathToFileURL(join(dir, 'index.html')).href + '?render=1&scale=0.25&mb=2', { waitUntil: 'commit' });
for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true || !!window.FAILED));) { if (Date.now() - t0 > 300000) { errors.push('never READY'); break; } await new Promise((r) => setTimeout(r, 200)); }
const failed = await page.evaluate(() => window.FAILED || null);
const results = [];
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? '✓' : '✗'} ${name}${note ? ' — ' + note : ''}`); };
if (failed) { ok('loads', false, failed.split('\n')[0]); await browser.close(); process.exit(1); }
ok('loads without errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const F = await page.evaluate(() => ({ D: film.DURATION, fps: film.FPS, shots: film.shots, issues: film.issues, marks: film.marks, snd: film.soundStats(), lands: film.landings() }));
ok('poster has no issues', F.issues.length === 0, F.issues.join(' · '));
ok('hero line marked', !!F.marks.hero, F.marks.hero ? `rows ${F.marks.hero.y0}–${F.marks.hero.y1}` : 'P.mark("hero", …) missing');
// frame statistics in the page: mean, spread, a hash and a small luminance grid
const stat = (t) => page.evaluate((t) => {
  film.renderAt(t); const c = film.canvas, w = 54, h = 96, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.drawImage(c, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, L = [];
  let s = 0, s2 = 0, hash = 2166136261; for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; L.push(l); s += l; s2 += l * l; hash = Math.imul(hash ^ d[i] ^ (d[i + 1] << 8) ^ (d[i + 2] << 16), 16777619); }
  const n = L.length, m = s / n; return { mean: m, sd: Math.sqrt(s2 / n - m * m), hash: hash >>> 0, L };
}, t);
for (const s of F.shots) {
  const a = await stat((s.t0 + s.t1) / 2);
  ok(`shot "${s.name}" reads`, a.sd > 18 && a.mean > 25 && a.mean < 235, `mean ${a.mean.toFixed(0)}, spread ${a.sd.toFixed(0)}`);
}
const t1 = F.shots[1].t0 + 0.4, x1 = await stat(t1); await stat(F.D * 0.8); const x2 = await stat(t1);
ok('deterministic', x1.hash === x2.hash, x1.hash === x2.hash ? '' : 'the same t gave different pixels — something keeps state between frames or uses Math.random');
const diff = (a, b) => a.L.reduce((s, v, i) => s + Math.abs(v - b.L[i]), 0) / a.L.length;
const dt = 1 / F.fps, first = await stat(0), last = await stat(F.D - dt), hold1 = await stat(F.D - 3 * dt), hold2 = await stat(F.D - 2 * dt);
const seam = diff(last, first), base = diff(hold1, hold2);
ok('loop is seamless', seam <= Math.max(1.5, base * 2.5), `last→first ${seam.toFixed(2)}, neighbours in the hold ${base.toFixed(2)}`);
const lastLand = Math.max(...F.lands.rebuild);
ok('rebuild lands and holds', lastLand < F.D - 0.15, `last landing ${lastLand.toFixed(2)} s of ${F.D} s`);
ok('cascade ribbons land inside their shot', F.lands.cascade.every((t) => t > F.shots[1].t0 && t < F.shots[1].t1), F.lands.cascade.map((t) => t.toFixed(2)).join(' '));
if (F.snd) ok('sound: loudness and headroom', Math.abs(F.snd.lufs - F.snd.target) < 1.5 && F.snd.peak <= -0.8 && Number.isFinite(F.snd.lufs), `${F.snd.lufs.toFixed(1)} LUFS, peak ${F.snd.peak.toFixed(1)} dBFS`);
else ok('sound off', true);
await browser.close();
const bad = results.filter((r) => !r.pass).length;
console.log(bad ? `\n${bad} check(s) failed` : '\nall checks passed');
process.exit(bad ? 1 : 0);
