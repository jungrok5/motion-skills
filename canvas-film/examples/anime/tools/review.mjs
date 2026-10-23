// Review a character-art scene before anyone else sees it (run from the example folder):
//   node tools/review.mjs scenes/crossing-rig.html --o h --shots "7:20.6:0.2,20.6:26:0.2" --sheet 0.5 --out out/review
// 1. FIGURE pass (?fig=1: only the figure, on magenta): a frame every <step> s in each shot range, cropped to the
//    figure → out/review/fig-<t>.png, and the rig's motion stats (window.__rigStats) → stats.json.
// 2. FILM pass: the finished frame every --sheet s → out/review/film-<t>.jpg (for a contact sheet of the whole film).
// Then run tools/review.py on the folder: holes/seams per frame, motion strips, contact sheets, a report.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), page$ = resolve(args[0]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const ori = opt('o', 'h'), out = resolve(opt('out', 'out/review')), [W, H] = ori === 'h' ? [1920, 1080] : [1080, 1920];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--allow-file-access-from-files'] });
async function open(q) {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto(pathToFileURL(page$).href + `?render=1&o=${ori}` + q);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); return p;
}
const times = [];
for (const r of opt('shots', '7:20.6:0.2').split(',')) { const [a, b, s] = r.split(':').map(Number); for (let t = a; t < b - 1e-6; t += s) times.push(+t.toFixed(3)); }
const fig = await open('&fig=1');
for (const t of times) { await fig.evaluate(t => window.seek(t), t); await fig.screenshot({ path: join(out, `fig-${t.toFixed(2)}.png`) }); }
const stats = await fig.evaluate(() => window.__rigStats ? window.__rigStats() : null); await fig.close();
// the same frames in the drawn (rest) pose: holes that exist there too are gaps of the drawing, not rig damage
const rest = await open('&fig=1&rest=1');
for (const t of times) { await rest.evaluate(t => window.seek(t), t); await rest.screenshot({ path: join(out, `rest-${t.toFixed(2)}.png`) }); }
await rest.close();
// the original flat drawings at the same frames: the rig at rest must reproduce them (fidelity)
const orig = await open('&fig=1&rest=1&orig=1');
for (const t of times) { await orig.evaluate(t => window.seek(t), t); await orig.screenshot({ path: join(out, `orig-${t.toFixed(2)}.png`) }); }
await orig.close();
writeFileSync(join(out, 'stats.json'), JSON.stringify({ times, shots: opt('shots', '7:20.6:0.2'), stats }, null, 1));
const sheet = +opt('sheet', 0);
if (sheet) { const film = await open(''); const dur = await film.evaluate(() => window.DURATION);
  for (let t = .5; t < dur; t += sheet) { await film.evaluate(t => window.seek(t), t); await film.screenshot({ path: join(out, `film-${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 80 }); }
  await film.close(); }
await browser.close(); console.log('review frames in', out, times.length, 'figure frames');
