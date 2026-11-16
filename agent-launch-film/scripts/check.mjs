// agent-launch-film · check.mjs — prove a film page before any long render:
//   node <skill>/scripts/check.mjs film.html
// loads without errors, 404s or missing fonts · the film's own rules (film.runChecks: every readable line is on screen long
// enough for its words, typed at a followable pace, ≥ 17 px, inside the frame, sharp, not covered by another line; the
// mascot opens and closes the film; the page's F.check rules) · then pixels: every scene moves · no dead frame (the ground
// alone for > 0.5 s) · no hard jump at a hand-over (scenes hand over by moving) · the ground stays bright · the accent stays
// punctuation · deterministic (same t, same pixels, whatever was drawn before). Numbers are printed, not only pass / fail.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const args = process.argv.slice(2);
const page$ = resolve(args.find((a) => a.endsWith('.html')) || '');
if (!existsSync(page$)) { console.error('usage: check.mjs film.html'); process.exit(1); }
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const errors = [], fails = [], warns = [];
const fail = (m) => { fails.push(m); console.log('FAIL', m); }, warn = (m) => { warns.push(m); console.log('warn', m); };

// 1 · load
let ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
let page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('page error: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); else if (m.type() === 'warning') console.log('warn (console):', m.text().slice(0, 200)); });
page.on('requestfailed', (r) => errors.push('failed to load: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
await page.goto(pathToFileURL(page$).href + '?render=1', { waitUntil: 'load', timeout: 0 });
for (const t0 = Date.now(); !(await page.evaluate(() => window.READY === true));) {
  if (errors.length) break;
  if (Date.now() - t0 > 120000) { errors.push('never set window.READY'); break; }
  await new Promise((r) => setTimeout(r, 100));
}
if (errors.length) { console.error(errors.join('\n')); await browser.close(); process.exit(1); }
const meta = await page.evaluate(() => ({ SIZE: window.SIZE, DUR: window.DURATION, fonts: [...document.fonts].map((f) => `${f.family}:${f.status}`), scenes: window.film.scenes.map((s) => ({ name: s.name, t0: s.t0, dur: s.dur, xf: s.xf, cut: s.cut, out: s.out })), accent: window.film.brand.accent, ground: window.film.brand.ground, els: window.film.els.length, cues: window.film.cueList.length }));
const bad = meta.fonts.filter((f) => !/loaded$/.test(f));
if (bad.length) fail(`fonts not loaded: ${bad.join(', ')}`);
console.log(`${meta.SIZE.W}×${meta.SIZE.H} · ${meta.DUR.toFixed(2)} s · ${meta.scenes.length} scenes · ${meta.els} pieces · ${meta.cues} sound cues`);

// 2 · the film's own rules
const rc = await page.evaluate(() => window.runChecks());
for (const x of rc.out) (x.level === 'fail' ? fail : warn)(x.msg);
for (const l of rc.info) console.log('  ·', l);

// 3 · pixels (screenshots at quarter size, analysed in a blank page)
await ctx.close();
ctx = await browser.newContext({ viewport: { width: meta.SIZE.W, height: meta.SIZE.H }, deviceScaleFactor: 0.25 });
page = await ctx.newPage();
await page.goto(pathToFileURL(page$).href + '?render=1', { waitUntil: 'load', timeout: 0 });
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const an = await (await browser.newContext()).newPage();
await an.setContent('<canvas id=c></canvas>');
const hex = (h) => { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const ACC = hex(meta.accent), GND = hex(meta.ground);
const shot = async (t) => { await page.evaluate((t) => window.seek(t), t); return page.screenshot({ clip: { x: 0, y: 0, width: meta.SIZE.W, height: meta.SIZE.H }, type: 'png' }); };
const stats = (buf) => an.evaluate(async ([b64, ACC, GND]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.getElementById('c'), W = 96, H = Math.round((96 * img.height) / img.width); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let lum = 0, fg = 0, acc = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2]; lum += (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    if (Math.abs(r - GND[0]) + Math.abs(gg - GND[1]) + Math.abs(b - GND[2]) > 36) fg++;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx - mn > 70 && Math.abs(r - ACC[0]) + Math.abs(gg - ACC[1]) + Math.abs(b - ACC[2]) < 110) acc++;
  }
  const s = document.createElement('canvas'); s.width = W; s.height = H; const sg = s.getContext('2d', { willReadFrequently: true }); sg.drawImage(img, 0, 0, W, H);
  const sd = sg.getImageData(0, 0, W, H).data, grey = []; for (let i = 0; i < sd.length; i += 4) grey.push(Math.round(0.3 * sd[i] + 0.59 * sd[i + 1] + 0.11 * sd[i + 2]));
  return { lum: lum / n, fg: fg / n, acc: acc / n, grey };
}, [buf.toString('base64'), ACC, GND]);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

const STEP = 1 / 6, samples = [];
for (let t = 0.02; t < meta.DUR - 0.01; t += STEP) samples.push({ t, ...(await stats(await shot(t))) });
// every scene moves
for (const s of meta.scenes) {
  const a = await stats(await shot(s.t0 + s.dur * 0.3)), b = await stats(await shot(s.t0 + Math.min(s.dur * 0.75, s.dur - s.xf - 0.05)));
  const d = diff(a.grey, b.grey);
  console.log(`  · scene ${s.name}: change across the scene ${d.toFixed(2)}`);
  if (d < 0.35) fail(`scene "${s.name}" barely changes (${d.toFixed(2)}) — every scene has a camera move and something arriving`);
}
// dead frames
let run = 0, worst = 0, at = 0;
for (const x of samples) { if (x.fg < 0.004) { run += STEP; if (run > worst) { worst = run; at = x.t; } } else run = 0; }
if (worst > 0.5) fail(`the frame is empty ground for ${worst.toFixed(2)} s (around ${at.toFixed(2)} s) — hand-overs overlap; something is always on`);
// hand-overs: adjacent frames at 30 fps across each overlap
for (const s of meta.scenes.slice(1)) {
  const prev = meta.scenes[meta.scenes.indexOf(s) - 1], from = s.t0 - 0.1, to = s.t0 + Math.max(prev.xf, 0.1) + 0.1;
  let last = null, mx = 0, mt = 0;
  for (let t = from; t <= to; t += 1 / 30) { const x = await stats(await shot(t)); if (last) { const d = diff(last.grey, x.grey); if (d > mx) { mx = d; mt = t; } } last = x; }
  console.log(`  · hand-over → ${s.name} (${prev.out}${s.cut ? ', cut' : ''}): biggest frame-to-frame change ${mx.toFixed(2)} at ${mt.toFixed(2)} s`);
  if (!s.cut && mx > 16) fail(`hard jump into "${s.name}" at ${mt.toFixed(2)} s (frame-to-frame change ${mx.toFixed(1)}) — hand over by moving (recede / push / whip / rise)`);
}
// brightness and accent
const lums = samples.map((x) => x.lum), accs = samples.map((x) => x.acc);
const minL = Math.min(...lums), meanAcc = accs.reduce((a, b) => a + b, 0) / accs.length, maxAcc = Math.max(...accs);
console.log(`  · ground: darkest frame luminance ${minL.toFixed(2)} · accent: ${(meanAcc * 100).toFixed(1)} % of pixels on average, ${(maxAcc * 100).toFixed(1)} % at most`);
if (minL < 0.55) fail(`a frame goes dark (luminance ${minL.toFixed(2)}) — this style lives on a bright ground`); else if (minL < 0.7) warn(`a frame is dim (luminance ${minL.toFixed(2)})`);
if (meanAcc > 0.08) fail(`the accent covers ${(meanAcc * 100).toFixed(1)} % of the film — it is punctuation (a word, a button, a bar), keep it under 8 %`); else if (maxAcc > 0.2) warn(`one frame is ${(maxAcc * 100).toFixed(0)} % accent`);
// determinism
const tm = meta.DUR * 0.47, A = await shot(tm); await shot(meta.DUR * 0.91); await shot(0.1); const B = await shot(tm);
const sa = await stats(A), sb = await stats(B), dd = diff(sa.grey, sb.grey);
if (!A.equals(B) && dd > 0.01) fail(`not deterministic: t=${tm.toFixed(2)} drew differently the second time (${dd.toFixed(3)})`);
else console.log(`  · deterministic at ${tm.toFixed(2)} s`);

await browser.close();
if (fails.length) { console.log(`\ncheck FAILED — ${fails.length} failure${fails.length > 1 ? 's' : ''}, ${warns.length} warning${warns.length === 1 ? '' : 's'}`); process.exit(1); }
console.log(`\ncheck OK${warns.length ? ` (${warns.length} warning${warns.length > 1 ? 's' : ''})` : ''}`);
