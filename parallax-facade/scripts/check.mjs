// parallax-facade · check.mjs — prove a film page before rendering it:
//   node <skill>/scripts/check.mjs film.html [--scale .3]
// loads without errors · every view draws a non-blank frame · the same t gives the same pixels (deterministic) ·
// the loop is seamless (the frame at DURATION equals frame 0: camera, cars, birds all wrap) · the flat frame is filled
// edge to edge (no sky down the sides, no world edge) · the landmark shows in the flat frame and shrinks ≥ 3× in the
// reveal · beat timing (Film.check) · writes out/cues.json (beats, moves, sound spec) for score.mjs.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const page$ = resolve(args.find(a => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs film.html [--scale .3] [--q "finish=ink"]'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
const extra = opt('q', '');
await page.goto(pathToFileURL(page$).href + '?render=1&blur=2&scale=' + opt('scale', '.3') + (extra ? '&' + extra : ''), { waitUntil: 'commit', timeout: 0 });
const t0 = Date.now();
while (!(await page.evaluate(() => window.__ready === true))) {
  if (errors.length) break;
  if (Date.now() - t0 > 300000) { errors.push('never set window.__ready'); break; }
  await new Promise(r => setTimeout(r, 200));
}
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const info = await page.evaluate(() => {
  const F = window.film, W = 96, H = Math.round(96 / (F.W / F.H));
  const sky = F.scene.background.clone().convertLinearToSRGB();
  const grab = (t) => {
    F.seek(t);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(F.canvas, 0, 0, W, H);
    return g.getImageData(0, 0, W, H).data;
  };
  const stat = (d) => {
    let s = 0, s2 = 0, h = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += l; s2 += l * l; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
    const n = d.length / 4, m = s / n; return { mean: m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), hash: h };
  };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const isSky = (d, i) => Math.abs(d[i] - sky.r * 255) + Math.abs(d[i + 1] - sky.g * 255) + Math.abs(d[i + 2] - sky.b * 255) < 30;
  // sample each held view and each move's midpoint
  const K = F.keys, rows = [];
  for (let i = 1; i < K.length; i++) {
    const a = K[i - 1], b = K[i], mid = (a.t + b.t) / 2, d = grab(mid), e = grab(mid), s = stat(d);
    rows.push({ kind: b.move ? 'move' : 'hold', view: b.move ? `${a.v.name} → ${b.v.name}` : a.v.name, from: a.t, to: b.t, mean: s.mean, sd: s.sd, det: s.hash === stat(e).hash });
  }
  // seamless loop: frame 0 vs the frame at DURATION
  const loopDiff = diff(grab(0), grab(F.duration));
  // flat frame filled: in the lower 60 % of the flat frame, the left and right 4 % columns are not sky
  const f0 = grab(0); let sideSky = 0, sideN = 0;
  for (let y = Math.round(H * 0.4); y < H; y++) for (const x of [0, 1, 2, 3, W - 4, W - 3, W - 2, W - 1]) { sideN++; if (isSky(f0, (y * W + x) * 4)) sideSky++; }
  // sky share per held view (a reveal that shows only sky or only ground is lost)
  const skyShare = rows.filter(r => r.kind === 'hold').map(r => { const d = grab((r.from + r.to) / 2); let k = 0; for (let i = 0; i < d.length; i += 4) if (isSky(d, i)) k++; return { view: r.view, sky: k / (d.length / 4) }; });
  const rules = F.check();
  F.seek(0);
  return { dur: F.duration, fps: F.fps, W: F.W, H: F.H, rows, loopDiff, sideSky: sideSky / sideN, skyShare, rules, cues: F.cues };
});
const fail = [...(info.rules.fail ?? [])], warn = [...(info.rules.warn ?? [])];
console.log(`DURATION ${info.dur.toFixed(2)} s  (${Math.round(info.dur * info.fps)} frames @ ${info.fps} fps)  ${Math.round(info.W / +opt('scale', '.3'))}×${Math.round(info.H / +opt('scale', '.3'))}`);
console.log(' kind  view                 from →   to   luma   sd');
for (const r of info.rows) {
  console.log(`${r.kind.padStart(5)}  ${r.view.padEnd(19)} ${r.from.toFixed(2).padStart(5)} → ${r.to.toFixed(2).padStart(5)}  ${r.mean.toFixed(2)}  ${r.sd.toFixed(2)}`);
  if (r.sd < 0.03) fail.push(`${r.kind} ${r.view} at ${r.from.toFixed(2)} s draws a blank frame (luma sd ${r.sd.toFixed(3)})`);
  if (!r.det) fail.push(`${r.kind} ${r.view} at ${r.from.toFixed(2)} s is not deterministic (same t, different pixels)`);
}
for (const l of info.rules.info ?? []) console.log(l);
if (info.loopDiff > 1.0) fail.push(`the loop does not wrap: frame 0 and the frame at DURATION differ by ${info.loopDiff.toFixed(1)} levels (something moves without F.lap, or the beats do not end on the first view)`);
if (info.sideSky > 0.1) fail.push(`the flat frame is not filled: ${(info.sideSky * 100).toFixed(0)}% of its lower side edges is sky (extend the front row past the frame)`);
for (const s of info.skyShare) {
  if (s.sky > 0.7) warn.push(`the ${s.view} view is ${(s.sky * 100).toFixed(0)}% sky: tilt it down or raise the town`);
  if (s.view !== 'flat' && s.sky < 0.01 && /deep|rise/.test(s.view)) warn.push(`the ${s.view} view shows no sky at all: the reveal reads best with a strip of sky over the far end`);
}
console.log(`loop seam ${info.loopDiff.toFixed(2)} levels · flat side edges ${(info.sideSky * 100).toFixed(0)}% sky · sky share ${info.skyShare.map(s => `${s.view} ${(s.sky * 100).toFixed(0)}%`).join(', ')}`);
mkdirSync(resolve('out'), { recursive: true });
writeFileSync(resolve('out/cues.json'), JSON.stringify(info.cues, null, 1));
console.log('out/cues.json (beats and moves for score.mjs)');
await browser.close();
for (const w of warn) console.log('warn:', w);
for (const f of fail) console.log('FAIL:', f);
console.log(fail.length ? `${fail.length} problem(s)` : 'check OK');
process.exit(fail.length ? 1 : 0);
