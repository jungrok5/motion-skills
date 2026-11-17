// street-run-montage · check.mjs — proves a film page (or a cast sheet). Run from the project root:
//   node <skill>/scripts/check.mjs index.html        → loads clean, every shot draws, deterministic, every rule, numbers
//   node <skill>/scripts/check.mjs cast.html         → every joint inside its limits, feet in reach, facing
// Film checks: no console errors · every shot draws (not blank) · the same t gives the same pixels · cuts on the beat,
// 0.6–6 s shots, no camera twice in a row, ≥ 5 kinds of shot · the camera never below the ground or inside a solid ·
// the shot's subject in frame · bodies: joints, reach, planted feet / paws slip (mm), gathers before every pop, the idle
// breathes, no speed-up without a push or a slope · your F.check() rules · the score renders (no NaN, peak, loudness).
// Prints the numbers; exits 1 on any problem.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs <index.html | cast.html> [--scale .35]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const scale = opt('scale', '.35');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
page.on('requestfailed', r => errors.push('404: ' + r.url()));
await page.goto(pathToFileURL(page$).href + `?render=1&scale=${scale}`, { waitUntil: 'commit', timeout: 0 });
try { await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 240000 }); }
catch { console.error('the page never set window.__ready'); console.error(errors.join('\n')); process.exit(1); }
const problems = [...errors];
const isFilm = await page.evaluate(() => typeof window.info === 'function');
if (!isFilm) {
  const bad = await page.evaluate(() => window.runChecks());
  problems.push(...bad);
  const n = await page.evaluate(() => window.report().numbers);
  console.log(`cast sheet: ${n.cells} cells`);
} else {
  const info = await page.evaluate(() => { const i = window.info(); return { dur: i.dur, bpm: i.bpm, shots: i.shots, events: i.events.length }; });
  console.log(`${info.shots.length} shots · ${info.dur.toFixed(2)} s · ${info.bpm} bpm · ${info.events} sound events`);
  // every shot: three moments checked; the middle one must not be blank
  const seen = new Map();
  for (const [i, s] of info.shots.entries()) {
    for (const t of [s.t0 + .05, (s.t0 + s.t1) / 2, s.t1 - .05]) {
      const bad = await page.evaluate(t => window.runChecks(t), t);
      for (const b of bad) if (!seen.has(b)) seen.set(b, `${b}  (shot ${i + 1} ${s.cam}, t=${t.toFixed(2)})`);
    }
    const st = await page.evaluate(t => { window.seek(t); const c = document.querySelector('canvas'), x = document.createElement('canvas'); x.width = 64; x.height = 36; const g = x.getContext('2d'); g.drawImage(c, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let m = 0, v = 0, n = d.length / 4; for (let k = 0; k < d.length; k += 4) m += d[k] + d[k + 1] + d[k + 2]; m /= n * 3; for (let k = 0; k < d.length; k += 4) v += ((d[k] + d[k + 1] + d[k + 2]) / 3 - m) ** 2; return Math.sqrt(v / n); }, (s.t0 + s.t1) / 2);
    if (st < 10) problems.push(`shot ${i + 1} (${s.cam}): nearly blank (contrast ${st.toFixed(1)})`);
  }
  problems.push(...seen.values());
  // deterministic: the same t, reached from different places, gives the same pixels
  const hashAt = async (t, via) => page.evaluate(([t, via]) => { window.seek(via); window.seek(t); return document.querySelector('canvas').toDataURL('image/png'); }, [t, via]).then(d => createHash('md5').update(d).digest('hex'));
  for (const t of [info.dur * .23, info.dur * .61]) { const a = await hashAt(t, 0), b = await hashAt(t, info.dur * .9); if (a !== b) problems.push(`not deterministic at t=${t.toFixed(2)}`); }
  // film-level numbers and motion
  const rep = await page.evaluate(() => window.report());
  problems.push(...rep.problems);
  console.log('numbers: ' + Object.entries(rep.numbers).map(([k, v]) => `${k}=${Array.isArray(v) ? '[' + v.join(',') + ']' : v}`).join(' · '));
  // cost of a frame at this scale
  const ms = await page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 6; i++) window.seek(1 + i * .37); return (performance.now() - t0) / 6; });
  console.log(`frame: ${ms.toFixed(0)} ms at scale ${scale}`);
  // the score
  const sc = await page.evaluate(() => ({ spec: window.film.score, dur: window.film.dur }));
  if (sc.spec) {
    const { renderScore } = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'score.js')).href);
    const [L, R] = renderScore(sc.spec, 22050, sc.dur); let peak = 0, sum = 0, nan = 0;
    for (let i = 0; i < L.length; i++) { const a = L[i], b = R[i]; if (Number.isNaN(a) || Number.isNaN(b)) nan++; peak = Math.max(peak, Math.abs(a), Math.abs(b)); sum += a * a + b * b; }
    const rms = Math.sqrt(sum / (2 * L.length));
    console.log(`score: ${sc.spec.notes.length} notes · ${sc.spec.hits.length} hits · ${sc.spec.sfx.length} effects · peak ${peak.toFixed(2)} · rms ${(20 * Math.log10(rms || 1e-9)).toFixed(1)} dBFS`);
    if (nan) problems.push(`score: ${nan} NaN samples`); if (peak < .2) problems.push('score: nearly silent'); if (rms < .02) problems.push('score: too quiet');
  } else problems.push('no score (F.score(SCORE))');
}
await browser.close();
if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log('  ✗ ' + p); process.exit(1); }
console.log('ok'); process.exit(0);
